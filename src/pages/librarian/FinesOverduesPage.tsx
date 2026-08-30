import { useEffect, useState } from 'react'
import { Search, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { fetchOverdueIssues } from '@/services/issues'
import { formatCurrencyINR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type OverdueRow = {
  id: string
  due_date: string
  issue_date: string
  book: { title: string; isbn: string } | null
  student: { name: string; registration_number: string } | null
}

function overdueDays(dueDate: string) {
  return Math.max(0, Math.round((new Date().setHours(0, 0, 0, 0) - new Date(dueDate).setHours(0, 0, 0, 0)) / 86400000))
}

export default function FinesOverduesPage() {
  const [rows, setRows] = useState<OverdueRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => fetchOverdueIssues(search).then((data) => setRows(data as OverdueRow[]))

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      load().finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    const channel = supabase
      .channel('fines-overdues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Fines &amp; Overdues</h1>
        <p className="text-sm text-muted-foreground">Students with books currently overdue.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by student name, reg. no., or ISBN…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No overdue books" description="Everything is currently on time." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Reg. No.</th>
                  <th className="p-3">Book</th>
                  <th className="p-3">ISBN</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Days Overdue</th>
                  <th className="p-3">Fine</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const days = overdueDays(r.due_date)
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3 font-medium">{r.student?.name}</td>
                      <td className="p-3">{r.student?.registration_number}</td>
                      <td className="p-3">{r.book?.title}</td>
                      <td className="p-3">{r.book?.isbn}</td>
                      <td className="p-3">{format(new Date(r.issue_date), 'dd MMM yyyy')}</td>
                      <td className="p-3">{format(new Date(r.due_date), 'dd MMM yyyy')}</td>
                      <td className="p-3">{days}</td>
                      <td className="p-3 font-medium">{formatCurrencyINR(days * 2)}</td>
                      <td className="p-3">
                        <Badge variant="destructive">OVERDUE</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
