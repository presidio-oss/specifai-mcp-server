# Specifai MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@presidio-dev/specifai-mcp-server.svg)](https://www.npmjs.com/package/@presidio-dev/specifai-mcp-server)
[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/VS_Code-VS_Code?style=plastic&label=Install&color=0098FF">](https://insiders.vscode.dev/redirect?url=vscode:mcp/install?{"name":"specifai","command":"npx","args":["-y","@presidio-dev/specifai-mcp-server@latest"]})
[<img alt="Install in VS Code Insiders (npx)" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=plastic&label=Install&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders:mcp/install?{"name":"specifai","command":"npx","args":["-y","@presidio-dev/specifai-mcp-server@latest"]})
[<img alt="Install in Cursor (npx)" src="https://img.shields.io/badge/Cursor-Cursor?style=plastic&label=Install&color=1A1A1A">](https://cursor.com/install-mcp?name=specifai&config=eyJjb21tYW5kIjoibnB4IC15IEBwcmVzaWRpby1kZXYvc3BlY2lmYWktbWNwLXNlcnZlckBsYXRlc3QifQ==)

<p>
  <img style="margin-right:18px;" src="data:image/png;base64,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" alt="Hai Build" />
  <img style="margin-right:18px;" src="data:image/png;base64,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" alt="Amazon Q" />
  <img style="margin-right:18px;" src="data:image/png;base64,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" alt="VS Code" />
  <img style="margin-right:18px;" src="data:image/png;base64,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" alt="Windsurf" />
  <img style="margin-right:18px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAqCAYAAADFw8lbAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAUZSURBVHgBvVi5S2RJGP+91+3dXuCRCDJrIOJgJjvsBF4wi2BgIuK1sOP/MJsIxmq+g4mMA6JmO7sTiFdmsA2aaTLTgTAbi2drX7X1Vfd7/Y6q6mqndz+oftV1fN/vfVd99SwADMZklbfckI/4V4K1jbKIaQQXH6EZS8+HhYdCXOzCMzRhTJZHikRYEYSlY1Ci79hAq/ZKmft72Dka1b4xk+2D7u1VQ88nVml1BUnCvlyJhUgrM5gs5T+5ApnRkJZLwclt7aIQD+ZbyoJ91TZtsFpBVNKl5oZQrQyN/zfeZBv7vOplQ4FYYZAF1jZTTMgoEokYJHDLKOBt2/bskJHfp4ztRCBramqQSCTQ2NgIxtTbmCum2PNSNFqFly/7BS8zshAtPLVwaTqbzeL8/BwXFxdYWVlBLNaI0qnHP5DJZPD6p9d499s7/PDiRRlAmWBF2ZQVOBaalX8Gxu/u7tj4+LjoW5YV2BPYG+qDjY6OMqLZ2VnGTS/db0l5gkXlBYH87CZz19bWuv2ZmRk0xBrAcqW9p6qqCr+/f4+5uTns7OwqXceNzcB0FAYk84zp6Wlsbm4K80WjajaPj4/o6upCS0sL5ufnOcgdDjIHlYsLWZIAMgBK9g9zpYAikH19fdrdg4ODiP8dFyC3t7eFJgkIdx1Xq0VAflleqQZHqMJEXIijyerqavGk/04jINwnEY/HMbcw5wHJRAaJxWIoKiIgS5KvjKJetdmhVCqFdDrtAvcmpbxP7iCXy4nc6QAli9ze3oaEyO3nK/NKkGYNBQqB7O3tRXt7O35+80aMLywsuCCbmppQX18vxmltjAP11Q9eMZLgNq+eNKUSAfn17Vt8++cbBgYGsL+/LzS5tbXl+mFbWxvq6urcF2sioKpsIyHFVUSC0JuxCj/MBZrF5ocPePXjKxwdHYHnSezu7qKzs1P4qgO0oaHBBdrc3KyTFhqwJdqHrshwZiKRKKq5QMHEjmBsbAxHh0eYmJjAn58+CT9cWlpyz/SOjg6/RrkryEilZJuZLQ/NnJ6eYmNjQ/SHhoZwcHAg3uLz579ww4Mk8TWBnp4ecWwSkUYdH6WXUAGVk2WW8P1b8nR2diYapSAy9y88cP7gmvTmR0r2BIrqhNbWVvdUI41S1JsTT4XyzKTOV47PkUlHR0awzzXJz3/s7e1p91LedIBS1MuBquVGtab37uN9AnN5eSlADg8PC5D39/dYXl7G2tqayKdPTymuySR4AYOHhwckk0mxhjR6cnIiWJGWRWAVLm5FIerbpt70nh22ZWNqakpodIRr8vDwEKurqxzYk/BD0bIZpJ7yyT+dSYs+jVP6urm5wfHxcV4o16iTAaR5FGE9OXOaUq3YuCbcUo1XTiXXB5tTGvb397P19fUS6/08oyVV6Xk9SuYUOB83P+Lq6gqTk5MiUKhRAJHmnOZo0tuyNM61TYWKvOLyu4FqpuRwd3c3vn75giSPZgdYlif7XDYnwNKTzE8ghfk9jfyXGq27vr7G4uKi8GPiYXLBLetuS0FEjMshlQDBi9eluquLwYzxJd4/bnD3MsQVIs+93vNJQrlb8U4Sf5L11bqSDwX5VORTWQVYaPhYJfiHEvL/SX65+o9k8ipWzxteThaeT57TET6gwTNB/k/7DVdbCFs+BuV+86ISgz3PumabvttxCgzsZ1rXeBPzbwpx8Q+p9WxwFZEIhkKOapwF1zBzxk6Fr10UYK9bY6JfuXZDKzxci/Qv6CuRqYeYMCYAAAAASUVORK5CYII=" alt="Zed" />
  <img style="margin-right:18px;" src="data:image/png;base64,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" alt="Cursor" />
</p>

A Model Context Protocol (MCP) server for [Specifai](https://github.com/presidio-oss/specifai) project integration and automation with any MCP-compatible AI tool. This server is designed to be tool-agnostic, meaning it can be used with any tool that supports the MCP protocol. This server currently exposes tools to read all documents generated by the Specifai project.

> [!WARNING]
> This server is currently experimental. The functionality and available tools are subject to change and expansion as we continue to develop and improve the server.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Preparing Your Project](#preparing-your-project)
- [IDE Integration](#specifai-mcp-integration-with-popular-ide-and-extension)
- [Available Tools](#available-tools)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Requirements

- Node.js >= 16.0.0
- Bun >= 1.0.0 (if using Bun runtime)
- Hai Build, Cursor, Windsurf, Claude Desktop or any MCP Client

## Installation

```bash
# Latest version
npx --yes @presidio-dev/specifai-mcp-server@latest

# Specific version
npx --yes @presidio-dev/specifai-mcp-server@1.2.3
```

We recommend `npx` to install the server, but you can use any node package manager of your preference such as `yarn`, `pnpm`, `bun`, etc.

## Configuration

with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) with latest version:

```json
{
  "specifai": {
    "command": "npx",
    "args": ["--yes", "@presidio-dev/specifai-mcp-server@latest"],
    "disabled": false,
    "autoApprove": []
  }
}
```

with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) with specific version:

```json
{
  "specifai": {
    "command": "npx",
    "args": ["--yes", "@presidio-dev/specifai-mcp-server@1.2.3"],
    "disabled": false,
    "autoApprove": []
  }
}
```

### Preparing your project

> This is completely optional, but it's recommended to use it to avoid having to specify the project directory path every time you access the server. For AI IDE / Extension (Hai Build), it's recommended to use a `.specifai-path` file to specify the project directory path.

Make sure your project root directory contains a `.specifai-path` file. It's how the Specifai MCP server knows where to find the specification documents generated by Specifai.

The file is a plain text file containing the absolute path to the project directory where the specification documents for a project are stored.

For example, if your project directory is located at `/path/to/project`, the `.specifai-path` file should contain the following line:

```
/path/to/project
```

## Specifai MCP integration with popular IDE and extension

See the setup instructions for each

<details>

<summary><b>Install in Hai Build</b></summary>

Add the following to your `hai_mcp_settings.json` file. To open this file from Hai Build, click the "MCP Servers" icon, select the "Installed" tab, and then click "Configure MCP Servers".

See the [Hai Build MCP documentation](https://github.com/presidio-oss/cline-based-code-generator/blob/main/docs/mcp/configuring-mcp-servers.mdx) for more info.

```json
{
  "mcpServers": {
    "specifai": {
      "command": "npx",
      "args": ["-y", "@presidio-dev/specifai-mcp-server@latest"]
    }
  }
}
```

</details>

<details>

<summary><b>Install in Amazon Q Developer</b></summary>

Add the following to your Amazon Q Developer configuration file. See [MCP configuration for Q Developer in the IDE](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/mcp-ide.html#mcp-ide-configuration-add-server) for more details.

The configuration file can be stored globally at `~/.aws/amazonq/mcp.json` to be available across all your projects, or locally within your project at `.amazonq/mcp.json`.

```json
{
  "mcpServers": {
    "specifai": {
      "command": "npx",
      "args": ["-y", "@presidio-dev/specifai-mcp-server@latest"]
    }
  }
}
```

</details>

<details>

<summary><b>Install in VS Code (Copilot)</b></summary>

[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/VS_Code-VS_Code?style=plastic&label=Install&color=0098FF">](https://insiders.vscode.dev/redirect?url=vscode:mcp/install?{"name":"specifai","command":"npx","args":["-y","@presidio-dev/specifai-mcp-server@latest"]})
[<img alt="Install in VS Code Insiders (npx)" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=plastic&label=Install&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders:mcp/install?{"name":"specifai","command":"npx","args":["-y","@presidio-dev/specifai-mcp-server@latest"]})

First, enable MCP support in VS Code by opening Settings (`Ctrl+,`), searching for `mcp.enabled`, and checking the box.

Then, add the following configuration to your user or workspace `settings.json` file. See the [VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for more info.

```json
"mcp": {
  "servers": {
    "specifai": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@presidio-dev/specifai-mcp-server@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Cursor</b></summary>

The easiest way to install is with the one-click installation button below.

[<img alt="Install in Cursor (npx)" src="https://img.shields.io/badge/Cursor-Cursor?style=plastic&label=Install&color=1A1A1A">](https://cursor.com/install-mcp?name=specifai&config=eyJjb21tYW5kIjoibnB4IC15IEBwcmVzaWRpby1kZXYvc3BlY2lmYWktbWNwLXNlcnZlckBsYXRlc3QifQ==)

Alternatively, you can manually configure the server by adding the following to your `mcp.json` file. This file can be located globally at `~/.cursor/mcp.json` or within a specific project at `.cursor/mcp.json`. See the [Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol) for more information.

```json
{
  "mcpServers": {
    "specifai": {
      "command": "npx",
      "args": ["--yes", "@presidio-dev/specifai-mcp-server@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Add the following to your `~/.codeium/windsurf/mcp_config.json` file. See the [Windsurf MCP documentation](https://docs.windsurf.com/windsurf/cascade/mcp) for more information.

```json
{
  "mcpServers": {
    "specifai": {
      "command": "npx",
      "args": ["-y", "@presidio-dev/specifai-mcp-server@latest"]
    }
  }
}
```

</details>

<details>
<summary><b>Install in Zed</b></summary>

You can add the Specifai MCP server in Zed by editing your `settings.json` file (accessible via the `zed: settings` action) or by using the Agent Panel's configuration UI (`agent: open configuration`). See the [Zed MCP documentation](https://zed.dev/docs/ai/mcp#add-your-own-mcp-server) for more information.

Add the following to your `settings.json`:

```json
{
  "context_servers": {
    "specifai": {
      "command": {
        "path": "npx",
        "args": ["-y", "@presidio-dev/specifai-mcp-server@latest"]
      }
    }
  }
}
```

</details>

### Available Tools

The server provides several tools for interacting with your specification documents:

| Tool Name          | Description                              |
| ------------------ | ---------------------------------------- |
| `get-brds`         | Get Business Requirement Documents       |
| `get-prds`         | Get Product Requirement Documents        |
| `get-nfrs`         | Get Non-Functional Requirements          |
| `get-uirs`         | Get User Interface Requirements          |
| `get-bpds`         | Get Business Process Documents           |
| `get-user-stories` | Get User Stories for a specific PRD      |
| `get-tasks`        | Get Tasks for a specific User Story      |
| `get-task`         | Get details of a specific Task           |
| `set-project-path` | Set or change the project directory path |
| `get-task-by-id`   | Get details of a specific Task by ID     |
| `list-all-tasks`   | List all available tasks                 |
| `search`           | Full text search across all documents    |

## Contributing

We welcome contributions to the Specifai MCP Server! Please see our [Contributing Guide](CONTRIBUTING.md) for more information on how to get started.

### Development Setup

For detailed instructions on setting up your development environment, please refer to our [Development Setup Guide](docs/dev/02-development-setup.md).

### Architecture

To understand the project architecture, please see our [Architecture Guide](docs/dev/03-architecture-guide.md).

## Security

For information about our security policy and how to report security vulnerabilities, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification this server implements
- [Specifai](https://github.com/presidio-oss/specifai) - The project this server integrates with
