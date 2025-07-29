import { ServerService } from '../server.service'
import { ConsoleManager } from './test-utils'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Solution, PRD, UserStory } from '../../types'

// Mock test data
const mockSolution: Solution = {
  BRD: [
    {
      id: 'BRD01',
      title: 'Test BRD',
      description: 'Test BRD description',
    },
  ],
  PRD: [
    {
      id: 'PRD01',
      title: 'Test PRD',
      description: 'Test PRD description',
      userStories: [
        {
          id: 'US1',
          title: 'User Story 1',
          description: 'Test user story',
          tasks: [
            {
              id: 'T1',
              title: 'Task 1',
              description: 'Test task',
            },
          ],
        },
      ],
    },
  ],
  NFR: [
    {
      id: 'NFR01',
      title: 'Test NFR',
      description: 'Test NFR description',
    },
  ],
  BP: [
    {
      id: 'BP01',
      title: 'Test BP',
      description: 'Test BP description',
    },
  ],
  UIR: [
    {
      id: 'UIR01',
      title: 'Test UIR',
      description: 'Test UIR description',
    },
  ],
}

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn(),
  constants: {
    R_OK: 4,
  },
}))

// Import mocked fs/promises to access mock functions
import { readdir, readFile, access } from 'fs/promises'

const mockMiniSearch = {
  search: jest.fn(),
  addAll: jest.fn(),
  removeAll: jest.fn(),
}
jest.mock('minisearch', () => {
  return jest.fn().mockImplementation(() => mockMiniSearch)
})
// Mock DocumentService
jest.mock('../document.service', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    loadSolution: jest.fn().mockImplementation((path) => {
      if (path === '/test/path' || path === '/inferred/path') {
        return Promise.resolve(mockSolution)
      }
      if (path === '/test/malformed/path') {
        return Promise.resolve({
          ...mockSolution,
          PRD: [
            {
              id: 'PRD01',
              title: '',
              description: '',
              userStories: [],
            },
          ],
        })
      }
      if (path === '/test/empty/path') {
        return Promise.resolve({
          ...mockSolution,
          PRD: [],
        })
      }
      return Promise.reject(new Error('Invalid path'))
    }),
    findPRD: jest.fn().mockImplementation((solution: Solution, prdId: string) => {
      return solution.PRD.find((prd) => prd.id === prdId) || null
    }),
    findUserStory: jest.fn().mockImplementation((prd: PRD, userStoryId: string) => {
      return prd.userStories?.find((story) => story.id === userStoryId) || null
    }),
    findTask: jest.fn().mockImplementation((userStory: UserStory, taskId: string) => {
      return userStory.tasks?.find((task) => task.id === taskId) || null
    }),
  })),
}))

// Mock FileService
jest.mock('../file.service', () => ({
  FileService: jest.fn().mockImplementation(() => ({
    readAllJsonFiles: jest.fn(),
    isDirectory: jest.fn().mockImplementation((path) => {
      if (
        path === '/valid/dir' ||
        path === '/test/path' ||
        path === '/inferred/path' ||
        path === '/with/specifai-path'
      ) {
        return Promise.resolve(true)
      }
      return Promise.resolve(false)
    }),
  })),
}))

// Mock Server and StdioServerTransport
const mockRequestHandlers = new Map()
const mockServer = {
  requestHandlers: mockRequestHandlers,
  setRequestHandler: (schema: any, handler: any) => {
    // For CallToolRequestSchema, use "call-tool" as the name
    const name =
      schema === CallToolRequestSchema
        ? 'call-tool'
        : schema === ListToolsRequestSchema
          ? 'list-tools'
          : schema.name
    mockRequestHandlers.set(name, handler)
  },
  connect: jest.fn().mockResolvedValue(undefined),
}

// Mock external modules
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => mockServer),
}))

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}))

describe('ServerService', () => {
  beforeAll(() => {
    ConsoleManager.suppressConsole()
  })

  afterAll(() => {
    ConsoleManager.restoreConsole()
  })

  afterAll(() => {
    jest.unmock('minisearch')
  })

  let serverService: ServerService

  beforeEach(async () => {
    mockRequestHandlers.clear()
    serverService = new ServerService()
    // Initialize server with mock solution using set-project-path
    const handler = mockRequestHandlers.get('call-tool')
    await handler({
      params: {
        name: 'set-project-path',
        arguments: { path: '/test/path' },
      },
    })
  })

  describe('List Tools Handler', () => {
    test('should return complete list of tools with schemas', async () => {
      const handler = mockRequestHandlers.get('list-tools')
      const response = await handler()

      expect(response.tools).toHaveLength(12)
      expect(response.tools.map((t: { name: string }) => t.name)).toEqual([
        'get-brds',
        'get-prds',
        'get-nfrs',
        'get-uirs',
        'get-bpds',
        'get-user-stories',
        'get-tasks',
        'get-task',
        'set-project-path',
        'get-task-by-id',
        'list-all-tasks',
        'search',
      ])

      // Verify schema for get-user-stories
      const userStoriesSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'get-user-stories'
      )
      expect(userStoriesSchema?.inputSchema.required).toEqual(['prdId'])

      // Verify schema for get-tasks
      const tasksSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'get-tasks'
      )
      expect(tasksSchema?.inputSchema.required).toEqual(['prdId', 'userStoryId'])

      // Verify schema for get-task
      const taskSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'get-task'
      )
      expect(taskSchema?.inputSchema.required).toEqual(['prdId', 'userStoryId', 'taskId'])

      // Verify schema for set-project-path
      const setProjectPathSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'set-project-path'
      )
      expect(setProjectPathSchema?.inputSchema.required).toEqual(['path'])

      // Verify schema for get-task-by-id
      const getTaskByIdSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'get-task-by-id'
      )
      expect(getTaskByIdSchema?.inputSchema.required).toEqual(['taskId'])

      // Verify schema for list-all-tasks
      const listAllTasksSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'list-all-tasks'
      )
      expect(listAllTasksSchema?.inputSchema.required).toEqual([])

      // Verify schema for search
      const searchSchema = response.tools.find(
        (t: { name: string; inputSchema: any }) => t.name === 'search'
      )
      expect(searchSchema?.inputSchema.required).toEqual(['searchTerm'])
    })
  })

  describe('Project Path Inference', () => {
    let mockReaddir: jest.Mock
    let mockReadFile: jest.Mock
    let mockAccess: jest.Mock

    beforeEach(() => {
      mockReaddir = readdir as jest.Mock
      mockReadFile = readFile as jest.Mock
      mockAccess = access as jest.Mock

      // Default mock implementations
      mockReaddir.mockResolvedValue(['file1.txt', '.specifai-path'])
      mockReadFile.mockResolvedValue('/inferred/path')
      mockAccess.mockResolvedValue(undefined)

      // Clear mock calls
      mockReaddir.mockClear()
      mockReadFile.mockClear()
      mockAccess.mockClear()
    })

    test('should infer project path from directory with .specifai-path file', async () => {
      const server = new ServerService()
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-brds',
          arguments: { cwd: '/with/specifai-path' },
        },
      })

      expect(mockAccess).toHaveBeenCalled()
      expect(mockReadFile).toHaveBeenCalled()
      expect(response.content[0].text).toContain('BRD01')
    })

    test('should handle non-existent directory for inference', async () => {
      // Create a new server service instance to avoid state from previous tests
      mockRequestHandlers.clear()
      const newServerService = new ServerService()
      const handler = mockRequestHandlers.get('call-tool')

      await expect(
        handler({
          params: {
            name: 'get-brds',
            arguments: { cwd: '/non/existent/dir' },
          },
        })
      ).rejects.toThrow('No project path set')
    })

    test('should handle directory without .specifai-path file', async () => {
      // Create a new server service instance to avoid state from previous tests
      mockRequestHandlers.clear()
      const newServerService = new ServerService()
      const handler = mockRequestHandlers.get('call-tool')

      mockAccess.mockRejectedValue(new Error('File not found'))

      await expect(
        handler({
          params: {
            name: 'get-brds',
            arguments: { cwd: '/valid/dir' },
          },
        })
      ).rejects.toThrow('No project path set')
    })

    test('should handle invalid inferred path', async () => {
      // Create a new server service instance to avoid state from previous tests
      mockRequestHandlers.clear()
      const newServerService = new ServerService()
      const handler = mockRequestHandlers.get('call-tool')

      mockReadFile.mockResolvedValue('/invalid/inferred/path')

      await expect(
        handler({
          params: {
            name: 'get-brds',
            arguments: { cwd: '/with/specifai-path' },
          },
        })
      ).rejects.toThrow('No project path set')
    })

    test('should handle error during inference', async () => {
      // Create a new server service instance to avoid state from previous tests
      mockRequestHandlers.clear()
      const newServerService = new ServerService()
      const handler = mockRequestHandlers.get('call-tool')

      mockReadFile.mockRejectedValue(new Error('Read error'))

      await expect(
        handler({
          params: {
            name: 'get-brds',
            arguments: { cwd: '/with/specifai-path' },
          },
        })
      ).rejects.toThrow('No project path set')
    })

    test('should directly access inferProjectPath method', async () => {
      // Test with valid path
      mockReadFile.mockResolvedValue('/inferred/path')
      const result1 = await (serverService as any).inferProjectPath('/with/specifai-path')
      expect(result1).toBe('/inferred/path')

      // Test with empty path
      const result2 = await (serverService as any).inferProjectPath('')
      expect(result2).toBeNull()

      // Test with non-existent directory
      const result3 = await (serverService as any).inferProjectPath('/non/existent/dir')
      expect(result3).toBeNull()

      // Test with directory without .specifai-path file
      mockAccess.mockRejectedValue(new Error('File not found'))
      const result4 = await (serverService as any).inferProjectPath('/valid/dir')
      expect(result4).toBeNull()

      // Test with invalid inferred path
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue('/invalid/inferred/path')
      const result5 = await (serverService as any).inferProjectPath('/with/specifai-path')
      expect(result5).toBeNull()

      // Test with error during file read
      mockReadFile.mockRejectedValue(new Error('Read error'))
      const result6 = await (serverService as any).inferProjectPath('/with/specifai-path')
      expect(result6).toBeNull()
    })

    test('should auto-infer project path for get-prds', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-prds',
          arguments: { cwd: '/with/specifai-path' },
        },
      })
      expect(response.content[0].text).toContain('PRD01')
    })

    test('should auto-infer project path for get-nfrs', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-nfrs',
          arguments: { cwd: '/with/specifai-path' },
        },
      })
      expect(response.content[0].text).toContain('NFR01')
    })

    test('should auto-infer project path for get-uirs', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-uirs',
          arguments: { cwd: '/with/specifai-path' },
        },
      })
      expect(response.content[0].text).toContain('UIR01')
    })

    test('should auto-infer project path for get-bpds', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-bpds',
          arguments: { cwd: '/with/specifai-path' },
        },
      })
      expect(response.content[0].text).toContain('BP01')
    })

    test('should auto-infer project path for get-user-stories', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: {
            prdId: 'PRD01',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toContain('US1')
    })

    test('should auto-infer project path for get-tasks', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'US1',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toContain('T1')
    })

    test('should auto-infer project path for get-task', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'US1',
            taskId: 'T1',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toContain('T1')
    })

    // Additional tests to cover remaining lines
    test('should handle auto-inference with non-existent PRD in get-user-stories', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: {
            prdId: 'nonexistent',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toBe('No PRD found with ID nonexistent')
    })

    test('should handle auto-inference with non-existent PRD in get-tasks', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'nonexistent',
            userStoryId: 'US1',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toBe('No PRD found with ID nonexistent')
    })

    test('should handle auto-inference with non-existent user story in get-tasks', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'nonexistent',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toBe('No User Story found with ID nonexistent')
    })

    test('should handle auto-inference with non-existent PRD in get-task', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'nonexistent',
            userStoryId: 'US1',
            taskId: 'T1',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toBe('No PRD found with ID nonexistent')
    })

    test('should handle auto-inference with non-existent user story in get-task', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'nonexistent',
            taskId: 'T1',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toBe('No User Story found with ID nonexistent')
    })

    test('should handle auto-inference with non-existent task in get-task', async () => {
      mockReadFile.mockResolvedValue('/inferred/path')
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'US1',
            taskId: 'nonexistent',
            cwd: '/with/specifai-path',
          },
        },
      })
      expect(response.content[0].text).toBe('No Task found with ID nonexistent')
    })

    // Tests to cover remaining lines
    // Tests to cover remaining lines
    test('should handle Zod validation errors', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      await expect(
        handler({
          params: {
            name: 'get-user-stories',
            arguments: {
              // Missing prdId which is required
              cwd: '/with/specifai-path',
            },
          },
        })
      ).rejects.toThrow('Invalid arguments')
    })

    // Test to cover the specific error case when projectPath is provided but inference fails
    test('should throw specific error when projectPath is provided but inference fails', async () => {
      // Create a new server service instance
      mockRequestHandlers.clear()
      const newServerService = new ServerService()
      const handler = mockRequestHandlers.get('call-tool')

      // Mock inferProjectPath to return null (inference failure)
      jest.spyOn(newServerService as any, 'inferProjectPath').mockResolvedValue(null)

      // Test with get-brds
      await expect(
        handler({
          params: {
            name: 'get-brds',
            arguments: { cwd: '/some/path' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-prds
      await expect(
        handler({
          params: {
            name: 'get-prds',
            arguments: { cwd: '/some/path' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-nfrs
      await expect(
        handler({
          params: {
            name: 'get-nfrs',
            arguments: { cwd: '/some/path' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-uirs
      await expect(
        handler({
          params: {
            name: 'get-uirs',
            arguments: { cwd: '/some/path' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-bpds
      await expect(
        handler({
          params: {
            name: 'get-bpds',
            arguments: { cwd: '/some/path' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-user-stories
      await expect(
        handler({
          params: {
            name: 'get-user-stories',
            arguments: {
              prdId: 'PRD01',
              cwd: '/some/path',
            },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-tasks
      await expect(
        handler({
          params: {
            name: 'get-tasks',
            arguments: {
              prdId: 'PRD01',
              userStoryId: 'US1',
              cwd: '/some/path',
            },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )

      // Test with get-task
      await expect(
        handler({
          params: {
            name: 'get-task',
            arguments: {
              prdId: 'PRD01',
              userStoryId: 'US1',
              taskId: 'T1',
              cwd: '/some/path',
            },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })
  })

  describe('Tool Handlers', () => {
    test('should format multiple documents correctly', () => {
      const docs = [
        {
          id: 'test1',
          title: 'Test 1',
          description: 'Description 1',
        },
        {
          id: 'test2',
          title: 'Test 2',
          description: 'Description 2',
        },
      ]

      const formatted = (serverService as any).formatDocuments(docs)
      expect(formatted).toBe(
        'ID: test1\nTitle: Test 1\nDescription: Description 1\n--------------\n' +
          'ID: test2\nTitle: Test 2\nDescription: Description 2\n--------------'
      )
    })

    test('should format single document correctly', () => {
      const docs = [
        {
          id: 'test',
          title: 'Test',
          description: 'Description',
        },
      ]

      const formatted = (serverService as any).formatDocuments(docs)
      expect(formatted).toBe('ID: test\nTitle: Test\nDescription: Description\n--------------')
    })

    test('should handle empty document array', () => {
      const docs: Array<{ id: string; title: string; description: string }> = []
      const formatted = (serverService as any).formatDocuments(docs)
      expect(formatted).toBe('')
    })

    test('should handle get-brds request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-brds', arguments: { cwd: '/test/path' } },
      })

      expect(response.content[0].text).toContain('BRD01')
      expect(response.content[0].text).toContain('Test BRD')
    })

    test('should handle get-user-stories request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: { prdId: 'PRD01', cwd: '/test/path' },
        },
      })

      expect(response.content[0].text).toContain('US1')
      expect(response.content[0].text).toContain('User Story 1')
    })

    test('should handle get-tasks request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'US1',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toContain('T1')
      expect(response.content[0].text).toContain('Task 1')
    })

    test('should handle get-nfrs request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-nfrs', arguments: { cwd: '/test/path' } },
      })

      expect(response.content[0].text).toContain('NFR01')
      expect(response.content[0].text).toContain('Test NFR')
    })

    test('should handle get-uirs request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-uirs', arguments: { cwd: '/test/path' } },
      })

      expect(response.content[0].text).toContain('UIR01')
      expect(response.content[0].text).toContain('Test UIR')
    })

    test('should handle get-bpds request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-bpds', arguments: { cwd: '/test/path' } },
      })

      expect(response.content[0].text).toContain('BP01')
      expect(response.content[0].text).toContain('Test BP')
    })

    test('should handle get-task request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'US1',
            taskId: 'T1',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toContain('T1')
      expect(response.content[0].text).toContain('Task 1')
    })

    test('should handle invalid tool name', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      await expect(
        handler({
          params: { name: 'invalid-tool', arguments: {} },
        })
      ).rejects.toThrow('Unknown tool: invalid-tool')
    })

    test('should handle invalid arguments with detailed error message', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      await expect(
        handler({
          params: {
            name: 'get-task',
            arguments: {
              prdId: 'PRD01',
              // Missing userStoryId and taskId
            },
          },
        })
      ).rejects.toThrow('Invalid arguments: userStoryId: Required, taskId: Required')
    })

    test('should handle malformed PRD in get-user-stories', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      // Create a new server service instance with malformed path
      mockRequestHandlers.clear()
      const newServerService = new ServerService()
      const malformedHandler = mockRequestHandlers.get('call-tool')

      // Set malformed solution path
      await malformedHandler({
        params: {
          name: 'set-project-path',
          arguments: { path: '/test/malformed/path' },
        },
      })

      const response = await malformedHandler({
        params: {
          name: 'get-user-stories',
          arguments: { prdId: 'PRD01', cwd: '/test/malformed/path' },
        },
      })
      expect(response.content[0].text).toBe('')
    })

    test('should handle empty PRD list', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      // Create a new server service instance with empty PRD path
      mockRequestHandlers.clear()
      const emptyPrdService = new ServerService()
      const emptyPrdHandler = mockRequestHandlers.get('call-tool')

      // Set empty PRD solution path
      await emptyPrdHandler({
        params: {
          name: 'set-project-path',
          arguments: { path: '/test/empty/path' },
        },
      })

      const response = await emptyPrdHandler({
        params: {
          name: 'get-prds',
          arguments: { cwd: '/test/empty/path' },
        },
      })
      expect(response.content[0].text).toBe('No PRDs found')
    })

    test('should handle non-existent PRD in get-user-stories', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: { prdId: 'nonexistent', cwd: '/test/path' },
        },
      })

      expect(response.content[0].text).toBe('No PRD found with ID nonexistent')
    })

    test('should handle non-existent PRD in get-tasks', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'nonexistent',
            userStoryId: 'US1',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toBe('No PRD found with ID nonexistent')
    })

    test('should handle non-existent PRD in get-task', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'nonexistent',
            userStoryId: 'US1',
            taskId: 'T1',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toBe('No PRD found with ID nonexistent')
    })

    test('should handle non-existent user story in get-tasks when PRD exists', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'nonexistent',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toBe('No User Story found with ID nonexistent')
    })

    test('should handle non-existent user story in get-task when PRD exists', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'nonexistent',
            taskId: 'T1',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toBe('No User Story found with ID nonexistent')
    })

    test('should handle non-existent task when PRD and user story exist', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'US1',
            taskId: 'nonexistent',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toBe('No Task found with ID nonexistent')
    })

    test('should handle non-existent user story', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-tasks',
          arguments: {
            prdId: 'PRD01',
            userStoryId: 'nonexistent',
            cwd: '/test/path',
          },
        },
      })

      expect(response.content[0].text).toBe('No User Story found with ID nonexistent')
    })

    test('should handle get-user-stories before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-user-stories',
            arguments: { prdId: 'PRD01' }, // Deliberately omit cwd
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-brds before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-brds',
            arguments: {}, // Deliberately omit cwd
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-prds before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-prds',
            arguments: {}, // Deliberately omit cwd
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-nfrs before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-nfrs',
            arguments: {}, // Deliberately omit cwd
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-uirs before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-uirs',
            arguments: {}, // Deliberately omit cwd
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-bpds before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-bpds',
            arguments: {}, // Deliberately omit cwd
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-tasks before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-tasks',
            arguments: {
              prdId: 'PRD01',
              userStoryId: 'US1',
              // Deliberately omit cwd
            },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-task before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-task',
            arguments: {
              prdId: 'PRD01',
              userStoryId: 'US1',
              taskId: 'T1',
              // Deliberately omit cwd
            },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle set-project-path with invalid path', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      await expect(
        handler({
          params: {
            name: 'set-project-path',
            arguments: { path: '/invalid/path' },
          },
        })
      ).rejects.toThrow('Invalid path')
    })
  })

  describe('New Tool Handlers', () => {
    const mockMiniSearch = {
      search: jest.fn(),
      addAll: jest.fn(),
      removeAll: jest.fn(),
    }
    let originalMiniSearch: any

    beforeEach(async () => {
      mockMiniSearch.search.mockClear().mockReset()
      mockMiniSearch.addAll.mockClear().mockReset()
      mockMiniSearch.removeAll.mockClear().mockReset()

      mockRequestHandlers.clear()
      serverService = new ServerService()
      ;(serverService as any).miniSearch = mockMiniSearch

      const handler = mockRequestHandlers.get('call-tool')
      await handler({
        params: {
          name: 'set-project-path',
          arguments: { path: '/test/path' },
        },
      })

      mockMiniSearch.search.mockReturnValue([])
      mockMiniSearch.addAll.mockReturnValue(undefined)
      mockMiniSearch.removeAll.mockReturnValue(undefined)
    })

    test('should handle get-task-by-id request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task-by-id',
          arguments: { taskId: 'T1', cwd: '/test/path' },
        },
      })
      expect(response.content[0].text).toContain('ID: T1')
      expect(response.content[0].text).toContain('Title: Task 1')
      expect(response.content[0].text).toContain('Description: Test task')
    })

    test('should handle get-task-by-id request for non-existent task', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-task-by-id',
          arguments: { taskId: 'nonexistent', cwd: '/test/path' },
        },
      })
      expect(response.content[0].text).toBe('No Task found with ID nonexistent')
    })

    test('should handle list-all-tasks request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'list-all-tasks',
          arguments: { cwd: '/test/path' },
        },
      })
      expect(response.content[0].text).toContain('ID: T1')
      expect(response.content[0].text).toContain('Title: Task 1')
      expect(response.content[0].text).not.toContain('Description:')
    })

    test('should handle list-all-tasks request with limit and offset', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'list-all-tasks',
          arguments: { cwd: '/test/path', limit: 1, offset: 0 },
        },
      })
      expect(response.content[0].text).toContain('ID: T1')
      expect(response.content[0].text).toContain('Title: Task 1')
    })

    test('should handle search request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      mockMiniSearch.search.mockReturnValue([
        {
          id: 'T1',
          title: 'Task 1',
          description: 'Test task',
          type: 'TASK',
          score: 1,
          match: {},
          terms: [],
        },
      ])

      const response = await handler({
        params: {
          name: 'search',
          arguments: { searchTerm: 'Test task', cwd: '/test/path' },
        },
      })

      expect(mockMiniSearch.search).toHaveBeenCalledWith('Test task')
      expect(response.content[0].text).toContain('ID: T1')
      expect(response.content[0].text).toContain('Title: Task 1')
      expect(response.content[0].text).toContain('Description: Test task')
      expect(response.content[0].text).toContain('Type: TASK')
    })

    test('should handle search request with type filter', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      mockMiniSearch.search.mockReturnValue([
        {
          id: 'T1',
          title: 'Task 1',
          description: 'Test task',
          type: 'TASK',
          score: 1,
          match: {},
          terms: [],
        },
        {
          id: 'BRD01',
          title: 'Test BRD',
          description: 'Test BRD description',
          type: 'BRD',
          score: 1,
          match: {},
          terms: [],
        },
      ])

      const response = await handler({
        params: {
          name: 'search',
          arguments: { searchTerm: 'Test', type: 'BRD', cwd: '/test/path' },
        },
      })

      expect(mockMiniSearch.search).toHaveBeenCalledWith('Test')
      expect(response.content[0].text).toContain('ID: BRD01')
      expect(response.content[0].text).toContain('Type: BRD')
      expect(response.content[0].text).not.toContain('ID: T1')
    })

    test('should handle search request with no results', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      mockMiniSearch.search.mockReturnValue([])

      const response = await handler({
        params: {
          name: 'search',
          arguments: { searchTerm: 'nonexistent term', cwd: '/test/path' },
        },
      })

      expect(mockMiniSearch.search).toHaveBeenCalledWith('nonexistent term')
      expect(response.content[0].text).toBe('No results found')
    })

    test('should handle search request before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'search',
            arguments: { searchTerm: 'test' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle get-task-by-id request before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'get-task-by-id',
            arguments: { taskId: 'T1' },
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })

    test('should handle list-all-tasks request before project path is set', async () => {
      mockRequestHandlers.clear()
      const noPathService = new ServerService()
      const noPathHandler = mockRequestHandlers.get('call-tool')
      await expect(
        noPathHandler({
          params: {
            name: 'list-all-tasks',
            arguments: {},
          },
        })
      ).rejects.toThrow(
        'No project path set. Use set-project-path first or provide a valid cwd to auto-infer.'
      )
    })
  })

  describe('Server Configuration', () => {
    test('should initialize with correct server config', () => {
      expect(mockServer.requestHandlers.has('list-tools')).toBeTruthy()
      expect(mockServer.requestHandlers.has('call-tool')).toBeTruthy()
    })

    test('should create text response with correct format', () => {
      const response = (serverService as any).createTextResponse('test message')
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: 'test message',
          },
        ],
      })
    })
  })

  describe('Server Start', () => {
    test('should start server successfully', async () => {
      await serverService.start()
      expect(mockServer.connect).toHaveBeenCalled()
    })
  })

  describe('Project Path via Constructor (--project-path arg)', () => {
    test('should initialize with project path from constructor', async () => {
      const projectPathService = new ServerService('/test/path')

      expect((projectPathService as any).projectPath).toBe('/test/path')
    })

    test('should load solution from constructor path during start', async () => {
      mockRequestHandlers.clear()
      const projectPathService = new ServerService('/test/path')

      const loadSolutionSpy = jest.spyOn(projectPathService as any, 'loadSolutionFromPath')

      await projectPathService.start()

      expect(loadSolutionSpy).toHaveBeenCalledWith('/test/path')
    })

    test('should handle tools without needing to set path when constructor path is provided', async () => {
      mockRequestHandlers.clear()
      const projectPathService = new ServerService('/test/path')

      const handler = mockRequestHandlers.get('call-tool')
      await projectPathService.start()

      const response = await handler({
        params: {
          name: 'get-brds',
          arguments: {},
        },
      })

      expect(response.content[0].text).toContain('BRD01')
    })
  })
})
