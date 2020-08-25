const http = require('http');
const https = require('https');
const url = require('url');
const queryString = require('query-string');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const { EventEmitter } = require('events');
const is = require('type-is');
const omit = require('lodash.omit');
const debug = require('debug')('mock:main');
const logger = require('frontend-logger');
const Interceptor = require('./interceptor');
const mockRequest = require('./mock-request');

const log = logger('mocks');

const IncomingMessage = http.IncomingMessage;
let originalHTTPRequest;
let originalHTTPSRequest;

// Counter for iterating multiple responses for repeated requests
const reqCounter = {};

function normalizeHost(hostname) {
  if (typeof hostname !== 'string') {
    throw new Error('Host must be a string');
  }

  const hosts = [];

  if (/^[a-z]{3,4}:\/\//.test(hostname) && !hostname.startsWith('http')) {
    throw new Error('Unsupported protocol');
  } else if (!/^https?:\/\//.test(hostname)) {
    hosts.push(`http://${hostname}`);
    hosts.push(`https://${hostname}`);
  } else {
    hosts.push(hostname);
  }

  return hosts;
}

function isFileExist(filePath) {
  try {
    const stats = fs.statSync(filePath);

    return stats.isFile() && stats.size > 0;
  } catch (e) {
    return false;
  }
}

function writeFile(name, content) {
  const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  return new Promise((resolve) => {
    mkdirp(path.dirname(name), (err) => {
      if (err) {
        log.error(err);
      }

      fs.writeFile(name, fileContent, (err2) => {
        if (err2) {
          log.error(err2);
        }

        log.info(`Mocked data written to ${name.replace(process.cwd(), '.')}`);
      });

      return resolve(content);
    });
  });
}

class Mock {
  constructor(options = {}) {
    debug('constructor called with options %j', options);
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production' && !options.unsafe) {
      throw new Error('Using of mocks in production is not recommended. Use {unsafe: true} to override this behaviour');
    }

    this.options = {
      dir: path.resolve(options.dir || `mocks/${env}`),
    };

    this.interceptor = new Interceptor();
    this._patchRequest();
  }

  intercept(host, routes, transformers) {
    debug('intercept host %s with routes %j and transformers %j', host, routes, transformers);

    const hosts = normalizeHost(host);

    hosts.forEach((h) => {
      const urlData = url.parse(h);
      this.interceptor.register(urlData.protocol, urlData.hostname, routes, transformers);
    });
  }

  restore(host, routes) {
    debug('restore host %s with routes %j', host, routes);

    const hosts = normalizeHost(host);

    hosts.forEach((h) => {
      const urlData = url.parse(h);
      this.interceptor.deregister(urlData.protocol, urlData.hostname, routes);
    });
  }

  mockFilename(options, transformers = {}) {
    const method = options.method ? options.method.toLowerCase() : 'get';
    const proto = options.protocol.replace(':', '');
    const host = options.hostname;
    const pathParts = options.path.split('?');
    let pathname = options.pathname;
    let qs = options.query;

    if (!pathname) {
      pathname = pathParts[0];
    }

    if (!qs && pathParts.length > 1) {
      qs = pathParts[1];
    }

    // Using query-string instead of Node querystring since it automatically sorts the keys
    const params = omit(queryString.parse(qs), transformers.ignoreParams);
    qs = queryString.stringify(params);

    if (options.body) {
      const contentType = options.headers['content-type'];
      const detectedType = is.is(contentType, ['urlencoded', 'json', 'multipart', 'text']);
      let body;

      switch (detectedType) {
        case 'urlencoded':
          debug('parsing urlencoded form data');
          try {
            body = queryString.parse(options.body);
          } catch (e) {
            log.warn(`Form data of '${options.path}' has a wrong format`);
          }
          break;
        case 'json':
          debug('parsing json body');
          try {
            body = JSON.parse(options.body);
          } catch (e) {
            log.warn(`JSON body of '${options.path}' has a wrong format`);
          }
          break;
        case 'multipart':
          debug('parsing multipart data');
          throw new Error('implement multipart body parsing');
        default:
          debug('parsing %s data type', detectedType);
          body = JSON.stringify(options.body);
      }

      if (body) {
        // query-string module intentionally doesn't support nesting as it's not spec'd
        // and varies between implementations. So we just stringified the nested objects
        if (typeof body === 'object') {
          const obj = omit(Object.assign({}, body), transformers.ignoreData);

          Object.keys(obj).forEach((key) => {
            if (typeof obj[key] === 'object') {
              obj[key] = JSON.stringify(obj[key]);
            }
          });

          qs = qs.length > 0 ? `${qs}&${queryString.stringify(obj)}` : queryString.stringify(obj);
        } else {
          qs += encodeURIComponent(body);
        }
      }
    }

    let filename = `${pathname}${(qs ? '?' : '') + qs}`;

    // Avoid the long filenames that is not allowed on some filesystems
    if (filename.length > 250) {
      filename = crypto.createHash('md5').update(filename).digest('hex');
    }

    debug('generated mock filename: %s', filename);

    return path.normalize(`${this.options.dir}/${method}/${proto}/${host}/${filename}.json`);
  }

  _patchRequest() {
    debug('patching http request');

    // Allow to patch original request only once
    if (originalHTTPRequest) {
      return;
    }

    originalHTTPRequest = http.request;
    originalHTTPSRequest = (options, cb) => {
      const opts = typeof options === 'string' ? url.parse(options) : options;

      opts._defaultAgent = https.globalAgent;
      return originalHTTPRequest(opts, cb);
    };

    http.request = (options, callback) => {
      let opts = typeof options === 'string' ? url.parse(options) : options;

      if (!opts.hostname && opts.host) {
        opts.hostname = opts.host;
      }

      opts = Object.assign({
        hostname: 'localhost',
        path: '/',
        body: '',
      }, opts);

      if (!opts.protocol) {
        opts.protocol = opts._defaultAgent ? opts._defaultAgent.protocol : 'http:';
      }

      debug('matching %s//%s%s', opts.protocol, opts.hostname, opts.path);
      const result = this.interceptor.match(opts);
      if (!result.matches) {
        return (opts.protocol === 'https:' ? originalHTTPSRequest : originalHTTPRequest)(opts, callback);
      }

      const req = mockRequest();
      const res = new IncomingMessage(new EventEmitter());

      req.res = res;
      res.req = req;

      if (typeof opts.headers === 'object') {
        Object.keys(opts.headers).forEach((key) => {
          req.setHeader(key, opts.headers[key]);
        });
      }
      opts.headers = req._headers;

      // req.path is not necessary and is not the part of Node http API,
      // but Newrelic has its own interceptor where it adds the req.path
      // and tracing may fail when this attribute is not present
      if (!req.path) {
        req.path = opts.path;
      }

      req.on('data', (chunk) => {
        let bodyPart = '';

        if (Buffer.isBuffer(chunk)) {
          bodyPart = chunk.toString();
        } else if (typeof chunk !== 'string') {
          debug('unsupported body chunk type: %s', typeof chunk);
        } else {
          bodyPart = chunk;
        }

        debug('writing body chunk %s', bodyPart);
        opts.body += bodyPart;
      });

      if (callback) {
        req.on('response', callback);
      }

      req.on('end', () => {
        this.getMockedData(opts, result.transformers)
          .then((responseData) => {
            debug('mocked data for the future response %j', responseData);
            const mockData = [];
            mockData.push(JSON.stringify(typeof result.transformers.transformResponse === 'function' ?
              result.transformers.transformResponse(responseData.data) : responseData.data));

            // Set defaults as they described in http.request
            res.method = opts.method || 'GET';
            res.statusCode = Number(responseData.status) || 200;
            res.statusMessage = responseData.statusText || http.STATUS_CODES[res.statusCode];
            res.url = opts.href;
            res.headers = {};
            res.rawHeaders = [];

            if (typeof result.transformers.transformHeaders === 'function') {
              responseData.headers = result.transformers.transformHeaders(responseData.headers);
            }

            Object.keys(responseData.headers || {}).forEach((k) => {
              res.headers[k.toLowerCase()] = responseData.headers[k];
              res.rawHeaders.push(k, responseData.headers[k]);
            });

            // Some libs like a superagent trying to unzip the response when "Content-Encoding": "gzip" is present
            // Our response is always unzipped so remove that header
            if (res.headers['content-encoding'] === 'gzip') {
              delete res.headers['content-encoding'];
            }

            // Remove the "Content-Length" header to not confuse the clients with wrong value when response is modified
            // by hand
            delete res.headers['content-length'];

            const ondata = function ondata() {
              let chunk = mockData.shift();
              if (!chunk) {
                if (!req.aborted) {
                  res.push(null);
                }
                return;
              }

              if (!req.aborted) {
                if (typeof chunk === 'string') {
                  chunk = new Buffer(chunk, res.charset || 'utf8');
                }
                if (res.charset) {
                  chunk = chunk.toString(res.charset);
                }
                res.push(chunk);
              }
              process.nextTick(ondata);
            };

            if (!req.aborted) {
              req.emit('response', res);
              process.nextTick(ondata);
            }
          });
      });

      return req;
    };
  }

  getMockedData(options, transformers) {
    debug('getting mocked data for %j', options);

    const mockFilename = this.mockFilename(options, transformers);
    const friendlyFilename = mockFilename.replace(process.cwd(), '.');
    let responseData = {};

    return new Promise((resolve, reject) => {
      if (isFileExist(mockFilename)) {
        try {
          const _responseData = JSON.parse(fs.readFileSync(mockFilename));

          if (Array.isArray(_responseData)) {
            let current = reqCounter[friendlyFilename];

            if (typeof current === 'undefined') {
              current = 0;
            }

            responseData = _responseData[current];
            // trigger counter when response is an array (multiple) on every data request
            reqCounter[friendlyFilename] = current + 1 >= _responseData.length ?
              0 : current + 1;
          } else {
            responseData = _responseData;
          }
        } catch (ex) {
          log.warn(`Mock file ${friendlyFilename} for ${options.path} has wrong format`);
        }

        return resolve(responseData);
      }

      return this.getOriginalData(options)
        .then((data) => {
          if (data.status === 404) {
            log.warn(`Writing the mock for non existent resource ${options.path}`);
          } else if (data.status >= 500) {
            log.warn(`Writing the mock for ${options.path} with an error ${data.status}: ${data.statusText}
    Please review the content of ${friendlyFilename}`);
          }

          return writeFile(mockFilename, data);
        })
        .then(data => resolve(data))
        .catch(e => reject(e));
    });
  }

  getOriginalData(options) { // eslint-disable-line
    debug('getting original data for %j', options);

    return new Promise((resolve) => {
      const isSecure = options.protocol === 'https:';

      const req = (isSecure ? originalHTTPSRequest : originalHTTPRequest)(options, (res) => {
        const body = [];
        res.on('data', (chunk) => {
          body.push(chunk);
        });

        res.on('end', () => {
          const data = Buffer.concat(body).toString('utf8');

          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: is.is(res.headers['content-type'], ['json']) && data ? JSON.parse(data) : data,
          });
        });
      });

      if (['post', 'put', 'patch'].indexOf(options.method.toLowerCase()) !== -1) {
        req.write(options.body || '');
      }

      req.on('error', (e) => {
        log.warn(`Failed to fetch the original data, request failed with an error:\n${e.message}`);

        // Do not reject when original request is failing, just resolve with the error data
        // So the mock file will be generated in any case
        resolve({
          status: 500,
          statusText: http.STATUS_CODES[500],
          headers: {},
          data: e.message,
        });
      });

      req.end();
    });
  }
}

module.exports = Mock;
