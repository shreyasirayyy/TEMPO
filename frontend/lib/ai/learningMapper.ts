// ---------------------------------------------------------------------------
// Learning Mapper — turns a learning goal + a pile of resources into a
// realistic, scheduled session, bucketed by priority. This is a stub:
// Tempo Learn's UI (app/growth/learning) currently drives progress directly
// via logged sessions, but a real implementation would call something like
// this to go from "React for a frontend internship" + a playlist/PDF/course
// link to a concrete MUST WATCH / RECOMMENDED / OPTIONAL / SKIP breakdown
// and a scheduled block — not just a recommendation list.
// ---------------------------------------------------------------------------

export type ResourceBucket = 'must-watch' | 'recommended' | 'optional' | 'skip-for-now'

export type MappedResource = {
  title: string
  bucket: ResourceBucket
  estimatedMinutes: number
}

export type LearningSessionPlan = {
  goal: string
  sessionMinutes: number
  resources: MappedResource[]
}

// Given a stated goal, a list of raw resource titles, current skill level
// (0-100) and minutes available, produce a bucketed session plan. The
// bucketing heuristic here is intentionally simple; swap for a real
// LLM/ranking call that reasons about target role, skill level, and resource
// relevance.
export function mapResourcesToSession(
  goal: string,
  resourceTitles: string[],
  skillLevel: number,
  minutesAvailable: number
): LearningSessionPlan {
  const resources: MappedResource[] = resourceTitles.map((title, i) => {
    const bucket: ResourceBucket = skillLevel < 30 ? (i === 0 ? 'must-watch' : 'recommended') : i < 2 ? 'must-watch' : i < 4 ? 'recommended' : 'optional'
    return { title, bucket, estimatedMinutes: 15 + (i % 3) * 10 }
  })
  return { goal, sessionMinutes: minutesAvailable, resources }
}
