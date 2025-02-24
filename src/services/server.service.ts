import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { object, z } from 'zod'
import type { Solution } from '../types'
import { DocumentService } from './document.service'
import { logger } from '../utils/logger'

/**
 * Schema for get-user-stories request
 */
const GetUserStoriesRequestSchema = object({
  prdId: z.string(),
})

/**
 * Schema for get-tasks request
 */
const GetTasksRequestSchema = object({
  prdId: z.string(),
  userStoryId: z.string(),
})

/**
 * Schema for get-task request
 */
const GetTaskRequestSchema = object({
  prdId: z.string(),
  userStoryId: z.string(),
  taskId: z.string(),
})

/**
 * Service for handling MCP server operations
 */
export class ServerService {
  private server: Server
  private documentService: DocumentService
  private solution: Solution | null
  private projectPath: string | null

  constructor() {
    this.solution = null
    this.projectPath = null
    this.documentService = new DocumentService()
    this.server = new Server(
      {
        name: 'specif-ai',
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
            name: 'set-project-path',
            description: 'Set the project path and reload the solution',
            inputSchema: {
              type: 'object',
              required: ['path'],
              properties: {
                path: {
                  type: 'string',
                  description:
                    'The absolute path to the project directory containing specification files',
                },
              },
            },
          },
          {
            name: 'get-brds',
            description: 'Get Business Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              required: [],
            },
          },
          {
            name: 'get-prds',
            description: 'Get Product Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              required: [],
            },
          },
          {
            name: 'get-nfrs',
            description: 'Get Non-Functional Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              required: [],
            },
          },
          {
            name: 'get-uirs',
            description: 'Get User Interface Requirement Documents for this project',
            inputSchema: {
              type: 'object',
              required: [],
            },
          },
          {
            name: 'get-bps',
            description: 'Get Business Process Documents for this project',
            inputSchema: {
              type: 'object',
              required: [],
            },
          },
          {
            name: 'get-user-stories',
            description: 'Get User Stories for a particular PRD',
            inputSchema: {
              type: 'object',
              required: ['prdId'],
              properties: {
                prdId: {
                  type: 'string',
                  description: 'The ID of the PRD to get user stories for',
                },
              },
            },
          },
          {
            name: 'get-tasks',
            description: 'Get Tasks for a particular User Story',
            inputSchema: {
              type: 'object',
              required: ['prdId', 'userStoryId'],
              properties: {
                prdId: {
                  type: 'string',
                  description: 'The ID of the PRD to get user stories for',
                },
                userStoryId: {
                  type: 'string',
                  description: 'The ID of the User Story to get tasks for',
                },
              },
            },
          },
          {
            name: 'get-task',
            description: 'Get a Task for a particular User Story in a particular PRD',
            inputSchema: {
              type: 'object',
              required: ['prdId', 'userStoryId', 'taskId'],
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

          case 'get-brds':
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
            }
            return this.createTextResponse(this.formatDocuments(this.solution.BRD))

          case 'get-prds':
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
            }
            return this.createTextResponse(this.formatDocuments(this.solution.PRD))

          case 'get-nfrs':
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
            }
            return this.createTextResponse(this.formatDocuments(this.solution.NFR))

          case 'get-uirs':
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
            }
            return this.createTextResponse(this.formatDocuments(this.solution.UIR))

          case 'get-bps':
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
            }
            return this.createTextResponse(this.formatDocuments(this.solution.BP))

          case 'get-user-stories': {
            const { prdId } = GetUserStoriesRequestSchema.parse(args)
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
            }
            const prd = this.documentService.findPRD(this.solution, prdId)
            if (!prd) {
              logger.warn({ prdId }, 'PRD not found')
              return this.createTextResponse(`No PRD found with ID ${prdId}`)
            }
            return this.createTextResponse(this.formatDocuments(prd.userStories))
          }

          case 'get-tasks': {
            const { prdId, userStoryId } = GetTasksRequestSchema.parse(args)
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
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
            const { prdId, userStoryId, taskId } = GetTaskRequestSchema.parse(args)
            if (!this.solution) {
              throw new Error('No project path set. Use set-project-path first.')
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
