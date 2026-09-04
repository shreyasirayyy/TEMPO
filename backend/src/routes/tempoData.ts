import { Router } from 'express'
import { getClientForToken } from '../supabaseClient'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { fetchTempoData, saveTempoData } from '../lib/tempoData'

export const tempoDataRouter = Router()
tempoDataRouter.use(requireAuth)

tempoDataRouter.get('/', async (req, res) => {
  const { userId, accessToken } = req as AuthedRequest
  try {
    const client = getClientForToken(accessToken)
    const data = await fetchTempoData(client, userId)
    res.json({ data })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not load Tempo data.' })
  }
})

tempoDataRouter.put('/', async (req, res) => {
  const { userId, accessToken } = req as AuthedRequest
  const { state, previous } = req.body ?? {}
  if (!state || !previous) return res.status(400).json({ error: 'Both state and previous are required.' })
  try {
    const client = getClientForToken(accessToken)
    await saveTempoData(client, userId, state, previous)
    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not save Tempo data.' })
  }
})
