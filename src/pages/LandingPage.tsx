```tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  isLibrarianEmail,
  signInWithGoogleIdToken,
} from '@/features/auth/api'

interface GoogleCredentialResponse {
  credential: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              width?: number
              text?: string
              shape?: string
              logo_alignment?: string
            },
          ) => void
        }
      }
    }
  }
}

function decodeGoogleEmail(idToken: string): string | null {
  try {
    const parts = idToken.split('.')

    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      '=',
    )

    const json = JSON.parse(atob(padded)) as {
      email?: string
      email_verified?: boolean
    }

    if (!json.email || json.email_verified !== true) {
      return null
    }

    return json.email.toLowerCase().trim()
  } catch {
    return null
  }
}

export default function LibrarianLoginPage() {
  const navigate = useNavigate()
  const googleButtonRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
      | string
      | undefined

    if (!clientId) {
      toast.error('Google Client ID is not configured.')
      return
    }

    let cancelled = false
    let attempts = 0

    const setupGoogle = () => {
      if (cancelled) return

      if (!window.google?.accounts?.id) {
        attempts += 1

        if (attempts < 100) {
          window.setTimeout(setupGoogle, 100)
        }

        return
      }

      if (!googleButtonRef.current) {
        return
      }

      googleButtonRef.current.innerHTML = ''

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (cancelled) {
            return
          }

          setLoading(true)

          try {
            const email = decodeGoogleEmail(response.credential)

            if (!email) {
              toast.error(
                'Could not verify the selected Google account.',
              )
              return
            }

            const allowed = await isLibrarianEmail(email)

            if (!allowed) {
              toast.error(
                "You're not a Librarian, so please login as a student.",
              )
              return
            }

            await signInWithGoogleIdToken(response.credential)

            navigate('/librarian/dashboard', {
              replace: true,
            })
          } catch (error) {
            console.error(
              'Librarian Google sign-in failed:',
              error,
            )

            toast.error(
              'Could not sign in as librarian. Please try again.',
            )
          } finally {
            if (!cancelled) {
              setLoading(false)
            }
          }
        },

        auto_select: false,
        cancel_on_tap_outside: true,
      })

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        },
      )

      setGoogleReady(true)
    }

    setupGoogle()

    return () => {
      cancelled = true
    }
  }, [navigate])

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
          <div className="flex min-h-10 justify-center">
            <div ref={googleButtonRef} />
          </div>

          {!googleReady && !loading && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Loading Google sign-in…
            </p>
          )}

          {loading && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Checking librarian access…
            </p>
          )}

          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Back to home
          </Button>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link
              to="/"
              className="font-medium text-primary hover:underline"
            >
              Main page
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```
