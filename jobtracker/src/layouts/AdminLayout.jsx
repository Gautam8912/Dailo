import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Users,
  BriefcaseBusiness,
  Activity,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ShieldCheck,
  Search,
  Moon,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { Avatar, Button, IconButton } from '../components/ui.jsx'

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/applications', label: 'Applications', icon: BriefcaseBusiness },
  { to: '/admin/activity', label: 'Activity log', icon: Activity },
  { to: '/admin/broadcast', label: 'Broadcasts', icon: Megaphone },
  { to: '/admin/settings', label: 'Platform settings', icon: Settings },
]

const meta = {
  '/admin': ['Admin', 'Overview'],
  '/admin/users': ['Admin', 'Users'],
  '/admin/applications': ['Admin', 'Applications'],
  '/admin/activity': ['Admin', 'Activity log'],
  '/admin/broadcast': ['Admin', 'Broadcasts'],
  '/admin/settings': ['Admin', 'Platform settings'],
}

export default function AdminLayout() {
  const { currentUser, dispatch, users, applications } = useStore()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => setOpen(false), [location.pathname])

  const [crumb, title] = meta[location.pathname] || ['Admin', 'Console']

  const impersonateRandom = () => {
    const target = users.find((u) => u.status === 'active')
    if (!target) return
    dispatch({ type: 'impersonate', userId: target.id })
    navigate('/app')
  }

  return (
    <div className="shell">
      {open ? <div className="scrim mobile-only" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? 'open' : ''}`} style={{ background: '#1c1a17', borderColor: '#2c2823' }}>
        <Link to="/admin" className="brand">
          <span className="brand-mark" style={{ background: '#b4552d' }}>
            <ShieldCheck />
          </span>
          <span>
            <span className="brand-name" style={{ color: '#f6efe2' }}>Hiretrail</span>
            <span className="brand-sub" style={{ color: '#8b8173' }}>Admin console</span>
          </span>
        </Link>

        <nav className="nav-group">
          <span className="nav-label" style={{ color: '#6f675c' }}>Manage</span>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={({ isActive }) => ({ color: isActive ? 'var(--ink)' : '#cfc5b4' })}>
              <n.icon style={{ color: '#8b8173' }} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="card" style={{ background: 'rgba(246,239,226,.05)', borderColor: 'rgba(246,239,226,.12)', padding: 13 }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#7fb98a', flex: 'none' }} />
              <span className="small" style={{ color: '#e8dfcd', fontWeight: 550 }}>All systems normal</span>
            </div>
            <p className="tiny" style={{ color: '#9d9487', marginTop: 6, lineHeight: 1.4 }}>
              {users.length} users · {applications.length} applications tracked
            </p>
            <Button
              size="sm"
              className="btn-block"
              style={{ marginTop: 10, background: 'transparent', color: '#e8dfcd', borderColor: 'rgba(246,239,226,.2)' }}
              icon={ArrowLeft}
              onClick={() => {
                dispatch({ type: 'impersonate', userId: 'usr_aarav' })
                navigate('/app')
              }}
            >
              Open user workspace
            </Button>
          </div>
          <div className="sidebar-user" onClick={() => dispatch({ type: 'logout' })} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && dispatch({ type: 'logout' })}>
            <Avatar name={currentUser?.name} size="md" color="#b4552d" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="small strong" style={{ color: '#f0e8d9' }}>{currentUser?.name}</div>
              <div className="tiny" style={{ color: '#8b8173' }}>{currentUser?.scope}</div>
            </div>
            <LogOut size={14} style={{ color: '#8b8173' }} />
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <IconButton icon={open ? X : Menu} label="Menu" className="mobile-only" onClick={() => setOpen((v) => !v)} />
          <div>
            <div className="topbar-crumb">{crumb}</div>
            <div className="topbar-title">{title}</div>
          </div>
          <div className="spacer" />
          <span className="tag tag-clay hide-sm">
            <ShieldCheck size={11} /> Admin session
          </span>
          <Button size="sm" variant="soft" icon={Users} onClick={impersonateRandom}>
            Preview as user
          </Button>
          <IconButton icon={LogOut} label="Sign out" onClick={() => { dispatch({ type: 'logout' }); navigate('/login') }} />
        </header>
        <main className="page page-wide">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
