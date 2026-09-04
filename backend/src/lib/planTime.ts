import type { DayKey, PlanBlock, PlanningMode, PlanningWindow, Priority } from './types'
import { DAY_KEYS, todayKey } from './date'

export const DEFAULT_PLANNING_WINDOW: PlanningWindow = { start: '08:00', end: '23:00' }

export type TimeInterval = { start: number; end: number }
export type AvailableSlot = { day: DayKey; time: string; endTime: string; minutes: number }

export function parseDurationMinutes(duration: string | undefined): number {
  if (!duration) return 0
  const hMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/i)
  const mMatch = duration.match(/(\d+)\s*m/i)
  const hours = hMatch ? parseFloat(hMatch[1]) : 0
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0
  const total = Math.round(hours * 60 + mins)
  return Number.isFinite(total) && total > 0 ? total : 0
}

export function getBlockDurationMinutes(block: Pick<PlanBlock, 'duration' | 'durationMinutes'>): number {
  return block.durationMinutes && block.durationMinutes > 0 ? block.durationMinutes : parseDurationMinutes(block.duration)
}

export function parseTimeToMinutes(time: string | undefined): number {
  if (!time) return 0
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  if (Number.isNaN(h) || h < 0 || h > 23) return 0
  const minutes = Number.isNaN(m) ? 0 : m
  return Math.max(0, Math.min(23 * 60 + 59, h * 60 + minutes))
}

export function formatMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${h}h ${m}m`
}

export function formatTime(totalMinutes: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function addMinutesToTime(time: string, minutes: number): string {
  return formatTime(parseTimeToMinutes(time) + minutes)
}

export function getPlanningWindow(window: PlanningWindow = DEFAULT_PLANNING_WINDOW): TimeInterval {
  const start = parseTimeToMinutes(window.start)
  const end = parseTimeToMinutes(window.end)
  return { start, end: Math.max(start, end) }
}

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start)
  return sorted.reduce<TimeInterval[]>((merged, interval) => {
    const previous = merged[merged.length - 1]
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end)
    else merged.push({ ...interval })
    return merged
  }, [])
}

export function getCommittedIntervals(
  blocks: PlanBlock[],
  options: { now?: Date; day?: DayKey; planningWindow?: PlanningWindow } = {}
): TimeInterval[] {
  const now = options.now ?? new Date()
  const day = options.day ?? todayKey(now)
  const window = getPlanningWindow(options.planningWindow)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startBoundary = day === todayKey(now) ? Math.max(window.start, nowMinutes) : window.start

  return mergeIntervals(
    blocks
      .filter((block) => block.day === day && !block.done)
      .map((block) => {
        const start = parseTimeToMinutes(block.time)
        const end = start + getBlockDurationMinutes(block)
        return { start: Math.max(start, startBoundary), end: Math.min(end, window.end) }
      })
      .filter((interval) => interval.end > interval.start)
  )
}

export function getFreeIntervals(
  blocks: PlanBlock[],
  options: { now?: Date; day?: DayKey; planningWindow?: PlanningWindow } = {}
): TimeInterval[] {
  const now = options.now ?? new Date()
  const day = options.day ?? todayKey(now)
  const window = getPlanningWindow(options.planningWindow)
  const start = day === todayKey(now) ? Math.max(window.start, now.getHours() * 60 + now.getMinutes()) : window.start
  const end = window.end
  if (end <= start) return []

  const committed = getCommittedIntervals(blocks, { ...options, now, day })
  const free: TimeInterval[] = []
  let cursor = start
  for (const interval of committed) {
    if (interval.start > cursor) free.push({ start: cursor, end: interval.start })
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < end) free.push({ start: cursor, end })
  return free
}

export function getUsableMinutes(
  blocks: PlanBlock[],
  options: { now?: Date; day?: DayKey; planningWindow?: PlanningWindow } = {}
): number {
  return getFreeIntervals(blocks, options).reduce((sum, interval) => sum + Math.max(0, interval.end - interval.start), 0)
}

export function computeUsableMinutesToday(blocksToday: PlanBlock[], now: Date = new Date(), planningWindow = DEFAULT_PLANNING_WINDOW): number {
  return getUsableMinutes(blocksToday, { now, day: todayKey(now), planningWindow })
}

function roundToQuarter(minutes: number): number {
  return Math.ceil(minutes / 15) * 15
}

export function findNextAvailableSlot({
  blocks,
  durationMinutes,
  priority = 'Medium',
  planningMode = null,
  now = new Date(),
  planningWindow = DEFAULT_PLANNING_WINDOW,
  preferredDay,
}: {
  blocks: PlanBlock[]
  durationMinutes: number
  priority?: Priority
  planningMode?: PlanningMode | null
  now?: Date
  planningWindow?: PlanningWindow
  preferredDay?: DayKey
}): AvailableSlot | null {
  const duration = Math.max(15, Math.round(durationMinutes || 30))
  const today = todayKey(now)
  const startOffset = preferredDay ? Math.max(0, (DAY_KEYS.indexOf(preferredDay) - DAY_KEYS.indexOf(today) + 7) % 7) : 0
  const offsets = Array.from({ length: 8 }, (_, index) => (startOffset + index) % 7)
  const gentle = planningMode === 'Gentle'
  const preferredStart = gentle && priority !== 'Critical' && priority !== 'High' ? 9 * 60 : getPlanningWindow(planningWindow).start

  for (const offset of offsets) {
    const day = DAY_KEYS[(DAY_KEYS.indexOf(today) + offset) % 7]
    const free = getFreeIntervals(blocks, { now, day, planningWindow })
    const candidates = free
      .map((interval) => ({ ...interval, start: Math.max(interval.start, preferredStart) }))
      .filter((interval) => interval.end - interval.start >= duration)
    if (!candidates.length) continue
    const chosen = candidates[0]
    const start = roundToQuarter(chosen.start)
    if (start + duration <= chosen.end) {
      return { day, time: formatTime(start), endTime: formatTime(start + duration), minutes: duration }
    }
  }
  return null
}

export function getNextAvailableSlot(options: Parameters<typeof findNextAvailableSlot>[0]): AvailableSlot | null {
  return findNextAvailableSlot(options)
}
