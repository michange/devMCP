import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve, sep } from 'node:path'

const lines = (projectPath, ...args) => new Set(execFileSync(
  'git', ['-C', projectPath, ...args], { encoding: 'utf8' }
).trim().split('\n').filter(Boolean))

export function validationContext(projectPath) {
  const root = resolve(projectPath)
  const worktreeLines = lines(root, 'worktree', 'list', '--porcelain')
  return {
    referenceExists: reference => {
      const candidate = resolve(root, reference)
      return candidate.startsWith(`${root}${sep}`) && existsSync(candidate)
    },
    branches: lines(root, 'branch', '--format=%(refname:short)'),
    worktrees: new Set([...worktreeLines]
      .filter(line => line.startsWith('worktree '))
      .map(line => basename(line.slice(9))))
  }
}
