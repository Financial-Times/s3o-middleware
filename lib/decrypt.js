'use strict';

var s3oPublicKey = require('./publickey');

module.exports = function (key, token) {
	var publicKey = s3oPublicKey();
	if (!publicKey) {
		return false;
	}

	// Convert the publicKey from DER format to PEM format
	// See: https://www.npmjs.com/package/node-rsa
	var buffer = new Buffer(publicKey, 'base64');
	var derKey = new NodeRSA(buffer, 'pkcs8-public-der');
	var publicPem = derKey.exportKey('pkcs8-public-pem');

	// See: https://nodejs.org/api/crypto.html
	var verifier = crypto.createVerify('sha1');
	verifier.update(key);
	return verifier.verify(publicPem, token, 'base64');
};
