import { useState } from 'react'
import { Bell, Mail, Palette, ShieldCheck, RotateCcw, LogOut, Check, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { Button, Field, Select, Switch, Tag } from '../../components/ui.jsx'

export default function Settings() {
  const { dispatch, toast, currentUser, settings } = useStore()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState({
    digest: true,
    interviewReminders: true,
    taskNudges: true,
    productUpdates: false,
    density: 'comfortable',
    digestDay: 'sunday',
    weekStart: 'monday',
  })

  const set = (k, v) => setPrefs((p) => ({ ...p, [k]: v }))

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Preferences</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Settings</h1>
          <p className="page-sub">Notifications, appearance and the boring-but-important bits.</p>
        </div>
        <Button variant="dark" icon={Check} onClick={() => toast('Preferences saved locally')}>Save preferences</Button>
      </div>

      <div className="grid g-split">
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 14 }}>
              <Bell size={15} style={{ color: 'var(--clay)' }} />
              <span className="eyebrow">Notifications</span>
            </div>
            <div className="col" style={{ gap: 12 }}>
              <Toggle label="Weekly digest" body="A Sunday summary of applications, interviews and stalls." checked={prefs.digest} onChange={(v) => set('digest', v)} />
              <Toggle label="Interview reminders" body="One nudge 24 hours before every scheduled round." checked={prefs.interviewReminders} onChange={(v) => set('interviewReminders', v)} />
              <Toggle label="Task nudges" body="Morning ping for anything due today." checked={prefs.taskNudges} onChange={(v) => set('taskNudges', v)} />
              <Toggle label="Product updates" body="New templates and features, sparingly." checked={prefs.productUpdates} onChange={(v) => set('productUpdates', v)} />
            </div>
          </div>

          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 14 }}>
              <Palette size={15} style={{ color: 'var(--clay)' }} />
              <span className="eyebrow">Workspace</span>
            </div>
            <div className="grid g2" style={{ gap: 10 }}>
              <Field label="Digest day">
                <Select value={prefs.digestDay} onChange={(e) => set('digestDay', e.target.value)}>
                  {['sunday', 'monday', 'friday'].map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Week starts on">
                <Select value={prefs.weekStart} onChange={(e) => set('weekStart', e.target.value)}>
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </Select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="label">Density</span>
              <div className="seg" style={{ marginTop: 6 }}>
                {['compact', 'comfortable'].map((d) => (
                  <button key={d} className={prefs.density === d ? 'on' : ''} onClick={() => set('density', d)}>{d}</button>
                ))}
              </div>
            </div>
            <div className="banner banner-slate" style={{ marginTop: 12 }}>
              <Sun /> Theme is a warm paper palette by design. Dark mode for the workspace is on the roadmap.
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={15} style={{ color: 'var(--moss)' }} />
              <span className="eyebrow">Account</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="row-between small"><span className="muted">Signed in as</span><span className="strong">{currentUser?.email}</span></div>
              <div className="row-between small"><span className="muted">Plan</span><Tag tone="moss">{currentUser?.plan}</Tag></div>
              <div className="row-between small"><span className="muted">Data</span><Tag>localStorage</Tag></div>
            </div>
            <div className="hairline" style={{ margin: '13px 0' }} />
            <div className="col" style={{ gap: 7 }}>
              <Button size="sm" icon={Mail} onClick={() => toast('Password change is stubbed in this demo.')}>Change password</Button>
              <Button size="sm" icon={LogOut} onClick={() => { dispatch({ type: 'logout' }); navigate('/login') }}>Sign out</Button>
            </div>
          </div>

          <div className="card pad">
            <div className="row" style={{ gap: 8, marginBottom: 10 }}>
              <RotateCcw size={15} style={{ color: 'var(--cherry)' }} />
              <span className="eyebrow">Danger zone</span>
            </div>
            <p className="tiny muted" style={{ lineHeight: 1.55, marginBottom: 10 }}>
              Reset the whole demo — users, applications, tasks and admin changes go back to the seeded state. You will be signed out.
            </p>
            <Button
              size="sm"
              variant="clay"
              icon={RotateCcw}
              onClick={() => {
                if (window.confirm('Reset all demo data and sign out?')) {
                  dispatch({ type: 'resetDemo' })
                  dispatch({ type: 'logout' })
                  navigate('/login')
                }
              }}
            >
              Reset demo data
            </Button>
          </div>

          <div className="card pad" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow">About this build</div>
            <p className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Hiretrail v1.0 — React 19 + Vite. Client-side demo: seeded data in memory, persisted to your browser.
              Admin broadcasts target users by audience. No network calls, no tracking.
            </p>
            <div className="row wrap" style={{ gap: 4, marginTop: 9 }}>
              <Tag>React</Tag><Tag>Vite</Tag><Tag>localStorage</Tag><Tag>No backend</Tag>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Toggle({ label, body, checked, onChange }) {
  return (
    <div className="row-between" style={{ gap: 14, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div className="small strong">{label}</div>
        <div className="tiny muted" style={{ marginTop: 1, lineHeight: 1.5 }}>{body}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}
