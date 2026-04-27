const mongoose = require("mongoose");
const env = require("../config/env");
const log = require("../lib/logger");

async function connectDB() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      log.info("db", "MongoDB connecté");
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 16_000);
      log.warn("db", `MongoDB connexion échouée, retry dans ${delay}ms`, { attempt, error: err.message });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

module.exports = connectDB;
