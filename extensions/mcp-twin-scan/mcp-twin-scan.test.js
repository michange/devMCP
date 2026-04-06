// extensions/mcp-twin-scan/mcp-twin-scan.test.js
import { describe, it, expect } from 'vitest'
import mcpTwinScanExt from './index.js'
import { performance } from 'node:perf_hooks'

const tool = mcpTwinScanExt[0]
const PROJECT = '/Users/mic/PhpstormProjects/naude-new'

describe('mcp_twin_scan extension', () => {

  it('exports a tool named mcp_twin_scan', () => {
    expect(tool.name).toBe('mcp_twin_scan')
    expect(typeof tool.handler).toBe('function')
  })

  it('returns both fileScan and cliScan with servers', async () => {
    const result = await tool.handler({ projectRoot: PROJECT })
    expect(result.isError).toBe(false)
    const p = JSON.parse(result.text)
    expect(p.fileScan.servers).toBeDefined()
    expect(p.cliScan.servers).toBeDefined()
    expect(Object.keys(p.fileScan.servers).length).toBeGreaterThan(0)
    expect(Object.keys(p.cliScan.servers).length).toBeGreaterThan(0)
  }, 60_000)

  it('fileScan finds devMCP with structured config', async () => {
    const p = JSON.parse((await tool.handler({ projectRoot: PROJECT })).text)
    expect(p.fileScan.servers.devMCP).toBeDefined()
    expect(p.fileScan.servers.devMCP.command).toBe('node')
    expect(p.fileScan.servers.devMCP._source).toBe('global')
  }, 60_000)

  it('cliScan finds devMCP with transport string', async () => {
    const p = JSON.parse((await tool.handler({ projectRoot: PROJECT })).text)
    expect(p.cliScan.servers.devMCP).toBeDefined()
    expect(p.cliScan.servers.devMCP.transport).toContain('mcp-server.js')
  }, 60_000)

  it('diff reports common servers and differences', async () => {
    const p = JSON.parse((await tool.handler({ projectRoot: PROJECT })).text)
    expect(p.diff.common).toContain('devMCP')
    expect(p.diff.common).toContain('playwright')
    expect(p.diff.common).toContain('trampoline')
    // poc-url is in file scan (projectLegacy) but not in CLI scan
    expect(p.diff.onlyInFileScan).toContain('poc-url')
  }, 60_000)

  it('_meta has totalElapsedMs and per-method times', async () => {
    const p = JSON.parse((await tool.handler({ projectRoot: PROJECT })).text)
    expect(p._meta.totalElapsedMs).toBeGreaterThan(0)
    expect(p._meta.fileScanMs).toBeGreaterThan(0)
    expect(p._meta.cliScanMs).toBeGreaterThan(0)
    expect(p._meta.fileScanMs).toBeLessThan(p._meta.cliScanMs)
  }, 60_000)

  it('total elapsed is close to cliScan alone — parallel is free', async () => {
    const p = JSON.parse((await tool.handler({ projectRoot: PROJECT })).text)
    // parallel total should be less than 1.2x the CLI scan alone
    const ratio = p._meta.totalElapsedMs / p._meta.cliScanMs
    console.log(`total: ${p._meta.totalElapsedMs}ms, cli: ${p._meta.cliScanMs}ms, ratio: ${ratio.toFixed(2)}x`)
    expect(ratio).toBeLessThan(1.2)
  }, 60_000)

})
