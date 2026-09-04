import type { SupabaseClient } from '@supabase/supabase-js'
import { priorityFromApplication, priorityFromTask } from './ai/priorityEngine'
import { todayKey } from './date'
import { computeUsableMinutesToday } from './planTime'

// This is the server-side twin of the frontend's old lib/services/tempoData.ts.
// It used to run in the browser talking to Supabase directly; the row <->
// domain-model mapping is unchanged, it just now runs here and is reached
// over HTTP instead of being called straight from a React component.

type DbRow = Record<string, any>

function jsonArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] }
function timeValue(value: unknown): string { return typeof value === 'string' ? value.slice(0, 5) : '08:00' }

async function rows(client: SupabaseClient, table: string, userId: string) {
  const result = await client.from(table).select('*').eq('user_id', userId)
  if (result.error) throw new Error(`${table}: ${result.error.message}`)
  return (result.data ?? []) as DbRow[]
}

export async function fetchTempoData(client: SupabaseClient, userId: string) {
  const [profileRows, preferenceRows, taskRows, planRows, captureRows, applicationRows, timelineRows, goalRows, skillRows, learningRows, courseRows, subjectRows, attendanceRows, assignmentRows, examRows, focusRows] = await Promise.all([
    rows(client, 'profiles', userId), rows(client, 'user_preferences', userId), rows(client, 'tasks', userId), rows(client, 'plan_blocks', userId),
    rows(client, 'captured_items', userId), rows(client, 'applications', userId), rows(client, 'application_timeline_events', userId), rows(client, 'career_goals', userId),
    rows(client, 'career_skills', userId), rows(client, 'learning_goals', userId), rows(client, 'courses', userId), rows(client, 'subjects', userId), rows(client, 'attendance', userId), rows(client, 'assignments', userId), rows(client, 'exams', userId), rows(client, 'focus_sessions', userId),
  ])
  const profile = profileRows[0] ?? {}
  const preferences = preferenceRows[0] ?? {}
  const timelineByApplication = new Map<string, DbRow[]>()
  timelineRows.forEach((event) => timelineByApplication.set(event.application_id, [...(timelineByApplication.get(event.application_id) ?? []), event]))
  const applications = applicationRows.map((row) => ({ id: row.id, company: row.company ?? '', role: row.role ?? '', status: row.status, deadline: row.deadline ?? '', deadlineAt: row.deadline_at ? Date.parse(row.deadline_at) : null, appliedOn: row.applied_on ?? undefined, link: row.link ?? undefined, questions: jsonArray(row.questions), submittedItems: jsonArray(row.submitted_items), proof: row.proof ?? undefined, notes: row.notes ?? undefined, followUpDate: row.follow_up_date ?? undefined, timeline: (timelineByApplication.get(row.id) ?? []).map((event) => ({ id: event.id, label: event.label, date: event.event_date, note: event.note ?? undefined })) }))
  const plan = planRows.map((row) => ({ id: row.id, day: row.day, time: timeValue(row.start_time), title: row.title, duration: `${row.duration_minutes}m`, durationMinutes: row.duration_minutes, tag: row.tag ?? 'normal', done: !!row.done, kind: row.kind ?? 'task', priority: row.priority ?? 'Medium', fixed: !!row.fixed, flexibility: row.flexibility ?? (row.fixed ? 'fixed' : 'adjustable'), canMove: row.can_move ?? !row.fixed, sourceType: row.source_type, sourceId: row.source_id ?? undefined, notes: row.notes ?? undefined }))
  const captures = captureRows.map((row) => ({ id: row.id, type: row.capture_type, rawText: row.raw_text ?? '', createdAt: Date.parse(row.created_at) || Date.now(), status: row.status, extracted: row.extracted ?? undefined, proof: row.proof ?? undefined }))
  const goalSkills = new Map<string, DbRow[]>()
  skillRows.forEach((skill) => goalSkills.set(skill.career_goal_id, [...(goalSkills.get(skill.career_goal_id) ?? []), skill]))
  const goals = goalRows.map((row) => ({ id: row.id, title: row.title, progress: 0, skills: (goalSkills.get(row.id) ?? []).map((skill) => ({ name: skill.name, level: skill.status, evidence: skill.evidence ?? undefined })) }))
  const learning = learningRows.map((row) => ({ id: row.id, name: row.name, progress: Number(row.progress) || 0, nextSession: row.next_session ?? 'Not scheduled', minutesThisWeek: 0 }))
  const courses = courseRows.map((row) => ({ id: row.id, name: row.name, target: Number(row.target) || 75, totalClasses: Number(row.total_classes) || 0, heldClasses: Number(row.held_classes) || 0, attendedClasses: Number(row.attended_classes) || 0 }))
  const subjects = subjectRows.map((row) => ({ id: row.id, name: row.name, code: row.code ?? undefined, instructor: row.instructor ?? undefined }))
  const attendance = attendanceRows.map((row) => ({ id: row.id, courseId: row.course_id, classDate: row.class_date, attended: !!row.attended }))
  const assignments = assignmentRows.map((row) => ({ id: row.id, title: row.title, courseId: row.course_id ?? undefined, dueAt: row.due_at ? Date.parse(row.due_at) : null, status: row.status === 'done' ? ('done' as const) : ('open' as const) }))
  const exams = examRows.map((row) => ({ id: row.id, title: row.title, courseId: row.course_id ?? undefined, startsAt: row.starts_at ? Date.parse(row.starts_at) : null }))
  const availableMinutes = computeUsableMinutesToday(plan.filter((block) => block.day === todayKey()) as any, new Date(), { start: preferences.planning_window_start?.slice(0, 5) ?? '08:00', end: preferences.planning_window_end?.slice(0, 5) ?? '23:00' })
  const priorities = taskRows.map((row) => priorityFromTask({ id: row.id, title: row.title, category: row.category ?? 'Academic', due: row.due ?? 'Unknown deadline', dueAt: row.due_at ? Date.parse(row.due_at) : null, effort: row.effort ?? '', availableMinutes, planningMode: profile.planning_mode ?? null } as any))
  applications.forEach((application) => priorities.push(priorityFromApplication({ app: application as any, availableMinutes, planningMode: profile.planning_mode ?? null })))
  const completedFocus = focusRows.filter((row) => row.status === 'completed')
  const focusSessions = completedFocus.map((row) => ({ id: row.id, minutes: Number(row.minutes) || 0, title: row.title ?? undefined, sourceType: row.source_type, sourceId: row.source_id ?? undefined, completedAt: row.completed_at ?? row.created_at }))
  const today = new Date().toISOString().slice(0, 10)
  return {
    userName: profile.name ?? '', planningMode: profile.planning_mode === 'Gentle' || profile.planning_mode === 'Pressure' ? profile.planning_mode : null,
    theme: profile.theme === 'dark' ? 'dark' : 'light',
    planningWindow: { start: preferences.planning_window_start?.slice(0, 5) ?? '08:00', end: preferences.planning_window_end?.slice(0, 5) ?? '23:00' },
    applications, captures, plan, learning, goals, courses, subjects, attendance, assignments, exams, priorities, focusSessions,
    focusMinutesToday: completedFocus.filter((row) => row.completed_at?.slice(0, 10) === today).reduce((sum, row) => sum + (Number(row.minutes) || 0), 0),
    focusStreak: 0, lastFocusDate: completedFocus.length ? today : undefined,
  }
}

function comparable(row: DbRow): string {
  const copy = { ...row }
  delete copy.created_at
  delete copy.updated_at
  return JSON.stringify(copy)
}

async function syncRows(client: SupabaseClient, table: string, userId: string, current: DbRow[], previous: DbRow[]) {
  const existingResult = await client.from(table).select('*').eq('user_id', userId)
  if (existingResult.error) throw new Error(`${table} read: ${existingResult.error.message}`)
  const identity = table === 'user_preferences' ? 'user_id' : 'id'
  const existing = new Map<string, DbRow>((existingResult.data ?? []).map((row: DbRow) => [row[identity], row]))
  const normalizedCurrent = current.map((row) => { const prior = existing.get(row[identity]); return prior ? { ...row, id: prior.id } : row })
  const currentIds = new Set(normalizedCurrent.map((row) => row[identity]))
  for (const oldRow of previous) {
    if (!currentIds.has(oldRow[identity]) && existing.has(oldRow[identity])) {
      const deleted = await client.from(table).delete().eq('user_id', userId).eq(identity, oldRow[identity])
      if (deleted.error) throw new Error(`${table} delete: ${deleted.error.message}`)
    }
  }
  const changed = normalizedCurrent.filter((row) => !existing.has(row[identity]) || comparable(row) !== comparable(existing.get(row[identity])!))
  if (!changed.length) return
  const written = await client.from(table).upsert(changed, { onConflict: identity })
  if (written.error) throw new Error(`${table} write: ${written.error.message}`)
}

function rowsForState(userId: string, state: any) {
  const tasks = state.priorities.filter((item: any) => item.sourceType === 'capture').map((item: any) => ({ id: item.id, user_id: userId, title: item.title, category: item.category, due: item.due, due_at: item.dueAt ? new Date(item.dueAt).toISOString() : null, effort: item.time, done: item.done, priority: item.priority }))
  // NOTE: block.sourceId for capture-sourced blocks is a client-generated id
  // (see makeId('task') in store.tsx) that never becomes a row in the
  // `tasks` table -- this app doesn't maintain a real tasks table. Writing
  // it as task_id trips the plan_blocks_task_id_fkey constraint. source_type
  // / source_id below already carry that link for the frontend's own
  // matching logic, so task_id just stays null until a real tasks table exists.
  const plan = state.plan.map((block: any) => ({ id: block.id, user_id: userId, task_id: null, title: block.title, day: block.day, start_time: block.time, duration_minutes: block.durationMinutes ?? 0, kind: block.kind, priority: block.priority, done: block.done, fixed: block.fixed, flexibility: block.flexibility, can_move: block.canMove, source_type: block.sourceType ?? null, source_id: block.sourceId ?? null, notes: block.notes ?? null }))
  const captures = state.captures.map((capture: any) => ({ id: capture.id, user_id: userId, capture_type: capture.type, raw_text: capture.rawText, proof: capture.proof ?? null, status: capture.status, extracted: capture.extracted ?? null }))
  const applications = state.applications.map((app: any) => ({ id: app.id, user_id: userId, company: app.company, role: app.role, status: app.status, deadline: app.deadline, deadline_at: app.deadlineAt ? new Date(app.deadlineAt).toISOString() : null, applied_on: app.appliedOn ?? null, link: app.link ?? null, questions: app.questions, submitted_items: app.submittedItems, proof: app.proof ?? null, notes: app.notes ?? null, follow_up_date: app.followUpDate ?? null }))
  const timeline = state.applications.flatMap((app: any) => app.timeline.map((event: any) => ({ id: event.id, user_id: userId, application_id: app.id, label: event.label, event_date: event.date, note: event.note ?? null })))
  const goals = state.goals.map((goal: any) => ({ id: goal.id, user_id: userId, title: goal.title }))
  const skills = state.goals.flatMap((goal: any) => goal.skills.map((skill: any) => ({ id: `${goal.id}_${skill.name}`, user_id: userId, career_goal_id: goal.id, name: skill.name, status: skill.level, evidence: skill.evidence ?? null, is_gap: skill.level === 'Gap' || skill.level === 'Needs work' })))
  const learning = state.learning.map((track: any) => ({ id: track.id, user_id: userId, name: track.name, progress: track.progress, next_session: track.nextSession }))
  const courses = state.courses.map((course: any) => ({ id: course.id, user_id: userId, name: course.name, target: course.target, total_classes: course.totalClasses, held_classes: course.heldClasses, attended_classes: course.attendedClasses }))
  const subjects = state.subjects.map((subject: any) => ({ id: subject.id, user_id: userId, name: subject.name, code: subject.code ?? null, instructor: subject.instructor ?? null }))
  const attendance = state.attendance.map((record: any) => ({ id: record.id, user_id: userId, course_id: record.courseId, class_date: record.classDate, attended: record.attended }))
  const assignments = state.assignments.map((assignment: any) => ({ id: assignment.id, user_id: userId, course_id: assignment.courseId ?? null, title: assignment.title, due_at: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : null, status: assignment.status }))
  const exams = state.exams.map((exam: any) => ({ id: exam.id, user_id: userId, course_id: exam.courseId ?? null, title: exam.title, starts_at: exam.startsAt ? new Date(exam.startsAt).toISOString() : null }))
  const preferences = [{ id: `pref_${userId}`, user_id: userId, planning_mode: state.planningMode, theme: state.theme, planning_window_start: state.planningWindow.start, planning_window_end: state.planningWindow.end }]
  const focusSessions = state.focusSessions.map((session: any) => ({ id: session.id, user_id: userId, source_type: session.sourceType ?? null, source_id: session.sourceId ?? null, title: session.title ?? null, ended_at: session.completedAt, minutes: session.minutes, status: 'completed' }))
  return { tables: { application_timeline_events: timeline, career_skills: skills, plan_blocks: plan, tasks, captured_items: captures, applications, career_goals: goals, learning_goals: learning, courses, subjects, attendance, assignments, exams, focus_sessions: focusSessions, user_preferences: preferences } }
}

export async function saveTempoData(client: SupabaseClient, userId: string, state: any, previous: any): Promise<void> {
  const { tables } = rowsForState(userId, state)
  const prior = rowsForState(userId, previous).tables
  for (const table of Object.keys(tables) as Array<keyof typeof tables>) await syncRows(client, table, userId, (tables as any)[table], (prior as any)[table])
  const profile = await client.from('profiles').update({ name: state.userName, planning_mode: state.planningMode, theme: state.theme }).eq('user_id', userId)
  if (profile.error) throw new Error(`profiles update: ${profile.error.message}`)
}