// Print a free TCP port. Used by the Playwright config and the screenshot
// script so a busy port never blocks a run: nothing already listening is
// touched, we just pick somewhere else.
import { createServer } from 'node:net'

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await freePort())
