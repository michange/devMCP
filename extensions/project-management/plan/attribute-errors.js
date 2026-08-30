import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const LOCKED = /^plan-(\d+\.\d+\.\d+)\.locked-\d{8}T\d{9}Z\.json$/
const ORIGINS = { mine: 0, inherited: 0, unknown: 0 }

// `$.project.versions[0].workPackages[3].todos[1].contracts[0]` becomes
// ['project', 'versions', 0, 'workPackages', 3, 'todos', 1, 'contracts', 0].
function segments(path) {
  return [...path.matchAll(/\[(\d+)\]|\.([^.[]+)/g)]
    .map(([, index, key]) => (index === undefined ? key : Number(index)))
}

const step = (value, key) => (value === null || typeof value !== 'object' ? undefined : value[key])
const resolve = (root, keys) => keys.reduce(step, root)
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

/**
 * A path designating nothing in either plan cannot be compared: an object missing a required key
 * holds `undefined` there, exactly like an object that never had the key. The verdict then belongs
 * to the closest ancestor the submitted plan actually holds, which differs from a complete node
 * precisely because the key is missing.
 */
function comparable(keys, current) {
  for (let depth = keys.length; depth > 0; depth -= 1) {
    const head = keys.slice(0, depth)
    if (resolve(current, head) !== undefined) return head
  }
  return []
}

function originOf(path, previous, current) {
  if (previous === null || previous === undefined) return 'unknown'
  const keys = comparable(segments(path), current)
  const before = resolve(previous, keys)
  if (before === undefined) return 'mine'
  return same(before, resolve(current, keys)) ? 'inherited' : 'mine'
}

/**
 * Tell each validation error apart: introduced by the submitted mutation, or already carried by
 * the plan it replaces. Refusal is unaffected — a session reads this to know whether to fix its
 * own work or to go find the session that owns the faulty node.
 */
export function attributeErrors(errors, previous, current) {
  const attribution = { ...ORIGINS }
  const attributed = errors.map(error => {
    const origin = originOf(error.path, previous, current)
    attribution[origin] += 1
    return { ...error, origin }
  })
  return { errors: attributed, attribution }
}

/**
 * The plan a mutation replaces, read without acquiring anything. A competing writer holds the base
 * version under its locked name; reading that file disturbs no invariant, because ownership rests
 * on the filename and its atomic rename, never on the content.
 */
export async function readPredecessor(plansPath, baseVersion) {
  try {
    return JSON.parse(await readFile(join(plansPath, `plan-${baseVersion}.json`), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') return null
  }
  try {
    const entries = await readdir(plansPath)
    const locked = entries.filter(name => LOCKED.exec(name)?.[1] === baseVersion).sort().at(-1)
    if (!locked) return null
    return JSON.parse(await readFile(join(plansPath, locked), 'utf8'))
  } catch {
    return null
  }
}
