// extensions/http-request/index.js — HTTP GET/POST tool for devMCP
// No blocklist — GET is read-only, POST is fire-and-forget.

async function httpRequest({ method, url, headers = {}, body }) {
  const m = (method || 'GET').toUpperCase()
  if (m !== 'GET' && m !== 'POST') {
    return { isError: true, text: `method must be GET or POST, got: ${m}` }
  }
  if (!url || typeof url !== 'string') {
    return { isError: true, text: 'url is required' }
  }

  const opts = {
    method: m,
    headers: { ...headers },
  }

  if (m === 'POST' && body !== undefined) {
    if (typeof body === 'object') {
      opts.body = JSON.stringify(body)
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json'
    } else {
      opts.body = String(body)
    }
  }

  try {
    const res = await fetch(url, opts)
    const contentType = res.headers.get('content-type') || ''
    let text
    if (contentType.includes('json')) {
      const json = await res.json()
      text = JSON.stringify(json, null, 2)
    } else {
      text = await res.text()
    }
    // Truncate large responses
    const MAX = 50_000
    if (text.length > MAX) {
      text = text.slice(0, MAX) + `\n\n... truncated (${text.length} chars total)`
    }
    return {
      isError: !res.ok,
      text: `${res.status} ${res.statusText}\n\n${text}`,
    }
  } catch (e) {
    return { isError: true, text: `fetch failed: ${e.message}` }
  }
}

export default [
  {
    name: 'http_request',
    description: 'Make an HTTP GET or POST request. Returns status code and response body.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url:     { type: 'string', description: 'URL to fetch' },
        method:  { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method (default: GET)' },
        headers: { type: 'object', description: 'Optional request headers' },
        body:    { description: 'Request body for POST (object → JSON, string → raw)' },
      },
    },
    handler: httpRequest,
  },
]
