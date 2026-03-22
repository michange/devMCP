#!/usr/bin/env node
// mcp-server.js — Dev tooling MCP server (stdio)
// Persistent across sessions. Configured in Claude Desktop with --scope user.
// Tools: run_tests, register_mcp, restart_desktop

import readline from 'node:readline'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Helpers ---

function findProjectRoot(startPath) {
  let dir = startPath
  while (dir !== '/') {
    if (existsSync(join(dir, 'vitest.config.js')) || existsSync(join(dir, 'vitest.config.ts'))) return dir
    if (existsSync(join(dir, 'package.json'))) return dir
    dir = dirname(dir)
  }
  return null
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: opts.timeout || 15_000, env: { ...process.env, FORCE_COLOR: '0' }, ...opts })
}

// --- Tool implementations ---

function runTests(path) {
  const root = findProjectRoot(path)
  if (!root) return { isError: true, text: `No project root found for ${path}` }
  try {
    return { isError: false, text: exec(`npx vitest run ${path} --reporter=verbose`, { cwd: root, timeout: 120_000 }) }
  } catch (e) {
    return { isError: false, text: (e.stdout || '') + '\n' + (e.stderr || '') + `\nexit code: ${e.status}` }
  }
}

function registerMcp({ name, command, args, cwd, scope }) {
  const serverDef = { command, args: args || [] }
  if (cwd) serverDef.cwd = cwd
  let log = ''

  // 1. Write to Claude Desktop config (the one Desktop actually reads)
  const desktopConfigPath = join(process.env.HOME || '', 'Library/Application Support/Claude/claude_desktop_config.json')
  try {
    const raw = existsSync(desktopConfigPath) ? readFileSync(desktopConfigPath, 'utf-8') : '{}'
    const config = JSON.parse(raw)
    if (!config.mcpServers) config.mcpServers = {}
    config.mcpServers[name] = serverDef
    writeFileSync(desktopConfigPath, JSON.stringify(config, null, 2))
    log += `Desktop config updated: ${name}\n`
  } catch (e) {
    log += `Desktop config write failed: ${e.message}\n`
  }

  // 2. Also register in CLI config via claude mcp add-json
  const cliConfig = { type: 'stdio', ...serverDef }
  const s = scope || 'user'
  try {
    try { exec(`claude mcp remove ${name} -s ${s}`) } catch {}
    exec(`claude mcp add-json ${name} '${JSON.stringify(cliConfig)}' --scope ${s}`)
    log += `CLI config updated: ${name} (scope=${s})\n`
  } catch (e) {
    log += `CLI config failed: ${e.message}\n`
  }

  log += 'Restart Desktop to load.'
  return { isError: false, text: log }
}

function restartDesktop() {
  try {
    try { exec('pkill -x "Claude"', { timeout: 5000 }) } catch {}
    exec('sleep 2', { timeout: 5000 })
    exec('open -a "Claude"', { timeout: 5000 })
    return { isError: false, text: 'Claude Desktop killed and relaunched. Start a new conversation.' }
  } catch (e) {
    return { isError: true, text: `restart failed: ${e.message}` }
  }
}

// --- Tool catalogue ---

const TOOLS = [
  {
    name: 'run_tests',
    description: 'Run vitest on a test file or directory. Returns stdout + stderr. Timeout 120s.',
    inputSchema: {
      type: 'object', required: ['path'],
      properties: { path: { type: 'string', description: 'Absolute path to .test.js file or directory' } },
    },
  },
  {
    name: 'register_mcp',
    description: 'Register a new stdio MCP server in Claude Desktop config. Does NOT restart — use enable_mcp if you want register + restart in one shot.',
    inputSchema: {
      type: 'object', required: ['name', 'command'],
      properties: {
        name: { type: 'string', description: 'Server name (e.g. "my-server")' },
        command: { type: 'string', description: 'Command to run (e.g. "node")' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments (e.g. ["mcp-server.js"])' },
        cwd: { type: 'string', description: 'Working directory (absolute path)' },
        scope: { type: 'string', enum: ['user', 'local', 'project'], description: 'Config scope (default: user)' },
      },
    },
  },
  {
    name: 'restart_desktop',
    description: 'Kill Claude Desktop and relaunch it. Requires a new conversation after restart.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'self_test',
    description: 'Run devMCP\'s own test suite (mcp-server.unit.test.js). Returns vitest output. Use to verify devMCP is working correctly.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'enable_mcp',
    description: 'Register a new stdio MCP server AND restart Claude Desktop in one shot. Combines register_mcp + restart_desktop. After this, start a new conversation to use the new tools.',
    inputSchema: {
      type: 'object', required: ['name', 'command'],
      properties: {
        name: { type: 'string', description: 'Server name' },
        command: { type: 'string', description: 'Command to run (e.g. "node")' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
        cwd: { type: 'string', description: 'Working directory (absolute path)' },
        scope: { type: 'string', enum: ['user', 'local', 'project'], description: 'Config scope (default: user)' },
      },
    },
  },
]

function enableMcp(a) {
  const reg = registerMcp(a)
  if (reg.isError) return reg
  const rst = restartDesktop()
  return { isError: rst.isError, text: reg.text + '\n' + rst.text }
}

function selfTest() {
  const testFile = join(__dirname, 'mcp-server.unit.test.js')
  if (!existsSync(testFile)) return { isError: true, text: `Test file not found: ${testFile}` }
  return runTests(testFile)
}

const HANDLERS = {
  run_tests: (a) => runTests(a.path),
  register_mcp: (a) => registerMcp(a),
  restart_desktop: () => restartDesktop(),
  enable_mcp: (a) => enableMcp(a),
  self_test: () => selfTest(),
}

// --- JSON-RPC stdio ---

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n')
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n')
}

function handleRequest({ id, method, params }) {
  switch (method) {
    case 'initialize':
      respond(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'devMCP', version: '1.1.0' },
      })
      break
    case 'notifications/initialized': break
    case 'tools/list':
      respond(id, { tools: TOOLS })
      break
    case 'tools/call': {
      const handler = HANDLERS[params?.name]
      if (!handler) { respondError(id, -32601, `Unknown tool: ${params?.name}`); break }
      const result = handler(params?.arguments || {})
      respond(id, { content: [{ type: 'text', text: result.text }], isError: result.isError || false })
      break
    }
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`)
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })
rl.on('line', (line) => {
  if (!line.trim()) return
  try { handleRequest(JSON.parse(line)) }
  catch { respondError(null, -32700, 'Parse error') }
})
rl.on('close', () => process.exit(0))
