import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store.jsx'
import { Toasts } from './components/ui.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'

import Dashboard from './pages/app/Dashboard.jsx'
import Applications from './pages/app/Applications.jsx'
import Calendar from './pages/app/Calendar.jsx'
import Tasks from './pages/app/Tasks.jsx'
import Insights from './pages/app/Insights.jsx'
import Resumes from './pages/app/Resumes.jsx'
import Profile from './pages/app/Profile.jsx'
import Notifications from './pages/app/Notifications.jsx'
import Settings from './pages/app/Settings.jsx'

import AdminOverview from './pages/admin/Overview.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminApplications from './pages/admin/Applications.jsx'
import AdminActivity from './pages/admin/Activity.jsx'
import AdminBroadcast from './pages/admin/Broadcast.jsx'
import AdminSettings from './pages/admin/Settings.jsx'

function RequireUser({ children }) {
  const { sessionUser, isAdmin, impersonating } = useStore()
  if (!sessionUser) return <Navigate to="/login" replace />
  if (isAdmin && !impersonating) return <Navigate to="/admin" replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin } = useStore()
  if (!isAdmin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { toasts, dismissToast } = useStore()

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/app"
          element={
            <RequireUser>
              <AppLayout />
            </RequireUser>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="insights" element={<Insights />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="broadcast" element={<AdminBroadcast />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
