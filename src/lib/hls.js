const fs = require("fs");
const path = require("path");
const { ffmpeg } = require("./ffmpeg");

function generateHls(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPath = path.join(outputDir, "segment_%03d.ts");

    ffmpeg(inputPath)
      .outputOptions([
        "-preset veryfast",
        "-g 48",
        "-sc_threshold 0",
        "-map 0:v:0",
        "-map 0:a:0?",
        "-c:v libx264",
        "-c:a aac",
        "-b:v 1200k",
        "-b:a 128k",
        "-vf scale=-2:1280",
        "-f hls",
        "-hls_time 4",
        "-hls_playlist_type vod",
        `-hls_segment_filename ${segmentPath}`,
      ])
      .output(playlistPath)
      .on("end", () => {
        resolve({
          playlistPath,
          segmentPattern: segmentPath,
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });
}

function createMasterPlaylist(videoDir) {
  const masterPath = path.join(videoDir, "master.m3u8");
  const content = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    '#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=720x1280',
    "index.m3u8",
    "",
  ].join("\n");

  fs.writeFileSync(masterPath, content, "utf8");
  return masterPath;
}

module.exports = {
  generateHls,
  createMasterPlaylist,
};