import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Upload, Trash2, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { formatCurrencyINR } from '@/lib/utils'
import { fetchStudents, deleteStudent } from '@/services/students'
import { supabase } from '@/lib/supabase'
import type { StudentWithStats, AccountStatus } from '@/types/database'
import { AddStudentDialog } from './students/AddStudentDialog'
import { BulkImportDialog } from './students/BulkImportDialog'

const STATUS_VARIANT: Record<AccountStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  NOT_ACTIVE: 'secondary',
  REJECTED: 'destructive',
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StudentWithStats | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetchStudents(search).then(setStudents)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true)
      load().finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    const channel = supabase
      .channel('librarian-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteStudent(deleteTarget.id)
      toast.success('Student deleted.')
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id))
    } catch (err: any) {
      if (err?.message?.includes('HAS_ACTIVE_ISSUES')) {
        toast.error('This student has books currently issued and cannot be deleted.')
      } else {
        toast.error('Could not delete student. Please try again.')
      }
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">Manage the college student records and library accounts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Bulk Upload
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add New Student
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by registration number or name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <PageLoading />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description="Add a student or adjust your search." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Reg. No.</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Year</th>
                  <th className="p-3">Regulation</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Issued</th>
                  <th className="p-3">Fine</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 font-medium">{s.registration_number}</td>
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.course}</td>
                    <td className="p-3">{s.year}</td>
                    <td className="p-3">{s.regulation}</td>
                    <td className="p-3">{s.semester}</td>
                    <td className="p-3">{s.branch}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANT[s.account_status]}>{s.account_status}</Badge>
                    </td>
                    <td className="p-3">{s.issued_books_count}</td>
                    <td className="p-3">{s.current_fine > 0 ? formatCurrencyINR(s.current_fine) : '—'}</td>
                    <td className="p-3">
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this student?"
        description={`This will permanently remove ${deleteTarget?.name ?? 'this student'} and their records. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
