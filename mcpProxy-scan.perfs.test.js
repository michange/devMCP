// mcpProxy-scan.perfs.test.js — benchmark: list vs self-scan vs parallel
import { it, expect } from 'vitest'
import { performance } from 'node:perf_hooks'
import { execFile } from 'node:child_process'
import mcpListExt from './extensions/mcp-list/index.js'
import mcpSelfScanExt from './extensions/mcp-self-scan/index.js'

const listTool = mcpListExt[0]
const scanTool = mcpSelfScanExt[0]
const PROJECT = '/Users/mic/PhpstormProjects/naude-new'
const RUNS = 5

function runList() {
  const t0 = performance.now()
  const result = listTool.handler({ projectRoot: PROJECT, noCache: true })
  return { json: JSON.parse(result.text), elapsed: performance.now() - t0 }
}

function runScanSync() {
  const t0 = performance.now()
  const result = scanTool.handler({})
  return { json: JSON.parse(result.text), elapsed: performance.now() - t0 }
}

function runScanAsync() {
  return new Promise((resolve) => {
    const t0 = performance.now()
    execFile('claude', ['mcp', 'list'], {
      encoding: 'utf-8', timeout: 30_000,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    }, (err, stdout, stderr) => {
      const output = (stdout || '') + (stderr || '')
      const elapsed = performance.now() - t0
      const servers = {}
      for (const line of output.split('\n')) {
        if (!line.trim()) continue
        const match = line.match(/^(.+?):\s+(.+)$/)
        if (!match) continue
        const [, name, detail] = match
        let transport = detail.trim()
        let type = 'stdio'
        if (transport.match(/^https?:\/\//)) {
          type = 'http'
          transport = transport.replace(/\s*\(HTTP\)\s*$/, '')
        }
        servers[name.trim()] = { type, transport }
      }
      resolve({ json: { servers, _meta: { method: 'preflight-async', elapsedMs: elapsed } }, elapsed })
    })
  })
}

async function runParallel() {
  const t0 = performance.now()
  const [listResult, scanResult] = await Promise.all([
    Promise.resolve(runList()),
    runScanAsync(),
  ])
  return { list: listResult, scan: scanResult, totalElapsed: performance.now() - t0 }
}

function stats(times) {
  const sorted = [...times].sort((a, b) => a - b)
  return {
    min: sorted[0].toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
    avg: (sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2),
    median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
  }
}

it('benchmark: list vs self-scan vs parallel', async () => {
  // Condition 1: list only
  const listTimes = []
  let listJson
  for (let i = 0; i < RUNS; i++) {
    const r = runList()
    listTimes.push(r.elapsed)
    if (i === 0) listJson = r.json
  }

  // Condition 2: self-scan only (sync)
  const scanTimes = []
  let scanJson
  for (let i = 0; i < RUNS; i++) {
    const r = runScanSync()
    scanTimes.push(r.elapsed)
    if (i === 0) scanJson = r.json
  }

  // Condition 3: parallel
  const parallelTimes = []
  let pListJson, pScanJson
  for (let i = 0; i < RUNS; i++) {
    const r = await runParallel()
    parallelTimes.push(r.totalElapsed)
    if (i === 0) { pListJson = r.list.json; pScanJson = r.scan.json }
  }

  const listS  = stats(listTimes)
  const scanS  = stats(scanTimes)
  const paraS  = stats(parallelTimes)

  console.log('')
  console.log('=== mcpProxy scan benchmark ===')
  console.log(`Runs: ${RUNS}`)
  console.log('')
  console.log('CONDITION 1 — mcp_list (file-based, noCache)')
  console.log(`  times:   ${listTimes.map(t => t.toFixed(2) + 'ms').join(', ')}`)
  console.log(`  stats:   min=${listS.min} avg=${listS.avg} median=${listS.median} max=${listS.max}`)
  console.log(`  servers: ${Object.keys(listJson.servers).join(', ')}`)
  console.log('')
  console.log('CONDITION 2 — mcp_self_scan (preflight CLI, sync)')
  console.log(`  times:   ${scanTimes.map(t => t.toFixed(2) + 'ms').join(', ')}`)
  console.log(`  stats:   min=${scanS.min} avg=${scanS.avg} median=${scanS.median} max=${scanS.max}`)
  console.log(`  servers: ${Object.keys(scanJson.servers).join(', ')}`)
  console.log('')
  console.log('CONDITION 3 — list + self_scan in PARALLEL (async)')
  console.log(`  times:   ${parallelTimes.map(t => t.toFixed(2) + 'ms').join(', ')}`)
  console.log(`  stats:   min=${paraS.min} avg=${paraS.avg} median=${paraS.median} max=${paraS.max}`)
  console.log(`  list servers: ${Object.keys(pListJson.servers).join(', ')}`)
  console.log(`  scan servers: ${Object.keys(pScanJson.servers).join(', ')}`)
  console.log('')

  const listAvg = parseFloat(listS.avg)
  const scanAvg = parseFloat(scanS.avg)
  const paraAvg = parseFloat(paraS.avg)

  console.log('=== SUMMARY ===')
  console.log(`  list:             ${listAvg}ms`)
  console.log(`  scan:             ${scanAvg}ms`)
  console.log(`  parallel:         ${paraAvg}ms`)
  console.log(`  overhead:         ${(paraAvg - scanAvg).toFixed(2)}ms vs scan alone`)
  console.log(`  parallel/scan:    ${(paraAvg / scanAvg).toFixed(2)}x`)
  console.log(`  verdict:          ${paraAvg < scanAvg * 1.1 ? 'FREE — parallel adds no cost' : 'OVERHEAD'}`)
  console.log('')

  // Server diff
  const lN = Object.keys(pListJson.servers).sort()
  const sN = Object.keys(pScanJson.servers).sort()
  const onlyList = lN.filter(n => !sN.includes(n))
  const onlyScan = sN.filter(n => !lN.includes(n))
  const common   = lN.filter(n => sN.includes(n))

  console.log('=== SERVER DIFF ===')
  console.log(`  common:       ${common.join(', ')}`)
  if (onlyList.length) console.log(`  only in list: ${onlyList.join(', ')}`)
  if (onlyScan.length) console.log(`  only in scan: ${onlyScan.join(', ')}`)
  if (!onlyList.length && !onlyScan.length) console.log('  result:       IDENTICAL')
  console.log('')
  console.log('=== JSON: mcp_list ===')
  console.log(JSON.stringify(pListJson, null, 2))
  console.log('')
  console.log('=== JSON: mcp_self_scan ===')
  console.log(JSON.stringify(pScanJson, null, 2))

  expect(listAvg).toBeLessThan(scanAvg)
  expect(paraAvg / scanAvg).toBeLessThan(1.5)
}, 120_000)
