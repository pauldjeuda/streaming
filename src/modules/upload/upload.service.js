const path = require("path");
const Video = require("../videos/video.model");

async function createUploadedVideo({ file, caption }) {
  const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, "/");

  const video = await Video.create({
    caption: caption || "",
    originalFilename: file.originalname,
    originalPath: relativePath,
    status: "uploaded",
  });

  return video;
}

module.exports = {
  createUploadedVideo,
};