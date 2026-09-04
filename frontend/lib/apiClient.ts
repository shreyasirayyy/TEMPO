// Thin fetch wrapper for the Tempo backend (see /backend). The frontend no
// longer talks to Supabase directly -- every read/write goes through this
// client to the Express API, which holds the Supabase connection.

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
const TOKEN_KEY = 'tempo-access-token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode / storage unavailable */ }
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) }
  if (init?.auth !== false) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Could not reach the Tempo backend. Is it running?')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body?.error ?? `Request failed with status ${response.status}.`)
  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown, opts?: { auth?: boolean }) => request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined, auth: opts?.auth }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  // For binary bodies (e.g. audio blobs) that shouldn't be JSON-encoded --
  // sends the blob as-is with its own content type instead of
  // application/json.
  postRaw: <T>(path: string, data: Blob, contentType: string) => request<T>(path, { method: 'POST', body: data, headers: { 'Content-Type': contentType } }),
}
