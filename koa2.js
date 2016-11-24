/**
 * Koa2 version of s3o-middleware
 *
 * N.b., this avoids parsing the body into an object via koa-bodyparser or whatever, and does not
 * add koa-bodyparser as a dependency. Please ensure your request bodies are parsed somehow!
 */

// The Staff Single Sign On (S3O) public key is available at https://s3o.ft.com/publickey.
//  — S3O validates only @ft.com google accounts (and a whitelist of non-ft.com accounts).
//  — It's intended to change sporadically and without warning, mainly for security testing.
//  — Currently it comes in DER format and needs to be converted to PEM format

let debug = require('debug')('middleware:auth:s3o');
let url = require('url');
let s3oPublicKey = require('./lib/publickey')(debug);
let validate = require('./lib/validate')(s3oPublicKey);

// Authenticate token and save/delete cookies as appropriate.
let authenticateToken = function (ctx, username, hostname, token) {
	let publicKey = s3oPublicKey();
	if (!publicKey) {
		ctx.throw('Has not yet downloaded public key from S3O');
		return false;
	}
	let key = username + '-' + hostname;
	let result = validate(key, token);

	if (result) {
		debug('S3O: Authentication successful: ' + username);


		ctx.state.s3o_username = username;
		let cookieOptions = {
			maxAge: ctx.state['s3o-cookie-ttl'] || 900000,
			httpOnly: true
		};
		ctx.cookies.set('s3o_username', username, cookieOptions);
		ctx.cookies.set('s3o_token', token, cookieOptions);
		return true;
	}
	debug('S3O: Authentication failed: ' + username);
	ctx.cookies.set('s3o_username', null);
	ctx.cookies.set('s3o_token', null);
	ctx.status = 403;

	return false;
};

let authS3O = function (ctx, next) {
	debug('S3O: Start.');

	// Check for s3o username/token URL parameters.
	// These parameters come from https://s3o.ft.com. It redirects back after it does the google authentication.
	if (ctx.method === 'POST' && ctx.query.username) {
		debug('S3O: Found parameter token for s3o_username: ' + ctx.query.username);

		// Bail if body is not an object.
		if (typeof ctx.body !== 'object') throw new Error('Please add the koa-bodyparser middleware to your app.');

		if (authenticateToken(ctx, ctx.query.username, ctx.hostname, ctx.body.token)) {
			// Strip the username and token from the URL (but keep any other parameters)
			// Set 2nd parameter to true to parse the query string (so we can easily delete ?username=)
			let cleanURL = url.parse(ctx.originalUrl, true);

			// Node prefers ‘search’ over ‘query’ so remove ‘search’
			delete cleanURL.search;
			delete cleanURL.query.username;

			debug('S3O: Parameters detected in URL and body. Redirecting to base path: ' + url.format(cleanURL));

			// Don't cache any redirection responses.
			ctx.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
			ctx.set('Pragma', 'no-cache');
			ctx.set('Expires', 0);
			ctx.redirect(url.format(cleanURL));
		} else {
			ctx.body = '<h1>Authentication error.</h1><p>For access, please login with your FT account</p>';
		}

	// Check for s3o username/token cookies
	} else if (ctx.cookies.get('s3o_username') && ctx.cookies.get('s3o_token')) {
		debug('S3O: Found cookie token for s3o_username: ' + ctx.cookies.get('s3o_username'));

		if (authenticateToken(ctx, ctx.cookies.get('s3o_username'), ctx.hostname, ctx.cookies.get('s3o_token'))) {
			next();
		} else {
			ctx.body = '<h1>Authentication error.</h1><p>For access, please login with your FT account</p>';
		}

	// Send the user to s3o to authenticate
	} else {
		let protocol = (ctx.headers['x-forwarded-proto'] && ctx.headers['x-forwarded-proto'] === 'https') ? 'https' : ctx.protocol;
		let s3o_url = 'https://s3o.ft.com/v2/authenticate?post=true&host=' + encodeURIComponent(ctx.hostname) + '&redirect=' + encodeURIComponent(protocol + '://' + ctx.headers.host + ctx.originalUrl);
		debug('S3O: No token/s3o_username found. Redirecting to ' + s3o_url);

		// Don't cache any redirection responses.
		ctx.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
		ctx.set('Pragma', 'no-cache');
		ctx.set('Expires', 0);
		return ctx.redirect(s3o_url);
	}
};

// Alternative authentication middleware which does not redirect to S3O when
// cookies are missing or invalid. This can be used in front of API calls
// where a redirect will be undesirable
let authS3ONoRedirect = function (ctx, next) {
	debug('S3O: Start.');

	if (ctx.cookies.get('s3o_username') && ctx.cookies.get('s3o_token') && authenticateToken(ctx, ctx.cookies.get('s3o_username'), ctx.hostname, ctx.cookies.get('s3o_token'))) {
		debug('S3O: Authentication succeeded');
		return next();
	};

	debug('S3O: Authentication failed');
	ctx.cookies.set('s3o_username', null);
	ctx.cookies.set('s3o_token', null);
	ctx.status = 403;
	ctx.body = 'Forbidden';
	return false;
}


module.exports = authS3O;
module.exports.authS3ONoRedirect = authS3ONoRedirect;
module.exports.validate = validate;
module.exports.ready = s3oPublicKey({ promise: true })
	.then(function () { return true; });
