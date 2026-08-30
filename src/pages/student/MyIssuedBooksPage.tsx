import { useEffect, useState } from 'react'
import { BookMarked } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchMyIssuedBooks } from '@/services/issues'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { formatCurrencyINR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { IssuedBookView } from '@/types/database'

function statusFor(dueDate: string): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  const days = Math.round((new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (days < 0) return { label: 'OVERDUE', variant: 'destructive' }
  if (days <= 2) return { label: 'DUE_SOON', variant: 'warning' }
  return { label: 'ON_TIME', variant: 'success' }
}

function liveFine(dueDate: string) {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(dueDate).setHours(0, 0, 0, 0)) / 86400000)
  return Math.max(0, days) * 2
}

export default function MyIssuedBooksPage() {
  const { student } = useAuth()
  const [issues, setIssues] = useState<IssuedBookView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    let mounted = true
    const load = () => fetchMyIssuedBooks(student.id).then((data) => mounted && setIssues(data))
    load().finally(() => mounted && setLoading(false))

    const channel = supabase
      .channel(`my-issues-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues', filter: `student_id=eq.${student.id}` }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [student])

  if (loading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Issued Books</h1>
        <p className="text-sm text-muted-foreground">Books currently checked out to you.</p>
      </div>

      {issues.length === 0 ? (
        <EmptyState icon={BookMarked} title="No books currently issued" description="Visit the librarian desk to check out a book." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => {
            const status = statusFor(issue.due_date)
            const fine = liveFine(issue.due_date)
            return (
              <Card key={issue.id}>
                <CardContent className="space-y-2 p-5">
                  <p className="font-display font-semibold leading-snug">{issue.book.title}</p>
                  <p className="text-xs text-muted-foreground">ISBN: {issue.book.isbn}</p>
                  <div className="grid grid-cols-2 gap-1 pt-1 text-sm">
                    <span className="text-muted-foreground">Issued</span>
                    <span className="text-right">{format(new Date(issue.issue_date), 'dd MMM yyyy')}</span>
                    <span className="text-muted-foreground">Due</span>
                    <span className="text-right">{format(new Date(issue.due_date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-sm font-medium">{fine > 0 ? formatCurrencyINR(fine) : '—'}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
