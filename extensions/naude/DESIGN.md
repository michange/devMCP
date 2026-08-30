# naude — start, stop and restart the naude server

## Problem

Working on the naude application means restarting its server constantly, and a restart done by hand
loses the instance identity. Restarting on the default port when the session was running a
configured instance moves the work to a different port and a different instance directory without
saying so.

A stopped server also does not always release its port. An orphan process holding the port makes the
next start fail with an error that names the port and not the cause.

## Solution

The extension exposes four tools. Three drive the naude server, and the fourth frees a port.

`naude_start` spawns the entry point, optionally with a config file, and opens the browser once. When
the server is already running it opens the browser and does nothing else. The config path is
remembered in `_lastConfigPath`.

`naude_stop` tries three ways in order: the in-memory process handle, then the PID written to
`logs/naude.pid` by the boot sequence, then whatever holds port 1967. The second exists because the
server restarts itself over its WebSocket connection, which leaves the in-memory handle stale. A PID
file naming a dead process is reported as such rather than treated as a failure.

`naude_restart` reuses `_lastConfigPath`, so the instance keeps its port and its instance directory.
It stops the running process, respawns with the same arguments, then polls `/health` every 250 ms for
up to five seconds and returns only once the server answers. A restart that returns without that poll
would report success while the port was still closed.

`kill_port` sends `SIGTERM` to every process listening on a given port and reports how many it killed
and their PIDs. It is the escape hatch for an orphan instance, and it is not specific to naude.

## Paths

The entry point, the root and the PID file are absolute constants pointing into
`/Users/mic/PhpstormProjects/naude-new`. The extension works on that installation only.

## Note on kill_port

`kill_port` is documented in several places as a core tool. It is not. It lives here, and removing
this extension removes it.

## Tests

None of its own. Three cases in `mcp-server.unit.test.js` cover `naude_restart`, isolated on port 9876
so they never touch a running instance.
