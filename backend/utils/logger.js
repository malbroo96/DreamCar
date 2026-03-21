const formatContext = (context = {}) => {
  const entries = Object.entries(context).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "";
  return ` ${JSON.stringify(Object.fromEntries(entries))}`;
};

const log = (level, message, context = {}) => {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${formatContext(context)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

export const logger = {
  info: (message, context) => log("info", message, context),
  warn: (message, context) => log("warn", message, context),
  error: (message, context) => log("error", message, context),
};

export default logger;
