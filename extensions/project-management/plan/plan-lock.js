import { watch } from 'node:fs'
import { access, readdir, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'

// Ownership of a plan version rests on a filename and its atomic rename, never on a mutex
// held in one process: several CLIs write this directory at the same time.

const CURRENT = /^plan-(\d+\.\d+\.\d+)\.json$/
const LOCKED = /^plan-(\d+\.\d+\.\d+)\.locked-(\d{8}T\d{9}Z)\.json$/
const SOFT_LIMIT = 30_000
const HARD_LIMIT = 300_000

export const parts = version => version.split('.').map(Number)
const compare = (left, right) => parts(left).reduce((result, value, index) =>
  result || value - parts(right)[index], 0)
const highest = versions => versions.sort(compare).at(-1)
export const timestamp = date => date.toISOString().replace(/[-:.]/g, '')
const acquiredAt = value => new Date(
  `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` +
  `T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}.${value.slice(15, 18)}Z`
)

export async function move(from, to, dependencies) {
  await rename(from, to)
  dependencies.onRename(from, to)
}

export async function exists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function expired(path, stamp, now) {
  const details = await stat(path)
  return now - details.mtime >= SOFT_LIMIT || now - acquiredAt(stamp) >= HARD_LIMIT
}

async function inventory(plansPath) {
  const entries = await readdir(plansPath)
  return {
    current: entries.map(name => name.match(CURRENT)).filter(Boolean),
    locked: entries.map(name => name.match(LOCKED)).filter(Boolean)
  }
}

async function archiveOrphans(plansPath, currentVersion, dependencies) {
  const { locked } = await inventory(plansPath)
  for (const match of locked) {
    if (compare(match[1], currentVersion) >= 0) continue
    const source = join(plansPath, match[0])
    if (!await expired(source, match[2], dependencies.now())) continue
    await move(source, join(plansPath, 'archive', `plan-${match[1]}.json`), dependencies)
  }
}

export async function acquire(plansPath, baseVersion, dependencies) {
  while (true) {
    const state = await inventory(plansPath)
    const currentVersion = highest(state.current.map(match => match[1]))
    if (currentVersion) {
      await archiveOrphans(plansPath, currentVersion, dependencies)
      if (currentVersion !== baseVersion) return { code: 'PLAN_STALE', currentVersion }
      const source = join(plansPath, `plan-${baseVersion}.json`)
      const lock = join(plansPath, `plan-${baseVersion}.locked-${timestamp(dependencies.now())}.json`)
      try {
        await move(source, lock, dependencies)
        return { lock }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        continue
      }
    }
    const candidate = state.locked.filter(match => match[1] === baseVersion).sort().at(-1)
    if (!candidate) return { code: 'PLAN_STALE', currentVersion: null }
    const source = join(plansPath, candidate[0])
    if (!await expired(source, candidate[2], dependencies.now())) {
      await dependencies.waitForChange(plansPath)
      continue
    }
    const lock = join(plansPath, `plan-${baseVersion}.locked-${timestamp(dependencies.now())}.json`)
    try {
      await move(source, lock, dependencies)
      return { lock }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}

