// Home's "what matters now" natural-language line (§1 of the spec). Real LLM
// call via the backend when Groq is configured; otherwise falls back to a
// deterministic template built from the same signals, so Home never shows a
// blank or broken summary either way.

import { api, ApiError } from '../apiClient'

export type HomeSignals = {
  studentName?: string
  usableMinutesToday: number
  planningMode: 'Gentle' | 'Pressure' | null
  topPriority: { title: string; category: string; priority: string; due: string } | null
  secondaryPriority: { title: string; priority: string; due: string } | null
  attendanceRisk: { courseName: string; pct: number; target: number; needToAttend: number } | null
  urgentApplication: { company: string; role: string; status: string; deadline: string } | null
  learningTrack: { name: string; nextSession: string } | null
}

type HomeSummaryResponse = { source: 'llm'; summary: string }

export async function tryHomeSummary(signals: HomeSignals): Promise<string | null> {
  try {
    const response = await api.post<HomeSummaryResponse>('/api/ai/home-summary', { signals })
    return response.summary
  } catch (error) {
    if (error instanceof ApiError) return null
    return null
  }
}

/**
 * Deterministic fallback -- same "protect the most urgent thing" logic the
 * LLM prompt follows, just template-based instead of generated. Used when
 * GROQ_API_KEY isn't configured or the call fails, so Home always says
 * something concrete rather than a generic placeholder.
 */
export function buildFallbackSummary(signals: HomeSignals): string {
  const { topPriority, attendanceRisk, urgentApplication, usableMinutesToday } = signals

  if (topPriority && (topPriority.priority === 'Critical' || topPriority.priority === 'High')) {
    const timeNote = usableMinutesToday < 180 ? ` You have about ${Math.round(usableMinutesToday / 60)}h usable left today -- protect this before flexible tasks.` : ''
    return `"${topPriority.title}" is ${topPriority.due ? `due ${topPriority.due}` : 'your top priority'} right now.${timeNote}`
  }

  if (attendanceRisk) {
    return `${attendanceRisk.courseName} attendance is at ${attendanceRisk.pct}% -- attend the next ${attendanceRisk.needToAttend} class${attendanceRisk.needToAttend === 1 ? '' : 'es'} to recover above ${attendanceRisk.target}%.`
  }

  if (urgentApplication) {
    return `${urgentApplication.company || 'An application'}${urgentApplication.role ? ` (${urgentApplication.role})` : ''} needs attention -- status: ${urgentApplication.status}.`
  }

  if (topPriority) {
    return `"${topPriority.title}" is next up on your plan.`
  }

  return 'Nothing urgent right now -- good time to make progress on something flexible.'
}
