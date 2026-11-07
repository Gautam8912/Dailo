import { useState } from 'react'
import { Megaphone, Send, Users, Crown, UserCheck, Eye, Clock } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { fmtDate, relTime } from '../../lib/format.js'
import { Button, Field, Input, Modal, Tag, Textarea } from '../../components/ui.jsx'

const audiences = [
  { id: 'all', label: 'Everyone', icon: Users, desc: 'All registered accounts' },
  { id: 'pro', label: 'Pro users', icon: Crown, desc: 'Only paid plans' },
  { id: 'active', label: 'Active only', icon: UserCheck, desc: 'Excludes suspended' },
]

export default function Broadcast() {
  const { users, broadcasts, dispatch, toast } = useStore()
  const [audience, setAudience] = useState('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)

  const targets = users.filter((u) => (audience === 'all' ? true : audience === 'pro' ? u.plan === 'Pro' : u.status === 'active'))

  const send = () => {
    if (!title.trim() || !body.trim()) {
      toast('Title and message are required', 'err')
      return
    }
    dispatch({
      type: 'addBroadcast',
      broadcast: { id: `bc_${Date.now().toString(36)}`, title: title.trim(), body: body.trim(), audience, at: new Date().toISOString(), sentBy: 'adm_1', recipients: targets.length },
    })
    toast(`Broadcast sent to ${targets.length} users`)
    setTitle('')
    setBody('')
    setPreview(false)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Communication</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Broadcasts</h1>
          <p className="page-sub">Announcements that land in each user's notification inbox.</p>
        </div>
        <Tag tone="clay"><Megaphone size={11} /> {broadcasts.length} sent</Tag>
      </div>

      <div className="grid g-split">
        <div className="card pad">
          <div className="eyebrow">Compose</div>
          <div className="serif" style={{ fontSize: 22, margin: '2px 0 12px' }}>New announcement</div>
          <div className="col" style={{ gap: 11 }}>
            <div>
              <span className="label">Audience</span>
              <div className="col" style={{ gap: 6, marginTop: 6 }}>
                {audiences.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudience(a.id)}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderColor: audience === a.id ? 'var(--ink)' : 'var(--line)',
                      background: audience === a.id ? 'var(--paper-2)' : 'var(--card)',
                    }}
                  >
                    <a.icon size={15} style={{ color: audience === a.id ? 'var(--clay)' : 'var(--ink-4)' }} />
                    <span style={{ flex: 1 }}>
                      <span className="small strong" style={{ display: 'block' }}>{a.label}</span>
                      <span className="tiny dim">{a.desc}</span>
                    </span>
                    <span className="tiny mono dim">{users.filter((u) => (a.id === 'all' ? true : a.id === 'pro' ? u.plan === 'Pro' : u.status === 'active')).length}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New follow-up templates are live" />
            </Field>
            <Field label="Message">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Keep it short — one idea, one action." />
            </Field>
            <div className="row" style={{ gap: 7 }}>
              <Button variant="dark" icon={Send} onClick={send} disabled={!targets.length}>Send to {targets.length}</Button>
              <Button icon={Eye} onClick={() => setPreview(true)} disabled={!title || !body}>Preview</Button>
            </div>
            <p className="tiny dim">Recipients get an unread notification immediately. Nothing is emailed in this demo.</p>
          </div>
        </div>

        <div className="card pad">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="eyebrow">History</div>
              <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Sent announcements</div>
            </div>
            <span className="tag"><Clock size={11} /> newest first</span>
          </div>
          {broadcasts.length === 0 ? (
            <p className="small muted">No announcements sent yet.</p>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {broadcasts.map((b) => (
                <div key={b.id} className="card" style={{ padding: 12, background: 'var(--paper)' }}>
                  <div className="row-between" style={{ gap: 8 }}>
                    <span className="small strong">{b.title}</span>
                    <Tag tone={b.audience === 'all' ? 'slate' : b.audience === 'pro' ? 'mustard' : 'moss'}>{b.audience}</Tag>
                  </div>
                  <p className="tiny muted" style={{ marginTop: 4, lineHeight: 1.5 }}>{b.body}</p>
                  <div className="row-between tiny dim" style={{ marginTop: 7 }}>
                    <span>{fmtDate(b.at, { year: true })} · {relTime(b.at)}</span>
                    <span>{b.recipients} recipients</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Preview notification"
        subtitle={`Will reach ${targets.length} users in the ${audience} audience.`}
        icon={Eye}
        footer={<><Button variant="ghost" onClick={() => setPreview(false)}>Keep editing</Button><Button variant="dark" icon={Send} onClick={send}>Send now</Button></>}
      >
        <div className="card" style={{ padding: 14, borderLeft: '3px solid var(--clay)' }}>
          <div className="row" style={{ gap: 7 }}>
            <span className="small strong">{title || 'Untitled'}</span>
            <Tag tone="slate">system</Tag>
          </div>
          <p className="small muted" style={{ marginTop: 4 }}>{body || 'No message yet.'}</p>
          <div className="tiny dim" style={{ marginTop: 6 }}>just now</div>
        </div>
      </Modal>
    </>
  )
}
