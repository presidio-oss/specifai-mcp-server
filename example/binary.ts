import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'specifai-mcp-server',
  args: ['path/to/project/spec/files'],
})

const client = new Client({
  name: 'example-binary-client',
  version: '0.0.1',
})

await client.connect(transport)

const result = await client.callTool({
  name: 'get-brds',
  arguments: {},
})

for (const content of result.content as Array<any>) {
  if (content.type === 'text') {
    console.log(content.text)
  }
}

await client.close()

/*
    Expected output:
    
    ID: 1
    Title: BRD 1
    Description: This is the first BRD
    --------------
    ID: 2
    Title: BRD 2
    Description: This is the second BRD
    --------------
    ...
    ...
    ...
*/
