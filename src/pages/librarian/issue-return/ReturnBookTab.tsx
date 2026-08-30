import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { findActiveIssueForReturn, returnBook } from '@/services/issues'
import { formatCurrencyINR } from '@/lib/utils'

type LookupResult = Awaited<ReturnType<typeof findActiveIssueForReturn>>

export function ReturnBookTab() {
  const [isbn, setIsbn] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [lookup, setLookup] = useState<LookupResult>(null)
  const [searched, setSearched] = useState(false)
  const [editFine, setEditFine] = useState(false)
  const [adjustedFine, setAdjustedFine] = useState('')
  const [markPaid, setMarkPaid] = useState(true)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!isbn.trim() || !regNumber.trim()) {
      toast.error('Enter both the student registration number and the book ISBN.')
      return
    }
    setSearching(true)
    setSearched(true)
    try {
      const result = await findActiveIssueForReturn(isbn, regNumber)
      setLookup(result)
      setAdjustedFine(result ? String(result.calculatedFine) : '')
      setEditFine(false)
      if (!result) toast.error('No active issue found for this student and book.')
    } finally {
      setSearching(false)
    }
  }

  async function handleReturn() {
    if (!lookup) return
    setLoading(true)
    try {
      await returnBook({
        isbn,
        registrationNumber: regNumber,
        adjustedFine: editFine ? Number(adjustedFine) : null,
        markFinePaid: markPaid,
      })
      toast.success('Book marked as returned.')
      setIsbn('')
      setRegNumber('')
      setLookup(null)
      setSearched(false)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('NO_ACTIVE_ISSUE')) toast.error('No active issue found — it may have already been returned.')
      else toast.error('Could not process the return. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4 p-5">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Student Registration Number</Label>
              <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Book ISBN Number</Label>
              <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            </div>
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={searching}>
            {searching ? 'Searching…' : 'Find Issue'}
          </Button>
        </form>

        {searched && !lookup && !searching && (
          <p className="text-sm text-destructive">No active issue found for this student and book.</p>
        )}

        {lookup && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Student</span>
              <span className="text-right font-medium">{lookup.student.name}</span>
              <span className="text-muted-foreground">Book</span>
              <span className="text-right font-medium">{lookup.book.title}</span>
              <span className="text-muted-foreground">Issue Date</span>
              <span className="text-right">{format(new Date(lookup.issue.issue_date), 'dd MMM yyyy')}</span>
              <span className="text-muted-foreground">Due Date</span>
              <span className="text-right">{format(new Date(lookup.issue.due_date), 'dd MMM yyyy')}</span>
              <span className="text-muted-foreground">Overdue Days</span>
              <span className="text-right">{lookup.overdueDays}</span>
            </div>

            <div className="rounded-md bg-secondary p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Calculated Fine</span>
                <span className="font-display text-lg font-bold">{formatCurrencyINR(Number(adjustedFine) || lookup.calculatedFine)}</span>
              </div>
              {lookup.calculatedFine > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Collect the fine before marking returned.</p>
              )}
              {!editFine ? (
                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setEditFine(true)}>
                  Edit Fine
                </Button>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs">Adjusted Fine (₹)</Label>
                  <Input type="number" min={0} value={adjustedFine} onChange={(e) => setAdjustedFine(e.target.value)} />
                </div>
              )}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
                Mark fine as paid now
              </label>
            </div>

            <Button className="w-full" onClick={handleReturn} disabled={loading}>
              {loading ? 'Processing…' : 'Mark Returned'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
