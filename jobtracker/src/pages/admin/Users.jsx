import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  MoreHorizontal,
  ShieldOff,
  ShieldCheck,
  Trash2,
  ArrowRight,
  Download,
  Eye,
  Mail,
  MapPin,
  CalendarDays,
  BriefcaseBusiness,
} from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { fmtDate, relTime, uid } from '../../lib/format.js'
import { STATUSES } from '../../lib/constants.js'
import { Avatar, Button, Dropdown, EmptyState, Field, Input, Modal, SearchInput, Select, StatusPill, Tag, Segmented } from '../../components/ui.jsx'

export default function AdminUsers() {
  const { users, applications, dispatch, toast } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [plan, setPlan] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage] = useState(1)
  const perPage = 8
  const navigate = useNavigate()

  const enriched = useMemo(
    () =>
      users.map((u) => {
        const ua = applications.filter((a) => a.userId === u.id)
        return {
          ...u,
          count: ua.length,
          offers: ua.filter((a) => a.status === 'offer').length,
          interviews: ua.filter((a) => a.status === 'interview').length,
        }
      }),
    [users, applications],
  )

  const filtered = enriched.filter((u) => {
    const needle = q.trim().toLowerCase()
    if (needle && !`${u.name} ${u.email} ${u.title}`.toLowerCase().includes(needle)) return false
    if (status !== 'all' && u.status !== status) return false
    if (plan !== 'all' && u.plan !== plan) return false
    return true
  })
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const slice = filtered.slice((page - 1) * perPage, page * perPage)

  const setUserStatus = (u, next) => {
    dispatch({ type: 'adminSetStatus', id: u.id, status: next, name: u.name })
    toast(`${u.name} ${next === 'suspended' ? 'suspended' : 'reactivated'}`)
  }

  const viewAs = (u) => {
    dispatch({ type: 'impersonate', userId: u.id })
    navigate('/app')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">People</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Users</h1>
          <p className="page-sub">{users.length} accounts · {users.filter((u) => u.status === 'active').length} active · {users.filter((u) => u.plan === 'Pro').length} on Pro.</p>
        </div>
        <div className="toolbar">
          <Button icon={Download} onClick={() => toast('User CSV export is stubbed in this demo.')}>Export</Button>
          <Button variant="dark" icon={UserPlus} onClick={() => setAddOpen(true)}>Add user</Button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Search name, email, role…" />
        </div>
        <Dropdown value={status} onChange={(v) => { setStatus(v); setPage(1) }} label="Status" options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active', dot: '#40624a' }, { value: 'suspended', label: 'Suspended', dot: '#a33a3a' }]} />
        <Dropdown value={plan} onChange={(v) => { setPlan(v); setPage(1) }} label="Plan" options={[{ value: 'all', label: 'All' }, { value: 'Pro', label: 'Pro' }, { value: 'Free', label: 'Free' }]} />
      </div>

      {slice.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users match" body="Adjust the filters, or invite someone new." action={<Button size="sm" icon={UserPlus} onClick={() => setAddOpen(true)}>Add user</Button>} />
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Tracked</th>
                <th>Offers</th>
                <th>Joined</th>
                <th>Last active</th>
                <th>Status</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 9 }}>
                      <Avatar name={u.name} size="md" color={u.avatarColor} />
                      <div>
                        <div className="cell-main">{u.name}</div>
                        <div className="cell-sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><Tag tone={u.plan === 'Pro' ? 'mustard' : ''}>{u.plan}</Tag></td>
                  <td className="tnum strong">{u.count}</td>
                  <td className="tnum">{u.offers}</td>
                  <td className="small tnum">{fmtDate(u.joinedAt)}</td>
                  <td className="small muted">{relTime(u.lastActive)}</td>
                  <td><Tag tone={u.status === 'active' ? 'moss' : 'cherry'} dot>{u.status}</Tag></td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <Button size="sm" variant="ghost" icon={Eye} onClick={() => setDetail(u)}>View</Button>
                      <button className="icon-btn" title={u.status === 'active' ? 'Suspend' : 'Reactivate'} onClick={() => setUserStatus(u, u.status === 'active' ? 'suspended' : 'active')}>
                        {u.status === 'active' ? <ShieldOff /> : <ShieldCheck />}
                      </button>
                      <button className="icon-btn" title="Delete" onClick={() => setConfirmDelete(u)}>
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="row-between" style={{ marginTop: 12 }}>
        <span className="tiny dim">Showing {slice.length} of {filtered.length} users</span>
        <div className="row" style={{ gap: 4 }}>
          <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-dark' : 'btn-ghost'}`} style={{ width: 30, padding: 0 }} onClick={() => setPage(i + 1)}>
              {i + 1}
            </button>
          ))}
          <Button size="sm" variant="ghost" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name}
        subtitle={`${detail?.email} · joined ${detail ? fmtDate(detail.joinedAt, { year: true }) : ''}`}
        icon={UsersIcon}
        width="modal-wide"
        footer={
          detail ? (
            <>
              <Button variant="ghost" onClick={() => setUserStatus(detail, detail.status === 'active' ? 'suspended' : 'active')}>
                {detail.status === 'active' ? 'Suspend account' : 'Reactivate'}
              </Button>
              <Button variant="dark" icon={ArrowRight} onClick={() => viewAs(detail)}>Open as this user</Button>
            </>
          ) : null
        }
      >
        {detail ? <UserDetail user={detail} /> : null}
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this account?"
        subtitle={confirmDelete ? `${confirmDelete.name} · ${confirmDelete.email}` : ''}
        icon={Trash2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="clay"
              onClick={() => {
                dispatch({ type: 'adminDeleteUser', id: confirmDelete.id })
                toast(`${confirmDelete.name} deleted`, 'err')
                setConfirmDelete(null)
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="small muted">
          This removes the account plus every application, task and notification attached to it. In a real platform this would be a soft delete with a grace period.
        </p>
      </Modal>
    </>
  )
}

function UserDetail({ user }) {
  const { applications, tasks, notifications } = useStore()
  const apps = applications.filter((a) => a.userId === user.id)
  const userTasks = tasks.filter((t) => t.userId === user.id)
  const unread = notifications.filter((n) => n.userId === user.id && !n.read).length

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar name={user.name} size="lg" color={user.avatarColor} />
        <div style={{ flex: 1 }}>
          <div className="row wrap" style={{ gap: 5 }}>
            <Tag tone={user.status === 'active' ? 'moss' : 'cherry'} dot>{user.status}</Tag>
            <Tag tone={user.plan === 'Pro' ? 'mustard' : ''}>{user.plan}</Tag>
            <Tag>goal {user.goal}/wk</Tag>
          </div>
          <div className="row small muted wrap" style={{ gap: 12, marginTop: 7 }}>
            <span className="row" style={{ gap: 4 }}><BriefcaseBusiness size={12} /> {user.title}</span>
            <span className="row" style={{ gap: 4 }}><MapPin size={12} /> {user.location}</span>
            <span className="row" style={{ gap: 4 }}><CalendarDays size={12} /> joined {fmtDate(user.joinedAt)}</span>
          </div>
        </div>
      </div>

      {user.bio ? <p className="small muted">{user.bio}</p> : null}

      <div className="grid g4" style={{ gap: 8 }}>
        {[
          ['Tracked', apps.length],
          ['Interviews', apps.filter((a) => a.status === 'interview').length],
          ['Offers', apps.filter((a) => a.status === 'offer').length],
          ['Open tasks', userTasks.filter((t) => !t.done).length],
        ].map(([l, v]) => (
          <div key={l} className="card" style={{ padding: 10, boxShadow: 'none' }}>
            <div className="label">{l}</div>
            <div className="serif" style={{ fontSize: 26 }}>{v}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 7 }}>Applications ({apps.length})</div>
        <div className="table-wrap" style={{ boxShadow: 'none' }}>
          <table className="tbl">
            <thead>
              <tr><th>Company</th><th>Role</th><th>Stage</th><th>Applied</th></tr>
            </thead>
            <tbody>
              {apps.slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td className="cell-main">{a.company}</td>
                  <td className="small">{a.role}</td>
                  <td><StatusPill status={a.status} /></td>
                  <td className="small tnum">{fmtDate(a.appliedDate)}</td>
                </tr>
              ))}
              {apps.length === 0 ? <tr><td colSpan={4} className="small muted">No applications yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <p className="tiny dim">{unread} unread notifications · last active {relTime(user.lastActive)}</p>
    </div>
  )
}

function AddUserModal({ open, onClose }) {
  const { dispatch, toast, users } = useStore()
  const [form, setForm] = useState({ name: '', email: '', title: '', location: 'Bengaluru, IN', plan: 'Free', goal: '5' })

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required', 'err')
      return
    }
    if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
      toast('That email already exists', 'err')
      return
    }
    dispatch({
      type: 'adminAddUser',
      user: {
        id: uid('usr'),
        ...form,
        goal: Number(form.goal) || 5,
        role: 'user',
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        avatarColor: '#3f5068',
        bio: '',
        resumes: [],
      },
    })
    toast(`${form.name} added`)
    setForm({ name: '', email: '', title: '', location: 'Bengaluru, IN', plan: 'Free', goal: '5' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a user"
      subtitle="Creates an account with the demo password demo1234."
      icon={UserPlus}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="dark" onClick={submit}>Create account</Button></>}
    >
      <div className="col" style={{ gap: 10 }}>
        <div className="grid g2" style={{ gap: 9 }}>
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kabir Nair" autoFocus /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="kabir@mail.com" /></Field>
        </div>
        <div className="grid g2" style={{ gap: 9 }}>
          <Field label="Role / title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Data Engineer" /></Field>
          <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        </div>
        <div className="grid g2" style={{ gap: 9 }}>
          <Field label="Plan">
            <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              <option>Free</option>
              <option>Pro</option>
            </Select>
          </Field>
          <Field label="Weekly goal">
            <Input type="number" min="1" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
