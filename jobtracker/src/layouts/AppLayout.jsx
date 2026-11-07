import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarDays,
  ListTodo,
  BarChart3,
  FileText,
  Bell,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
  PlusCircle,
  ShieldCheck,
  Search,
  ArrowLeftRight,
} from 'lucide-react'
import { useStore, useUserApplications, useUserNotifications, useUserTasks } from '../lib/store.jsx'
import { Avatar, Button, IconButton, StatusPill } from '../components/ui.jsx'
import { firstName } from '../lib/format.js'
import { STATUS_MAP } from '../lib/constants.js'
import { QuickAdd } from '../pages/app/Applications.jsx'

const nav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/applications', label: 'Applications', icon: BriefcaseBusiness, badge: 'apps' },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/tasks', label: 'Tasks', icon: ListTodo, badge: 'tasks' },
  { to: '/app/insights', label: 'Insights', icon: BarChart3 },
  { to: '/app/resumes', label: 'Resumes', icon: FileText },
]

const nav2 = [
  { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

const titles = {
  '/app': ['Dashboard', 'Overview'],
  '/app/applications': ['Pipeline', 'Applications'],
  '/app/calendar': ['Schedule', 'Calendar'],
  '/app/tasks': ['Checklist', 'Tasks'],
  '/app/insights': ['Analytics', 'Insights'],
  '/app/resumes': ['Documents', 'Resumes'],
  '/app/notifications': ['Inbox', 'Notifications'],
  '/app/profile': ['Account', 'Profile'],
  '/app/settings': ['Preferences', 'Settings'],
}

export default function AppLayout() {
  const { currentUser, dispatch, isAdmin, impersonating, sessionUser } = useStore()
  const apps = useUserApplications()
  const tasks = useUserTasks()
  const notifications = useUserNotifications()
  const [open, setOpen] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const unread = notifications.filter((n) => !n.read).length
  const openTasks = tasks.filter((t) => !t.done).length
  const activeApps = apps.filter((a) => ['applied', 'screening', 'interview'].includes(a.status)).length

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        navigate('/app/applications')
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        setQuickAdd(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const counts = { apps: activeApps, tasks: openTasks, unread }
  const [crumb, title] = titles[location.pathname] || ['Hiretrail', 'Workspace']

  const logout = () => {
    dispatch({ type: 'logout' })
    navigate('/login')
  }

  return (
    <div className="shell">
      {open ? <div className="scrim mobile-only" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/app" className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M5 18c5.5 0 7.5-4 8-8s2-6 6-6" strokeDasharray="1.5 3.5" />
              <circle cx="5" cy="18" r="2.2" fill="#b4552d" stroke="none" />
              <circle cx="19" cy="4" r="2.2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span>
            <span className="brand-name">Hiretrail</span>
            <span className="brand-sub">Job tracker</span>
          </span>
        </Link>

        <Button variant="dark" icon={PlusCircle} className="btn-block" onClick={() => setQuickAdd(true)}>
          New application
        </Button>

        <nav className="nav-group" style={{ marginTop: 18 }}>
          <span className="nav-label">Workspace</span>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <n.icon />
              {n.label}
              {n.badge === 'apps' && activeApps ? <span className="count">{activeApps}</span> : null}
              {n.badge === 'tasks' && openTasks ? <span className="count">{openTasks}</span> : null}
            </NavLink>
          ))}
          <span className="nav-label">Account</span>
          {nav2.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <n.icon />
              {n.label}
              {n.badge === 'unread' && unread ? <span className="count">{unread}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          {isAdmin && (
            <button className="nav-item" style={{ width: '100%', border: 0, background: 'transparent', marginBottom: 8 }} onClick={() => dispatch({ type: 'stopImpersonate' })}>
              <ShieldCheck style={{ color: 'var(--clay)' }} />
              Admin console
              <ArrowLeftRight style={{ marginLeft: 'auto', width: 14 }} />
            </button>
          )}
          <div className="card" style={{ padding: 13, background: 'var(--card)' }}>
            <div className="row-between">
              <span className="eyebrow" style={{ fontSize: 9 }}>Weekly goal</span>
              <span className="tiny tnum strong">{apps.filter((a) => a.status !== 'wishlist').length}/{currentUser?.goal || 5}</span>
            </div>
            <div className="bar" style={{ marginTop: 8 }}>
              <span style={{ width: `${Math.min(100, (apps.filter((a) => a.status !== 'wishlist').length / (currentUser?.goal || 5)) * 100)}%`, background: 'var(--clay)' }} />
            </div>
            <p className="tiny muted" style={{ marginTop: 7, lineHeight: 1.4 }}>
              {Math.max(0, (currentUser?.goal || 5) - apps.filter((a) => a.status !== 'wishlist').length)} more to hit your target.
            </p>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="sidebar-user" onClick={() => setMenu((v) => !v)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setMenu((v) => !v)}>
              <Avatar name={currentUser?.name} size="md" color={currentUser?.avatarColor} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="small strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.name}</div>
                <div className="tiny dim" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.title}</div>
              </div>
            </div>
            {menu ? (
              <div className="card" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, padding: 6, zIndex: 40, boxShadow: 'var(--shadow)' }}>
                <Link to="/app/profile" className="nav-item" style={{ height: 32 }}>
                  <UserRound /> Profile
                </Link>
                <Link to="/app/settings" className="nav-item" style={{ height: 32 }}>
                  <Settings /> Settings
                </Link>
                <button className="nav-item" style={{ height: 32, width: '100%', border: 0, background: 'transparent' }} onClick={logout}>
                  <LogOut /> Sign out
                </button>
              </div>
            ) : null}
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
          <button className="btn btn-sm hide-sm" style={{ color: 'var(--ink-3)', minWidth: 190, justifyContent: 'flex-start' }} onClick={() => navigate('/app/applications')}>
            <Search size={14} /> Search applications <span className="spacer" /> <span className="kbd">N</span>
          </button>
          <Link to="/app/notifications" className="icon-btn" style={{ position: 'relative' }} aria-label="Notifications">
            <Bell />
            {unread ? <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 99, background: 'var(--clay)' }} /> : null}
          </Link>
          <Button variant="dark" size="sm" icon={PlusCircle} onClick={() => setQuickAdd(true)} className="mobile-only">
            Add
          </Button>
        </header>

        {impersonating ? (
          <div className="banner banner-clay" style={{ margin: '14px 26px 0', borderRadius: 12 }}>
            <ShieldCheck />
            <span>
              Viewing as <strong>{currentUser?.name}</strong> — admin preview mode. Your admin session is still active.
            </span>
            <span className="spacer" />
            <Button size="sm" onClick={() => dispatch({ type: 'stopImpersonate' })}>
              Exit preview
            </Button>
          </div>
        ) : null}

        <main className="page">
          <Outlet />
        </main>
      </div>

      <QuickAdd open={quickAdd} onClose={() => setQuickAdd(false)} />
    </div>
  )
}

export function StatusLegend() {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {Object.values(STATUS_MAP).map((s) => (
        <StatusPill key={s.id} status={s.id} />
      ))}
    </div>
  )
}
