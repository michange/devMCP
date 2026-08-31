# Serving a capability

Some capabilities of devMCP answer a question a person needs to look at, not only a question an agent
needs to read. The first of them crosses git worktrees, the mission registry and the current plan to
say who occupies which worktree and where each session works.

Such a capability has to be reachable two ways: from devMCP alone, in a repository that knows nothing
of any other application, and from inside a host application that already serves pages to the person
piloting the work. This document defines what makes both possible without writing the capability
twice.

## The shared thing is the capability, not the server

A capability owns four things: it reads its live sources, it builds a view model, it renders that
model, and it answers an HTTP request. It owns no server.

Two adapters mount it. One is a standalone `node:http` server, which devMCP starts and stops through
its own tools. The other belongs to a host application and mounts the same capability under that
application's routes. Neither adapter reads a source, crosses anything, or decides anything: an
adapter translates a protocol.

That separation is what keeps the two mountings from diverging. They cannot disagree about who
occupies a worktree, because there is one implementation of the crossing and both call it.

## The request contract is the fetch interface

A capability exposes one function taking a `Request` and returning a `Response`:

```js
export function handle(request) {
  const url = new URL(request.url)
  if (url.pathname === '/worktrees') {
    return new Response(renderView(readSources()), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }
  return new Response('not found', { status: 404 })
}
```

`Request`, `Response` and `Headers` are defined by the [WHATWG Fetch
Standard](https://fetch.spec.whatwg.org/), sections 5.4, 5.5 and 5.1. Server runtimes are required
to provide them by [ECMA-429, the Minimum common web
API](https://github.com/WinterTC55/proposal-minimum-common-api), standardised by [Ecma TC55,
WinterTC](https://ecma-international.org/technical-committees/tc55/) — the committee that
[succeeded WinterCG in January 2025](https://www.w3.org/community/wintercg/2025/01/10/goodbye-wintercg-welcome-wintertc/).

They are globals in Node, so using them costs no import and no package: `dependencies` stays empty.
The same shape is what Deno, Bun, Cloudflare Workers and Vercel expose, so a capability written this
way runs unchanged wherever the interface exists.

Inventing a private `{ method, path, query }` to `{ status, headers, body }` shape would restate this
in a vocabulary nobody else speaks, without streaming, without a typed body, and without
case-insensitive headers.

## What each adapter has to do

Node's `http` module predates this interface, so the standalone adapter converts in both directions:
an `IncomingMessage` becomes a `Request`, and a `Response` is written onto a `ServerResponse`. A host
application running Express 4 needs the same two conversions. Each is short, each is written once,
and neither carries a decision.

An adapter that finds itself reading a file or crossing two sources is in the wrong place.

## Nothing is written to disk

The answer is computed on every request. A worktree view saved to a file is wrong as soon as one
session opens or closes, and a stale file misleads for far longer than a stale answer, because
nothing tells its reader when it was written.

## The capability works without a host

devMCP is installed in repositories that know nothing of any host application. A capability whose
pages are only reachable through a host is therefore unavailable in most places devMCP runs.

The standalone mounting is not a development convenience. It is the mounting that has to work, and
the host mounting is the one that may be absent.

## The two mountings together

Both may run at once. They read the same live sources through the same code, so neither has to be
refreshed when the other changes something. Ports and route namespaces stay distinct, and a failure
of one leaves the other serving.
