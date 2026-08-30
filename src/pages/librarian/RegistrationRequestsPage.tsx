import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, ClipboardCheck, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { fetchRegistrationRequests, approveRequest, rejectRequest } from '@/services/misc'
import { supabase } from '@/lib/supabase'

type RequestRow = {
  id: string
  email: string
  requested_at: string
  status: string
  student: { name: string; registration_number: string } | null
}

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => fetchRegistrationRequests(search).then((data) => setRequests(data as RequestRow[]))

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    const channel = supabase
      .channel('registration-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_requests' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConfirm() {
    if (!confirmTarget) return
    setBusy(true)
    try {
      if (confirmTarget.action === 'approve') {
        await approveRequest(confirmTarget.id)
        toast.success('Student approved. They can now log in.')
      } else {
        await rejectRequest(confirmTarget.id)
        toast.success('Registration request rejected.')
      }
      setRequests((prev) => prev.filter((r) => r.id !== confirmTarget.id))
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      setConfirmTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pending Registration Requests</h1>
        <p className="text-sm text-muted-foreground">Verify the student&apos;s ID card against the registration number before approving.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or registration number…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <PageLoading />
      ) : requests.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No pending requests" description="New student registration requests will appear here." />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.student?.name}</p>
                    <Badge variant="secondary">{r.student?.registration_number}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.email}</p>
                  <p className="text-xs text-muted-foreground">Requested {format(new Date(r.requested_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="destructive" onClick={() => setConfirmTarget({ id: r.id, action: 'reject' })}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => setConfirmTarget({ id: r.id, action: 'approve' })}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={confirmTarget?.action === 'approve' ? 'Approve this student?' : 'Reject this request?'}
        description={
          confirmTarget?.action === 'approve'
            ? 'Confirm you have checked the student ID card and the registration number matches. The student will be able to log in immediately.'
            : 'This request will be rejected and the account will not become active.'
        }
        confirmLabel={confirmTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmTarget?.action === 'approve' ? 'default' : 'destructive'}
        loading={busy}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
