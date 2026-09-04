import { Router } from 'express'
import { getAnonClient, getClientForToken } from '../supabaseClient'
import { requireAuth, type AuthedRequest } from '../middleware/auth'

export const authRouter = Router()

function mapSession(session: { access_token: string; refresh_token: string; expires_at?: number } | null, user: { id: string; email?: string | null; app_metadata: { provider?: string } } | null | undefined) {
  if (!session || !user) return null
  const provider = user.app_metadata.provider
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    userId: user.id,
    email: user.email ?? undefined,
    provider: provider === 'google' || provider === 'apple' ? provider : 'email',
  }
}

authRouter.post('/signup', async (req, res) => {
  const { email, password, name } = req.body ?? {}
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' })
  try {
    const anon = getAnonClient()
    const { data, error } = await anon.auth.signUp({ email, password, options: { data: { name } } })
    if (error) return res.status(400).json({ error: error.message })
    // Mirrors the old frontend behaviour: if sign-up returned an active
    // session (email confirmation disabled), immediately upsert the profile
    // row using that user's own token so RLS allows the write.
    if (data.user && data.session) {
      const scoped = getClientForToken(data.session.access_token)
      const { error: profileError } = await scoped.from('profiles').upsert(
        { user_id: data.user.id, name: name ?? '', avatar_url: null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      if (profileError) return res.status(400).json({ error: profileError.message })
    }
    res.json({ session: mapSession(data.session, data.user) })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Sign-up failed.' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' })
  try {
    const anon = getAnonClient()
    const { data, error } = await anon.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: error.message })
    res.json({ session: mapSession(data.session, data.user) })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Login failed.' })
  }
})

authRouter.post('/logout', requireAuth, async (req, res) => {
  try {
    const client = getClientForToken((req as AuthedRequest).accessToken)
    const { error } = await client.auth.signOut()
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Logout failed.' })
  }
})

authRouter.get('/session', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest
  res.json({ userId })
})

// OAuth is a browser-redirect flow: Supabase needs to send the user's browser
// to the provider and back, so it can't be done as a plain JSON call. This
// route hands back the Supabase-hosted authorize URL for the frontend to
// redirect to; /callback below is where Supabase sends the browser back.
authRouter.get('/oauth/:provider/start', async (req, res) => {
  const provider = req.params.provider
  if (provider !== 'google' && provider !== 'apple') return res.status(400).json({ error: 'Unsupported provider.' })
  try {
    const anon = getAnonClient()
    // Supabase's default OAuth flow for this client returns tokens in the
    // URL *hash fragment* (#access_token=...) on redirect, not a ?code=
    // query param -- and hash fragments are never sent to a server by the
    // browser. So redirectTo must point straight at the frontend, which
    // reads the fragment client-side; a backend hop here would just drop
    // the tokens on the floor (which is exactly what was happening before).
    const frontendUrl = process.env.FRONTEND_PUBLIC_URL ?? 'http://localhost:3000'
    const { data, error } = await anon.auth.signInWithOAuth({ provider, options: { redirectTo: `${frontendUrl}/auth`, skipBrowserRedirect: true } })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ url: data.url })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Could not start OAuth sign-in.' })
  }
})

// Kept for providers/configurations that use the PKCE code-exchange flow
// instead of the implicit/hash-fragment flow above. Not currently reached
// by the /start route (which redirects the browser straight to the
// frontend), but left in place in case a future OAuth provider is added
// through a server-side authorization-code exchange.
authRouter.get('/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL ?? 'http://localhost:3000'
  if (!code) return res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('OAuth sign-in was cancelled or failed.')}`)
  try {
    const anon = getAnonClient()
    const { data, error } = await anon.auth.exchangeCodeForSession(code)
    if (error || !data.session) return res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(error?.message ?? 'OAuth sign-in failed.')}`)
    // The access token is short-lived and passed once via the redirect; the
    // frontend picks it up on load and stores it like any other session.
    res.redirect(`${frontendUrl}/auth?access_token=${encodeURIComponent(data.session.access_token)}&refresh_token=${encodeURIComponent(data.session.refresh_token)}`)
  } catch (error) {
    res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(error instanceof Error ? error.message : 'OAuth sign-in failed.')}`)
  }
})
