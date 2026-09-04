// ---------------------------------------------------------------------------
// §14 "One connected context engine".
//
// This module is the actual cross-domain wiring the spec describes: it reads
// Academics (attendance) and Career (skill gaps / learning load) state and
// turns them into small, explainable ContextSignals that the deterministic
// Priority Engine can add to a task's score — instead of Academics, Career,
// and Priority living as three systems that never look at each other.
//
// It is intentionally still deterministic (no LLM here): the "connection" is
// structural data flow, and the *reasoning* about why it matters happens in
// priorityEngine.ts's whyFactors, which stays inspectable.
// ---------------------------------------------------------------------------

import type { Course, Goal, ContextSignals } from './types'
import { computeAttendancePct, computeNeedToAttend, isTargetUnreachable } from './attendance'

const DEFAULT_TARGET_PCT = 75
const CLASSES_LEFT_ASSUMPTION = 12 // no term-length field yet; conservative planning horizon

/**
 * Worst-at-risk course: lowest attendance % that is still below target and
 * mathematically recoverable. Used to weight Academic-category tasks that
 * are linked (by course name overlap) or, generically, to explain why
 * academic work is being protected right now.
 */
export function findAttendanceRisk(courses: Course[]): ContextSignals['attendanceRisk'] {
  const risky = courses
    .map((course) => {
      const pct = computeAttendancePct(course.attendedClasses, course.heldClasses)
      const target = course.target || DEFAULT_TARGET_PCT
      const unreachable = isTargetUnreachable(course.attendedClasses, course.heldClasses, CLASSES_LEFT_ASSUMPTION, target)
      const needToAttend = computeNeedToAttend(course.attendedClasses, course.heldClasses, CLASSES_LEFT_ASSUMPTION, target)
      return { course, pct, target, unreachable, needToAttend }
    })
    .filter((entry) => entry.pct < entry.target && !entry.unreachable)
    .sort((a, b) => a.pct - b.pct)

  const worst = risky[0]
  if (!worst) return null
  return { courseName: worst.course.name, pct: worst.pct, target: worst.target, needToAttend: worst.needToAttend }
}

/**
 * Top skill gap across active career goals — the skill Career currently
 * flags as 'Gap' or 'Needs work'. Used to weight Learning-category tasks so
 * a session tied to a real gap outranks one that isn't.
 */
export function findTopSkillGap(goals: Goal[]): ContextSignals['skillGap'] {
  for (const goal of goals) {
    const gap = goal.skills.find((skill) => skill.level === 'Gap' || skill.level === 'Needs work')
    if (gap) return { skill: gap.name, goalTitle: goal.title }
  }
  return null
}

export type LearningTrackLike = { minutesThisWeek: number }

export function summarizeLearningLoad(tracks: LearningTrackLike[]): ContextSignals['learningLoad'] {
  if (!tracks.length) return null
  return { minutesThisWeek: tracks.reduce((sum, track) => sum + track.minutesThisWeek, 0), tracks: tracks.length }
}

/**
 * A task/capture is "linked" to a course when its title mentions the course
 * name — the same generic, metadata-first approach Fix My Day uses (no
 * hardcoded course names). Falls back to the single worst-risk course when
 * no explicit mention is found, since attendance risk is still relevant
 * context for any Academic-category item.
 */
export function contextForTask(category: string, title: string, courses: Course[], goals: Goal[], learningTracks: LearningTrackLike[]): ContextSignals {
  const signals: ContextSignals = {}
  if (category === 'Academic') {
    const lower = title.toLowerCase()
    const mentioned = courses.find((course) => lower.includes(course.name.toLowerCase()))
    signals.attendanceRisk = mentioned
      ? findAttendanceRisk([mentioned]) ?? findAttendanceRisk(courses)
      : findAttendanceRisk(courses)
  }
  if (category === 'Learning' || category === 'Career') {
    signals.skillGap = findTopSkillGap(goals)
    signals.learningLoad = summarizeLearningLoad(learningTracks)
  }
  return signals
}
