import { useMemo, useState } from 'react'
import { Plus, ListTodo, CheckCircle2, Circle, Trash2, CalendarDays, Flag, Inbox, Clock } from 'lucide-react'
import { useStore, useUserApplications, useUserTasks } from '../../lib/store.jsx'
import { TASK_KINDS } from '../../lib/constants.js'
import { fmtDate, todayISO, uid } from '../../lib/format.js'
import { Button, CheckBox, EmptyState, Field, Input, Metric, Segmented, Select, Tag } from '../../components/ui.jsx'

export default function Tasks() {
  const { dispatch, toast, currentUser } = useStore()
  const tasks = useUserTasks()
  const apps = useUserApplications()
  const [filter, setFilter] = useState('open')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('Follow up')
  const [due, setDue] = useState(todayISO())
  const [appId, setAppId] = useState('')

  const today = todayISO()
  const grouped = useMemo(() => {
    const visible = tasks.filter((t) => (filter === 'open' ? !t.done : filter === 'done' ? t.done : true))
    const overdue = visible.filter((t) => !t.done && t.due < today).sort((a, b) => a.due.localeCompare(b.due))
    const todays = visible.filter((t) => !t.done && t.due === today)
    const upcoming = visible.filter((t) => !t.done && t.due > today).sort((a, b) => a.due.localeCompare(b.due))
    const done = visible.filter((t) => t.done).sort((a, b) => b.due.localeCompare(a.due))
    return { overdue, todays, upcoming, done }
  }, [tasks, filter, today])

  const add = () => {
    if (!title.trim()) return
    dispatch({
      type: 'addTask',
      task: { id: uid('tsk'), userId: currentUser.id, title: title.trim(), kind, due, done: false, appId: appId || null, priority: 'medium' },
    })
    setTitle('')
    toast('Task added')
  }

  const total = tasks.length
  const doneCount = tasks.filter((t) => t.done).length
  const overdueCount = tasks.filter((t) => !t.done && t.due < today).length

  const Section = ({ label, items, tone }) => {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 18 }}>
        <div className="row" style={{ gap: 7, marginBottom: 8 }}>
          <span className="eyebrow">{label}</span>
          <span className="mono tiny dim">{items.length}</span>
          <span className="hairline" style={{ flex: 1 }} />
        </div>
        <div className="col" style={{ gap: 6 }}>
          {items.map((t) => {
            const app = apps.find((a) => a.id === t.appId)
            return (
              <div
                key={t.id}
                className="card row"
                style={{ padding: '10px 12px', gap: 10, background: t.done ? 'transparent' : 'var(--card)', borderStyle: t.done ? 'dashed' : 'solid' }}
              >
                <CheckBox checked={t.done} label={t.title} onChange={() => dispatch({ type: 'updateTask', id: t.id, patch: { done: !t.done } })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small" style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-4)' : 'var(--ink)', fontWeight: 500 }}>
                    {t.title}
                  </div>
                  <div className="row wrap tiny dim" style={{ gap: 8, marginTop: 2 }}>
                    <span className="row" style={{ gap: 3 }}><Flag size={10} /> {t.kind}</span>
                    {app ? <span>{app.company}</span> : null}
                    <span className="row" style={{ gap: 3, color: tone === 'cherry' ? 'var(--cherry)' : undefined }}><Clock size={10} /> {t.due === today ? 'today' : fmtDate(t.due)}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 5 }}>
                  {t.due < today && !t.done ? <Tag tone="cherry">Overdue</Tag> : null}
                  {t.due === today && !t.done ? <Tag tone="clay">Today</Tag> : null}
                  <button className="icon-btn" aria-label="Delete task" onClick={() => dispatch({ type: 'deleteTask', id: t.id })}>
                    <Trash2 />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Checklist</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Tasks</h1>
          <p className="page-sub">Follow-ups, prep and thank-you notes. Auto-queued ones land here too.</p>
        </div>
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }]} />
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Metric label="Open tasks" value={tasks.filter((t) => !t.done).length} icon={ListTodo} />
        <Metric label="Due today" value={tasks.filter((t) => !t.done && t.due === today).length} icon={CalendarDays} accent="var(--clay)" />
        <Metric label="Overdue" value={overdueCount} icon={Clock} accent={overdueCount ? 'var(--cherry)' : undefined} />
        <Metric label="Completion" value={`${total ? Math.round((doneCount / total) * 100) : 0}%`} icon={CheckCircle2} foot={<div className="bar" style={{ flex: 1, marginLeft: 4 }}><span style={{ width: `${total ? (doneCount / total) * 100 : 0}%`, background: 'var(--moss)' }} /></div>} />
      </div>

      <div className="grid g-split">
        <div className="card pad">
          <div className="eyebrow">Quick add</div>
          <div className="serif" style={{ fontSize: 21, margin: '2px 0 12px' }}>New task</div>
          <div className="col" style={{ gap: 9 }}>
            <Field label="What needs doing?">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with recruiter" onKeyDown={(e) => e.key === 'Enter' && add()} />
            </Field>
            <div className="grid g2" style={{ gap: 8 }}>
              <Field label="Kind">
                <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                  {TASK_KINDS.map((k) => <option key={k}>{k}</option>)}
                </Select>
              </Field>
              <Field label="Due">
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
            <Field label="Link to application">
              <Select value={appId} onChange={(e) => setAppId(e.target.value)}>
                <option value="">None</option>
                {apps.map((a) => <option key={a.id} value={a.id}>{a.company} · {a.role}</option>)}
              </Select>
            </Field>
            <Button variant="dark" icon={Plus} onClick={add}>Add task</Button>
          </div>
        </div>

        <div>
          {tasks.length === 0 ? (
            <EmptyState icon={Inbox} title="No tasks yet" body="Add a follow-up or let new applications auto-queue one for you." />
          ) : (
            <>
              <Section label="Overdue" items={grouped.overdue} tone="cherry" />
              <Section label="Today" items={grouped.todays} />
              <Section label="Upcoming" items={grouped.upcoming} />
              <Section label="Completed" items={grouped.done} />
              {!grouped.overdue.length && !grouped.todays.length && !grouped.upcoming.length && !grouped.done.length ? (
                <EmptyState icon={CheckCircle2} title="Nothing here" body="Switch the filter or add a new task." />
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  )
}
