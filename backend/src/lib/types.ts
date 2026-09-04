export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type PlanningMode = 'Gentle' | 'Pressure'
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type WhyFactor = { label: string; value: string }

export type PriorityItem = {
  id: string
  title: string
  score: number
  priority: Priority
  due: string
  dueAt: number | null
  time: string
  category: 'Academic' | 'Career' | 'Learning' | 'Personal'
  why: string
  whyFactors: WhyFactor[]
  done: boolean
  sourceType?: 'application' | 'academics' | 'manual' | 'capture' | 'learning'
  sourceId?: string
}

export type ApplicationStatus = 'Needs Review' | 'Form Started' | 'Applied' | 'In Progress' | 'Interview' | 'Offer' | 'Rejected'

export type TimelineEvent = { id: string; label: string; date: string; note?: string }

export type Application = {
  id: string
  company: string
  role: string
  status: ApplicationStatus
  deadline: string
  deadlineAt: number | null
  appliedOn?: string
  link?: string
  questions: string[]
  submittedItems: string[]
  proof?: string
  notes?: string
  followUpDate?: string
  timeline: TimelineEvent[]
}

export type PlanTag = 'keep' | 'protect' | 'move' | 'normal' | 'new'
export type PlanBlockKind = 'class' | 'task' | 'project' | 'personal' | 'break' | 'learning' | 'application'
export type BlockFlexibility = 'fixed' | 'adjustable' | 'flexible'
export type PlanSourceType = 'application' | 'academics' | 'manual' | 'capture' | 'learning'

export type PlanBlock = {
  id: string
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  time: string
  title: string
  duration: string
  durationMinutes?: number
  tag: PlanTag
  done: boolean
  kind: PlanBlockKind
  priority: Priority
  fixed: boolean
  flexibility: BlockFlexibility
  canMove: boolean
  sourceType?: PlanSourceType
  sourceId?: string
  preferredTime?: string
  focusedMinutes?: number
  notes?: string
}

export type CaptureType = 'screenshot' | 'text' | 'voice' | 'file'

export type ExtractedApplication = {
  kind: 'application'
  company: string
  role: string
  status: ApplicationStatus
  deadline: string
  deadlineAt: number | null
  appliedOn: string
  link: string
  questions: string[]
  submittedItems: string[]
  followUpDate: string
  uncertainFields: string[]
}

export type ExtractedTask = {
  kind: 'task'
  title: string
  category: PriorityItem['category']
  due: string
  dueAt: number | null
  effort: string
  uncertainFields: string[]
}

export type Extracted = ExtractedApplication | ExtractedTask

export type CaptureItem = {
  id: string
  type: CaptureType
  rawText: string
  createdAt: number
  status: 'processing' | 'pending' | 'confirmed' | 'dismissed'
  extracted?: Extracted
  proof?: string
}

export type LearningTrack = {
  id: string
  name: string
  progress: number
  nextSession: string
  minutesThisWeek: number
}

export type SkillLevel = 'Strong' | 'Learning' | 'Gap' | 'Needs work'

export type Goal = {
  id: string
  title: string
  progress: number
  skills: { name: string; level: SkillLevel; evidence?: string }[]
}

export type Course = {
  id: string
  name: string
  target: number
  totalClasses: number
  heldClasses: number
  attendedClasses: number
}

export type Subject = { id: string; name: string; code?: string; instructor?: string }
export type Assignment = { id: string; title: string; courseId?: string; dueAt?: number | null; status: 'open' | 'done' }
export type Exam = { id: string; title: string; courseId?: string; startsAt?: number | null }
export type AttendanceRecord = { id: string; courseId: string; classDate: string; attended: boolean }

export type FocusContext = {
  kind: PlanBlockKind
  sourceId?: string
  title: string
  selectedAt: number
}

export type PlanningWindow = { start: string; end: string }

export type Theme = 'light' | 'dark'

export type FixSuggestion = {
  id: string
  reason: string
  changes: { blockId: string; tag: PlanTag; time?: string; day?: PlanBlock['day']; reason?: string }[]
}

export type TaskPriorityInput = {
  id: string
  title: string
  category: PriorityItem['category']
  due: string
  dueAt: number | null
  effort: string
  impact?: number
  dependencies?: string[]
  availableMinutes?: number
  planningMode?: PlanningMode | null
}

export type ApplicationPriorityInput = {
  app: Application
  availableMinutes?: number
  planningMode?: PlanningMode | null
}

export type FocusCompletion = { minutes: number; context?: FocusContext | null }

export type FocusSessionRecord = { id: string; minutes: number; title?: string; sourceType?: PlanBlockKind; sourceId?: string; completedAt: string }
