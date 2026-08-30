import { checkExact, checkObject, checkReferences, checkStatus, checkString } from './check-shape.js'
import { resolveCycle } from './cycles.js'

const VERSION_STATUSES = new Set(['planned', 'active', 'complete', 'archived'])
const WP_STATUSES = new Set(['planned', 'ready', 'active', 'blocked', 'complete', 'deferred'])
const TODO_STATUSES = new Set(['pending', 'ready', 'in-progress', 'blocked', 'complete', 'deferred', 'dropped'])
const CYBUILD_STATUSES = new Set(['pending', 'in-progress', 'complete', 'skipped'])
const TODO_SEGMENT = '[a-z][A-Za-z0-9-]*'

function checkWorkspace(workspace, path, context, errors) {
  if (!checkObject(workspace, path, ['kind', 'name'], errors)) return
  if (!['worktree', 'branch'].includes(workspace.kind)) {
    errors.push({ path: `${path}.kind`, message: 'must be worktree or branch' })
    return
  }
  if (!checkString(workspace.name, `${path}.name`, errors)) return
  const known = workspace.kind === 'branch' ? context.branches : context.worktrees
  if (known && !known.has(workspace.name)) errors.push({ path: `${path}.name`, message: `${workspace.kind} does not exist` })
}

// The tracking array records the run of the declared cycle, so it holds one entry per step of that
// cycle, in its order. Only a step the cycle declares skippable may be marked skipped: skipping a
// mandatory step is a claim the cycle forbids.
function checkCybuild(cybuild, path, cycle, errors) {
  const steps = cycle.steps
  if (!Array.isArray(cybuild) || cybuild.length !== steps.length) {
    errors.push({ path, message: `must contain ${steps.length} ordered ${cycle.name} steps` })
    return
  }
  cybuild.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`
    if (!checkObject(entry, entryPath, ['step', 'status'], errors)) return
    checkExact(entry.step, steps[index].name, `${entryPath}.step`, errors)
    checkStatus(entry.status, `${entryPath}.status`, CYBUILD_STATUSES, errors)
    if (entry.status === 'skipped' && !steps[index].skippable) {
      errors.push({
        path: `${entryPath}.status`,
        message: `${steps[index].name} is not skippable in the ${cycle.name} cycle`,
      })
    }
  })
}

function checkExecution(execution, path, errors) {
  if (execution === undefined) return
  if (!checkObject(execution, path, ['cli', 'session'], errors, ['session'])) return
  if (!['claude', 'codex'].includes(execution.cli)) errors.push({ path: `${path}.cli`, message: 'must be claude or codex' })
  if (execution.session !== undefined) checkString(execution.session, `${path}.session`, errors)
}

const FINISHED = new Set(['complete', 'deferred', 'dropped'])
// `in-progress` is a todo's word for started work, `active` a work package's. Both belong here,
// and neither status exists in the other's vocabulary, so one set serves every level.
const STARTED = new Set(['in-progress', 'active', 'complete'])
const UNSTARTED = new Set(['planned', 'ready'])

// A parent's status is a claim about its children. Two claims can be checked: a finished node
// holds no unfinished work, and an unstarted node holds no started work. The error goes on the
// child, which is where the anomaly is, and where the reader must act.
function checkChildStatus(parentStatus, child, path, errors, kind = 'todo') {
  if (parentStatus === 'complete' && !FINISHED.has(child.status)) {
    errors.push({ path: `${path}.status`, message: `a complete parent holds no unfinished ${kind}` })
  }
  if (UNSTARTED.has(parentStatus) && STARTED.has(child.status)) {
    errors.push({ path: `${path}.status`, message: `an unstarted parent holds no started ${kind}` })
  }
}

function validateTodo(todo, path, parentPath, contracts, seen, context, errors) {
  const keys = ['path', 'status', 'workspace', 'execution', 'contracts', 'cybuild', 'cycle', 'todos']
  if (!checkObject(todo, path, keys, errors, ['execution', 'cycle'])) return
  if (checkString(todo.path, `${path}.path`, errors)) {
    const expected = new RegExp(`^${parentPath}\\.${TODO_SEGMENT}$`)
    if (!expected.test(todo.path)) errors.push({ path: `${path}.path`, message: `must extend ${parentPath} by one todo segment` })
    if (seen.has(todo.path)) errors.push({ path: `${path}.path`, message: 'must be unique within the work package' })
    seen.add(todo.path)
  }
  checkStatus(todo.status, `${path}.status`, TODO_STATUSES, errors)
  checkWorkspace(todo.workspace, `${path}.workspace`, context, errors)
  checkExecution(todo.execution, `${path}.execution`, errors)
  checkReferences(todo.contracts, `${path}.contracts`, contracts, context, errors,
    ['blocked', 'deferred', 'dropped'].includes(todo.status))
  const cycle = resolveCycle(todo.cycle, context)
  if (!cycle) {
    errors.push({
      path: `${path}.cycle`,
      message: `no cycle and no skill named ${todo.cycle}`,
    })
  } else {
    checkCybuild(todo.cybuild, `${path}.cybuild`, cycle, errors)
  }
  if (!Array.isArray(todo.todos)) {
    errors.push({ path: `${path}.todos`, message: 'must be an array' })
    return
  }
  todo.todos.forEach((child, index) => {
    checkChildStatus(todo.status, child, `${path}.todos[${index}]`, errors)
    validateTodo(child, `${path}.todos[${index}]`, todo.path, contracts, seen, context, errors)
  })
}

function validateWorkPackage(wp, path, context, errors) {
  const keys = ['name', 'status', 'execution', 'contracts', 'todos']
  if (!checkObject(wp, path, keys, errors, ['execution'])) return
  if (checkString(wp.name, `${path}.name`, errors) && !/^WP[0-9]+[A-Z]?-[a-z][a-z0-9-]*$/.test(wp.name)) {
    errors.push({ path: `${path}.name`, message: 'must use WP<number><optional suffix>-<semantic-name>' })
  }
  checkStatus(wp.status, `${path}.status`, WP_STATUSES, errors)
  checkExecution(wp.execution, `${path}.execution`, errors)
  checkReferences(wp.contracts, `${path}.contracts`, null, context, errors)
  if (!Array.isArray(wp.todos)) {
    errors.push({ path: `${path}.todos`, message: 'must be an array' })
    return
  }
  const seen = new Set()
  const contracts = new Set(Array.isArray(wp.contracts) ? wp.contracts : [])
  wp.todos.forEach((todo, index) => {
    checkChildStatus(wp.status, todo, `${path}.todos[${index}]`, errors)
    validateTodo(todo, `${path}.todos[${index}]`, wp.name, contracts, seen, context, errors)
  })
}

function validateVersion(version, path, context, errors) {
  const keys = ['name', 'status', 'specification', 'workPackages']
  if (!checkObject(version, path, keys, errors)) return
  checkString(version.name, `${path}.name`, errors)
  checkStatus(version.status, `${path}.status`, VERSION_STATUSES, errors)
  if (checkString(version.specification, `${path}.specification`, errors) && context.referenceExists && !context.referenceExists(version.specification)) {
    errors.push({
      path: `${path}.specification`, message: 'does not exist',
      code: 'CONTRACT_MISSING', reference: version.specification
    })
  }
  if (!Array.isArray(version.workPackages) || version.workPackages.length === 0) {
    errors.push({ path: `${path}.workPackages`, message: 'must be a non-empty array' })
    return
  }
  version.workPackages.forEach((wp, index) => {
    checkChildStatus(version.status, wp, `${path}.workPackages[${index}]`, errors, 'work package')
    validateWorkPackage(wp, `${path}.workPackages[${index}]`, context, errors)
  })
}

export function validatePlan(plan, context = {}) {
  const errors = []
  if (!checkObject(plan, '$', ['project'], errors)) return { valid: false, errors, plan }
  const project = plan.project
  const keys = ['name', 'repo', 'remote', 'documentation', 'versions']
  if (!checkObject(project, '$.project', keys, errors)) return { valid: false, errors, plan }
  checkString(project.name, '$.project.name', errors)
  checkString(project.repo, '$.project.repo', errors)
  checkString(project.remote, '$.project.remote', errors)
  if (checkString(project.documentation, '$.project.documentation', errors) && context.referenceExists && !context.referenceExists(project.documentation)) {
    errors.push({
      path: '$.project.documentation', message: 'does not exist',
      code: 'CONTRACT_MISSING', reference: project.documentation
    })
  }
  if (!Array.isArray(project.versions) || project.versions.length === 0) {
    errors.push({ path: '$.project.versions', message: 'must be a non-empty array' })
  } else {
    project.versions.forEach((version, index) => validateVersion(version, `$.project.versions[${index}]`, context, errors))
  }
  return { valid: errors.length === 0, errors, plan }
}
