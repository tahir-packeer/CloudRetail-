const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, correlationId, service, ...meta }) => {
    let msg = `${timestamp} [${level}]`;
    if (service) msg += ` [${service}]`;
    if (correlationId) msg += ` [${correlationId}]`;
    msg += `: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger factory
const createLogger = serviceName => {
  const transports = [
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel,
    }),
  ];

  // Add file transport in non-test environment
  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, `${serviceName}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '7d',
        format: logFormat,
        level: logLevel,
      })
    );

    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, `${serviceName}-error-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '14d',
        format: logFormat,
        level: 'error',
      })
    );
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports,
  });

  // Add correlation ID to logger
  logger.withCorrelation = correlationId => {
    return logger.child({ correlationId });
  };

  return logger;
};

module.exports = { createLogger };
