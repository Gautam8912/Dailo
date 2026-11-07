import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarClock, Plus, Video, MapPin, Phone, FileCheck2, ArrowRight } from 'lucide-react'
import { useStore, useUserApplications } from '../../lib/store.jsx'
import { daysBetween, fmtDate, todayISO } from '../../lib/format.js'
import { Button, Logo, StatusPill, Tag } from '../../components/ui.jsx'
import ApplicationDrawer from '../../components/ApplicationDrawer.jsx'

const MODE_ICON = { Video, 'On-site': MapPin, Phone, Async: FileCheck2 }

export default function Calendar() {
  const apps = useUserApplications()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedApp, setSelectedApp] = useState(null)
  const [dayDetail, setDayDetail] = useState(null)

  const events = useMemo(
    () =>
      apps.flatMap((a) =>
        a.interviews.map((i) => ({
          ...i,
          app: a,
          kind: 'interview',
        })),
      ),
    [apps],
  )

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const startWeekday = (monthStart.getDay() + 6) % 7 // Mon first
  const cells = []
  for (let i = 0; i < startWeekday; i += 1) cells.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))

  const isoOf = (d) => d.toISOString().slice(0, 10)
  const byDay = events.reduce((acc, e) => {
    acc[e.date] = acc[e.date] || []
    acc[e.date].push(e)
    return acc
  }, {})

  const upcoming = events.filter((e) => new Date(`${e.date}T${e.time || '00:00'}`).getTime() >= Date.now() - 3600_000).sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
  const today = todayISO()

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Schedule</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Calendar</h1>
          <p className="page-sub">Every interview round, in one month view. Add rounds from any application drawer.</p>
        </div>
        <div className="toolbar">
          <div className="seg">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={14} /></button>
            <button onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Today</button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={14} /></button>
          </div>
          <span className="mono small strong" style={{ minWidth: 128, textAlign: 'right' }}>{monthLabel}</span>
        </div>
      </div>

      <div className="grid g-main">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="eyebrow" style={{ textAlign: 'center', fontSize: 9 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const iso = isoOf(d)
              const list = byDay[iso] || []
              const isToday = iso === today
              return (
                <button
                  key={iso}
                  onClick={() => list.length && setDayDetail(iso)}
                  style={{
                    minHeight: 84,
                    borderRadius: 10,
                    border: `1px solid ${isToday ? 'var(--ink)' : 'var(--line)'}`,
                    background: isToday ? 'var(--cream, #fbf6ec)' : list.length ? 'var(--card)' : 'transparent',
                    padding: '6px 6px 5px',
                    textAlign: 'left',
                    cursor: list.length ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <span className="mono" style={{ fontSize: 10.5, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--clay)' : 'var(--ink-3)' }}>
                    {d.getDate()}
                  </span>
                  {list.slice(0, 2).map((e) => (
                    <span key={e.id} style={{ fontSize: 9.5, background: 'var(--clay-soft)', color: '#7d3617', borderRadius: 4, padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 550 }}>
                      {e.time} {e.app.company}
                    </span>
                  ))}
                  {list.length > 2 ? <span className="tiny dim">{list.length - 2} more</span> : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Coming up</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Next rounds</div>
              </div>
              <Tag tone="clay">{upcoming.length}</Tag>
            </div>
            {upcoming.length === 0 ? (
              <p className="small muted">Nothing scheduled. Open an application and add a round to fill this in.</p>
            ) : (
              <div className="col" style={{ gap: 9 }}>
                {upcoming.slice(0, 6).map((e) => {
                  const days = daysBetween(today, e.date)
                  const Icon = MODE_ICON[e.mode] || Video
                  return (
                    <div key={e.id} className="row" style={{ gap: 10, alignItems: 'flex-start', paddingBottom: 9, borderBottom: '1px solid var(--line)' }}>
                      <div style={{ width: 44, flex: 'none', textAlign: 'center', border: '1px solid var(--line)', borderRadius: 9, padding: '4px 0', background: 'var(--paper)' }}>
                        <div className="mono strong" style={{ fontSize: 15, lineHeight: 1.1 }}>{new Date(e.date).getDate()}</div>
                        <div className="eyebrow" style={{ fontSize: 8 }}>{new Date(e.date).toLocaleDateString('en-IN', { month: 'short' })}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="small strong">{e.app.company} · {e.stage}</div>
                        <div className="tiny dim row" style={{ gap: 7, flexWrap: 'wrap' }}>
                          <span>{e.time}</span>
                          <span className="row" style={{ gap: 3 }}><Icon size={10} /> {e.mode}</span>
                          {e.withWho ? <span>· {e.withWho}</span> : null}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flex: 'none' }}>
                        <div className="tiny strong" style={{ color: days <= 1 ? 'var(--clay)' : 'var(--ink-3)' }}>{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}</div>
                        <button className="tiny" style={{ border: 0, background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer', padding: 0 }} onClick={() => setSelectedApp(e.app)}>open</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card pad" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow">Prep checklist</div>
            <div className="col" style={{ gap: 7, marginTop: 9 }}>
              {['Re-read the JD and note 3 talking points', 'Prepare 2 STAR stories per round', 'Test camera + mic 15 min early', 'Send a thank-you note within 24h'].map((t) => (
                <div key={t} className="row small" style={{ gap: 7, color: 'var(--ink-2)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--clay)', flex: 'none' }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {dayDetail ? (
        <div className="card pad" style={{ marginTop: 14, animation: 'fade-up .2s var(--ease)' }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div className="serif" style={{ fontSize: 22 }}>{fmtDate(dayDetail, { year: true, weekday: 'long' })}</div>
            <Button size="sm" variant="ghost" onClick={() => setDayDetail(null)}>Close</Button>
          </div>
          <div className="col" style={{ gap: 8 }}>
            {(byDay[dayDetail] || []).map((e) => (
              <div key={e.id} className="row card" style={{ padding: 10, gap: 10 }}>
                <Logo company={e.app.company} color={e.app.logo} />
                <div style={{ flex: 1 }}>
                  <div className="small strong">{e.app.role} · {e.stage}</div>
                  <div className="tiny muted">{e.app.company} · {e.time} · {e.mode}</div>
                </div>
                <StatusPill status={e.app.status} />
                <Button size="sm" variant="ghost" icon={ArrowRight} onClick={() => setSelectedApp(e.app)}>Open</Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ApplicationDrawer app={selectedApp} onClose={() => setSelectedApp(null)} onEdit={() => setSelectedApp(null)} />
    </>
  )
}
