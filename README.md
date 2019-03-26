# S3O-middleware

Middleware to handle authenticating with [S3O](http://s3o.ft.com/docs)

## Parsing cookies

This middleware can parse standard cookies via the [cookie](http://npmjs.com/package/cookie) package. If wanting to use signed cookies or json cookies, please use the [cookie-parser](https://www.npmjs.com/package/cookie-parser) middleware before using the S3O middleware.

## Finding the username of the logged in user

The username can be found in the request cookie, under `req.cookies.s3o_username`.

## Setting the ttl of the cookie for an authenticated request

Defaults to fifteen minutes. Use Express' `app.set` function before sending users to authenticate:
`app.set('s3o-cookie-ttl', 86400000); // one day (in ms)`

## Usage example for Express

If many routes require auth:

```js
const express = require('express');
const app = express();

// Add routes here which don't require auth
const authS3O = require('@financial-times/s3o-middleware');
app.use(authS3O);
// Add routes here which require auth
```

If only paths within a given directory require auth:

```js
const express = require('express');
const app = express();
const router = express.Router();
const authS3O = require('@financial-times/s3o-middleware');
router.use(authS3O);
app.use('/admin', router);
```

If specific paths require auth:

```js
const express = require('express');
const app = express();
const router = express.Router();
const authS3O = require('@financial-times/s3o-middleware');

app.get('/', authS3O, router);
app.post('/', authS3O);
```

If you don't want the automatic redirect to the S3O login page, use the
`authS3ONoRedirect` middleware. This could be because you want to protect an
API endpoint for authenticated AJAX requests, for example. If the
cookies are not present or are invalid, the `authS3ONoRedirect`
middleware will respond with a simple `403: Forbidden` response:

```js
const express = require('express');
const app = express();
const router = express.Router();
const { authS3ONoRedirect } = require('@financial-times/s3o-middleware');

app.get('/some-authenticated-api', authS3ONoRedirect, router);
```

If your application terminates https at a LoadBalancer or some other proxy, S3O will try to
redirect to the http version. You can override this by adding express middleware
to force the protocol of the redirect url.

```js
app.use('/', function(req, res, next) {
	req.headers['x-forwarded-proto'] = 'https';
	next();
});
```

### Upgrade to s3o version 4

Set `x-s3o-version` header to 'v4' and optionally pass a system-code header `x-s3o-systemcode`

```js
app.use('/', function(req, res, next) {
	req.headers['x-s3o-version'] = 'v4';
	req.headers['x-s3o-systemcode'] = 'your-system-code';
	next();
});
```
