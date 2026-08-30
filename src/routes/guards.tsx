import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { PageLoading } from '@/components/ui/feedback'

export function RequireRole({ role, children }: { role: 'student' | 'librarian'; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <PageLoading />
  if (!session) return <Navigate to={role === 'student' ? '/student/login' : '/librarian/login'} replace />
  if (!profile) return <PageLoading label="Setting up your account…" />
  if (profile.role !== role) {
    return <Navigate to={profile.role === 'student' ? '/student/dashboard' : '/librarian/dashboard'} replace />
  }
  return <>{children}</>
}

export function RedirectIfAuthed({ role, children }: { role: 'student' | 'librarian'; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <PageLoading />
  if (session && profile?.role === role) {
    return <Navigate to={`/${role}/dashboard`} replace />
  }
  return <>{children}</>
}
