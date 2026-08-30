// extensions/open-in-ide/index.js — open file in IDE (default: PhpStorm)
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { validatePath } from '../../validators.js'

const IDE_BINARY = '/Applications/PhpStorm.app/Contents/MacOS/phpstorm'

function openInIde({ path: rawPath, line }) {
  const path = validatePath(rawPath)

  if (!existsSync(path)) {
    return { isError: true, text: `file not found: ${path}` }
  }

  if (!existsSync(IDE_BINARY)) {
    return { isError: true, text: `IDE not found: ${IDE_BINARY}` }
  }

  const args = line ? ['--line', String(line), path] : [path]

  return new Promise((resolve) => {
    execFile(IDE_BINARY, args, { timeout: 10_000 }, (err) => {
      if (err) {
        resolve({ isError: true, text: `open failed: ${err.message}` })
      } else {
        const loc = line ? `${path}:${line}` : path
        resolve({ isError: false, text: `opened ${loc} in PhpStorm` })
      }
    })
  })
}

export default [
  {
    name: 'open_in_ide',
    description: 'Open a file in PhpStorm at an optional line number.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        line: { type: 'integer', description: 'Line number to jump to (optional)' },
      },
    },
    handler: openInIde,
  },
]
