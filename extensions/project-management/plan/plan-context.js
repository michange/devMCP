import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCycles } from './cycles.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// extensions/project-management/plan -> the devMCP root that ships the default cycles and skills.
const DEVMCP_SKILLS = resolve(join(__dirname, '../../..', 'skills'))

const lines = (projectPath, ...args) => new Set(execFileSync(
  'git', ['-C', projectPath, ...args], { encoding: 'utf8' }
).trim().split('\n').filter(Boolean))

// A skill is a `<name>.skill.md` file directly under a skills directory. The name a todo writes is
// the file name without that suffix, never a path: paths break when a directory moves, and a skill
// devMCP ships has no stable path inside a project.
function skillNames(...roots) {
  const names = new Set()
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root)) {
      if (entry.endsWith('.skill.md')) names.add(basename(entry, '.skill.md'))
    }
  }
  return names
}

export function validationContext(projectPath) {
  const root = resolve(projectPath)
  const worktreeLines = lines(root, 'worktree', 'list', '--porcelain')
  const projectSkills = join(root, 'skills')
  return {
    referenceExists: reference => {
      const candidate = resolve(root, reference)
      return candidate.startsWith(`${root}${sep}`) && existsSync(candidate)
    },
    branches: lines(root, 'branch', '--format=%(refname:short)'),
    worktrees: new Set([...worktreeLines]
      .filter(line => line.startsWith('worktree '))
      .map(line => basename(line.slice(9)))),
    // devMCP first, the project second: a later root overwrites an earlier one, so a project
    // redefines a shipped cycle without editing it. Read on every call, like the git queries above.
    cycles: loadCycles([join(DEVMCP_SKILLS, 'cycles'), join(projectSkills, 'cycles')]),
    skills: skillNames(DEVMCP_SKILLS, projectSkills),
  }
}
