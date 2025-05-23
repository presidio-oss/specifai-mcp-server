import { DocumentService } from '../document.service'
import { FileService } from '../file.service'
import type { JsonFileContent, Solution, PRD } from '../../types'
import { ConsoleManager } from './test-utils'

// Mock the FileService module first
jest.mock('../file.service', () => ({
  FileService: jest.fn(),
}))

// Then define the mock class
class MockFileService {
  private mockIsDirectory: boolean = true

  setMockIsDirectory(value: boolean) {
    this.mockIsDirectory = value
  }

  async isDirectory() {
    return this.mockIsDirectory
  }

  async readAllJsonFiles(dir: string): Promise<JsonFileContent[]> {
    // Test empty directory case
    if (dir.endsWith('NFR')) {
      return []
    }
    // Test malformed data case
    if (dir.endsWith('UIR')) {
      return [
        {
          name: 'malformed.json',
          content: {
            // Missing required fields
          },
        },
      ]
    }
    if (dir.endsWith('PRD')) {
      return [
        {
          name: 'PRD01-base.json',
          content: {
            title: 'Test PRD',
            requirement: 'Test requirement',
          },
        },
        {
          name: 'PRD01-feature.json',
          content: {
            features: [
              {
                id: 'US1',
                name: 'User Story 1',
                description: 'Test user story',
                tasks: [
                  {
                    id: 'T1',
                    list: 'Task 1',
                    acceptance: 'Test acceptance',
                  },
                ],
              },
            ],
          },
        },
        // Add a base without feature file
        {
          name: 'PRD02-base.json',
          content: {
            title: 'Test PRD 2',
            requirement: 'Test requirement 2',
          },
        },
        // Add a feature without base file
        {
          name: 'PRD03-feature.json',
          content: {
            features: [],
          },
        },
      ]
    }
    if (dir.endsWith('BP')) {
      return [
        {
          name: 'BP01-base.json',
          content: {
            title: 'Test BP',
            requirement: 'Test BP requirement',
          },
        },
      ]
    }
    return [
      {
        name: 'test-base.json',
        content: {
          title: 'Test Doc',
          requirement: 'Test requirement',
        },
      },
    ]
  }
}

describe('DocumentService', () => {
  beforeAll(() => {
    ConsoleManager.suppressConsole()
  })

  afterAll(() => {
    ConsoleManager.restoreConsole()
  })

  let documentService: DocumentService
  let mockFileService: MockFileService

  beforeEach(() => {
    // Reset mock state
    mockFileService = new MockFileService()
    mockFileService.setMockIsDirectory(true)

    // Update mock module with new instance
    ;(FileService as jest.Mock).mockImplementation(() => mockFileService)

    documentService = new DocumentService()
  })

  describe('loadSolution', () => {
    test('should load and process all document types with correct structure', async () => {
      const solution = await documentService.loadSolution('/test/path')

      // Check all document types
      expect(solution.BP).toHaveLength(1)
      expect(solution.BP[0]).toEqual({
        id: 'BP01',
        title: 'Test BP',
        description: 'Test BP requirement',
      })

      expect(solution.BRD).toHaveLength(1)
      expect(solution.BRD[0]).toEqual({
        id: 'test',
        title: 'Test Doc',
        description: 'Test requirement',
      })

      // Check PRDs with user stories
      expect(solution.PRD).toHaveLength(1) // Only one valid PRD (with both base and feature)
      const prd = solution.PRD[0]
      expect(prd.id).toBe('PRD01')
      expect(prd.userStories).toHaveLength(1)
      expect(prd.userStories[0].tasks).toHaveLength(1)
      expect(prd.userStories[0]).toEqual({
        id: 'US1',
        title: 'User Story 1',
        description: 'Test user story',
        tasks: [
          {
            id: 'T1',
            title: 'Task 1',
            description: 'Test acceptance',
          },
        ],
      })
    })

    test('should handle PRDs without matching feature files', async () => {
      const solution = await documentService.loadSolution('/test/path')
      const prd = solution.PRD.find((p) => p.id === 'PRD02')
      expect(prd).toBeUndefined()
    })

    test('should handle feature files without matching base files', async () => {
      const solution = await documentService.loadSolution('/test/path')
      const prd = solution.PRD.find((p) => p.id === 'PRD03')
      expect(prd).toBeUndefined()
    })

    test('should handle empty document directories', async () => {
      const solution = await documentService.loadSolution('/test/path')
      expect(solution.NFR).toHaveLength(0)
    })

    test('should handle malformed document data', async () => {
      const solution = await documentService.loadSolution('/test/path')
      expect(solution.UIR).toHaveLength(1)
      expect(solution.UIR[0]).toEqual({
        id: 'malformed',
        title: undefined,
        description: undefined,
      })
    })

    test('should throw error for invalid directory', async () => {
      mockFileService.setMockIsDirectory(false)

      await expect(documentService.loadSolution('/invalid/path')).rejects.toThrow(
        'Invalid project path'
      )
    })

    test('should handle file read errors by returning empty arrays', async () => {
      // Mock readAllJsonFiles to throw an error
      mockFileService.readAllJsonFiles = jest.fn().mockRejectedValue(new Error('File read error'))

      const solution = await documentService.loadSolution('/test/path')
      expect(solution).toEqual({
        BP: [],
        BRD: [],
        PRD: [],
        NFR: [],
        UIR: [],
      })
    })
  })

  describe('normalize method behavior', () => {
    test('should correctly normalize document IDs', async () => {
      const solution = await documentService.loadSolution('/test/path')
      // Check if -base is removed from ID
      expect(solution.BRD[0].id).toBe('test')
      expect(solution.BP[0].id).toBe('BP01')
    })
  })

  describe('findPRD', () => {
    let solution: Solution

    beforeEach(async () => {
      mockFileService.setMockIsDirectory(true)
      solution = await documentService.loadSolution('/test/path')
    })

    test('should find PRD by ID', () => {
      const prd = documentService.findPRD(solution, 'PRD01')
      expect(prd).toBeTruthy()
      expect(prd?.id).toBe('PRD01')
    })

    test('should return null for non-existent PRD', () => {
      const prd = documentService.findPRD(solution, 'nonexistent')
      expect(prd).toBeNull()
    })
  })

  describe('findUserStory', () => {
    let prd: PRD

    beforeEach(async () => {
      mockFileService.setMockIsDirectory(true)
      const solution = await documentService.loadSolution('/test/path')
      prd = solution.PRD[0]
    })

    test('should find user story by ID', () => {
      const userStory = documentService.findUserStory(prd, 'US1')
      expect(userStory).toBeTruthy()
      expect(userStory?.id).toBe('US1')
    })

    test('should return null for non-existent user story', () => {
      const userStory = documentService.findUserStory(prd, 'nonexistent')
      expect(userStory).toBeNull()
    })
  })

  describe('findTask', () => {
    test('should handle undefined tasks array', () => {
      const userStory = {
        id: 'US1',
        title: 'Test Story',
        description: 'Test Description',
        tasks: undefined as any,
      }
      const task = documentService.findTask(userStory, 'T1')
      expect(task).toBeNull()
    })
    let prd: PRD

    beforeEach(async () => {
      mockFileService.setMockIsDirectory(true)
      const solution = await documentService.loadSolution('/test/path')
      prd = solution.PRD[0]
    })

    test('should find task by ID', () => {
      const userStory = prd.userStories[0]
      const task = documentService.findTask(userStory, 'T1')
      expect(task).toBeTruthy()
      expect(task?.id).toBe('T1')
    })

    test('should return null for non-existent task', () => {
      const userStory = prd.userStories[0]
      const task = documentService.findTask(userStory, 'nonexistent')
      expect(task).toBeNull()
    })
  })
})
