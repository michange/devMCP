// extensions/project-management/plan-fixture.js — the plan shape both test files build on.
export const CYBUILD_STEPS = ['PRE-READ', 'PURPOSE', 'TEST PLAN', 'RED', 'GREEN',
  'REGRESSION', 'DEMO/DOCS', 'REVIEW', 'COMMIT']

export const seedPlan = (contract) => ({
  project: {
    name: 'probe', repo: '.', remote: 'origin', documentation: contract,
    versions: [{
      name: 'v1', status: 'active', specification: contract,
      workPackages: [{
        name: 'WP1-probe', status: 'active', contracts: [contract],
        todos: [{
          path: 'WP1-probe.first', status: 'in-progress',
          workspace: { kind: 'branch', name: 'main' },
          contracts: [contract],
          cybuild: CYBUILD_STEPS.map((step) => ({ step, status: 'pending' })),
          todos: [],
        }],
      }],
    }],
  },
})
