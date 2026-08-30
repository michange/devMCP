// extensions/project-management/project-management.test.js — write_plan extension
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import extension from './index.js'
import { validatePlan } from './plan/validate-plan.js'

const tool = extension[0]

const CYBUILD_STEPS = ['PRE-READ', 'PURPOSE', 'TEST PLAN', 'RED', 'GREEN',
  'REGRESSION', 'DEMO/DOCS', 'REVIEW', 'COMMIT']

const seedPlan = (contract) => ({
  project: {
    name: 'probe', repo: '.', remote: 'origin', documentation: contract,
    versions: [{
      name: 'v1', status: 'active', specification: contract,
      workPackages: [{
        name: 'WP1-probe', status: 'active', contracts: [contract],
        todos: [{
          path: 'WP1-probe.first', status: 'in-progress',
          workspace: { kind: 'branch', name: 'main' },
          contracts: [contract],
          cybuild: CYBUILD_STEPS.map((step) => ({ step, status: 'pending' })),
          todos: [],
        }],
      }],
    }],
  },
})

const call = (overrides) => tool.handler({
  projectPath: root, baseVersion: '0.0.0', plan: seedPlan('./docs/contract.md'),
  cliName: 'vitest', sessionID: 'probe', wp: 'WP1-probe', todo: 'WP1-probe.first',
  ...overrides,
})

let root

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'devmcp-plan-'))
  execFileSync('git', ['-C', root, 'init', '-q', '-b', 'main'])
  execFileSync('git', ['-C', root, 'config', 'user.email', 'probe@example.com'])
  execFileSync('git', ['-C', root, 'config', 'user.name', 'probe'])
  mkdirSync(join(root, 'docs'))
  writeFileSync(join(root, 'docs', 'contract.md'), '# Contract\n')
  writeFileSync(join(root, 'seed.txt'), 'seed\n')
  execFileSync('git', ['-C', root, 'add', '-A'])
  execFileSync('git', ['-C', root, 'commit', '-q', '-m', 'seed'])
  mkdirSync(join(root, 'plans'))
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('write_plan extension', () => {

  it('exports a tool named write_plan', () => {
    expect(tool.name).toBe('write_plan')
    expect(typeof tool.handler).toBe('function')
    expect(tool.inputSchema.required).toContain('projectPath')
  })

  it('names every missing argument instead of throwing', async () => {
    const result = await tool.handler({ projectPath: root })
    expect(result.isError).toBe(true)
    expect(result.text).toContain('baseVersion')
    expect(result.text).toContain('sessionID')
  })

  it('refuses PLAN_STALE when plans/ holds no base version', async () => {
    const result = await call({})
    expect(result.isError).toBe(true)
    expect(JSON.parse(result.text).code).toBe('PLAN_STALE')
  })

  it('reports a missing contract rather than publishing', async () => {
    writeFileSync(join(root, 'plans', 'plan-0.0.0.json'),
      `${JSON.stringify(seedPlan('./docs/contract.md'), null, 2)}\n`)
    const result = await call({ plan: seedPlan('./docs/absent.md') })
    expect(result.isError).toBe(true)
    const body = JSON.parse(result.text)
    expect(body.valid).toBe(false)
    expect(body.missingContracts).toContain('./docs/absent.md')
    expect(existsSync(join(root, 'plans', 'plan-0.0.0.json'))).toBe(true)
  })

  it('publishes the next plan, archives its predecessor and renders the HTML', async () => {
    const plan = seedPlan('./docs/contract.md')
    plan.project.versions[0].workPackages[0].todos[0].status = 'complete'
    plan.project.versions[0].workPackages[0].todos[0].cybuild =
      CYBUILD_STEPS.map((step) => ({ step, status: 'complete' }))
    const result = await call({ plan })
    expect(result.isError).toBe(false)
    const body = JSON.parse(result.text)
    expect(body.valid).toBe(true)
    expect(body.version).toBe('0.0.1')
    const published = readdirSync(join(root, 'plans'))
    expect(published).toContain('plan-0.0.1.json')
    expect(published).toContain('plan-0.0.1.html')
    expect(readdirSync(join(root, 'plans', 'archive'))).toContain('plan-0.0.0.json')
  })
})

// A version's status is a claim about its work packages. Upstream enigma checks that claim from
// the work package down and never at the version level, so a version could be declared complete
// above a package still open. These cases hold the divergence recorded in ORIGIN.md.
describe('version status against its work packages', () => {

  const contract = './docs/contract.md'
  const context = {
    referenceExists: (reference) => reference === contract,
    branches: new Set(['main']),
    worktrees: new Set(),
  }

  const withStatuses = (versionStatus, wpStatus, todoStatus, phase) => {
    const plan = seedPlan(contract)
    const version = plan.project.versions[0]
    version.status = versionStatus
    version.workPackages[0].status = wpStatus
    version.workPackages[0].todos[0].status = todoStatus
    version.workPackages[0].todos[0].cybuild = CYBUILD_STEPS.map((step) => ({ step, status: phase }))
    return plan
  }

  const messages = (plan) => validatePlan(plan, context).errors.map((error) => error.message)

  it('refuses an active work package under a complete version', () => {
    expect(messages(withStatuses('complete', 'active', 'complete', 'complete')))
      .toContain('a complete parent holds no unfinished work package')
  })

  it('refuses a complete work package under a planned version', () => {
    expect(messages(withStatuses('planned', 'complete', 'complete', 'complete')))
      .toContain('an unstarted parent holds no started work package')
  })

  it('counts an active work package as started, which the todo vocabulary does not name', () => {
    expect(messages(withStatuses('planned', 'active', 'pending', 'pending')))
      .toContain('an unstarted parent holds no started work package')
  })

  it('accepts a deferred work package under a complete version', () => {
    expect(messages(withStatuses('complete', 'deferred', 'deferred', 'skipped'))).toEqual([])
  })

  it('still names a todo, not a work package, one level down', () => {
    expect(messages(withStatuses('active', 'complete', 'in-progress', 'pending')))
      .toContain('a complete parent holds no unfinished todo')
  })
})
