'use strict';

var Poller = require('ft-poller');
var S3O_PUBLIC_KEY_URL = 'https://s3o.ft.com/publickey';
var publicKey;

var flagsPoller = new Poller({
	url: S3O_PUBLIC_KEY_URL,
	refreshInterval: 1000 * 60 * 5,
	parseData: function(data) {
		console.log("event=S3O_PUBLIC_KEY_LOADED source=" + S3O_PUBLIC_KEY_URL);
		publicKey = data;
	}
});

flagsPoller.start({ initialRequest: true });

module.exports = function() {
	return publicKey;
};
