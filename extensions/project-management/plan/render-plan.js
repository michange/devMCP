const title = value => value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ')

const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const WP_EMOJIS = ['🧭', '🧩', '🧬', '🗺️', '🌿', '🔭', '📡', '🔌', '🚀', '🧹', '🛤️', '🛠️', '🌉', '🖥️', '🔧']
const wpEmoji = name => WP_EMOJIS[[...name].reduce((sum, character) => sum + character.codePointAt(0), 0) % WP_EMOJIS.length]
const stateClass = status => status === 'complete'
  ? 'complete'
  : ['active', 'ready', 'in-progress', 'blocked'].includes(status) ? 'ongoing' : 'todo'

function htmlLink(reference) {
  const path = reference.slice(2)
  const slash = path.lastIndexOf('/') + 1
  const dot = path.lastIndexOf('.')
  const prefix = path.slice(0, slash)
  const semantic = path.slice(slash, dot)
  const extension = path.slice(dot)
  return `<a href="../${escapeHtml(path)}">${escapeHtml(prefix)}<mark>${escapeHtml(semantic)}</mark>${escapeHtml(extension)}</a>`
}

const htmlLinks = references => references.length === 0
  ? '<em>contract gap</em>'
  : references.map(htmlLink).join(', ')

const htmlExecution = execution => execution
  ? `<div class="execution">CLI: <code>${execution.cli}</code>${execution.session ? ` — session: <code>${escapeHtml(execution.session)}</code>` : ''}</div>`
  : ''

function htmlTodos(todos) {
  if (todos.length === 0) return ''
  const items = todos.map(todo => {
    const state = stateClass(todo.status)
    const open = todo.status === 'complete' ? '' : ' open'
    const phases = todo.cybuild.map(phase => {
      const checked = ['complete', 'skipped'].includes(phase.status) ? ' checked' : ''
      return `<label class="cybuild-${phase.status}"><input type="checkbox" disabled${checked}> ${escapeHtml(phase.step)} <small>${phase.status}</small></label>`
    }).join('')
    return `<li><details class="todo-item"${open}><summary><span class="name ${state}">${escapeHtml(todo.path)}</span> <code>${todo.status}</code> — ${todo.workspace.kind}: <code>${escapeHtml(todo.workspace.name)}</code> — cycle: <code>${escapeHtml(todo.cycle ?? 'none')}</code></summary><div class="todo-body">${htmlExecution(todo.execution)}<div class="contracts">Contracts: ${htmlLinks(todo.contracts)}</div><fieldset><legend>Cybuild</legend>${phases}</fieldset>${htmlTodos(todo.todos)}</div></details></li>`
  }).join('')
  return `<ul>${items}</ul>`
}

export function renderPlanHtml(plan) {
  const project = plan.project
  const versions = project.versions.map(version => {
    const packages = version.workPackages.map(workPackage => {
      const state = stateClass(workPackage.status)
      const open = workPackage.status === 'complete' ? '' : ' open'
      return `<details class="work-package"${open}><summary class="${state}"><span class="wp-emoji" aria-hidden="true">${wpEmoji(workPackage.name)}</span> ${escapeHtml(workPackage.name)} <code>${workPackage.status}</code></summary><div class="work-package-body">${htmlExecution(workPackage.execution)}<div class="contracts">Contracts: ${htmlLinks(workPackage.contracts)}</div>${htmlTodos(workPackage.todos)}</div></details>`
    }).join('')
    return `<h2>Version ${escapeHtml(version.name)} <code>${version.status}</code></h2><p>Specification: ${htmlLink(version.specification)}</p>${packages}`
  }).join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.name)} plan</title><style>
body{font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1.25rem;color:#1f2937}h1,h2{border-bottom:1px solid #d1d5db;padding-bottom:.35rem}.work-package{margin:1rem 0;border:1px solid #e5e7eb;border-radius:.5rem}.work-package summary{cursor:pointer;font-size:1.17em;font-weight:700;padding:1rem}.wp-emoji{display:inline-block;width:1.6em;text-align:center}.work-package-body{padding:0 1rem 1rem}.todo-item>summary{cursor:pointer;padding:.25rem}.todo-body{padding:.35rem 0 .75rem 1.25rem}.todo-body fieldset{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.3rem;margin:.6rem 0;border:1px solid #e5e7eb}.todo-body label{white-space:nowrap}.cybuild-complete,.cybuild-skipped{color:#6b7280}.cybuild-in-progress{color:#dc2626}.cybuild-pending{color:#d97706}.complete{color:#6b7280}.ongoing{color:#dc2626}.todo{color:#d97706}.name{font-weight:700}code{background:#f3f4f6;padding:.1rem .3rem;border-radius:.25rem;color:inherit}ul{margin:.5rem 0}.contracts{font-size:.9rem;color:#4b5563}mark{background:#fde68a;padding:.05rem .15rem;border-radius:.2rem}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
</style></head><body><h1>${escapeHtml(title(project.name))} plan</h1><p>Repository: <code>${escapeHtml(project.repo)}</code><br>Remote: <code>${escapeHtml(project.remote)}</code><br>Documentation: ${htmlLink(project.documentation)}</p>${versions}</body></html>
`
}
