// extensions/project-management/plan/cycles.js — discover cycles, index them, resolve a name.
//
// A cycle is a directory holding a YAML file of the same name. Roots are given in increasing order
// of precedence, the way mcp_list reads its configuration sources: a later root overwrites an
// earlier one under the same name, so a project redefines a shipped cycle without editing it.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parse } from './yaml.js'

const PHASES = ['PRE-READ', 'PURPOSE', 'TEST PLAN', 'RED', 'GREEN',
  'REGRESSION', 'DEMO/DOCS', 'REVIEW', 'COMMIT']

// The nine phases every plan published before cycles existed carries. It is built in rather than
// read from disk because a caller that supplies no cycle index at all must still validate those
// plans: their compatibility cannot depend on a file being found.
export const CYPHASES = {
  name: 'cyPhases',
  steps: PHASES.map((name) => ({ name, skill: null, gated: true, skippable: true })),
}

// A malformed cycle is a fault in configuration, not in the plan being published, so it fails the
// whole load and names its file. Reporting it against a todo would send the reader elsewhere.
function readCycle(file) {
  let document
  try {
    document = parse(readFileSync(file, 'utf-8'))
  } catch (error) {
    throw new Error(`${basename(file)}: ${error.message}`)
  }
  const name = typeof document.name === 'string' ? document.name : null
  if (!name) throw new Error(`${basename(file)}: a cycle declares a name`)
  if (!Array.isArray(document.steps) || document.steps.length === 0) {
    throw new Error(`${basename(file)}: a cycle declares at least one step`)
  }
  const steps = document.steps.map((step, index) => {
    if (!step || typeof step.name !== 'string') {
      throw new Error(`${basename(file)}: step ${index} declares no name`)
    }
    return {
      name: step.name,
      skill: typeof step.skill === 'string' ? step.skill : null,
      gated: step.gated === true,
      skippable: step.skippable === true,
    }
  })
  return { name, steps }
}

export function loadCycles(roots) {
  // Created without a prototype: an index that inherits answers for "constructor" and "toString",
  // and a lookup returning a function is truthy enough to be mistaken for a cycle.
  const index = Object.create(null)
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const file = join(root, entry.name, `${entry.name}.yaml`)
      if (!existsSync(file)) continue
      const cycle = readCycle(file)
      index[cycle.name] = cycle
    }
  }
  return index
}

// A name is looked up as a cycle first, then as a skill. A skill resolves to a cycle of one step,
// because a todo running a single skill is the same statement at a smaller size, and giving it a
// second shape would make every reader handle the special case forever.
export function resolveCycle(name, context = {}) {
  const cycles = context.cycles ?? {}
  if (name === undefined || name === null) {
    return Object.hasOwn(cycles, 'cyPhases') ? cycles.cyPhases : CYPHASES
  }
  if (typeof name === 'string' && Object.hasOwn(cycles, name)) return cycles[name]
  const skills = context.skills
  if (skills && skills.has(name)) {
    return { name, steps: [{ name, skill: name, gated: true, skippable: false }] }
  }
  return null
}
