import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { fromZonedTime } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a local date+time string pair and IANA timezone to a UTC Date.
 * @param dateStr - "YYYY-MM-DD"
 * @param timeStr - "HH:MM"
 * @param timezone - IANA timezone string, e.g. "America/New_York"
 */
export function localTimeToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const localIso = `${dateStr}T${timeStr}:00`
  return fromZonedTime(localIso, timezone)
}
