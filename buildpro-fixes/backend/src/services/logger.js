import winston from 'winston';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(meta).length > 0 && meta.constructor === Object) {
    const cleanMeta = { ...meta };
    delete cleanMeta.level;
    delete cleanMeta.message;
    delete cleanMeta.timestamp;
    if (Object.keys(cleanMeta).length > 0) {
      log += ` ${JSON.stringify(cleanMeta)}`;
    }
  }
  if (stack) log += `\n${stack}`;
  return log;
});

// Build transport list.
// In production on Render, DO NOT write to disk — the /logs directory is
// ephemeral and gets wiped on every deploy, making it useless for debugging.
// Render captures all stdout/stderr automatically; use an external log drain
// (Logtail, Papertrail, Betterstack) via the Render dashboard if you need
// persistence. In development, file transports are still written locally.
const transports = [
  new winston.transports.Console({
    format: combine(colorize(), consoleFormat),
  }),
];

if (process.env.NODE_ENV !== 'production') {
  // Development-only file transports
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(json()),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: combine(json()),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports,
});

// Request logging helper
logger.logRequest = (req, res, durationMs) => {
  const { method, originalUrl, ip } = req;
  const { statusCode } = res;
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger[level]('HTTP Request', {
    method,
    url: originalUrl,
    status: statusCode,
    duration: `${durationMs}ms`,
    ip,
    userId: req.user?.userId,
    userAgent: req.get('user-agent'),
  });
};

// Error logging helper
logger.logError = (error, req = null, additionalData = {}) => {
  const errorData = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...additionalData,
  };

  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.userId,
      ip: req.ip,
    };
  }

  logger.error('Application Error', errorData);
};

// Audit logging for important actions
logger.audit = (action, userId, companyId, details = {}) => {
  logger.info('Audit Log', {
    action,
    userId,
    companyId,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
