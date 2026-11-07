import { useMemo, useState } from 'react'
import { BriefcaseBusiness, Search, Download, Eye, Star, ArrowRight, MapPin } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { STATUSES, STATUS_MAP, SOURCES } from '../../lib/constants.js'
import { fmtDate, fmtLPA, relTime } from '../../lib/format.js'
import { Avatar, Button, Dropdown, EmptyState, IconButton, Logo, Modal, PriorityTag, SearchInput, StatusPill, Tag } from '../../components/ui.jsx'
import { StatusDonut } from '../../components/charts.jsx'

export default function AdminApplications() {
  const { applications, users, dispatch, toast } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [user, setUser] = useState('all')
  const [source, setSource] = useState('all')
  const [detail, setDetail] = useState(null)
  const [sort, setSort] = useState('updated')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return applications
      .filter((a) => {
        const owner = users.find((u) => u.id === a.userId)
        if (needle && !`${a.company} ${a.role} ${owner?.name || ''}`.toLowerCase().includes(needle)) return false
        if (status !== 'all' && a.status !== status) return false
        if (user !== 'all' && a.userId !== user) return false
        if (source !== 'all' && a.source !== source) return false
        return true
      })
      .sort((a, b) => (sort === 'applied' ? new Date(b.appliedDate) - new Date(a.appliedDate) : new Date(b.updatedAt) - new Date(a.updatedAt)))
  }, [applications, users, q, status, user, source, sort])

  const owner = (a) => users.find((u) => u.id === a.userId)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Moderation</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>All applications</h1>
          <p className="page-sub">{applications.length} records across {users.length} users. Read-only view — moderation can hide records.</p>
        </div>
        <Button icon={Download} onClick={() => toast('Export queued — 40 rows in the full build.')}>Export CSV</Button>
      </div>

      <div className="grid g-main" style={{ marginBottom: 14 }}>
        <div className="card pad">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <SearchInput value={q} onChange={setQ} placeholder="Search company, role, user…" />
            </div>
            <Dropdown value={status} onChange={setStatus} label="Stage" options={[{ value: 'all', label: 'All stages' }, ...STATUSES.map((s) => ({ value: s.id, label: s.label, dot: s.color }))]} />
            <Dropdown value={user} onChange={setUser} label="User" options={[{ value: 'all', label: 'Everyone' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
            <Dropdown value={source} onChange={setSource} label="Source" options={[{ value: 'all', label: 'All sources' }, ...SOURCES.map((s) => ({ value: s, label: s }))]} />
            <Dropdown value={sort} onChange={setSort} label="Sort" options={[{ value: 'updated', label: 'Recently updated' }, { value: 'applied', label: 'Applied date' }]} align="right" />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={BriefcaseBusiness} title="No records" body="Try a different stage or user filter." />
          ) : (
            <div className="table-wrap" style={{ boxShadow: 'none' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Company / role</th>
                    <th>User</th>
                    <th>Stage</th>
                    <th>Priority</th>
                    <th>Source</th>
                    <th>Band</th>
                    <th>Updated</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 24).map((a) => {
                    const u = owner(a)
                    return (
                      <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(a)}>
                        <td>
                          <div className="row" style={{ gap: 9 }}>
                            <Logo company={a.company} color={a.logo} />
                            <div>
                              <div className="cell-main">{a.company}</div>
                              <div className="cell-sub">{a.role}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="row" style={{ gap: 7 }}>
                            <Avatar name={u?.name} size="sm" color={u?.avatarColor} />
                            <span className="small">{u?.name}</span>
                          </div>
                        </td>
                        <td><StatusPill status={a.status} /></td>
                        <td><PriorityTag priority={a.priority} /></td>
                        <td className="small">{a.source}</td>
                        <td className="small tnum">{a.salaryMax ? fmtLPA(a.salaryMax) : '—'}</td>
                        <td className="small muted">{relTime(a.updatedAt)}</td>
                        <td><IconButton icon={Eye} label="Inspect" onClick={(e) => { e.stopPropagation(); setDetail(a) }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="tiny dim" style={{ marginTop: 9 }}>Showing {Math.min(filtered.length, 24)} of {filtered.length} matching records.</p>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="eyebrow">All stages</div>
            <div className="serif" style={{ fontSize: 22, margin: '2px 0 12px' }}>Platform split</div>
            <StatusDonut applications={applications} size={140} />
          </div>
          <div className="card pad">
            <div className="eyebrow">By user</div>
            <div className="col" style={{ gap: 8, marginTop: 8 }}>
              {users.map((u) => {
                const n = applications.filter((a) => a.userId === u.id).length
                const max = Math.max(...users.map((x) => applications.filter((a) => a.userId === x.id).length), 1)
                return (
                  <div key={u.id}>
                    <div className="row-between tiny" style={{ marginBottom: 3 }}>
                      <span className="row" style={{ gap: 5 }}><Avatar name={u.name} size="sm" color={u.avatarColor} /> <span className="small">{u.name}</span></span>
                      <span className="tnum strong">{n}</span>
                    </div>
                    <div className="bar" style={{ height: 4 }}>
                      <span style={{ width: `${(n / max) * 100}%`, background: u.status === 'active' ? 'var(--ink)' : 'var(--ink-4)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.role}` : ''}
        subtitle={detail ? `${detail.company} · ${detail.location} · ${detail.workMode}` : ''}
        icon={BriefcaseBusiness}
        width="modal-wide"
        footer={
          detail ? (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              <Button
                variant="soft"
                icon={Star}
                onClick={() => {
                  dispatch({ type: 'updateApp', id: detail.id, patch: { starred: !detail.starred } })
                  setDetail({ ...detail, starred: !detail.starred })
                }}
              >
                {detail.starred ? 'Unflag' : 'Flag for review'}
              </Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <Logo company={detail.company} size="lg" color={detail.logo} />
              <div style={{ flex: 1 }}>
                <div className="row wrap" style={{ gap: 5 }}>
                  <StatusPill status={detail.status} />
                  <PriorityTag priority={detail.priority} />
                  <Tag>{detail.source}</Tag>
                  {detail.starred ? <Tag tone="mustard"><Star size={10} fill="currentColor" /> flagged</Tag> : null}
                </div>
                <div className="tiny muted row" style={{ gap: 10, marginTop: 6 }}>
                  <span>Applied {fmtDate(detail.appliedDate, { year: true })}</span>
                  <span>· Updated {relTime(detail.updatedAt)}</span>
                  <span>· {detail.salaryMax ? `${fmtLPA(detail.salaryMin)}–${fmtLPA(detail.salaryMax)}` : 'band hidden'}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 11, background: 'var(--paper)' }}>
              <div className="label">Owner</div>
              <div className="row" style={{ gap: 8, marginTop: 5 }}>
                <Avatar name={owner(detail)?.name} size="sm" color={owner(detail)?.avatarColor} />
                <span className="small strong">{owner(detail)?.name}</span>
                <span className="tiny dim">{owner(detail)?.email}</span>
              </div>
            </div>

            {detail.notes ? (
              <div>
                <div className="label" style={{ marginBottom: 5 }}>Notes</div>
                <div className="card" style={{ padding: 11, background: 'var(--paper)', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.notes}</div>
              </div>
            ) : null}

            <div className="grid g2" style={{ gap: 10 }}>
              <div>
                <div className="label" style={{ marginBottom: 5 }}>Interviews ({detail.interviews.length})</div>
                <div className="col" style={{ gap: 6 }}>
                  {detail.interviews.length === 0 ? <p className="tiny dim">None scheduled.</p> : detail.interviews.map((i) => (
                    <div key={i.id} className="row-between small" style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8 }}>
                      <span>{i.stage}</span>
                      <span className="tiny dim">{fmtDate(i.date)} · {i.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 5 }}>Timeline</div>
                <div className="timeline">
                  {detail.timeline.slice(-4).reverse().map((t) => (
                    <div key={t.id} className="tl-item">
                      <div className="tl-rail"><span className="tl-dot" /></div>
                      <div className="tl-body">
                        <div className="tiny">{t.text}</div>
                        <div className="tiny dim">{relTime(t.at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
