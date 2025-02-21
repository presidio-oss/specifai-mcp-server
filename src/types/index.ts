/**
 * Base document interface that all document types extend
 */
export interface BaseDocument {
  id: string
  title: string
  description: string
}

/**
 * Task within a user story
 */
export interface Task extends BaseDocument {}

/**
 * User story containing tasks
 */
export interface UserStory extends BaseDocument {
  tasks: Task[]
}

/**
 * Product requirement document with user stories
 */
export interface PRD extends BaseDocument {
  userStories: UserStory[]
}

/**
 * Business requirement document
 */
export interface BRD extends BaseDocument {}

/**
 * Non-functional requirement document
 */
export interface NFR extends BaseDocument {}

/**
 * User interface requirement document
 */
export interface UIR extends BaseDocument {}

/**
 * Business process document
 */
export interface BP extends BaseDocument {}

/**
 * Complete solution containing all document types
 */
export interface Solution {
  BRD: BRD[]
  PRD: PRD[]
  NFR: NFR[]
  BP: BP[]
  UIR: UIR[]
}

/**
 * Raw JSON file content
 */
export interface JsonFileContent {
  name: string
  content: any
  error?: string
}
