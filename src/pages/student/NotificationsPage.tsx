import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchMyNotifications, markNotificationRead } from '@/services/misc'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

export default function NotificationsPage() {
  const { student } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    let mounted = true
    const load = () => fetchMyNotifications(student.id).then((data) => mounted && setNotifications(data))
    load().finally(() => mounted && setLoading(false))

    const channel = supabase
      .channel(`my-notifications-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `student_id=eq.${student.id}` }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [student])

  async function handleClick(n: Notification) {
    if (n.read) return
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    try {
      await markNotificationRead(n.id)
    } catch {
      // non-critical
    }
  }

  if (loading) return <PageLoading />

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Notifications</h1>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="Updates about your books and library notices will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn('cursor-pointer transition-colors', !n.read && 'border-primary/40 bg-primary/5')}
              onClick={() => handleClick(n)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', !n.read ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>
                  <BellRing className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(n.created_at), 'dd MMM, HH:mm')}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
