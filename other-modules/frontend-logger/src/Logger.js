/**
 * Module dependencies
 */
const { createLogger, format, transports } = require('winston');
const { LOG_LEVEL } = require('./env');
const json2tags = require('./json2tags');

/**
 * Available logger methods
 */
const methods = [
  'info', 'warn', 'error',
  'verbose', 'debug', 'silly',
];

/**
 * Custom message format that looks like in winston 2.x
 */
const defaultMessageFormat = format.printf(({ timestamp, level, message }) => `${timestamp} - ${level}: ${message}`);

/**
 * Winston initialization
 */
const winstonInit = createLogger({
  exitOnError: false,
  format: format.combine(
    format.timestamp(),
    defaultMessageFormat,
  ),
  transports: [
    new transports.Console({
      level: methods.includes(LOG_LEVEL) ? LOG_LEVEL : 'info',
      stderrLevels: ['error'],
      handleExceptions: true,
    }),
  ],
});

/**
 * Logger constructor
 */
function Logger(name) {
  this.name = name;
  this.client = winstonInit;
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
 * Expose Logger
 */
module.exports = Logger;
