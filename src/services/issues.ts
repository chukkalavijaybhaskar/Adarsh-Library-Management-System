import { supabase } from '@/lib/supabase'
import type { BookIssue, IssuedBookView } from '@/types/database'

export async function fetchMyIssuedBooks(studentId: string): Promise<IssuedBookView[]> {
  const { data, error } = await supabase
    .from('book_issues')
    .select('*, book:books(id, title, isbn, author)')
    .eq('student_id', studentId)
    .eq('status', 'ISSUED')
    .order('due_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as IssuedBookView[]
}

export async function fetchOverdueIssues(search = '') {
  let query = supabase
    .from('book_issues')
    .select('*, book:books(title, isbn), student:students(name, registration_number)')
    .eq('status', 'ISSUED')
    .lt('due_date', new Date().toISOString().slice(0, 10))
    .order('due_date', { ascending: true })
  const { data, error } = await query
  if (error) throw error
  let rows = data ?? []
  if (search.trim()) {
    const s = search.trim().toLowerCase()
    rows = rows.filter(
      (r: any) =>
        r.student?.name?.toLowerCase().includes(s) ||
        r.student?.registration_number?.toLowerCase().includes(s) ||
        r.book?.isbn?.toLowerCase().includes(s),
    )
  }
  return rows
}

export async function issueBook(params: { isbn: string; registrationNumber: string; issueDate: string; dueDate: string }) {
  const { data, error } = await supabase.rpc('rpc_issue_book', {
    p_isbn: params.isbn.trim(),
    p_registration_number: params.registrationNumber.trim(),
    p_issue_date: params.issueDate,
    p_due_date: params.dueDate,
  })
  if (error) throw error
  return data as BookIssue
}

export async function findActiveIssueForReturn(isbn: string, registrationNumber: string) {
  const { data: book } = await supabase.from('books').select('id, title, isbn').eq('isbn', isbn.trim()).maybeSingle()
  if (!book) return null
  const { data: student } = await supabase
    .from('students')
    .select('id, name, registration_number')
    .ilike('registration_number', registrationNumber.trim())
    .maybeSingle()
  if (!student) return null

  const { data: issue } = await supabase
    .from('book_issues')
    .select('*')
    .eq('book_id', book.id)
    .eq('student_id', student.id)
    .eq('status', 'ISSUED')
    .maybeSingle()
  if (!issue) return null

  const dueDate = new Date(issue.due_date)
  const today = new Date()
  const overdueDays = Math.max(0, Math.floor((today.setHours(0, 0, 0, 0) - dueDate.setHours(0, 0, 0, 0)) / 86400000))
  const calculatedFine = overdueDays * 2

  return { issue, book, student, overdueDays, calculatedFine }
}

export async function returnBook(params: {
  isbn: string
  registrationNumber: string
  adjustedFine?: number | null
  markFinePaid: boolean
}) {
  const { data, error } = await supabase.rpc('rpc_return_book', {
    p_isbn: params.isbn.trim(),
    p_registration_number: params.registrationNumber.trim(),
    p_adjusted_fine: params.adjustedFine ?? null,
    p_mark_fine_paid: params.markFinePaid,
  })
  if (error) throw error
  return data as BookIssue
}

export async function settleFine(issueId: string, paid: boolean) {
  const { error } = await supabase.rpc('rpc_settle_fine', { p_issue_id: issueId, p_paid: paid })
  if (error) throw error
}
