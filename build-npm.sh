#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the version number to be released
VERSION=$(bun run release-it --release-version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

echo -e "${BLUE}Building npm package version ${VERSION}...${NC}"

# Build with version injection
if bun build ./index.ts \
  --outdir ./dist \
  --target node \
  --minify \
  --sourcemap \
  --define "process.env.VERSION=\"$VERSION\""; then
  echo -e "${GREEN}✓ Successfully built npm package${NC}"
  exit 0
else
  echo -e "${RED}✗ Failed to build npm package${NC}"
  exit 1
fi
