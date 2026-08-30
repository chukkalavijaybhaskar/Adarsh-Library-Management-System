import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { studentLoginWithRegistrationNumber } from '@/features/auth/api'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'We could not find an account for this registration number.',
  NOT_ACTIVE: 'No library account exists yet for this registration number. Please create an account first.',
  PENDING: 'Your account verification is pending librarian approval. Please check back soon.',
  REJECTED: 'Your registration request was not approved. Please contact the librarian.',
  INVALID_CREDENTIALS: 'Incorrect registration number or password.',
}

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const [regNumber, setRegNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await studentLoginWithRegistrationNumber(regNumber, password)
      navigate('/student/dashboard')
    } catch (err: any) {
      const key = err?.message ?? 'INVALID_CREDENTIALS'
      toast.error(ERROR_MESSAGES[key] ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <CardTitle>Student Login</CardTitle>
          <CardDescription>Sign in with your registration number</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="regNumber">Registration Number</Label>
              <Input id="regNumber" required value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. 21A91A0501" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Link to="/student/forgot-password" className="text-sm text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/create-account" className="font-medium text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
