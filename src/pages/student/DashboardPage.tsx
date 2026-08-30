import { useEffect, useState } from 'react'
import { BookMarked, Library, AlarmClock, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { StatCard, PageLoading } from '@/components/ui/feedback'
import { formatCurrencyINR } from '@/lib/utils'

export default function StudentDashboardPage() {
  const { student } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ availableBooks: 0, myIssued: 0, dueSoon: 0, fine: 0 })

  useEffect(() => {
    if (!student) return
    let mounted = true

    async function load() {
      const [{ data: books }, { data: myIssues }, { data: fines }] = await Promise.all([
        supabase.from('books').select('available_copies'),
        supabase.from('v_active_issues').select('live_status').eq('student_id', student!.id),
        supabase.from('v_student_fines').select('current_fine').eq('student_id', student!.id).maybeSingle(),
      ])

      if (!mounted) return
      const availableBooks = (books ?? []).reduce((a, b) => a + (b.available_copies ?? 0), 0)
      const myIssued = myIssues?.length ?? 0
      const dueSoon = (myIssues ?? []).filter((i: any) => i.live_status === 'DUE_SOON' || i.live_status === 'OVERDUE').length
      setStats({ availableBooks, myIssued, dueSoon, fine: Number(fines?.current_fine ?? 0) })
      setLoading(false)
    }
    load()

    // Realtime: refresh dashboard whenever this student's issues/notifications change
    const channel = supabase
      .channel(`student-dashboard-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues', filter: `student_id=eq.${student.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [student])

  if (loading) return <PageLoading />

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Hi, {student?.name}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Books" value={stats.availableBooks} icon={Library} />
        <StatCard label="My Issued" value={stats.myIssued} icon={BookMarked} tone="accent" />
        <StatCard label="Due Soon" value={stats.dueSoon} icon={AlarmClock} tone="warning" />
        <StatCard label="Fine" value={formatCurrencyINR(stats.fine)} icon={Wallet} tone="destructive" />
      </div>
    </div>
  )
}
