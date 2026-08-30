import { supabase } from '@/lib/supabase'
import type { Student, StudentWithStats } from '@/types/database'

export async function fetchStudents(search = ''): Promise<StudentWithStats[]> {
  let query = supabase.from('students').select('*').order('name', { ascending: true })
  if (search.trim()) {
    const s = search.trim()
    query = query.or(`registration_number.ilike.%${s}%,name.ilike.%${s}%`)
  }
  const { data: students, error } = await query
  if (error) throw error

  const { data: fines } = await supabase.from('v_student_fines').select('*')
  const fineMap = new Map((fines ?? []).map((f: any) => [f.student_id, Number(f.current_fine)]))

  const { data: issues } = await supabase.from('book_issues').select('student_id, status').eq('status', 'ISSUED')
  const issuedCountMap = new Map<string, number>()
  for (const row of issues ?? []) {
    issuedCountMap.set(row.student_id, (issuedCountMap.get(row.student_id) ?? 0) + 1)
  }

  return (students ?? []).map((s) => ({
    ...(s as Student),
    current_fine: fineMap.get(s.id) ?? 0,
    issued_books_count: issuedCountMap.get(s.id) ?? 0,
  }))
}

export async function createStudent(student: Partial<Student>) {
  const { data, error } = await supabase.from('students').insert(student).select().single()
  if (error) throw error
  return data as Student
}

export async function checkDuplicateRegistrationNumber(regNumber: string) {
  const { data } = await supabase
    .from('students')
    .select('id')
    .ilike('registration_number', regNumber.trim())
    .maybeSingle()
  return !!data
}

export async function bulkImportStudents(
  rows: Array<{
    registration_number: string
    name: string
    course: string
    regulation: string
    year: string
    semester: string
    branch: string
    section?: string
  }>,
) {
  const { data, error } = await supabase.rpc('rpc_bulk_import_students', { p_rows: rows })
  if (error) throw error
  return data?.[0] as { inserted_count: number; skipped_duplicates: number } | undefined
}

export async function deleteStudent(studentId: string) {
  const { error } = await supabase.rpc('rpc_delete_student', { p_student_id: studentId })
  if (error) throw error
}
