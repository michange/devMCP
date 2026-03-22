#!/usr/bin/env node
// install.js — Install devMCP in Claude Desktop and CLI configs.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serverPath = join(__dirname, 'mcp-server.js')
const serverDef = { command: 'node', args: [serverPath] }

console.log(`\ndevMCP installer`)
console.log(`Server: ${serverPath}\n`)

// --- Pre-checks ---
if (!existsSync(serverPath)) {
  console.log('❌ mcp-server.js not found at', serverPath)
  process.exit(1)
}
console.log('✅ mcp-server.js found')

// 1. Desktop config
const desktopConfigPath = join(process.env.HOME || '', 'Library/Application Support/Claude/claude_desktop_config.json')
try {
  const raw = existsSync(desktopConfigPath) ? readFileSync(desktopConfigPath, 'utf-8') : '{}'
  const config = JSON.parse(raw)
  if (!config.mcpServers) config.mcpServers = {}
  config.mcpServers.devMCP = serverDef
  writeFileSync(desktopConfigPath, JSON.stringify(config, null, 2))
  // Verify write
  const verify = JSON.parse(readFileSync(desktopConfigPath, 'utf-8'))
  if (verify.mcpServers?.devMCP?.args?.[0] === serverPath) {
    console.log('✅ Desktop config written and verified:', desktopConfigPath)
  } else {
    console.log('❌ Desktop config write verification FAILED')
    process.exit(1)
  }
} catch (e) {
  console.log('❌ Desktop config:', e.message)
  process.exit(1)
}

// 2. CLI config
try {
  try { execFileSync('claude', ['mcp', 'remove', 'devMCP', '-s', 'user'], { encoding: 'utf-8', timeout: 10_000 }) } catch {}
  const cliConfig = { type: 'stdio', ...serverDef }
  execFileSync('claude', ['mcp', 'add-json', 'devMCP', JSON.stringify(cliConfig), '--scope', 'user'], { encoding: 'utf-8', timeout: 10_000 })
  console.log('✅ CLI config written (scope=user)')
} catch (e) {
  console.log('⚠️  CLI config failed (Claude CLI not installed?):', e.message)
}

// --- Summary ---
console.log('\ndevMCP installed.')
console.log(`Server: ${serverPath}`)
console.log('\nNext steps:')
console.log('  1. Restart Claude Desktop (Cmd+Q then reopen)')
console.log('  2. Start a new conversation')
console.log('  3. If using CLI: start a new claude session')
console.log('\nTools available: run_tests, self_test, enable_mcp, register_mcp, restart_desktop')