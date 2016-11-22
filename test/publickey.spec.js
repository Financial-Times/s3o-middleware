/**
 * Basic spec for lib/publickey.js
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');

chai.should();
chai.use(sinonChai);

const debugSpy = sinon.spy();
const startStub = sinon.stub();
const pollerStub = sinon.stub();

pollerStub.returns({ start: startStub });
pollerStub.yieldsTo('parseData', 'test-key');
startStub.returns(Promise.resolve());

const publicKeyFactory = proxyquire('../lib/publickey', {
  'ft-poller': pollerStub,
});

describe('lib/publickey', () => {
  let publicKey;

  it('returns a function', () => {
    publicKey = publicKeyFactory(debugSpy);
    publicKey.should.be.a('function');
    pollerStub.should.have.been.calledOnce;
    startStub.should.have.been.calledOnce;
    debugSpy.should.have.been.calledOnce;
  });

  describe('returned function', () => {
    it('returns a string if opts.promise is falsy', () => {
      const key = publicKey({ promise: false });
      key.should.be.a('string');
      key.should.equal('test-key');
    });

    it('returns a promise if opts.promise is true', (done) => {
      const keyPromise = publicKey({ promise: true });
      keyPromise.should.be.a('promise');
      keyPromise.then(key => {
        key.should.be.a('string');
        key.should.equal('test-key');
        done();
      });
    });
  });
});
