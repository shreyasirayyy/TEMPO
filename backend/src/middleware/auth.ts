import type { NextFunction, Request, Response } from 'express'
import { getClientForToken } from '../supabaseClient'

export type AuthedRequest = Request & { userId: string; accessToken: string }

// Every protected route needs a valid Supabase access token. We verify it by
// asking Supabase who it belongs to (rather than trusting a decoded JWT
// blindly) and attach both the user id and the raw token, since downstream
// handlers create their own per-request Supabase client from that token so
// RLS applies exactly as it did when the browser talked to Supabase directly.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token.' })
  try {
    const client = getClientForToken(token)
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired session.' })
    ;(req as AuthedRequest).userId = data.user.id
    ;(req as AuthedRequest).accessToken = token
    next()
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Auth check failed.' })
  }
}
