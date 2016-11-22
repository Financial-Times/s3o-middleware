'use strict';

let Poller = require('ft-poller');
let S3O_PUBLIC_KEY_URL = 'https://s3o.ft.com/publickey';

module.exports = function (debug) {
	let publicKey;

	let flagsPoller = new Poller({
		url: S3O_PUBLIC_KEY_URL,
		retry: 3,
		refreshInterval: 1000 * 60 * 5,
		parseData: function (data) {
			debug('event=S3O_PUBLIC_KEY_LOADED source=' + S3O_PUBLIC_KEY_URL);
			publicKey = data;
		}
	});

	let promise = flagsPoller.start({ initialRequest: true });

	return function (opts) {
		if (opts && opts.promise) {
			return promise.then(function () { return publicKey; });
		}
		return publicKey;
	};
};
