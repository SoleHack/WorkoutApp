import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { SettingsProvider } from './hooks/useSettings.jsx'
import { ActiveProgramProvider } from './hooks/useActiveProgram.jsx'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workout from './pages/Workout'
import Settings from './pages/Settings'
import Programs from './pages/Programs'

// Lazy-load heavy pages — they import Recharts and large chart deps
const Progress    = lazy(() => import('./pages/Progress'))
const Calculator  = lazy(() => import('./pages/Calculator'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--muted)',
      fontFamily: 'DM Mono, monospace', fontSize: 12, letterSpacing: '0.1em',
    }}>
      LOADING...
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--muted)', letterSpacing: '0.1em'
    }}>
      LOADING...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/workout/:dayKey" element={<ProtectedRoute><Workout /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Progress /></Suspense></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/calculator" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Calculator /></Suspense></ProtectedRoute>} />
        <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Leaderboard /></Suspense></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ActiveProgramProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ActiveProgramProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
