import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Megaphone, Send } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { fetchNotices, sendNotice } from '@/services/misc'
import { supabase } from '@/lib/supabase'
import type { Notice } from '@/types/database'

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const load = () => fetchNotices().then(setNotices)

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('librarian-notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both the title and message.')
      return
    }
    setSending(true)
    try {
      await sendNotice(title.trim(), message.trim())
      toast.success('Notice sent to all active students.')
      setTitle('')
      setMessage('')
    } catch {
      toast.error('Could not send the notice. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Notices</h1>
        <p className="text-sm text-muted-foreground">Send an announcement to every active student.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>New Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Notice Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Library closed on 15th August" />
            </div>
            <div className="space-y-1.5">
              <Label>Notice Message</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={sending}>
              <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Notice'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Notice History</h2>
        {loading ? (
          <PageLoading />
        ) : notices.length === 0 ? (
          <EmptyState icon={Megaphone} title="No notices sent yet" />
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(n.created_at), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
