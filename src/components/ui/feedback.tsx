import { Loader2, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} />
}

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
      <Spinner className="mr-2" /> {label}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-14 text-center">
      {Icon && <Icon className="mb-1 h-9 w-9 text-muted-foreground" />}
      <p className="font-display text-base font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'default' | 'accent' | 'warning' | 'destructive'
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
