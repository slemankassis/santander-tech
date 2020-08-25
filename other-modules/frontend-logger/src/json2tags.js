/**
 * Convert json to tags string format
 */
function json2tags(tags = {}) {
  return Object.keys(tags)
    .map(key => `[${key}:${tags[key]}]`)
    .join(' ');
}

/**
 * Expose json2tags
 */
module.exports = json2tags;
