import { useState } from 'react'
import { toast } from 'sonner'
import { FileBarChart, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import { supabase } from '@/lib/supabase'
import { formatCurrencyINR } from '@/lib/utils'

const OVERDUE_THRESHOLD_DAYS = 10

interface ReportRow {
  studentName: string
  registrationNumber: string
  isbn: string
  bookTitle: string
  fine: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [lastRows, setLastRows] = useState<ReportRow[] | null>(null)

  async function handleGenerate() {
    setLoading(true)
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - OVERDUE_THRESHOLD_DAYS)
      const cutoffStr = cutoff.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('book_issues')
        .select('due_date, book:books(title, isbn), student:students(name, registration_number)')
        .eq('status', 'ISSUED')
        .lt('due_date', cutoffStr)

      if (error) throw error

      const rows: ReportRow[] = (data ?? []).map((r: any) => {
        const days = Math.max(0, Math.round((new Date().setHours(0, 0, 0, 0) - new Date(r.due_date).setHours(0, 0, 0, 0)) / 86400000))
        return {
          studentName: r.student?.name ?? '—',
          registrationNumber: r.student?.registration_number ?? '—',
          isbn: r.book?.isbn ?? '—',
          bookTitle: r.book?.title ?? '—',
          fine: days * 2,
        }
      })
      setLastRows(rows)

      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('Adarsh Library — Overdue Report', 14, 18)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Books overdue by more than ${OVERDUE_THRESHOLD_DAYS} days`, 14, 25)
      doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 30)

      if (rows.length === 0) {
        doc.setTextColor(0)
        doc.text('No students currently have books overdue by more than 10 days.', 14, 45)
      } else {
        autoTable(doc, {
          startY: 38,
          head: [['Student Name', 'Registration No.', 'Book ISBN', 'Book Title', 'Fine']],
          body: rows.map((r) => [r.studentName, r.registrationNumber, r.isbn, r.bookTitle, formatCurrencyINR(r.fine)]),
          headStyles: { fillColor: [42, 59, 143] },
          styles: { fontSize: 9 },
        })
      }

      doc.save(`overdue-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
      toast.success('Report generated and downloaded.')
    } catch {
      toast.error('Could not generate the report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate a PDF of students overdue by more than {OVERDUE_THRESHOLD_DAYS} days.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Overdue Report</CardTitle>
          <CardDescription>Includes student name, registration number, book ISBN, title, and current fine.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={loading}>
            <Download className="h-4 w-4" /> {loading ? 'Generating…' : 'Generate Report'}
          </Button>

          {lastRows && lastRows.length === 0 && (
            <div className="mt-4">
              <EmptyState icon={FileBarChart} title="No overdue students" description={`No one currently has a book overdue by more than ${OVERDUE_THRESHOLD_DAYS} days.`} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
