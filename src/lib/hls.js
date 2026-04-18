const fs = require("fs");
const path = require("path");
const { ffmpeg } = require("./ffmpeg");

const SEGMENT_DURATION = 4; // YouTube uses 4-8s segments

// YouTube-style landscape quality ladder (16:9)
const LANDSCAPE_RENDITIONS = [
  { name: "360p",  width: 640,  height: 360,  bandwidth: 800000,  audioBitrate: 128, profile: "baseline", level: "3.0", codec: "avc1.42E01E" },
  { name: "480p",  width: 854,  height: 480,  bandwidth: 1500000, audioBitrate: 128, profile: "main",     level: "3.1", codec: "avc1.4D401F" },
  { name: "720p",  width: 1280, height: 720,  bandwidth: 3000000, audioBitrate: 192, profile: "high",     level: "4.0", codec: "avc1.640028" },
  { name: "1080p", width: 1920, height: 1080, bandwidth: 6000000, audioBitrate: 192, profile: "high",     level: "4.0", codec: "avc1.640028" },
];

// Portrait quality ladder (9:16) for short-form vertical video
const PORTRAIT_RENDITIONS = [
  { name: "360p",  width: 202,  height: 360,  bandwidth: 500000,  audioBitrate: 96,  profile: "baseline", level: "3.0", codec: "avc1.42E01E" },
  { name: "480p",  width: 270,  height: 480,  bandwidth: 900000,  audioBitrate: 128, profile: "main",     level: "3.1", codec: "avc1.4D401F" },
  { name: "720p",  width: 406,  height: 720,  bandwidth: 1800000, audioBitrate: 128, profile: "high",     level: "4.0", codec: "avc1.640028" },
  { name: "1080p", width: 608,  height: 1080, bandwidth: 3500000, audioBitrate: 192, profile: "high",     level: "4.0", codec: "avc1.640028" },
];

// Select renditions appropriate for the input resolution — never upscale
function selectRenditions(meta) {
  const { width, height } = meta;
  const isLandscape = width >= height;
  const baseRenditions = isLandscape ? LANDSCAPE_RENDITIONS : PORTRAIT_RENDITIONS;
  const inputLimit = isLandscape ? height : width;
  const getRefDim = (r) => (isLandscape ? r.height : r.width);

  const applicable = baseRenditions.filter((r) => getRefDim(r) <= inputLimit * 1.1);
  return applicable.length > 0 ? applicable : [baseRenditions[0]];
}

function generateVariant(inputPath, outputDir, rendition, fps) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPath = path.join(outputDir, "segment_%04d.ts");
    const gopSize = Math.round((fps || 30) * SEGMENT_DURATION);

    ffmpeg(inputPath)
      .videoFilters(
        `scale=${rendition.width}:${rendition.height}:force_original_aspect_ratio=decrease,` +
        `pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2:black`
      )
      .outputOptions([
        "-c:v libx264",
        `-profile:v ${rendition.profile}`,
        `-level:v ${rendition.level}`,
        "-preset fast",                          // Better compression than ultrafast
        `-b:v ${Math.round(rendition.bandwidth / 1000)}k`,
        `-maxrate ${Math.round(rendition.bandwidth * 1.5 / 1000)}k`,
        `-bufsize ${Math.round(rendition.bandwidth * 2 / 1000)}k`,
        `-g ${gopSize}`,                         // GOP aligned to segment duration
        `-keyint_min ${gopSize}`,
        "-sc_threshold 0",                       // No scene-cut keyframes
        `-force_key_frames expr:gte(t,n_forced*${SEGMENT_DURATION})`, // Exact keyframe boundaries
        "-map 0:v:0",
        "-map 0:a:0?",
        "-c:a aac",
        `-b:a ${rendition.audioBitrate}k`,
        "-ac 2",
        "-ar 48000",                             // YouTube standard sample rate
        "-f hls",
        `-hls_time ${SEGMENT_DURATION}`,
        "-hls_playlist_type vod",
        "-hls_flags independent_segments",       // Random access to any segment
        `-hls_segment_filename ${segmentPath}`,
      ])
      .output(playlistPath)
      .on("end", () => {
        const segments = fs
          .readdirSync(outputDir)
          .filter((f) => f.endsWith(".ts"))
          .sort();
        resolve({ playlistPath, segmentPattern: segmentPath, segments });
      })
      .on("error", reject)
      .run();
  });
}

async function generateHls(inputPath, outputDir, meta) {
  const fps = (meta && meta.fps) || 30;
  const renditions = selectRenditions(meta || { width: 1920, height: 1080 });
  const results = [];

  for (const rendition of renditions) {
    const variantOutputDir = path.join(outputDir, rendition.name);
    const generated = await generateVariant(inputPath, variantOutputDir, rendition, fps);
    results.push({ rendition, ...generated });
  }

  return results;
}

function createMasterPlaylist(videoDir, variants, fps) {
  const masterPath = path.join(videoDir, "master.m3u8");
  const frameRate = fps ? Number(fps).toFixed(3) : "30.000";

  const lines = ["#EXTM3U", "#EXT-X-VERSION:4", ""];

  for (const variant of variants) {
    const avgBandwidth = Math.round(variant.bandwidth * 0.8);
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},AVERAGE-BANDWIDTH=${avgBandwidth},` +
      `RESOLUTION=${variant.resolution},` +
      `CODECS="${variant.codec || "avc1.640028"},mp4a.40.2",` +
      `FRAME-RATE=${frameRate}`,
      `${variant.name}/index.m3u8`
    );
  }

  lines.push("");
  fs.writeFileSync(masterPath, lines.join("\n"), "utf8");
  return masterPath;
}

module.exports = {
  generateHls,
  createMasterPlaylist,
  LANDSCAPE_RENDITIONS,
  PORTRAIT_RENDITIONS,
  SEGMENT_DURATION,
};
