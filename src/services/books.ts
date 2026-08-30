import { supabase } from '@/lib/supabase'
import type { Book } from '@/types/database'

export interface BookFilters {
  search?: string
  course?: string
  regulation?: string
  year?: string
  branch?: string
}

export async function fetchBooks(filters: BookFilters = {}) {
  let query = supabase.from('books').select('*').order('title', { ascending: true })

  if (filters.search) {
    const s = filters.search.trim()
    query = query.or(`title.ilike.%${s}%,isbn.ilike.%${s}%,author.ilike.%${s}%`)
  }
  if (filters.course) query = query.eq('course', filters.course)
  if (filters.regulation) query = query.eq('regulation', filters.regulation)
  if (filters.year) query = query.eq('year', filters.year)
  if (filters.branch) query = query.eq('branch', filters.branch)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Book[]
}

export async function fetchBookByIsbn(isbn: string) {
  const { data, error } = await supabase.from('books').select('*').eq('isbn', isbn.trim()).maybeSingle()
  if (error) throw error
  return data as Book | null
}

export async function createBook(book: Partial<Book>) {
  const payload = { ...book, available_copies: book.total_copies }
  const { data, error } = await supabase.from('books').insert(payload).select().single()
  if (error) throw error
  return data as Book
}

export async function updateBook(id: string, book: Partial<Book>) {
  const { data, error } = await supabase.from('books').update(book).eq('id', id).select().single()
  if (error) throw error
  return data as Book
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
}

export async function fetchLibraryStats() {
  const { count: totalBooks } = await supabase.from('books').select('*', { count: 'exact', head: true })
  const { data: copies } = await supabase.from('books').select('total_copies, available_copies')
  const totalCopies = (copies ?? []).reduce((a, b) => a + (b.total_copies ?? 0), 0)
  const availableCopies = (copies ?? []).reduce((a, b) => a + (b.available_copies ?? 0), 0)
  const issuedCopies = totalCopies - availableCopies
  return { totalBooks: totalBooks ?? 0, totalCopies, availableCopies, issuedCopies }
}
