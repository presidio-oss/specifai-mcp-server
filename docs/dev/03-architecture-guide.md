# Architecture Guide

## System Overview

The Specif-ai MCP Server implements the Model Context Protocol (MCP) over stdio, providing a standardized interface for managing requirement documents. The system follows a service-oriented architecture with clear separation of concerns.

```mermaid
graph TD
    A[MCP Client] -->|stdio| B[Server Service]
    B --> C[Document Service]
    C --> D[File Service]
    B --> E[Logger]
    C --> F[Solution Data]
```

## Core Components

### 1. Server Service (`server.service.ts`)

- Main entry point for MCP protocol implementation
- Handles tool registration and execution
- Manages request/response flow
- Implements stdio transport layer
- Key responsibilities:
  - Tool registration
  - Request validation
  - Response formatting
  - Error handling
  - Session management

### 2. Document Service (`document.service.ts`)

- Manages document operations
- Handles document loading and parsing
- Provides document search and retrieval
- Key responsibilities:
  - Solution loading
  - Document type management
  - Document search
  - Data validation

### 3. File Service (`file.service.ts`)

- Handles file system operations
- Manages file reading and writing
- Implements file system abstractions
- Key responsibilities:
  - File reading
  - Directory scanning
  - Path resolution
  - Error handling

## Data Flow

1. **Request Processing**

```mermaid
sequenceDiagram
    Client->>Server: Tool Request
    Server->>Validator: Validate Input
    Validator-->>Server: Validation Result
    Server->>DocumentService: Process Request
    DocumentService->>FileService: Read Data
    FileService-->>DocumentService: File Data
    DocumentService-->>Server: Document Data
    Server-->>Client: Formatted Response
```

2. **Error Handling**

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant E as Error Handler
    participant L as Logger

    C->>S: Invalid Request
    S->>E: Validate
    E->>L: Log Error
    E-->>S: Error Details
    S-->>C: Error Response
```
