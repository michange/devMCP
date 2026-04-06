// extensions/mcp-list/mcp-list.test.js — quick test for mcp_list extension
import { describe, it, expect } from 'vitest'
import mcpListExt from './index.js'

const tool = mcpListExt[0]

describe('mcp_list extension', () => {

  it('exports a tool named mcp_list', () => {
    expect(tool.name).toBe('mcp_list')
    expect(typeof tool.handler).toBe('function')
  })

  it('returns JSON with servers object', () => {
    const result = tool.handler({ projectRoot: '/Users/mic/PhpstormProjects/naude-new' })
    expect(result.isError).toBe(false)
    const parsed = JSON.parse(result.text)
    expect(parsed.servers).toBeDefined()
    expect(typeof parsed.servers).toBe('object')
  })

  it('discovers devMCP from global config', () => {
    const result = tool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.devMCP).toBeDefined()
    expect(parsed.servers.devMCP._source).toBe('global')
    expect(parsed.servers.devMCP.command).toBe('node')
  })

  it('discovers playwright from global config', () => {
    const result = tool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.playwright).toBeDefined()
    expect(parsed.servers.playwright._source).toBe('global')
  })

  it('discovers trampoline from global config', () => {
    const result = tool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.trampoline).toBeDefined()
    expect(parsed.servers.trampoline.type).toBe('http')
  })

  it('discovers poc-url from project legacy config', () => {
    const result = tool.handler({ projectRoot: '/Users/mic/PhpstormProjects/naude-new' })
    const parsed = JSON.parse(result.text)
    expect(parsed.servers['poc-url']).toBeDefined()
    expect(parsed.servers['poc-url']._source).toBe('projectLegacy')
  })

  it('annotates sources paths', () => {
    const result = tool.handler({ projectRoot: '/Users/mic/PhpstormProjects/naude-new' })
    const parsed = JSON.parse(result.text)
    expect(parsed.sources.globalConfig).toContain('.claude.json')
    expect(parsed.sources.globalMcp).toContain('.claude/mcp.json')
    expect(parsed.sources.projectMcp).toContain('naude-new/.claude/mcp.json')
  })

  it('works without projectRoot — global only', () => {
    const result = tool.handler({})
    const parsed = JSON.parse(result.text)
    expect(parsed.servers.devMCP).toBeDefined()
    expect(parsed.sources.projectMcp).toBeNull()
    expect(parsed.sources.projectLegacy).toBeNull()
  })

  it('each server has type field', () => {
    const result = tool.handler({})
    const parsed = JSON.parse(result.text)
    for (const [name, cfg] of Object.entries(parsed.servers)) {
      expect(cfg.type || cfg.command, `${name} should have type or command`).toBeDefined()
    }
  })

})
