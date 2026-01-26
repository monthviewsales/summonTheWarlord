const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL = (process.env.WARLORD_LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info")).toLowerCase();
const LOG_JSON = process.env.WARLORD_LOG_JSON === "1";

function shouldLog(level) {
  const current = LEVELS[DEFAULT_LEVEL] ?? LEVELS.info;
  return LEVELS[level] >= current;
}

function formatPayload(level, message, meta) {
  if (LOG_JSON) {
    return JSON.stringify({ level, message, ...meta });
  }
  if (meta && Object.keys(meta).length) {
    return `[${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
  }
  return `[${level.toUpperCase()}] ${message}`;
}

function log(level, message, meta = {}) {
  if (!shouldLog(level)) return;
  const payload = formatPayload(level, message, meta);
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else if (level === "debug") {
    console.debug(payload);
  } else {
    console.log(payload);
  }
}

export const logger = {
  debug: (message, meta) => log("debug", message, meta),
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};
