// extensions/mcp-twin-scan/index.js — belt + suspenders: both scans in parallel
// Runs mcp_list (file-based) + mcp_self_scan (CLI preflight) concurrently.
// Returns both JSONs + perf comparison. For naude boot: fast result from list,
// verified by self_scan. Parallel cost ≈ cost of scan alone.

import { readFileSync, openSync, readSync, closeSync, fstatSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { performance } from 'node:perf_hooks'

// ── file-based scan (inline — no cross-extension import) ────────────────────

function readJson(path) {
  try {
    const fd = openSync(path, 'r')
    const size = fstatSync(fd).size
    const buf = Buffer.allocUnsafe(size)
    readSync(fd, buf, 0, size, 0)
    closeSync(fd)
    return JSON.parse(buf.toString('utf-8'))
  } catch { return null }
}

function fileScan(projectRoot) {
  const t0 = performance.now()
  const home = homedir()
  const globalConfigPath = join(home, '.claude.json')
  const globalMcpPath    = join(home, '.claude', 'mcp.json')
  const projectMcpPath   = projectRoot ? join(projectRoot, '.claude', 'mcp.json') : null
  const servers = {}

  const globalConfig = readJson(globalConfigPath)
  if (globalConfig?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalConfig.mcpServers))
      servers[name] = { ...cfg, _source: 'global' }
  }
  const globalMcp = readJson(globalMcpPath)
  if (globalMcp?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalMcp.mcpServers))
      servers[name] = { ...cfg, _source: 'globalMcp' }
  }
  if (projectMcpPath) {
    const projectMcp = readJson(projectMcpPath)
    if (projectMcp?.mcpServers) {
      for (const [name, cfg] of Object.entries(projectMcp.mcpServers))
        servers[name] = { ...cfg, _source: 'project' }
    }
  }
  if (projectRoot && globalConfig?.projects?.[projectRoot]?.mcpServers) {
    for (const [name, cfg] of Object.entries(globalConfig.projects[projectRoot].mcpServers))
      servers[name] = { ...cfg, _source: 'projectLegacy' }
  }

  return { servers, elapsedMs: performance.now() - t0 }
}

// ── CLI preflight scan (async) ──────────────────────────────────────────────

function cliScan() {
  return new Promise((resolve) => {
    const t0 = performance.now()
    execFile('claude', ['mcp', 'list'], {
      encoding: 'utf-8', timeout: 30_000,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    }, (err, stdout, stderr) => {
      const output = (stdout || '') + (stderr || '')
      const servers = {}
      for (const line of output.split('\n')) {
        if (!line.trim()) continue
        const match = line.match(/^(.+?):\s+(.+)$/)
        if (!match) continue
        const [, name, detail] = match
        let transport = detail.trim()
        let type = 'stdio'
        if (transport.match(/^https?:\/\//)) {
          type = 'http'
          transport = transport.replace(/\s*\(HTTP\)\s*$/, '')
        }
        servers[name.trim()] = { type, transport }
      }
      resolve({ servers, elapsedMs: performance.now() - t0 })
    })
  })
}

// ── twin scan handler ───────────────────────────────────────────────────────

async function mcpTwinScan({ projectRoot }) {
  const t0 = performance.now()

  const [fileResult, cliResult] = await Promise.all([
    Promise.resolve(fileScan(projectRoot)),
    cliScan(),
  ])

  const totalElapsed = performance.now() - t0

  // diff
  const fileNames = Object.keys(fileResult.servers).sort()
  const cliNames  = Object.keys(cliResult.servers).sort()
  const onlyFile  = fileNames.filter(n => !cliNames.includes(n))
  const onlyCli   = cliNames.filter(n => !fileNames.includes(n))
  const common    = fileNames.filter(n => cliNames.includes(n))

  const result = {
    fileScan: {
      servers: fileResult.servers,
      elapsedMs: Math.round(fileResult.elapsedMs * 100) / 100,
    },
    cliScan: {
      servers: cliResult.servers,
      elapsedMs: Math.round(cliResult.elapsedMs * 100) / 100,
    },
    diff: {
      common,
      onlyInFileScan: onlyFile,
      onlyInCliScan: onlyCli,
      match: onlyFile.length === 0 && onlyCli.length === 0,
    },
    _meta: {
      method: 'twin-scan-parallel',
      totalElapsedMs: Math.round(totalElapsed * 100) / 100,
      fileScanMs: Math.round(fileResult.elapsedMs * 100) / 100,
      cliScanMs: Math.round(cliResult.elapsedMs * 100) / 100,
    },
  }

  return {
    isError: false,
    text: JSON.stringify(result, null, 2),
  }
}

export default [{
  name: 'mcp_twin_scan',
  description: 'Belt + suspenders: run file-based scan AND CLI preflight scan in parallel. Returns both server lists, perf for each, diff, and total elapsed. Parallel cost equals the slower method alone.',
  inputSchema: {
    type: 'object',
    properties: {
      projectRoot: {
        type: 'string',
        description: 'Absolute path to the project root.',
      },
    },
  },
  handler: mcpTwinScan,
}]
