#!/usr/bin/env node
// mcp-server.js — Dev tooling MCP server (stdio)
// Persistent across sessions. Configured in Claude Desktop with --scope user.
// Core tools: run_tests, run_tests_one_by_one, register_mcp, restart_desktop, self_test, enable_mcp
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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTestNames(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const names = []
  const regex = /\bit\(\s*['"`]([^'"`]+)['"`]/g
  let m
  while ((m = regex.exec(content))) names.push(m[1])
  return names
}

/**
 * Run a command in its own process group. On timeout, kill(-pid) kills the
 * entire group — npx, vitest, AND child processes like Chrome/Playwright.
 * This prevents orphan Chrome processes after timeout.
 */
function runInProcessGroup(cmd, args, { cwd, env, timeout = 120_000 }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd, env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = '', stderr = ''
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try { process.kill(-child.pid, 'SIGTERM') } catch {}
    }, timeout)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, status: code, timedOut })
    })
  })
}

// --- Core tool implementations ---

const KILL_ALLOWLIST = ['vitest', 'chromium', 'playwright']

async function killStuck(pattern) {
  if (!KILL_ALLOWLIST.includes(pattern)) {
    return { isError: true, text: `pattern "${pattern}" not allowed. Allowed: ${KILL_ALLOWLIST.join(', ')}` }
  }
  const { status } = await runInProcessGroup('pkill', ['-f', pattern], { timeout: 5_000 })
  if (status === 0) return { text: `killed processes matching "${pattern}"` }
  if (status === 1) return { text: `no processes matched "${pattern}" (nothing to kill)` }
  return { isError: true, text: `pkill failed for "${pattern}" (exit ${status})` }
}

async function runTests(rawPath, pattern, env) {
  const path = validatePath(rawPath)
  const root = findProjectRoot(path)
  if (!root) return { isError: true, text: `No project root found for ${path}` }

  const args = ['vitest', 'run', path, '--reporter=verbose']
  if (pattern) args.push('-t', pattern)

  const { stdout, stderr, status, timedOut } = await runInProcessGroup('npx', args, {
    cwd: root, timeout: 120_000,
    env: { ...process.env, FORCE_COLOR: '0', ...env },
  })

  const output = (stdout + '\n' + stderr).trim()
  if (timedOut) return { isError: true, text: output + '\n\nTIMEOUT — process group killed' }
  return { isError: false, text: output + (status ? `\nexit code: ${status}` : '') }
}

async function runTestsOneByOne(rawPath, rank = 0, env) {
  const path = validatePath(rawPath)
  const root = findProjectRoot(path)
  if (!root) return { isError: true, text: `No project root found for ${path}` }

  const testNames = extractTestNames(path)
  if (!testNames.length) return { isError: true, text: 'No it() test cases found in file' }

  const idx = typeof rank === 'number' ? rank : 0
  if (idx < 0 || idx >= testNames.length) {
    return { isError: true, text: `rank ${idx} out of range — file has ${testNames.length} tests (0..${testNames.length - 1})` }
  }

  const name = testNames[idx]
  const escaped = escapeRegex(name)
  const args = ['vitest', 'run', path, '--reporter=verbose', '--bail', '1', '-t', escaped]

  const { stdout, stderr, status, timedOut } = await runInProcessGroup('npx', args, {
    cwd: root, timeout: 120_000,
    env: { ...process.env, FORCE_COLOR: '0', ...env },
  })

  if (timedOut) {
    return { isError: true, text: `[${idx + 1}/${testNames.length}] ${name}::TIMEOUT\n\nProcess group killed` }
  }
  if (status === 0) {
    return { isError: false, text: `[${idx + 1}/${testNames.length}] ${name}::PASS` }
  }
  const output = (stdout + '\n' + stderr).trim()
  return { isError: false, text: `[${idx + 1}/${testNames.length}] ${name}::FAIL\n\n${output}\nexit code: ${status}` }
}

function registerMcp({ name: rawName, command: rawCmd, args: rawArgs, cwd: rawCwd, scope }) {
  const name = validateName(rawName)
  const command = validateCommand(rawCmd)
  const args = validateArgs(rawArgs)
  const serverDef = { command, args }
  if (rawCwd) serverDef.cwd = validatePath(rawCwd)
  let log = ''

  const relativePaths = args.filter(
    a => !a.startsWith('-') && /\.(js|mjs|cjs|json)$/.test(a) && !isAbsolute(a)
  )
  if (relativePaths.length) {
    log += `Warning: relative path args detected: ${relativePaths.join(', ')} — Claude Desktop ignores cwd, these will likely fail. Use absolute paths.\n`
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

function buildRestartScript(tmpDir) {
  const script = join(tmpDir, 'restart.sh')
  const log = join(tmpDir, 'restart.log')
  const body = [
    '#!/bin/bash',
    // Race-fix: wait long enough for the MCP response to flush back through
    // Claude Desktop BEFORE we quit it. Quitting too early (old sleep 1) killed
    // the app mid-response → caller timed out instead of getting our reply.
    `exec >> "${log}" 2>&1`,
    'sleep 3',
    'echo "[restart] quitting Claude"',
    'osascript -e \'quit app "Claude"\'',
    'sleep 2',
    'killall -9 Claude 2>/dev/null',
    'killall -9 "Claude Helper" 2>/dev/null',
    'killall -9 "Claude Helper (Renderer)" 2>/dev/null',
    'killall -9 "Claude Helper (Plugin)" 2>/dev/null',
    'sleep 1',
    'echo "[restart] relaunching Claude"',
    'open -a Claude',
    `rm -rf "${tmpDir}"`,
  ].join('\n') + '\n'
  return { script, body }
}

function restartDesktop(opts = {}) {
  // dryRun returns the generated script WITHOUT executing — this is the only
  // way to exercise/verify the real path under test (VITEST stub below masks it).
  if (opts.dryRun) {
    const tmpDir = mkdtempSync(join(tmpdir(), 'devmcp-restart-'))
    const { body } = buildRestartScript(tmpDir)
    return { isError: false, text: body }
  }

  if (process.env.VITEST) {
    return { isError: false, text: '[TEST MODE] restart_desktop skipped — running inside vitest.' }
  }

  try {
    const tmpDir = mkdtempSync(join(tmpdir(), 'devmcp-restart-'))
    const { script, body } = buildRestartScript(tmpDir)
    writeFileSync(script, body, { mode: 0o700 })
    const child = spawn('bash', ['-c', `nohup ${script} &>/dev/null &`], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    return { isError: false, text: 'Claude Desktop will restart in ~6s. Start a new conversation. (log in restart.log)' }
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

async function selfTest() {
  const testFile = join(__dirname, 'mcp-server.unit.test.js')
  if (!existsSync(testFile)) return { isError: true, text: `Test file not found: ${testFile}` }
  return runTests(testFile)
}

// --- Core tool catalogue ---

const TOOLS = [
  {
    name: 'run_tests',
    description: 'Run vitest on a test file or directory. Returns stdout + stderr. Timeout 120s. Kills entire process group on timeout (no orphan Chrome).',
    inputSchema: {
      type: 'object', required: ['path'],
      properties: {
        path:    { type: 'string', description: 'Absolute path to .test.js file or directory' },
        pattern: { type: 'string', description: 'Optional test name pattern — passed as -t to vitest. Matches test names by substring or regex.' },
        env:     { type: 'object', description: 'Optional env vars merged into the test process (e.g. {"LIVE_API":"1"}). Caller keys override defaults; FORCE_COLOR=0 still applied.' },
      },
    },
  },
  {
    name: 'run_tests_one_by_one',
    description: 'Run a single test from a file by rank (0-indexed). Extracts it() names, runs the Nth one in isolation. Returns [rank/total] name::PASS or name::FAIL with output. Claude calls this in a loop, reporting after each, stopping at first FAIL. Kills entire process group on timeout (no orphan Chrome).',
    inputSchema: {
      type: 'object', required: ['path'],
      properties: {
        path: { type: 'string', description: 'Absolute path to .test.js file' },
        rank: { type: 'integer', description: 'Which test to run (0-indexed, default 0 = first test)', default: 0 },
        env:  { type: 'object', description: 'Optional env vars merged into the test process (e.g. {"LIVE_API":"1"}). Caller keys override defaults; FORCE_COLOR=0 still applied.' },
      },
    },
  },
  {
    name: 'kill_stuck',
    description: 'Kill orphaned test/browser processes by name when run_tests hangs (no result after a long wait). Allowed patterns only: vitest, chromium, playwright. Safe: pkill exit 1 (no match) is treated as success.',
    inputSchema: {
      type: 'object', required: ['pattern'],
      properties: {
        pattern: { type: 'string', enum: ['vitest', 'chromium', 'playwright'], description: 'Process name to pkill -f. One of the known orphan culprits.' },
      },
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
  run_tests: (a) => runTests(a.path, a.pattern, a.env),
  run_tests_one_by_one: (a) => runTestsOneByOne(a.path, a.rank, a.env),
  kill_stuck: (a) => killStuck(a.pattern),
  register_mcp: (a) => registerMcp(a),
  restart_desktop: (a) => restartDesktop(a),
  enable_mcp: (a) => enableMcp(a),
  self_test: () => selfTest(),
}

// --- Extension loader ---
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
            try { validateName(tool.name) } catch (e) {
              process.stderr.write(`[devMCP] extension "${entry}" bad tool name "${tool.name}": ${e.message}\n`)
              continue
            }
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

async function handleRequest({ id, method, params }) {
  switch (method) {
    case 'initialize':
      respond(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'devMCP', version: '1.9.0' },
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
        const result = await handler(params?.arguments || {})
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
