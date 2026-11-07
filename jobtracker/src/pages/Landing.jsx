import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  BarChart3,
  ListTodo,
  Sparkles,
  ShieldCheck,
  Check,
  MoveRight,
  Star,
} from 'lucide-react'
import { Button, Logo, StatusPill } from '../components/ui.jsx'

const demoCards = [
  { company: 'Razorpay', role: 'Senior Frontend Engineer', status: 'interview', meta: 'Bengaluru · ₹28–36L', color: { bg: '#191714', fg: '#f6efe2' } },
  { company: 'Postman', role: 'Frontend Engineer', status: 'offer', meta: 'Remote · ₹30–38L', color: { bg: '#b4552d', fg: '#fff3ec' } },
  { company: 'Zerodha', role: 'Frontend Engineer II', status: 'screening', meta: 'On-site · ₹24–30L', color: { bg: '#40624a', fg: '#eaf3e7' } },
  { company: 'CRED', role: 'UI Engineer', status: 'interview', meta: 'Bengaluru · ₹26–34L', color: { bg: '#6c4b6e', fg: '#f6e9f6' } },
]

const features = [
  {
    icon: BriefcaseBusiness,
    title: 'A pipeline that thinks',
    body: 'Wishlist → Applied → Screening → Interview → Offer. Drag-free, one tap status changes with an auto-maintained timeline for every role.',
  },
  {
    icon: CalendarDays,
    title: 'Never miss a round',
    body: 'Every interview, take-home and follow-up lands on a month calendar with a live countdown — not a forgotten note.',
  },
  {
    icon: ListTodo,
    title: 'Tasks that chase you',
    body: 'Auto-created follow-ups after 5 silent days, thank-you notes and prep checklists, all in one tidy queue.',
  },
  {
    icon: BarChart3,
    title: 'Insights, not spreadsheets',
    body: 'Response rate, interview conversion, salary bands and which sources actually work — calculated as you go.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M5 18c5.5 0 7.5-4 8-8s2-6 6-6" strokeDasharray="1.5 3.5" />
              <circle cx="5" cy="18" r="2.2" fill="#b4552d" stroke="none" />
              <circle cx="19" cy="4" r="2.2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span>
            <span className="brand-name">Hiretrail</span>
            <span className="brand-sub">Job tracker</span>
          </span>
        </Link>
        <div className="spacer" />
        <a href="#features" className="btn btn-ghost hide-sm">Features</a>
        <a href="#how" className="btn btn-ghost hide-sm">How it works</a>
        <Link to="/login" className="btn btn-ghost">Sign in</Link>
        <Link to="/register" className="btn btn-dark btn-sm hide-sm">Get started <ArrowRight size={14} /></Link>
      </nav>

      <header className="hero">
        <div className="grid hero-grid">
          <div className="anim-up">
            <span className="tag tag-clay" style={{ height: 26, padding: '0 11px' }}>
              <Sparkles size={12} /> The calm job hunt
            </span>
            <h1 className="hero-title" style={{ marginTop: 18 }}>
              Every application,
              <br />
              one clear <em>trail.</em>
            </h1>
            <p className="hero-sub">
              Hiretrail is a job application tracker for people who are tired of seventeen browser tabs and a
              spreadsheet called <span className="italic">final_final_v3.xlsx</span>. Track roles, interviews,
              follow-ups and offers in one warm, quiet workspace.
            </p>
            <div className="row wrap" style={{ gap: 10, marginTop: 26 }}>
              <Link to="/login" className="btn btn-dark btn-lg">
                Enter the demo <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn btn-lg">Create an account</Link>
            </div>
            <div className="row wrap" style={{ gap: 16, marginTop: 26 }}>
              {['No setup', 'Demo data included', 'User + admin modules'].map((t) => (
                <span key={t} className="row small muted" style={{ gap: 6 }}>
                  <Check size={14} style={{ color: 'var(--moss)' }} /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-visual anim-up" style={{ animationDelay: '.08s' }}>
            <div className="visual-top">
              <span className="visual-dot" />
              <span className="visual-dot" />
              <span className="visual-dot" />
              <span className="mono tiny" style={{ marginLeft: 8, color: 'var(--ink-4)' }}>hiretrail.app/app/applications</span>
              <div className="spacer" />
              <span className="tag" style={{ height: 20 }}>Live demo</span>
            </div>
            <div style={{ padding: 16, background: 'var(--paper)' }} className="paper-grid">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div>
                  <div className="eyebrow" style={{ fontSize: 9 }}>Pipeline</div>
                  <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>20 roles in flight</div>
                </div>
                <span className="tag tag-moss"><span className="dot" style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} /> 2 offers</span>
              </div>
              <div className="col" style={{ gap: 8 }}>
                {demoCards.map((c) => (
                  <div key={c.company} className="job-card" style={{ cursor: 'default', padding: 12 }}>
                    <div className="job-card-top">
                      <Logo company={c.company} color={c.color} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="small strong">{c.role}</div>
                        <div className="tiny muted">{c.company} · {c.meta}</div>
                      </div>
                      <StatusPill status={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 44, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="row" style={{ color: 'var(--mustard)' }}>
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} fill="currentColor" />)}
            </span>
            <span className="small muted">“Finally closed 6 tabs and got 2 offers in 3 weeks.”</span>
          </div>
          <div className="spacer" />
          <span className="eyebrow" style={{ fontSize: 9 }}>Built for interns, switchers & comeback seasons</span>
        </div>
      </header>

      <section id="features" style={{ maxWidth: 1240, margin: '0 auto', padding: '62px 34px 20px' }}>
        <div className="row-between" style={{ marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">What's inside</div>
            <h2 className="display" style={{ fontSize: 'clamp(30px, 4vw, 46px)', marginTop: 8 }}>
              Five modules. <span className="italic muted">Zero clutter.</span>
            </h2>
          </div>
          <p className="small muted" style={{ maxWidth: 340 }}>
            A user workspace for the hunt, and an admin console for the people running it — both fully functional in the browser.
          </p>
        </div>
        <div className="grid g4">
          {features.map((f) => (
            <div key={f.title} className="feature-card card-hover">
              <span className="empty-icon" style={{ width: 38, height: 38, borderRadius: 11 }}>
                <f.icon />
              </span>
              <div className="strong" style={{ fontSize: 14.5 }}>{f.title}</div>
              <p className="small muted" style={{ lineHeight: 1.55 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" style={{ maxWidth: 1240, margin: '0 auto', padding: '42px 34px 20px' }}>
        <div className="card" style={{ padding: 'clamp(22px, 3vw, 38px)' }}>
          <div className="row-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="eyebrow">How it works</div>
              <h2 className="serif" style={{ fontSize: 32, marginTop: 6 }}>Three moves, every week</h2>
            </div>
            <span className="tag tag-slate"><MoveRight size={11} /> 4 minutes a day</span>
          </div>
          <div className="grid g3">
            {[
              ['01', 'Log the role', 'Add company, role, source and salary band. Set a priority so the important ones float up.'],
              ['02', 'Move the card', 'One tap to change stage. Interviews land on your calendar, follow-ups queue themselves.'],
              ['03', 'Read the trail', 'Sunday: check the funnel, spot dead sources, and decide where next week goes.'],
            ].map(([n, t, b]) => (
              <div key={n}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--clay)', fontWeight: 700 }}>{n}</span>
                <div className="serif" style={{ fontSize: 24, marginTop: 4 }}>{t}</div>
                <p className="small muted" style={{ marginTop: 6, lineHeight: 1.55 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 34px 20px' }}>
        <div className="grid g2" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 26, background: 'var(--ink)', color: '#f2ebdd', borderColor: 'var(--ink)' }}>
            <ShieldCheck size={20} style={{ color: '#d9b48c' }} />
            <h3 className="serif" style={{ fontSize: 28, marginTop: 12 }}>Admin module included</h3>
            <p className="small" style={{ color: '#bfb5a4', marginTop: 8, lineHeight: 1.6, maxWidth: '44ch' }}>
              Manage users, suspend accounts, inspect every application on the platform, read an activity log,
              push announcements and tune platform settings.
            </p>
            <Link to="/login" className="btn btn-sm" style={{ marginTop: 18, background: 'transparent', color: '#f2ebdd', borderColor: 'rgba(242,235,221,.28)' }}>
              Open admin demo <ArrowRight size={13} />
            </Link>
          </div>
          <div className="card" style={{ padding: 26 }}>
            <Sparkles size={20} style={{ color: 'var(--clay)' }} />
            <h3 className="serif" style={{ fontSize: 28, marginTop: 12 }}>Demo credentials</h3>
            <div className="col" style={{ gap: 8, marginTop: 12 }}>
              <div className="row-between small" style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)' }}>
                <span className="mono">aarav@hiretrail.app</span>
                <span className="dim">demo1234</span>
              </div>
              <div className="row-between small" style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)' }}>
                <span className="mono">admin@hiretrail.app</span>
                <span className="dim">admin1234</span>
              </div>
            </div>
            <p className="tiny dim" style={{ marginTop: 10 }}>Demo-only credentials, stored in your browser. No real auth backend.</p>
            <Link to="/login" className="btn btn-dark btn-sm" style={{ marginTop: 14 }}>Sign in <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      <footer style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 34px 40px' }}>
        <div className="hairline" style={{ marginBottom: 18 }} />
        <div className="row-between wrap" style={{ gap: 12 }}>
          <span className="small muted">Hiretrail — a React + Vite demo project. Built for the love of tidy pipelines.</span>
          <span className="row tiny dim" style={{ gap: 14 }}>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
            <span className="mono">v1.0</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
