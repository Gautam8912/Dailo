import { useMemo, useState } from 'react'
import { Activity as ActivityIcon, LogIn, BriefcaseBusiness, ListTodo, Megaphone, Download, Filter } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { fmtDateTime, relTime } from '../../lib/format.js'
import { Avatar, Button, Dropdown, EmptyState, Segmented, Tag } from '../../components/ui.jsx'

const KIND = {
  login: { icon: LogIn, tone: 'slate', label: 'Sign-in' },
  app: { icon: BriefcaseBusiness, tone: 'clay', label: 'Application' },
  task: { icon: ListTodo, tone: 'mustard', label: 'Task' },
  system: { icon: Megaphone, tone: 'plum', label: 'System' },
}

export default function AdminActivity() {
  const { activity, users, toast } = useStore()
  const [kind, setKind] = useState('all')

  const filtered = useMemo(() => activity.filter((a) => (kind === 'all' ? true : a.type === kind)), [activity, kind])

  const grouped = filtered.reduce((acc, a) => {
    const day = a.at.slice(0, 10)
    acc[day] = acc[day] || []
    acc[day].push(a)
    return acc
  }, {})

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Audit</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Activity log</h1>
          <p className="page-sub">Every sign-in, application move, task tick and admin action — newest first.</p>
        </div>
        <div className="toolbar">
          <Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'app', label: 'Apps' }, { value: 'login', label: 'Logins' }, { value: 'system', label: 'System' }]} />
          <Button icon={Download} onClick={() => toast('Log export is stubbed in this demo.')}>Export log</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity" body="Actions performed in the demo appear here instantly." />
      ) : (
        <div className="col" style={{ gap: 18 }}>
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <span className="eyebrow">
                  {new Date(day).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="hairline" style={{ flex: 1 }} />
                <span className="tiny dim">{items.length} events</span>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {items.map((a, i) => {
                  const meta = KIND[a.type] || KIND.system
                  const Icon = meta.icon
                  const user = users.find((u) => u.id === a.userId)
                  return (
                    <div
                      key={a.id}
                      className="row"
                      style={{ gap: 11, padding: '11px 14px', borderTop: i ? '1px solid var(--line)' : 0 }}
                    >
                      <span className="empty-icon" style={{ width: 28, height: 28, borderRadius: 8, flex: 'none' }}>
                        <Icon style={{ width: 13, height: 13 }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="small" style={{ color: 'var(--ink-2)' }}>{a.text}</div>
                        <div className="tiny dim" style={{ marginTop: 1 }}>{fmtDateTime(a.at)}</div>
                      </div>
                      <Tag tone={meta.tone}>{meta.label}</Tag>
                      {user ? <Avatar name={user.name} size="sm" color={user.avatarColor} /> : <Tag tone="ink">admin</Tag>}
                      <span className="tiny dim" style={{ width: 62, textAlign: 'right' }}>{relTime(a.at)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
