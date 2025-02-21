import { FileService } from '../file.service'
import { ConsoleManager } from './test-utils'

// Mock fs/promises module
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}))

// Import mocked fs/promises to access mock functions
import { readdir, readFile } from 'fs/promises'

describe('FileService', () => {
  let fileService: FileService
  let mockReaddir: jest.Mock
  let mockReadFile: jest.Mock

  beforeAll(() => {
    ConsoleManager.suppressConsole()
  })

  afterAll(() => {
    ConsoleManager.restoreConsole()
  })

  beforeEach(() => {
    // Reset mocks before each test
    mockReaddir = readdir as jest.Mock
    mockReadFile = readFile as jest.Mock

    // Set default mock implementations
    mockReaddir.mockResolvedValue(['test.json', 'test2.txt'])
    mockReadFile.mockResolvedValue('{"title": "Test", "requirement": "Test req"}')

    // Clear mock calls
    mockReaddir.mockClear()
    mockReadFile.mockClear()

    fileService = new FileService()
  })

  describe('readAllJsonFiles', () => {
    test('should filter out non-JSON files', async () => {
      // Mock readdir to return mixed file types
      const files = ['test.json', 'test.txt', 'test.js', 'test2.json', 'test.jsx', 'test.JSON']
      mockReaddir.mockResolvedValue(files)

      const result = await fileService.readAllJsonFiles('/test/dir')

      // Should only process .json files (case sensitive)
      expect(result).toHaveLength(2)
      expect(result.map((f) => f.name).sort()).toEqual(['test.json', 'test2.json'])

      // Verify each file was checked for .json extension
      files.forEach((file) => {
        expect(file.endsWith('.json')).toBe(result.some((r) => r.name === file))
      })
    })

    test('should read and parse multiple JSON files from directory', async () => {
      // Mock readdir to return multiple JSON files
      mockReaddir.mockResolvedValue(['test1.json', 'test2.json'])

      // Mock readFile to return different content for each file
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('test1.json')) {
          return Promise.resolve('{"title": "Test 1", "requirement": "Req 1"}')
        } else {
          return Promise.resolve('{"title": "Test 2", "requirement": "Req 2"}')
        }
      })

      const result = await fileService.readAllJsonFiles('/test/dir')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        name: 'test1.json',
        content: {
          title: 'Test 1',
          requirement: 'Req 1',
        },
      })
      expect(result[1]).toEqual({
        name: 'test2.json',
        content: {
          title: 'Test 2',
          requirement: 'Req 2',
        },
      })
    })

    test('should handle mixed valid and invalid JSON files', async () => {
      // Setup fresh mocks for this test
      const mockFiles = ['valid.json', 'invalid.json']
      const mockContents = new Map([
        ['/test/dir/valid.json', '{"title": "Valid", "requirement": "Valid req"}'],
        ['/test/dir/invalid.json', 'invalid json content'],
      ])

      mockReaddir.mockResolvedValue(mockFiles)
      mockReadFile.mockImplementation((path: string) => Promise.resolve(mockContents.get(path)))

      const result = await fileService.readAllJsonFiles('/test/dir')

      expect(result).toHaveLength(2)
      expect(result).toEqual([
        {
          name: 'valid.json',
          content: {
            title: 'Valid',
            requirement: 'Valid req',
          },
        },
        {
          name: 'invalid.json',
          content: null,
          error: 'Invalid JSON',
        },
      ])
    })

    test('should handle invalid JSON files', async () => {
      mockReadFile.mockResolvedValue('invalid json')
      const result = await fileService.readAllJsonFiles('/test/dir')

      expect(result[0]).toEqual({
        name: 'test.json',
        content: null,
        error: 'Invalid JSON',
      })
    })

    test('should return empty array when directory does not exist', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory not found'))

      const result = await fileService.readAllJsonFiles('/test/dir')
      expect(result).toEqual([])
    })
  })

  describe('isDirectory', () => {
    test('should return true for valid directory', async () => {
      const result = await fileService.isDirectory('/test/dir')
      expect(result).toBe(true)
    })

    test('should return false for invalid directory', async () => {
      mockReaddir.mockRejectedValue(new Error())

      const result = await fileService.isDirectory('/test/dir')
      expect(result).toBe(false)
    })
  })
})
