import { Router } from 'express'
import { getClientForToken } from '../supabaseClient'
import { requireAuth, type AuthedRequest } from '../middleware/auth'

export const profileRouter = Router()
profileRouter.use(requireAuth)

profileRouter.get('/', async (req, res) => {
  const { userId, accessToken } = req as AuthedRequest
  try {
    const client = getClientForToken(accessToken)
    const { data, error } = await client.from('profiles').select('name, avatar_url, planning_mode, theme').eq('user_id', userId).maybeSingle()
    if (error) return res.status(400).json({ error: error.message })
    res.json({ profile: data })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Could not load profile.' })
  }
})

profileRouter.put('/', async (req, res) => {
  const { userId, accessToken } = req as AuthedRequest
  const { name, avatar_url } = req.body ?? {}
  try {
    const client = getClientForToken(accessToken)
    const { data, error } = await client
      .from('profiles')
      .upsert({ user_id: userId, name: name ?? '', avatar_url: avatar_url ?? null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('name, avatar_url')
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json({ profile: data })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Could not update profile.' })
  }
})

profileRouter.put('/preferences', async (req, res) => {
  const { userId, accessToken } = req as AuthedRequest
  const { planning_mode, theme } = req.body ?? {}
  try {
    const client = getClientForToken(accessToken)
    const { error } = await client.from('profiles').update({ planning_mode, theme, updated_at: new Date().toISOString() }).eq('user_id', userId)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Could not update preferences.' })
  }
})
