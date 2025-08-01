import { join } from 'path'
import { readdir } from 'fs/promises'
import type {
  Solution,
  JsonFileContent,
  BaseDocument,
  PRD,
  BRD,
  NFR,
  UIR,
  BP,
  TC,
  UserStory,
  Task,
  ProjectMetadata,
} from '../types'
import { FileService } from './file.service'
import { logger } from '../utils/logger'

/**
 * Service for handling document operations
 */
export class DocumentService {
  private fileService: FileService

  constructor() {
    this.fileService = new FileService()
  }

  /**
   * Normalize JSON file content into BaseDocument format
   * @param objects - Array of JSON file contents
   * @returns Array of normalized documents
   */
  private normalize(objects: JsonFileContent[]): BaseDocument[] {
    logger.debug({ count: objects.length }, 'Normalizing documents')
    return objects.map((obj) => ({
      id: obj.name.replace('.json', '').replace('-base', ''),
      title: obj.content.title,
      description: obj.content.description || obj.content.requirement,
    }))
  }

  /**
   * Process PRD files to include user stories and tasks
   * @param prds - Array of PRD file contents
   * @returns Array of processed PRDs
   */
  private processPRDs(prds: JsonFileContent[]): PRD[] {
    logger.debug({ count: prds.length }, 'Processing PRD files')
    return prds
      .map((obj) => {
        if (!obj.name.includes('feature')) {
          const prd = prds.find((prd) => prd.name === obj.name.replace('base', 'feature'))
          if (!prd) {
            logger.warn({ basePrd: obj.name }, 'No matching feature PRD found')
            return null
          }

          const userStories: UserStory[] = prd.content.features.map((feature: any) => ({
            id: feature.id,
            title: feature.name,
            description: feature.description,
            ...(feature.pmoId && { pmoId: feature.pmoId }),
            ...(feature.pmoIssueType && { pmoIssueType: feature.pmoIssueType }),
            tasks: feature.tasks.map(
              (task: any): Task => ({
                id: task.id,
                title: task.list,
                description: task.acceptance,
                ...(task.pmoId && { pmoId: task.pmoId }),
                ...(task.pmoIssueType && { pmoIssueType: task.pmoIssueType }),
              })
            ),
          }))

          logger.debug(
            { prdId: obj.name, userStoriesCount: userStories.length },
            'Processed PRD with user stories'
          )

          return {
            id: obj.name.replace('.json', '').replace('-base', ''),
            title: obj.content.title,
            description: obj.content.requirement,
            ...(obj.content.pmoId && { pmoId: obj.content.pmoId }),
            ...(obj.content.pmoIssueType && { pmoIssueType: obj.content.pmoIssueType }),
            userStories,
            ...(obj.content.linkedBRDIds && { linkedBRDIds: obj.content.linkedBRDIds }),
          }
        }
        return null
      })
      .filter((obj): obj is PRD => obj !== null)
  }

  /**
   * Load metadata from project directory
   * @param projectPath - Path to the project directory
   * @returns Project metadata
   */
  private async loadMetadata(projectPath: string): Promise<ProjectMetadata> {
    try {
      const metadataFiles = await this.fileService.readAllJsonFiles(projectPath)
      const metadataFile = metadataFiles.find((file) => file.name === '.metadata.json')

      if (metadataFile && metadataFile.content) {
        logger.debug({ projectPath }, 'Metadata loaded successfully')
        return metadataFile.content as ProjectMetadata
      }

      throw new Error('No metadata file found')
    } catch (error) {
      logger.error({ error, projectPath }, 'Error loading metadata')
      throw error
    }
  }

  /**
   * Load test cases from user story subdirectories
   * @param tcPath - Path to the TC directory
   * @returns Array of test case file contents
` */
  private async loadTestCases(tcPath: string): Promise<JsonFileContent[]> {
    try {
      // First check if the TC directory exists
      if (!(await this.fileService.isDirectory(tcPath))) {
        logger.warn({ tcPath }, 'TC directory not found')
        return []
      }

      // Get all user story directories (US1, US2, etc.)
      const userStoryDirs = await readdir(tcPath)

      // Filter directories that start with "US"
      const usDirectories = userStoryDirs.filter((dir: string) => dir.startsWith('US'))

      // If no user story directories found, return empty array as there are no test cases
      if (usDirectories.length === 0) {
        logger.info({ tcPath }, 'No user story directories found in TC directory')
        return []
      }

      // Read test cases from each user story directory
      const allTestCases: JsonFileContent[] = []

      for (const usDir of usDirectories) {
        const usPath = join(tcPath, usDir)
        try {
          const testCases = await this.fileService.readAllJsonFiles(usPath)
          allTestCases.push(...testCases)
        } catch (error) {
          logger.warn({ error, usPath }, `Error loading test cases from ${usDir}`)
        }
      }

      logger.info({ count: allTestCases.length }, 'Loaded test cases from user story directories')
      return allTestCases
    } catch (error) {
      logger.error({ error, tcPath }, 'Error loading test cases')
      return []
    }
  }

  /**
   * Load all documents from a project directory
   * @param projectPath - Path to the project directory
   * @returns Solution containing all document types
   */
  async loadSolution(projectPath: string): Promise<Solution> {
    logger.info({ projectPath }, 'Loading solution')

    if (!(await this.fileService.isDirectory(projectPath))) {
      logger.error({ projectPath }, 'Invalid project path')
      throw new Error(`Invalid project path: ${projectPath}`)
    }

    try {
      // Load test cases first to ensure they're properly loaded
      const tcs = await this.loadTestCases(join(projectPath, 'TC'))

      const [bps, brds, prds, nfrs, uirs, metadata] = await Promise.all([
        this.fileService.readAllJsonFiles(join(projectPath, 'BP')),
        this.fileService.readAllJsonFiles(join(projectPath, 'BRD')),
        this.fileService.readAllJsonFiles(join(projectPath, 'PRD')),
        this.fileService.readAllJsonFiles(join(projectPath, 'NFR')),
        this.fileService.readAllJsonFiles(join(projectPath, 'UIR')),
        this.loadMetadata(projectPath),
      ])

      const solution: Solution = {
        BP: this.normalize(bps) as BP[],
        BRD: this.normalize(brds) as BRD[],
        PRD: this.processPRDs(prds),
        NFR: this.normalize(nfrs) as NFR[],
        UIR: this.normalize(uirs) as UIR[],
        TC: this.normalize(tcs) as TC[],
        METADATA: metadata,
      }

      logger.info(
        {
          bpsCount: solution.BP.length,
          brdsCount: solution.BRD.length,
          prdsCount: solution.PRD.length,
          nfrsCount: solution.NFR.length,
          uirsCount: solution.UIR.length,
          tcsCount: solution.TC.length,
          hasMetadata: !!metadata,
        },
        'Solution loaded successfully'
      )

      return solution
    } catch (error) {
      logger.warn({ error, projectPath }, 'Some directories not found while loading solution')
      return {
        BP: [],
        BRD: [],
        PRD: [],
        NFR: [],
        UIR: [],
        TC: [],
        METADATA: null,
      }
    }
  }

  /**
   * Find a PRD by ID
   * @param solution - Solution containing all documents
   * @param prdId - ID of the PRD to find
   * @returns PRD if found, null otherwise
   */
  findPRD(solution: Solution, prdId: string): PRD | null {
    const prd = solution.PRD.find((prd) => prd.id === prdId) || null
    if (!prd) {
      logger.debug({ prdId }, 'PRD not found')
    }
    return prd
  }

  /**
   * Find a user story in a PRD
   * @param prd - PRD to search in
   * @param userStoryId - ID of the user story to find
   * @returns User story if found, null otherwise
   */
  findUserStory(prd: PRD, userStoryId: string): UserStory | null {
    const userStory = prd.userStories.find((story) => story.id === userStoryId) || null
    if (!userStory) {
      logger.debug({ prdId: prd.id, userStoryId }, 'User Story not found')
    }
    return userStory
  }

  /**
   * Find a task in a user story
   * @param userStory - User story to search in
   * @param taskId - ID of the task to find
   * @returns Task if found, null otherwise
   */
  findTask(userStory: UserStory, taskId: string): Task | null {
    const task = userStory.tasks?.find((task) => task.id === taskId) || null
    if (!task) {
      logger.debug({ userStoryId: userStory.id, taskId }, 'Task not found')
    }
    return task
  }
}
