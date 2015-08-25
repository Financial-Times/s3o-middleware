# S3O-middleware
Middleware to handle authenticating with S3O

## Environment requirements
Requires an environment key `S3O_PUBLIC_KEY` to be set with the [public key for s3o](https://s3o.ft.com/publickey)

One way to do this would be using [dotenv](https://www.npmjs.com/package/dotenv) and adding the `.env` file to your `.gitignore` file.

## Usage example for Express
If many routes require auth:
```js
// load our environment variables
require('dotenv').load();
var express = require('express');
var app = express();

// Add routes here which don't require auth
var authS3O = require('s3o-middleware');
app.use(authS3O);
// Add routes here which require auth
```
If only one route requires auth:
```js
// load our environment variables
require('dotenv').load();
var express = require('express');
var app = express();
var router = express.Router();
var authS3O = require('s3o-middleware');
router.use(authS3O);
app.use('/admin', router);
```
