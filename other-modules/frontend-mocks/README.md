# frontend-mocks

> Simple but flexible mock library that requires zero manual work

## Installation

Install it with npm:

```bash
npm install frontend-mocks
```

## How does it work?

`frontend-mocks` is overriding the Node's `http.request` and `https.request`
 functions by adding an interceptor. It may intercept the requests to a
 provided domains and replace the responses with a mocked data. If mocked
 data is not exist the request will be proxied to an original domain and
 mock data will be generated with a content from the proxied response.

- Testing - All tests should run offline, real network requests not only
 slow but can fail at any time. So the result of tests can be incorrect
 due to reasons that are not related to the test rules. Also remote response
 may be modified or completely removed at any time that will fail
 the tests.
- Development - The required API may not be ready at the moment of 
 development, by changing the local file we can develop as with real API
 from the future and do not slow down the process of development.


## Usage

Create an instance of mocks and register an interceptor for a required
 domain

```js
const mock = require('frontend-mocks')(options);
mock.intercept('api.mercadolibre.com');
```

That's all. The most of common HTTP clients like an [Axios](https://github.com/mzabriskie/axios)
 o [Superagent](https://github.com/visionmedia/superagent) are using Node's
 http module under the hood. By changing its behaviour we can perform a
 mocked requests independently of HTTP client library.

## Options

- `dir` - A relative or an absolute path to the mocks directory. Default:
 `mocks/${process.env.NODE_ENV}`
- `unsafe` - By default module throws an error when it used in a production
 environment, to prevent this behaviour pass the unsafe option with the
 `true` as its value. This means that you really know what you want to do,
 but please try to avoid this case in production and use it only in a demo
 purpose only.

## Mock files

Name and path of mock files are **generating automatically** on base of URL
 and the data. The complete path is constructed by using the next scheme:

```js
`${options.dir}/${method}/${proto}/${host}/${filename}.json`
```

URI path is included in filename maintaining the structure. So the GET request to
 `https://api.mercadolibre.com/countries/AR` will be saved to
 `mocks/development/get/https/api.mercadolibre.com/countries/AR.json`. Query string
 parameters will be sorted and will be added as part of the filename too, e.g. 
 `/countries/AR?z=1&a=2` will be saved as `/countries/AR?a=2&z=1.json`.

While performing the requests that can contain body like a POST, PUT or PATCH
 its data will be concatenated to the file name as a sorted query string too.

When the resulting file name is exceeds the 250 characters it will
 be shortened to its MD5 checksum. It is worse to find the file but permits
 to store the large amount of data.

Mock files are generating **always** including HTTP or network errors. If
 you are performing a request to a some URL that does no exist it will
 fail with no response, for example because domain name cannot be resolved.
 But if there is a registered interceptor for this URL the mock file will
 be created containing a generic server error (500).


Mock file has the next structure:
```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {},
  "data": {}
}
```

By changing the `status` you can mock the response status code. Headers can be changed
 or added by modifying the `headers` section. To change the response body modify the
 `data` section.

### Multiple responses for repeated requests
Mock file may contain a data for multiple responses, on every repeated request to the same url will be returned the next
  response object in a list. When requests quantity is more than the length of response objects in a list response counter
  will restart from zero element.

So for the next mock file:
```json
[
  {
    "status": 200,
    "statusText": "OK",
    "headers": {},
    "data": "first"
  },
  {
    "status": 200,
    "statusText": "OK",
    "headers": {},
    "data": "second"
  }
]
```

A few repeated requests to the same url will iterate over the responses array:
```
GET / -> 200 first
GET / -> 200 second
GET / -> 200 first
```

It may be useful when testing a complete flows. For example on the first request to `/dashboard` user has no items,
  after publishing of some item and returning to `/dashboard` user should see the published one - same url but different
  result.

## Public API

### `mock.intercept(host[, routes[, transformers]])` - Intercept the requests to the provided host.

It accepts the list of routes in a format of expressjs router, when 
 it is present will be intercepted only the requests that match this routes.

#### Transformers

Every interceptor may contain `transformers` to transform response data and headers.

The list of available transformers are:

- `transformers.transformResponse` - A function that receives data from original response and returns transformed one
- `transformers.transformHeaders` - A function that receives original headers and returns transformed ones
- `transformers.ignoreParams` - An array of query string parameters that should be omitted while constructing a mock file name,
  useful when some params are dynamic like a current timestamp
- `transformers.ignoreData` - An array of body data keys that should be omitted while constructing a mock file name, applicable
  only for `POST`, `PUT` nad `PATCH` requests that have a body

Examples:

```js
// Intercept the requests to https://api.mercadolibre.com 
mock.intercept('https://api.mercadolibre.com');

// Intercept the requests to api.mercadolibre.com for both protocols: https and http 
mock.intercept('api.mercadolibre.com');

// Intercept the requests to https://api.mercadolibre.com/sites/:site
// Matches only requests to /sites/:site and no affects the other requests
// to api.mercadolibre.com
mock.intercept('https://api.mercadolibre.com', '/sites/:site');

// Intercept the requests to api.mercadolibre.com for both protocols: https and http
// and a bunch of routes
mock.intercept('api.mercadolibre.com', [
  '/countries/:country',
  '/currency/:currency',
  '/users/*',
]);

// Intercept the requests to api.mercadolibre.com for both protocols: https and http
// Do not include `uid` param in a mock filename
mock.intercept('api.mercadolibre.com', null, {
  ignoreParams: ['uid'],
});

// Intercept the requests to https://api.mercadolibre.com/countries/*
// And transform the response by adding an additional dynamic data
mock.intercept('https://api.mercadolibre.com', '/countries/*', {
  transformResponse: function(data) {
    // Generate an unique id for every mocked request
    data.uuid = uuidv4();
    
    return data;
  },
});
```

### `mock.restore(host[, routes])` - Remove the interceptors from the provided host
 or selected routes of this host.

Example:

```js
// Restore the requests to https://api.mercadolibre.com, remove all the routes
// but only for https protocol
mock.restore('https://api.mercadolibre.com');

// Restore the requests to api.mercadolibre.com for both protocols https and http
// but only for /users/* route
mock.restore('api.mercadolibre.com', '/users/*');

// Restore the requests to api.mercadolibre.com for https protocol only
// and a specific list of routes
mock.restore('https://api.mercadolibre.com', [
  '/countries/:country',
  '/currency/:currency',
]);
```

## License

© 2016 Mercado Libre
