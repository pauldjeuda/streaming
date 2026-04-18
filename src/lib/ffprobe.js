const { ffmpeg } = require("./ffmpeg");

function parseFps(str) {
  if (!str) return 30;
  const parts = str.split("/");
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!den) return 30;
    return Math.round((num / den) * 100) / 100;
  }
  return parseFloat(str) || 30;
}

function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );

      if (!videoStream) {
        return reject(new Error("Aucun flux vidéo détecté"));
      }

      const width = videoStream.width || 0;
      const height = videoStream.height || 0;
      const fps = parseFps(videoStream.r_frame_rate || videoStream.avg_frame_rate);

      resolve({
        duration: Number(metadata.format.duration || 0),
        width,
        height,
        fps,
        aspectRatio: height ? width / height : 0,
        raw: metadata,
      });
    });
  });
}

module.exports = {
  getVideoMetadata,
};
