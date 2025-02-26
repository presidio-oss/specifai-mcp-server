import pino from 'pino'
import type { LoggerOptions, TransportTargetOptions } from 'pino'
import os from 'os'

/**
 * Default log file path: $HOME/.specif-ai/mcp-log.log
 * Can be overridden with LOG_FILE_PATH environment variable
 */
const LOG_FILE_PATH =
  process.env.LOG_FILE_PATH ||
  (process.env.HOME ? `${process.env.HOME}/.specif-ai/mcp-log.log` : undefined)

/**
 * Logger configuration options
 */
const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  base: {
    version: process.env.SP_VERSION || '0.0.0',
    pid: process.pid,
    hostname: os.hostname(),
  },
}

/**
 * Extended transport options type that includes worker configuration
 */
type ExtendedTransportOptions = TransportTargetOptions & {
  worker?: {
    autoEnd: boolean
  }
}

/**
 * Create a logger instance based on environment conditions
 */
let logger: pino.Logger

// Only attempt file logging if we have a valid path
if (LOG_FILE_PATH) {
  try {
    /**
     * Transport configuration for file writing
     */
    const transportOptions: ExtendedTransportOptions = {
      target: 'pino/file',
      options: {
        destination: LOG_FILE_PATH,
        append: true,
        sync: false,
        mkdir: true,
        silent: true,
      },
      worker: {
        autoEnd: false,
      },
    }

    // Wrap in try-catch to handle any transport initialization errors
    logger = pino(loggerOptions, pino.transport(transportOptions))
  } catch (err) {
    // Silently fall back to no-op logger if transport fails
    logger = pino({ ...loggerOptions, enabled: false })
  }
} else {
  // If no valid log path, use a no-op logger
  logger = pino({ ...loggerOptions, enabled: false })
}

// Note: We can't directly add error handlers to pino logger instances
// The errors are handled by the transport configuration with silent: true

export { logger }
