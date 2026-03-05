const isProd = process.env.NODE_ENV === "production";

function noop() {}

const logger = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: isProd ? noop : console.log.bind(console),
  debug: isProd ? noop : console.debug.bind(console),
};

export default logger;
