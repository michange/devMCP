// extensions/project-management/index.js — publish Enigma project plans.
//
// The plan machinery under ./plan/ is a verbatim copy of the enigma plan-mcp server's modules.
// See ORIGIN.md for its provenance and for the rule on keeping the two copies in step.
import { writePlan } from './plan/plan-writer.js'

const REQUIRED = ['projectPath', 'baseVersion', 'plan', 'cliName', 'sessionID', 'wp', 'todo']

async function write(args) {
  const missing = REQUIRED.filter((name) => args[name] === undefined)
  if (missing.length) {
    return { isError: true, text: `missing arguments: ${missing.join(', ')}` }
  }
  try {
    const result = await writePlan(args)
    return { isError: !result.valid, text: JSON.stringify(result, null, 2) }
  } catch (e) {
    return { isError: true, text: `write_plan failed: ${e.message}` }
  }
}

export default [
  {
    name: 'write_plan',
    description:
      'Atomically validate and publish the next canonical project plan JSON, archive its predecessor, ' +
      'and render the adjacent HTML projection. Requires plans/plan-<baseVersion>.json to exist: this ' +
      'tool publishes the NEXT plan, it does not create the first one. Returns {valid, version, warnings} ' +
      'on success; on refusal, {valid:false} with errors, attribution (mine/inherited/unknown), ' +
      'missingContracts, or a code such as PLAN_STALE or PLAN_LOCK_LOST. Pass stubMissingContracts only ' +
      'after the user has agreed to the exact list of documents to create.',
    inputSchema: {
      type: 'object',
      required: REQUIRED,
      additionalProperties: false,
      properties: {
        projectPath: { type: 'string', minLength: 1, description: 'Absolute repository root holding docs/ and plans/' },
        baseVersion: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$', description: 'SemVer of the plan being replaced' },
        plan: { type: 'object', description: 'Complete replacement plan, not a patch' },
        cliName: { type: 'string', minLength: 1 },
        sessionID: { type: 'string', minLength: 1 },
        wp: { type: 'string', minLength: 1, description: 'Work package this mutation belongs to' },
        todo: { type: 'string', minLength: 1, description: 'Todo path this mutation belongs to' },
        stubMissingContracts: { type: 'boolean', description: 'Create title-and-one-sentence stubs for missing contracts' },
      },
    },
    handler: write,
  },
]
