import { useState } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { UploadCloud, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { bulkImportStudents } from '@/services/students'

interface ParsedRow {
  registration_number: string
  name: string
  course: string
  regulation: string
  year: string
  semester: string
  branch: string
  section?: string
  _valid: boolean
  _error?: string
}

const REQUIRED_COLUMNS = ['registration_number', 'name', 'course', 'regulation', 'year', 'semester', 'branch']

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

export function BulkImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{ inserted_count: number; skipped_duplicates: number } | null>(null)

  function reset() {
    setRows([])
    setFileName(null)
    setSummary(null)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setSummary(null)

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

    if (json.length === 0) {
      toast.error('The uploaded file has no data rows.')
      return
    }

    const seen = new Set<string>()
    const parsed: ParsedRow[] = json.map((raw) => {
      const normalized: Record<string, string> = {}
      for (const key of Object.keys(raw)) {
        normalized[normalizeHeader(key)] = String(raw[key] ?? '').trim()
      }
      const missing = REQUIRED_COLUMNS.filter((c) => !normalized[c])
      const regNum = normalized.registration_number
      let error: string | undefined
      if (missing.length > 0) {
        error = `Missing: ${missing.join(', ')}`
      } else if (seen.has(regNum.toLowerCase())) {
        error = 'Duplicate within file'
      }
      seen.add(regNum.toLowerCase())

      return {
        registration_number: regNum,
        name: normalized.name,
        course: normalized.course,
        regulation: normalized.regulation,
        year: normalized.year,
        semester: normalized.semester,
        branch: normalized.branch,
        section: normalized.section,
        _valid: !error,
        _error: error,
      }
    })

    setRows(parsed)
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r._valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import.')
      return
    }
    setLoading(true)
    try {
      const result = await bulkImportStudents(
        validRows.map(({ _valid, _error, ...rest }) => rest),
      )
      setSummary(result ?? { inserted_count: 0, skipped_duplicates: 0 })
      onImported()
    } catch {
      toast.error('Import failed. Please check the file and try again.')
    } finally {
      setLoading(false)
    }
  }

  const validCount = rows.filter((r) => r._valid).length
  const invalidCount = rows.length - validCount

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Upload an .xlsx or .csv file with columns: registration_number, name, course, regulation, year, semester, branch, section (optional).
          </DialogDescription>
        </DialogHeader>

        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-center hover:bg-secondary">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to select a file</span>
            <span className="text-xs text-muted-foreground">.xlsx, .xls, or .csv</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>
        ) : summary ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileSpreadsheet className="h-9 w-9 text-success" />
            <p className="font-medium">Import complete</p>
            <p className="text-sm text-muted-foreground">
              {summary.inserted_count} student{summary.inserted_count === 1 ? '' : 's'} imported, {summary.skipped_duplicates} duplicate
              {summary.skipped_duplicates === 1 ? '' : 's'} skipped.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </span>
              <span>
                <Badge variant="success">{validCount} valid</Badge>{' '}
                {invalidCount > 0 && <Badge variant="destructive">{invalidCount} invalid</Badge>}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Reg. No.</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Branch</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">{r.registration_number || '—'}</td>
                      <td className="p-2">{r.name || '—'}</td>
                      <td className="p-2">{r.branch || '—'}</td>
                      <td className="p-2">
                        {r._valid ? (
                          <Badge variant="success">OK</Badge>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" /> {r._error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Choose a different file
              </Button>
              <Button onClick={handleImport} disabled={loading || validCount === 0}>
                {loading ? 'Importing…' : `Import ${validCount} student${validCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
