import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { Session } from '@supabase/supabase-js'
import { CheckCircle2, Chrome, Clock3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/feedback'
import { signInWithGoogle, startStudentRegistration, completeStudentRegistration } from '@/features/auth/api'
import type { Student } from '@/types/database'

const REG_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Registration number not found in the college student records. Please contact the librarian.',
  ACCOUNT_EXISTS: 'An account already exists for this registration number. Please log in using your registration number and password.',
  GOOGLE_ACCOUNT_ALREADY_LINKED: 'This Google account is already linked to a different registration number.',
  NOT_AUTHENTICATED: 'Please sign in with Google again.',
}

type Step = 'loading' | 'google' | 'regnumber' | 'password' | 'pending'

export default function CreateAccountPage() {
  const [step, setStep] = useState<Step>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [regNumber, setRegNumber] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [linkedStudent, setLinkedStudent] = useState<Student | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)

      if (!data.session) {
        setStep('google')
        return
      }

      // Already-authenticated Google user: check whether they're already
      // linked to a student record (e.g. returning after a page refresh).
      const { data: existingStudent } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', data.session.user.id)
        .maybeSingle()

      if (existingStudent?.account_status === 'PENDING') {
        setLinkedStudent(existingStudent as Student)
        setStep('pending')
      } else if (existingStudent) {
        setLinkedStudent(existingStudent as Student)
        setStep('password')
      } else {
        setStep('regnumber')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function handleGoogle() {
    setLoading(true)
    try {
      await signInWithGoogle('/create-account')
    } catch {
      toast.error('Could not start Google sign-in. Please try again.')
      setLoading(false)
    }
  }

  async function handleRegNumberSubmit(e: React.FormEvent) {
    e.preventDefault()
    setRegError(null)
    setLoading(true)
    try {
      const student = await startStudentRegistration(regNumber)
      setLinkedStudent(student)
      setStep('password')
    } catch (err: any) {
      setRegError(REG_ERROR_MESSAGES[err.message] ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await completeStudentRegistration(password)
      setStep('pending')
    } catch {
      toast.error('Could not submit your request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') return <PageLoading />

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle>Create Student Account</CardTitle>
          <CardDescription>
            {step === 'google' && 'Start by verifying your identity with Google.'}
            {step === 'regnumber' && 'Enter your registration number to fetch your academic details.'}
            {step === 'password' && 'Review your details and set a password.'}
            {step === 'pending' && 'Your request has been submitted.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'google' && (
            <Button className="w-full" variant="outline" onClick={handleGoogle} disabled={loading}>
              <Chrome className="h-4 w-4" /> Continue with Google
            </Button>
          )}

          {step === 'regnumber' && (
            <form onSubmit={handleRegNumberSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input id="regNumber" required value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
              </div>
              {regError && <p className="text-sm text-destructive">{regError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking…' : 'Continue'}
              </Button>
            </form>
          )}

          {step === 'password' && linkedStudent && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="rounded-md bg-secondary p-3 text-sm">
                <p className="font-medium">{linkedStudent.name}</p>
                <p className="text-muted-foreground">{linkedStudent.registration_number}</p>
                <p className="mt-1 text-muted-foreground">
                  {linkedStudent.course} · {linkedStudent.regulation} · Year {linkedStudent.year} · Sem {linkedStudent.semester} ·{' '}
                  {linkedStudent.branch}
                  {linkedStudent.section ? ` · Sec ${linkedStudent.section}` : ''}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Create Password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting…' : 'Request Approval'}
              </Button>
            </form>
          )}

          {step === 'pending' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <Clock3 className="h-10 w-10 text-warning" />
              <p className="text-sm text-muted-foreground">
                Your registration request has been sent to the librarian for verification. You&apos;ll be able to log in once
                it&apos;s approved.
              </p>
            </div>
          )}

          {step !== 'pending' && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/student/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </p>
          )}
          {step === 'pending' && (
            <div className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <Link to="/student/login" className="font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
