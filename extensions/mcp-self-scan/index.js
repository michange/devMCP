// extensions/mcp-self-scan/index.js — list MCP servers via `claude mcp list` CLI output
// Preflight approach: spawns `claude mcp list`, parses the text output into JSON.
// Compare with mcp-list which reads config files directly.

import { execFileSync } from 'node:child_process'

function parseMcpListOutput(text) {
  const servers = {}
  const lines = text.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // Format: "serverName: command_or_url [optional (HTTP) suffix]"
    // Examples:
    //   devMCP: node /Users/mic/.../mcp-server.js
    //   trampoline: http://127.0.0.1:19670/mcp (HTTP)
    //   playwright: npx @playwright/mcp@latest
    const match = line.match(/^(.+?):\s+(.+)$/)
    if (!match) continue

    const [, name, detail] = match
    let transport = detail.trim()

    // Determine type
    let type = 'stdio'
    if (transport.match(/^https?:\/\//)) {
      type = 'http'
      transport = transport.replace(/\s*\(HTTP\)\s*$/, '')  // strip suffix
    }

    servers[name.trim()] = { type, transport }
  }

  return servers
}

function mcpSelfScan() {
  const t0 = Date.now()
  let output
  try {
    output = execFileSync('claude', ['mcp', 'list'], {
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
  } catch (e) {
    output = (e.stdout || '') + '\n' + (e.stderr || '')
    if (!output.trim()) {
      return { isError: true, text: `claude mcp list failed: ${e.message}` }
    }
  }
  const elapsed = Date.now() - t0

  const servers = parseMcpListOutput(output)

  const result = {
    servers,
    _meta: {
      method: 'preflight',
      command: 'claude mcp list',
      elapsedMs: elapsed,
      rawLineCount: output.split('\n').length,
    },
  }

  return {
    isError: false,
    text: JSON.stringify(result, null, 2),
  }
}

export default [{
  name: 'mcp_self_scan',
  description: 'List MCP servers by running `claude mcp list` and parsing its text output into JSON. Preflight approach — uses the CLI own view. Slower than mcp_list (file-based). Does NOT see cloud connectors or built-ins — only local config servers.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: mcpSelfScan,
}]
