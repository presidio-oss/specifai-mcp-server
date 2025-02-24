# Development Setup Guide

## Prerequisites

- Node.js >= 16.0.0
- Bun >= 1.0.0
- Git

## Initial Setup

1. **Clone the Repository**

```bash
git clone https://github.com/vj-presidio/specif-ai-mcp-server.git
cd specif-ai-mcp-server
```

2. **Install Dependencies**

```bash
# Using npm
npm install

# Using bun
bun install
```

## Development Scripts

- **Build the Project**

```bash
npm run build      # Regular build
npm run build:npm  # Build for npm publishing
```

- **Run Tests**

```bash
npm test          # Run tests with coverage
npm run test:watch # Run tests in watch mode
```

- **Code Formatting**

```bash
npm run format       # Format code
npm run format:check # Check formatting
```

- **Release Process**

```bash
npm run release       # Create a release
npm run release:ci    # CI release
npm run release:dry-run # Test release process
```

## Development Workflow

1. **Git Hooks**

   - The project uses Husky for git hooks
   - Commit messages are validated using commitlint
   - Code is automatically formatted on commit

2. **Commit Message Format**
   Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

   ```
   type(scope): description

   [optional body]

   [optional footer]
   ```

   Types: feat, fix, docs, style, refactor, test, chore

3. **Testing**

   - Write tests for new features
   - Maintain test coverage
   - Tests are in `__tests__` directories
   - Use Jest's snapshot testing when appropriate

4. **Code Style**
   - Follow TypeScript best practices
   - Use ESM imports/exports
   - Document public APIs with JSDoc
   - Follow the existing project structure

## IDE Setup

### VSCode

Recommended extensions:

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Jest Runner

Recommended settings (`settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Debugging

1. **Local Development**

   - Use the `debug` configuration in VSCode
   - Set breakpoints in TypeScript files
   - Console logs are formatted with pino-pretty

2. **Testing**
   - Use `test:watch` for development
   - Debug tests using Jest VSCode extension
   - Check coverage reports in `coverage/` directory

## Common Issues

1. **Module Resolution**

   - Ensure TypeScript version matches peer dependency
   - Check tsconfig.json module settings
   - Verify import/export syntax (use ESM)

2. **Build Issues**

   - Clear build cache if needed
   - Verify Node.js and Bun versions
   - Check for TypeScript errors

3. **Test Issues**
   - Ensure Jest configuration matches ESM setup
   - Check test environment setup
   - Verify mock implementations
