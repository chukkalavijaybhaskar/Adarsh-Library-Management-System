import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Student } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  student: Student | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfileAndStudent = useCallback(async (userId: string) => {
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(profileRow as Profile | null)

    if (profileRow?.role === 'student') {
      const { data: studentRow } = await supabase.from('students').select('*').eq('profile_id', userId).maybeSingle()
      setStudent(studentRow as Student | null)
    } else {
      setStudent(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session?.user.id) {
      await loadProfileAndStudent(data.session.user.id)
    } else {
      setProfile(null)
      setStudent(null)
    }
  }, [loadProfileAndStudent])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await refresh()
      if (mounted) setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user.id) {
        await loadProfileAndStudent(newSession.user.id)
      } else {
        setProfile(null)
        setStudent(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setStudent(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, student, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
