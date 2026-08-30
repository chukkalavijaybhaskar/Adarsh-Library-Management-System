import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { fetchBooks, type BookFilters } from '@/services/books'
import { supabase } from '@/lib/supabase'
import type { AcademicOption, Book } from '@/types/database'

export default function FindBooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<BookFilters>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [options, setOptions] = useState<AcademicOption[]>([])

  useEffect(() => {
    supabase
      .from('academic_options')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setOptions((data ?? []) as AcademicOption[]))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true)
      fetchBooks({ ...filters, search })
        .then(setBooks)
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, filters])

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const byCategory = (cat: AcademicOption['category']) => options.filter((o) => o.category === cat)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Find Books</h1>
        <p className="text-sm text-muted-foreground">Search the library catalog by title, ISBN, or author.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by title, ISBN, or author…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && <Badge className="ml-1">{activeFilterCount}</Badge>}
        </Button>
      </div>

      {loading ? (
        <PageLoading />
      ) : books.length === 0 ? (
        <EmptyState icon={BookOpen} title="No books found" description="Try a different search term or clear your filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedBook(book)}>
              <CardContent className="p-5">
                <p className="font-display font-semibold leading-snug">{book.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{book.author}</p>
                <p className="mt-2 text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {book.available_copies} / {book.total_copies}
                  </span>
                  <Badge variant={book.available_copies > 0 ? 'success' : 'destructive'}>
                    {book.available_copies > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Books</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FilterSelect label="Course" value={filters.course} options={byCategory('course')} onChange={(v) => setFilters((f) => ({ ...f, course: v }))} />
            <FilterSelect
              label="Regulation"
              value={filters.regulation}
              options={byCategory('regulation')}
              onChange={(v) => setFilters((f) => ({ ...f, regulation: v }))}
            />
            <FilterSelect label="Year" value={filters.year} options={byCategory('year')} onChange={(v) => setFilters((f) => ({ ...f, year: v }))} />
            <FilterSelect label="Branch" value={filters.branch} options={byCategory('branch')} onChange={(v) => setFilters((f) => ({ ...f, branch: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFilters({})}>
              Clear
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book detail dialog */}
      <Dialog open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent>
          {selectedBook && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBook.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <Row label="Author" value={selectedBook.author} />
                <Row label="ISBN" value={selectedBook.isbn} />
                {selectedBook.category && <Row label="Category" value={selectedBook.category} />}
                {selectedBook.publisher && <Row label="Publisher" value={selectedBook.publisher} />}
                {selectedBook.publication_year && <Row label="Publication Year" value={String(selectedBook.publication_year)} />}
                {selectedBook.course && <Row label="Course" value={selectedBook.course} />}
                {selectedBook.branch && <Row label="Branch" value={selectedBook.branch} />}
                <Row label="Copies" value={`${selectedBook.available_copies} / ${selectedBook.total_copies}`} />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedBook.available_copies > 0 ? 'success' : 'destructive'}>
                    {selectedBook.available_copies > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: AcademicOption[]
  onChange: (v: string | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v === '__any__' ? undefined : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__any__">Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.value}>
              {o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
