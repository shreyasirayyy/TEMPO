import type {
  Application,
  ApplicationPriorityInput,
  FixSuggestion,
  PlanBlock,
  PlanningMode,
  Priority,
  PriorityItem,
  TaskPriorityInput,
} from '../types'
import { makeId } from '../id'
import { addMinutesToTime, findNextAvailableSlot, getBlockDurationMinutes, parseTimeToMinutes } from '../planTime'
import { parseDateText } from '../date'

const CATEGORY_IMPACT: Record<PriorityItem['category'], number> = {
  Academic: 22,
  Career: 27,
  Learning: 15,
  Personal: 10,
}

const STATUS_IMPACT: Record<Application['status'], number> = {
  'Needs Review': 26,
  'Form Started': 24,
  'In Progress': 24,
  Applied: 9,
  Interview: 16,
  Offer: 6,
  Rejected: 0,
}

export const PRIORITY_SCORE_BANDS: Record<Priority, { min: number; max: number }> = {
  Critical: { min: 80, max: 100 },
  High: { min: 60, max: 79 },
  Medium: { min: 30, max: 59 },
  Low: { min: 0, max: 29 },
}

export const PRIORITY_ORDER: Priority[] = ['Critical', 'High', 'Medium', 'Low']

export function priorityRank(priority: Priority): number {
  return PRIORITY_ORDER.indexOf(priority)
}

function levelFromScore(score: number): Priority {
  if (score >= PRIORITY_SCORE_BANDS.Critical.min) return 'Critical'
  if (score >= PRIORITY_SCORE_BANDS.High.min) return 'High'
  if (score >= PRIORITY_SCORE_BANDS.Medium.min) return 'Medium'
  return 'Low'
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function hoursUntil(atMs: number | null, now = Date.now()): number | null {
  if (atMs == null || !Number.isFinite(atMs)) return null
  return (atMs - now) / 3600000
}

function deadlinePressure(atMs: number | null, now = Date.now()): { score: number; label: string } {
  const hours = hoursUntil(atMs, now)
  if (hours == null) return { score: 8, label: 'Unknown deadline' }
  if (hours <= 0) return { score: 100, label: 'Due now or overdue' }
  if (hours <= 6) return { score: 94, label: `Due in ${Math.ceil(hours)}h` }
  if (hours <= 24) return { score: 86, label: `Due within ${Math.ceil(hours)}h` }
  if (hours <= 48) return { score: 74, label: `Due in ${Math.ceil(hours)}h` }
  if (hours <= 72) return { score: 64, label: `Due in ${Math.ceil(hours)}h` }
  if (hours <= 7 * 24) return { score: 48, label: `Due in ${Math.ceil(hours / 24)}d` }
  if (hours <= 14 * 24) return { score: 32, label: `Due in ${Math.ceil(hours / 24)}d` }
  return { score: 18, label: `Due in ${Math.ceil(hours / 24)}d` }
}

function effortMinutes(effort: string): number {
  const hours = effort.match(/(\d+(?:\.\d+)?)\s*h/i)
  const minutes = effort.match(/(\d+)\s*m/i)
  return Math.round((hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0))
}

function effortPressure(effort: string, availableMinutes?: number): { score: number; label: string } {
  const minutes = effortMinutes(effort)
  if (!minutes) return { score: 8, label: 'Effort needs review' }
  const availability = availableMinutes == null ? null : Math.max(0, availableMinutes)
  const pressure = availability != null && minutes > availability ? 24 : minutes >= 120 ? 16 : minutes >= 60 ? 10 : 5
  return { score: pressure, label: `${minutes}m estimated${availability == null ? '' : ` · ${availability}m usable`}` }
}

function planningModeAdjustment(mode: PlanningMode | null | undefined): number {
  return mode === 'Pressure' ? 8 : mode === 'Gentle' ? -4 : 0
}

// §14 connected-context boost: small, capped, and always explained via a
// whyFactors line — attendance risk and skill gaps nudge the score, they
// never override deadline/effort math on their own.
function contextBoost(input: TaskPriorityInput): { score: number; label: string } {
  const ctx = input.context
  if (!ctx) return { score: 0, label: 'No linked academic/career context' }

  if (input.category === 'Academic' && ctx.attendanceRisk) {
    const { courseName, pct, target, needToAttend } = ctx.attendanceRisk
    const deficit = Math.max(0, target - pct)
    const boost = Math.min(14, Math.round(deficit * 0.6))
    return { score: boost, label: `${courseName} attendance is ${pct}% (target ${target}%) — attend ${needToAttend} more to recover` }
  }

  if (input.category === 'Learning' && ctx.skillGap) {
    return { score: 10, label: `Closes a tracked gap: ${ctx.skillGap.skill} for "${ctx.skillGap.goalTitle}"` }
  }

  if (input.category === 'Career' && ctx.skillGap) {
    return { score: 6, label: `Related to skill gap: ${ctx.skillGap.skill} for "${ctx.skillGap.goalTitle}"` }
  }

  return { score: 0, label: 'No linked academic/career context' }
}

function taskPriorityScore(input: TaskPriorityInput): { score: number; factors: { label: string; value: string }[] } {
  const deadline = deadlinePressure(input.dueAt)
  const effort = effortPressure(input.effort, input.availableMinutes)
  const impact = Math.max(0, Math.min(30, input.impact ?? CATEGORY_IMPACT[input.category]))
  const dependencies = input.dependencies?.length ? Math.min(12, input.dependencies.length * 4) : 0
  const availabilityPenalty = input.availableMinutes != null && effortMinutes(input.effort) > input.availableMinutes ? 10 : 0
  const context = contextBoost(input)
  const score = clampScore(deadline.score * 0.58 + impact + effort.score + dependencies + availabilityPenalty + context.score + planningModeAdjustment(input.planningMode))
  return {
    score,
    factors: [
      { label: 'Deadline proximity', value: deadline.label },
      { label: 'Impact / consequence', value: `${impact}/30` },
      { label: 'Estimated effort', value: effort.label },
      { label: 'Available time', value: input.availableMinutes == null ? 'Not set' : `${input.availableMinutes}m usable` },
      { label: 'Dependencies', value: dependencies ? `${input.dependencies?.length} dependency signal(s)` : 'None known' },
      { label: 'Connected context', value: context.label },
      { label: 'Planning mode', value: input.planningMode ?? 'Not set' },
    ],
  }
}

export function priorityFromTask(input: TaskPriorityInput): PriorityItem {
  const result = taskPriorityScore(input)
  const priority = levelFromScore(result.score)
  const deadlineText = input.due || 'Unknown deadline'
  const why = input.dueAt == null
    ? 'The deadline still needs review, so Tempo is keeping urgency conservative until you confirm it.'
    : priority === 'Critical' || priority === 'High'
      ? 'A close deadline and the task’s impact make this worth protecting in the available schedule.'
      : 'Tempo is balancing deadline proximity, effort, impact, and the time available today.'
  return {
    id: input.id,
    title: input.title,
    score: result.score,
    priority,
    due: deadlineText,
    dueAt: input.dueAt,
    time: input.effort || 'Effort needs review',
    category: input.category,
    why,
    whyFactors: result.factors,
    done: false,
    sourceType: 'capture',
    sourceId: input.id,
  }
}

function followUpAt(app: Application): number | null {
  if (!app.followUpDate) return null
  const parsed = parseDateText(app.followUpDate)?.at
  if (parsed != null) return parsed
  const fallback = Date.parse(app.followUpDate)
  return Number.isNaN(fallback) ? null : fallback
}

export function priorityFromApplication({ app, availableMinutes, planningMode = null }: ApplicationPriorityInput): PriorityItem {
  const deadline = deadlinePressure(app.deadlineAt)
  const remainingItems = Math.max(0, app.questions.length - app.submittedItems.length)
  const effort = effortPressure(remainingItems ? `${Math.max(15, remainingItems * 15)}m` : app.status === 'In Progress' ? '30m' : '', availableMinutes)
  const followUp = followUpAt(app)
  const followUpPressure = followUp != null && followUp <= Date.now() + 48 * 3600000 ? 12 : 0
  const statusImpact = STATUS_IMPACT[app.status]
  const incompleteBoost = app.status !== 'Applied' && app.status !== 'Offer' && app.status !== 'Rejected' ? Math.min(12, remainingItems * 3) : 0
  const score = clampScore(deadline.score * 0.56 + statusImpact + effort.score + incompleteBoost + followUpPressure + planningModeAdjustment(planningMode))
  const priority = levelFromScore(score)
  const waiting = app.status === 'Applied' || app.status === 'Offer'
  const title = `${app.company || 'Application needs review'}${app.role ? ` · ${app.role}` : ''}`
  return {
    id: `app-${app.id}`,
    title,
    score,
    priority,
    due: app.deadline ? `Deadline ${app.deadline}` : 'Unknown deadline',
    dueAt: app.deadlineAt,
    time: waiting ? (followUp ? 'Follow up' : 'Awaiting response') : remainingItems ? `${remainingItems} item${remainingItems === 1 ? '' : 's'} left` : 'Review application',
    category: 'Career',
    why: app.deadlineAt == null
      ? 'This application needs a confirmed deadline before Tempo can assess urgency accurately.'
      : waiting
        ? 'The application is already submitted, so action priority is lower unless a follow-up is due.'
        : 'Tempo is weighing the deadline, application status, remaining effort, career consequence, and available time.',
    whyFactors: [
      { label: 'Deadline proximity', value: app.deadlineAt == null ? 'Unknown deadline' : deadline.label },
      { label: 'Application status', value: app.status },
      { label: 'Effort remaining', value: remainingItems ? `${remainingItems} item${remainingItems === 1 ? '' : 's'} left` : 'No missing items detected' },
      { label: 'Available time', value: availableMinutes == null ? 'Not set' : `${availableMinutes}m usable` },
      { label: 'Career consequence', value: waiting ? 'Follow-up matters later' : 'Opportunity may be lost if unfinished' },
      { label: 'Planning mode', value: planningMode ?? 'Not set' },
    ],
    done: false,
    sourceType: 'application',
    sourceId: app.id,
  }
}

function overlaps(start: number, end: number, block: PlanBlock): boolean {
  const blockStart = parseTimeToMinutes(block.time)
  const blockEnd = blockStart + getBlockDurationMinutes(block)
  return start < blockEnd && end > blockStart
}

function canPlace(block: PlanBlock, time: string, placed: PlanBlock[]): boolean {
  const start = parseTimeToMinutes(time)
  const end = start + getBlockDurationMinutes(block)
  return !placed.some((other) => other.day === block.day && overlaps(start, end, other))
}

function virtualBlock(block: PlanBlock, day: PlanBlock['day'], time: string): PlanBlock {
  return { ...block, day, time }
}

function priorityForBlock(block: PlanBlock, priorities: PriorityItem[]): Priority {
  if (block.priority) return block.priority
  const linked = priorities.find((p) => p.sourceId === block.sourceId)
  return linked?.priority ?? 'Medium'
}

function changeReason(block: PlanBlock, tag: PlanSuggestionTag): string {
  if (tag === 'keep') return 'Fixed commitment'
  if (tag === 'protect') return 'Deadline-linked or high-impact work'
  if (tag === 'move') return 'Flexible block moved to avoid conflict and protect higher-impact work'
  return 'Kept with minimal change'
}

type PlanSuggestionTag = 'keep' | 'protect' | 'move' | 'normal'

export function buildFixSuggestion(
  dayBlocks: PlanBlock[],
  reason: string,
  priorities: PriorityItem[],
  planningMode: PlanningMode | null = null,
  allBlocks: PlanBlock[] = dayBlocks
): FixSuggestion {
  const unfinished = dayBlocks.filter((block) => !block.done)
  const fixed = unfinished.filter((block) => block.fixed || !block.canMove || block.flexibility === 'fixed' || block.tag === 'keep')
  const flexible = unfinished.filter((block) => !fixed.includes(block))
  const linkedPriority = (block: PlanBlock) => priorities.find((priority) => priority.sourceId === block.sourceId)
  const protectedBlocks = flexible
    .filter((block) => priorityRank(priorityForBlock(block, priorities)) <= priorityRank('High'))
    .sort((a, b) => priorityRank(priorityForBlock(a, priorities)) - priorityRank(priorityForBlock(b, priorities)))
  const normalBlocks = flexible.filter((block) => !protectedBlocks.includes(block)).sort((a, b) => a.time.localeCompare(b.time))
  const placed: PlanBlock[] = fixed.map((block) => ({ ...block }))
  const changes: FixSuggestion['changes'] = fixed.map((block) => ({ blockId: block.id, tag: 'keep', reason: changeReason(block, 'keep') }))

  const placeProtected = (block: PlanBlock) => {
    const priority = linkedPriority(block)?.priority ?? block.priority
    if (canPlace(block, block.time, placed) && !(block.day === dayBlocks[0]?.day && parseTimeToMinutes(block.time) < new Date().getHours() * 60)) {
      placed.push({ ...block })
      changes.push({ blockId: block.id, tag: 'protect', reason: changeReason(block, 'protect') })
      return
    }
    const slot = findNextAvailableSlot({ blocks: [...allBlocks.filter((candidate) => candidate.id !== block.id), ...placed], durationMinutes: getBlockDurationMinutes(block), priority, planningMode, preferredDay: block.day })
    if (slot) {
      const next = virtualBlock(block, slot.day, slot.time)
      placed.push(next)
      changes.push({ blockId: block.id, tag: 'protect', day: slot.day, time: slot.time, reason: changeReason(block, 'protect') })
    } else {
      placed.push({ ...block })
      changes.push({ blockId: block.id, tag: 'protect', reason: 'Protected in place; no feasible alternate slot was found' })
    }
  }

  protectedBlocks.forEach(placeProtected)

  normalBlocks.forEach((block) => {
    const shouldMove = block.flexibility === 'flexible' || block.kind === 'personal' || block.kind === 'break' || !canPlace(block, block.time, placed)
    if (!shouldMove && canPlace(block, block.time, placed)) {
      placed.push({ ...block })
      changes.push({ blockId: block.id, tag: 'normal', reason: changeReason(block, 'normal') })
      return
    }
    const slot = findNextAvailableSlot({ blocks: [...allBlocks.filter((candidate) => candidate.id !== block.id), ...placed], durationMinutes: getBlockDurationMinutes(block), priority: priorityForBlock(block, priorities), planningMode, preferredDay: block.day })
    if (slot && (slot.day !== block.day || slot.time !== block.time)) {
      const next = virtualBlock(block, slot.day, slot.time)
      placed.push(next)
      changes.push({ blockId: block.id, tag: 'move', day: slot.day, time: slot.time, reason: changeReason(block, 'move') })
    } else {
      placed.push({ ...block })
      changes.push({ blockId: block.id, tag: 'normal', reason: 'No better feasible slot found' })
    }
  })

  return { id: makeId('fix'), reason, changes }
}
