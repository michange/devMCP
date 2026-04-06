// extensions/mcp-list/index.js — list all MCP servers from CLI config files as JSON
// Reads the 4 config sources the CLI merges at startup:
//   1. ~/.claude.json → mcpServers (global)
//   2. ~/.claude/mcp.json (global dedicated, if exists)
//   3. .claude/mcp.json in projectRoot (project-level, if exists)
//   4. ~/.claude.json → projects[projectRoot].mcpServers (per-project legacy)
// Returns a flat merged object of all servers with their source annotated.

import { readFileSync, openSync, readSync, closeSync, fstatSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { performance } from 'node:perf_hooks'

// noCache: true → read via raw fd + Buffer.allocUnsafe (bypasses Node stream cache,
// still hits OS page cache — only sudo purge can clear that)
function readJson(path, noCache) {
  try {
    if (noCache) {
      const fd = openSync(path, 'r')
      const size = fstatSync(fd).size
      const buf = Buffer.allocUnsafe(size)
      readSync(fd, buf, 0, size, 0)
      closeSync(fd)
      return JSON.parse(buf.toString('utf-8'))
    }
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function mcpList({ projectRoot, noCache }) {
  const t0 = performance.now()
  const home = homedir()
  const globalConfigPath     = join(home, '.claude.json')
  const globalMcpPath        = join(home, '.claude', 'mcp.json')
  const projectMcpPath       = projectRoot ? join(projectRoot, '.claude', 'mcp.json') : null

  const result = {
    servers: {},
    sources: {
      globalConfig:  globalConfigPath,
      globalMcp:     globalMcpPath,
      projectMcp:    projectMcpPath,
      projectLegacy: projectRoot ? `${globalConfigPath} → projects["${projectRoot}"]` : null,
    },
  }

  // Source 1 — ~/.claude.json top-level mcpServers
  const globalConfig = readJson(globalConfigPath, noCache)
  if (globalConfig?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalConfig.mcpServers)) {
      result.servers[name] = { ...cfg, _source: 'global' }
    }
  }

  // Source 2 — ~/.claude/mcp.json
  const globalMcp = readJson(globalMcpPath, noCache)
  if (globalMcp?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalMcp.mcpServers)) {
      result.servers[name] = { ...cfg, _source: 'globalMcp' }
    }
  }

  // Source 3 — .claude/mcp.json in project
  if (projectMcpPath) {
    const projectMcp = readJson(projectMcpPath, noCache)
    if (projectMcp?.mcpServers) {
      for (const [name, cfg] of Object.entries(projectMcp.mcpServers)) {
        result.servers[name] = { ...cfg, _source: 'project' }
      }
    }
  }

  // Source 4 — ~/.claude.json → projects[projectRoot].mcpServers (legacy)
  if (projectRoot && globalConfig?.projects?.[projectRoot]?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalConfig.projects[projectRoot].mcpServers)) {
      result.servers[name] = { ...cfg, _source: 'projectLegacy' }
    }
  }

  const elapsed = performance.now() - t0

  result._meta = {
    method: 'file-based',
    noCache: !!noCache,
    elapsedMs: Math.round(elapsed * 100) / 100,
    filesRead: [globalConfigPath, globalMcpPath, projectMcpPath].filter(Boolean).length + 1,
  }

  return {
    isError: false,
    text: JSON.stringify(result, null, 2),
  }
}

export default [{
  name: 'mcp_list',
  description: 'List all MCP servers from Claude CLI config files as structured JSON. Reads 4 config sources: global (~/.claude.json), global MCP (~/.claude/mcp.json), project (.claude/mcp.json), and per-project legacy. Returns merged server list with source annotation. Set noCache: true to force raw fd read.',
  inputSchema: {
    type: 'object',
    properties: {
      projectRoot: {
        type: 'string',
        description: 'Absolute path to the project root.',
      },
      noCache: {
        type: 'boolean',
        description: 'Force raw fd read bypassing Node stream layer. OS page cache still active — use sudo purge for true cold read.',
      },
    },
  },
  handler: mcpList,
}]
