#!/usr/bin/env node
// mcp-server.js — Dev tooling MCP server (stdio)
// Persistent across sessions. Configured in Claude Desktop with --scope user.
// Core tools: run_tests, register_mcp, restart_desktop, self_test, enable_mcp
// Extensions loaded dynamically from extensions/*/index.js at boot.

import readline from 'node:readline'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync } from 'node:fs'
import { dirname, join, resolve, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validatePath, validateName, validateCommand, validateArgs } from './validators.js'

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

// --- Core tool implementations ---

function runTests(rawPath) {
  const path = validatePath(rawPath)
  const root = findProjectRoot(path)
  if (!root) return { isError: true, text: `No project root found for ${path}` }
  try {
    const output = execFileSync('npx', ['vitest', 'run', path, '--reporter=verbose'], {
      cwd: root, encoding: 'utf-8', timeout: 120_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    return { isError: false, text: output }
  } catch (e) {
    return { isError: false, text: (e.stdout || '') + '\n' + (e.stderr || '') + `\nexit code: ${e.status}` }
  }
}

function registerMcp({ name: rawName, command: rawCmd, args: rawArgs, cwd: rawCwd, scope }) {
  const name = validateName(rawName)
  const command = validateCommand(rawCmd)
  const args = validateArgs(rawArgs)
  const serverDef = { command, args }
  if (rawCwd) serverDef.cwd = validatePath(rawCwd)
  let log = ''

  // Warn on relative path-like args — Claude Desktop ignores cwd, these will likely fail.
  const relativePaths = args.filter(
    a => !a.startsWith('-') && /\.(js|mjs|cjs|json)$/.test(a) && !isAbsolute(a)
  )
  if (relativePaths.length) {
    log += `⚠️  Warning: relative path args detected: ${relativePaths.join(', ')} — Claude Desktop ignores cwd, these will likely fail. Use absolute paths. Check extensions guide in README.md.\n`
  }

  const validScopes = ['user', 'local', 'project']
  const s = validScopes.includes(scope) ? scope : 'user'

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

  const cliConfig = { type: 'stdio', ...serverDef }
  try {
    try { execFileSync('claude', ['mcp', 'remove', name, '-s', s], { encoding: 'utf-8', timeout: 10_000 }) } catch {}
    execFileSync('claude', ['mcp', 'add-json', name, JSON.stringify(cliConfig), '--scope', s], { encoding: 'utf-8', timeout: 10_000 })
    log += `CLI config updated: ${name} (scope=${s})\n`
  } catch (e) {
    log += `CLI config failed: ${e.message}\n`
  }

  log += 'Restart Desktop to load.'
  return { isError: false, text: log }
}

function restartDesktop() {
  if (process.env.VITEST) {
    return { isError: false, text: '[TEST MODE] restart_desktop skipped — running inside vitest.' }
  }

  try {
    // Write restart script to a secure temp directory (not world-writable /tmp).
    // mkdtempSync creates a unique dir owned by the current user, preventing
    // race condition where another process replaces the script before execution.
    const tmpDir = mkdtempSync(join(tmpdir(), 'devmcp-restart-'))
    const script = join(tmpDir, 'restart.sh')
    writeFileSync(script, [
      '#!/bin/bash',
      'sleep 1',
      'osascript -e \'quit app "Claude"\' 2>/dev/null',
      'sleep 2',
      'killall -9 Claude 2>/dev/null',
      'killall -9 "Claude Helper" 2>/dev/null',
      'killall -9 "Claude Helper (Renderer)" 2>/dev/null',
      'killall -9 "Claude Helper (Plugin)" 2>/dev/null',
      'sleep 1',
      'open -a Claude',
      `rm -rf "${tmpDir}"`,
    ].join('\n') + '\n', { mode: 0o700 })
    const child = spawn('bash', ['-c', `nohup ${script} &>/dev/null &`], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    return { isError: false, text: 'Claude Desktop will restart in ~4s. Start a new conversation.' }
  } catch (e) {
    return { isError: true, text: `restart failed: ${e.message}` }
  }
}

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

// --- Core tool catalogue ---

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
        name: { type: 'string', description: 'Server name — alphanumeric, dash, underscore only' },
        command: { type: 'string', description: 'Command to run (e.g. "node")' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments. Script paths must be absolute (e.g. ["/abs/path/mcp-server.js"]) — Claude Desktop ignores cwd. See extensions guide in README.md.' },
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
        name: { type: 'string', description: 'Server name — alphanumeric, dash, underscore only' },
        command: { type: 'string', description: 'Command to run (e.g. "node")' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments. Script paths must be absolute (e.g. ["/abs/path/mcp-server.js"]) — Claude Desktop ignores cwd. See extensions guide in README.md.' },
        cwd: { type: 'string', description: 'Working directory (absolute path)' },
        scope: { type: 'string', enum: ['user', 'local', 'project'], description: 'Config scope (default: user)' },
      },
    },
  },
]

const HANDLERS = {
  run_tests: (a) => runTests(a.path),
  register_mcp: (a) => registerMcp(a),
  restart_desktop: () => restartDesktop(),
  enable_mcp: (a) => enableMcp(a),
  self_test: () => selfTest(),
}

// --- Extension loader ---
// Scans extensions/*/index.js at boot. Each extension exports a default array of
// { name, description, inputSchema, handler } objects that merge into TOOLS + HANDLERS.

const extensionsDir = join(__dirname, 'extensions')
if (existsSync(extensionsDir)) {
  for (const entry of readdirSync(extensionsDir)) {
    const entryPath = join(extensionsDir, entry)
    const extIndex = join(entryPath, 'index.js')
    if (statSync(entryPath).isDirectory() && existsSync(extIndex)) {
      try {
        const mod = await import(pathToFileURL(extIndex).href)
        const tools = mod.default || []
        for (const tool of tools) {
          if (tool.name && tool.handler && tool.inputSchema) {
            TOOLS.push({ name: tool.name, description: tool.description || '', inputSchema: tool.inputSchema })
            HANDLERS[tool.name] = tool.handler
          }
        }
      } catch (e) {
        process.stderr.write(`[devMCP] extension load failed: ${entry} — ${e.message}\n`)
      }
    }
  }
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
        serverInfo: { name: 'devMCP', version: '1.7.0' },
      })
      break
    case 'notifications/initialized': break
    case 'tools/list':
      respond(id, { tools: TOOLS })
      break
    case 'tools/call': {
      const handler = HANDLERS[params?.name]
      if (!handler) { respondError(id, -32601, `Unknown tool: ${params?.name}`); break }
      try {
        const result = handler(params?.arguments || {})
        respond(id, { content: [{ type: 'text', text: result.text }], isError: result.isError || false })
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: `Validation error: ${e.message}` }], isError: true })
      }
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
