# http-request — fetch a URL and read what comes back

## Problem

Some answers live behind an HTTP endpoint: a local server's health route, a JSON API, a page whose
content settles a question. Without this tool the agent has no way to reach one, because the `bash`
extension rejects `curl` and `wget`.

## Solution

The extension exposes one tool, `http_request`, built on the global `fetch`. It accepts `GET` and
`POST` and rejects every other method. `GET` reads without changing anything, and `POST` is
fire-and-forget: the tool sends the body and reports the response without tracking what the endpoint
then does.

There is no allowlist and no blocklist of hosts. Any URL the process can reach, this tool can reach,
including addresses on the local network.

## Response handling

When the response carries a `content-type` containing `json`, the body is parsed and re-serialised
with two-space indentation, so the caller reads formatted JSON rather than one long line. Otherwise
the body is returned as text.

A body longer than 50 000 characters is truncated, and the truncation is stated in the returned text
along with the full length. Without that cap a single large page would fill the context window.

The returned text always begins with the status line, for example `404 Not Found`. `isError` follows
`res.ok`, so a 4xx or 5xx response is reported as an error while still returning its body, which is
usually where the explanation is.

## Tool

`http_request` requires `url`. `method` defaults to `GET`. `headers` is an optional object. `body`
applies to `POST`: an object is serialised as JSON and given a `Content-Type: application/json` header
unless the caller set one, and anything else is sent as a string.

## Tests

None of its own.
