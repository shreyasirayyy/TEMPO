import type { Application, ExtractedApplication } from './types'

// ---------------------------------------------------------------------------
// Duplicate detection for Application Memory — a loose match on company +
// role (case/whitespace-insensitive). This is deliberately non-blocking: it
// surfaces a warning so the user can decide, rather than silently merging or
// refusing to save (a real backend would likely also weigh the deadline).
// ---------------------------------------------------------------------------

export function findDuplicateApplication(draft: ExtractedApplication, applications: Application[]): Application | null {
  const company = draft.company.trim().toLowerCase()
  const role = draft.role.trim().toLowerCase()
  if (!company) return null
  return applications.find((a) => a.company.trim().toLowerCase() === company && a.role.trim().toLowerCase() === role) ?? null
}
