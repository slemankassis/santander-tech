/**
 * Module dependencies
 */
const Logger = require('./src/Logger');

/**
 * Expose logger factory
 */
module.exports = name => new Logger(name);
