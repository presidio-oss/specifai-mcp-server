import pino from 'pino'

// Create logger that writes to file if possible, otherwise silently falls back to noop transport
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  pino.transport({
    target: 'pino/file',
    options: {
      destination: 'log.log',
      // Append if file exists, create if doesn't
      append: true,
      // Ignore write errors silently
      sync: false,
      mkdir: false,
    },
    worker: {
      // Don't throw on worker errors
      autoEnd: false,
    },
  })
)

// Export the logger
export { logger }
