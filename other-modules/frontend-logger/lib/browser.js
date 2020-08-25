"use strict";

/**
 * Module dependencies
 */
var json2tags = require('./json2tags');
/**
 * logger
 */


var client = window.console; // eslint-disable-line no-undef

/**
 * Available logger methods
 */

var methods = ['info', 'warn', 'error', 'debug'];
/**
 * Unavailable methods into window.console
 */

var unavailableMethods = ['verbose', 'silly'];
/**
 * Logger constructor
 */

function Logger() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  this.name = name;
  this.client = client;
  return this;
}
/**
 * Add available method to the prototype
 */


methods.forEach(function (method) {
  // eslint-disable-next-line func-names
  Logger.prototype[method] = function (msg) {
    var tags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (this.name) {
      tags.name = this.name;
    }

    tags.level = method.toUpperCase();
    this.client[method]("".concat(msg, " - ").concat(json2tags(tags)));
  };
});
/**
 * Add unavailable method to the prototype
 */

unavailableMethods.forEach(function (method) {
  // eslint-disable-next-line func-names
  Logger.prototype[method] = function (msg) {
    var tags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (this.name) {
      tags.name = this.name;
    }

    tags.level = method.toUpperCase();
    this.client.log("".concat(msg, " - ").concat(json2tags(tags)));
  };
});
/**
 * Expose Logger factory
 */

module.exports = function loggerFactory(name) {
  return new Logger(name);
};