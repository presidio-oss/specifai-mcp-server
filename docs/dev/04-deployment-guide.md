# Deployment Guide

## Overview

This guide covers the process of building, releasing, and deploying the Specifai MCP Server. The project uses automated release processes with conventional commits and semantic versioning.

## Build Process

### 1. Production Build

```bash
# Regular build
npm run build

# NPM-specific build
npm run build:npm
```

### 2. Build Artifacts

The build generates:

- Compiled JavaScript files
- Type definition files
- Source maps
- Bundle metadata

## Release Process

### 1. Automated Release

The project uses `release-it` with conventional changelog:

```bash
# Create a release
npm run release

# Test release process
npm run release:dry-run

# CI release
npm run release:ci
```

### 2. Version Management

- Follows [Semantic Versioning](https://semver.org/)
- Version bumps based on commit types
- Changelog generation
- Git tag creation

## Publishing

### NPM Package

```bash
# Prepare for publishing
npm run prepublishOnly

# Publish to NPM
npm publish
```

## Deployment Checklist

### 1. Pre-deployment

- [ ] All tests passing
- [ ] Code coverage meets threshold
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Git working directory clean

### 2. Deployment

- [ ] Build successful
- [ ] Release created
- [ ] NPM package published
- [ ] Git tags pushed
- [ ] GitHub release created

### 3. Post-deployment

- [ ] Verify package installation
- [ ] Check documentation accessibility
- [ ] Monitor error rates
- [ ] Check logging output
- [ ] Verify version reporting

## Monitoring

The server uses Pino for logging:

- Log levels: trace, debug, info, warn, error
- Structured JSON logging
- Pretty printing in development
- all the logs are stored in the `$HOME/.specif-ai/mcp-log.log` file

## Rollback Procedure

### 1. NPM Package

```bash
# Revert to previous version
npm unpublish @presidio-dev/specifai-mcp-server@{version}
npm publish @presidio-dev/specifai-mcp-server@{previous-version}
```

### 2. Git Tags

```bash
# Remove bad tag
git tag -d v{version}
git push origin :refs/tags/v{version}

# Revert release commit
git revert {release-commit-hash}
git push origin main
```

## Support

### 1. Common Issues

1. **Installation Problems**

   - Verify Node.js version
   - Check npm/bun cache
   - Verify package integrity

2. **Runtime Issues**
   - Verify file permissions
   - Review log output

### 2. Getting Help

- GitHub Issues: Report bugs and feature requests
- Documentation: Check latest docs
- Changelog: Review recent changes
