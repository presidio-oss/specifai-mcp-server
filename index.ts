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
 * Parse command line arguments
 */
function parseArguments(args: string[]): {
  projectPath?: string
  showHelp: boolean
  showVersion: boolean
} {
  let projectPath: string | undefined
  let showHelp = false
  let showVersion = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      showHelp = true
    } else if (arg === '--version' || arg === '-v') {
      showVersion = true
    } else if (arg === '--project-path' || arg === '-p') {
      if (i + 1 < args.length) {
        projectPath = args[i + 1]
        i++
      } else {
        throw new Error('--project-path option requires a value')
      }
    }
  }

  return { projectPath, showHelp, showVersion }
}

/**
 * Print usage instructions
 */
function printHelp() {
  // Keep console.error for help output since it's CLI usage information
  console.error(`
${pkg.name} - v${process.env.SP_VERSION}

Usage: ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name} [options] [project-path]

Arguments:
  project-path    Absolute path to the Specifai project directory (optional)

Options:
  -h, --help      Display this help message
  -v, --version   Display version information
  -p, --project-path      Specify project path (same as positional argument)

Path Resolution Priority:
  1. Command line argument (--path or positional)
  2. .specifai-path file in current working directory
  3. Prompt user if neither is available

Examples:
  ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name}
  ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name} /path/to/project
  ${pkg.bin ? Object.keys(pkg.bin)[0] : pkg.name} --path /path/to/project

  npx --yes ${pkg.name}
  npx --yes ${pkg.name} /path/to/project

  bunx ${pkg.name}
  bunx ${pkg.name} /path/to/project
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
    const { projectPath, showHelp, showVersion } = parseArguments(args)

    if (showHelp) {
      printHelp()
      process.exit(args.length === 0 ? 1 : 0)
    }

    if (showVersion) {
      printVersion()
      process.exit(0)
    }

    // Initialize and start server with project path from arguments (if provided)
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
