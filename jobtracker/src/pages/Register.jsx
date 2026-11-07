import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle, User, Building2, Target } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { Button, Field, Input, Select } from '../components/ui.jsx'
import { AuthShell } from './Login.jsx'
import { DEMO_PASSWORD } from '../lib/seed.js'

export default function Register() {
  const { dispatch, authError, toast } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', title: '', location: 'Bengaluru, IN', goal: '5' })
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (form.password.length < 6) {
      toast('Password must be at least 6 characters.', 'err')
      return
    }
    setBusy(true)
    setTimeout(() => {
      dispatch({ type: 'register', ...form })
      setBusy(false)
      const existing = form.email.toLowerCase() === 'aarav@hiretrail.app'
      if (existing) return
      toast(`Welcome to Hiretrail, ${form.name.split(' ')[0]}!`)
      navigate('/app')
    }, 340)
  }

  return (
    <AuthShell>
      <span className="tag tag-moss"><Target size={11} /> New account</span>
      <h1 className="serif" style={{ fontSize: 40, marginTop: 14, lineHeight: 1.05 }}>Start your trail</h1>
      <p className="small muted" style={{ marginTop: 6 }}>
        Takes 30 seconds. You get an empty pipeline, a demo-ready UI and full admin-free access.
      </p>

      <form onSubmit={submit} className="col" style={{ gap: 12, marginTop: 20 }}>
        <Field label="Full name" htmlFor="name">
          <div className="search">
            <User />
            <Input id="name" value={form.name} onChange={set('name')} placeholder="Riya Kapoor" required />
          </div>
        </Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Email" htmlFor="remail">
            <Input id="remail" type="email" value={form.email} onChange={set('email')} placeholder="riya@mail.com" required />
          </Field>
          <Field label="Password" htmlFor="rpass" hint="6+ characters">
            <Input id="rpass" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </Field>
        </div>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Current role" htmlFor="rtitle">
            <div className="search">
              <Building2 />
              <Input id="rtitle" value={form.title} onChange={set('title')} placeholder="Frontend Engineer" />
            </div>
          </Field>
          <Field label="Location" htmlFor="rloc">
            <Select id="rloc" value={form.location} onChange={set('location')}>
              {['Bengaluru, IN', 'Hyderabad, IN', 'Pune, IN', 'Mumbai, IN', 'Chennai, IN', 'Delhi NCR, IN', 'Remote, IN'].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Weekly application goal" htmlFor="rgoal">
          <div className="row wrap" style={{ gap: 6 }}>
            {['3', '5', '8', '10'].map((g) => (
              <button
                key={g}
                type="button"
                className={`btn btn-sm ${form.goal === g ? 'btn-dark' : ''}`}
                onClick={() => setForm((f) => ({ ...f, goal: g }))}
              >
                {g} / week
              </button>
            ))}
          </div>
        </Field>

        {authError ? (
          <div className="banner banner-clay" style={{ padding: '9px 11px' }}>
            <AlertCircle /> {authError}
          </div>
        ) : null}

        <Button variant="dark" size="lg" className="btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={15} />
        </Button>
        <p className="tiny dim" style={{ textAlign: 'center' }}>
          In this demo, accounts live in localStorage. Existing demo users keep the password <span className="mono">{DEMO_PASSWORD}</span>.
        </p>
      </form>

      <p className="small muted" style={{ marginTop: 16, textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--clay)', fontWeight: 600 }}>Sign in</Link>
      </p>
    </AuthShell>
  )
}
