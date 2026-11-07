import { useState } from 'react'
import { Bell, CalendarClock, ListTodo, Settings2, CheckCheck, Trash2, Inbox, ArrowRight } from 'lucide-react'
import { useStore, useUserNotifications } from '../../lib/store.jsx'
import { relTime, fmtDateTime } from '../../lib/format.js'
import { Button, EmptyState, Segmented, Tag } from '../../components/ui.jsx'

const ICONS = { interview: CalendarClock, task: ListTodo, system: Settings2 }

export default function Notifications() {
  const { dispatch, currentUser } = useStore()
  const notifications = useUserNotifications()
  const [filter, setFilter] = useState('all')

  const list = notifications.filter((n) => (filter === 'unread' ? !n.read : filter === 'all' ? true : n.kind === filter))

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Inbox</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Notifications</h1>
          <p className="page-sub">{notifications.filter((n) => !n.read).length} unread · interview reminders, queued tasks and platform notes.</p>
        </div>
        <div className="toolbar">
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'interview', label: 'Interviews' }, { value: 'system', label: 'System' }]} />
          <Button icon={CheckCheck} onClick={() => { dispatch({ type: 'readAllNotifications', userId: currentUser.id }); }}>Mark all read</Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="Inbox zero" body="Nothing here. New interview reminders and broadcast messages will show up in this space." />
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {list.map((n) => {
            const Icon = ICONS[n.kind] || Bell
            return (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: 14,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  borderLeft: `3px solid ${n.read ? 'var(--line)' : 'var(--clay)'}`,
                  background: n.read ? 'transparent' : 'var(--card)',
                }}
              >
                <span className="empty-icon" style={{ width: 36, height: 36, borderRadius: 10, flex: 'none' }}>
                  <Icon />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                    <span className="small" style={{ fontWeight: n.read ? 500 : 650 }}>{n.title}</span>
                    {!n.read ? <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--clay)' }} /> : null}
                    <Tag tone={n.kind === 'interview' ? 'clay' : n.kind === 'task' ? 'mustard' : 'slate'}>{n.kind}</Tag>
                  </div>
                  <p className="small muted" style={{ marginTop: 3, lineHeight: 1.5 }}>{n.body}</p>
                  <div className="row tiny dim" style={{ gap: 10, marginTop: 5 }}>
                    <span>{relTime(n.at)}</span>
                    <span>· {fmtDateTime(n.at)}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 0 }}>
                  {!n.read ? (
                    <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => dispatch({ type: 'readNotification', id: n.id })}>Read</Button>
                  ) : null}
                  <button className="icon-btn" aria-label="Delete" onClick={() => dispatch({ type: 'deleteNotification', id: n.id })}>
                    <Trash2 />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
