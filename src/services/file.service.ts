import { join } from 'path'
import { readdir, readFile } from 'fs/promises'
import type { JsonFileContent } from '../types'
import { logger } from '../utils/logger'

/**
 * Service for handling file system operations
 */
export class FileService {
  /**
   * Read all JSON files from a directory
   * @param directory - Directory path to read from
   * @returns Array of file contents with metadata
   */
  async readAllJsonFiles(directory: string): Promise<JsonFileContent[]> {
    try {
      const files = await readdir(directory)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      const fileContents = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = join(directory, file)
          const content = await readFile(filePath, 'utf-8')
          try {
            return {
              name: file,
              content: JSON.parse(content),
            }
          } catch (error) {
            logger.error({ error, file }, `Error parsing JSON file ${file}`)
            return {
              name: file,
              content: null,
              error: 'Invalid JSON',
            }
          }
        })
      )

      return fileContents
    } catch (error) {
      logger.error({ error }, 'Error reading directory')
      throw error
    }
  }

  /**
   * Validate if a path is a directory
   * @param path - Path to validate
   * @returns True if path is a directory
   */
  async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await readdir(path)
      return true
    } catch {
      return false
    }
  }
}
