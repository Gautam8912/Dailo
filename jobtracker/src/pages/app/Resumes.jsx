import { useState } from 'react'
import { FileText, Plus, Star, Trash2, Download, UploadCloud, Sparkles, Copy } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { fmtDate, relTime, uid } from '../../lib/format.js'
import { Button, EmptyState, Field, Input, Modal, Tag } from '../../components/ui.jsx'

const templates = [
  { name: 'ATS-safe one pager', tag: 'engineering', desc: 'Single column, no tables, keyword-first summary.' },
  { name: 'Product narrative', tag: 'design', desc: 'Case-study led layout with a strong opening statement.' },
  { name: 'Cold email intro', tag: 'outreach', desc: 'Four lines: who you are, the proof, the ask, the close.' },
  { name: 'Follow-up note', tag: 'after interview', desc: 'Warm, specific, references the exact round.' },
]

export default function Resumes() {
  const { currentUser, dispatch, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', target: '', size: 'PDF' })

  const resumes = currentUser?.resumes || []

  const add = () => {
    if (!form.name.trim()) return
    dispatch({
      type: 'addResume',
      userId: currentUser.id,
      resume: { id: uid('res'), name: form.name.trim(), target: form.target || 'General', size: form.size || 'PDF', updatedAt: new Date().toISOString(), primary: resumes.length === 0 },
    })
    setForm({ name: '', target: '', size: 'PDF' })
    setOpen(false)
    toast('Resume version added')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Documents</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Resumes & templates</h1>
          <p className="page-sub">Keep one canonical resume per direction, and pull from templates when a follow-up matters.</p>
        </div>
        <Button variant="dark" icon={Plus} onClick={() => setOpen(true)}>Add version</Button>
      </div>

      <div className="grid g-main">
        <div>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <span className="eyebrow">Your versions · {resumes.length}</span>
            <span className="tiny dim">stored locally for this demo</span>
          </div>
          {resumes.length === 0 ? (
            <EmptyState
              icon={UploadCloud}
              title="No resume versions yet"
              body="Add a filename and target role to keep track of which resume went where."
              action={<Button size="sm" icon={Plus} onClick={() => setOpen(true)}>Add your first</Button>}
            />
          ) : (
            <div className="col" style={{ gap: 9 }}>
              {resumes.map((r) => (
                <div key={r.id} className="card" style={{ padding: 14 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <span className="empty-icon" style={{ width: 42, height: 42, borderRadius: 12 }}>
                      <FileText />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 7 }}>
                        <span className="small strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                        {r.primary ? <Tag tone="moss">Primary</Tag> : null}
                      </div>
                      <div className="tiny dim" style={{ marginTop: 2 }}>
                        {r.target} · {r.size} · updated {fmtDate(r.updatedAt, { year: true })} ({relTime(r.updatedAt)})
                      </div>
                    </div>
                    <div className="row" style={{ gap: 0 }}>
                      <button className="icon-btn" title={r.primary ? 'Primary' : 'Make primary'} onClick={() => dispatch({ type: 'updateUser', id: currentUser.id, patch: { resumes: resumes.map((x) => ({ ...x, primary: x.id === r.id })) } })}>
                        <Star fill={r.primary ? 'var(--mustard)' : 'none'} stroke={r.primary ? 'var(--mustard)' : 'currentColor'} />
                      </button>
                      <button className="icon-btn" title="Download" onClick={() => toast(`Download is a stub — ${r.name} would be fetched here.`)}>
                        <Download />
                      </button>
                      <button className="icon-btn" title="Delete" onClick={() => { dispatch({ type: 'deleteResume', userId: currentUser.id, resumeId: r.id }); toast('Version removed', 'err') }}>
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card pad" style={{ marginTop: 14 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <div className="eyebrow">Templates</div>
                <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Reusable notes</div>
              </div>
              <Tag tone="clay"><Sparkles size={10} /> curated</Tag>
            </div>
            <div className="grid g2" style={{ gap: 9 }}>
              {templates.map((t) => (
                <div key={t.name} className="card" style={{ padding: 12, background: 'var(--paper)' }}>
                  <div className="row-between">
                    <span className="small strong">{t.name}</span>
                    <button className="icon-btn" title="Copy" onClick={() => { navigator.clipboard?.writeText(`${t.name}: ${t.desc}`); toast('Template copied to clipboard') }}>
                      <Copy />
                    </button>
                  </div>
                  <p className="tiny muted" style={{ marginTop: 4, lineHeight: 1.5 }}>{t.desc}</p>
                  <Tag className="tiny" style={{ marginTop: 8 }}>{t.tag}</Tag>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow">Checklist</div>
            <div className="serif" style={{ fontSize: 21, margin: '2px 0 10px' }}>Before you send</div>
            <div className="col" style={{ gap: 7 }}>
              {['One page for <8 years experience', 'Mirror the JD keywords verbatim', 'Numbers in every bullet', 'Links: portfolio, GitHub, LinkedIn', 'File name: Name_Role_Year.pdf'].map((t) => (
                <div key={t} className="row small" style={{ gap: 7 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--moss)', flex: 'none' }} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="card pad">
            <div className="row-between">
              <span className="eyebrow">Storage</span>
              <Tag>{resumes.length} files</Tag>
            </div>
            <div className="bar" style={{ marginTop: 10 }}>
              <span style={{ width: `${Math.min(100, resumes.length * 18)}%`, background: 'var(--clay)' }} />
            </div>
            <p className="tiny dim" style={{ marginTop: 8 }}>
              Demo only — metadata lives in localStorage. Wire a file store for real uploads.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a resume version"
        subtitle="Just the metadata for this demo."
        icon={UploadCloud}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="dark" onClick={add}>Add version</Button>
          </>
        }
      >
        <div className="col" style={{ gap: 10 }}>
          <Field label="File name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aarav_Frontend_2026.pdf" autoFocus />
          </Field>
          <Field label="Target role">
            <Input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Senior Frontend Engineer" />
          </Field>
          <div className="banner banner-slate">
            <UploadCloud /> Files are not uploaded in this demo — only the reference is stored.
          </div>
        </div>
      </Modal>
    </>
  )
}
