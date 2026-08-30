import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  BookMarked,
  Bell,
  User,
  ClipboardList,
  Users,
  Library,
  ArrowLeftRight,
  Wallet,
  Megaphone,
  FileBarChart,
  Menu,
  X,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'

const studentNav = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/find-books', label: 'Find Books', icon: Search },
  { to: '/student/my-issued-books', label: 'My Issued Books', icon: BookMarked },
  { to: '/student/notifications', label: 'Notifications', icon: Bell },
  { to: '/student/profile', label: 'Profile', icon: User },
]

const librarianNav = [
  { to: '/librarian/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/librarian/registration-requests', label: 'Registration Requests', icon: ClipboardList },
  { to: '/librarian/students', label: 'Students', icon: Users },
  { to: '/librarian/books', label: 'Books', icon: Library },
  { to: '/librarian/issue-return', label: 'Issue / Return', icon: ArrowLeftRight },
  { to: '/librarian/fines-overdues', label: 'Fines & Overdues', icon: Wallet },
  { to: '/librarian/notices', label: 'Notices', icon: Megaphone },
  { to: '/librarian/reports', label: 'Reports', icon: FileBarChart },
]

export function AppLayout({ role }: { role: 'student' | 'librarian' }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profile, student } = useAuth()
  const nav = role === 'student' ? studentNav : librarianNav
  const displayName = role === 'student' ? student?.name ?? 'Student' : 'Librarian'

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <SidebarBrand />
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} onClick={() => {}} />
          ))}
        </nav>
        <div className="border-t border-border p-4 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{displayName}</span>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between px-2">
              <SidebarBrand />
              <button
                aria-label="Close menu"
                className="mr-3 rounded-md p-2 hover:bg-secondary"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {nav.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setDrawerOpen(false)} />
              ))}
            </nav>
            <div className="border-t border-border p-4 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            aria-label="Open menu"
            className="rounded-md p-2 hover:bg-secondary"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-semibold">Adarsh Library</span>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpen className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-sm font-bold leading-tight">Adarsh Library</p>
        <p className="text-xs text-muted-foreground">Management System</p>
      </div>
    </div>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  onClick: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}
