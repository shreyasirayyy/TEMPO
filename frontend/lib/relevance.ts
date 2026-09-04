import type { Application, Course, LearningTrack, PlanBlock } from './types'
import { computeAttendancePct, computeNeedToAttend, isTargetUnreachable } from './attendance'
import { isWithinDays, parseDateText, todayKey } from './date'

export function getRelevantApplications(applications: Application[], now = new Date()): Application[] {
  return applications
    .filter((app) => {
      const deadlineSoon = isWithinDays(app.deadlineAt, 7, now)
      const incomplete = ['Needs Review', 'Form Started', 'In Progress'].includes(app.status)
      const followUpAt = app.followUpDate ? parseDateText(app.followUpDate, now)?.at ?? null : null
      const followUpSoon = isWithinDays(followUpAt, 7, now)
      return deadlineSoon || incomplete || followUpSoon
    })
    .sort((a, b) => {
      const aDeadline = a.deadlineAt ?? Infinity
      const bDeadline = b.deadlineAt ?? Infinity
      if (aDeadline !== bDeadline) return aDeadline - bDeadline
      return a.company.localeCompare(b.company)
    })
    .slice(0, 3)
}

export type AttendanceRisk = Course & { pct: number; classesLeft: number; needToAttend: number; unreachable: boolean }

export function getAttendanceRisk(courses: Course[]): AttendanceRisk | null {
  return courses
    .map((course) => {
      const pct = computeAttendancePct(course.attendedClasses, course.heldClasses)
      const classesLeft = Math.max(0, course.totalClasses - course.heldClasses)
      const needToAttend = computeNeedToAttend(course.attendedClasses, course.heldClasses, classesLeft, course.target)
      const unreachable = isTargetUnreachable(course.attendedClasses, course.heldClasses, classesLeft, course.target)
      return { ...course, pct, classesLeft, needToAttend, unreachable }
    })
    .filter((course) => course.pct < course.target || course.needToAttend > 0 || course.unreachable)
    .sort((a, b) => (a.unreachable === b.unreachable ? a.pct - b.pct : a.unreachable ? -1 : 1))[0] ?? null
}

export function selectLearningTrack(learning: LearningTrack[], plan: PlanBlock[]): LearningTrack | null {
  if (!learning.length) return null
  const scheduledIds = new Set(plan.filter((block) => block.day === todayKey() && !block.done && block.kind === 'learning').map((block) => block.sourceId))
  return [...learning].sort((a, b) => {
    const aScheduled = scheduledIds.has(a.id) ? 1 : 0
    const bScheduled = scheduledIds.has(b.id) ? 1 : 0
    if (aScheduled !== bScheduled) return bScheduled - aScheduled
    const aToday = /today/i.test(a.nextSession) ? 1 : 0
    const bToday = /today/i.test(b.nextSession) ? 1 : 0
    if (aToday !== bToday) return bToday - aToday
    return a.progress - b.progress
  })[0]
}
