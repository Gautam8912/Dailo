import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail, ShieldCheck, UserRound, Sparkles, Check, AlertCircle } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { Button, Field, Input } from '../components/ui.jsx'

export function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <div className="auth-art-grid paper-grid" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link to="/" className="brand" style={{ padding: 0 }}>
            <span className="brand-mark" style={{ background: '#f6efe2', color: '#191714' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                <path d="M5 18c5.5 0 7.5-4 8-8s2-6 6-6" strokeDasharray="1.5 3.5" />
                <circle cx="5" cy="18" r="2.2" fill="#b4552d" stroke="none" />
                <circle cx="19" cy="4" r="2.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>
              <span className="brand-name" style={{ color: '#f6efe2' }}>Hiretrail</span>
              <span className="brand-sub" style={{ color: '#8b8173' }}>Job tracker</span>
            </span>
          </Link>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '22ch' }}>
          <p className="quote">
            The job hunt is a <em>marathon.</em> Keep a trail.
          </p>
          <p className="small" style={{ color: '#a89e8d', marginTop: 18, maxWidth: '38ch', lineHeight: 1.6 }}>
            Twenty roles in flight, one offer on the table and an interview on Thursday — this is what a calm
            pipeline looks like.
          </p>
        </div>

        <div className="row wrap" style={{ position: 'relative', zIndex: 1, gap: 8 }}>
          <span className="chip"><Check size={12} /> 20 tracked roles</span>
          <span className="chip"><Check size={12} /> 6 modules</span>
          <span className="chip"><Check size={12} /> Admin console</span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  )
}

export function DemoButtons({ onPick }) {
  const users = [
    { name: 'Aarav', email: 'aarav@hiretrail.app', pass: 'demo1234', role: 'User · 20 applications', icon: UserRound },
    { name: 'Admin', email: 'admin@hiretrail.app', pass: 'admin1234', role: 'Admin console', icon: ShieldCheck },
  ]
  return (
    <div className="grid g2" style={{ gap: 8 }}>
      {users.map((u) => (
        <button
          key={u.email}
          type="button"
          onClick={() => onPick(u.email, u.pass)}
          className="card card-hover"
          style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textAlign: 'left', background: 'var(--paper)' }}
        >
          <span className="empty-icon" style={{ width: 30, height: 30, borderRadius: 9 }}>
            <u.icon style={{ width: 14, height: 14 }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="small strong" style={{ display: 'block' }}>{u.name}</span>
            <span className="tiny dim" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.role}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export default function Login() {
  const { dispatch, sessionUser, authError, toast, isAdmin } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('aarav@hiretrail.app')
  const [password, setPassword] = useState('demo1234')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dispatch({ type: 'clearAuthError' })
  }, [dispatch])

  useEffect(() => {
    if (sessionUser) navigate(isAdmin ? '/admin' : '/app', { replace: true })
  }, [sessionUser, isAdmin, navigate])

  const submit = (e) => {
    e.preventDefault()
    setBusy(true)
    setTimeout(() => {
      dispatch({ type: 'login', email, password })
      setBusy(false)
    }, 320)
  }

  return (
    <AuthShell>
      <span className="tag tag-clay"><Sparkles size={11} /> Demo workspace</span>
      <h1 className="serif" style={{ fontSize: 40, marginTop: 14, lineHeight: 1.05 }}>Welcome back</h1>
      <p className="small muted" style={{ marginTop: 6 }}>
        Sign in to your pipeline — or jump straight into a demo account.
      </p>

      <form onSubmit={submit} className="col" style={{ gap: 12, marginTop: 22 }}>
        <Field label="Email address" htmlFor="email">
          <div className="search">
            <Mail />
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="search">
            <Lock />
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
        </Field>

        {authError ? (
          <div className="banner banner-clay" style={{ padding: '9px 11px' }}>
            <AlertCircle /> {authError}
          </div>
        ) : null}

        <div className="row-between tiny">
          <label className="row" style={{ gap: 6, color: 'var(--ink-3)' }}>
            <input type="checkbox" defaultChecked /> Keep me signed in
          </label>
          <span className="dim" style={{ cursor: 'pointer' }} onClick={() => toast('Password reset is a stub in this demo — use the demo credentials.', 'ok')}>
            Forgot password?
          </span>
        </div>

        <Button variant="dark" size="lg" className="btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={15} />
        </Button>
      </form>

      <div className="row" style={{ gap: 10, margin: '18px 0 12px' }}>
        <span className="hairline" style={{ flex: 1 }} />
        <span className="eyebrow" style={{ fontSize: 9 }}>One-tap demo</span>
        <span className="hairline" style={{ flex: 1 }} />
      </div>

      <DemoButtons
        onPick={(e, p) => {
          setEmail(e)
          setPassword(p)
          dispatch({ type: 'login', email: e, password: p })
        }}
      />

      <p className="small muted" style={{ marginTop: 20, textAlign: 'center' }}>
        New here? <Link to="/register" style={{ color: 'var(--clay)', fontWeight: 600 }}>Create an account</Link>
      </p>
      <p className="tiny dim" style={{ marginTop: 8, textAlign: 'center' }}>
        Demo credentials are stored locally in your browser. This project has no real auth backend.
      </p>
    </AuthShell>
  )
}
