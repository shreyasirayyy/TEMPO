'use client'

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { seedApplications, seedCourses, seedGoals, seedLearning, seedPlan, seedPriorities } from './data'
import { makeId } from './id'
import { priorityFromApplication, priorityFromTask, buildFixSuggestion } from './ai/priorityEngine'
import { buildApplicationFromExtraction } from './ai/applicationParser'
import { contextForTask } from './contextEngine'
import { todayKey, formatDateLabel, parseDateText } from './date'
import { computeUsableMinutesToday, getBlockDurationMinutes, getPlanningWindow, parseTimeToMinutes } from './planTime'
import { suggestTimeForApplication, suggestTimeForTask } from './scheduling'
import { getCurrentSession, getProfile } from './services/auth'
import { fetchTempoData, saveTempoData } from './services/tempoData'
import type {
  Application,
  CaptureItem,
  CaptureType,
  Course,
  Extracted,
  FixSuggestion,
  FocusContext,
  Goal,
  LearningTrack,
  PlanBlock,
  PlanningMode,
  PlanningWindow,
  PriorityItem,
  Theme,
  FocusSessionRecord,
  Subject,
  Assignment,
  Exam,
  AttendanceRecord,
  DailySnapshot,
} from './types'

export type AuthState = {
  isAuthenticated: boolean
  userId?: string
  hasCompletedOnboarding: boolean
  hasSelectedPlanningMode: boolean
  email?: string
  provider?: 'google' | 'apple' | 'email'
}

export type TempoState = {
  priorities: PriorityItem[]
  applications: Application[]
  plan: PlanBlock[]
  captures: CaptureItem[]
  learning: LearningTrack[]
  goals: Goal[]
  courses: Course[]
  subjects: Subject[]
  assignments: Assignment[]
  exams: Exam[]
  attendance: AttendanceRecord[]
  focusMinutesToday: number
  focusStreak: number
  focusSessions: FocusSessionRecord[]
  lastFocusDate?: string
  focusContext: FocusContext | null
  activeFixSuggestion: FixSuggestion | null
  planNotice: string | null
  planningMode: PlanningMode | null
  theme: Theme
  planningWindow: PlanningWindow
  userName: string
  auth: AuthState
  hydrated: boolean
  dataError: string | null
  dailySnapshots: DailySnapshot[]
}

const initialState: TempoState = {
  priorities: seedPriorities,
  applications: seedApplications,
  plan: seedPlan,
  captures: [],
  learning: seedLearning,
  goals: seedGoals,
  courses: seedCourses,
  subjects: [],
  assignments: [],
  exams: [],
  attendance: [],
  focusMinutesToday: 0,
  focusStreak: 0,
  focusSessions: [],
  focusContext: null,
  activeFixSuggestion: null,
  planNotice: null,
  planningMode: null,
  theme: 'light',
  planningWindow: { start: '08:00', end: '23:00' },
  userName: '',
  auth: { isAuthenticated: false, hasCompletedOnboarding: false, hasSelectedPlanningMode: false },
  hydrated: false,
  dataError: null,
  dailySnapshots: [],
}

export const STORAGE_KEY = 'tempo-state-v3'
export const SESSION_KEY = 'tempo-session-v1'

type ApplicationPatch = Partial<Omit<Application, 'id' | 'timeline'>>

type Action =
  | { type: 'HYDRATE'; payload: Partial<TempoState> }
  | { type: 'TOGGLE_PRIORITY_DONE'; id: string }
  | { type: 'TOGGLE_BLOCK_DONE'; id: string }
  | { type: 'MOVE_BLOCK'; id: string; time: string; day?: PlanBlock['day'] }
  | { type: 'ADD_PLAN_BLOCK'; block: PlanBlock }
  | { type: 'UPDATE_PLAN_BLOCK'; id: string; patch: Partial<PlanBlock> }
  | { type: 'DELETE_PLAN_BLOCK'; id: string }
  | { type: 'CLEAR_PLAN_NOTICE' }
  | { type: 'ADD_CAPTURE'; item: CaptureItem }
  | { type: 'UPDATE_CAPTURE_EXTRACTION'; id: string; extracted: Extracted; status?: CaptureItem['status'] }
  | { type: 'CONFIRM_CAPTURE'; id: string; edited?: Partial<Extracted> }
  | { type: 'DISMISS_CAPTURE'; id: string }
  | { type: 'ADD_APPLICATION_FOLLOWUP'; id: string; date: string; note?: string }
  | { type: 'ADD_APPLICATION'; application: Application }
  | { type: 'DELETE_APPLICATION'; id: string }
  | { type: 'UPDATE_APPLICATION_STATUS'; id: string; status: Application['status'] }
  | { type: 'UPDATE_APPLICATION'; id: string; patch: ApplicationPatch }
  | { type: 'REQUEST_FIX_MY_DAY'; reason: string }
  | { type: 'DISMISS_FIX_SUGGESTION' }
  | { type: 'ACCEPT_FIX_SUGGESTION' }
  | { type: 'SET_FOCUS_CONTEXT'; context: FocusContext | null }
  | { type: 'COMPLETE_FOCUS_SESSION'; minutes: number; context?: FocusContext | null }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'ADD_FOCUS_MINUTES'; minutes: number }
  | { type: 'UPDATE_LEARNING_PROGRESS'; id: string; progress: number }
  | { type: 'ADD_LEARNING_TRACK'; track: LearningTrack }
  | { type: 'UPDATE_LEARNING_TRACK'; id: string; patch: Partial<LearningTrack> }
  | { type: 'DELETE_LEARNING_TRACK'; id: string }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'UPDATE_COURSE'; id: string; patch: Partial<Course> }
  | { type: 'DELETE_COURSE'; id: string }
  | { type: 'ADD_SUBJECT'; subject: Subject }
  | { type: 'UPDATE_SUBJECT'; id: string; patch: Partial<Subject> }
  | { type: 'DELETE_SUBJECT'; id: string }
  | { type: 'ADD_ASSIGNMENT'; assignment: Assignment }
  | { type: 'UPDATE_ASSIGNMENT'; id: string; patch: Partial<Assignment> }
  | { type: 'DELETE_ASSIGNMENT'; id: string }
  | { type: 'ADD_EXAM'; exam: Exam }
  | { type: 'UPDATE_EXAM'; id: string; patch: Partial<Exam> }
  | { type: 'DELETE_EXAM'; id: string }
  | { type: 'SET_ATTENDANCE_RECORD'; record: AttendanceRecord }
  | { type: 'DELETE_ATTENDANCE_RECORD'; id: string }
  | { type: 'ADD_GOAL'; goal: Goal }
  | { type: 'UPDATE_GOAL'; id: string; patch: Partial<Goal> }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'SET_PLANNING_MODE'; mode: NonNullable<TempoState['planningMode']> }
  | { type: 'RECORD_DAILY_SNAPSHOT'; snapshot: DailySnapshot }
  | { type: 'IMPORT_CALENDAR_EVENTS'; events: { day: PlanBlock['day']; time: string; title: string; durationMinutes: number }[] }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'LOGIN'; name?: string; email?: string; provider: 'google' | 'apple' | 'email' }
  | { type: 'SET_AUTH_SESSION'; isAuthenticated: boolean; userId?: string; email?: string; provider?: 'google' | 'apple' | 'email'; name?: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_DATA_ERROR'; message: string | null }

function isPriority(value: unknown): value is PriorityItem['priority'] {
  return value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low'
}

function normalizeState(payload: Partial<TempoState>): Partial<TempoState> {
  const priorities = Array.isArray(payload.priorities)
    ? payload.priorities.map((item) => ({
        ...item,
        score: typeof item.score === 'number' ? item.score : item.priority === 'High' ? 65 : item.priority === 'Low' ? 20 : 45,
        priority: isPriority(item.priority) ? item.priority : 'Medium',
        dueAt: typeof item.dueAt === 'number' && Number.isFinite(item.dueAt) ? item.dueAt : null,
        due: item.due || 'Unknown deadline',
        whyFactors: Array.isArray(item.whyFactors) ? item.whyFactors : [],
      }))
    : undefined
  const plan = Array.isArray(payload.plan)
    ? payload.plan.map((block) => {
        const fixed = block.fixed ?? block.tag === 'keep'
        const sourceType = block.sourceType ?? (block.sourceId ? 'manual' : undefined)
        return {
          ...block,
          durationMinutes: block.durationMinutes ?? undefined,
          kind: block.kind ?? 'task',
          priority: isPriority(block.priority) ? block.priority : 'Medium',
          fixed,
          flexibility: block.flexibility ?? (fixed ? 'fixed' : 'adjustable'),
          canMove: block.canMove ?? !fixed,
          sourceType,
        }
      })
    : undefined
  const applications = Array.isArray(payload.applications)
    ? payload.applications.map((app) => ({
        ...app,
        deadlineAt: typeof app.deadlineAt === 'number' && Number.isFinite(app.deadlineAt) ? app.deadlineAt : null,
        timeline: Array.isArray(app.timeline) ? app.timeline : [],
        questions: Array.isArray(app.questions) ? app.questions : [],
        submittedItems: Array.isArray(app.submittedItems) ? app.submittedItems : [],
      }))
    : undefined
  const next: Partial<TempoState> = {
    ...payload,
    focusContext: payload.focusContext ?? null,
    planningMode: payload.planningMode === 'Pressure' || payload.planningMode === 'Gentle' ? payload.planningMode : null,
    theme: payload.theme === 'dark' ? 'dark' : 'light',
    planningWindow: payload.planningWindow ?? initialState.planningWindow,
    dailySnapshots: Array.isArray(payload.dailySnapshots) ? payload.dailySnapshots : initialState.dailySnapshots,
  }
  if (priorities) next.priorities = priorities
  if (plan) next.plan = plan
  if (applications) next.applications = applications
  return next
}

function todayStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function appendTimeline(app: Application, label: string, note?: string): Application {
  return { ...app, timeline: [...app.timeline, { id: makeId('t'), label, date: formatDateLabel(Date.now(), false), note }] }
}

function hasOverlap(candidate: PlanBlock, plan: PlanBlock[]): boolean {
  const start = parseTimeToMinutes(candidate.time)
  const end = start + getBlockDurationMinutes(candidate)
  return plan.some((block) => {
    if (block.id === candidate.id || block.day !== candidate.day || block.done) return false
    const blockStart = parseTimeToMinutes(block.time)
    const blockEnd = blockStart + getBlockDurationMinutes(block)
    return start < blockEnd && end > blockStart
  })
}

function isValidPlanTime(time: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
}

function withinPlanningWindow(time: string, duration: number, planningWindow: PlanningWindow): boolean {
  const window = getPlanningWindow(planningWindow)
  const start = parseTimeToMinutes(time)
  return start >= window.start && start + duration <= window.end
}

function refreshApplicationPriority(state: TempoState, app: Application): PriorityItem {
  const availableMinutes = computeUsableMinutesToday(state.plan.filter((block) => block.day === todayKey()), new Date(), state.planningWindow)
  return priorityFromApplication({ app, availableMinutes, planningMode: state.planningMode })
}

function updateLinkedPriority(priorities: PriorityItem[], next: PriorityItem): PriorityItem[] {
  const index = priorities.findIndex((priority) => priority.id === next.id || (priority.sourceType === next.sourceType && priority.sourceId === next.sourceId))
  if (index < 0) return [next, ...priorities]
  return priorities.map((priority, currentIndex) => (currentIndex === index ? next : priority))
}

function updateLinkedPlanPriority(plan: PlanBlock[], sourceId: string, priority: PriorityItem['priority']): PlanBlock[] {
  return plan.map((block) => block.sourceId === sourceId ? { ...block, priority } : block)
}

// §20 central loop: decides whether a just-confirmed capture is significant
// enough to auto-open a Fix My Day suggestion, rather than only ever firing
// from the manual button. Deliberately conservative -- only Critical-priority
// items, and only when today's plan actually has more than one block to
// weigh against (an empty day has nothing to protect or move).
function autoFixSuggestionFor(priority: PriorityItem, itemTitle: string, plan: PlanBlock[], priorities: PriorityItem[], planningMode: PlanningMode | null): FixSuggestion | null {
  if (priority.priority !== 'Critical') return null
  const todayBlocks = plan.filter((block) => block.day === todayKey())
  if (todayBlocks.length <= 1) return null
  const reason = `"${itemTitle}" just became Critical — checking today's plan for a feasible slot.`
  return buildFixSuggestion(todayBlocks, reason, priorities, planningMode, plan)
}

function applyFocusCompletion(state: TempoState, minutes: number, context: FocusContext | null): TempoState {  const safeMinutes = Math.max(0, Math.round(minutes))
  if (!safeMinutes) return state
  const today = todayStamp()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const streak = state.lastFocusDate === today ? state.focusStreak : state.lastFocusDate === yesterday.toISOString().slice(0, 10) ? state.focusStreak + 1 : 1
  let plan = state.plan
  let priorities = state.priorities
  let learning = state.learning

  if (context) {
    const relatedBlock = plan.find((block) => block.id === context.sourceId || (context.sourceId && block.sourceId === context.sourceId))
    if (relatedBlock) {
      const focusedMinutes = (relatedBlock.focusedMinutes ?? 0) + safeMinutes
      const done = focusedMinutes >= getBlockDurationMinutes(relatedBlock)
      const updatedBlock = { ...relatedBlock, focusedMinutes, done }
      plan = plan.map((block) => (block.id === relatedBlock.id ? updatedBlock : block))
      if (done && relatedBlock.sourceId) priorities = priorities.map((priority) => (priority.sourceId === relatedBlock.sourceId ? { ...priority, done: true } : priority))
    }
    if (context.kind === 'learning' && context.sourceId) {
      learning = learning.map((track) => track.id === context.sourceId ? { ...track, progress: Math.min(100, track.progress + Math.max(1, Math.round(safeMinutes / 25) * 5)), minutesThisWeek: track.minutesThisWeek + safeMinutes, nextSession: 'Continue next session' } : track)
    }
  }

  const focusSessions = [...state.focusSessions, { id: makeId('focus'), minutes: safeMinutes, title: context?.title, sourceType: context?.kind, sourceId: context?.sourceId, completedAt: new Date().toISOString() }]
  return { ...state, plan, priorities, learning, focusSessions, focusMinutesToday: state.focusMinutesToday + safeMinutes, focusStreak: streak, lastFocusDate: today, focusContext: context ?? state.focusContext }
}

function reducer(state: TempoState, action: Action): TempoState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...normalizeState(action.payload), hydrated: true }

    case 'TOGGLE_PRIORITY_DONE': {
      const priorities = state.priorities.map((priority) => priority.id === action.id ? { ...priority, done: !priority.done } : priority)
      const toggled = priorities.find((priority) => priority.id === action.id)
      const plan = toggled?.sourceId ? state.plan.map((block) => block.sourceId === toggled.sourceId ? { ...block, done: toggled.done } : block) : state.plan
      return { ...state, priorities, plan }
    }

    case 'TOGGLE_BLOCK_DONE': {
      const plan = state.plan.map((block) => (block.id === action.id ? { ...block, done: !block.done } : block))
      const toggled = plan.find((block) => block.id === action.id)
      const priorities = toggled?.sourceId ? state.priorities.map((priority) => priority.sourceId === toggled.sourceId ? { ...priority, done: toggled.done } : priority) : state.priorities
      return { ...state, plan, priorities }
    }

    case 'MOVE_BLOCK': {
      const match = action.time.match(/^(\d{1,2}):(\d{2})$/)
      const time = match && Number(match[1]) <= 23 && Number(match[2]) <= 59 ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : null
      if (!time) return state
      const existing = state.plan.find((block) => block.id === action.id)
      if (!existing) return state
      if (existing.fixed || !existing.canMove || existing.flexibility === 'fixed') return { ...state, planNotice: 'This is a fixed commitment and cannot be moved.' }
      const candidate = { ...existing, time, day: action.day ?? existing.day, tag: 'move' as const }
      if (!withinPlanningWindow(candidate.time, getBlockDurationMinutes(candidate), state.planningWindow)) return { ...state, planNotice: `That move falls outside your planning window (${state.planningWindow.start}–${state.planningWindow.end}).` }
      if (hasOverlap(candidate, state.plan)) return { ...state, planNotice: 'That move conflicts with another planned block. Choose an open interval.' }
      return { ...state, plan: state.plan.map((block) => block.id === action.id ? candidate : block), planNotice: null }
    }

    case 'CLEAR_PLAN_NOTICE': return { ...state, planNotice: null }

    case 'ADD_PLAN_BLOCK': {
      const block = action.block
      if (!block.title.trim() || getBlockDurationMinutes(block) <= 0 || !isValidPlanTime(block.time) || !withinPlanningWindow(block.time, getBlockDurationMinutes(block), state.planningWindow) || hasOverlap(block, state.plan)) return state
      return { ...state, plan: [...state.plan, block] }
    }

    case 'UPDATE_PLAN_BLOCK': {
      const existing = state.plan.find((block) => block.id === action.id)
      if (!existing) return state
      const next = { ...existing, ...action.patch }
      if (!next.title.trim() || getBlockDurationMinutes(next) <= 0 || !isValidPlanTime(next.time) || !withinPlanningWindow(next.time, getBlockDurationMinutes(next), state.planningWindow) || hasOverlap(next, state.plan)) return state
      return { ...state, plan: state.plan.map((block) => block.id === action.id ? next : block) }
    }

    case 'DELETE_PLAN_BLOCK':
      return { ...state, plan: state.plan.filter((block) => block.id !== action.id) }

    case 'ADD_CAPTURE':
      return { ...state, captures: [action.item, ...state.captures] }

    case 'UPDATE_CAPTURE_EXTRACTION':
      return { ...state, captures: state.captures.map((capture) => capture.id === action.id ? { ...capture, extracted: action.extracted, status: action.status ?? 'pending' } : capture) }

    case 'DISMISS_CAPTURE':
      return { ...state, captures: state.captures.map((capture) => capture.id === action.id ? { ...capture, status: 'dismissed' } : capture) }

    case 'CONFIRM_CAPTURE': {
      const capture = state.captures.find((item) => item.id === action.id)
      if (!capture || !capture.extracted) return state
      const extracted = { ...capture.extracted, ...action.edited } as Extracted
      const captures = state.captures.map((item) => item.id === action.id ? { ...item, status: 'confirmed' as const, extracted } : item)
      const availableMinutes = computeUsableMinutesToday(state.plan.filter((block) => block.day === todayKey()), new Date(), state.planningWindow)

      if (extracted.kind === 'application') {
        const app = buildApplicationFromExtraction(extracted, capture)
        if (app.status === 'Rejected') return { ...state, captures, applications: [app, ...state.applications] }
        const priority = priorityFromApplication({ app, availableMinutes, planningMode: state.planningMode })
        const slot = suggestTimeForApplication({ application: app, priority: priority.priority, plan: state.plan, planningMode: state.planningMode })
        const plan: PlanBlock[] = slot ? [...state.plan, { id: makeId('blk'), day: slot.day, time: slot.time, title: `${app.company || 'Application'} — review`, duration: `${slot.minutes}m`, durationMinutes: slot.minutes, tag: 'new', done: false, kind: 'application', priority: priority.priority, fixed: false, flexibility: 'adjustable', canMove: true, sourceType: 'application', sourceId: app.id }] : state.plan
        // §20 central loop: "life changes → Fix My Day adapts" -- when a
        // freshly captured item lands as Critical and today already has a
        // plan to rebalance around, offer the adaptive suggestion right
        // away instead of waiting for the user to notice and press the
        // manual "Fix My Day" button.
        const activeFixSuggestion = autoFixSuggestionFor(priority, app.company || 'This application', plan, [priority, ...state.priorities], state.planningMode)
        return { ...state, captures, applications: [app, ...state.applications], priorities: [priority, ...state.priorities], plan, activeFixSuggestion: activeFixSuggestion ?? state.activeFixSuggestion }
      }

      const sourceId = makeId('task')
      const context = contextForTask(extracted.category, extracted.title, state.courses, state.goals, state.learning)
      const priority = priorityFromTask({ id: sourceId, title: extracted.title, category: extracted.category, due: extracted.due, dueAt: extracted.dueAt, effort: extracted.effort, availableMinutes, planningMode: state.planningMode, context })
      const slot = suggestTimeForTask({ title: extracted.title, duration: extracted.effort, priority: priority.priority, plan: state.plan, planningMode: state.planningMode })
      const suggestedDuration = Math.max(15, slot?.minutes ?? 30)
      const plan: PlanBlock[] = slot ? [...state.plan, { id: makeId('blk'), day: slot.day, time: slot.time, title: extracted.title, duration: extracted.effort || `${suggestedDuration}m suggested`, durationMinutes: extracted.effort ? suggestedDuration : undefined, tag: 'new', done: false, kind: extracted.category === 'Learning' ? 'learning' : 'task', priority: priority.priority, fixed: false, flexibility: 'adjustable', canMove: true, sourceType: 'capture', sourceId }] : state.plan
      const activeFixSuggestion = autoFixSuggestionFor(priority, extracted.title, plan, [priority, ...state.priorities], state.planningMode)
      return { ...state, captures, priorities: [priority, ...state.priorities], plan, activeFixSuggestion: activeFixSuggestion ?? state.activeFixSuggestion }
    }

    case 'ADD_APPLICATION_FOLLOWUP': {
      const applications = state.applications.map((app) => app.id === action.id ? appendTimeline({ ...app, followUpDate: action.date }, 'Follow-up scheduled', action.note) : app)
      const updatedApp = applications.find((app) => app.id === action.id)
      if (!updatedApp) return state
      const nextPriority = refreshApplicationPriority(state, updatedApp)
      return { ...state, applications, priorities: updateLinkedPriority(state.priorities, nextPriority), plan: updateLinkedPlanPriority(state.plan, updatedApp.id, nextPriority.priority) }
    }

    case 'ADD_APPLICATION': {
      if (action.application.status === 'Rejected') return { ...state, applications: [action.application, ...state.applications] }
      const availableMinutes = computeUsableMinutesToday(state.plan.filter((block) => block.day === todayKey()), new Date(), state.planningWindow)
      const priority = priorityFromApplication({ app: action.application, availableMinutes, planningMode: state.planningMode })
      const slot = suggestTimeForApplication({ application: action.application, priority: priority.priority, plan: state.plan, planningMode: state.planningMode })
      const plan = slot ? [...state.plan, { id: makeId('blk'), day: slot.day, time: slot.time, title: `${action.application.company || 'Application'} — review`, duration: `${slot.minutes}m`, durationMinutes: slot.minutes, tag: 'new' as const, done: false, kind: 'application' as const, priority: priority.priority, fixed: false, flexibility: 'adjustable' as const, canMove: true, sourceType: 'application' as const, sourceId: action.application.id }] : state.plan
      return { ...state, applications: [action.application, ...state.applications], priorities: [priority, ...state.priorities], plan }
    }

    case 'DELETE_APPLICATION': {
      if (!state.applications.some((app) => app.id === action.id)) return state
      return {
        ...state,
        applications: state.applications.filter((app) => app.id !== action.id),
        priorities: state.priorities.filter((priority) => !(priority.sourceType === 'application' && priority.sourceId === action.id)),
        plan: state.plan.filter((block) => !(block.sourceType === 'application' && block.sourceId === action.id)),
      }
    }

    case 'UPDATE_APPLICATION_STATUS': {
      const applications = state.applications.map((app) => app.id === action.id && app.status !== action.status ? appendTimeline({ ...app, status: action.status }, `Status → ${action.status}`) : app)
      const updatedApp = applications.find((app) => app.id === action.id)
      if (!updatedApp) return state
      if (updatedApp.status === 'Rejected') return { ...state, applications, priorities: state.priorities.filter((priority) => !(priority.sourceType === 'application' && priority.sourceId === updatedApp.id)), plan: state.plan.filter((block) => !(block.sourceType === 'application' && block.sourceId === updatedApp.id)) }
      const nextPriority = refreshApplicationPriority(state, updatedApp)
      return { ...state, applications, priorities: updateLinkedPriority(state.priorities, nextPriority), plan: updateLinkedPlanPriority(state.plan, updatedApp.id, nextPriority.priority) }
    }

    case 'UPDATE_APPLICATION': {
      const before = state.applications.find((app) => app.id === action.id)
      if (!before) return state
      const patch = { ...action.patch }
      if ('deadline' in patch) patch.deadlineAt = patch.deadline?.trim() ? parseDateText(patch.deadline)?.at ?? null : null
      let updated = { ...before, ...patch }
      const changedFields = (['company', 'role', 'deadline', 'link', 'notes', 'questions', 'submittedItems', 'appliedOn'] as const).filter((field) => JSON.stringify(before[field]) !== JSON.stringify(updated[field]))
      for (const field of changedFields) updated = appendTimeline(updated, field === 'deadline' ? 'Deadline updated' : field === 'notes' ? 'Notes updated' : `${field} updated`)
      const applications = state.applications.map((app) => app.id === action.id ? updated : app)
      if (updated.status === 'Rejected') return { ...state, applications, priorities: state.priorities.filter((priority) => !(priority.sourceType === 'application' && priority.sourceId === updated.id)), plan: state.plan.filter((block) => !(block.sourceType === 'application' && block.sourceId === updated.id)) }
      const nextPriority = refreshApplicationPriority(state, updated)
      return { ...state, applications, priorities: updateLinkedPriority(state.priorities, nextPriority), plan: updateLinkedPlanPriority(state.plan, updated.id, nextPriority.priority) }
    }

    case 'IMPORT_CALENDAR_EVENTS': {
      // §16 Calendar / external commitments (scoped to .ics file import --
      // see lib/calendarImport.ts). Imported events become fixed,
      // non-movable blocks exactly like a class: Fix My Day and scheduling
      // must protect them, never silently overwrite or duplicate them.
      const existingKeys = new Set(state.plan.filter((b) => b.sourceType === 'external').map((b) => `${b.day}|${b.time}|${b.title}`))
      const additions: PlanBlock[] = action.events
        .filter((event) => !existingKeys.has(`${event.day}|${event.time}|${event.title}`))
        .map((event) => ({
          id: makeId('blk'),
          day: event.day,
          time: event.time,
          title: event.title,
          duration: `${event.durationMinutes}m`,
          durationMinutes: event.durationMinutes,
          tag: 'keep',
          done: false,
          kind: 'class',
          priority: 'Medium',
          fixed: true,
          flexibility: 'fixed',
          canMove: false,
          sourceType: 'external',
        }))
      if (!additions.length) return state
      return { ...state, plan: [...state.plan, ...additions] }
    }

    case 'RECORD_DAILY_SNAPSHOT': {
      const existingIndex = state.dailySnapshots.findIndex((entry) => entry.date === action.snapshot.date)
      if (existingIndex === -1) {
        // Keep a rolling ~60-day window so this never grows unbounded.
        const dailySnapshots = [action.snapshot, ...state.dailySnapshots].slice(0, 60)
        return { ...state, dailySnapshots }
      }
      const current = state.dailySnapshots[existingIndex]
      if (current.focusMinutes === action.snapshot.focusMinutes && current.completedCount === action.snapshot.completedCount && current.postponedCount === action.snapshot.postponedCount && current.overloadedDay === action.snapshot.overloadedDay) {
        return state // no change -- avoid a needless re-render/dispatch loop
      }
      const dailySnapshots = [...state.dailySnapshots]
      dailySnapshots[existingIndex] = action.snapshot
      return { ...state, dailySnapshots }
    }

    case 'REQUEST_FIX_MY_DAY': {
      const todayBlocks = state.plan.filter((block) => block.day === todayKey())
      const suggestion = buildFixSuggestion(todayBlocks, action.reason, state.priorities, state.planningMode, state.plan)
      return { ...state, activeFixSuggestion: suggestion }
    }

    case 'DISMISS_FIX_SUGGESTION':
      return { ...state, activeFixSuggestion: null }

    case 'ACCEPT_FIX_SUGGESTION': {
      if (!state.activeFixSuggestion) return state
      const byId = new Map(state.activeFixSuggestion.changes.map((change) => [change.blockId, change]))
      const plan = state.plan.map((block) => {
        const change = byId.get(block.id)
        if (!change) return block
        return { ...block, tag: change.tag, time: change.time ?? block.time, day: change.day ?? block.day }
      })
      return { ...state, plan, activeFixSuggestion: null }
    }

    case 'SET_FOCUS_CONTEXT':
      return { ...state, focusContext: action.context }

    case 'COMPLETE_FOCUS_SESSION':
      return applyFocusCompletion(state, action.minutes, action.context ?? state.focusContext)

    case 'SET_USER_NAME': return { ...state, userName: action.name.trim() || state.userName }

    case 'ADD_FOCUS_MINUTES':
      return applyFocusCompletion(state, action.minutes, state.focusContext)

    case 'UPDATE_LEARNING_PROGRESS':
      return { ...state, learning: state.learning.map((track) => track.id === action.id ? { ...track, progress: Math.min(100, Math.max(0, action.progress)) } : track) }

    case 'ADD_LEARNING_TRACK': return { ...state, learning: [action.track, ...state.learning] }
    case 'UPDATE_LEARNING_TRACK': return { ...state, learning: state.learning.map((track) => track.id === action.id ? { ...track, ...action.patch } : track) }
    case 'DELETE_LEARNING_TRACK': return { ...state, learning: state.learning.filter((track) => track.id !== action.id), plan: state.plan.filter((block) => !(block.sourceType === 'learning' && block.sourceId === action.id)) }
    case 'ADD_COURSE': return { ...state, courses: [action.course, ...state.courses] }
    case 'UPDATE_COURSE': return { ...state, courses: state.courses.map((course) => course.id === action.id ? { ...course, ...action.patch } : course) }
    case 'DELETE_COURSE': return { ...state, courses: state.courses.filter((course) => course.id !== action.id) }
    case 'ADD_SUBJECT': return { ...state, subjects: [action.subject, ...state.subjects] }
    case 'UPDATE_SUBJECT': return { ...state, subjects: state.subjects.map((subject) => subject.id === action.id ? { ...subject, ...action.patch } : subject) }
    case 'DELETE_SUBJECT': return { ...state, subjects: state.subjects.filter((subject) => subject.id !== action.id) }
    case 'ADD_ASSIGNMENT': return { ...state, assignments: [action.assignment, ...state.assignments] }
    case 'UPDATE_ASSIGNMENT': return { ...state, assignments: state.assignments.map((item) => item.id === action.id ? { ...item, ...action.patch } : item) }
    case 'DELETE_ASSIGNMENT': return { ...state, assignments: state.assignments.filter((item) => item.id !== action.id) }
    case 'ADD_EXAM': return { ...state, exams: [action.exam, ...state.exams] }
    case 'UPDATE_EXAM': return { ...state, exams: state.exams.map((item) => item.id === action.id ? { ...item, ...action.patch } : item) }
    case 'DELETE_EXAM': return { ...state, exams: state.exams.filter((item) => item.id !== action.id) }
    case 'SET_ATTENDANCE_RECORD': {
      // Compare against the record that existed *before* this dispatch so
      // the course's heldClasses/attendedClasses move by exactly the delta
      // this mark represents -- a new day's mark adds a held class, and
      // toggling an existing day's mark only adjusts attendedClasses.
      const priorRecord = state.attendance.find((item) => item.courseId === action.record.courseId && item.classDate === action.record.classDate)
      const attendance = [...state.attendance.filter((item) => item.id !== action.record.id && !(item.courseId === action.record.courseId && item.classDate === action.record.classDate)), action.record]
      const courses = state.courses.map((course) => {
        if (course.id !== action.record.courseId) return course
        if (priorRecord) {
          const attendedDelta = (action.record.attended ? 1 : 0) - (priorRecord.attended ? 1 : 0)
          return { ...course, attendedClasses: Math.max(0, Math.min(course.heldClasses, course.attendedClasses + attendedDelta)) }
        }
        const heldClasses = Math.min(course.totalClasses, course.heldClasses + 1)
        const attendedClasses = action.record.attended ? Math.min(course.attendedClasses + 1, heldClasses) : course.attendedClasses
        return { ...course, heldClasses, attendedClasses }
      })
      return { ...state, attendance, courses }
    }
    case 'DELETE_ATTENDANCE_RECORD': return { ...state, attendance: state.attendance.filter((item) => item.id !== action.id) }
    case 'ADD_GOAL': return { ...state, goals: [action.goal, ...state.goals] }
    case 'UPDATE_GOAL': return { ...state, goals: state.goals.map((goal) => goal.id === action.id ? { ...goal, ...action.patch } : goal) }
    case 'DELETE_GOAL': return { ...state, goals: state.goals.filter((goal) => goal.id !== action.id) }

    case 'SET_PLANNING_MODE':
      return { ...state, planningMode: action.mode, auth: { ...state.auth, hasSelectedPlanningMode: true } }

    case 'SET_THEME':
      return { ...state, theme: action.theme }

    case 'COMPLETE_ONBOARDING':
      return { ...state, auth: { ...state.auth, hasCompletedOnboarding: true } }

    case 'LOGIN':
      return { ...state, userName: action.name?.trim() || state.userName, auth: { ...state.auth, isAuthenticated: true, email: action.email, provider: action.provider } }

    case 'SET_AUTH_SESSION':
      return { ...state, userName: action.name?.trim() || state.userName, auth: { ...state.auth, isAuthenticated: action.isAuthenticated, userId: action.userId, email: action.email, provider: action.provider } }

    case 'LOGOUT':
      // Logging out ends the session only. User data and setup preferences stay
      // local so a returning user does not unexpectedly replay onboarding.
      return { ...state, auth: { ...state.auth, isAuthenticated: false, email: undefined, provider: undefined }, focusContext: null }

    case 'SET_DATA_ERROR': return { ...state, dataError: action.message }

    default:
      return state
  }
}

const StoreContext = createContext<{ state: TempoState; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const remoteUserIdRef = React.useRef<string | null>(null)
  const remoteStateRef = React.useRef<TempoState | null>(null)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true
    async function restore() {
      let payload: Partial<TempoState> = {}
      try { const raw = localStorage.getItem(STORAGE_KEY); payload = raw ? JSON.parse(raw) : {} } catch { payload = {} }
      try {
        const session = await getCurrentSession()
        if (session) {
          payload.auth = { isAuthenticated: true, userId: session.userId, hasCompletedOnboarding: payload.auth?.hasCompletedOnboarding ?? false, hasSelectedPlanningMode: payload.auth?.hasSelectedPlanningMode ?? false, email: session.email, provider: session.provider }
          try {
            const profile = await getProfile(session.userId)
            if (profile) {
              if (profile.name) payload.userName = profile.name
              payload.planningMode = profile.planning_mode === 'Pressure' || profile.planning_mode === 'Gentle' ? profile.planning_mode : null
              payload.theme = profile.theme === 'dark' ? 'dark' : 'light'
              payload.auth = { isAuthenticated: true, userId: session.userId, hasCompletedOnboarding: payload.auth?.hasCompletedOnboarding ?? false, hasSelectedPlanningMode: profile.planning_mode === 'Pressure' || profile.planning_mode === 'Gentle', email: session.email, provider: session.provider }
            }
          } catch { /* Profile migration may not have been run yet. */ }
          try {
            const remote = await fetchTempoData(session.userId)
            payload = { ...payload, ...remote, auth: payload.auth }
            remoteUserIdRef.current = session.userId
          } catch (error) {
            if (mounted) dispatch({ type: 'SET_DATA_ERROR', message: error instanceof Error ? error.message : 'Tempo data could not be loaded from Supabase.' })
          }
        } else payload.auth = { isAuthenticated: false, hasCompletedOnboarding: payload.auth?.hasCompletedOnboarding ?? false, hasSelectedPlanningMode: payload.auth?.hasSelectedPlanningMode ?? false, email: undefined, provider: undefined }
      } catch { payload.auth = { isAuthenticated: false, hasCompletedOnboarding: payload.auth?.hasCompletedOnboarding ?? false, hasSelectedPlanningMode: payload.auth?.hasSelectedPlanningMode ?? false, email: undefined, provider: undefined } }
      if (mounted) dispatch({ type: 'HYDRATE', payload })
    }
    restore()
    // Auth state changes now come from explicit LOGIN/SET_AUTH_SESSION/LOGOUT
    // dispatches in the auth flow itself (see app/auth/page.tsx and
    // lib/services/auth.ts) rather than a live Supabase subscription, since
    // the frontend only holds a bearer token for the backend now.
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!state.hydrated) return
    try {
      const { hydrated: _hydrated, dataError: _dataError, ...persisted } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    } catch {
      // Local-only prototype: storage can be unavailable in private mode.
    }
  }, [state])

  useEffect(() => {
   if (!state.hydrated || !state.auth.isAuthenticated || !remoteUserIdRef.current) return
   if (!remoteStateRef.current) { remoteStateRef.current = state; return }
   if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const userId = remoteUserIdRef.current
   const previous = remoteStateRef.current
   saveTimerRef.current = setTimeout(() => {
    saveTempoData(userId, state, previous)
      .then(() => { remoteStateRef.current = state; dispatch({ type: 'SET_DATA_ERROR', message: null }) })
      .catch((error) => dispatch({ type: 'SET_DATA_ERROR', message: error instanceof Error ? error.message : 'Tempo data could not be saved.' }))
    }, 350)
     return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [state])
  
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  // §17 Insights history -- upsert today's snapshot whenever the underlying
  // numbers change, so Insights can read real day-over-day trends instead
  // of only a live snapshot of current state. Local-only (not synced to
  // Supabase yet); see RemoteTempoData in lib/services/tempoData.ts.
  useEffect(() => {
    if (!state.hydrated) return
    const date = todayKey()
    const completedCount = state.priorities.filter((p) => p.done).length
    const postponedCount = state.priorities.filter((p) => !p.done && p.dueAt != null && p.dueAt < Date.now()).length
    const todayBlockCount = state.plan.filter((block) => block.day === date).length
    dispatch({ type: 'RECORD_DAILY_SNAPSHOT', snapshot: { date, focusMinutes: state.focusMinutesToday, completedCount, postponedCount, overloadedDay: todayBlockCount >= 5 } })
  }, [state.hydrated, state.focusMinutesToday, state.priorities, state.plan])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useTempo() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useTempo must be used within StoreProvider')
  return context
}

export function useActiveCaptures() {
  const { state } = useTempo()
  return state.captures.filter((capture) => capture.status === 'pending' || capture.status === 'processing')
}

export function useUsableMinutesToday() {
  const { state } = useTempo()
  return computeUsableMinutesToday(state.plan, new Date(), state.planningWindow)
}

export function getPlanningWindowForState(state: TempoState) {
  return getPlanningWindow(state.planningWindow)
}

export type { Action, ApplicationPatch, CaptureType }
