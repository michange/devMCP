// extensions/mcp-self-scan/mcp-self-scan.test.js — test for mcp_self_scan extension
import { describe, it, expect } from 'vitest'
import mcpSelfScanExt from './index.js'
import mcpListExt from '../mcp-list/index.js'

const scanTool = mcpSelfScanExt[0]
const listTool = mcpListExt[0]

describe('mcp_self_scan extension', () => {

  it('exports a tool named mcp_self_scan', () => {
    expect(scanTool.name).toBe('mcp_self_scan')
    expect(typeof scanTool.handler).toBe('function')
  })

  it('returns JSON with servers and _meta', () => {
    const result = scanTool.handler({})
    expect(result.isError).toBe(false)
    const parsed = JSON.parse(result.text)
    expect(parsed.servers).toBeDefined()
    expect(parsed._meta.method).toBe('preflight')
    expect(parsed._meta.elapsedMs).toBeGreaterThan(0)
  }, 60_000)

  it('discovers devMCP as stdio', () => {
    const result = scanTool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.devMCP).toBeDefined()
    expect(parsed.servers.devMCP.type).toBe('stdio')
    expect(parsed.servers.devMCP.transport).toContain('mcp-server.js')
  }, 60_000)

  it('discovers playwright as stdio', () => {
    const result = scanTool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.playwright).toBeDefined()
    expect(parsed.servers.playwright.type).toBe('stdio')
  }, 60_000)

  it('discovers trampoline as http', () => {
    const result = scanTool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.trampoline).toBeDefined()
    expect(parsed.servers.trampoline.type).toBe('http')
    expect(parsed.servers.trampoline.transport).toContain('19670')
  }, 60_000)

})

// ── Comparison: mcp_list (file-based) vs mcp_self_scan (preflight) ────────────

describe('comparison: mcp_list vs mcp_self_scan', () => {

  it('both find the same local servers', () => {
    const scanResult = JSON.parse(scanTool.handler({}).text)
    const listResult = JSON.parse(listTool.handler({}).text)

    const scanNames = Object.keys(scanResult.servers).sort()
    const listNames = Object.keys(listResult.servers).sort()

    // mcp_list may have more (project-level poc-url) since self_scan
    // only shows servers for current context
    for (const name of scanNames) {
      expect(listNames, `${name} found by self_scan but not by mcp_list`).toContain(name)
    }
  }, 60_000)

  it('file-based mcp_list is faster than preflight mcp_self_scan', () => {
    // mcp_list (file read)
    const t0 = Date.now()
    listTool.handler({ projectRoot: '/Users/mic/PhpstormProjects/naude-new' })
    const listMs = Date.now() - t0

    // mcp_self_scan (CLI spawn)
    const t1 = Date.now()
    scanTool.handler({})
    const scanMs = Date.now() - t1

    console.log(`mcp_list: ${listMs}ms | mcp_self_scan: ${scanMs}ms | ratio: ${(scanMs / Math.max(listMs, 1)).toFixed(1)}x`)

    // file-based should be at least 10x faster
    expect(listMs).toBeLessThan(scanMs)
  }, 60_000)

  it('mcp_list has richer config info (command, args, type)', () => {
    const listResult = JSON.parse(listTool.handler({}).text)
    const devMCP = listResult.servers.devMCP
    expect(devMCP.command).toBe('node')
    expect(devMCP.args).toBeDefined()
    expect(devMCP.type).toBe('stdio')
    expect(devMCP._source).toBe('global')
  })

  it('mcp_self_scan has transport string but no structured config', () => {
    const scanResult = JSON.parse(scanTool.handler({}).text)
    const devMCP = scanResult.servers.devMCP
    expect(devMCP.transport).toContain('node')
    expect(devMCP.command).toBeUndefined()  // no structured config
    expect(devMCP.args).toBeUndefined()
  }, 60_000)

})
