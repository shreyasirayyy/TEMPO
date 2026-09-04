import type { Application } from '@/lib/types'

export async function listApplications(_userId: string): Promise<Application[]> {
  return []
}

export async function saveApplication(_userId: string, _application: Application): Promise<Application> {
  throw new Error('Application persistence is not connected yet.')
}

export async function deleteApplication(_userId: string, _applicationId: string): Promise<void> {
  throw new Error('Application persistence is not connected yet.')
}
