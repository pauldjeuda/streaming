const fs = require("fs");
const path = require("path");
const { ffmpeg } = require("./ffmpeg");

const SPRITE_THUMB_WIDTH = 160;
const SPRITE_THUMB_HEIGHT = 90;
const SPRITE_COLUMNS = 10;
const SPRITE_INTERVAL_SECONDS = 5;

// Generate main thumbnail at ~10% of duration (avoids black opening frames)
function generateThumbnail(inputPath, outputDir, duration) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilename = "thumb.jpg";
    const outputPath = path.join(outputDir, outputFilename);
    const seekTime = duration ? Math.max(1, duration * 0.1) : 1;

    ffmpeg(inputPath)
      .seekInput(seekTime)
      .outputOptions([
        "-vframes 1",
        "-vf scale=1280:-2",
        "-q:v 3",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

function formatVttTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = (totalSeconds % 60).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s}`;
}

// Generate sprite sheet + WebVTT storyboard for seek bar hover preview (YouTube-style)
async function generateThumbnailSprite(inputPath, outputDir, duration) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const totalThumbs = Math.max(1, Math.ceil(duration / SPRITE_INTERVAL_SECONDS));
  const columns = Math.min(SPRITE_COLUMNS, totalThumbs);
  const rows = Math.ceil(totalThumbs / columns);

  const spritePath = path.join(outputDir, "sprite.jpg");
  const vttPath = path.join(outputDir, "storyboard.vtt");

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf fps=1/${SPRITE_INTERVAL_SECONDS},` +
          `scale=${SPRITE_THUMB_WIDTH}:${SPRITE_THUMB_HEIGHT}:force_original_aspect_ratio=decrease,` +
          `pad=${SPRITE_THUMB_WIDTH}:${SPRITE_THUMB_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,` +
          `tile=${columns}x${rows}`,
        "-q:v 5",
        "-frames:v 1",
      ])
      .output(spritePath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  // Build WebVTT — each cue maps a time range to a region of the sprite image
  let vtt = "WEBVTT\n\n";
  for (let i = 0; i < totalThumbs; i++) {
    const startSec = i * SPRITE_INTERVAL_SECONDS;
    const endSec = Math.min((i + 1) * SPRITE_INTERVAL_SECONDS, duration);
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = col * SPRITE_THUMB_WIDTH;
    const y = row * SPRITE_THUMB_HEIGHT;

    vtt += `${formatVttTime(startSec)} --> ${formatVttTime(endSec)}\n`;
    vtt += `sprite.jpg#xywh=${x},${y},${SPRITE_THUMB_WIDTH},${SPRITE_THUMB_HEIGHT}\n\n`;
  }

  fs.writeFileSync(vttPath, vtt, "utf8");

  return { spritePath, vttPath };
}

module.exports = {
  generateThumbnail,
  generateThumbnailSprite,
  SPRITE_THUMB_WIDTH,
  SPRITE_THUMB_HEIGHT,
};
