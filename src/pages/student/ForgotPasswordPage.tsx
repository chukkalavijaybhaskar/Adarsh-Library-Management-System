import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MailCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { studentRequestPasswordReset } from '@/features/auth/api'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'We could not find an account for this registration number.',
  NOT_ACTIVE: 'No library account exists yet for this registration number. Please create an account first.',
  PENDING: 'Your account is still pending librarian approval.',
  REJECTED: 'Your registration request was not approved. Please contact the librarian.',
}

export default function ForgotPasswordPage() {
  const [regNumber, setRegNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await studentRequestPasswordReset(regNumber)
      setSent(true)
    } catch (err: any) {
      toast.error(ERROR_MESSAGES[err?.message] ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your registration number and we&apos;ll email a reset link to your linked address.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="h-10 w-10 text-success" />
              <p className="text-sm text-muted-foreground">
                If an active account exists for that registration number, a reset link has been sent to the linked email
                address. Check your inbox and follow the link to set a new password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input id="regNumber" required value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </form>
          )}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link to="/student/login" className="font-medium text-primary hover:underline">
              Back to Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
