import { useEffect, useState } from 'react'
import { ExternalLink, GraduationCap, Link2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchActiveEResources } from '@/services/misc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageLoading } from '@/components/ui/feedback'
import type { EResource } from '@/types/database'

export default function ProfilePage() {
  const { student } = useAuth()
  const [resources, setResources] = useState<EResource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveEResources()
      .then(setResources)
      .finally(() => setLoading(false))
  }, [])

  if (!student) return <PageLoading />

  const fields: Array<[string, string]> = [
    ['Student Name', student.name],
    ['Registration Number', student.registration_number],
    ['Course', student.course],
    ['Regulation', student.regulation],
    ['Year', student.year],
    ['Semester', student.semester],
    ['Branch', student.branch],
  ]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <CardTitle>Academic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-border py-1.5 sm:justify-start sm:gap-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Link2 className="h-5 w-5" />
          </div>
          <CardTitle>E-Resources</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading />
          ) : resources.length === 0 ? (
            <EmptyState title="No e-resources yet" description="The librarian hasn't shared any links yet." />
          ) : (
            <div className="space-y-2">
              {resources.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    {r.description && <p className="truncate text-sm text-muted-foreground">{r.description}</p>}
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
