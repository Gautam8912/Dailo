import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  BriefcaseBusiness,
  TrendingUp,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Activity,
  UserPlus,
  Star,
  Megaphone,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { fmtDate, fmtLPA, groupCount, relTime, todayISO } from '../../lib/format.js'
import { STATUSES } from '../../lib/constants.js'
import { Avatar, Button, Logo, Metric, StatusPill, Tag } from '../../components/ui.jsx'
import { StatusDonut, VolumeChart, ActivityStrip } from '../../components/charts.jsx'

export default function AdminOverview() {
  const { users, applications, tasks, activity, broadcasts, impersonate, dispatch } = useStore()

  const activeUsers = users.filter((u) => u.status === 'active')
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const newUsers = users.filter((u) => new Date(u.joinedAt) >= weekAgo)
  const offers = applications.filter((a) => a.status === 'offer')
  const interviewsUpcoming = applications.flatMap((a) => a.interviews.map((i) => ({ ...i, app: a, user: users.find((u) => u.id === a.userId) }))).filter((i) => new Date(`${i.date}T${i.time || '00:00'}`).getTime() >= Date.now())

  const perUser = useMemo(
    () =>
      users
        .map((u) => {
          const ua = applications.filter((a) => a.userId === u.id)
          return {
            ...u,
            count: ua.length,
            active: ua.filter((a) => ['applied', 'screening', 'interview'].includes(a.status)).length,
            offers: ua.filter((a) => a.status === 'offer').length,
            interviews: ua.filter((a) => a.status === 'interview').length,
            lastApp: ua.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0],
          }
        })
        .sort((a, b) => b.count - a.count),
    [users, applications],
  )

  const statusCounts = groupCount(applications, (a) => a.status)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <h1 className="page-title" style={{ marginTop: 5 }}>Platform overview</h1>
          <p className="page-sub">A read of the whole platform: who is hunting, what is moving and where the pile-ups are.</p>
        </div>
        <div className="toolbar">
          <Link to="/admin/broadcast" className="btn"><Megaphone size={14} /> Broadcast</Link>
          <Link to="/admin/users" className="btn btn-dark"><Users size={14} /> Manage users</Link>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Metric label="Users" value={users.length} icon={Users} foot={<><span className="delta delta-up"><UserPlus size={10} /> +{newUsers.length}</span> this week</>} />
        <Metric label="Applications" value={applications.length} icon={BriefcaseBusiness} foot={<span className="tiny muted">{statusCounts.interview || 0} interview · {statusCounts.offer || 0} offers</span>} />
        <Metric label="Active accounts" value={activeUsers.length} icon={ShieldCheck} accent="var(--moss)" foot={<span className="tiny muted">{users.filter((u) => u.status === 'suspended').length} suspended</span>} />
        <Metric label="Interviews ahead" value={interviewsUpcoming.length} icon={CalendarClock} accent="var(--clay)" foot={<span className="tiny muted">across {new Set(interviewsUpcoming.map((i) => i.user?.id)).size} users</span>} />
      </div>

      <div className="grid g-main" style={{ marginBottom: 14 }}>
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Most active</div>
                <div className="serif" style={{ fontSize: 23, marginTop: 2 }}>User leaderboard</div>
              </div>
              <Link to="/admin/users" className="btn btn-sm">All users <ArrowRight size={13} /></Link>
            </div>
            <div className="table-wrap" style={{ boxShadow: 'none' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Tracked</th>
                    <th>Active</th>
                    <th>Offers</th>
                    <th>Last move</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {perUser.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="row" style={{ gap: 9 }}>
                          <Avatar name={u.name} size="sm" color={u.avatarColor} />
                          <div>
                            <div className="cell-main">{u.name}</div>
                            <div className="cell-sub">{u.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="strong tnum">{u.count}</td>
                      <td className="tnum">{u.active}</td>
                      <td className="tnum">{u.offers}</td>
                      <td className="small muted">{u.lastApp ? relTime(u.lastApp.updatedAt) : '—'}</td>
                      <td>
                        <Tag tone={u.status === 'active' ? 'moss' : 'cherry'} dot>{u.status}</Tag>
                      </td>
                      <td>
                        {u.status === 'active' ? (
                          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'impersonate', userId: u.id })}>
                            View as
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Platform-wide</div>
                <div className="serif" style={{ fontSize: 23, marginTop: 2 }}>Applications added per week</div>
              </div>
              <Tag tone="slate">{applications.length} total</Tag>
            </div>
            <VolumeChart applications={applications} weeks={10} height={150} />
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="eyebrow">Distribution</div>
            <div className="serif" style={{ fontSize: 22, margin: '2px 0 14px' }}>Stages across users</div>
            <StatusDonut applications={applications} size={150} />
          </div>

          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="eyebrow">Live feed</span>
              <Link to="/admin/activity" className="tiny" style={{ color: 'var(--clay)', fontWeight: 600 }}>Full log</Link>
            </div>
            <div className="col" style={{ gap: 9 }}>
              {activity.slice(0, 6).map((a) => (
                <div key={a.id} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, marginTop: 6, background: 'var(--clay)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>{a.text}</div>
                    <div className="tiny dim">{relTime(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card pad">
            <div className="eyebrow" style={{ marginBottom: 8 }}>Consistency</div>
            <ActivityStrip applications={applications} days={70} />
            <p className="tiny dim" style={{ marginTop: 8 }}>All applications logged in the last 10 weeks.</p>
          </div>
        </div>
      </div>

      <div className="grid g3">
        <div className="card pad">
          <div className="eyebrow">Money on the table</div>
          <div className="serif" style={{ fontSize: 34, marginTop: 4, color: 'var(--moss)' }}>{offers.length}</div>
          <p className="small muted" style={{ marginTop: 2 }}>live offers across the platform</p>
          <div className="col" style={{ gap: 6, marginTop: 10 }}>
            {offers.slice(0, 4).map((o) => {
              const u = users.find((x) => x.id === o.userId)
              return (
                <div key={o.id} className="row-between small">
                  <span className="row" style={{ gap: 6 }}><Logo company={o.company} color={o.logo} /> {o.company}</span>
                  <span className="tiny dim">{u?.name.split(' ')[0]} · {fmtLPA(o.salaryMax)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card pad">
          <div className="eyebrow">Broadcasts</div>
          <div className="serif" style={{ fontSize: 22, margin: '2px 0 10px' }}>Recent announcements</div>
          <div className="col" style={{ gap: 9 }}>
            {broadcasts.length === 0 ? <p className="small muted">None sent yet.</p> : broadcasts.slice(0, 3).map((b) => (
              <div key={b.id} className="row-between" style={{ gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="small strong">{b.title}</div>
                  <div className="tiny dim">{fmtDate(b.at)} · {b.recipients} recipients</div>
                </div>
                <Tag tone="clay">{b.audience}</Tag>
              </div>
            ))}
          </div>
          <Link to="/admin/broadcast" className="btn btn-sm" style={{ marginTop: 12 }}><Megaphone size={13} /> New broadcast</Link>
        </div>

        <div className="card pad">
          <div className="eyebrow">Pipeline hygiene</div>
          <div className="serif" style={{ fontSize: 22, margin: '2px 0 10px' }}>Stale applications</div>
          <p className="tiny muted" style={{ marginBottom: 10 }}>No movement in 14+ days — good candidates for a nudge.</p>
          <div className="col" style={{ gap: 7 }}>
            {applications
              .filter((a) => ['applied', 'screening'].includes(a.status) && (Date.now() - new Date(a.updatedAt)) / 86400000 > 14)
              .slice(0, 5)
              .map((a) => (
                <div key={a.id} className="row-between small">
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--cherry)' }} />
                    {a.company} <span className="dim">· {a.role}</span>
                  </span>
                  <span className="tiny dim">{Math.round((Date.now() - new Date(a.updatedAt)) / 86400000)}d</span>
                </div>
              ))}
            {applications.filter((a) => ['applied', 'screening'].includes(a.status) && (Date.now() - new Date(a.updatedAt)) / 86400000 > 14).length === 0 ? (
              <p className="small muted">Nothing stale. The pipeline is moving.</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
