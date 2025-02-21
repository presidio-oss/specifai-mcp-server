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

  let serverService: ServerService

  beforeEach(() => {
    mockRequestHandlers.clear()
    serverService = new ServerService(mockSolution)
  })

  describe('List Tools Handler', () => {
    test('should return complete list of tools with schemas', async () => {
      const handler = mockRequestHandlers.get('list-tools')
      const response = await handler()

      expect(response.tools).toHaveLength(8)
      expect(response.tools.map((t: { name: string }) => t.name)).toEqual([
        'get-brds',
        'get-prds',
        'get-nfrs',
        'get-uirs',
        'get-bps',
        'get-user-stories',
        'get-tasks',
        'get-task',
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
        params: { name: 'get-brds', arguments: {} },
      })

      expect(response.content[0].text).toContain('BRD01')
      expect(response.content[0].text).toContain('Test BRD')
    })

    test('should handle get-user-stories request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: { prdId: 'PRD01' },
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
          },
        },
      })

      expect(response.content[0].text).toContain('T1')
      expect(response.content[0].text).toContain('Task 1')
    })

    test('should handle get-nfrs request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-nfrs', arguments: {} },
      })

      expect(response.content[0].text).toContain('NFR01')
      expect(response.content[0].text).toContain('Test NFR')
    })

    test('should handle get-uirs request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-uirs', arguments: {} },
      })

      expect(response.content[0].text).toContain('UIR01')
      expect(response.content[0].text).toContain('Test UIR')
    })

    test('should handle get-bps request', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: { name: 'get-bps', arguments: {} },
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
      const malformedSolution: Solution = {
        ...mockSolution,
        PRD: [
          {
            id: 'PRD01',
            title: '',
            description: '',
            userStories: [],
          },
        ],
      }
      const malformedServerService = new ServerService(malformedSolution)
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: { prdId: 'PRD01' },
        },
      })
      expect(response.content[0].text).toBe('')
    })

    test('should handle empty PRD list', async () => {
      const emptyPRDSolution: Solution = {
        ...mockSolution,
        PRD: [],
      }
      const emptyServerService = new ServerService(emptyPRDSolution)
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-prds',
          arguments: {},
        },
      })
      expect(response.content[0].text).toBe('')
    })

    test('should handle non-existent PRD in get-user-stories', async () => {
      const handler = mockRequestHandlers.get('call-tool')
      const response = await handler({
        params: {
          name: 'get-user-stories',
          arguments: { prdId: 'nonexistent' },
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
          },
        },
      })

      expect(response.content[0].text).toBe('No User Story found with ID nonexistent')
    })
  })

  describe('Server Configuration', () => {
    test('should initialize with correct server config', () => {
      const serverService = new ServerService(mockSolution)
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
})
