import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness,
  CalendarClock,
  Target,
  TrendingUp,
  ArrowRight,
  Plus,
  Sparkles,
  ListTodo,
  Star,
  MapPin,
  ChevronRight,
  Flag,
} from 'lucide-react'
import { useStore, useUserApplications, useUserTasks, useUserNotifications } from '../../lib/store.jsx'
import { Avatar, Button, EmptyState, Logo, Metric, PriorityTag, StatusPill, Tag } from '../../components/ui.jsx'
import { StatusDonut, VolumeChart, Funnel } from '../../components/charts.jsx'
import { daysBetween, firstName, fmtDate, fmtLPA, relTime, todayISO } from '../../lib/format.js'
import ApplicationDrawer from '../../components/ApplicationDrawer.jsx'
import ApplicationForm from '../../components/ApplicationForm.jsx'

export default function Dashboard() {
  const { currentUser } = useStore()
  const apps = useUserApplications()
  const tasks = useUserTasks()
  const notifications = useUserNotifications()
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const navigate = useNavigate()

  const applied = apps.filter((a) => a.status !== 'wishlist')
  const active = apps.filter((a) => ['applied', 'screening', 'interview'].includes(a.status))
  const offers = apps.filter((a) => a.status === 'offer')
  const interviews = apps.flatMap((a) => a.interviews.map((i) => ({ ...i, app: a }))).filter((i) => new Date(`${i.date}T${i.time || '00:00'}`).getTime() >= Date.now())
  const upcoming = interviews.sort((a, b) => new Date(a.date) - new Date(b.date))
  const openTasks = tasks.filter((t) => !t.done).sort((a, b) => new Date(a.due) - new Date(b.due))
  const responseRate = applied.length ? Math.round((apps.filter((a) => ['screening', 'interview', 'offer'].includes(a.status)).length / applied.length) * 100) : 0

  const thisWeek = applied.filter((a) => daysBetween(a.appliedDate, todayISO()) <= 7 && daysBetween(a.appliedDate, todayISO()) >= 0).length
  const lastWeek = applied.filter((a) => {
    const d = daysBetween(a.appliedDate, todayISO())
    return d > 7 && d <= 14
  }).length

  const hotApps = useMemo(
    () => apps.filter((a) => a.starred || a.priority === 'high').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4),
    [apps],
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--moss)' }} />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>
            {greeting}, <span className="italic" style={{ color: 'var(--clay)' }}>{firstName(currentUser?.name)}</span>
          </h1>
          <p className="page-sub">
            {active.length} roles in flight · {upcoming.length} interview{upcoming.length === 1 ? '' : 's'} coming up ·{' '}
            {openTasks.filter((t) => t.due <= todayISO()).length} task(s) due today.
          </p>
        </div>
        <div className="toolbar">
          <Button icon={Sparkles} onClick={() => navigate('/app/insights')}>Weekly review</Button>
          <Button variant="dark" icon={Plus} onClick={() => setEditing('new')}>New application</Button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Metric
          label="Active applications"
          value={active.length}
          icon={BriefcaseBusiness}
          foot={<><span className={`delta ${thisWeek >= lastWeek ? 'delta-up' : 'delta-down'}`}>{thisWeek >= lastWeek ? '+' : ''}{thisWeek - lastWeek}</span> vs last week</>}
        />
        <Metric label="Interviews booked" value={upcoming.length} icon={CalendarClock} foot={<span className="tiny muted">next: {upcoming[0] ? fmtDate(upcoming[0].date) : '—'}</span>} />
        <Metric label="Offers" value={offers.length} icon={TrendingUp} accent="var(--moss)" foot={<span className="tiny muted">{offers.length ? `best: ${fmtLPA(Math.max(...offers.map((o) => o.salaryMax || 0)))}` : 'nothing yet — keep going'}</span>} />
        <Metric label="Response rate" value={`${responseRate}%`} icon={Target} foot={<span className="tiny muted">{applied.length} applied · {apps.length} tracked</span>} />
      </div>

      <div className="grid g-main" style={{ marginBottom: 14 }}>
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="eyebrow">Pipeline health</div>
                <div className="serif" style={{ fontSize: 24, marginTop: 3 }}>Where everything stands</div>
              </div>
              <Link to="/app/applications" className="btn btn-sm">
                Open pipeline <ArrowRight size={13} />
              </Link>
            </div>
            <StatusDonut applications={apps} />
          </div>

          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Last 10 weeks</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Application volume</div>
              </div>
              <Tag tone="clay" dot>{thisWeek} this week</Tag>
            </div>
            <VolumeChart applications={apps} weeks={10} height={140} />
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <div className="eyebrow">Next up</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Upcoming rounds</div>
              </div>
              <Link to="/app/calendar" className="icon-btn" aria-label="Calendar"><ChevronRight /></Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="small muted">No interviews on the books. A good week to send follow-ups.</p>
            ) : (
              <div className="col" style={{ gap: 8 }}>
                {upcoming.slice(0, 3).map((i) => {
                  const days = daysBetween(todayISO(), i.date)
                  return (
                    <div key={i.id} className="row" style={{ gap: 10, padding: '9px 0', borderTop: '1px solid var(--line)' }}>
                      <div style={{ width: 42, textAlign: 'center', flex: 'none' }}>
                        <div className="mono strong" style={{ fontSize: 16, lineHeight: 1 }}>{new Date(i.date).getDate()}</div>
                        <div className="eyebrow" style={{ fontSize: 8.5 }}>{new Date(i.date).toLocaleDateString('en-IN', { month: 'short' })}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="small strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.app.company} · {i.stage}</div>
                        <div className="tiny dim">{i.time} · {i.mode} {days === 0 ? '· today' : days === 1 ? '· tomorrow' : `· in ${days}d`}</div>
                      </div>
                      <button className="icon-btn" onClick={() => setSelected(i.app)} aria-label="Open">
                        <ArrowRight />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div className="eyebrow">Today</div>
              <Link to="/app/tasks" className="tiny" style={{ color: 'var(--clay)', fontWeight: 600 }}>All tasks</Link>
            </div>
            {openTasks.length === 0 ? (
              <p className="small muted">Inbox zero. Impressive.</p>
            ) : (
              <div className="col" style={{ gap: 7 }}>
                {openTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="row" style={{ gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: t.due < todayISO() ? 'var(--cherry)' : t.due === todayISO() ? 'var(--clay)' : 'var(--ink-4)', flex: 'none' }} />
                    <span className="small" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    <span className="tiny dim">{t.due === todayISO() ? 'today' : fmtDate(t.due)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid g-main">
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Keep an eye on</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>High-priority roles</div>
              </div>
              <Link to="/app/applications" className="tiny" style={{ color: 'var(--clay)', fontWeight: 600 }}>View all</Link>
            </div>
            {hotApps.length === 0 ? (
              <EmptyState icon={Star} title="Nothing starred yet" body="Star the roles you care about and they will surface here." action={<Button size="sm" icon={Plus} onClick={() => setEditing('new')}>Add a role</Button>} />
            ) : (
              <div className="grid g2" style={{ gap: 9 }}>
                {hotApps.map((a) => (
                  <div key={a.id} className="job-card" onClick={() => setSelected(a)}>
                    <div className="job-card-top">
                      <Logo company={a.company} color={a.logo} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="small strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.role}</div>
                        <div className="tiny muted">{a.company}</div>
                      </div>
                      {a.starred ? <Star size={13} fill="var(--mustard)" stroke="var(--mustard)" /> : null}
                    </div>
                    <div className="row-between" style={{ marginTop: 'auto' }}>
                      <StatusPill status={a.status} />
                      <span className="tiny dim">{a.salaryMax ? fmtLPA(a.salaryMax) : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="eyebrow">Funnel</div>
            <div className="serif" style={{ fontSize: 22, margin: '2px 0 14px' }}>Stage conversions</div>
            <Funnel applications={apps} />
          </div>

          <div className="card pad" style={{ background: 'var(--ink)', borderColor: 'var(--ink)', color: '#f2ebdd' }}>
            <div className="row-between">
              <span className="eyebrow" style={{ color: '#a89e8d' }}>Weekly goal</span>
              <span className="tiny mono" style={{ color: '#a89e8d' }}>{currentUser?.goal || 5} apps</span>
            </div>
            <div className="row" style={{ alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
              <span className="serif" style={{ fontSize: 44, lineHeight: 1, color: '#f6efe2' }}>{thisWeek}</span>
              <span className="small" style={{ color: '#bfb5a4', paddingBottom: 6 }}>/ {currentUser?.goal || 5} this week</span>
            </div>
            <div className="bar" style={{ marginTop: 12, background: 'rgba(246,239,226,.14)' }}>
              <span style={{ width: `${Math.min(100, (thisWeek / (currentUser?.goal || 5)) * 100)}%`, background: '#d9b48c' }} />
            </div>
            <p className="tiny" style={{ color: '#a89e8d', marginTop: 10, lineHeight: 1.5 }}>
              {thisWeek >= (currentUser?.goal || 5) ? 'Goal hit — nice pace. Quality over quantity next week.' : `${(currentUser?.goal || 5) - thisWeek} more to reach this week's target.`}
            </p>
          </div>

          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <div className="eyebrow">Inbox</div>
              <Link to="/app/notifications" className="tiny" style={{ color: 'var(--clay)', fontWeight: 600 }}>
                {notifications.filter((n) => !n.read).length} unread
              </Link>
            </div>
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="row" style={{ gap: 9, padding: '7px 0', alignItems: 'flex-start' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, marginTop: 6, background: n.read ? 'var(--line-strong)' : 'var(--clay)', flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small" style={{ fontWeight: n.read ? 450 : 600 }}>{n.title}</div>
                  <div className="tiny dim">{relTime(n.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ApplicationDrawer app={selected} onClose={() => setSelected(null)} onEdit={(a) => { setSelected(null); setEditing(a) }} />
      <ApplicationForm open={Boolean(editing)} editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </>
  )
}
