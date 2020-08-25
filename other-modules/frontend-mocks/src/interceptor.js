const url = require('url');
const pathToRegexp = require('path-to-regexp');
const debug = require('debug')('mock:interceptor');

/**
 * Registered interceptors collection
 *
 * @type {{http: {}, https: {}}}
 */
const registeredInterceptors = {
  'http:': {},
  'https:': {},
};

/**
 * Interceptor class
 */
class Interceptor {
  constructor() {
    this.interceptors = registeredInterceptors;
  }

  /**
   * Register a new interceptor
   *
   * @param {string} protocol
   * @param {string} hostname
   * @param {string|array} path
   * @param {object} transformers
   * @return {*}
   */
  register(protocol, hostname, path, transformers = {}) {
    debug('Registering new interceptor: %s, %s, %j, %j', protocol, hostname, path, transformers);

    if (!protocol || !hostname) {
      throw new Error('protocol and hostname are required');
    }
    const interceptors = this.interceptors;
    const proto = protocol.endsWith(':') ? protocol : `${protocol}:`;
    let routePatterns = path;

    if (!interceptors[proto]) {
      throw new Error(`Unsupported protocol ${proto}`);
    }

    if (!interceptors[proto][hostname]) {
      interceptors[proto][hostname] = {};
    }

    if (!routePatterns) {
      routePatterns = ['/*'];
    }

    if (typeof routePatterns === 'string') {
      routePatterns = [routePatterns];
    }

    routePatterns.forEach((p) => {
      const pattern = p === '/' ? '/*' : p;

      interceptors[protocol][hostname][pattern] = transformers;
    });

    return interceptors[protocol][hostname];
  }

  /**
   * Deregister an interceptor
   *
   * If you have a doubt about "unregister" vs "deregister" please read this genial explanation http://english.stackexchange.com/a/40095
   *
   * @param protocol
   * @param hostname
   * @param path
   * @return {*}
   */
  deregister(protocol, hostname, path) {
    debug('Deregistering the interceptor: %s, %s, %j', protocol, hostname, path);

    const interceptors = this.interceptors;
    const proto = protocol.endsWith(':') ? protocol : `${protocol}:`;
    let routePatterns = path;

    if (!interceptors[proto] || !interceptors[proto][hostname]) {
      return null;
    }

    if (!routePatterns) {
      interceptors[proto][hostname] = {};
    } else {
      if (typeof routePatterns === 'string') {
        routePatterns = [routePatterns];
      }
      routePatterns.forEach((p) => {
        // Delete only when exist since it's faster than just try to delete everything
        if (interceptors[proto][hostname][p]) {
          delete interceptors[proto][hostname][p];
        }
      });
    }

    return interceptors[proto][hostname];
  }

  /**
   * Matches provided domain and path with the registered interceptors
   *
   * Uses the same options object as https://nodejs.org/api/http.html#http_http_request_options_callback
   *
   * @param {(String|Object)} options
   * @return {{matches: boolean, transformers: {}}}
   */
  match(options) {
    let opts = options;

    if (!opts) {
      throw new Error('Options parameter is required');
    } else if (typeof opts === 'string') {
      opts = url.parse(options);
    } else if (typeof opts !== 'object') {
      throw new Error('Options parameter must be an object');
    }

    debug('Matching the interceptor for %j', opts);

    const interceptors = this.interceptors;
    const protocol = opts.protocol;
    const hostname = opts.hostname;
    const path = opts.path;

    let match = false;

    if (!interceptors[protocol] || !interceptors[protocol][hostname]) {
      return {
        matches: match,
        transformers: {},
      };
    }

    let idx = 0;
    let rx;
    const stack = Object.keys(interceptors[protocol][hostname]);

    while (match !== true && idx < stack.length) {
      rx = stack[idx];
      const regex = pathToRegexp(rx);

      if (regex.exec(path) !== null) {
        match = true;
      }
      idx += 1;
    }

    return {
      matches: match,
      transformers: interceptors[protocol][hostname][rx],
    };
  }
}

module.exports = Interceptor;
