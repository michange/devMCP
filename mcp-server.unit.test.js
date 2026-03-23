// mcp-server.unit.test.js — Tests for devMCP via JSON-RPC over stdio.
// Each test spawns the real mcp-server.js process. No mocks.
// register_mcp uses a sandboxed HOME to avoid touching real configs.
// Extensions may add tools — core tests verify the 5 core tools are present,
// not that they are the only tools.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER = join(__dirname, 'mcp-server.js')

const CORE_TOOLS = ['enable_mcp', 'register_mcp', 'restart_desktop', 'run_tests', 'self_test']

// --- Helpers: spawn server, send JSON-RPC, get response ---

function spawnServer(envOverrides = {}) {
  const proc = spawn('node', [SERVER], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...envOverrides },
  })
  let buffer = ''
  const responses = []
  const ready = new Promise((resolve) => {
    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (line.trim()) {
          responses.push(JSON.parse(line))
          resolve()
        }
      }
    })
  })

  return {
    proc,
    responses,
    send(msg) {
      proc.stdin.write(JSON.stringify(msg) + '\n')
    },
    async sendAndWait(msg) {
      const idx = responses.length
      this.send(msg)
      // Wait for response with matching id
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          const found = responses.find(r => r.id === msg.id)
          if (found) { clearInterval(check); resolve(found) }
        }, 50)
        setTimeout(() => { clearInterval(check); reject(new Error(`Timeout waiting for id=${msg.id}`)) }, 10_000)
      })
    },
    kill() {
      proc.stdin.end()
      proc.kill()
    },
  }
}

function rpc(method, params = {}, id = 1) {
  return { jsonrpc: '2.0', id, method, params }
}

// --- Tests ---

describe('MCP protocol', () => {
  let server

  afterEach(() => { server?.kill() })

  it('initialize returns protocol version and server info', async () => {
    server = spawnServer()
    const res = await server.sendAndWait(rpc('initialize', {}, 1))
    expect(res.result.protocolVersion).toBe('2024-11-05')
    expect(res.result.serverInfo.name).toBe('devMCP')
    expect(res.result.capabilities.tools).toEqual({})
  })

  it('tools/list includes all 5 core tools', async () => {
    server = spawnServer()
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/list', {}, 2))
    const names = res.result.tools.map(t => t.name).sort()
    for (const core of CORE_TOOLS) {
      expect(names).toContain(core)
    }
    expect(names.length).toBeGreaterThanOrEqual(CORE_TOOLS.length)
  })

  it('unknown tool returns error', async () => {
    server = spawnServer()
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', { name: 'nonexistent', arguments: {} }, 2))
    expect(res.error.code).toBe(-32601)
  })

  it('unknown method returns error', async () => {
    server = spawnServer()
    const res = await server.sendAndWait(rpc('bogus/method', {}, 1))
    expect(res.error.code).toBe(-32601)
  })
})

describe('run_tests', () => {
  let server
  let tmpDir

  beforeEach(() => {
    // Create test file inside devMCP dir (which has vitest installed)
    tmpDir = join(__dirname, '.tmp-test-' + Date.now())
    mkdirSync(tmpDir)
    writeFileSync(join(tmpDir, 'pass.unit.test.js'), `
      import { it, expect } from 'vitest'
      it('passes', () => { expect(1 + 1).toBe(2) })
    `)
  })

  afterEach(() => {
    server?.kill()
    if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs a passing test and returns output', async () => {
    server = spawnServer()
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', {
      name: 'run_tests',
      arguments: { path: join(tmpDir, 'pass.unit.test.js') },
    }, 2))
    expect(res.result.isError).toBe(false)
    expect(res.result.content[0].text).toContain('pass')
  })

  it('returns error for nonexistent path', async () => {
    server = spawnServer()
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', {
      name: 'run_tests',
      arguments: { path: '/nonexistent/path/test.js' },
    }, 2))
    expect(res.result.isError).toBe(true)
    expect(res.result.content[0].text).toContain('No project root')
  })
})

describe('register_mcp', () => {
  let server
  let fakeHome

  beforeEach(() => {
    // Sandbox: fake HOME with a Claude Desktop config dir
    fakeHome = mkdtempSync(join(tmpdir(), 'devmcp-home-'))
    const claudeDir = join(fakeHome, 'Library/Application Support/Claude')
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, 'claude_desktop_config.json'), JSON.stringify({
      mcpServers: { existing: { command: 'node', args: ['existing.js'] } }
    }))
  })

  afterEach(() => {
    server?.kill()
    if (fakeHome) rmSync(fakeHome, { recursive: true, force: true })
  })

  it('writes to Desktop config in sandboxed HOME', async () => {
    server = spawnServer({ HOME: fakeHome })
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', {
      name: 'register_mcp',
      arguments: { name: 'test-srv', command: 'node', args: ['/abs/path/test.js'] },
    }, 2))
    expect(res.result.content[0].text).toContain('Desktop config updated')

    // Verify the file was written
    const configPath = join(fakeHome, 'Library/Application Support/Claude/claude_desktop_config.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(config.mcpServers['test-srv']).toEqual({ command: 'node', args: ['/abs/path/test.js'] })
    // existing server preserved
    expect(config.mcpServers['existing']).toEqual({ command: 'node', args: ['existing.js'] })
  })

  it('adds cwd when provided', async () => {
    server = spawnServer({ HOME: fakeHome })
    server.send(rpc('initialize', {}, 1))
    await server.sendAndWait(rpc('tools/call', {
      name: 'register_mcp',
      arguments: { name: 'with-cwd', command: 'node', args: ['/abs/srv.js'], cwd: '/tmp/mydir' },
    }, 2))

    const configPath = join(fakeHome, 'Library/Application Support/Claude/claude_desktop_config.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(config.mcpServers['with-cwd'].cwd).toBe('/tmp/mydir')
  })

  it('warns on relative path-like args', async () => {
    server = spawnServer({ HOME: fakeHome })
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', {
      name: 'register_mcp',
      arguments: { name: 'rel-srv', command: 'node', args: ['mcp-server.js'], cwd: '/some/dir' },
    }, 2))
    const text = res.result.content[0].text
    expect(text).toContain('⚠️')
    expect(text).toContain('mcp-server.js')
    expect(text).toContain('README.md')
    // Still registers despite warning
    expect(text).toContain('Desktop config updated')
  })
})

describe('restart_desktop', () => {
  let server

  afterEach(() => { server?.kill() })

  it('returns a response (does not crash)', async () => {
    server = spawnServer()
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', {
      name: 'restart_desktop',
      arguments: {},
    }, 2))
    expect(res.result.content[0].text).toBeTruthy()
  })
})

describe('enable_mcp', () => {
  let server
  let fakeHome

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'devmcp-enable-'))
    const claudeDir = join(fakeHome, 'Library/Application Support/Claude')
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, 'claude_desktop_config.json'), '{"mcpServers":{}}')
  })

  afterEach(() => {
    server?.kill()
    if (fakeHome) rmSync(fakeHome, { recursive: true, force: true })
  })

  it('registers in Desktop config then returns restart message', async () => {
    server = spawnServer({ HOME: fakeHome })
    server.send(rpc('initialize', {}, 1))
    const res = await server.sendAndWait(rpc('tools/call', {
      name: 'enable_mcp',
      arguments: { name: 'new-srv', command: 'node', args: ['/abs/new.js'] },
    }, 2))
    const text = res.result.content[0].text
    expect(text).toContain('Desktop config updated')
    const configPath = join(fakeHome, 'Library/Application Support/Claude/claude_desktop_config.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(config.mcpServers['new-srv']).toEqual({ command: 'node', args: ['/abs/new.js'] })
  })
})
