// debug — dump raw claude mcp list output
import { execFileSync } from 'node:child_process'
import { it, expect } from 'vitest'

it('dump raw output', () => {
  let output
  try {
    output = execFileSync('claude', ['mcp', 'list'], {
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
  } catch (e) {
    output = (e.stdout || '') + '\n' + (e.stderr || '')
  }
  console.log('=== RAW OUTPUT ===')
  console.log(JSON.stringify(output))
  console.log('=== END ===')
  expect(output.length).toBeGreaterThan(0)
})
