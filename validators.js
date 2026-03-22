// validators.js — Shared input validation for devMCP core and extensions.
// Zero dependencies. Imported by mcp-server.js and extensions.

import { resolve, isAbsolute } from 'node:path'

export function validatePath(p) {
  if (typeof p !== 'string' || !p.trim()) throw new Error('path is required')
  if (!isAbsolute(p)) throw new Error(`path must be absolute: ${p}`)
  if (/[;&|`$(){}!#\n\r]/.test(p)) throw new Error(`path contains forbidden characters: ${p}`)
  return resolve(p)
}

export function validateName(n) {
  if (typeof n !== 'string' || !n.trim()) throw new Error('name is required')
  if (!/^[a-zA-Z0-9_-]+$/.test(n)) throw new Error(`name must be alphanumeric/dash/underscore only: ${n}`)
  return n
}

export function validateCommand(c) {
  if (typeof c !== 'string' || !c.trim()) throw new Error('command is required')
  if (!/^[a-zA-Z0-9_./-]+$/.test(c)) throw new Error(`command contains forbidden characters: ${c}`)
  return c
}

export function validateArgs(args) {
  if (!args) return []
  if (!Array.isArray(args)) throw new Error('args must be an array')
  return args.map((a, i) => {
    if (typeof a !== 'string') throw new Error(`args[${i}] must be a string`)
    if (/[;&|`$(){}!#\n\r]/.test(a)) throw new Error(`args[${i}] contains forbidden characters: ${a}`)
    return a
  })
}
