import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { addDays, format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { fetchBookByIsbn } from '@/services/books'
import { issueBook } from '@/services/issues'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/types/database'

export function IssueBookTab() {
  const [isbn, setIsbn] = useState('')
  const [book, setBook] = useState<Book | null | undefined>(undefined)
  const [regNumber, setRegNumber] = useState('')
  const [studentName, setStudentName] = useState<string | null | undefined>(undefined)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!isbn.trim()) {
        setBook(undefined)
        return
      }
      const found = await fetchBookByIsbn(isbn)
      setBook(found)
    }, 300)
    return () => clearTimeout(t)
  }, [isbn])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!regNumber.trim()) {
        setStudentName(undefined)
        return
      }
      const { data } = await supabase
        .from('students')
        .select('name, account_status')
        .ilike('registration_number', regNumber.trim())
        .maybeSingle()
      setStudentName(data ? (data.account_status === 'ACTIVE' ? data.name : `${data.name} (account not active)`) : null)
    }, 300)
    return () => clearTimeout(t)
  }, [regNumber])

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault()
    if (!book) {
      toast.error('Enter a valid book ISBN.')
      return
    }
    if (book.available_copies <= 0) {
      toast.error('This book is currently out of stock.')
      return
    }
    if (!studentName) {
      toast.error('Enter a valid student registration number.')
      return
    }
    if (dueDate < issueDate) {
      toast.error('Due date cannot be before the issue date.')
      return
    }
    setLoading(true)
    try {
      await issueBook({
        isbn,
        registrationNumber: regNumber,
        issueDate: format(issueDate, 'yyyy-MM-dd'),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
      })
      toast.success('Book issued successfully.')
      setIsbn('')
      setRegNumber('')
      setBook(undefined)
      setStudentName(undefined)
      setIssueDate(new Date())
      setDueDate(addDays(new Date(), 14))
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('OUT_OF_STOCK')) toast.error('This book is currently out of stock.')
      else if (msg.includes('STUDENT_NOT_ACTIVE')) toast.error('This student account is not active.')
      else if (msg.includes('ALREADY_ISSUED_TO_STUDENT')) toast.error('This book is already issued to this student.')
      else if (msg.includes('BOOK_NOT_FOUND')) toast.error('Book not found.')
      else if (msg.includes('STUDENT_NOT_FOUND')) toast.error('Student not found.')
      else toast.error('Could not issue the book. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="p-5">
        <form onSubmit={handleIssue} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Book ISBN Number</Label>
            <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="Enter or scan ISBN" />
            {book === null && <p className="text-sm text-destructive">No book found with this ISBN.</p>}
            {book && (
              <p className="text-sm text-muted-foreground">
                {book.title} — {book.available_copies} / {book.total_copies} available
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Student Registration Number</Label>
            <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            {studentName === null && <p className="text-sm text-destructive">No student found with this registration number.</p>}
            {studentName && <p className="text-sm text-muted-foreground">Student: {studentName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <DatePicker value={issueDate} onChange={(d) => d && setIssueDate(d)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <DatePicker value={dueDate} onChange={(d) => d && setDueDate(d)} disabledBefore={issueDate} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Issuing…' : 'Issue Book'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
