import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createStudent, checkDuplicateRegistrationNumber } from '@/services/students'

const empty = { registration_number: '', name: '', course: '', regulation: '', year: '', semester: '', branch: '', section: '' }

export function AddStudentDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Object.values(form).some((v, i) => !v && Object.keys(form)[i] !== 'section')) {
      toast.error('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      const isDuplicate = await checkDuplicateRegistrationNumber(form.registration_number)
      if (isDuplicate) {
        toast.error('A student with this registration number already exists.')
        setLoading(false)
        return
      }
      await createStudent(form)
      toast.success('Student added.')
      setForm(empty)
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Could not add student. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <Field label="Registration Number" value={form.registration_number} onChange={(v) => set('registration_number', v)} full />
          <Field label="Student Name" value={form.name} onChange={(v) => set('name', v)} full />
          <Field label="Course" value={form.course} onChange={(v) => set('course', v)} />
          <Field label="Regulation" value={form.regulation} onChange={(v) => set('regulation', v)} />
          <Field label="Year" value={form.year} onChange={(v) => set('year', v)} />
          <Field label="Semester" value={form.semester} onChange={(v) => set('semester', v)} />
          <Field label="Branch" value={form.branch} onChange={(v) => set('branch', v)} />
          <Field label="Section (optional)" value={form.section} onChange={(v) => set('section', v)} />
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding…' : 'Add Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, onChange, full }: { label: string; value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? 'col-span-2' : ''}`}>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
