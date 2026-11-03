// Run Playwright on a port that is actually free.
//
// The port is chosen here, once, and passed to Playwright and its workers
// through the environment. Choosing it inside playwright.config.ts does not
// work: each worker re-imports the config and would pick a different port.
import { spawn } from 'node:child_process'
import { freePort } from './free-port.mjs'

const port = Number(process.env.E2E_PORT) || (await freePort())
console.log(`e2e: using port ${port}`)

const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, E2E_PORT: String(port) },
})
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)))
