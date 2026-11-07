import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { buildSeed, DEMO_PASSWORD, DEMO_ADMIN_PASSWORD } from './seed.js'
import { uid } from './format.js'

const STORAGE_KEY = 'hiretrail.state.v1'

const seed = buildSeed()

const initialState = {
  ...seed,
  session: null,
  impersonate: null,
}

const passwordFor = (state, email) => {
  const admin = state.admins.find((a) => a.email.toLowerCase() === email.toLowerCase())
  if (admin) return DEMO_ADMIN_PASSWORD
  const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (user) return user.password || DEMO_PASSWORD
  return null
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw)
    if (!parsed?.users || !parsed?.applications) return initialState
    return { ...initialState, ...parsed, settings: { ...initialState.settings, ...parsed.settings } }
  } catch {
    return initialState
  }
}

function reducer(state, action) {
  switch (action.type) {
    /* ------------------------------------------------------------- auth */
    case 'login': {
      const { email, password } = action
      const admin = state.admins.find((a) => a.email.toLowerCase() === email.toLowerCase())
      if (admin) {
        if (password !== DEMO_ADMIN_PASSWORD) return { ...state, authError: 'That admin password is incorrect.' }
        return { ...state, session: { userId: admin.id, role: 'admin' }, impersonate: null, authError: null, lastLogin: new Date().toISOString() }
      }
      const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      if (!user) return { ...state, authError: 'No account with that email in this demo.' }
      if (user.status === 'suspended') return { ...state, authError: 'This account is suspended. Contact support.' }
      const expected = passwordFor(state, email)
      if (password !== expected) return { ...state, authError: 'Incorrect password. Try the demo password.' }
      return {
        ...state,
        session: { userId: user.id, role: 'user' },
        impersonate: null,
        authError: null,
        lastLogin: new Date().toISOString(),
        users: state.users.map((u) => (u.id === user.id ? { ...u, lastActive: new Date().toISOString() } : u)),
        activity: [{ id: uid('act'), at: new Date().toISOString(), userId: user.id, type: 'login', text: `${user.name} signed in` }, ...state.activity].slice(0, 80),
      }
    }
    case 'register': {
      const { name, email, password, title, location, goal } = action
      if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return { ...state, authError: 'An account with that email already exists.' }
      }
      if (!state.settings.allowSignups) return { ...state, authError: 'Signups are disabled by the admin right now.' }
      const user = {
        id: uid('usr'),
        name,
        email: email.trim(),
        password,
        role: 'user',
        title: title || 'Job seeker',
        location: location || 'India',
        phone: '',
        goal: Number(goal) || state.settings.defaultGoal || 5,
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        plan: 'Free',
        avatarColor: '#191714',
        bio: '',
        resumes: [],
      }
      return {
        ...state,
        users: [...state.users, user],
        session: { userId: user.id, role: 'user' },
        authError: null,
        activity: [{ id: uid('act'), at: new Date().toISOString(), userId: user.id, type: 'system', text: `${name} created an account` }, ...state.activity].slice(0, 80),
      }
    }
    case 'logout':
      return { ...state, session: null, impersonate: null, authError: null }
    case 'clearAuthError':
      return { ...state, authError: null }
    case 'impersonate':
      return { ...state, impersonate: action.userId }
    case 'stopImpersonate':
      return { ...state, impersonate: null }

    /* ------------------------------------------------------ applications */
    case 'addApp': {
      const { app } = action
      return {
        ...state,
        applications: [app, ...state.applications],
        activity: [{ id: uid('act'), at: new Date().toISOString(), userId: app.userId, type: 'app', text: `${action.actorName || 'Someone'} added ${app.company} — ${app.role}` }, ...state.activity].slice(0, 80),
      }
    }
    case 'updateApp':
      return { ...state, applications: state.applications.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)) }
    case 'deleteApp':
      return { ...state, applications: state.applications.filter((a) => a.id !== action.id), tasks: state.tasks.map((t) => (t.appId === action.id ? { ...t, appId: null } : t)) }
    case 'addTimeline': {
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.appId ? { ...a, timeline: [...a.timeline, action.entry], updatedAt: new Date().toISOString() } : a,
        ),
      }
    }

    /* ------------------------------------------------------------- tasks */
    case 'addTask':
      return { ...state, tasks: [action.task, ...state.tasks] }
    case 'updateTask':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }

    /* ----------------------------------------------------- notifications */
    case 'addNotification':
      return { ...state, notifications: [action.notification, ...state.notifications] }
    case 'readNotification':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) }
    case 'readAllNotifications':
      return { ...state, notifications: state.notifications.map((n) => (n.userId === action.userId ? { ...n, read: true } : n)) }
    case 'deleteNotification':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) }

    /* --------------------------------------------------------- profile */
    case 'updateUser':
      return { ...state, users: state.users.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)) }
    case 'addResume': {
      const user = state.users.find((u) => u.id === action.userId)
      if (!user) return state
      return { ...state, users: state.users.map((u) => (u.id === action.userId ? { ...u, resumes: [action.resume, ...(u.resumes || [])] } : u)) }
    }
    case 'deleteResume':
      return { ...state, users: state.users.map((u) => (u.id === action.userId ? { ...u, resumes: (u.resumes || []).filter((r) => r.id !== action.resumeId) } : u)) }

    /* ------------------------------------------------------------ admin */
    case 'adminAddUser': {
      const user = action.user
      if (state.users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) return state
      return {
        ...state,
        users: [{ ...user, password: user.password || DEMO_PASSWORD }, ...state.users],
        activity: [{ id: uid('act'), at: new Date().toISOString(), userId: 'adm_1', type: 'system', text: `Admin created account for ${user.name}` }, ...state.activity].slice(0, 80),
      }
    }
    case 'adminSetStatus':
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.id ? { ...u, status: action.status } : u)),
        activity: [{ id: uid('act'), at: new Date().toISOString(), userId: 'adm_1', type: 'system', text: `Admin set ${action.name} to ${action.status}` }, ...state.activity].slice(0, 80),
      }
    case 'adminDeleteUser':
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.id),
        applications: state.applications.filter((a) => a.userId !== action.id),
        tasks: state.tasks.filter((t) => t.userId !== action.id),
        notifications: state.notifications.filter((n) => n.userId !== action.id),
      }
    case 'addBroadcast': {
      const bc = action.broadcast
      const targets = state.users.filter((u) => (bc.audience === 'all' ? true : bc.audience === 'pro' ? u.plan === 'Pro' : u.status === 'active'))
      const notes = targets.map((u) => ({
        id: uid('ntf'),
        userId: u.id,
        kind: 'system',
        title: bc.title,
        body: bc.body,
        at: new Date().toISOString(),
        read: false,
        link: '/app/notifications',
      }))
      return {
        ...state,
        broadcasts: [{ ...bc, recipients: targets.length }, ...state.broadcasts],
        notifications: [...notes, ...state.notifications],
        activity: [{ id: uid('act'), at: new Date().toISOString(), userId: 'adm_1', type: 'system', text: `Admin broadcast “${bc.title}” to ${targets.length} users` }, ...state.activity].slice(0, 80),
      }
    }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'resetDemo':
      return { ...initialState, session: state.session, impersonate: null }

    default:
      return state
  }
}

/* ------------------------------------------------------------- provider */
const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota / private mode — demo still works in memory */
    }
  }, [state])

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const toast = useCallback((message, tone = 'ok') => {
    const id = uid('toast')
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }])
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
      timers.current.delete(id)
    }, 3400)
    timers.current.set(id, t)
  }, [])

  const dismissToast = useCallback((id) => setToasts((prev) => prev.filter((x) => x.id !== id)), [])

  const value = useMemo(() => {
    const sessionUser = state.session
      ? state.session.role === 'admin'
        ? state.admins.find((a) => a.id === state.session.userId)
        : state.users.find((u) => u.id === state.session.userId)
      : null
    const impersonated = state.impersonate ? state.users.find((u) => u.id === state.impersonate) : null
    const currentUser = impersonated || sessionUser
    const isAdmin = state.session?.role === 'admin'

    return {
      ...state,
      currentUser,
      sessionUser,
      isAdmin,
      impersonating: Boolean(impersonated),
      dispatch,
      toast,
      toasts,
      dismissToast,
    }
  }, [state, toast, toasts, dismissToast])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/* -------------------------------------------------------- selectors */
export function useUserApplications() {
  const { applications, currentUser } = useStore()
  return useMemo(
    () => applications.filter((a) => a.userId === currentUser?.id && !a.archived),
    [applications, currentUser],
  )
}

export function useUserTasks() {
  const { tasks, currentUser } = useStore()
  return useMemo(() => tasks.filter((t) => t.userId === currentUser?.id), [tasks, currentUser])
}

export function useUserNotifications() {
  const { notifications, currentUser } = useStore()
  return useMemo(
    () => notifications.filter((n) => n.userId === currentUser?.id).sort((a, b) => new Date(b.at) - new Date(a.at)),
    [notifications, currentUser],
  )
}
