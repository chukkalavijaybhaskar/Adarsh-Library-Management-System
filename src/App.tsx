import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RequireRole, RedirectIfAuthed } from '@/routes/guards'
import { PageLoading } from '@/components/ui/feedback'

const StudentLogin = lazy(() => import('@/pages/student/LoginPage'))
const ForgotPassword = lazy(() => import('@/pages/student/ForgotPasswordPage'))
const ResetPassword = lazy(() => import('@/pages/student/ResetPasswordPage'))
const CreateAccount = lazy(() => import('@/pages/student/CreateAccountPage'))
const StudentDashboard = lazy(() => import('@/pages/student/DashboardPage'))
const FindBooks = lazy(() => import('@/pages/student/FindBooksPage'))
const MyIssuedBooks = lazy(() => import('@/pages/student/MyIssuedBooksPage'))
const StudentNotifications = lazy(() => import('@/pages/student/NotificationsPage'))
const StudentProfile = lazy(() => import('@/pages/student/ProfilePage'))

const LibrarianLogin = lazy(() => import('@/pages/librarian/LoginPage'))
const LibrarianDashboard = lazy(() => import('@/pages/librarian/DashboardPage'))
const RegistrationRequests = lazy(() => import('@/pages/librarian/RegistrationRequestsPage'))
const Students = lazy(() => import('@/pages/librarian/StudentsPage'))
const Books = lazy(() => import('@/pages/librarian/BooksPage'))
const IssueReturn = lazy(() => import('@/pages/librarian/IssueReturnPage'))
const FinesOverdues = lazy(() => import('@/pages/librarian/FinesOverduesPage'))
const Notices = lazy(() => import('@/pages/librarian/NoticesPage'))
const Reports = lazy(() => import('@/pages/librarian/ReportsPage'))

const Landing = lazy(() => import('@/pages/LandingPage'))

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Student auth */}
        <Route
          path="/student/login"
          element={
            <RedirectIfAuthed role="student">
              <StudentLogin />
            </RedirectIfAuthed>
          }
        />
        <Route path="/student/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/create-account" element={<CreateAccount />} />

        {/* Student app */}
        <Route
          element={
            <RequireRole role="student">
              <AppLayout role="student" />
            </RequireRole>
          }
        >
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/find-books" element={<FindBooks />} />
          <Route path="/student/my-issued-books" element={<MyIssuedBooks />} />
          <Route path="/student/notifications" element={<StudentNotifications />} />
          <Route path="/student/profile" element={<StudentProfile />} />
        </Route>

        {/* Librarian auth */}
        <Route
          path="/librarian/login"
          element={
            <RedirectIfAuthed role="librarian">
              <LibrarianLogin />
            </RedirectIfAuthed>
          }
        />

        {/* Librarian app */}
        <Route
          element={
            <RequireRole role="librarian">
              <AppLayout role="librarian" />
            </RequireRole>
          }
        >
          <Route path="/librarian/dashboard" element={<LibrarianDashboard />} />
          <Route path="/librarian/registration-requests" element={<RegistrationRequests />} />
          <Route path="/librarian/students" element={<Students />} />
          <Route path="/librarian/books" element={<Books />} />
          <Route path="/librarian/issue-return" element={<IssueReturn />} />
          <Route path="/librarian/fines-overdues" element={<FinesOverdues />} />
          <Route path="/librarian/notices" element={<Notices />} />
          <Route path="/librarian/reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
