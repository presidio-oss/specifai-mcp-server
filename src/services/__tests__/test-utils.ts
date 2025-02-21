// Utility to manage console output during tests
export class ConsoleManager {
  private static originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }

  static suppressConsole() {
    console.log = jest.fn()
    console.info = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
    console.debug = jest.fn()
  }

  static restoreConsole() {
    console.log = this.originalConsole.log
    console.info = this.originalConsole.info
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    console.debug = this.originalConsole.debug
  }
}

describe('ConsoleManager', () => {
  test('should suppress and restore console methods', () => {
    const originalLog = console.log

    ConsoleManager.suppressConsole()
    expect(console.log).not.toBe(originalLog)
    expect(jest.isMockFunction(console.log)).toBe(true)

    ConsoleManager.restoreConsole()
    expect(console.log).toBe(originalLog)
  })
})
