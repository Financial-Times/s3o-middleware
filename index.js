// The Staff Single Sign On (S3O) public key is available at https://s3o.ft.com/publickey.
//  — S3O validates only @ft.com google accounts (and a whitelist of non-ft.com accounts).
//  — It's intended to change sporadically and without warning, mainly for security testing.
//  — Currently it comes in DER format and needs to be converted to PEM format

let debug = require('debug')('middleware:auth:s3o');
let url = require('url');
let cookieParser = require('cookie').parse;
let s3oPublicKey = require('./lib/publickey')(debug);
let validate = require('./lib/validate')(s3oPublicKey);
let urlencoded = require('body-parser').urlencoded({extended: true});

// Authenticate token and save/delete cookies as appropriate.
let authenticateToken = function (res, username, hostname, token) {
	let publicKey = s3oPublicKey();
	if (!publicKey) {
		res.status(500).send('Has not yet downloaded public key from S3O');
		return false;
	}
	let key = username + '-' + hostname;
	let result = validate(key, token);

	if (result) {
		debug('S3O: Authentication successful: ' + username);

		// Add username to res.locals, so apps can utilise it.
		res.locals.s3o_username = username;
		let cookieOptions = {
			maxAge: res.app.get('s3o-cookie-ttl') || 8 * 60 * 60 * 1000,
			httpOnly: true
		};
		res.cookie('s3o_username', username, cookieOptions);
		res.cookie('s3o_token', token, cookieOptions);
		return true;
	}
	debug('S3O: Authentication failed: ' + username);
	res.clearCookie('s3o_username');
	res.clearCookie('s3o_token');
	res.status(403);
	return false;
};

let normaliseRequestCookies = function (req) {
	if (req.cookies === undefined || req.cookies === null) {
		let cookies = req.headers.cookie;
		if (cookies) {
			req.cookies = cookieParser(cookies);
		} else {
			req.cookies = Object.create(null);
		}
	}
}

let authS3O = function (req, res, next) {
	debug('S3O: Start.');

	normaliseRequestCookies(req);

	// Check for s3o username/token URL parameters.
	// These parameters come from https://s3o.ft.com. It redirects back after it does the google authentication.
	if (req.method === 'POST' && req.query.username) {
		urlencoded(req, res, function () {
				debug('S3O: Found parameter token for s3o_username: ' + req.query.username);

				if (authenticateToken(res, req.query.username, req.hostname, req.body.token)) {
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
					res.send('<h1>Authentication error.</h1><p>For access, please login with your FT account</p>');
				}
			});

	// Check for s3o username/token cookies
	} else if (req.cookies.s3o_username && req.cookies.s3o_token) {
		debug('S3O: Found cookie token for s3o_username: ' + req.cookies.s3o_username);

		if (authenticateToken(res, req.cookies.s3o_username, req.hostname, req.cookies.s3o_token)) {
			next();
		} else {
			res.send('<h1>Authentication error.</h1><p>For access, please login with your FT account</p>');
		}

	// Send the user to s3o to authenticate
	} else {
		let protocol = (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'https') ? 'https' : req.protocol;
		let s3o_url = 'https://s3o.ft.com/v2/authenticate?post=true&host=' + encodeURIComponent(req.hostname) + '&redirect=' + encodeURIComponent(protocol + '://' + req.headers.host + req.originalUrl);
		debug('S3O: No token/s3o_username found. Redirecting to ' + s3o_url);

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
let authS3ONoRedirect = function (req, res, next) {
	debug('S3O: Start.');

	normaliseRequestCookies(req);

	if (req.cookies.s3o_username && req.cookies.s3o_token && authenticateToken(res, req.cookies.s3o_username, req.hostname, req.cookies.s3o_token)) {
		debug('S3O: Authentication succeeded');
		return next();
	};

	debug('S3O: Authentication failed');
	res.clearCookie('s3o_username');
	res.clearCookie('s3o_token');
	res.status(403);
	res.send('Forbidden');
	return false;
}


module.exports = authS3O;
module.exports.authS3ONoRedirect = authS3ONoRedirect;
module.exports.validate = validate;
module.exports.ready = s3oPublicKey({ promise: true })
	.then(function () { return true; });
