import pino from 'pino'
import type { LoggerOptions, TransportTargetOptions } from 'pino'
import os from 'os'

/**
 * Default log file path: $HOME/.specif-ai/mcp-log.log
 * Can be overridden with LOG_FILE_PATH environment variable
 */
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || `${process.env.HOME}/.specif-ai/mcp-log.log`

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

/**
 * Create logger instance that writes to file if possible,
 * otherwise silently falls back to noop transport
 */
const logger = pino(loggerOptions, pino.transport(transportOptions))

export { logger }
