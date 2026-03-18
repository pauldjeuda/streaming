const fs = require("fs");
const path = require("path");
const { ffmpeg } = require("./ffmpeg");

function generateThumbnail(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilename = "thumb.jpg";
    const outputPath = path.join(outputDir, outputFilename);

    ffmpeg(inputPath)
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: outputDir,
        filename: outputFilename,
        size: "720x1280",
      });
  });
}

module.exports = {
  generateThumbnail,
};