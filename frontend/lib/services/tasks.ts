import type { PlanBlock } from '@/lib/types'

export async function listTasks(_userId: string): Promise<PlanBlock[]> {
  return []
}

export async function saveTask(_userId: string, _task: PlanBlock): Promise<PlanBlock> {
  throw new Error('Task persistence is not connected yet.')
}

export async function deleteTask(_userId: string, _taskId: string): Promise<void> {
  throw new Error('Task persistence is not connected yet.')
}
