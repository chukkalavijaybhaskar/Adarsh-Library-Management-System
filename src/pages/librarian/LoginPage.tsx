import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chrome, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { signInWithGoogle } from '@/features/auth/api'

export default function LibrarianLoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)

    try {
      // IMPORTANT:
      // Do NOT send the user directly to the librarian dashboard.
      // First return to the home page where the Google account
      // will be checked against the librarian role.
      await signInWithGoogle('/?librarianLogin=1')
    } catch {
      toast.error('Could not start Google sign-in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <KeyRound className="h-5 w-5" />
          </div>

          <CardTitle>Librarian Login</CardTitle>

          <CardDescription>
            Sign in with your authorized Google account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            className="w-full"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
          >
            <Chrome className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link
              to="/"
              className="font-medium text-primary hover:underline"
            >
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

