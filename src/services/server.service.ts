import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { object, z } from 'zod'
import { join } from 'path'
import { readFile, access, constants } from 'fs/promises'
import type { Solution } from '../types'
import { DocumentService } from './document.service'
import { FileService } from './file.service'
import { logger } from '../utils/logger'

/**
 * Schema for get-user-stories request
 */
const GetUserStoriesRequestSchema = object({
  prdId: z.string(),
  cwd: z.string(),
})

/**
 * Schema for get-tasks request
 */
const GetTasksRequestSchema = object({
  prdId: z.string(),
  userStoryId: z.string(),
  cwd: z.string(),
})

/**
 * Schema for get-task request
 */
const GetTaskRequestSchema = object({
  prdId: z.string(),
  userStoryId: z.string(),
  taskId: z.string(),
  cwd: z.string(),
})

/**
 * Schema for tools that only need an optional project path
 */
const OptionalProjectPathSchema = object({
  cwd: z.string(),
})

/**
 * Service for handling MCP server operations
 */
export class ServerService {
  private server: Server
  private documentService: DocumentService
  private fileService: FileService
  private solution: Solution | null
  private projectPath: string | null

  constructor(projectPath?: string) {
    this.solution = null
    this.projectPath = projectPath || null
    this.documentService = new DocumentService()
    this.fileService = new FileService()
    this.server = new Server(
      {
        name: 'specifai',
        version: `${process.env.SP_VERSION || '0.0.0'}`,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    logger.info('Initializing MCP server...')
    this.setupRequestHandlers()
    logger.info('MCP server initialized')
  }

  /**
   * Format document array into text output
   */
  private formatDocuments(docs: Array<{ id: string; title: string; description: string }>): string {
    return docs
      .map((doc) =>
        [
          `ID: ${doc.id}`,
          `Title: ${doc.title}`,
          `Description: ${doc.description}`,
          '--------------',
        ].join('\n')
      )
      .join('\n')
  }

  /**
   * Auto-infer project path and load solution
   * @param projectPath - The project path to load the solution from
   * */
  private async loadSolutionByAutoInference(projectPath: string): Promise<void> {
    const inferredPath = await this.inferProjectPath(projectPath)
    if (inferredPath) {
      this.projectPath = inferredPath
      this.solution = await this.documentService.loadSolution(inferredPath)
      logger.info({ inferredPath }, 'Project path auto-inferred')
    }
  }

  /**
   * Infer project path from a given directory path
   * @param directoryPath - The directory path to check for .specifai-path file
   * @returns The inferred project path or null if not found
   */
  private async inferProjectPath(directoryPath: string): Promise<string | null> {
    if (!directoryPath) {
      logger.debug('No directory path provided for inference')
      return null
    }

    try {
      // Check if the directory exists
      if (!(await this.fileService.isDirectory(directoryPath))) {
        logger.debug({ directoryPath }, 'Directory does not exist')
        return null
      }

      // Check if .specifai-path file exists
      const specFilePath = join(directoryPath, '.specifai-path')
      try {
        await access(specFilePath, constants.R_OK)
      } catch {
        logger.debug({ specFilePath }, '.specifai-path file not found')
        return null
      }

      // Read the file content
      const content = await readFile(specFilePath, 'utf-8')
      const projectPath = content.trim()

      // Validate the project path
      if (!(await this.fileService.isDirectory(projectPath))) {
        logger.warn({ projectPath }, 'Project path from .specifai-path is not a valid directory')
        return null
      }

      logger.info({ directoryPath, projectPath }, 'Successfully inferred project path')
      return projectPath
    } catch (error) {
      logger.error({ error, directoryPath }, 'Error inferring project path')
      return null
    }
  }

  /**
   * Setup all request handlers for the server
   */
  private setupRequestHandlers(): void {
    this.setupListToolsHandler()
    this.setupCallToolHandler()
  }

  /**
   * Setup handler for listing available tools
   */
  private setupListToolsHandler(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Handling list tools request')
      return {
        tools: [
          {
            name: 'get-brds',
            description: 'Get Business Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-prds',
            description: 'Get Product Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-nfrs',
            description: 'Get Non-Functional Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-uirs',
            description: 'Get User Interface Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-bpds',
            description: 'Get Business Process Documents for this project',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-user-stories',
            description: 'Get User Stories for a particular PRD',
            inputSchema: {
              type: 'object',
              required: ['prdId', 'cwd'],
              properties: {
                prdId: {
                  type: 'string',
                  description: 'The ID of the PRD to get user stories for',
                },
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
            },
          },
          {
            name: 'get-tasks',
            description: 'Get Tasks for a particular User Story',
            inputSchema: {
              type: 'object',
              required: ['prdId', 'userStoryId', 'cwd'],
              properties: {
                prdId: {
                  type: 'string',
                  description: 'The ID of the PRD to get user stories for',
                },
                userStoryId: {
                  type: 'string',
                  description: 'The ID of the User Story to get tasks for',
                },
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
            },
          },
          {
            name: 'get-task',
            description: 'Get a Task for a particular User Story in a particular PRD',
            inputSchema: {
              type: 'object',
              required: ['prdId', 'userStoryId', 'taskId', 'cwd'],
              properties: {
                prdId: {
                  type: 'string',
                  description: 'The ID of the PRD to get user stories for',
                },
                userStoryId: {
                  type: 'string',
                  description: 'The ID of the User Story to get tasks for',
                },
                taskId: {
                  type: 'string',
                  description: 'The ID of the Task to get',
                },
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
            },
          },
          {
            name: 'set-project-path',
            description:
              'Update the project path and reload the solution. use this tool only when we not automatically able to infer the project path or asked by the user or us., we will try to auto infer it from the environment first.',
            inputSchema: {
              type: 'object',
              required: ['path'],
              properties: {
                path: {
                  type: 'string',
                  description:
                    'The absolute path to a directory containing specifai specification files.',
                },
              },
            },
          },
        ],
      }
    })
  }

  /**
   * Setup handler for tool calls
   */
  private setupCallToolHandler(): void {
    if (this.projectPath) {
      logger.info({ projectPath: this.projectPath }, 'Project path is found from process.env.PWD')
      this.inferProjectPath(this.projectPath).then((inferredPath) => {
        if (inferredPath) {
          logger.info({ inferredPath }, 'Project path auto-inferred')
          this.projectPath = inferredPath
          this.documentService.loadSolution(inferredPath).then((solution) => {
            this.solution = solution
            logger.info('Solution loaded from auto-inferred project path')
          })
        }
      })
    }
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      logger.info({ tool: name, args }, 'Handling tool call')

      try {
        switch (name) {
          case 'set-project-path': {
            const { path } = object({ path: z.string() }).parse(args)
            this.projectPath = path
            this.solution = await this.documentService.loadSolution(path)
            return this.createTextResponse(`Project path set to: ${path}`)
          }

          case 'get-brds': {
            const { cwd } = OptionalProjectPathSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            return this.createTextResponse(this.formatDocuments(this.solution.BRD))
          }

          case 'get-prds': {
            const { cwd } = OptionalProjectPathSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            return this.createTextResponse(this.formatDocuments(this.solution.PRD))
          }

          case 'get-nfrs': {
            const { cwd } = OptionalProjectPathSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            return this.createTextResponse(this.formatDocuments(this.solution.NFR))
          }

          case 'get-uirs': {
            const { cwd } = OptionalProjectPathSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            return this.createTextResponse(this.formatDocuments(this.solution.UIR))
          }

          case 'get-bpds': {
            const { cwd } = OptionalProjectPathSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }
            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            return this.createTextResponse(this.formatDocuments(this.solution.BP))
          }

          case 'get-user-stories': {
            const { prdId, cwd } = GetUserStoriesRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            const prd = this.documentService.findPRD(this.solution, prdId)
            if (!prd) {
              logger.warn({ prdId }, 'PRD not found')
              return this.createTextResponse(`No PRD found with ID ${prdId}`)
            }
            return this.createTextResponse(this.formatDocuments(prd.userStories))
          }

          case 'get-tasks': {
            const { prdId, userStoryId, cwd } = GetTasksRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            const prd = this.documentService.findPRD(this.solution, prdId)
            if (!prd) {
              logger.warn({ prdId }, 'PRD not found')
              return this.createTextResponse(`No PRD found with ID ${prdId}`)
            }
            const userStory = this.documentService.findUserStory(prd, userStoryId)
            if (!userStory) {
              logger.warn({ prdId, userStoryId }, 'User Story not found')
              return this.createTextResponse(`No User Story found with ID ${userStoryId}`)
            }
            return this.createTextResponse(this.formatDocuments(userStory.tasks))
          }

          case 'get-task': {
            const { prdId, userStoryId, taskId, cwd } = GetTaskRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            const prd = this.documentService.findPRD(this.solution, prdId)
            if (!prd) {
              logger.warn({ prdId }, 'PRD not found')
              return this.createTextResponse(`No PRD found with ID ${prdId}`)
            }
            const userStory = this.documentService.findUserStory(prd, userStoryId)
            if (!userStory) {
              logger.warn({ prdId, userStoryId }, 'User Story not found')
              return this.createTextResponse(`No User Story found with ID ${userStoryId}`)
            }
            const task = this.documentService.findTask(userStory, taskId)
            if (!task) {
              logger.warn({ prdId, userStoryId, taskId }, 'Task not found')
              return this.createTextResponse(`No Task found with ID ${taskId}`)
            }
            return this.createTextResponse(
              [`ID: ${task.id}`, `Title: ${task.title}`, `Description: ${task.description}`].join(
                '\n'
              )
            )
          }

          default:
            logger.warn({ tool: name }, 'Unknown tool called')
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const message = `Invalid arguments: ${error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`
          logger.error({ error: error.errors, tool: name }, message)
          throw new Error(message)
        }
        logger.error({ error, tool: name }, 'Error handling tool call')
        throw error
      }
    })
  }

  /**
   * Create a text response object
   */
  private createTextResponse(text: string) {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    logger.info('Starting MCP server...')
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    logger.info('MCP server started successfully')
  }
}
