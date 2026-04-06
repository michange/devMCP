// extensions/mcp-list/index.js — list all MCP servers from CLI config files as JSON
// Reads the 4 config sources the CLI merges at startup:
//   1. ~/.claude.json → mcpServers (global)
//   2. ~/.claude/mcp.json (global dedicated, if exists)
//   3. .claude/mcp.json in projectRoot (project-level, if exists)
//   4. ~/.claude.json → projects[projectRoot].mcpServers (per-project legacy)
// Returns a flat merged object of all servers with their source annotated.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { performance } from 'node:perf_hooks'

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function mcpList({ projectRoot }) {
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
  const globalConfig = readJson(globalConfigPath)
  if (globalConfig?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalConfig.mcpServers)) {
      result.servers[name] = { ...cfg, _source: 'global' }
    }
  }

  // Source 2 — ~/.claude/mcp.json
  const globalMcp = readJson(globalMcpPath)
  if (globalMcp?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalMcp.mcpServers)) {
      result.servers[name] = { ...cfg, _source: 'globalMcp' }
    }
  }

  // Source 3 — .claude/mcp.json in project
  if (projectMcpPath) {
    const projectMcp = readJson(projectMcpPath)
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
    elapsedMs: Math.round(elapsed * 100) / 100,  // 2 decimal places
    filesRead: [globalConfigPath, globalMcpPath, projectMcpPath].filter(Boolean).length + 1,
  }

  return {
    isError: false,
    text: JSON.stringify(result, null, 2),
  }
}

export default [{
  name: 'mcp_list',
  description: 'List all MCP servers from Claude CLI config files as structured JSON. Reads 4 config sources: global (~/.claude.json), global MCP (~/.claude/mcp.json), project (.claude/mcp.json), and per-project legacy. Returns merged server list with source annotation.',
  inputSchema: {
    type: 'object',
    properties: {
      projectRoot: {
        type: 'string',
        description: 'Absolute path to the project root. Used to find project-level configs and per-project legacy entries in ~/.claude.json.',
      },
    },
  },
  handler: mcpList,
}]
