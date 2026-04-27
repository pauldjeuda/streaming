const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const ACTIVE = LEVELS[process.env.LOG_LEVEL || "info"] ?? 2;

function log(level, module, message, meta = {}) {
  if (LEVELS[level] > ACTIVE) return;
  const entry = { ts: new Date().toISOString(), level, module, message, ...meta };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(entry));
}

module.exports = {
  error: (mod, msg, meta) => log("error", mod, msg, meta),
  warn:  (mod, msg, meta) => log("warn",  mod, msg, meta),
  info:  (mod, msg, meta) => log("info",  mod, msg, meta),
  debug: (mod, msg, meta) => log("debug", mod, msg, meta),
};
