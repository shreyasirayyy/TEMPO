import type { Application, DayKey, PlanBlock, PlanningMode, Priority } from './types'
import { findNextAvailableSlot, parseDurationMinutes } from './planTime'
import { priorityRank } from './ai/priorityEngine'

export function suggestTimeForTask({
  title,
  duration,
  priority,
  plan,
  planningMode,
  preferredDay,
}: {
  title: string
  duration: string
  priority: Priority
  plan: PlanBlock[]
  planningMode: PlanningMode | null
  preferredDay?: DayKey
}) {
  return findNextAvailableSlot({
    blocks: plan,
    durationMinutes: parseDurationMinutes(duration) || (priorityRank(priority) <= priorityRank('High') ? 60 : 30),
    priority,
    planningMode,
    preferredDay,
  })
}

export function suggestTimeForApplication({
  application,
  priority,
  plan,
  planningMode,
}: {
  application: Application
  priority: Priority
  plan: PlanBlock[]
  planningMode: PlanningMode | null
}) {
  const remaining = Math.max(1, application.questions.length - application.submittedItems.length)
  return findNextAvailableSlot({
    blocks: plan,
    durationMinutes: Math.max(20, remaining * 15),
    priority,
    planningMode,
  })
}

export { findNextAvailableSlot }
