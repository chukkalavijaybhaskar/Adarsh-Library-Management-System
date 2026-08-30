import { Link } from 'react-router-dom'
import { BookOpen, GraduationCap, KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-bold">Adarsh Library Management System</h1>
        <p className="max-w-md text-muted-foreground">Sign in to browse the catalog, track your issued books, or manage the college library.</p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <CardTitle>Student Portal</CardTitle>
            <CardDescription>Log in with your registration number to search books and track loans.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/student/login">Continue as Student</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <CardTitle>Librarian Portal</CardTitle>
            <CardDescription>Sign in with your authorized Google account to manage the library.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="accent" className="w-full">
              <Link to="/librarian/login">Continue as Librarian</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
