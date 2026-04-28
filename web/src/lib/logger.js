const PLATFORM = "web";

const LEVEL_METHOD = {
  debug: "debug",
  info: "log",
  warn: "warn",
  error: "error",
};

function emit(level, args) {
  const method = LEVEL_METHOD[level] || "log";
  const prefix = `[${new Date().toISOString()}] [${PLATFORM}] [${level.toUpperCase()}]`;
  const sink = console[method] || console.log;
  sink.call(console, prefix, ...args);
}

export const logger = {
  debug: (...args) => emit("debug", args),
  info: (...args) => emit("info", args),
  warn: (...args) => emit("warn", args),
  error: (...args) => emit("error", args),
};

export default logger;
