import type { Application, Course, Goal, LearningTrack, PlanBlock, PriorityItem } from './types'
import { dateAtOffset, dayKeyOffset, todayKey, formatDateLabel } from './date'
import { priorityFromApplication, priorityFromTask } from './ai/priorityEngine'

const TODAY = todayKey()
const TOMORROW = dayKeyOffset(1)
const DAY_AFTER = dayKeyOffset(2)
const todayDeadline = dateAtOffset(0, 23, 59)
const tomorrowDeadline = dateAtOffset(1, 23, 59)
const twoDaysDeadline = dateAtOffset(2, 23, 59)
const fiveDaysDeadline = dateAtOffset(5, 23, 59)
const eightDaysDeadline = dateAtOffset(8, 23, 59)
const thirteenDaysDeadline = dateAtOffset(13, 23, 59)

export const seedApplications: Application[] = [
  {
    id: 'xyz',
    company: 'XYZ',
    role: 'Frontend Intern',
    status: 'Applied',
    deadline: formatDateLabel(tomorrowDeadline, false),
    deadlineAt: tomorrowDeadline,
    appliedOn: 'Aug 25',
    link: 'https://xyz.example.com/careers',
    questions: ['Why do you want to join us?', "Describe a project you're proud of.", 'GitHub', 'Portfolio', 'Resume'],
    submittedItems: ['Resume', 'GitHub link', 'Portfolio'],
    followUpDate: formatDateLabel(dateAtOffset(8, 12, 0), false),
    notes: 'Referred by a senior batchmate.',
    timeline: [
      { id: 't1', label: 'Applied', date: 'Aug 25' },
      { id: 't2', label: 'Deadline', date: formatDateLabel(tomorrowDeadline, false) },
      { id: 't3', label: 'Suggested follow-up', date: formatDateLabel(dateAtOffset(8, 12, 0), false), note: '7 days after application' },
    ],
  },
  {
    id: 'abc',
    company: 'ABC',
    role: 'Software Intern',
    status: 'In Progress',
    deadline: formatDateLabel(twoDaysDeadline, false),
    deadlineAt: twoDaysDeadline,
    appliedOn: 'Aug 20',
    questions: ['Coding assessment link', 'Availability'],
    submittedItems: ['Resume'],
    followUpDate: formatDateLabel(dateAtOffset(5, 12, 0), false),
    timeline: [
      { id: 't4', label: 'Form started', date: 'Aug 20' },
      { id: 't5', label: 'Deadline', date: formatDateLabel(twoDaysDeadline, false) },
    ],
  },
  {
    id: 'google',
    company: 'Google',
    role: 'Student Program',
    status: 'Applied',
    deadline: formatDateLabel(thirteenDaysDeadline, false),
    deadlineAt: thirteenDaysDeadline,
    appliedOn: 'Aug 18',
    questions: ['Statement of purpose', 'Transcript'],
    submittedItems: ['Resume', 'Transcript', 'SOP'],
    followUpDate: formatDateLabel(dateAtOffset(20, 12, 0), false),
    timeline: [
      { id: 't6', label: 'Applied', date: 'Aug 18' },
      { id: 't7', label: 'Deadline', date: formatDateLabel(thirteenDaysDeadline, false) },
    ],
  },
  {
    id: 'microsoft',
    company: 'Microsoft',
    role: 'Explore Intern',
    status: 'Form Started',
    deadline: formatDateLabel(fiveDaysDeadline, false),
    deadlineAt: fiveDaysDeadline,
    appliedOn: 'Aug 22',
    questions: ['Why Microsoft?', 'Resume', 'LinkedIn'],
    submittedItems: [],
    timeline: [{ id: 't8', label: 'Form started', date: 'Aug 22' }],
  },
]

function manualPriority(priority: PriorityItem, sourceType: PriorityItem['sourceType'] = 'manual'): PriorityItem {
  return { ...priority, sourceType }
}

export const seedPriorities: PriorityItem[] = [
  manualPriority(priorityFromTask({
    id: 'dbms',
    title: 'DBMS Report',
    category: 'Academic',
    due: 'Today, 11:59 PM',
    dueAt: todayDeadline,
    effort: '2h',
    impact: 30,
    availableMinutes: 240,
    planningMode: 'Pressure',
  })),
  priorityFromApplication({ app: seedApplications[0], availableMinutes: 240, planningMode: 'Pressure' }),
  manualPriority(priorityFromTask({
    id: 'react',
    title: 'React Practice',
    category: 'Learning',
    due: '45m session',
    dueAt: null,
    effort: '45m',
    impact: 15,
    availableMinutes: 180,
    planningMode: 'Pressure',
  })),
  manualPriority(priorityFromTask({
    id: 'gym',
    title: 'Gym',
    category: 'Personal',
    due: 'Today, 7:30 PM',
    dueAt: dateAtOffset(0, 19, 30),
    effort: '1h',
    impact: 8,
    availableMinutes: 180,
    planningMode: 'Pressure',
  })),
]

export const seedPlan: PlanBlock[] = [
  { id: 'b1', day: TODAY, time: '09:00', title: 'Class', duration: '1h', durationMinutes: 60, tag: 'keep', done: true, kind: 'class', priority: 'Medium', fixed: true, flexibility: 'fixed', canMove: false, sourceType: 'academics' },
  { id: 'b2', day: TODAY, time: '11:00', title: 'DBMS Study', duration: '1h', durationMinutes: 60, tag: 'normal', done: true, kind: 'learning', priority: 'Medium', fixed: false, flexibility: 'adjustable', canMove: true, sourceType: 'academics' },
  { id: 'b3', day: TODAY, time: '14:00', title: 'Project Work', duration: '2h', durationMinutes: 120, tag: 'normal', done: false, kind: 'project', priority: 'High', fixed: false, flexibility: 'adjustable', canMove: true, sourceType: 'manual' },
  { id: 'b4', day: TODAY, time: '18:00', title: 'DBMS Report', duration: '2h', durationMinutes: 120, tag: 'protect', done: false, kind: 'task', priority: 'Critical', fixed: false, flexibility: 'adjustable', canMove: true, sourceType: 'manual', sourceId: 'dbms' },
  { id: 'b5', day: TODAY, time: '21:00', title: 'React Practice', duration: '45m', durationMinutes: 45, tag: 'normal', done: false, kind: 'learning', priority: 'Medium', fixed: false, flexibility: 'flexible', canMove: true, sourceType: 'learning', sourceId: 'react' },
  { id: 'b6', day: TODAY, time: '19:30', title: 'Gym', duration: '1h', durationMinutes: 60, tag: 'normal', done: false, kind: 'personal', priority: 'Low', fixed: false, flexibility: 'flexible', canMove: true, sourceType: 'manual', sourceId: 'gym' },
  { id: 'b7', day: TOMORROW, time: '09:00', title: 'Class', duration: '1h', durationMinutes: 60, tag: 'keep', done: false, kind: 'class', priority: 'Medium', fixed: true, flexibility: 'fixed', canMove: false, sourceType: 'academics' },
  { id: 'b8', day: TOMORROW, time: '12:00', title: 'XYZ Application — finish form', duration: '30m', durationMinutes: 30, tag: 'normal', done: false, kind: 'application', priority: 'High', fixed: false, flexibility: 'adjustable', canMove: true, sourceType: 'application', sourceId: 'xyz' },
  { id: 'b9', day: TOMORROW, time: '17:00', title: 'React Practice', duration: '45m', durationMinutes: 45, tag: 'normal', done: false, kind: 'learning', priority: 'Medium', fixed: false, flexibility: 'flexible', canMove: true, sourceType: 'learning', sourceId: 'react' },
  { id: 'b10', day: DAY_AFTER, time: '10:00', title: 'OS Lab', duration: '2h', durationMinutes: 120, tag: 'normal', done: false, kind: 'class', priority: 'High', fixed: true, flexibility: 'fixed', canMove: false, sourceType: 'academics' },
  { id: 'b11', day: DAY_AFTER, time: '19:00', title: 'System Design Reading', duration: '1h', durationMinutes: 60, tag: 'normal', done: false, kind: 'learning', priority: 'Medium', fixed: false, flexibility: 'flexible', canMove: true, sourceType: 'learning', sourceId: 'sysdesign' },
]

export const seedLearning: LearningTrack[] = [
  { id: 'react', name: 'React', progress: 60, nextSession: '45 min today', minutesThisWeek: 180 },
  { id: 'ts', name: 'TypeScript', progress: 40, nextSession: 'Tomorrow', minutesThisWeek: 90 },
  { id: 'sysdesign', name: 'System Design', progress: 20, nextSession: 'Wed, 7 PM', minutesThisWeek: 60 },
]

export const seedGoals: Goal[] = [
  {
    id: 'frontend-dev',
    title: 'Become job-ready Frontend Developer',
    progress: 48,
    skills: [
      { name: 'React', level: 'Strong', evidence: '3 projects shipped, weekly practice' },
      { name: 'TypeScript', level: 'Learning', evidence: 'Using it daily, still learning generics' },
      { name: 'System Design', level: 'Gap', evidence: 'No structured practice yet' },
      { name: 'DSA', level: 'Learning', evidence: 'Mid-level problems, inconsistent practice' },
    ],
  },
  {
    id: 'internship',
    title: 'Land a Summer Internship',
    progress: 35,
    skills: [
      { name: 'Resume', level: 'Strong', evidence: 'Reviewed and up to date' },
      { name: 'Portfolio', level: 'Learning', evidence: '2 of 4 planned projects live' },
      { name: 'Interview prep', level: 'Needs work', evidence: 'No mock interviews done yet' },
    ],
  },
]

export const seedCourses: Course[] = [
  { id: 'os', name: 'Operating Systems', target: 75, totalClasses: 52, heldClasses: 40, attendedClasses: 28 },
  { id: 'dbms', name: 'DBMS', target: 75, totalClasses: 45, heldClasses: 35, attendedClasses: 31 },
  { id: 'cn', name: 'Computer Networks', target: 75, totalClasses: 44, heldClasses: 33, attendedClasses: 27 },
  { id: 'math', name: 'Discrete Math', target: 75, totalClasses: 47, heldClasses: 38, attendedClasses: 26 },
]

export const priorities = seedPriorities
export const applications = seedApplications
