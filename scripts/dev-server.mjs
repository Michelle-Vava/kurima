// Start a Vite dev server for a script to drive, and actually stop it again.
//
// The subtlety that cost five orphaned servers: `npx vite` is two processes,
// and killing the npx wrapper leaves the vite behind holding its port. So the
// child is started as its own process group leader (`detached`) and the whole
// group is signalled on the way out.
import { spawn } from 'node:child_process'
import { freePort } from './free-port.mjs'

/**
 * Start a dev server on a free port, or use BASE_URL if one is already
 * running. Returns the base URL and a `stop` that is safe to call twice.
 */
export async function startDevServer() {
  if (process.env.BASE_URL) return { base: process.env.BASE_URL, stop: async () => {} }

  const port = Number(process.env.E2E_PORT) || (await freePort())
  const base = `http://localhost:${port}`
  const child = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  })

  let stopped = false
  const stop = async () => {
    if (stopped) return
    stopped = true
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      // Already gone, or never started a group: nothing left to stop.
    }
  }
  // A crash or a Ctrl-C must not leave a server listening either.
  for (const signal of ['exit', 'SIGINT', 'SIGTERM']) process.once(signal, stop)

  await waitFor(base)
  return { base, stop }
}

async function waitFor(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`dev server never came up at ${url}`)
}
