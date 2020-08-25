"use strict";

/**
 * Convert json to tags string format
 */
function json2tags() {
  var tags = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return Object.keys(tags).map(function (key) {
    return "[".concat(key, ":").concat(tags[key], "]");
  }).join(' ');
}
/**
 * Expose json2tags
 */


module.exports = json2tags;