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
import MiniSearch from 'minisearch'

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

const GetTaskByIdRequestSchema = object({
  taskId: z.string(),
  cwd: z.string(),
})

const SearchRequestSchema = object({
  searchTerm: z.string(),
  cwd: z.string(),
  type: z.enum(['PRD', 'BRD', 'NFR', 'UIR', 'TC', 'BP', 'US', 'TASK']).optional(),
})

const GetBRsRequestSchema = object({
  cwd: z.string(),
  includeDescription: z.boolean().optional().default(false),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
})

const GetPRDsRequestSchema = object({
  cwd: z.string(),
  includeDescription: z.boolean().optional().default(false),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
  includeUserStories: z.boolean().optional().default(false),
  includeTasks: z.boolean().optional().default(false),
})

const GetNFRsRequestSchema = object({
  cwd: z.string(),
  includeDescription: z.boolean().optional().default(false),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
})

const GetUIRsRequestSchema = object({
  cwd: z.string(),
  includeDescription: z.boolean().optional().default(false),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
})

const GetBPsRequestSchema = object({
  cwd: z.string(),
  includeDescription: z.boolean().optional().default(false),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
})

const GetTCsRequestSchema = object({
  cwd: z.string(),
  includeDescription: z.boolean().optional().default(false),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
})

const GetListAllTasksRequestSchema = object({
  cwd: z.string(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
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
  private miniSearch: MiniSearch

  constructor(projectPath?: string) {
    this.solution = null
    this.projectPath = projectPath || null
    this.documentService = new DocumentService()
    this.fileService = new FileService()
    this.miniSearch = new MiniSearch({
      fields: ['id', 'title', 'description', 'type'],
      storeFields: ['id', 'title', 'description', 'type'],
      searchOptions: {
        fuzzy: true,
      },
    })
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
   * Format document array into text output
   */
  private formatDocumentsV2(
    docs: Array<{
      [key: string]: any
    }>
  ): string {
    return docs
      .map((doc) =>
        [
          Object.keys(doc)
            .map((key) => `${key}: ${doc[key]}`)
            .join('\n'),
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
      this.updateMiniSearchIndex()
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
      const cwdMessage =
        'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.'
      logger.info('Handling list tools request')
      return {
        tools: [
          {
            name: 'get-brds',
            description:
              'Get Business Requirement Documents for this project, returns ID, Title, Description(not included by default)',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description: cwdMessage,
                },
                includeDescription: {
                  type: 'boolean',
                  description: 'Include description in the output, default is false',
                },
                limit: {
                  type: 'number',
                  description: 'Limit the number of documents to return, default is 10',
                },
                offset: {
                  type: 'number',
                  description: 'Offset the number of documents to return, default is 0',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-prds',
            description:
              'Get Product Requirement Documents for this project, returns ID, Title, Description(not included by default)',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description: cwdMessage,
                },
                includeDescription: {
                  type: 'boolean',
                  description: 'Include description in the output, default is false',
                },
                limit: {
                  type: 'number',
                  description: 'Limit the number of documents to return, default is 10',
                },
                offset: {
                  type: 'number',
                  description: 'Offset the number of documents to return, default is 0',
                },
                includeUserStories: {
                  type: 'boolean',
                  description:
                    'Include user stories in the output each user stories will include ID and Title, Description will not be included, default is false',
                },
                includeTasks: {
                  type: 'boolean',
                  description:
                    'Include tasks in the output each task will include ID and Title, Description will not be included, default is false',
                },
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-nfrs',
            description:
              'Get Non-Functional Requirement Documents for this project, returns ID, Title, Description(not included by default)',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description: cwdMessage,
                },
                includeDescription: {
                  type: 'boolean',
                  description: 'Include description in the output, default is false',
                },
                limit: {
                  type: 'number',
                  description: 'Limit the number of documents to return, default is 10',
                },
                offset: {
                  type: 'number',
                  description: 'Offset the number of documents to return, default is 0',
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
                includeDescription: {
                  type: 'boolean',
                  description: 'Include description in the output, default is false',
                },
                limit: {
                  type: 'number',
                  description: 'Limit the number of documents to return, default is 10',
                },
                offset: {
                  type: 'number',
                  description: 'Offset the number of documents to return, default is 0',
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
              includeDescription: {
                type: 'boolean',
                description: 'Include description in the output, default is false',
              },
              limit: {
                type: 'number',
                description: 'Limit the number of documents to return, default 10',
              },
              offset: {
                type: 'number',
                description: 'Offset the number of documents to return, default is 0',
              },
              required: ['cwd'],
            },
          },
          {
            name: 'get-tcs',
            description: 'Get Test Case Documents for this project',
            inputSchema: {
              type: 'object',
              properties: {
                cwd: {
                  type: 'string',
                  description: cwdMessage,
                },
                includeDescription: {
                  type: 'boolean',
                  description: 'Include description in the output, default is false',
                },
                limit: {
                  type: 'number',
                  description: 'Limit the number of documents to return, default is 10',
                },
                offset: {
                  type: 'number',
                  description: 'Offset the number of documents to return, default is 0',
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
                  description:
                    'The ID of the PRD to get user stories for, PRD ID convention is PRD<PRD Number>, PRD number is zero padded with minimum 2 digits, e.g. PRD01, PRD12, PRD103, etc.',
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
                  description:
                    'The ID of the PRD to get user stories for, PRD ID convention is PRD<PRD Number>, PRD number is zero padded with minimum 2 digits, e.g. PRD01, PRD12, PRD103, etc.',
                },
                userStoryId: {
                  type: 'string',
                  description:
                    'The ID of the User Story to get tasks for, US ID convention is US<US Number>, US number is non zero padded, e.g. US1, US12, US103, etc.',
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
            description: 'Get list of Tasks for a particular User Story in a particular PRD',
            inputSchema: {
              type: 'object',
              required: ['prdId', 'userStoryId', 'taskId', 'cwd'],
              properties: {
                prdId: {
                  type: 'string',
                  description:
                    'The ID of the PRD to get user stories for, PRD ID convention is PRD<PRD Number>, PRD number is zero padded with minimum 2 digits, e.g. PRD01, PRD12, PRD103, etc.',
                },
                userStoryId: {
                  type: 'string',
                  description:
                    'The ID of the User Story to get tasks for, US ID convention is US<US Number>, US number is non zero padded, e.g. US1, US12, US103, etc.',
                },
                taskId: {
                  type: 'string',
                  description:
                    'The ID of the Task to get, TASK ID convention is TASK<TASK Number>, TASK number is non zero padded, e.g. TASK1, TASK12, TASK103, etc.',
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
          {
            name: 'get-task-by-id',
            description:
              "Retrieves complete information about a specific task when you know its exact ID. This tool provides direct access to a single task's details without having to retrieve and filter through all tasks., returns full task object, ID, Title, Description",
            inputSchema: {
              type: 'object',
              required: ['taskId', 'cwd'],
              properties: {
                taskId: {
                  type: 'string',
                  description:
                    'The unique identifier for the task you want to retrieve Must follow the format: TASK followed by a number without leading zeros Examples: TASK1 TASK12, TASK103 Note: The number portion is NOT zero-padded (use TASK1, not TASK01), Convert the Task ID to mentioned format to use this tool.',
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
            name: 'list-all-tasks',
            description:
              'List all the tasks available across all PRDs and User Stories, without task description, only return ID and Title',
            inputSchema: {
              type: 'object',
              required: ['cwd'],
              properties: {
                cwd: {
                  type: 'string',
                  description: cwdMessage,
                },
                limit: {
                  type: 'number',
                  description: 'Limit the number of documents to return, default is 10',
                },
                offset: {
                  type: 'number',
                  description: 'Offset the number of documents to return, default is 0',
                },
              },
            },
          },
          {
            name: 'search',
            description:
              'Full text search across all documents, returns an array of document ID, Title, Description',
            inputSchema: {
              type: 'object',
              required: ['searchTerm', 'cwd'],
              properties: {
                searchTerm: {
                  type: 'string',
                  description: 'The search term to search for',
                },
                type: {
                  type: 'string',
                  description:
                    'Optional type of document to search in, valid values are: PRD, BRD, NFR, UIR, TC, BP, US, TASK',
                },
                cwd: {
                  type: 'string',
                  description:
                    'Absolute path where the tool is called from and containing the `.specifai-path` file to auto-infer the specifai project path. This path will be current working directory (cwd) from where the tool is called.',
                },
              },
            },
          },
        ],
      }
    })
  }

  private updateMiniSearchIndex(): void {
    if (!this.solution) return
    this.miniSearch.removeAll()
    const docs = [
      ...this.solution.PRD.map((prd) => ({ ...prd, type: 'PRD' })),
      ...this.solution.BRD.map((brd) => ({ ...brd, type: 'BRD' })),
      ...this.solution.NFR.map((nfr) => ({ ...nfr, type: 'NFR' })),
      ...this.solution.UIR.map((uir) => ({ ...uir, type: 'UIR' })),
      ...this.solution.BP.map((bp) => ({ ...bp, type: 'BP' })),
      ...this.solution.TC.map((tc) => ({ ...tc, type: 'TC' })),
      ...this.solution.PRD.flatMap((prd) => prd.userStories).map((userStory) => ({
        ...userStory,
        type: 'US',
      })),
      ...this.solution.PRD.flatMap((prd) =>
        prd.userStories.flatMap((userStory) => userStory.tasks)
      ).map((task) => ({ ...task, type: 'TASK' })),
    ]
    this.miniSearch.addAll(docs)
  }

  private paginate<T>(array: T[], limit = 0, offset = 0) {
    if (limit === 0) return array.slice(offset)
    return array.slice(offset, offset + limit)
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
            this.updateMiniSearchIndex()
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
            this.updateMiniSearchIndex()
            return this.createTextResponse(`Project path set to: ${path}`)
          }

          case 'get-brds': {
            const { cwd, includeDescription, limit, offset } = GetBRsRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            const docs = this.paginate(
              this.solution.BRD.map((brd) => ({
                ID: brd.id,
                Title: brd.title,
                ...(includeDescription ? { Description: brd.description } : {}),
              })),
              limit,
              offset
            )

            if (docs.length === 0) {
              return this.createTextResponse('No BRDs found')
            }

            return this.createTextResponse(this.formatDocumentsV2(docs))
          }

          case 'get-prds': {
            const { cwd, includeDescription, includeTasks, includeUserStories, limit, offset } =
              GetPRDsRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            const docs = this.paginate(this.solution.PRD, limit, offset)

            if (docs.length === 0) {
              return this.createTextResponse('No PRDs found')
            }

            return this.createTextResponse(
              docs.reduce((acc, prd) => {
                const lines = [
                  `ID: ${prd.id}`,
                  `Title: ${prd.title}`,
                  ...(includeDescription ? [`Description: ${prd.description}`] : []),
                ]

                if (includeUserStories) {
                  if (prd.userStories.length === 0) {
                    lines.push(`User Stories: ${prd.id} has no user stories`)
                  } else {
                    lines.push(`User Stories:`)
                    prd.userStories.forEach((userStory) => {
                      lines.push(`  US ID: ${userStory.id}`)
                      lines.push(`  US Title: ${userStory.title}`)

                      if (includeTasks) {
                        if (userStory.tasks.length === 0) {
                          lines.push(`    Tasks: ${userStory.id} has no tasks`)
                        } else {
                          lines.push(`    Tasks:`)
                          userStory.tasks.forEach((task) => {
                            lines.push(`      TASK ID: ${task.id}`)
                            lines.push(`      TASK Title: ${task.title}`)
                          })
                        }
                      }
                    })
                  }
                }

                lines.push('--------------\n')
                return acc + lines.join('\n') + '\n'
              }, '')
            )
          }

          case 'get-nfrs': {
            const { cwd, includeDescription, limit, offset } = GetNFRsRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            const docs = this.paginate(
              this.solution.NFR.map((brd) => ({
                ID: brd.id,
                Title: brd.title,
                ...(includeDescription ? { Description: brd.description } : {}),
              })),
              limit,
              offset
            )

            if (docs.length === 0) {
              return this.createTextResponse('No NFRs found')
            }

            return this.createTextResponse(this.formatDocumentsV2(docs))
          }

          case 'get-uirs': {
            const { cwd, includeDescription, limit, offset } = GetUIRsRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            const docs = this.paginate(
              this.solution.UIR.map((brd) => ({
                ID: brd.id,
                Title: brd.title,
                ...(includeDescription ? { Description: brd.description } : {}),
              })),
              limit,
              offset
            )

            if (docs.length === 0) {
              return this.createTextResponse('No UIRs found')
            }

            return this.createTextResponse(this.formatDocumentsV2(docs))
          }

          case 'get-bpds': {
            const { cwd, includeDescription, limit, offset } = GetBPsRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            const docs = this.paginate(
              this.solution.BP.map((brd) => ({
                ID: brd.id,
                Title: brd.title,
                ...(includeDescription ? { Description: brd.description } : {}),
              })),
              limit,
              offset
            )

            if (docs.length === 0) {
              return this.createTextResponse('No BPs found')
            }

            return this.createTextResponse(this.formatDocumentsV2(docs))
          }

          case 'get-tcs': {
            const { cwd, includeDescription, limit, offset } = GetTCsRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            const docs = this.paginate(
              this.solution.TC.map((tc) => ({
                ID: tc.id,
                Title: tc.title,
                ...(includeDescription ? { Description: tc.description } : {}),
              })),
              limit,
              offset
            )

            if (docs.length === 0) {
              return this.createTextResponse('No Test Cases found')
            }

            return this.createTextResponse(this.formatDocumentsV2(docs))
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

          case 'list-all-tasks': {
            const { cwd, limit, offset } = GetListAllTasksRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            const tasks = this.paginate(
              this.solution.PRD.map((prd) =>
                prd.userStories.map((userStory) => userStory.tasks)
              ).flat(2),
              limit,
              offset
            )

            if (!tasks || tasks.length === 0) {
              return this.createTextResponse('No tasks found')
            }

            return this.createTextResponse(
              this.formatDocumentsV2(
                tasks.map((task) => ({
                  ID: task.id,
                  Title: task.title,
                }))
              )
            )
          }

          case 'get-task-by-id': {
            const { taskId, cwd } = GetTaskByIdRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }
            const task = this.solution.PRD.flatMap((prd) =>
              prd.userStories.flatMap((userStory) => userStory.tasks)
            ).find((task) => task.id === taskId)
            if (!task) {
              logger.warn({ taskId }, 'Task not found')
              return this.createTextResponse(`No Task found with ID ${taskId}`)
            }
            return this.createTextResponse(
              [`ID: ${task.id}`, `Title: ${task.title}`, `Description: ${task.description}`].join(
                '\n'
              )
            )
          }

          case 'search': {
            const { searchTerm, cwd, type } = SearchRequestSchema.parse(args)

            // Try to infer project path if provided
            if (cwd) {
              await this.loadSolutionByAutoInference(cwd)
            }

            if (!this.solution || !cwd) {
              throw new Error(
                'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
              )
            }

            let searchResult = this.miniSearch.search(searchTerm)

            if (type) {
              searchResult = searchResult.filter((doc) => doc.type === type)
            }

            if (searchResult.length === 0) {
              return this.createTextResponse('No results found')
            }

            const allSearchResultString = searchResult
              .map((doc) =>
                [
                  `ID: ${doc.id}`,
                  `Title: ${doc.title}`,
                  `Description: ${doc.description}`,
                  `Type: ${doc.type}`,
                  '--------------',
                ].join('\n')
              )
              .join('\n')

            return this.createTextResponse(allSearchResultString)
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
