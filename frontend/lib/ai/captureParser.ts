import type { CaptureType, Extracted, ApplicationStatus, PriorityItem } from '../types'
import { parseDateText, formatDateLabel } from '../date'

export function detectDate(text: string, now: Date = new Date()): { at: number; label: string } | null {
  const parsed = parseDateText(text, now)
  return parsed ? { at: parsed.at, label: parsed.label } : null
}

function detectEffort(text: string): string | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)\b/i)
  if (!match) return null
  const value = match[1]
  return match[2].toLowerCase().startsWith('h') ? `${value}h` : `${value}m`
}

function detectCompany(text: string): string | null {
  const phrase = text.match(/(?:applying\s+to|applied\s+to|application\s+to|interview\s+at|offer\s+from|portal\s+for)\s+(.+?)(?=\s+(?:for|as|on|with|by|deadline|due)\b|[.,;]|$)/i)?.[1]
  if (phrase) return phrase.trim().replace(/^(the|a|an)\s+/i, '').replace(/[.,]$/, '')
  const fallback = text.match(/\bat\s+([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,3})/)?.[1]
  return fallback ? fallback.replace(/[.,]$/, '') : null
}

function detectRole(text: string): string | null {
  const internshipMatch = text.match(/\b([A-Za-z][A-Za-z-]{1,20})\s+internship\b/i)
  if (internshipMatch) return `${internshipMatch[1].toUpperCase()} Intern`
  const rolePhrase = text.match(/\b(?:for|as)\s+(?:the\s+)?(.+?)(?:\s+role|\s+position)\b/i)?.[1]
  if (rolePhrase) return rolePhrase.trim()
  const knownRoles = ['SDE Intern', 'Frontend Engineer Intern', 'Backend Engineer Intern', 'Backend Intern', 'Frontend Intern', 'Product Intern', 'Data Analyst Intern', 'Software Engineer', 'Product Manager']
  return knownRoles.find((role) => new RegExp(`\\b${role}\\b`, 'i').test(text)) ?? null
}

function detectLink(text: string): string {
  return text.match(/https?:\/\/[^\s)]+/i)?.[0]?.replace(/[.,]$/, '') ?? ''
}

function detectStatus(text: string): ApplicationStatus {
  const lower = text.toLowerCase()
  if (/\boffer\b/.test(lower)) return 'Offer'
  if (/\breject(?:ed)?\b/.test(lower)) return 'Rejected'
  if (/\binterview\b/.test(lower)) return 'Interview'
  if (/\b(in progress|working on|draft|started|form started)\b/.test(lower)) return 'In Progress'
  if (/\b(applied|submitted|application submitted)\b/.test(lower)) return 'Applied'
  return 'Needs Review'
}

function detectAppliedOn(text: string, now: Date): string {
  const match = text.match(/(?:applied|submitted)(?:\s+on|\s+date)?\s+(.+?)(?=\s+(?:to|for|at|deadline|due|by)\b|$)/i)
  if (!match) return ''
  return parseDateText(match[1], now)?.label ?? ''
}

function looksLikeApplication(text: string): boolean {
  return /\b(application|applying|applied|internship|interview|offer|resume|cover letter|portal|recruiter|company)\b/i.test(text)
}

function taskCategory(text: string): PriorityItem['category'] {
  const lower = text.toLowerCase()
  if (/\b(learn|practice|study|read|course|chapter)\b/.test(lower)) return 'Learning'
  if (/\b(application|internship|resume|interview)\b/.test(lower)) return 'Career'
  if (/\b(gym|doctor|personal|buy|call)\b/.test(lower)) return 'Personal'
  return 'Academic'
}

// Splits a pasted blob of text into individual task-like segments so a
// single paste containing several commitments ("DBMS report due tonight\nOS
// assignment due tomorrow") produces multiple capture items instead of one
// giant title. Only used for the 'text' capture type -- voice/image/file
// captures still go through as a single item.
//
// Heuristic, not an LLM call: split on newlines and on explicit list
// markers/numbering, then drop fragments too short to be their own task
// (stray punctuation, a lone "and", etc). If splitting doesn't actually
// produce more than one usable segment, the caller falls back to treating
// the whole paste as one item -- this never makes single-item pastes worse.
export function splitCaptureSegments(rawText: string): string[] {
  const text = rawText.trim()
  if (!text) return []

  const lines = text
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/)) // also split sentences within one line
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()) // strip "- ", "1.", "2)" list markers
    .filter((line) => line.length >= 6) // drop stray fragments
    .filter((line) => /[a-zA-Z]{3,}/.test(line)) // must contain a real word

  // Merge lines back together isn't needed -- each surviving line is a
  // candidate segment. If we only found one (or the split produced nothing
  // usable), signal "not multi" by returning the original single block.
  return lines.length > 1 ? lines : [text]
}

export function parseCapture(type: CaptureType, rawText: string): Extracted {
  const text = rawText.trim()
  const lower = text.toLowerCase()
  const effort = detectEffort(text)
  const date = detectDate(text)
  const strongTaskSignals = ['assignment', 'homework', 'quiz', 'read chapter', 'meeting', 'call with', 'report', 'study', 'project']
  const appContext = /\b(application|applying|applied|internship|interview|offer|resume|portal|recruiter|company)\b/i.test(text)
  const looksLikeTask = !appContext || (strongTaskSignals.some((signal) => lower.includes(signal)) && !appContext)

  if (looksLikeTask) {
    const uncertainFields: string[] = []
    if (!date) uncertainFields.push('due')
    if (!effort) uncertainFields.push('effort')
    return {
      kind: 'task',
      title: text.length > 80 ? `${text.slice(0, 77)}...` : text || 'Untitled task',
      category: taskCategory(text),
      due: date?.label ?? '',
      dueAt: date?.at ?? null,
      effort: effort ?? '',
      uncertainFields,
    }
  }

  const company = detectCompany(text)
  const role = detectRole(text)
  const status = detectStatus(text)
  const appliedOn = detectAppliedOn(text, new Date())
  const link = detectLink(text)
  const deadline = date
  const followUp = deadline ? formatDateLabel(deadline.at + 7 * 24 * 60 * 60 * 1000, false) : ''
  const uncertainFields: string[] = []
  if (!company) uncertainFields.push('company')
  if (!role) uncertainFields.push('role')
  if (!deadline) uncertainFields.push('deadline')
  if (status === 'Needs Review') uncertainFields.push('status')
  if (!appliedOn) uncertainFields.push('appliedOn')
  if (!link) uncertainFields.push('link')

  return {
    kind: 'application',
    company: company ?? '',
    role: role ?? '',
    status,
    deadline: deadline?.label ?? '',
    deadlineAt: deadline?.at ?? null,
    appliedOn,
    link,
    questions: [],
    submittedItems: [],
    followUpDate: followUp,
    uncertainFields,
  }
}