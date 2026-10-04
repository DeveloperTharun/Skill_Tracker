import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../context/AuthContext'
import { Logo } from './AuthLayout'

const NAV: Record<Role, { to: string; label: string }[]> = {
  student: [
    { to: '/student', label: 'Dashboard' },
    { to: '/exam', label: 'Take Exam' },
  ],
  owner: [{ to: '/owner', label: 'Track Overview' }],
  admin: [
    { to: '/admin', label: 'Analytics' },
    { to: '/invigilator', label: 'Exam Keys' },
  ],
  invigilator: [{ to: '/invigilator', label: 'Exam Keys' }],
}

const ROLE_LABEL: Record<Role, string> = {
  student: 'Student', owner: 'Track Owner', admin: 'Admin', invigilator: 'Invigilator',
}

export default function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  if (loading) return <div className="p-6 text-sm text-slate-500">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  const initial = user.name.trim().charAt(0).toUpperCase()

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="w-60 shrink-0 bg-linear-to-b from-blue-600 via-violet-600 to-fuchsia-500 p-5 text-white">
        <div className="mb-8"><Logo /></div>
        <nav className="space-y-1.5">
          {NAV[user.role].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `block rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-indigo-700 shadow-lg' : 'text-white/85 hover:bg-white/15'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">{ROLE_LABEL[user.role]}</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">{initial}</span>
            <span className="font-medium">{user.name}</span>
            <button onClick={signOut} className="rounded-lg border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600">Sign out</button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
