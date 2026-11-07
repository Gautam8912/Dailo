import { useState } from 'react'
import { Settings as SettingsIcon, Save, RotateCcw, Database, ShieldCheck, AlertTriangle, Globe, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { Button, Field, Input, Select, Switch, Tag } from '../../components/ui.jsx'

export default function AdminSettings() {
  const { settings, dispatch, toast, users, applications } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...settings })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = () => {
    dispatch({ type: 'updateSettings', patch: form })
    toast('Platform settings saved')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Configuration</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Platform settings</h1>
          <p className="page-sub">Global defaults that apply to every user workspace.</p>
        </div>
        <Button variant="dark" icon={Save} onClick={save}>Save settings</Button>
      </div>

      <div className="grid g-split">
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <Globe size={15} style={{ color: 'var(--clay)' }} />
              <span className="eyebrow">Brand</span>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <div className="grid g2" style={{ gap: 9 }}>
                <Field label="Site name"><Input value={form.siteName} onChange={(e) => set('siteName', e.target.value)} /></Field>
                <Field label="Support email"><Input type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
              </div>
              <Field label="Tagline"><Input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
              <div className="grid g2" style={{ gap: 9 }}>
                <Field label="Digest day">
                  <Select value={form.digestDay} onChange={(e) => set('digestDay', e.target.value)}>
                    {['sunday', 'monday', 'friday'].map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
                  </Select>
                </Field>
                <Field label="Default weekly goal">
                  <Input type="number" min="1" max="30" value={form.defaultGoal} onChange={(e) => set('defaultGoal', Number(e.target.value))} />
                </Field>
              </div>
            </div>
          </div>

          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={15} style={{ color: 'var(--moss)' }} />
              <span className="eyebrow">Access</span>
            </div>
            <div className="col" style={{ gap: 13 }}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="small strong">Public sign-ups</div>
                  <div className="tiny muted">Allow new accounts from the register screen.</div>
                </div>
                <Switch checked={form.allowSignups} onChange={(v) => set('allowSignups', v)} label="Allow signups" />
              </div>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="small strong">Maintenance mode</div>
                  <div className="tiny muted">Show a banner to user workspaces.</div>
                </div>
                <Switch checked={form.maintenance} onChange={(v) => set('maintenance', v)} label="Maintenance mode" />
              </div>
            </div>
          </div>

          <div className="card pad" style={{ borderColor: '#e6bfbf', background: '#fdf6f4' }}>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={15} style={{ color: 'var(--cherry)' }} />
              <span className="eyebrow" style={{ color: '#8a2d2d' }}>Danger zone</span>
            </div>
            <p className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.55 }}>
              Reset the entire platform to seeded demo data. All user applications, admin changes and broadcasts are wiped.
            </p>
            <Button
              variant="clay"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                if (window.confirm('Reset all platform data?')) {
                  dispatch({ type: 'resetDemo' })
                  dispatch({ type: 'logout' })
                  navigate('/login')
                }
              }}
            >
              Reset platform data
            </Button>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <Database size={15} style={{ color: 'var(--slate)' }} />
              <span className="eyebrow">Data</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="row-between small"><span className="muted">Users</span><span className="strong tnum">{users.length}</span></div>
              <div className="row-between small"><span className="muted">Applications</span><span className="strong tnum">{applications.length}</span></div>
              <div className="row-between small"><span className="muted">Storage</span><Tag tone="slate">localStorage</Tag></div>
              <div className="row-between small"><span className="muted">Region</span><Tag>Browser only</Tag></div>
            </div>
            <div className="hairline" style={{ margin: '12px 0' }} />
            <div className="banner banner-slate" style={{ padding: '8px 10px' }}>
              <ShieldCheck /> Demo build — no server, no real PII.
            </div>
          </div>

          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <Mail size={15} style={{ color: 'var(--clay)' }} />
              <span className="eyebrow">Email templates</span>
            </div>
            <div className="col" style={{ gap: 7 }}>
              {['Welcome email', 'Weekly digest', 'Interview reminder', 'Offer congratulations'].map((t) => (
                <div key={t} className="row-between small">
                  <span>{t}</span>
                  <Tag tone="moss" dot>enabled</Tag>
                </div>
              ))}
            </div>
            <p className="tiny dim" style={{ marginTop: 10 }}>Templates are visual only in this demo.</p>
          </div>

          <div className="card pad" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow">About</div>
            <p className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Hiretrail admin console v1.0. React 19 + Vite, client-side state with a reducer, persisted per browser.
            </p>
            <div className="row wrap" style={{ gap: 4, marginTop: 8 }}>
              <Tag>React 19</Tag><Tag>Vite 7</Tag><Tag>Reducer</Tag>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
