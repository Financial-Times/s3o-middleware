'use strict';

// The Staff Single Sign On (S3O) public key is available at https://s3o.ft.com/publickey.
//  — S3O validates only @ft.com google accounts (and a whitelist of non-ft.com accounts).
//  — It's intended to change sporadically and without warning, mainly for security testing.
//  — Currently it comes in DER format and needs to be converted to PEM format

const debug = require('debug')('middleware:auth:s3o');
const querystring = require('querystring');
const url = require('url');
const urlencoded = require('body-parser').urlencoded({extended: true});
const { authenticate, publickey, cookies } = require('@financial-times/s3o-middleware-utils');
const { getUsername, getToken, normaliseRequestCookies, setCookies, clearCookies } = require('./lib/cookies');

const { USERNAME: S3O_USERNAME_COOKIE } = cookies;
const publicKeyPoller = publickey.poller(debug);
const { authenticateToken, validate } = authenticate(publickey.poller(debug));

const authS3O = function (req, res, next) {
	debug('S3O: Start.');

	normaliseRequestCookies(req);

	// Check for s3o username/token URL parameters.
	// These parameters come from https://s3o.ft.com. It redirects back after it does the google authentication.
	if (req.method === 'POST' && req.query.username) {
		urlencoded(req, res, function () {
				debug(`S3O: Found parameter token for ${S3O_USERNAME_COOKIE}: ${req.query.username}`);
				let isAuthenticated;
				try {
					isAuthenticated = authenticateToken(req.query.username, req.hostname, req.body.token);
				} catch (e) {
					res.status(500).send(e);
					return;
				}

				if (isAuthenticated) {
					setCookies(res, req.query.username, req.body.token);
					// Strip the username and token from the URL (but keep any other parameters)
					// Set 2nd parameter to true to parse the query string (so we can easily delete ?username=)
					let cleanURL = url.parse(req.originalUrl, true);

					// Node prefers ‘search’ over ‘query’ so remove ‘search’
					delete cleanURL.search;
					delete cleanURL.query.username;

					debug('S3O: Parameters detected in URL and body. Redirecting to base path: ' + url.format(cleanURL));

					// Don't cache any redirection responses.
					res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
					res.header('Pragma', 'no-cache');
					res.header('Expires', 0);
					res.redirect(url.format(cleanURL));
				} else {
					clearCookies(res);
					res.status(403);
					res.send('<h1>Authentication error.</h1><p>For access, please log in with your FT account</p>');
				}
			});

	// Check for s3o username/token cookies
	} else if (getUsername(req) && getToken(req)) {
		debug(`S3O: Found cookie token for ${S3O_USERNAME_COOKIE}: ${getUsername(req)}`);

		let isAuthenticated;
		try {
			isAuthenticated = authenticateToken(getUsername(req), req.hostname, getToken(req));
		} catch(e) {
			res.status(500).send(e);
			return;
		}

		if (isAuthenticated) {
			next();
		} else {
			res.send('<h1>Authentication error.</h1><p>For access, please log in with your FT account</p>');
		}

	// Send the user to s3o to authenticate
	} else {
		const s3o_system_code = req.headers['x-s3o-systemcode'];
		const protocol = (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'https') ? 'https' : req.protocol;
		const originalLocation = protocol + '://' + req.hostname + req.originalUrl;
		const parameters = querystring.stringify({
			post: true,
			host: req.hostname,
			redirect: originalLocation,
		});
		const s3o_url_v2 = `https://s3o.ft.com/v2/authenticate?${parameters}`;
		let s3o_url_v4 = `https://s3ov4.in.ft.com/v2/authenticate?${parameters}`;

		if (s3o_system_code) {
			s3o_url_v4 += '&systemcode='+ encodeURIComponent(s3o_system_code);
		}

		const s3o_url = req.headers['x-s3o-version'] === 'v4' ? s3o_url_v4 : s3o_url_v2;

		debug(`S3O: No token/${S3O_USERNAME_COOKIE} found. Redirecting to ${s3o_url}`);

		// Don't cache any redirection responses.
		res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
		res.header('Pragma', 'no-cache');
		res.header('Expires', 0);
		return res.redirect(s3o_url);
	}
};

// Alternative authentication middleware which does not redirect to S3O when
// cookies are missing or invalid. This can be used in front of API calls
// where a redirect will be undesirable
const authS3ONoRedirect = function (req, res, next) {
	debug('S3O: Start.');

	normaliseRequestCookies(req);

	const username = getUsername(req);
	const token = getToken(req);

	if (username && token && authenticateToken(username, req.hostname, token)) {
		debug('S3O: Authentication succeeded');
		return next();
	};

	debug('S3O: Authentication failed');
	clearCookies(res);
	res.send('Forbidden');

	return false;
}


module.exports = authS3O;
module.exports.authS3ONoRedirect = authS3ONoRedirect;
module.exports.validate = validate;
module.exports.ready = publicKeyPoller({ promise: true }).then(() => true);
