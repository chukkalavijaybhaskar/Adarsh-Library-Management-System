import { useEffect, useState } from 'react'
import { Library, BookOpenCheck, BookMarked, ClipboardList } from 'lucide-react'
import { fetchLibraryStats } from '@/services/books'
import { fetchPendingApprovalsCount } from '@/services/misc'
import { StatCard, PageLoading } from '@/components/ui/feedback'
import { supabase } from '@/lib/supabase'

export default function LibrarianDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalBooks: 0, availableCopies: 0, issuedCopies: 0, pendingApprovals: 0 })

  useEffect(() => {
    let mounted = true
    async function load() {
      const [libStats, pending] = await Promise.all([fetchLibraryStats(), fetchPendingApprovalsCount()])
      if (!mounted) return
      setStats({
        totalBooks: libStats.totalBooks,
        availableCopies: libStats.availableCopies,
        issuedCopies: libStats.issuedCopies,
        pendingApprovals: pending,
      })
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('librarian-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_requests' }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <PageLoading />

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Hi Librarian</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Books" value={stats.totalBooks} icon={Library} />
        <StatCard label="Available Books" value={stats.availableCopies} icon={BookOpenCheck} tone="accent" />
        <StatCard label="Issued Books" value={stats.issuedCopies} icon={BookMarked} />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon={ClipboardList} tone="warning" />
      </div>
    </div>
  )
}
