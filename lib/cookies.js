/**
 * Sundry utilities for cookies.
 *
 */
const { cookies } = require('@financial-times/s3o-middleware-utils');
const { USERNAME, TOKEN, DEFAULT_EXPIRY } = cookies;
const { parse: cookieParser } = require('cookie');

/**
 * Normalise cookies coming from Express
 *
 * @param  {object} req Express Request object
 * @return {void}
 */
const normaliseRequestCookies = function (req) {
	if (req.cookies === undefined || req.cookies === null) {
		const cookies = req.headers.cookie;
		if (cookies) {
			req.cookies = cookieParser(cookies);
		} else {
			req.cookies = Object.create(null);
		}
	}
};

/**
 * Gets s3o username from request cookies
 *
 * @param {object} req      Express request object
 * @return {string} 				The S3O username if it exists
 */
const getUsername = req => req.cookies[USERNAME];

/**
 * Gets s3o username from request cookies
 *
 * @param {object} req      Express request object
 * @return {string} 				The S3O token if it exists
 */
const getToken = req => req.cookies[TOKEN];

/**
 * Sets Express request cookies
 *
 * @param {object} res      Express result object
 * @param {string} username Google username
 * @param {string} token    S3O token
 * @return {void}
 */
const setCookies = function (res, username, token) {
	// Add username to res.locals, so apps can utilise it.
	res.locals.s3o_username = username;
	const cookieOptions = {
		maxAge: res.app.get('s3o-cookie-ttl') || DEFAULT_EXPIRY,
		httpOnly: true,
	};
	res.cookie(USERNAME, username, cookieOptions);
	res.cookie(TOKEN, token, cookieOptions);
};

/**
 * Clears the cookies and sends 403 status
 *
 * @param  {object} res Express result object
 * @return {void}
 */
const clearCookies = function (res) {
	res.clearCookie(USERNAME);
	res.clearCookie(TOKEN);
	res.status(403);
};

module.exports = {
	setCookies,
	getUsername,
	getToken,
	normaliseRequestCookies,
	clearCookies,
};
