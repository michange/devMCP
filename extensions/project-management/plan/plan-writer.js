import { mkdir, readFile, unlink, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { attributeErrors, readPredecessor } from './attribute-errors.js'
import { acquire, exists, move, parts, timestamp } from './plan-lock.js'
import { missingContracts, stubContracts } from './stub-contracts.js'
import { renderPlanHtml } from './render-plan.js'
import { validationContext } from './plan-context.js'
import { validatePlan } from './validate-plan.js'
import { resolveCycle } from './cycles.js'


const without = (value, key) => Object.fromEntries(Object.entries(value)
  .filter(([entry]) => entry !== key))
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

export function nextPlanVersion(baseVersion, before, after) {
  const [major, minor, patch] = parts(baseVersion)
  const beforeVersions = before.project.versions
  const afterVersions = after.project.versions
  const versionShape = versions => versions.map(version => without(version, 'workPackages'))
  if (!same(without(before.project, 'versions'), without(after.project, 'versions')) ||
      !same(versionShape(beforeVersions), versionShape(afterVersions))) return `${major + 1}.0.0`
  const wpShape = versions => versions.map(version => version.workPackages
    .map(workPackage => without(workPackage, 'todos')))
  if (!same(wpShape(beforeVersions), wpShape(afterVersions))) return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const waitForChange = path => new Promise((resolve, reject) => {
  const watcher = watch(path, () => {
    watcher.close()
    resolve()
  })
  watcher.on('error', reject)
})

const defaults = {
  now: () => new Date(),
  interval: callback => setInterval(callback, 10_000),
  clearInterval: timer => clearInterval(timer),
  waitForChange,
  renderHtml: renderPlanHtml,
  beforePublish: async () => {},
  onRename: () => {}
}

/**
 * Validate, and offer the one repair a caller can authorise: creating the documents the plan cites
 * and the filesystem does not hold. The plan is validated again afterwards, so what gets published
 * is what was found valid, never a plan trusted because files appeared during the same call.
 *
 * A plan carrying any other error creates nothing. Repairing half of a refusal would leave files
 * behind a write that was rejected anyway.
 */
// A todo whose shape is not settled is a conversation before it is a sequence, so an unfinished
// todo that declares no cycle adopts the dialogue skill as this plan is published. A completed todo
// is left alone: its record is history, and rewriting the method of finished work would claim it was
// done a way it was not. The migration therefore spreads one plan at a time.
const DEFAULT_TODO = 'dialogue'

function migrateTodos(todos, cycle) {
  for (const todo of todos ?? []) {
    if (todo.status !== 'complete' && todo.cycle === undefined) {
      todo.cycle = DEFAULT_TODO
      todo.cybuild = cycle.steps.map(step => ({ step: step.name, status: 'pending' }))
    }
    migrateTodos(todo.todos, cycle)
  }
}

function migrateCycles(plan, context) {
  const cycle = resolveCycle(DEFAULT_TODO, context)
  if (!cycle || cycle.name !== DEFAULT_TODO) return
  for (const version of plan?.project?.versions ?? []) {
    for (const workPackage of version.workPackages ?? []) migrateTodos(workPackage.todos, cycle)
  }
}

async function validated(input) {
  const context = () => validationContext(input.projectPath)
  const initial = context()
  migrateCycles(input.plan, initial)
  const first = validatePlan(input.plan, initial)
  if (first.valid || !input.stubMissingContracts) return first
  if (!first.errors.every(error => error.code === 'CONTRACT_MISSING')) return first
  await stubContracts(input.projectPath, missingContracts(first.errors))
  return validatePlan(input.plan, context())
}

export async function writePlan(input, overrides = {}) {
  const dependencies = { ...defaults, ...overrides }
  const plansPath = join(input.projectPath, 'plans')
  await mkdir(join(plansPath, 'archive'), { recursive: true })
  const predecessor = await readPredecessor(plansPath, input.baseVersion)
  const result = await validated(input)
  if (!result.valid) {
    return {
      ...result,
      missingContracts: missingContracts(result.errors),
      ...attributeErrors(result.errors, predecessor, input.plan)
    }
  }
  const acquisition = await acquire(plansPath, input.baseVersion, dependencies)
  if (!acquisition.lock) return { valid: false, ...acquisition }
  const heartbeat = dependencies.interval(() => {
    void utimes(acquisition.lock, new Date(), new Date()).catch(() => {})
  })
  const warnings = []
  let version
  try {
    const previous = JSON.parse(await readFile(acquisition.lock, 'utf8'))
    version = nextPlanVersion(input.baseVersion, previous, input.plan)
    await dependencies.beforePublish(acquisition.lock)
    if (!await exists(acquisition.lock)) return { valid: false, code: 'PLAN_LOCK_LOST' }
    const temporary = join(plansPath, `.plan-${version}-${timestamp(dependencies.now())}.tmp`)
    await writeFile(temporary, `${JSON.stringify(input.plan, null, 2)}\n`, { flag: 'wx' })
    await move(temporary, join(plansPath, `plan-${version}.json`), dependencies)
    await move(acquisition.lock, join(plansPath, 'archive', `plan-${input.baseVersion}.json`), dependencies)
  } finally {
    dependencies.clearInterval(heartbeat)
  }
  const oldHtml = join(plansPath, `plan-${input.baseVersion}.html`)
  if (await exists(oldHtml)) await unlink(oldHtml)
  try {
    await writeFile(join(plansPath, `plan-${version}.html`), dependencies.renderHtml(input.plan, validationContext(input.projectPath).cycles))
  } catch (error) {
    warnings.push({ code: 'PLAN_RENDER_FAILED', message: error.message })
  }
  return { valid: true, version, warnings }
}

/**
 * The calling path for a script: publish, or fail loudly.
 *
 * `writePlan` returns its outcome because the MCP server needs it — a server answers instead of
 * dying, and the protocol carries the failure in `isError`. A script has the opposite need: a
 * result it forgets to read becomes a publication it believes happened.
 *
 * A render failure is not a failure here. The canonical plan is written and only its projection
 * is missing, so the version is returned.
 */
export async function publishPlan(input, overrides = {}) {
  const result = await writePlan(input, overrides)
  if (result.valid) return result.version
  if (result.errors) {
    const { mine, inherited, unknown } = result.attribution
    const paths = result.errors.map(error => error.path).join(', ')
    throw new Error(`plan invalid, ${mine} from this mutation, ${inherited} inherited, ` +
      `${unknown} unattributed: ${paths}`)
  }
  throw new Error(`plan not published: ${result.code}`)
}
