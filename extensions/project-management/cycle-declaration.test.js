// extensions/project-management/cycle-declaration.test.js — a todo declares how its work is run.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import extension from './index.js'
import { validatePlan } from './plan/validate-plan.js'
import { renderPlanHtml } from './plan/render-plan.js'
import { CYBUILD_STEPS, seedPlan } from './plan-fixture.js'

const tool = extension[0]

// A todo declares how its work is carried out by naming a cycle. The name resolves against the
// cycle index the context carries; a name that is no cycle is taken for a skill; a name that is
// neither is refused. The tracking array then follows the resolved cycle rather than a fixed nine.
describe('cycle resolution and cybuild tracking', () => {

  const contract = './docs/contract.md'
  const step = (name, extra = {}) => ({ name, skill: `skill.${name}.md`, gated: true, skippable: false, ...extra })

  const cycles = {
    cyPhases: { name: 'cyPhases', steps: CYBUILD_STEPS.map((s) => step(s)) },
    cyBuild: { name: 'cyBuild', steps: ['preRead', 'purpose', 'red', 'green', 'commit'].map((s) => step(s)) },
    skippy: { name: 'skippy', steps: [step('mandatory'), step('optional', { skippable: true })] },
  }
  const skills = new Set(['dialogue', 'some-skill'])

  const base = { referenceExists: (r) => r === contract, branches: new Set(['main']), worktrees: new Set() }
  const context = { ...base, cycles, skills }

  const withCycle = (cycle, cybuild) => {
    const plan = seedPlan(contract)
    const todo = plan.project.versions[0].workPackages[0].todos[0]
    if (cycle !== undefined) todo.cycle = cycle
    if (cybuild !== undefined) todo.cybuild = cybuild
    return plan
  }
  const messages = (plan, ctx = context) => validatePlan(plan, ctx).errors.map((e) => e.message)

  // The compatibility case. A published plan declares no cycle and carries nine entries, and it
  // must keep validating even when the caller supplies no cycle index at all.
  it('validates a published nine-entry todo that declares no cycle', () => {
    expect(validatePlan(withCycle(undefined), base).errors).toEqual([])
  })

  it('resolves a named cycle from the index and checks the array against it', () => {
    const five = cycles.cyBuild.steps.map((s) => ({ step: s.name, status: 'pending' }))
    expect(messages(withCycle('cyBuild', five))).toEqual([])
  })

  it('falls back to a skill when the name is no cycle, giving a single-step todo', () => {
    expect(messages(withCycle('dialogue', [{ step: 'dialogue', status: 'pending' }]))).toEqual([])
  })

  it('names both the cycle and the skill it looked for when neither resolves', () => {
    const [message] = messages(withCycle('nope', [{ step: 'nope', status: 'pending' }]))
    expect(message).toMatch(/cycle/)
    expect(message).toMatch(/skill/)
    expect(message).toMatch(/nope/)
  })

  // An index is an object, so it answers for every name its prototype carries: an unguarded lookup
  // returns `Object` for "constructor", truthy enough for the caller to read `.steps` off a function.
  it('refuses a name that only matches an inherited object property', () => {
    const array = [{ step: 'constructor', status: 'pending' }]
    const [message] = messages(withCycle('constructor', array))
    expect(message).toMatch(/constructor/)
  })

  it('does not treat __proto__ as a declared cycle', () => {
    const array = [{ step: '__proto__', status: 'pending' }]
    const [message] = messages(withCycle('__proto__', array))
    expect(message).toMatch(/__proto__/)
  })

  it('refuses a tracking array whose length is not the cycle step count', () => {
    const nine = CYBUILD_STEPS.map((s) => ({ step: s, status: 'pending' }))
    expect(messages(withCycle('cyBuild', nine)).join(' ')).toMatch(/5/)
  })

  it('refuses a step name at the wrong position, naming the expected step', () => {
    const swapped = cycles.cyBuild.steps.map((s) => ({ step: s.name, status: 'pending' }))
    ;[swapped[1], swapped[2]] = [swapped[2], swapped[1]]
    expect(messages(withCycle('cyBuild', swapped)).join(' ')).toMatch(/purpose/)
  })

  it('refuses skipped on a step the cycle does not declare skippable', () => {
    const array = [{ step: 'mandatory', status: 'skipped' }, { step: 'optional', status: 'pending' }]
    expect(messages(withCycle('skippy', array)).join(' ')).toMatch(/mandatory/)
  })

  it('accepts skipped on a step the cycle declares skippable', () => {
    const array = [{ step: 'mandatory', status: 'pending' }, { step: 'optional', status: 'skipped' }]
    expect(messages(withCycle('skippy', array))).toEqual([])
  })
})

// write_plan migrates what it publishes: an unfinished todo that declares no cycle adopts the
// dialogue skill, while a completed todo keeps its record untouched. Each case publishes once, so
// each gets its own repository: publishing archives the base plan the next call would need.
describe('cycle migration on publication', () => {

  let repo

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'devmcp-migrate-'))
    execFileSync('git', ['-C', repo, 'init', '-q', '-b', 'main'])
    execFileSync('git', ['-C', repo, 'config', 'user.email', 'probe@example.com'])
    execFileSync('git', ['-C', repo, 'config', 'user.name', 'probe'])
    mkdirSync(join(repo, 'docs'))
    writeFileSync(join(repo, 'docs', 'contract.md'), '# Contract\n')
    execFileSync('git', ['-C', repo, 'add', '-A'])
    execFileSync('git', ['-C', repo, 'commit', '-q', '-m', 'seed'])
    mkdirSync(join(repo, 'plans'))
    writeFileSync(join(repo, 'plans', 'plan-0.0.0.json'),
      `${JSON.stringify(seedPlan('./docs/contract.md'), null, 2)}\n`)
  })

  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  const publish = (plan) => tool.handler({
    projectPath: repo, baseVersion: '0.0.0', plan: plan ?? seedPlan('./docs/contract.md'),
    cliName: 'vitest', sessionID: 'probe', wp: 'WP1-probe', todo: 'WP1-probe.first',
  })

  // The error response carries the submitted plan back, so reading the response would assert the
  // fixture rather than the publication. Read the file that was written instead.
  const publishedTodo = (result) => {
    expect(result.isError).toBe(false)
    const { version } = JSON.parse(result.text)
    const written = JSON.parse(readFileSync(join(repo, 'plans', `plan-${version}.json`), 'utf-8'))
    return written.project.versions[0].workPackages[0].todos[0]
  }

  it('writes cycle: dialogue onto an unfinished todo that declares none', async () => {
    expect(publishedTodo(await publish()).cycle).toBe('dialogue')
  })

  it('leaves a completed todo without a cycle alone', async () => {
    const plan = seedPlan('./docs/contract.md')
    const todo = plan.project.versions[0].workPackages[0].todos[0]
    todo.status = 'complete'
    todo.cybuild = CYBUILD_STEPS.map((step) => ({ step, status: 'complete' }))
    expect(publishedTodo(await publish(plan)).cycle).toBeUndefined()
  })

  it('never overwrites a cycle the todo already declares', async () => {
    const plan = seedPlan('./docs/contract.md')
    plan.project.versions[0].workPackages[0].todos[0].cycle = 'cyPhases'
    expect(publishedTodo(await publish(plan)).cycle).toBe('cyPhases')
  })

  it('rewrites the tracking array to the adopted cycle', async () => {
    const todo = publishedTodo(await publish())
    expect(todo.cybuild).toHaveLength(1)
    expect(todo.cybuild[0].step).toBe('dialogue')
  })
})

describe('cycle rendering', () => {

  const planWith = (cycle, steps) => {
    const plan = seedPlan('./docs/contract.md')
    const todo = plan.project.versions[0].workPackages[0].todos[0]
    todo.cycle = cycle
    todo.cybuild = steps.map((step) => ({ step, status: 'pending' }))
    return plan
  }

  // Gating lives in the cycle, never in the plan, so the projection can only mark a step when it
  // is handed the cycle index. Rendering without one stays legal and simply marks nothing.
  const gatedFirst = {
    cyBuild: {
      name: 'cyBuild',
      steps: [
        { name: 'preRead', skill: null, gated: true, skippable: false },
        { name: 'purpose', skill: null, gated: false, skippable: false },
      ],
    },
  }

  it('marks a gated step and leaves an ungated one unmarked', () => {
    const html = renderPlanHtml(planWith('cyBuild', ['preRead', 'purpose']), gatedFirst)
    expect(html).toContain('class="cybuild-pending gated"><input type="checkbox" disabled> preRead')
    expect(html).toContain('class="cybuild-pending"><input type="checkbox" disabled> purpose')
  })

  it('renders without a cycle index, marking nothing', () => {
    const html = renderPlanHtml(planWith('cyBuild', ['preRead', 'purpose']))
    expect(html).toContain('preRead')
    expect(html).not.toContain('gated')
  })

  it('escapes a cycle name carrying markup', () => {
    const html = renderPlanHtml(planWith('<script>', ['<script>']))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
