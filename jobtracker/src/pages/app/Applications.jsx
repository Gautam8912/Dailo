import { useMemo, useState } from 'react'
import {
  Plus,
  LayoutGrid,
  List,
  Star,
  MapPin,
  CalendarClock,
  ArrowRight,
  Inbox,
  SlidersHorizontal,
  X,
  Trash2,
  Copy,
  ChevronRight,
} from 'lucide-react'
import { useStore, useUserApplications } from '../../lib/store.jsx'
import { STATUSES, STATUS_MAP, SOURCES, PRIORITIES } from '../../lib/constants.js'
import { fmtDate, fmtLPA, relTime, todayISO } from '../../lib/format.js'
import { Button, Dropdown, EmptyState, IconButton, Logo, PriorityTag, SearchInput, Segmented, StatusPill, Tag, CheckBox, Modal } from '../../components/ui.jsx'
import ApplicationDrawer from '../../components/ApplicationDrawer.jsx'
import ApplicationForm from '../../components/ApplicationForm.jsx'

/* exported so the sidebar + topbar can open the same form */
export { ApplicationForm as QuickAdd }

export default function Applications() {
  const { dispatch, toast } = useStore()
  const apps = useUserApplications()
  const [view, setView] = useState('board')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('updated')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = apps.filter((a) => {
      if (needle && !`${a.company} ${a.role} ${a.location} ${(a.tags || []).join(' ')}`.toLowerCase().includes(needle)) return false
      if (status !== 'all' && a.status !== status) return false
      if (source !== 'all' && a.source !== source) return false
      if (priority !== 'all' && a.priority !== priority) return false
      return true
    })
    out = out.slice().sort((a, b) => {
      if (sort === 'company') return a.company.localeCompare(b.company)
      if (sort === 'applied') return new Date(b.appliedDate) - new Date(a.appliedDate)
      if (sort === 'salary') return (b.salaryMax || 0) - (a.salaryMax || 0)
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })
    return out
  }, [apps, q, status, source, priority, sort])

  const move = (app, dir) => {
    const idx = STATUSES.findIndex((s) => s.id === app.status)
    const next = STATUSES[Math.max(0, Math.min(STATUSES.length - 1, idx + dir))]
    if (!next || next.id === app.status) return
    dispatch({
      type: 'updateApp',
      id: app.id,
      patch: { status: next.id, updatedAt: new Date().toISOString() },
    })
    toast(`${app.company} → ${next.label}`)
  }

  const activeFilters = [status !== 'all', source !== 'all', priority !== 'all'].filter(Boolean).length

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Pipeline</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Applications</h1>
          <p className="page-sub">
            {apps.length} tracked · {apps.filter((a) => ['interview', 'offer'].includes(a.status)).length} in late stages ·{' '}
            {fmtLPA(apps.reduce((acc, a) => acc + (a.salaryMax || 0), 0) / Math.max(1, apps.filter((a) => a.salaryMax).length))} avg top band
          </p>
        </div>
        <div className="toolbar">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Board' },
              { value: 'list', label: 'List' },
            ]}
          />
          <Button variant="dark" icon={Plus} onClick={() => setEditing('new')}>New application</Button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search company, role, tag…" />
        </div>
        <Dropdown label="Stage" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All stages' }, ...STATUSES.map((s) => ({ value: s.id, label: s.label, dot: s.color }))]} />
        <Button
          variant={activeFilters ? 'soft' : 'default'}
          icon={SlidersHorizontal}
          onClick={() => setShowFilters((v) => !v)}
          className={activeFilters ? 'btn-clay' : ''}
        >
          Filters {activeFilters ? `· ${activeFilters}` : ''}
        </Button>
        <div className="spacer" />
        <Dropdown label="Sort" value={sort} onChange={setSort} options={[
          { value: 'updated', label: 'Recently updated' },
          { value: 'applied', label: 'Newest applied' },
          { value: 'company', label: 'Company A–Z' },
          { value: 'salary', label: 'Top salary' },
        ]} align="right" />
      </div>

      {showFilters ? (
        <div className="card pad-sm" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, animation: 'fade-up .2s var(--ease)' }}>
          <div style={{ minWidth: 150 }}>
            <span className="label">Source</span>
            <select className="select" value={source} onChange={(e) => setSource(e.target.value)} style={{ marginTop: 5 }}>
              <option value="all">All sources</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 150 }}>
            <span className="label">Priority</span>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ marginTop: 5 }}>
              <option value="all">All priorities</option>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="spacer" />
          <Button size="sm" variant="ghost" icon={X} onClick={() => { setStatus('all'); setSource('all'); setPriority('all'); setQ('') }}>
            Clear all
          </Button>
        </div>
      ) : null}

      {view === 'board' ? (
        <Board apps={filtered} onOpen={setSelected} onMove={move} onAdd={() => setEditing('new')} />
      ) : (
        <ListView apps={filtered} onOpen={setSelected} onMove={move} onDelete={(a) => { dispatch({ type: 'deleteApp', id: a.id }); toast('Application deleted', 'err') }} onAdd={() => setEditing('new')} />
      )}

      <ApplicationDrawer app={selected} onClose={() => setSelected(null)} onEdit={(a) => { setSelected(null); setEditing(a) }} />
      <ApplicationForm open={Boolean(editing)} editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </>
  )
}

/* ------------------------------------------------------------------- board */
function Board({ apps, onOpen, onMove, onAdd }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(186px, 1fr))', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
      {STATUSES.map((col) => {
        const items = apps.filter((a) => a.status === col.id)
        return (
          <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div className="row-between" style={{ padding: '0 2px 4px' }}>
              <span className="row" style={{ gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: col.color }} />
                <span className="small strong">{col.label}</span>
              </span>
              <span className="mono tiny dim" style={{ background: 'var(--paper-2)', borderRadius: 99, padding: '1px 7px' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
              {items.map((a) => (
                <div key={a.id} className="job-card" onClick={() => onOpen(a)}>
                  <div className="job-card-top">
                    <Logo company={a.company} color={a.logo} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="small strong" style={{ lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.role}</div>
                      <div className="tiny muted" style={{ marginTop: 2 }}>{a.company}</div>
                    </div>
                  </div>
                  <div className="row wrap" style={{ gap: 4 }}>
                    {a.priority !== 'medium' ? <PriorityTag priority={a.priority} /> : null}
                    {a.starred ? <span className="tag" style={{ padding: '0 6px' }}><Star size={10} fill="var(--mustard)" stroke="var(--mustard)" /></span> : null}
                    {a.tags?.slice(0, 1).map((t) => <Tag key={t}>#{t}</Tag>)}
                  </div>
                  <div className="row-between" style={{ marginTop: 'auto', paddingTop: 2 }}>
                    <span className="tiny dim row" style={{ gap: 4 }}><MapPin size={10} /> {a.location.split(',')[0]}</span>
                    <span className="tiny dim">{a.salaryMax ? fmtLPA(a.salaryMax) : ''}</span>
                  </div>
                  <div className="row" style={{ gap: 4, borderTop: '1px solid var(--line)', paddingTop: 7, marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost" style={{ height: 24, padding: '0 7px', fontSize: 11 }} onClick={() => onMove(a, 1)} disabled={col.id === 'rejected'} title="Advance stage">
                      Advance <ChevronRight size={11} />
                    </button>
                    <div className="spacer" />
                    <span className="tiny dim">{relTime(a.updatedAt)}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 ? (
                <button
                  onClick={onAdd}
                  style={{ border: '1px dashed var(--line-strong)', background: 'transparent', borderRadius: 10, padding: '16px 8px', fontSize: 11.5, color: 'var(--ink-4)', cursor: 'pointer' }}
                >
                  + Add here
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------- list */
function ListView({ apps, onOpen, onMove, onDelete, onAdd }) {
  const [picked, setPicked] = useState([])
  const [confirm, setConfirm] = useState(false)
  const all = picked.length === apps.length && apps.length > 0

  if (!apps.length) {
    return <EmptyState icon={Inbox} title="No applications match" body="Try clearing filters or add your next role." action={<Button size="sm" icon={Plus} onClick={onAdd}>Add application</Button>} />
  }

  return (
    <>
      {picked.length ? (
        <div className="banner banner-slate" style={{ marginBottom: 10 }}>
          <span className="small strong">{picked.length} selected</span>
          <span className="spacer" />
          <Button size="sm" variant="ghost" icon={Copy}>Export</Button>
          <Button size="sm" variant="ghost" icon={Trash2} style={{ color: 'var(--cherry)' }} onClick={() => setConfirm(true)}>Delete</Button>
        </div>
      ) : null}
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 34 }}>
                <CheckBox checked={all} label="Select all" onChange={() => setPicked(all ? [] : apps.map((a) => a.id))} />
              </th>
              <th>Role</th>
              <th>Stage</th>
              <th>Priority</th>
              <th>Source</th>
              <th>Salary</th>
              <th>Applied</th>
              <th>Next step</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} onClick={() => onOpen(a)} style={{ cursor: 'pointer' }}>
                <td onClick={(e) => e.stopPropagation()}>
                  <CheckBox checked={picked.includes(a.id)} label={`Select ${a.company}`} onChange={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))} />
                </td>
                <td>
                  <div className="row" style={{ gap: 9 }}>
                    <Logo company={a.company} color={a.logo} />
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-main" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {a.role}
                        {a.starred ? <Star size={11} fill="var(--mustard)" stroke="var(--mustard)" /> : null}
                      </div>
                      <div className="cell-sub">{a.company} · {a.location}</div>
                    </div>
                  </div>
                </td>
                <td><StatusPill status={a.status} /></td>
                <td><PriorityTag priority={a.priority} /></td>
                <td className="small">{a.source}</td>
                <td className="small tnum">{a.salaryMax ? `${fmtLPA(a.salaryMin)}–${fmtLPA(a.salaryMax)}` : <span className="dim">—</span>}</td>
                <td className="small tnum">{fmtDate(a.appliedDate)}</td>
                <td className="small" style={{ maxWidth: 180 }}>
                  {a.nextStep ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CalendarClock size={11} /> {a.nextStep}</span> : <span className="dim">—</span>}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="row" style={{ gap: 0, justifyContent: 'flex-end' }}>
                    <IconButton icon={ArrowRight} label="Advance" onClick={() => onMove(a, 1)} />
                    <IconButton icon={Trash2} label="Delete" onClick={() => onDelete(a)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete applications?"
        subtitle={`${picked.length} application(s) will be removed from your pipeline.`}
        icon={Trash2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="clay" onClick={() => { picked.forEach((id) => onDelete({ id })); setPicked([]); setConfirm(false) }}>Delete {picked.length}</Button>
          </>
        }
      >
        <p className="small muted">This removes the rows, their tasks and interview slots. There is no undo.</p>
      </Modal>
    </>
  )
}
