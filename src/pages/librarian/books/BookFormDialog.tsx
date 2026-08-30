import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createBook, updateBook } from '@/services/books'
import type { Book } from '@/types/database'

const empty = {
  title: '',
  isbn: '',
  author: '',
  total_copies: '1',
  course: '',
  regulation: '',
  year: '',
  branch: '',
  category: '',
  publisher: '',
  publication_year: '',
  book_id: '',
}

export function BookFormDialog({
  open,
  onOpenChange,
  book,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  book: Book | null
  onSaved: () => void
}) {
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title,
        isbn: book.isbn,
        author: book.author,
        total_copies: String(book.total_copies),
        course: book.course ?? '',
        regulation: book.regulation ?? '',
        year: book.year ?? '',
        branch: book.branch ?? '',
        category: book.category ?? '',
        publisher: book.publisher ?? '',
        publication_year: book.publication_year ? String(book.publication_year) : '',
        book_id: book.book_id ?? '',
      })
    } else {
      setForm(empty)
    }
  }, [book, open])

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.isbn || !form.author || !form.total_copies) {
      toast.error('Title, ISBN, Author, and Total Copies are required.')
      return
    }
    const totalCopies = parseInt(form.total_copies, 10)
    if (Number.isNaN(totalCopies) || totalCopies < 0) {
      toast.error('Total copies must be a valid non-negative number.')
      return
    }

    setLoading(true)
    try {
      if (book) {
        const availableDelta = totalCopies - book.total_copies
        const newAvailable = Math.max(0, Math.min(totalCopies, book.available_copies + availableDelta))
        await updateBook(book.id, {
          title: form.title,
          isbn: form.isbn,
          author: form.author,
          total_copies: totalCopies,
          available_copies: newAvailable,
          course: form.course || null,
          regulation: form.regulation || null,
          year: form.year || null,
          branch: form.branch || null,
          category: form.category || null,
          publisher: form.publisher || null,
          publication_year: form.publication_year ? parseInt(form.publication_year, 10) : null,
          book_id: form.book_id || null,
        } as any)
        toast.success('Book updated.')
      } else {
        await createBook({
          title: form.title,
          isbn: form.isbn,
          author: form.author,
          total_copies: totalCopies,
          course: form.course || null,
          regulation: form.regulation || null,
          year: form.year || null,
          branch: form.branch || null,
          category: form.category || null,
          publisher: form.publisher || null,
          publication_year: form.publication_year ? parseInt(form.publication_year, 10) : null,
          book_id: form.book_id || null,
        } as any)
        toast.success('Book added.')
      }
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.code === '23505') {
        toast.error('A book with this ISBN already exists.')
      } else {
        toast.error('Could not save the book. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{book ? 'Edit Book' : 'Add New Book'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
          <F label="Title" value={form.title} onChange={(v) => set('title', v)} full />
          <F label="ISBN" value={form.isbn} onChange={(v) => set('isbn', v)} />
          <F label="Author" value={form.author} onChange={(v) => set('author', v)} />
          <F label="Total Copies" value={form.total_copies} onChange={(v) => set('total_copies', v)} type="number" />
          <F label="Book ID (optional)" value={form.book_id} onChange={(v) => set('book_id', v)} />
          <F label="Course" value={form.course} onChange={(v) => set('course', v)} />
          <F label="Regulation" value={form.regulation} onChange={(v) => set('regulation', v)} />
          <F label="Year" value={form.year} onChange={(v) => set('year', v)} />
          <F label="Branch" value={form.branch} onChange={(v) => set('branch', v)} />
          <F label="Category" value={form.category} onChange={(v) => set('category', v)} />
          <F label="Publisher" value={form.publisher} onChange={(v) => set('publisher', v)} />
          <F label="Publication Year" value={form.publication_year} onChange={(v) => set('publication_year', v)} type="number" />
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : book ? 'Save Changes' : 'Add Book'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function F({
  label,
  value,
  onChange,
  full,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  full?: boolean
  type?: string
}) {
  return (
    <div className={`space-y-1.5 ${full ? 'col-span-2' : ''}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
