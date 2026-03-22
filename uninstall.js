#!/usr/bin/env node
// uninstall.js — Remove devMCP from Claude Desktop and CLI configs.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

console.log('\ndevMCP uninstaller\n')

// 1. Remove from Desktop config
const desktopConfigPath = join(process.env.HOME || '', 'Library/Application Support/Claude/claude_desktop_config.json')
try {
    if (existsSync(desktopConfigPath)) {
        const config = JSON.parse(readFileSync(desktopConfigPath, 'utf-8'))
        if (config.mcpServers && config.mcpServers.devMCP) {
            delete config.mcpServers.devMCP
            writeFileSync(desktopConfigPath, JSON.stringify(config, null, 2))
            // Verify
            const verify = JSON.parse(readFileSync(desktopConfigPath, 'utf-8'))
            if (!verify.mcpServers?.devMCP) {
                console.log('✅ Removed from Desktop config (verified)')
            } else {
                console.log('❌ Desktop config removal FAILED — entry still present')
                process.exit(1)
            }
        } else {
            console.log('⏭️  Not in Desktop config (already clean)')
        }
    } else {
        console.log('⏭️  Desktop config file not found')
    }
} catch (e) {
    console.log('❌ Desktop config:', e.message)
}

// 2. Remove from CLI config
try {
    execFileSync('claude', ['mcp', 'remove', 'devMCP', '-s', 'user'], { encoding: 'utf-8', timeout: 10_000 })
    console.log('✅ Removed from CLI config')
} catch (e) {
    console.log('⏭️  Not in CLI config (already clean)')
}

console.log('\ndevMCP uninstalled.')
console.log('\nNext steps:')
console.log('  1. Restart Claude Desktop (Cmd+Q then reopen)')
console.log('  2. Remove boot check instructions from CLAUDE.md or project settings if added')