// §16 Calendar / external commitments -- scoped honestly for this pass as
// read-only .ics file import rather than a live Google/Apple OAuth sync.
// Plan itself is a weekly template (day: 'mon'..'sun', no absolute dates --
// see types.ts), so imported events are mapped onto the weekday they fall
// on and treated as fixed, non-movable commitments, same as a class. A live
// OAuth sync was deliberately left out: it needs a token-storage schema
// change and a real end-to-end auth flow that can't be safely shipped
// without live testing against a real Google Cloud project.

import type { DayKey } from './types'

export type ImportedEvent = { day: DayKey; time: string; title: string; durationMinutes: number }

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function unfoldIcs(text: string): string[] {
  // RFC 5545: a line starting with a space/tab is a continuation of the
  // previous line -- unfold before splitting into logical lines.
  const rawLines = text.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) lines[lines.length - 1] += line.slice(1)
    else lines.push(line)
  }
  return lines
}

function parseIcsDate(value: string): Date | null {
  // Handles the common forms: 20260115T090000Z, 20260115T090000, 20260115
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/)
  if (!match) return null
  const [, y, mo, d, h = '0', mi = '0'] = match
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
}

/**
 * Parses VEVENT blocks from raw .ics text into weekday-bucketed events. Best
 * -effort and deliberately simple (no recurrence-rule expansion, no
 * timezone database) -- good enough for "here's my class schedule as an
 * .ics export", not a general-purpose calendar engine.
 */
export function parseIcsEvents(text: string): ImportedEvent[] {
  const lines = unfoldIcs(text)
  const events: ImportedEvent[] = []
  let inEvent = false
  let summary = ''
  let start: Date | null = null
  let end: Date | null = null

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; summary = ''; start = null; end = null; continue }
    if (line.startsWith('END:VEVENT')) {
      if (inEvent && start && summary.trim()) {
        const durationMinutes = end && end > start ? Math.round((end.getTime() - start.getTime()) / 60000) : 60
        const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
        events.push({ day: DAY_KEYS[start.getDay()], time, title: summary.trim().slice(0, 80), durationMinutes: Math.min(Math.max(durationMinutes, 15), 480) })
      }
      inEvent = false
      continue
    }
    if (!inEvent) continue
    if (line.startsWith('SUMMARY:')) summary = line.slice('SUMMARY:'.length).replace(/\\,/g, ',').replace(/\\n/gi, ' ')
    else if (line.startsWith('DTSTART')) { const v = line.split(':')[1]; if (v) start = parseIcsDate(v) }
    else if (line.startsWith('DTEND')) { const v = line.split(':')[1]; if (v) end = parseIcsDate(v) }
  }

  return events.slice(0, 100) // sanity cap
}
