import { build } from 'esbuild'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const g = globalThis
g.window = dom.window
g.document = dom.window.document
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true })
g.HTMLElement = dom.window.HTMLElement
g.HTMLInputElement = dom.window.HTMLInputElement
g.Node = dom.window.Node
g.Element = dom.window.Element
g.Event = dom.window.Event
g.MouseEvent = dom.window.MouseEvent
g.KeyboardEvent = dom.window.KeyboardEvent
g.getComputedStyle = dom.window.getComputedStyle
g.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0)
g.cancelAnimationFrame = (id) => clearTimeout(id)
g.IS_REACT_ACT_ENVIRONMENT = true
const mm = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
g.matchMedia = mm
dom.window.matchMedia = mm

const store = new Map()
const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() }
g.localStorage = ls
Object.defineProperty(dom.window, 'localStorage', { value: ls, configurable: true })

await build({
  entryPoints: ['qa/render-check.jsx'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: new URL('./.bundle.mjs', import.meta.url).pathname,
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  external: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'lucide-react'],
  logLevel: 'error',
})

const mod = await import(`./.bundle.mjs?v=${Date.now()}`)
const mode = process.argv[2] || 'anon'
const sessions = {
  admin: { userId: 'adm_1', role: 'admin' },
  user: { userId: 'usr_aarav', role: 'user' },
  priya: { userId: 'usr_priya', role: 'user' },
  newbie: { userId: 'usr_new_user_qa', role: 'user' },
}
if (sessions[mode]) {
  const base = mod.buildSeed()
  if (mode === 'newbie') {
    base.users.push({ id: 'usr_new_user_qa', name: 'Qa Tester', email: 'qa@x.com', password: 'demo1234', role: 'user', title: 'QA', location: 'Remote', phone: '', goal: 5, status: 'active', joinedAt: new Date().toISOString(), lastActive: new Date().toISOString(), plan: 'Free', avatarColor: '#191714', bio: '', resumes: [] })
  }
  ls.setItem('hiretrail.state.v1', JSON.stringify({ ...base, session: sessions[mode], impersonate: mode === 'admin' ? null : null }))
}

let failed = 0
for (const route of mod.routes) {
  const r = await mod.renderRoute(route)
  if (r.ok) console.log(`  ok   ${route.padEnd(24)} ${r.len} chars`)
  else {
    failed += 1
    console.log(`  FAIL ${route.padEnd(24)} ${r.len} chars`)
    r.errors.slice(0, 4).forEach((e) => console.log(`       ${e.slice(0, 320)}`))
  }
}
console.log(`\n${mode}: ${mod.routes.length - failed}/${mod.routes.length} routes mounted cleanly`)
process.exit(failed ? 1 : 0)
