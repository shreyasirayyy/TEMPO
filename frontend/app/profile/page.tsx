'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { InstallPwa } from '@/components/install-pwa'
import { STORAGE_KEY, useTempo } from '@/lib/store'
import { signOut, updateProfilePreferences } from '@/lib/services/auth'
import { ChevronRight, Moon, Sparkles, Sun, Timer, Trash2 } from 'lucide-react'

const MODES: { key: 'Gentle' | 'Pressure'; desc: string }[] = [
  { key: 'Gentle', desc: 'A calm approach that helps you plan with balance and flexibility — realistic workload, breathing room.' },
  { key: 'Pressure', desc: 'A focused mode that helps you stay on track with important deadlines — tighter prioritisation, less flexible near deadlines.' },
]

export default function ProfilePage() {
  const { state, dispatch } = useTempo()
  const [feedback, setFeedback] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [authError, setAuthError] = useState('')

  async function savePreference(preferences: { planning_mode?: 'Gentle' | 'Pressure'; theme?: 'light' | 'dark' }) {
    setAuthError('')
    if (!state.auth.userId) return
    try { await updateProfilePreferences(state.auth.userId, preferences) }
    catch (error) { setAuthError(error instanceof Error ? error.message : 'Preference could not be saved.') }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#dbc9bc] text-2xl font-semibold">{state.userName[0]}</div>
          <div className="min-w-0">
            <h1 className="serif truncate text-3xl sm:text-4xl">{state.userName}</h1>
            <p className="text-sm text-tempo-muted">{state.planningMode ?? 'Not set'} mode · {state.focusStreak} day focus streak</p>
          </div>
        </div>

        <Link href="/insights" className="mt-6 flex items-center justify-between gap-3 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-tempo-sageSoft text-tempo-sage"><Sparkles size={18} /></div>
            <div>
              <div className="text-sm font-semibold">Insights</div>
              <div className="text-xs text-tempo-muted">Overloaded days, deadline clusters, planning trends</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-tempo-muted" />
        </Link>

        <Link href="/focus" className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-tempo-sageSoft text-tempo-sage"><Timer size={18} /></div>
            <div>
              <div className="text-sm font-semibold">Focus Mode</div>
              <div className="text-xs text-tempo-muted">{state.focusMinutesToday}m focused today</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-tempo-muted" />
        </Link>

        <section className="mt-6 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card sm:p-6">
          <h2 className="text-sm font-semibold">Planning mode</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => { dispatch({ type: 'SET_PLANNING_MODE', mode: m.key }); void savePreference({ planning_mode: m.key }) }}
                className={`rounded-2xl border p-4 text-left transition ${state.planningMode === m.key ? 'border-tempo-sage bg-tempo-sageSoft' : 'border-tempo-line bg-white'}`}
              >
                <div className="text-sm font-semibold">{m.key}</div>
                <div className="mt-1 text-xs text-tempo-muted">{m.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card sm:p-6">
          <h2 className="text-sm font-semibold">Settings</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tempo-line bg-tempo-cream p-4">
            <div>
              <div className="text-sm font-medium">Install Tempo</div>
              <div className="text-xs text-tempo-muted">Get the standalone app experience with offline support.</div>
            </div>
            <InstallPwa />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tempo-line bg-tempo-cream p-4">
            <div>
              <div className="text-sm font-medium">Appearance</div>
              <div className="text-xs text-tempo-muted">Choose a light or dark interface. Your choice is saved on this device.</div>
            </div>
            <div className="flex gap-2" role="group" aria-label="Theme">
              {(['light', 'dark'] as const).map((theme) => (
                <button key={theme} onClick={() => { dispatch({ type: 'SET_THEME', theme }); void savePreference({ theme }) }} aria-pressed={state.theme === theme} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${state.theme === theme ? 'border-tempo-sage bg-tempo-sageSoft text-tempo-sage' : 'border-tempo-line bg-white text-tempo-muted'}`}>
                  {theme === 'light' ? <Sun size={13} /> : <Moon size={13} />}{theme[0].toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card sm:p-6">
          <h2 className="text-sm font-semibold">Privacy &amp; data controls</h2>
          <ul className="mt-3 space-y-2 text-xs text-tempo-muted">
            <li>• Captures are never saved automatically — you confirm every extraction before it enters Application Memory or your plan.</li>
            <li>• All demo data lives locally in this browser (localStorage) and is never sent anywhere.</li>
            <li>• Screenshots you upload for Application Memory stay on-device in this prototype.</li>
            <li>• Delete individual applications or captures from their own detail/Inbox screens.</li>
          </ul>
          <div className="mt-4">
            {confirmClear ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-tempo-coral">Clear all saved Tempo data on this device? This can&apos;t be undone.</span>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY)
                    window.location.href = '/'
                  }}
                  className="rounded-lg bg-tempo-coral px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Yes, clear
                </button>
                <button onClick={() => setConfirmClear(false)} className="rounded-lg border border-tempo-line px-3 py-1.5 text-xs font-semibold">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-tempo-line px-3 py-1.5 text-xs font-semibold text-tempo-coral">
                  <Trash2 size={13} /> Clear saved data
                </button>
                <button
                  onClick={async () => {
                    setAuthError('')
                    try { await signOut(); dispatch({ type: 'LOGOUT' }); window.location.href = '/auth' }
                    catch (error) { setAuthError(error instanceof Error ? error.message : 'Logout failed. Try again.') }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-tempo-line px-3 py-1.5 text-xs font-semibold text-tempo-muted"
                >
                  Log out
                </button>
                {authError && <p className="basis-full text-xs text-tempo-coral">{authError}</p>}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card sm:p-6">
          <h2 className="text-sm font-semibold">Feedback</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What would make Tempo more useful for you?" className="min-w-0 flex-1 rounded-xl border border-tempo-line px-3 py-2 text-sm outline-none focus:border-tempo-sage" />
            <button disabled title="Feedback submission will be enabled when the backend endpoint is connected" className="cursor-not-allowed rounded-xl border border-tempo-line px-4 py-2 text-sm font-semibold text-tempo-muted opacity-70">Send after backend connection</button>
          </div>
          <p className="mt-2 text-xs text-tempo-muted">Feedback is kept in this form only; it is not submitted until a backend endpoint is connected.</p>
        </section>
      </div>
    </AppShell>
  )
}
