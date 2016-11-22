/**
 * Basic spec for lib/validate.js
 *
 * N.b., I stub all the crypto stuff here because I have no idea how to generate a test token. -Æ.
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');

chai.should();
chai.use(sinonChai);

// Stubs for node-rsa
const rsaStub = sinon.stub();
const exportKeyStub = sinon.stub();
rsaStub.returns({ exportKey: exportKeyStub });
exportKeyStub.returns('test-pem');

// Stubs for crypto
const createVerifyStub = sinon.stub();
const verifyStub = sinon.stub();
const updateSpy = sinon.spy();
createVerifyStub.returns({ update: updateSpy, verify: verifyStub });
verifyStub.returns(true);

const validatorFactory = proxyquire('../lib/validate', {
  'node-rsa': rsaStub,
  'crypto': {
    createVerify: createVerifyStub,
  },
});

const keyFactory = sinon.stub();

describe('lib/validate.js', () => {
  beforeEach(() => {
    keyFactory.reset();
  });

  it('returns a function', () => {
    const validator = validatorFactory(keyFactory);
    validator.should.be.a('function');
  });

  describe('validator function', () => {
    it('returns false if publicKey is falsy', () => {
      keyFactory.returns(false);

      const validator = validatorFactory(keyFactory);
      const result = validator('test-key', 'test-token');

      keyFactory.should.have.been.calledOnce;
      result.should.equal(false);
    });

    it('returns true if supplied key validates against public key', () => {
      keyFactory.returns('test-public-key');

      const validator = validatorFactory(keyFactory);
      const result = validator('test-key', 'test-token');
      const testBuffer = new Buffer('test-public-key', 'base64');

      // This should be improved at some point.
      result.should.equal(true);
      keyFactory.should.have.been.calledOnce;
      rsaStub.withArgs(testBuffer).should.have.been.calledOnce;
      exportKeyStub.should.have.been.calledOnce;
      createVerifyStub.should.have.been.calledOnce;
      updateSpy.withArgs('test-key').should.have.been.calledOnce;
      verifyStub.withArgs('test-pem', 'test-token').should.have.been.calledOnce;
    });
  });
});
