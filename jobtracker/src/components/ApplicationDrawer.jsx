import { useState } from 'react'
import {
  X,
  Star,
  MapPin,
  Building2,
  CalendarClock,
  IndianRupee,
  Link2,
  Mail,
  UserRound,
  Pencil,
  Trash2,
  Plus,
  Check,
  CircleDot,
  StickyNote,
  BriefcaseBusiness,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { STATUSES, STATUS_MAP, SOURCES, WORK_MODES, PRIORITIES, INTERVIEW_TYPES, TASK_KINDS } from '../lib/constants.js'
import { fmtDate, fmtLPA, relTime, todayISO, uid } from '../lib/format.js'
import { Avatar, Button, Drawer, Field, IconButton, Input, Logo, PriorityTag, Select, StatusPill, Tag, Textarea, CheckBox } from './ui.jsx'

const emptyInterview = () => ({ stage: 'Technical', date: todayISO(), time: '11:00', mode: 'Video', withWho: '', notes: '', done: false })

export default function ApplicationDrawer({ app, onClose, onEdit }) {
  const { dispatch, toast, tasks } = useStore()
  const [tab, setTab] = useState('overview')
  const [iv, setIv] = useState(null)
  const [note, setNote] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskKind, setTaskKind] = useState('Follow up')
  const [taskDue, setTaskDue] = useState(todayISO())

  if (!app) return null
  const appTasks = tasks.filter((t) => t.appId === app.id)

  const patch = (p) => dispatch({ type: 'updateApp', id: app.id, patch: p })

  const changeStatus = (status) => {
    if (status === app.status) return
    patch({
      status,
      nextStep: status === 'offer' ? 'Review the offer' : status === 'rejected' ? '' : app.nextStep,
    })
    dispatch({
      type: 'addTimeline',
      appId: app.id,
      entry: { id: uid('tl'), at: new Date().toISOString(), type: 'status', text: `Moved to ${STATUS_MAP[status].label}` },
    })
    toast(`${app.company} → ${STATUS_MAP[status].label}`)
  }

  const addInterview = () => {
    if (!iv) return
    patch({ interviews: [...app.interviews, { ...iv, id: uid('int') }] })
    dispatch({ type: 'addTimeline', appId: app.id, entry: { id: uid('tl'), at: new Date().toISOString(), type: 'interview', text: `${iv.stage} round scheduled for ${fmtDate(iv.date)}` } })
    dispatch({
      type: 'addNotification',
      notification: { id: uid('ntf'), userId: app.userId, kind: 'interview', title: `${app.company} — ${iv.stage} round`, body: `${fmtDate(iv.date)} at ${iv.time}. ${iv.notes || ''}`.trim(), at: new Date().toISOString(), read: false, link: '/app/calendar' },
    })
    toast('Interview added to calendar')
    setIv(null)
  }

  const addNote = () => {
    if (!note.trim()) return
    patch({ notes: app.notes ? `${app.notes}\n\n${note.trim()}` : note.trim() })
    dispatch({ type: 'addTimeline', appId: app.id, entry: { id: uid('tl'), at: new Date().toISOString(), type: 'note', text: note.trim().slice(0, 90) } })
    setNote('')
    toast('Note saved')
  }

  const addTask = () => {
    if (!taskTitle.trim()) return
    dispatch({
      type: 'addTask',
      task: { id: uid('tsk'), userId: app.userId, title: taskTitle.trim(), kind: taskKind, due: taskDue, done: false, appId: app.id, priority: app.priority },
    })
    setTaskTitle('')
    toast('Task added')
  }

  const remove = () => {
    if (!window.confirm(`Delete the ${app.company} application? This cannot be undone.`)) return
    dispatch({ type: 'deleteApp', id: app.id })
    toast('Application deleted', 'err')
    onClose()
  }

  const tabs = [
    ['overview', 'Overview'],
    ['interviews', `Interviews (${app.interviews.length})`],
    ['tasks', `Tasks (${appTasks.length})`],
    ['timeline', 'Timeline'],
  ]

  return (
    <Drawer open={Boolean(app)} onClose={onClose}>
      <div className="drawer-head">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <span className="eyebrow">Application · {app.id.slice(-4).toUpperCase()}</span>
          <div className="row" style={{ gap: 2 }}>
            <IconButton icon={Star} label="Star" onClick={() => patch({ starred: !app.starred })} style={app.starred ? { color: 'var(--mustard)' } : undefined} />
            <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(app)} />
            <IconButton icon={X} label="Close" onClick={onClose} />
          </div>
        </div>
        <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
          <Logo company={app.company} size="lg" color={app.logo} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="serif" style={{ fontSize: 29, lineHeight: 1.08 }}>{app.role}</h2>
            <div className="row small muted" style={{ gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <Building2 size={13} /> {app.company}
              <span className="divider-dot" />
              <MapPin size={13} /> {app.location} · {app.workMode}
            </div>
          </div>
        </div>

        <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={app.status === s.id}
              onClick={() => changeStatus(s.id)}
              style={{
                border: `1px solid ${app.status === s.id ? s.color : 'var(--line)'}`,
                background: app.status === s.id ? s.bg : 'transparent',
                color: app.status === s.id ? s.color : 'var(--ink-3)',
                borderRadius: 99,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: app.status === s.id ? 650 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: app.status === s.id ? s.color : 'var(--line-strong)' }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ gap: 2, padding: '0 16px', borderBottom: '1px solid var(--line)', background: '#faf6ee' }}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              border: 0,
              background: 'transparent',
              padding: '11px 10px 10px',
              fontSize: 12.5,
              fontWeight: tab === id ? 650 : 500,
              color: tab === id ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: `2px solid ${tab === id ? 'var(--clay)' : 'transparent'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="drawer-body">
        {tab === 'overview' && (
          <div className="col" style={{ gap: 16 }}>
            {app.nextStep ? (
              <div className="banner banner-clay" style={{ alignItems: 'flex-start' }}>
                <CalendarClock style={{ marginTop: 2 }} />
                <div>
                  <div className="small strong">Next step</div>
                  <div className="small">{app.nextStep}</div>
                </div>
              </div>
            ) : null}

            <div className="grid g2" style={{ gap: 10 }}>
              <Fact label="Applied" value={fmtDate(app.appliedDate, { year: true })} sub={relTime(app.createdAt)} />
              <Fact label="Source" value={app.source} sub={app.workMode} />
              <Fact
                label="Salary band"
                value={app.salaryMin ? `${fmtLPA(app.salaryMin)} – ${fmtLPA(app.salaryMax)}` : 'Not disclosed'}
                sub="annual, CTC"
              />
              <Fact label="Priority" value={<PriorityTag priority={app.priority} />} sub={`Updated ${relTime(app.updatedAt)}`} />
            </div>

            {app.tags?.length ? (
              <div>
                <span className="label">Tags</span>
                <div className="row wrap" style={{ gap: 5, marginTop: 6 }}>
                  {app.tags.map((t) => (
                    <Tag key={t}>#{t}</Tag>
                  ))}
                </div>
              </div>
            ) : null}

            {app.contact ? (
              <div className="card" style={{ padding: 13, background: 'var(--paper)' }}>
                <span className="label">Point of contact</span>
                <div className="row" style={{ gap: 10, marginTop: 8 }}>
                  <Avatar name={app.contact.name} size="md" color="#3f5068" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small strong">{app.contact.name}</div>
                    <div className="tiny dim">{app.contact.role}</div>
                  </div>
                  <a className="icon-btn" href={`mailto:${app.contact.email}`} title={app.contact.email} aria-label="Email contact">
                    <Mail />
                  </a>
                </div>
              </div>
            ) : null}

            <div>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span className="label">Notes</span>
                <span className="tiny dim">{app.notes ? `${app.notes.split(/\s+/).length} words` : 'empty'}</span>
              </div>
              {app.notes ? (
                <div className="card" style={{ padding: 12, background: 'var(--paper)', whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                  {app.notes}
                </div>
              ) : (
                <p className="tiny dim">No notes yet — capture the JD highlights and your gut feel.</p>
              )}
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" onKeyDown={(e) => e.key === 'Enter' && addNote()} />
                <Button size="sm" onClick={addNote} icon={Plus}>Add</Button>
              </div>
            </div>

            <div className="row-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={remove} style={{ color: 'var(--cherry)' }}>
                Delete
              </Button>
              <Button size="sm" icon={Pencil} onClick={() => onEdit(app)}>Edit details</Button>
            </div>
          </div>
        )}

        {tab === 'interviews' && (
          <div className="col" style={{ gap: 12 }}>
            {app.interviews.length === 0 ? (
              <p className="small muted">No rounds scheduled yet. Add the first one below and it lands on your calendar.</p>
            ) : (
              app.interviews
                .slice()
                .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
                .map((it) => {
                  const past = new Date(`${it.date}T${it.time || '00:00'}`).getTime() < Date.now()
                  return (
                    <div key={it.id} className="card" style={{ padding: 13, background: past ? 'var(--paper)' : 'var(--card)' }}>
                      <div className="row-between">
                        <span className="row" style={{ gap: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 99, background: past ? 'var(--ink-4)' : 'var(--clay)' }} />
                          <span className="small strong">{it.stage}</span>
                          <Tag tone={past ? '' : 'clay'}>{past ? 'Done' : 'Upcoming'}</Tag>
                        </span>
                        <IconButton icon={Trash2} label="Remove" onClick={() => patch({ interviews: app.interviews.filter((x) => x.id !== it.id) })} />
                      </div>
                      <div className="row wrap tiny muted" style={{ gap: 10, marginTop: 6 }}>
                        <span className="row" style={{ gap: 4 }}><CalendarClock size={12} /> {fmtDate(it.date, { year: true })} · {it.time}</span>
                        <span className="row" style={{ gap: 4 }}><Link2 size={12} /> {it.mode}</span>
                        {it.withWho ? <span className="row" style={{ gap: 4 }}><UserRound size={12} /> {it.withWho}</span> : null}
                      </div>
                      {it.notes ? <p className="tiny muted" style={{ marginTop: 7, fontStyle: 'italic' }}>“{it.notes}”</p> : null}
                    </div>
                  )
                })
            )}

            {iv ? (
              <div className="card" style={{ padding: 14, background: 'var(--paper)' }}>
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <span className="label">New round</span>
                  <IconButton icon={X} label="Cancel" onClick={() => setIv(null)} />
                </div>
                <div className="col" style={{ gap: 9 }}>
                  <div className="grid g2" style={{ gap: 8 }}>
                    <Field label="Stage">
                      <Select value={iv.stage} onChange={(e) => setIv({ ...iv, stage: e.target.value })}>
                        {INTERVIEW_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </Select>
                    </Field>
                    <Field label="Mode">
                      <Select value={iv.mode} onChange={(e) => setIv({ ...iv, mode: e.target.value })}>
                        {['Video', 'Phone', 'On-site', 'Async'].map((t) => <option key={t}>{t}</option>)}
                      </Select>
                    </Field>
                    <Field label="Date">
                      <Input type="date" value={iv.date} onChange={(e) => setIv({ ...iv, date: e.target.value })} />
                    </Field>
                    <Field label="Time">
                      <Input type="time" value={iv.time} onChange={(e) => setIv({ ...iv, time: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Interviewer">
                    <Input value={iv.withWho} onChange={(e) => setIv({ ...iv, withWho: e.target.value })} placeholder="e.g. Rahul K. (Staff Eng)" />
                  </Field>
                  <Field label="Prep notes">
                    <Input value={iv.notes} onChange={(e) => setIv({ ...iv, notes: e.target.value })} placeholder="What to revise…" />
                  </Field>
                  <Button variant="dark" size="sm" onClick={addInterview}>Schedule round</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" icon={Plus} onClick={() => setIv(emptyInterview())}>Add interview round</Button>
            )}
          </div>
        )}

        {tab === 'tasks' && (
          <div className="col" style={{ gap: 10 }}>
            {appTasks.length === 0 ? (
              <p className="small muted">No tasks linked to this application.</p>
            ) : (
              appTasks.map((t) => (
                <div key={t.id} className="row" style={{ gap: 9, padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 10, background: t.done ? 'var(--paper)' : 'var(--card)' }}>
                  <CheckBox checked={t.done} label={t.title} onChange={() => dispatch({ type: 'updateTask', id: t.id, patch: { done: !t.done } })} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-4)' : 'var(--ink)' }}>{t.title}</div>
                    <div className="tiny dim">{t.kind} · due {fmtDate(t.due)}</div>
                  </div>
                  <IconButton icon={Trash2} label="Delete task" onClick={() => dispatch({ type: 'deleteTask', id: t.id })} />
                </div>
              ))
            )}
            <div className="card" style={{ padding: 12, background: 'var(--paper)' }}>
              <Field label="New task">
                <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Follow up with recruiter" />
              </Field>
              <div className="grid g2" style={{ gap: 8, marginTop: 8 }}>
                <Select value={taskKind} onChange={(e) => setTaskKind(e.target.value)}>
                  {TASK_KINDS.map((k) => <option key={k}>{k}</option>)}
                </Select>
                <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </div>
              <Button size="sm" icon={Plus} onClick={addTask} style={{ marginTop: 8 }}>Add task</Button>
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="timeline">
            {app.timeline
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="tl-item">
                  <div className="tl-rail"><span className="tl-dot" /></div>
                  <div className="tl-body">
                    <div className="small">{e.text}</div>
                    <div className="tiny dim" style={{ marginTop: 2 }}>
                      {fmtDate(e.at, { year: true, hour: 'numeric', minute: '2-digit' })} · {relTime(e.at)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}

function Fact({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: '10px 12px', boxShadow: 'none' }}>
      <div className="label">{label}</div>
      <div className="small strong" style={{ marginTop: 3 }}>{value}</div>
      {sub ? <div className="tiny dim">{sub}</div> : null}
    </div>
  )
}
