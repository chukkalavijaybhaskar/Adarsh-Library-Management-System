export type UserRole = 'student' | 'librarian'
export type AccountStatus = 'NOT_ACTIVE' | 'PENDING' | 'ACTIVE' | 'REJECTED'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type IssueStatus = 'ISSUED' | 'RETURNED'
export type NotificationType =
  | 'BOOK_ISSUED'
  | 'BOOK_RETURNED'
  | 'DUE_SOON_2D'
  | 'DUE_SOON_1D'
  | 'NOTICE'
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_REJECTED'

export interface Profile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  registration_number: string
  name: string
  course: string
  regulation: string
  year: string
  semester: string
  branch: string
  section: string | null
  account_status: AccountStatus
  profile_id: string | null
  linked_email: string | null
  created_at: string
  updated_at: string
}

export interface RegistrationRequest {
  id: string
  student_id: string
  email: string
  status: RequestStatus
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

export interface Book {
  id: string
  book_id: string | null
  title: string
  isbn: string
  author: string
  total_copies: number
  available_copies: number
  course: string | null
  regulation: string | null
  year: string | null
  branch: string | null
  category: string | null
  publisher: string | null
  publication_year: number | null
  created_at: string
  updated_at: string
}

export interface BookIssue {
  id: string
  student_id: string
  book_id: string
  issue_date: string
  due_date: string
  return_date: string | null
  status: IssueStatus
  calculated_fine: number
  adjusted_fine: number | null
  final_fine: number
  fine_paid: boolean
  issued_by: string | null
  returned_by: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  student_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: string
}

export interface Notice {
  id: string
  title: string
  message: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EResource {
  id: string
  title: string
  description: string | null
  url: string
  created_by: string | null
  created_at: string
  active: boolean
}

export interface AcademicOption {
  id: string
  category: 'course' | 'regulation' | 'year' | 'semester' | 'branch' | 'section'
  value: string
  sort_order: number
}

// Convenience joined view types used by the UI layer
export interface IssuedBookView extends BookIssue {
  book: Pick<Book, 'id' | 'title' | 'isbn' | 'author'>
}

export interface StudentWithStats extends Student {
  issued_books_count: number
  current_fine: number
}

// Live SQL views (0002_functions.sql) — read-only, so Insert/Update are never
// used, but supabase-js's typed .from() still needs an entry to accept them.
export interface ActiveIssueView extends BookIssue {
  live_fine: number
  live_status: 'OVERDUE' | 'DUE_SOON' | 'ON_TIME'
}
export interface StudentFineView {
  student_id: string
  current_fine: number
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      students: { Row: Student; Insert: Partial<Student>; Update: Partial<Student> }
      registration_requests: {
        Row: RegistrationRequest
        Insert: Partial<RegistrationRequest>
        Update: Partial<RegistrationRequest>
      }
      books: { Row: Book; Insert: Partial<Book>; Update: Partial<Book> }
      book_issues: { Row: BookIssue; Insert: Partial<BookIssue>; Update: Partial<BookIssue> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      notices: { Row: Notice; Insert: Partial<Notice>; Update: Partial<Notice> }
      e_resources: { Row: EResource; Insert: Partial<EResource>; Update: Partial<EResource> }
      academic_options: { Row: AcademicOption; Insert: Partial<AcademicOption>; Update: Partial<AcademicOption> }
      librarian_emails: { Row: { email: string }; Insert: { email: string }; Update: { email: string } }
      v_active_issues: { Row: ActiveIssueView; Insert: never; Update: never }
      v_student_fines: { Row: StudentFineView; Insert: never; Update: never }
    }
  }
}
