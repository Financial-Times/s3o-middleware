# S3O-middleware
Middleware to handle authenticating with [S3O](http://s3o.ft.com/docs)

## Parsing cookies
This middleware can parse standard cookies via the [cookie](http://npmjs.com/package/cookie) package. If wanting to use signed cookies or json cookies, please use the [cookie-parser](https://www.npmjs.com/package/cookie-parser) middleware before using the S3O middleware.

# Finding the username of the logged in user
The username is added to the 's3o_username' property of the res.locals object for all authenticated requests.

# Setting the ttl of the cookie for an authenticated request
Defaults to fifteen minutes. Use Express' `app.set` function before sending users to authenticate:
`app.set('s3o-cookie-ttl', 86400000); // one day (in ms)`

## Usage example for Express
If many routes require auth:
```js
var express = require('express');
var app = express();

// Add routes here which don't require auth
var authS3O = require('s3o-middleware');
app.use(authS3O);
// Add routes here which require auth
```
If only paths within a given directory require auth:
```js
var express = require('express');
var app = express();
var router = express.Router();
var authS3O = require('s3o-middleware');
router.use(authS3O);
app.use('/admin', router);
```
If specific paths require auth:
```js
var express = require('express');
var app = express();
var router = express.Router();
var authS3O = require('s3o-middleware');

app.get('/', authS3O, router);
app.post('/', authS3O);
```

If you don't want the automatic redirect to the S3O login page, use the
`authS3ONoRedirect` middleware. This could be because you want to protect an
API endpoint for authenticated AJAX requests, for example. If the
cookies are not present or are invalid, the `authS3ONoRedirect` 
middleware will respond with a simple `403: Forbidden` response:

```js
var express = require('express');
var app = express();
var router = express.Router();
var authS3ONoRedirect = require('s3o-middleware').authS3ONoRedirect;

app.get('/some-athenticated-api', authS3ONoRedirect, router);
```
