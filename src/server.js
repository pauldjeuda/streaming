const fs = require("fs");
const path = require("path");

const app = require("./app");
const env = require("./config/env");
const connectDB = require("./db/mongoose");
const { checkFfmpeg } = require("./lib/ffmpeg");
const log = require("./lib/logger");

async function ensureDirectories() {
  const dirs = [env.originalsDir, env.mediaDir, env.tmpDir, "public"];
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
  }
}

async function bootstrap() {
  await ensureDirectories();
  await connectDB();
  await checkFfmpeg();
  log.info("server", "FFmpeg détecté");

  const server = app.listen(env.port, () => {
    log.info("server", `Serveur lancé sur ${env.appBaseUrl}`);
  });

  // Prevent slow HTTP DoS — connections have bounded lifetimes
  server.requestTimeout  = 30_000;   // 30 s to complete a request
  server.keepAliveTimeout = 65_000;  // slightly above common proxy idle timeouts
  server.headersTimeout   = 66_000;
}

bootstrap().catch((error) => {
  log.error("server", "Erreur au démarrage", { error: error.message });
  process.exit(1);
});
