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

Usage: ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name} [options]

Options:
  -h, --help               Display this help message
  -v, --version            Display version information
  -p, --project-path PATH  Specify the Specifai project path

Example:
  ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name}
  ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name} --project-path /path/to/project

  npx --yes ${pkg.name}
  bunx ${pkg.name}
`)
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    help: false,
    version: false,
    projectPath: null as string | null,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg === '--version' || arg === '-v') {
      result.version = true
    } else if (arg === '--project-path' || arg === '-p') {
      if (i + 1 < args.length) {
        result.projectPath = args[++i]
      }
    }
  }

  return result
}

/**
 * Main entry point for the Specifai MCP Server
 */
async function main() {
  try {
    const parsedArgs = parseArgs()

    if (parsedArgs.help) {
      printHelp()
      process.exit(0)
    }

    if (parsedArgs.version) {
      printVersion()
      process.exit(0)
    }

    // Determine project path from arguments or fall back to current directory
    const projectPath = parsedArgs.projectPath || process.env.PWD

    logger.info(
      {
        version: process.env.SP_VERSION,
        projectPath,
        pwd: process.env.PWD,
        ...process.env,
      },
      'Starting Specifai MCP Server'
    )

    // Initialize and start server
    const serverService = new ServerService(projectPath)
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
