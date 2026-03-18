const ffmpeg = require("fluent-ffmpeg");

function checkFfmpeg() {
  return new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        return reject(err);
      }
      resolve(formats);
    });
  });
}

module.exports = {
  ffmpeg,
  checkFfmpeg,
};