/**
 * Module dependencies
 */
const json2tags = require('./json2tags');

/**
 * logger
 */
const client = window.console; // eslint-disable-line no-undef

/**
 * Available logger methods
 */
const methods = ['info', 'warn', 'error', 'debug'];

/**
 * Unavailable methods into window.console
 */
const unavailableMethods = ['verbose', 'silly'];

/**
 * Logger constructor
 */
function Logger(name = '') {
  this.name = name;
  this.client = client;
  return this;
}

/**
 * Add available method to the prototype
 */
methods.forEach((method) => {
  // eslint-disable-next-line func-names
  Logger.prototype[method] = function (msg, tags = {}) {
    if (this.name) {
      tags.name = this.name;
    }
    tags.level = method.toUpperCase();
    this.client[method](`${msg} - ${json2tags(tags)}`);
  };
});

/**
 * Add unavailable method to the prototype
 */
unavailableMethods.forEach((method) => {
  // eslint-disable-next-line func-names
  Logger.prototype[method] = function (msg, tags = {}) {
    if (this.name) {
      tags.name = this.name;
    }
    tags.level = method.toUpperCase();
    this.client.log(`${msg} - ${json2tags(tags)}`);
  };
});

/**
 * Expose Logger factory
 */
module.exports = function loggerFactory(name) {
  return new Logger(name);
};
