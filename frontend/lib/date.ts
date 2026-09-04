import type { DayKey } from './types'

// PlanBlock.day is a recurring weekday key in this prototype. All calculations
// that need an actual calendar date go through these helpers so relative dates
// remain correct across sessions and time zones.
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type { DayKey }

const LABELS: Record<DayKey, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
}

export type ParsedDate = { at: number; label: string; precision: 'exact' | 'date' }

export function todayKey(now: Date = new Date()): DayKey {
  return DAY_KEYS[now.getDay()]
}

export function dayKeyOffset(offsetDays: number, from: Date = new Date()): DayKey {
  const d = new Date(from)
  d.setDate(d.getDate() + offsetDays)
  return DAY_KEYS[d.getDay()]
}

export function dayLabel(key: DayKey): string {
  return LABELS[key]
}

export function greetingForTime(now: Date = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function dateAtOffset(offsetDays: number, hour = 12, minute = 0, from: Date = new Date()): number {
  const d = new Date(from)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

export function formatDateLabel(at: number | null | undefined, includeTime = true): string {
  if (at == null || !Number.isFinite(at)) return 'Needs Review'
  const date = new Date(at)
  const datePart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (!includeTime) return datePart
  const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

function endOfDay(base: Date): Date {
  const d = new Date(base)
  d.setHours(23, 59, 0, 0)
  return d
}

function parseClock(text: string): { hour: number; minute: number } | null {
  const hasExplicitClock = /(?:\bat\s+\d|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)\b)/i.test(text)
  if (!hasExplicitClock) return null
  const match = text.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  const meridiem = match[3]?.toLowerCase()
  if (minute > 59 || hour > 23 || (meridiem && hour > 12) || hour < 0) return null
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return { hour, minute }
}

function setLocalDate(base: Date, offsetDays: number, clock?: { hour: number; minute: number }): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  if (clock) d.setHours(clock.hour, clock.minute, 0, 0)
  else d.setHours(23, 59, 0, 0)
  return d
}

function relativeDayOffset(lower: string, now: Date): number | null {
  if (/\btomorrow\b/.test(lower)) return 1
  if (/\b(today|tonight)\b/.test(lower)) return 0
  const inMatch = lower.match(/\bin\s+(a|an|\d+)\s+(day|days|week|weeks)\b/)
  if (inMatch) {
    const amount = /^\d+$/.test(inMatch[1]) ? Number(inMatch[1]) : 1
    return amount * (inMatch[2].startsWith('week') ? 7 : 1)
  }
  if (/\bnext week\b/.test(lower)) return 7
  const weekdayMatch = lower.match(/\b(mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/)
  if (weekdayMatch) {
    const target = DAY_KEYS.indexOf(weekdayMatch[1] as DayKey)
    let offset = (target - now.getDay() + 7) % 7
    if (offset === 0) offset = 7
    return offset
  }
  return null
}

/** Parse only dates genuinely present in the user's text. Unknown input returns null. */
export function parseDateText(text: string, now: Date = new Date()): ParsedDate | null {
  const value = text.trim()
  if (!value) return null
  const lower = value.toLowerCase()
  const clock = parseClock(lower)
  const relativeOffset = relativeDayOffset(lower, now)
  if (relativeOffset != null) {
    const date = setLocalDate(now, relativeOffset, clock ?? undefined)
    return { at: date.getTime(), label: clock ? formatDateLabel(date.getTime()) : relativeOffset === 0 ? 'Today' : relativeOffset === 1 ? 'Tomorrow' : formatDateLabel(date.getTime(), false), precision: clock ? 'exact' : 'date' }
  }

  const monthMatch = lower.match(/\b(?:by|on|due(?:\s+on)?|deadline\s*(?:is|:)?\s*)?([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i)
  if (monthMatch) {
    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].findIndex((month) => monthMatch[1].toLowerCase().startsWith(month))
    const day = Number(monthMatch[2])
    if (monthIndex >= 0 && day >= 1 && day <= 31) {
      const year = Number(monthMatch[3] ?? now.getFullYear())
      const date = new Date(year, monthIndex, day, clock?.hour ?? 23, clock?.minute ?? 59, 0, 0)
      if (!Number.isNaN(date.getTime())) {
        if (!monthMatch[3] && date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) date.setFullYear(date.getFullYear() + 1)
        return { at: date.getTime(), label: formatDateLabel(date.getTime(), !!clock), precision: clock ? 'exact' : 'date' }
      }
    }
  }

  const isoMatch = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?\b/)
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), Number(isoMatch[4] ?? 23), Number(isoMatch[5] ?? 59), 0, 0)
    if (!Number.isNaN(date.getTime())) return { at: date.getTime(), label: formatDateLabel(date.getTime(), !!isoMatch[4]), precision: isoMatch[4] ? 'exact' : 'date' }
  }

  return null
}

export function isWithinDays(at: number | null | undefined, days: number, now: Date = new Date()): boolean {
  if (at == null) return false
  return at >= now.getTime() && at <= now.getTime() + days * 24 * 60 * 60 * 1000
}

export function isSameOrBeforeDay(at: number | null | undefined, now: Date = new Date()): boolean {
  if (at == null) return false
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return at <= end.getTime()
}
