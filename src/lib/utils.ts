import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** registration-number-as-login-identifier: deterministic synthetic email
 *  used ONLY as the Supabase Auth username. Real contact email lives in
 *  students.linked_email. Never shown to the user. */
export function regNumberToAuthEmail(regNumber: string) {
  return `${regNumber.trim().toLowerCase()}@students.adarsh-library.internal`
}

export function formatCurrencyINR(amount: number) {
  return `₹${amount.toFixed(0)}`
}

export function daysBetween(a: Date, b: Date) {
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}
