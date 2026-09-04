'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Apple, Loader2, Mail } from 'lucide-react'
import { TempoLogo } from '@/components/brand/TempoLogo'
import { useTempo } from '@/lib/store'
import { setAccessToken } from '@/lib/apiClient'
import { getCurrentSession, signInWithEmail, signInWithProvider, signUpWithEmail } from '@/lib/services/auth'

type Mode = 'landing' | 'signin' | 'signup'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

// useSearchParams (used to pick up the OAuth callback token below) requires a
// Suspense boundary in the app router, since it can only resolve once query
// params are available on the client.
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  )
}

function AuthPageInner() {
  const { state, dispatch } = useTempo()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('landing')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state.hydrated) return
    if (!state.auth.hasCompletedOnboarding) {
      router.replace('/onboarding')
    } else if (state.auth.isAuthenticated) {
      router.replace(state.auth.hasSelectedPlanningMode ? '/' : '/setup/planning-mode')
    }
  }, [state.hydrated, state.auth, router])

  // Supabase's OAuth redirect lands back here with the tokens in the URL
  // *hash fragment* (#access_token=...&refresh_token=...), not the query
  // string -- the fragment never reaches a server, so this has to be read
  // client-side. We also still check the query string for an `error` the
  // backend's /callback route may have set (e.g. a genuinely cancelled or
  // failed provider sign-in), and for `access_token` there as a fallback in
  // case a future flow does route through the backend.
  useEffect(() => {
    const oauthError = searchParams.get('error')
    const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null
    const accessToken = searchParams.get('access_token') ?? hashParams?.get('access_token')
    // A hash fragment can be left over from a *previous* failed redirect
    // (browsers sometimes carry it across a server redirect that doesn't
    // specify its own fragment) -- if there's a real token, trust the
    // token over a stale error.
    if (oauthError && !accessToken) { setStatus('error'); setError(oauthError); return }
    if (!accessToken) return
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setAccessToken(accessToken)
    setStatus('loading')
    getCurrentSession()
      .then((session) => {
        if (!session) { setStatus('error'); setError('Could not complete sign-in.'); return }
        dispatch({ type: 'SET_AUTH_SESSION', isAuthenticated: true, userId: session.userId, provider: session.provider ?? 'google', email: session.email })
        router.replace('/setup/planning-mode')
      })
      .catch(() => { setStatus('error'); setError('Could not complete sign-in.') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function socialLogin(provider: 'google' | 'apple') {
    setError('')
    setStatus('loading')
    try {
      await signInWithProvider(provider)
    } catch (caught) { setStatus('error'); setError(caught instanceof Error ? caught.message : 'Authentication could not start.') }
  }

  async function submitEmail() {
    setError('')
    if (mode === 'signup' && !name.trim()) return setError('Enter your name.')
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')

    setStatus('loading')
    try {
      const session = mode === 'signup' ? await signUpWithEmail(email, password, name) : await signInWithEmail(email, password)
      if (!session) { setStatus('idle'); setError('Check your email to confirm your account, then sign in.') ; return }
      dispatch({ type: 'SET_AUTH_SESSION', isAuthenticated: true, userId: session.userId, provider: session.provider, name: mode === 'signup' ? name : undefined, email: session.email ?? email })
      router.push('/setup/planning-mode')
    } catch (caught) { setStatus('error'); setError(caught instanceof Error ? caught.message : 'Authentication failed. Try again.') }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-tempo-cream px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-tempo-line bg-white/95 p-7 shadow-soft sm:p-8">
        {mode !== 'landing' && (
          <button onClick={() => { setMode('landing'); setError('') }} className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-tempo-muted">
            <ArrowLeft size={13} /> Back
          </button>
        )}

        <div className="text-center">
          <TempoLogo size="md" showWordmark />
          <h1 className="serif mt-5 text-3xl">Welcome to Tempo</h1>
          <p className="mono mt-1 text-[10px] uppercase tracking-[0.25em] text-tempo-sage">Your priorities, in rhythm.</p>
        </div>

        {mode === 'landing' && (
          <div className="mt-7 space-y-2.5">
            <button
              disabled={status === 'loading'}
              onClick={() => socialLogin('google')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-tempo-line bg-white px-4 py-3 text-sm font-semibold text-tempo-ink disabled:opacity-50"
            >
              {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <GoogleG />} Continue with Google
            </button>
            <button
              disabled={status === 'loading'}
              onClick={() => socialLogin('apple')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-tempo-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Apple size={16} />} Continue with Apple
            </button>
            <button
              disabled={status === 'loading'}
              onClick={() => setMode('signin')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-tempo-line bg-white px-4 py-3 text-sm font-semibold text-tempo-ink disabled:opacity-50"
            >
              <Mail size={16} /> Continue with Email
            </button>

            <div className="pt-3 text-center text-xs text-tempo-muted">
              New here?{' '}
              <button onClick={() => setMode('signup')} className="font-semibold text-tempo-sage">Create account</button>
            </div>
            <p className="pt-2 text-center text-[11px] leading-relaxed text-tempo-muted">Email and configured OAuth providers use Supabase Auth. Provider availability is controlled in your Supabase project.</p>
          </div>
        )}

        {(mode === 'signin' || mode === 'signup') && (
          <div className="mt-6 space-y-3">
            {mode === 'signup' && (
              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="tempo-input" />
              </Field>
            )}
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@school.edu" className="tempo-input" />
            </Field>
            <Field label="Password">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="tempo-input" />
            </Field>

            {error && <p className="text-xs font-medium text-tempo-coral">{error}</p>}

            <button
              disabled={status === 'loading'}
              onClick={submitEmail}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-tempo-sage px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>

            <div className="text-center text-xs text-tempo-muted">
              {mode === 'signin' ? (
                <>Don&apos;t have an account? <button onClick={() => setMode('signup')} className="font-semibold text-tempo-sage">Create one</button></>
              ) : (
                <>Already have an account? <button onClick={() => setMode('signin')} className="font-semibold text-tempo-sage">Sign in</button></>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-tempo-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.85-.08-1.67-.22-2.45H12v4.63h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.8z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.3v3.1C3.26 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.3 6.6l3.99 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
    </svg>
  )
}
