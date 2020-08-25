const { EventEmitter } = require('events');
const debug = require('debug')('mock:request');

function mockRequest() {
  const req = new EventEmitter();

  // Using the names prefixed with underscore to not generate conflicts when the mocked request will be proxied to an
  // original http.request while fetching original data
  req._headers = {};
  req._headerNames = {};

  req.setHeader = function setHeader(name, value) {
    debug('setHeader', name, value);

    const key = name.toLowerCase();

    req._headers[key] = value;
    req._headerNames[key] = name;

    if (name === 'expect' && value.toLowerCase() === '100-continue') {
      setImmediate(() => {
        req.emit('continue');
      });
    }
  };

  req.getHeader = function getHeader(name) {
    if (!Object.keys(req._headers).length) {
      return null;
    }

    const key = name.toLowerCase();

    return req._headers[key];
  };

  req.abort = function abort() {
    debug('req.abort');

    const err = new Error('socket hang up');

    req.aborted = true;

    err.code = 'aborted';
    req.res.emit('close', err);

    req.emit('abort');

    process.nextTick(() => {
      err.code = 'ECONNRESET';
      req.emit('error', err);
    });
  };

  req.write = function write(buffer, encoding) {
    debug('req.write', buffer, encoding);
    let result = false;

    if (buffer && !req.aborted) {
      if (!Buffer.isBuffer(buffer)) {
        buffer = new Buffer(buffer, encoding); // eslint-disable-line
      }
      req.emit('data', buffer);
      result = true;
    }

    if (req.aborted) {
      process.nextTick(() => {
        req.emit('error', new Error('Request aborted'));
      });
    }

    setImmediate(() => {
      req.emit('drain');
    });

    return result;
  };

  req.end = function end(buffer, encoding) {
    debug('req.end');

    if (!req.aborted) {
      req.write(buffer, encoding);
      req.emit('finish');
      req.emit('end');
    }

    if (req.aborted) {
      process.nextTick(() => {
        req.emit('error', new Error('Request aborted'));
      });
    }
  };

  return req;
}

module.exports = mockRequest;
