import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'EEEE, MMMM d, yyyy')
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'MMM d, yyyy')
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString
  }
}

export function formatTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'h:mm a')
  } catch (error) {
    console.error("Error formatting time:", error)
    return ''
  }
}
