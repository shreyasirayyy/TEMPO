import { api } from '@/lib/apiClient'
import type { Application, CaptureItem, Course, Goal, LearningTrack, PlanBlock, PriorityItem } from '@/lib/types'
import type { TempoState } from '@/lib/store'

export type RemoteTempoData = Partial<Pick<TempoState, 'userName' | 'planningMode' | 'theme' | 'planningWindow' | 'applications' | 'captures' | 'plan' | 'learning' | 'goals' | 'courses' | 'subjects' | 'assignments' | 'exams' | 'attendance' | 'focusMinutesToday' | 'focusStreak' | 'lastFocusDate' | 'focusSessions' | 'priorities'>>

// All of the row<->domain mapping that used to live here now runs on the
// backend (backend/src/lib/tempoData.ts) against the caller's own Supabase
// session, so this is just the two HTTP calls.

export async function fetchTempoData(_userId: string): Promise<RemoteTempoData> {
  const { data } = await api.get<{ data: RemoteTempoData }>('/api/tempo-data')
  return data
}

export async function saveTempoData(_userId: string, state: TempoState, previous: TempoState): Promise<void> {
  await api.put('/api/tempo-data', { state, previous })
}

export type { Application, CaptureItem, Course, Goal, LearningTrack, PlanBlock, PriorityItem }
