#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the version number to be released
SP_VERSION=$(bun run release-it --release-version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

# Create build directory
mkdir -p build

# Define all target platforms
targets=(
    "bun-darwin-arm64:specifai-mcp-server-darwin-arm64-v${SP_VERSION}"
    "bun-darwin-x64:specifai-mcp-server-darwin-x64-v${SP_VERSION}"
    "bun-linux-arm64:specifai-mcp-server-linux-arm64-v${SP_VERSION}"
    "bun-linux-x64:specifai-mcp-server-linux-x64-v${SP_VERSION}"
    "bun-linux-x64-baseline:specifai-mcp-server-linux-x64-baseline-v${SP_VERSION}"
    "bun-linux-x64-modern:specifai-mcp-server-linux-x64-modern-v${SP_VERSION}"
    "bun-windows-x64:specifai-mcp-server-windows-x64-v${SP_VERSION}.exe"
    "bun-windows-x64-baseline:specifai-mcp-server-windows-x64-baseline-v${SP_VERSION}.exe"
    "bun-windows-x64-modern:specifai-mcp-server-windows-x64-modern-v${SP_VERSION}.exe"
)

# Function to build for a specific target
build_target() {
    local target=$1
    local output=$2
    
    echo -e "${BLUE}Building for ${target}...${NC}"
    
    # Add version information to the binary
    if bun build index.ts --compile --minify --bytecode --target "$target" --define process.env.SP_VERSION="'${SP_VERSION}'" --outfile "build/$output"; then
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
echo -e "${BLUE}Building version: ${SP_VERSION}${NC}"
echo "----------------------------------------"

for target in "${targets[@]}"; do
    IFS=':' read -r platform output <<< "$target"
    if ! build_target "$platform" "$output"; then
        success=false
    fi
    echo "----------------------------------------"
done

# Function to check binary version
check_binary_version() {
    local binary=$1
    echo -e "${BLUE}Checking version for compatible binary: ${binary}${NC}"
    echo -e "${BLUE}Version information:${NC}"
    echo "----------------------------------------"
    chmod +x "build/$binary"
    "./build/$binary" --help | grep "specifai-mcp-server - v"
    echo "----------------------------------------"
}

# Final status
if [ "$success" = true ]; then
    echo -e "${GREEN}All builds completed successfully!${NC}"
    echo -e "${BLUE}Builds available in the build/ directory:${NC}"
    ls -lh build/
    echo "----------------------------------------"
    
    # Check version for platform-specific binary
    case "$(uname -s)" in
        Darwin*)
            if [ "$(uname -m)" = "arm64" ]; then
                check_binary_version "specifai-mcp-server-darwin-arm64-v${SP_VERSION}"
            else
                check_binary_version "specifai-mcp-server-darwin-x64-v${SP_VERSION}"
            fi
            ;;
        Linux*)
            if [ "$(uname -m)" = "aarch64" ]; then
                check_binary_version "specifai-mcp-server-linux-arm64-v${SP_VERSION}"
            else
                check_binary_version "specifai-mcp-server-linux-x64-v${SP_VERSION}"
            fi
            ;;
        MINGW*|CYGWIN*|MSYS*)
            check_binary_version "specifai-mcp-server-windows-x64-v${SP_VERSION}.exe"
            ;;
        *)
            echo -e "${RED}Unsupported platform for version check${NC}"
            ;;
    esac
else
    echo -e "${RED}Some builds failed. Check the output above for details.${NC}"
    exit 1
fi
