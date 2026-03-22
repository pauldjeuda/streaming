const path = require("path");
const Video = require("../videos/video.model");

async function createUploadedVideo({ file, caption, userId }) {
  const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, "/");

  const video = await Video.create({
    caption: caption || "",
    userId: userId || 'creator-demo',
    originalFilename: file.originalname,
    originalPath: relativePath,
    status: "uploaded",
  });

  return video;
}

module.exports = {
  createUploadedVideo,
};
