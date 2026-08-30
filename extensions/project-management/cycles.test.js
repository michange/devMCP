import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadCycles } from './plan/cycles.js'

// loadCycles takes roots in increasing order of precedence, the way mcp_list reads its four
// configuration sources: a later root overwrites an earlier one under the same name. The caller
// passes devMCP's cycles first and the project's second, so a project can redefine a shipped cycle
// without editing it.

let root
const cyclesDir = () => join(root, 'skills', 'cycles')

function writeCycle(base, name, body) {
  const dir = join(base, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.yaml`), body)
  return dir
}

const ONE_STEP = name => `name: ${name}\nsteps:\n  - name: only\n    skill: skill.only.md\n`

beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'devmcp-cycles-')) })
afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }) })

describe('cycles — discovery, shape and index', () => {
  it('indexes a cycle by the name its file declares', () => {
    writeCycle(cyclesDir(), 'cyBuild', ONE_STEP('cyBuild'))
    const index = loadCycles([cyclesDir()])
    expect(Object.keys(index)).toEqual(['cyBuild'])
    expect(index.cyBuild.steps[0].name).toBe('only')
  })

  it('lets the project override a cycle devMCP ships', () => {
    const shipped = join(root, 'shipped')
    const project = join(root, 'project')
    writeCycle(shipped, 'cyBuild', ONE_STEP('cyBuild'))
    writeCycle(project, 'cyBuild', 'name: cyBuild\nsteps:\n  - name: mine\n    skill: skill.mine.md\n')
    const index = loadCycles([shipped, project])
    expect(index.cyBuild.steps[0].name).toBe('mine')
  })

  it('treats a missing cycles directory as declaring no cycle', () => {
    const shipped = join(root, 'shipped')
    writeCycle(shipped, 'cyBuild', ONE_STEP('cyBuild'))
    const index = loadCycles([shipped, join(root, 'absent')])
    expect(Object.keys(index)).toEqual(['cyBuild'])
  })

  it('refuses a cycle declaring no step, naming the file', () => {
    writeCycle(cyclesDir(), 'empty', 'name: empty\nsteps: []\n')
    expect(() => loadCycles([cyclesDir()])).toThrow(/empty\.yaml/)
  })

  it('refuses a step without a name, naming the file', () => {
    writeCycle(cyclesDir(), 'broken', 'name: broken\nsteps:\n  - skill: skill.x.md\n')
    expect(() => loadCycles([cyclesDir()])).toThrow(/broken\.yaml/)
  })

  it('refuses an unparsable file rather than skipping it', () => {
    writeCycle(cyclesDir(), 'bad', 'name: bad\nsteps:\n\t- name: tabbed\n')
    expect(() => loadCycles([cyclesDir()])).toThrow(/bad\.yaml/)
  })

  it('defaults gated and skippable to false when a step omits them', () => {
    writeCycle(cyclesDir(), 'terse', ONE_STEP('terse'))
    const step = loadCycles([cyclesDir()]).terse.steps[0]
    expect(step.gated).toBe(false)
    expect(step.skippable).toBe(false)
  })
})
