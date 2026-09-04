import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth'
import { profileRouter } from './routes/profile'
import { tempoDataRouter } from './routes/tempoData'
import { aiRouter } from './routes/ai'
import { isSupabaseConfigured } from './supabaseClient'
import { isGroqConfigured } from './lib/ai/groqClient'

const app = express()
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, supabaseConfigured: isSupabaseConfigured(), groqConfigured: isGroqConfigured() })
})

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/tempo-data', tempoDataRouter)
app.use('/api/ai', aiRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }))

const port = Number(process.env.PORT) || 4000
app.listen(port, () => {
  console.log(`Tempo backend listening on http://localhost:${port}`)
  if (!isSupabaseConfigured()) console.warn('SUPABASE_URL / SUPABASE_ANON_KEY are not set -- auth and data routes will fail until backend/.env is configured.')
  if (!isGroqConfigured()) console.warn('GROQ_API_KEY is not set -- Smart Capture will fall back to the regex/rule-based parser.')
})
