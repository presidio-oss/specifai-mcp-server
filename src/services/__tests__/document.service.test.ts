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
    // Handle Jira metadata file
    if (dir === '/test/path') {
      return [
        {
          name: '.metadata.json',
          content: {
            id: 'test-project',
            name: 'Test Project',
            description: 'Test project description',
            technicalDetails: 'Test technical details',
            createReqt: true,
            cleanSolution: false,
            createdAt: '2023-01-01T00:00:00.000Z',
            integration: {
              selectedPmoTool: 'jira',
            },
          },
        },
      ]
    }
    // Handle ADO metadata file
    if (dir === '/test/ado/path') {
      return [
        {
          name: '.metadata.json',
          content: {
            id: 'test-ado-project',
            name: 'Test ADO Project',
            description: 'Test ADO project description',
            technicalDetails: 'Test ADO technical details',
            createReqt: true,
            cleanSolution: false,
            createdAt: '2023-01-01T00:00:00.000Z',
            integration: {
              selectedPmoTool: 'ado',
            },
          },
        },
      ]
    }
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
            pmoId: 'HB-1001',
            pmoIssueType: 'Feature',
            linkedBRDIds: ['BRD01', 'BRD02'],
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
                pmoId: 'HB-2001',
                pmoIssueType: 'Platform Feature',
                tasks: [
                  {
                    id: 'T1',
                    list: 'Task 1',
                    acceptance: 'Test acceptance',
                    pmoId: 'HB-3001',
                    pmoIssueType: 'User Story',
                  },
                  {
                    id: 'T2',
                    list: 'Task 2',
                    acceptance: 'Test acceptance 2',
                    // No Pmo ID for this task
                  },
                ],
              },
              {
                id: 'US2',
                name: 'User Story 2',
                description: 'Test user story 2',
                // No Pmo ID for this user story
                tasks: [
                  {
                    id: 'T3',
                    list: 'Task 3',
                    acceptance: 'Test acceptance 3',
                    pmoId: 'HB-3003',
                    pmoIssueType: 'User Story',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'PRD04-base.json',
          content: {
            title: 'ADO Test PRD',
            requirement: 'ADO Test requirement',
            pmoId: '12345',
            pmoIssueType: 'Feature',
            linkedBRDIds: ['BRD03'],
          },
        },
        {
          name: 'PRD04-feature.json',
          content: {
            features: [
              {
                id: 'US4',
                name: 'ADO User Story',
                description: 'ADO test user story',
                pmoId: '67890',
                pmoIssueType: 'User Story',
                tasks: [
                  {
                    id: 'T4',
                    list: 'ADO Task',
                    acceptance: 'ADO Test acceptance',
                    pmoId: '11111',
                    pmoIssueType: 'Task',
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

      // Check PRDs with user stories and Pmo IDs
      expect(solution.PRD).toHaveLength(2) // Two valid PRDs (with both base and feature)
      const prd = solution.PRD[0]
      expect(prd.id).toBe('PRD01')
      expect(prd.pmoId).toBe('HB-1001')
      expect(prd.pmoIssueType).toBe('Feature')
      expect(prd.linkedBRDIds).toEqual(['BRD01', 'BRD02'])
      expect(prd.userStories).toHaveLength(2)

      // Check first user story with Pmo ID and Issue Type
      expect(prd.userStories[0]).toEqual({
        id: 'US1',
        title: 'User Story 1',
        description: 'Test user story',
        pmoId: 'HB-2001',
        pmoIssueType: 'Platform Feature',
        tasks: [
          {
            id: 'T1',
            title: 'Task 1',
            description: 'Test acceptance',
            pmoId: 'HB-3001',
            pmoIssueType: 'User Story',
          },
          {
            id: 'T2',
            title: 'Task 2',
            description: 'Test acceptance 2',
          },
        ],
      })

      // Check second user story without Pmo ID
      expect(prd.userStories[1]).toEqual({
        id: 'US2',
        title: 'User Story 2',
        description: 'Test user story 2',
        tasks: [
          {
            id: 'T3',
            title: 'Task 3',
            description: 'Test acceptance 3',
            pmoId: 'HB-3003',
            pmoIssueType: 'User Story',
          },
        ],
      })

      const adoPrd = solution.PRD[1]
      expect(adoPrd.id).toBe('PRD04')
      expect(adoPrd.pmoId).toBe('12345')
      expect(adoPrd.pmoIssueType).toBe('Feature')
      expect(adoPrd.linkedBRDIds).toEqual(['BRD03'])
      expect(adoPrd.userStories).toHaveLength(1)

      expect(adoPrd.userStories[0]).toEqual({
        id: 'US4',
        title: 'ADO User Story',
        description: 'ADO test user story',
        pmoId: '67890',
        pmoIssueType: 'User Story',
        tasks: [
          {
            id: 'T4',
            title: 'ADO Task',
            description: 'ADO Test acceptance',
            pmoId: '11111',
            pmoIssueType: 'Task',
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
        METADATA: null,
      })
    })

    test('should load and process ADO documents with correct PMO tool detection', async () => {
      const solution = await documentService.loadSolution('/test/ado/path')

      expect(solution.METADATA?.integration?.selectedPmoTool).toBe('ado')

      expect(solution.PRD).toHaveLength(2)
      const adoPrd = solution.PRD.find((p) => p.id === 'PRD04')
      expect(adoPrd).toBeTruthy()
      expect(adoPrd?.pmoId).toBe('12345')
      expect(adoPrd?.pmoIssueType).toBe('Feature')
    })

    test('should process PMO issue types correctly for both JIRA and ADO', async () => {
      const solution = await documentService.loadSolution('/test/path')

      const jiraPrd = solution.PRD.find((p) => p.id === 'PRD01')
      expect(jiraPrd?.pmoIssueType).toBe('Feature')
      expect(jiraPrd?.userStories[0].pmoIssueType).toBe('Platform Feature')
      expect(jiraPrd?.userStories[0].tasks[0].pmoIssueType).toBe('User Story')

      const adoPrd = solution.PRD.find((p) => p.id === 'PRD04')
      expect(adoPrd?.pmoIssueType).toBe('Feature')
      expect(adoPrd?.userStories[0].pmoIssueType).toBe('User Story')
      expect(adoPrd?.userStories[0].tasks[0].pmoIssueType).toBe('Task')
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
