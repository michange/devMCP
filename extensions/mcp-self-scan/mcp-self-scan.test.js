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

    for (const name of scanNames) {
      expect(listNames, `${name} found by self_scan but not by mcp_list`).toContain(name)
    }
  }, 60_000)

  it('file-based mcp_list is faster than preflight mcp_self_scan', () => {
    const PROJECT = '/Users/mic/PhpstormProjects/naude-new'
    const ITERATIONS = 50

    // mcp_list: run N iterations, measure total with performance.now
    const t0 = performance.now()
    for (let i = 0; i < ITERATIONS; i++) {
      listTool.handler({ projectRoot: PROJECT })
    }
    const listTotalMs = performance.now() - t0
    const listAvgMs = listTotalMs / ITERATIONS

    // mcp_self_scan: run 3 iterations (it's slow — spawns a process each time)
    const SCAN_ITERATIONS = 3
    const t1 = performance.now()
    for (let i = 0; i < SCAN_ITERATIONS; i++) {
      scanTool.handler({})
    }
    const scanTotalMs = performance.now() - t1
    const scanAvgMs = scanTotalMs / SCAN_ITERATIONS

    const ratio = scanAvgMs / listAvgMs

    console.log(`mcp_list: ${listAvgMs.toFixed(2)}ms avg over ${ITERATIONS} runs`)
    console.log(`mcp_self_scan: ${scanAvgMs.toFixed(2)}ms avg over ${SCAN_ITERATIONS} runs`)
    console.log(`ratio: ${ratio.toFixed(1)}x`)

    expect(listAvgMs).toBeLessThan(scanAvgMs)
    expect(ratio).toBeGreaterThan(10)  // file-based should be at least 10x faster
  }, 60_000)

  it('mcp_list has richer config info: command, args, type, _source', () => {
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
    expect(devMCP.command).toBeUndefined()
    expect(devMCP.args).toBeUndefined()
  }, 60_000)

})
