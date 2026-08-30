// extensions/npm-install/index.js
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePath } from '../../validators.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECTS_ROOT = resolve(join(__dirname, '../../..')) // devMCP/extensions/npm-install → PhpstormProjects

export default [
  {
    name: 'npm_install',
    description: 'Run npm install in a directory containing a package.json. Path must be under the projects root.',
    inputSchema: {
      type: 'object',
      required: ['cwd'],
      properties: {
        cwd: { type: 'string', description: 'Absolute path to directory containing package.json' },
      },
    },
    handler({ cwd: rawCwd }) {
      const cwd = validatePath(rawCwd)

      if (!cwd.startsWith(PROJECTS_ROOT + '/')) {
        return { isError: true, text: `path must be under ${PROJECTS_ROOT}: ${cwd}` }
      }

      if (!existsSync(join(cwd, 'package.json'))) {
        return { isError: true, text: `no package.json found in: ${cwd}` }
      }

      try {
        const output = execFileSync('npm', ['install'], {
          cwd,
          encoding: 'utf-8',
          timeout: 60_000,
        })
        return { isError: false, text: output || 'npm install completed.' }
      } catch (e) {
        return { isError: true, text: (e.stdout || '') + '\n' + (e.stderr || '') + `\nexit: ${e.status}` }
      }
    },
  },
]
