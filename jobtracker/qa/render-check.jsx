/* Route smoke test: mounts every route in jsdom via react-dom/client, exactly
   like the browser does (portals, effects, state). Fails on any console error
   or thrown exception. Run with: node qa/run.mjs user|admin|anon */
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'
import { StoreProvider } from '../src/lib/store.jsx'
export { buildSeed } from '../src/lib/seed.js'

export const routes = [
  '/', '/login', '/register',
  '/app', '/app/applications', '/app/calendar', '/app/tasks', '/app/insights',
  '/app/resumes', '/app/notifications', '/app/profile', '/app/settings',
  '/admin', '/admin/users', '/admin/applications', '/admin/activity',
  '/admin/broadcast', '/admin/settings',
]

export async function renderRoute(route) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const errors = []
  const origError = console.error
  console.error = (...args) => { errors.push(args.map(String).join(' ')); }
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[route]}>
          <StoreProvider>
            <App />
          </StoreProvider>
        </MemoryRouter>,
      )
    })
  } catch (err) {
    errors.push(err.message)
  }
  console.error = origError
  const html = host.innerHTML
  await act(async () => { root.unmount() })
  host.remove()
  return { route, ok: errors.length === 0 && html.length > 200, len: html.length, errors }
}
