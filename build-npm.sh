#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the version number to be released
SP_VERSION=$(bun run release-it --release-version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

echo -e "${BLUE}Building npm package version ${SP_VERSION}...${NC}"

# Function to check package version
check_package_version() {
    echo -e "${BLUE}Checking npm package version...${NC}"
    echo -e "${BLUE}Version information:${NC}"
    echo "----------------------------------------"
    node ./dist/index.js --help | grep "specifai-mcp-server - v"
    echo "----------------------------------------"
}

# Build with version injection
if bun build ./index.ts \
  --outdir ./dist \
  --target node \
  --minify \
  --sourcemap \
  --external thread-stream \
  --external pino \
  --define "process.env.SP_VERSION=\"$SP_VERSION\""; then
    echo -e "${GREEN}✓ Successfully built npm package${NC}"
    echo "----------------------------------------"
    check_package_version
    exit 0
else
    echo -e "${RED}✗ Failed to build npm package${NC}"
    exit 1
fi
