const { ffmpeg } = require("./ffmpeg");

function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );

      if (!videoStream) {
        return reject(new Error("Aucun flux vidéo détecté"));
      }

      const width = videoStream.width || 0;
      const height = videoStream.height || 0;

      resolve({
        duration: Number(metadata.format.duration || 0),
        width,
        height,
        aspectRatio: height ? width / height : 0,
        raw: metadata,
      });
    });
  });
}

module.exports = {
  getVideoMetadata,
};