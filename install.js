#!/usr/bin/env node
// install.js — Register devMCP in Claude Desktop config AND Claude CLI config.
// Usage: node install.js

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER_SCRIPT = resolve(join(__dirname, 'mcp-server.js'))

const home = process.env.HOME || ''
const name = 'devMCP'
const serverDef = { command: 'node', args: [SERVER_SCRIPT] }

let ok = true

// --- 1. Claude Desktop config ---
const desktopConfigPath = join(home, 'Library/Application Support/Claude/claude_desktop_config.json')
try {
  const raw = existsSync(desktopConfigPath) ? readFileSync(desktopConfigPath, 'utf-8') : '{}'
  const config = JSON.parse(raw)
  if (!config.mcpServers) config.mcpServers = {}
  config.mcpServers[name] = serverDef
  writeFileSync(desktopConfigPath, JSON.stringify(config, null, 2))
  console.log(`✅ Desktop config: ${desktopConfigPath}`)
} catch (e) {
  console.log(`❌ Desktop config failed: ${e.message}`)
  ok = false
}

// --- 2. Claude CLI config (no shell — execFileSync) ---
try {
  try { execFileSync('claude', ['mcp', 'remove', name, '-s', 'user'], { encoding: 'utf-8', timeout: 10_000 }) } catch {}
  const cliConfig = { type: 'stdio', ...serverDef }
  execFileSync('claude', ['mcp', 'add-json', name, JSON.stringify(cliConfig), '--scope', 'user'], { encoding: 'utf-8', timeout: 10_000 })
  console.log(`✅ CLI config: ~/.claude.json (scope=user)`)
} catch (e) {
  console.log(`⚠️  CLI config failed (claude CLI not found?): ${e.message}`)
}

// --- Done ---
if (ok) {
  console.log(`\n${name} installed. Server: ${SERVER_SCRIPT}`)
  console.log('\nNext steps:')
  console.log('  1. Restart Claude Desktop (Cmd+Q then reopen)')
  console.log('  2. Start a new conversation')
  console.log('  3. If using CLI: start a new claude session')
  console.log(`\nTools available: run_tests, self_test, enable_mcp, register_mcp, restart_desktop`)
} else {
  console.log('\n⚠️  Partial install. Check errors above.')
  process.exit(1)
}
