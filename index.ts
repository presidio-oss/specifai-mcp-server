#!/usr/bin/env node
import { ServerService } from './src/services/server.service'
import { logger } from './src/utils/logger'
import pkg from './package.json'

// Version is injected during build
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SP_VERSION: string
      PWD?: string
    }
  }
}

/**
 * Print version information
 */
function printVersion() {
  console.log(process.env.SP_VERSION || '0.0.0')
}

/**
 * Print usage instructions
 */
function printHelp() {
  // Keep console.error for help output since it's CLI usage information
  console.error(`
${pkg.name} - v${process.env.SP_VERSION}

Usage: ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name}

Options:
  -h, --help      Display this help message
  -v, --version   Display version information

Example:
  ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name}

  npx --yes ${pkg.name}

  bunx ${pkg.name}
`)
}

/**
 * Main entry point for the Specifai MCP Server
 */
async function main() {
  try {
    logger.info(
      { version: process.env.SP_VERSION, pwd: process.env.PWD, ...process.env },
      'Starting Specifai MCP Server'
    )

    const args = process.argv.slice(2)

    if (args[0] === '--help' || args[0] === '-h') {
      printHelp()
      process.exit(args.length === 0 ? 1 : 0)
    }

    if (args[0] === '--version' || args[0] === '-v') {
      printVersion()
      process.exit(0)
    }

    // Initialize and start server
    const serverService = new ServerService(process.env.PWD)
    await serverService.start()

    logger.info('Specifai MCP Server running on stdio')
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Fatal error')
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down...')
  process.exit(0)
})

// Start the application
main()
