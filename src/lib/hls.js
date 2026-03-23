const fs = require("fs");
const path = require("path");
const { ffmpeg } = require("./ffmpeg");

const RENDITIONS = [
  { name: "low", width: 426, height: 760, bandwidth: 600000 },    // 240p vertical - PLUS RAPIDE
  { name: "medium", width: 640, height: 1140, bandwidth: 1200000 }, // 360p vertical
  { name: "high", width: 720, height: 1280, bandwidth: 2500000 },   // 480p vertical - LIMITÉ
];

function generateVariant(inputPath, outputDir, rendition) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPath = path.join(outputDir, "segment_%03d.ts");

    ffmpeg(inputPath)
      .videoFilters(`scale=${rendition.width}:${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2:black`)
      .outputOptions([
        "-preset ultrafast",        // ULTRA RAPIDE
        "-g 24",                   // Keyframes plus fréquents
        "-sc_threshold 0",
        "-map 0:v:0",
        "-map 0:a:0?",
        "-c:v libx264",
        "-c:a aac",
        `-b:v ${Math.round(rendition.bandwidth / 1000)}k`,
        "-b:a 96k",                // Audio bitrate réduit pour vitesse
        "-ac 2",
        "-ar 44100",               // Audio sample rate réduit
        "-f hls",
        "-hls_time 2",
        "-hls_playlist_type vod",
        `-hls_segment_filename ${segmentPath}`,
        "-tune fastdecode",        // Optimisé pour décodage rapide
        "-movflags +faststart",    // Optimisé pour streaming
      ])
      .output(playlistPath)
      .on("end", () => {
        const segments = fs
          .readdirSync(outputDir)
          .filter((file) => file.endsWith(".ts"))
          .sort();

        resolve({
          playlistPath,
          segmentPattern: segmentPath,
          segments,
        });
      })
      .on("error", (err) => reject(err))
      .run();
  });
}

async function generateHls(inputPath, outputDir) {
  const results = [];

  for (const rendition of RENDITIONS) {
    const variantOutputDir = path.join(outputDir, rendition.name);
    const generated = await generateVariant(inputPath, variantOutputDir, rendition);
    results.push({ rendition, ...generated });
  }

  return results;
}

function createMasterPlaylist(videoDir, variants) {
  const masterPath = path.join(videoDir, "master.m3u8");
  const content = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    ...variants.flatMap((variant) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.resolution}`,
      `${variant.name}/index.m3u8`,
    ]),
    "",
  ].join("\n");

  fs.writeFileSync(masterPath, content, "utf8");
  return masterPath;
}

module.exports = {
  generateHls,
  createMasterPlaylist,
  RENDITIONS,
};
