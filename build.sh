#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the version number to be released
VERSION=$(bun run release-it --release-version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

# Create build directory
mkdir -p build

# Define all target platforms
targets=(
    "bun-darwin-arm64:specif-ai-mcp-server-darwin-arm64-v${VERSION}"
    "bun-darwin-x64:specif-ai-mcp-server-darwin-x64-v${VERSION}"
    "bun-linux-arm64:specif-ai-mcp-server-linux-arm64-v${VERSION}"
    "bun-linux-x64:specif-ai-mcp-server-linux-x64-v${VERSION}"
    "bun-linux-x64-baseline:specif-ai-mcp-server-linux-x64-baseline-v${VERSION}"
    "bun-linux-x64-modern:specif-ai-mcp-server-linux-x64-modern-v${VERSION}"
    "bun-windows-x64:specif-ai-mcp-server-windows-x64-v${VERSION}.exe"
    "bun-windows-x64-baseline:specif-ai-mcp-server-windows-x64-baseline-v${VERSION}.exe"
    "bun-windows-x64-modern:specif-ai-mcp-server-windows-x64-modern-v${VERSION}.exe"
)

# Function to build for a specific target
build_target() {
    local target=$1
    local output=$2
    
    echo -e "${BLUE}Building for ${target}...${NC}"
    
    # Add version information to the binary
    if bun build index.ts --compile --minify --bytecode --target "$target" --define process.env.VERSION="'${VERSION}'" --outfile "build/$output"; then
        echo -e "${GREEN}✓ Successfully built for ${target}${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to build for ${target}${NC}"
        return 1
    fi
}

# Track overall success
success=true

# Remove existing build directory
echo -e "${BLUE}Removing existing build directory...${NC}"
rm -rf build
mkdir -p build
echo -e "${GREEN}✓ Removed existing build directory${NC}"
echo "----------------------------------------"

# Build for all targets
echo -e "${BLUE}Starting builds for all platforms...${NC}"
echo -e "${BLUE}Building version: ${VERSION}${NC}"
echo "----------------------------------------"

for target in "${targets[@]}"; do
    IFS=':' read -r platform output <<< "$target"
    if ! build_target "$platform" "$output"; then
        success=false
    fi
    echo "----------------------------------------"
done

# Final status
if [ "$success" = true ]; then
    echo -e "${GREEN}All builds completed successfully!${NC}"
    echo -e "${BLUE}Builds available in the build/ directory:${NC}"
    ls -lh build/
else
    echo -e "${RED}Some builds failed. Check the output above for details.${NC}"
    exit 1
fi
