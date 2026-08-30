import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, Library } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { fetchBooks, deleteBook } from '@/services/books'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/types/database'
import { BookFormDialog } from './books/BookFormDialog'

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => fetchBooks({ search }).then(setBooks)

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
      .channel('librarian-books')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openAdd() {
    setEditingBook(null)
    setFormOpen(true)
  }
  function openEdit(book: Book) {
    setEditingBook(book)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteBook(deleteTarget.id)
      toast.success('Book deleted.')
      setBooks((prev) => prev.filter((b) => b.id !== deleteTarget.id))
    } catch {
      toast.error('Could not delete this book — it may have issue history linked to it.')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Books</h1>
          <p className="text-sm text-muted-foreground">Manage the library catalog and inventory.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add New Book
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by title, ISBN, or author…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <PageLoading />
      ) : books.length === 0 ? (
        <EmptyState icon={Library} title="No books found" description="Add a book to get started." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">ISBN</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Copies</th>
                  <th className="p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-3 font-medium">{b.title}</td>
                    <td className="p-3">{b.isbn}</td>
                    <td className="p-3">{b.author}</td>
                    <td className="p-3">
                      {b.available_copies} / {b.total_copies}
                    </td>
                    <td className="p-3">
                      <Badge variant={b.available_copies > 0 ? 'success' : 'destructive'}>
                        {b.available_copies > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(b)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <BookFormDialog open={formOpen} onOpenChange={setFormOpen} book={editingBook} onSaved={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this book?"
        description={`This will remove "${deleteTarget?.title ?? ''}" from the catalog. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
