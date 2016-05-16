# S3O-middleware
Middleware to handle authenticating with [S3O](http://s3o.ft.com/docs)

## Parsing cookies
This middleware can parse standard cookies via the [cookie](http://npmjs.com/package/cookie) package. If wanting to use signed cookies or json cookies, please use the [cookie-parser](https://www.npmjs.com/package/cookie-parser) middleware before using the S3O middleware.

# Finding the username of the logged in user
The username is added to the 's3o_username' property of the request object for all authenticated requests.

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
