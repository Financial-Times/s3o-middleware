'use strict';

let crypto = require('crypto');
let NodeRSA = require('node-rsa');

module.exports = function (s3oPublicKey) {
	return function (key, token) {
		let publicKey = s3oPublicKey();
		if (!publicKey) {
			return false;
		}

		// Convert the publicKey from DER format to PEM format
		// See: https://www.npmjs.com/package/node-rsa
		let buffer = new Buffer(publicKey, 'base64');
		let derKey = new NodeRSA(buffer, 'pkcs8-public-der');
		let publicPem = derKey.exportKey('pkcs8-public-pem');

		// See: https://nodejs.org/api/crypto.html
		let verifier = crypto.createVerify('sha1');
		verifier.update(key);
		return verifier.verify(publicPem, token, 'base64');
	};
};
