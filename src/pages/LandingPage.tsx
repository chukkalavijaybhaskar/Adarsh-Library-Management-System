import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, GraduationCap, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'

export default function LandingPage() {
  const { session, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Check whether the user has just returned from
    // "Continue as Librarian" Google login.
    const params = new URLSearchParams(window.location.search)
    const librarianLogin = params.get('librarianLogin')

    // Normal visit to the home page.
    // Do nothing.
    if (librarianLogin !== '1') {
      return
    }

    // Wait until Supabase finishes loading the Google session
    // and the user's profile.
    if (loading) {
      return
    }

    // No Google session.
    // Just stay on the home page.
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    // =========================================================
    // CASE 1: Google account IS the authorized librarian
    // =========================================================
    if (profile?.role === 'librarian') {
      navigate('/librarian/dashboard', { replace: true })
      return
    }

    // =========================================================
    // CASE 2: Google account is NOT a librarian
    // =========================================================

    // Show the required message.
    toast.error(
      "You're not a Librarian, so please login as a student."
    )

    // Remove the Google session.
    // This is important because otherwise the student account
    // could remain logged in.
    signOut().finally(() => {
      // Finally return to the main home page.
      navigate('/', { replace: true })
    })
  }, [session, profile, loading, signOut, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="h-7 w-7" />
        </div>

        <h1 className="font-display text-3xl font-bold">
          Adarsh Library Management System
        </h1>

        <p className="max-w-md text-muted-foreground">
          Sign in to browse the catalog, track your issued books, or manage
          the college library.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        {/* =========================
            STUDENT PORTAL
        ========================== */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>

            <CardTitle>Student Portal</CardTitle>

            <CardDescription>
              Log in with your registration number to search books and track
              loans.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button asChild className="w-full">
              <Link to="/student/login">
                Continue as Student
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* =========================
            LIBRARIAN PORTAL
        ========================== */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>

            <CardTitle>Librarian Portal</CardTitle>

            <CardDescription>
              Sign in with your authorized Google account to manage the
              library.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              asChild
              variant="accent"
              className="w-full"
            >
              <Link to="/librarian/login">
                Continue as Librarian
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
