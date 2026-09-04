import { api, setAccessToken, getAccessToken } from '@/lib/apiClient'

export type AuthSession = { userId: string; email?: string; provider?: 'google' | 'apple' | 'email' }

type SessionPayload = { accessToken: string; refreshToken: string; expiresAt: number | null; userId: string; email?: string; provider: 'google' | 'apple' | 'email' } | null

export function isApiConfigured(): boolean {
  return true // the backend URL always has a default; misconfiguration surfaces as a network error instead
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const token = getAccessToken()
  if (!token) return null
  try {
    const { userId } = await api.get<{ userId: string }>('/api/auth/session')
    return { userId }
  } catch {
    setAccessToken(null)
    return null
  }
}

function storeSession(session: SessionPayload): AuthSession | null {
  if (!session) return null
  setAccessToken(session.accessToken)
  return { userId: session.userId, email: session.email, provider: session.provider }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession | null> {
  const { session } = await api.post<{ session: SessionPayload }>('/api/auth/login', { email, password }, { auth: false })
  return storeSession(session)
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<AuthSession | null> {
  const { session } = await api.post<{ session: SessionPayload }>('/api/auth/signup', { email, password, name }, { auth: false })
  return storeSession(session)
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  const { url } = await api.get<{ url: string }>(`/api/auth/oauth/${provider}/start`)
  window.location.href = url
}

export async function upsertProfile(_userId: string, profile: { name?: string; email?: string; avatar_url?: string }) {
  const { profile: updated } = await api.put<{ profile: unknown }>('/api/profile', { name: profile.name, avatar_url: profile.avatar_url })
  return updated
}

export async function getProfile(_userId: string) {
  const { profile } = await api.get<{ profile: { name?: string; avatar_url?: string; planning_mode?: string; theme?: string } | null }>('/api/profile')
  return profile
}

export async function updateProfilePreferences(_userId: string, preferences: { planning_mode?: 'Gentle' | 'Pressure'; theme?: 'light' | 'dark' }) {
  await api.put('/api/profile/preferences', preferences)
}

export async function signOut(): Promise<void> {
  try { await api.post('/api/auth/logout') } finally { setAccessToken(null) }
}
