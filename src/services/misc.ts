import { supabase } from '@/lib/supabase'
import type { Notification, Notice, RegistrationRequest, EResource } from '@/types/database'

// --- Notifications -----------------------------------------------------
export async function fetchMyNotifications(studentId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

// --- Registration requests ---------------------------------------------
export async function fetchRegistrationRequests(search = '') {
  let query = supabase
    .from('registration_requests')
    .select('*, student:students(name, registration_number)')
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: false })
  const { data, error } = await query
  if (error) throw error
  let rows = data ?? []
  if (search.trim()) {
    const s = search.trim().toLowerCase()
    rows = rows.filter(
      (r: any) => r.student?.name?.toLowerCase().includes(s) || r.student?.registration_number?.toLowerCase().includes(s),
    )
  }
  return rows
}

export async function approveRequest(requestId: string) {
  const { data, error } = await supabase.rpc('rpc_approve_registration', { p_request_id: requestId })
  if (error) throw error
  return data as RegistrationRequest
}

export async function rejectRequest(requestId: string, reason?: string) {
  const { data, error } = await supabase.rpc('rpc_reject_registration', {
    p_request_id: requestId,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return data as RegistrationRequest
}

export async function fetchPendingApprovalsCount() {
  const { count } = await supabase
    .from('registration_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING')
  return count ?? 0
}

// --- Notices -------------------------------------------------------------
export async function fetchNotices(): Promise<Notice[]> {
  const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Notice[]
}

export async function sendNotice(title: string, message: string) {
  const { data, error } = await supabase.rpc('rpc_send_notice', { p_title: title, p_message: message })
  if (error) throw error
  return data as Notice
}

// --- E-Resources -----------------------------------------------------------
export async function fetchActiveEResources(): Promise<EResource[]> {
  const { data, error } = await supabase.from('e_resources').select('*').eq('active', true).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EResource[]
}
