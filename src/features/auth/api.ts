import { supabase } from '@/lib/supabase'
import type { Student, RegistrationRequest } from '@/types/database'

export type LoginEmailError = 'NOT_FOUND' | 'NOT_ACTIVE' | 'PENDING' | 'REJECTED'

function parseRpcError(error: { message: string }): LoginEmailError {
  const msg = error.message
  if (msg.includes('NOT_FOUND')) return 'NOT_FOUND'
  if (msg.includes('NOT_ACTIVE')) return 'NOT_ACTIVE'
  if (msg.includes('PENDING')) return 'PENDING'
  if (msg.includes('REJECTED')) return 'REJECTED'
  return 'NOT_FOUND'
}

/** Resolves a registration number to its linked login email via a
 *  SECURITY DEFINER RPC, then signs in with password. The student never
 *  sees or types an email address. */
export async function studentLoginWithRegistrationNumber(registrationNumber: string, password: string) {
  const { data: email, error } = await supabase.rpc('rpc_resolve_login_email', {
    p_registration_number: registrationNumber,
  })
  if (error) throw parseRpcError(error)

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: email as string, password })
  if (signInError) throw new Error('INVALID_CREDENTIALS')
}

export async function studentRequestPasswordReset(registrationNumber: string) {
  const { data: email, error } = await supabase.rpc('rpc_resolve_login_email', {
    p_registration_number: registrationNumber,
  })
  if (error) throw parseRpcError(error)

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email as string, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (resetError) throw resetError
}

export async function updatePasswordAfterReset(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function signInWithGoogle(redirectPath = '/create-account') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${redirectPath}` },
  })
  if (error) throw error
}

export type RegistrationStartError = 'NOT_FOUND' | 'ACCOUNT_EXISTS' | 'GOOGLE_ACCOUNT_ALREADY_LINKED' | 'NOT_AUTHENTICATED'

/** Step 1 after Google auth: link the authenticated account to a preloaded
 *  student record by registration number. */
export async function startStudentRegistration(registrationNumber: string): Promise<Student> {
  const { data, error } = await supabase.rpc('rpc_start_student_registration', {
    p_registration_number: registrationNumber,
  })
  if (error) {
    const msg = error.message
    if (msg.includes('NOT_FOUND')) throw new Error('NOT_FOUND' satisfies RegistrationStartError)
    if (msg.includes('ACCOUNT_EXISTS')) throw new Error('ACCOUNT_EXISTS' satisfies RegistrationStartError)
    if (msg.includes('GOOGLE_ACCOUNT_ALREADY_LINKED')) throw new Error('GOOGLE_ACCOUNT_ALREADY_LINKED' satisfies RegistrationStartError)
    throw new Error('NOT_AUTHENTICATED' satisfies RegistrationStartError)
  }
  return data as Student
}

/** Step 2: set the account password, then submit for librarian approval. */
export async function completeStudentRegistration(password: string): Promise<RegistrationRequest> {
  const { error: pwError } = await supabase.auth.updateUser({ password })
  if (pwError) throw pwError

  const { data, error } = await supabase.rpc('rpc_submit_registration_request')
  if (error) throw error
  return data as RegistrationRequest
}
