const fs = require("fs");
const path = require("path");

const app = require("./app");
const env = require("./config/env");
const connectDB = require("./db/mongoose");
const { checkFfmpeg } = require("./lib/ffmpeg");

async function ensureDirectories() {
  const dirs = [
    env.originalsDir,
    env.mediaDir,
    env.tmpDir,
    "public",
  ];

  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

async function bootstrap() {
  await ensureDirectories();

  await connectDB();
  await checkFfmpeg();

  console.log("FFmpeg détecté");

  app.listen(env.port, () => {
    console.log(`Serveur lancé sur ${env.appBaseUrl}`);
  });
}

bootstrap().catch((error) => {
  console.error("Erreur au démarrage :", error);
  process.exit(1);
});