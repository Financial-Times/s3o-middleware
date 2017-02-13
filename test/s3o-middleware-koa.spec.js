/**
 * Basic spec for s3o-middleware
 *
 * N.b., this approach doesn't exercise authenticateToken at all.
 * @TODO Write a test spec for authenticateToken.
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');

chai.should();
chai.use(sinonChai);

const publicKeyStub = sinon.stub();
publicKeyStub.returns(Promise.resolve('test-public-key'));

const validatorStub = sinon.stub();

const validateFactoryStub = sinon.stub();
validateFactoryStub.returns(validatorStub);

const nextStub = sinon.stub();
nextStub.returns('next returned');

const bodySetSpy = sinon.spy();

describe('s3o-middleware for Koa 2', () => {
  let ctxFixture;
  let s3o;

  beforeEach(() => {
    publicKeyStub.reset();
    validateFactoryStub.reset();
    validatorStub.reset();
    nextStub.reset();
    bodySetSpy.reset();

    ctxFixture = {
      cookies: {
        get: sinon.stub(),
        set: sinon.stub(),
        s3o_username: 'test',
        s3o_token: 'test-test-123',
      },
      hostname: 'localhost',
      headers: {
        'transfer-encoding': 'utf8',
        'host': 'localhost',

      },
      status: undefined,
      set body (val) {
        bodySetSpy(val);
      },
      get body () {
        return {
          token: 'test-token'
        };
      },
      redirect: sinon.stub(),
      set: sinon.stub(),
      originalUrl: undefined,
      method: undefined,
      query: {
        username: undefined,
      },
      state: {},
      throw: sinon.stub(),
    };

    s3o = proxyquire('../koa2', {
      './lib/publickey': () => publicKeyStub,
      './lib/validate': validateFactoryStub,
    });
  });

  describe('normal authentication', () => {
    describe('when user POSTs a username', () => {
      beforeEach(() => {
        ctxFixture.method = 'POST';
        ctxFixture.query = {
          username: 'test',
        };
      });
      it('redirects if user authenticates', () => {
        validatorStub.returns(true);
        ctxFixture.body = {
          token: 'abc123',
        };
        ctxFixture.originalUrl = 'http://localhost';

        s3o(ctxFixture, nextStub);

        ctxFixture.set.withArgs('Cache-Control', 'private, no-cache, no-store, must-revalidate')
          .should.have.been.calledOnce;
        ctxFixture.set.withArgs('Pragma', 'no-cache').should.have.been.calledOnce;
        ctxFixture.set.withArgs('Expires', 0).should.have.been.calledOnce;
        ctxFixture.redirect.withArgs('http://localhost/').should.have.been.calledOnce;
      });

      it('responds with error message if authentication fails', () => {
        validatorStub.returns(false); // This isn't taking effect. My other tests might also be broken.

        s3o(ctxFixture, nextStub);

        bodySetSpy.withArgs('<h1>Authentication error.</h1><p>For access, please login with your FT account</p>').should.have.been.calledOnce;
      });
    });

    describe('when user has cookies', () => {
      beforeEach(() => {
        ctxFixture.method = 'GET';
        ctxFixture.cookies.get.withArgs('s3o_username').returns('test-user');
        ctxFixture.cookies.get.withArgs('s3o_token').returns('test-token');
      });
      it('calls next() after authenticating cookies', () => {
        validatorStub.returns(true);

        s3o(ctxFixture, nextStub);
        nextStub.should.have.been.calledOnce;
      });

      it('responds with error message if authentication fails', () => {
        validatorStub.returns(false);

        s3o(ctxFixture, nextStub);
        nextStub.should.not.have.been.called;

        bodySetSpy.withArgs('<h1>Authentication error.</h1><p>For access, please login with your FT account</p>').should.have.been.calledOnce;
      });
    });

    describe('when user is unauthenticated', () => {
      it('redirects to s3o login URL', () => {
        delete ctxFixture.query;
        delete ctxFixture.method;
        ctxFixture.headers.host = 'localhost';
        ctxFixture.originalUrl = 'http://localhost';
        ctxFixture.protocol = 'https';
        ctxFixture.redirect.returns('redirect returned');

        const result = s3o(ctxFixture, nextStub);

        ctxFixture.set.withArgs('Cache-Control', 'private, no-cache, no-store, must-revalidate')
          .should.have.been.calledOnce;
        ctxFixture.set.withArgs('Pragma', 'no-cache').should.have.been.calledOnce;
        ctxFixture.set.withArgs('Expires', 0).should.have.been.calledOnce;
        ctxFixture.redirect.withArgs('https://s3o.ft.com/v2/authenticate?post=true&host=localhost&redirect=https%3A%2F%2Flocalhosthttp%3A%2F%2Flocalhost')
          .should.have.been.calledOnce;
        result.should.equal('redirect returned');
      });
    });
  });

  describe('no redirect authentication', () => {
    beforeEach(() => {
      ctxFixture.cookies.get.reset();
      ctxFixture.cookies.set.reset();
      ctxFixture.cookies.get.withArgs('s3o_username').returns('test-user');
      ctxFixture.cookies.get.withArgs('s3o_token').returns('test-token');
    });

    it('calls next() on successful authentication', () => {
      validatorStub.returns(true);

      const result = s3o.authS3ONoRedirect(ctxFixture, nextStub);

      nextStub.should.have.been.calledOnce;
      result.should.equal('next returned');
    });

    it('returns 403 on authentication failure', () => {
      validatorStub.returns(false);

      s3o.authS3ONoRedirect(ctxFixture, nextStub);

      nextStub.should.not.have.been.called;
      ctxFixture.cookies.set.withArgs('s3o_username', null).should.have.been.calledTwice;
      ctxFixture.cookies.set.withArgs('s3o_token', null).should.have.been.calledTwice;
      ctxFixture.status.should.equal(403);
      bodySetSpy.withArgs('Forbidden').should.have.been.calledOnce;;
    });
  });

  describe('ready property', () => {
    it('returns true when supplied promise resolves', done => {
      publicKeyStub.should.have.been.calledOnce;
      s3o.ready.then(res => {
        res.should.equal(true);
        done();
      });
    });
  });

  describe('validate property', () => {
    it('is the same validator imported from lib/validate', () => {
      s3o.validate.should.equal(validatorStub);
    });
  });
});
