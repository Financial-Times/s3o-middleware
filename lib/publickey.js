'use strict';

const Poller = require('ft-poller');
const S3O_PUBLIC_KEY_URL = 'https://s3o.ft.com/publickey';

module.exports = function(debug) {
	let publicKey;

	const flagsPoller = new Poller({
		url: S3O_PUBLIC_KEY_URL,
		refreshInterval: 1000 * 60 * 5,
		parseData: function(data) {
			debug("event=S3O_PUBLIC_KEY_LOADED source=" + S3O_PUBLIC_KEY_URL);
			publicKey = data;
		}
	});

	const promise = flagsPoller.start({ initialRequest: true });

	return function(opts) {
		if (opts && opts.promise) {
			return promise.then(() => publicKey);
		}
		return publicKey;
	};
};
