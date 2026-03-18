const path = require("path");

function toAbsolutePath(relativePath) {
  return path.join(process.cwd(), relativePath);
}

module.exports = {
  toAbsolutePath,
};