'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Splash } from '@/components/splash'
import { HomeView } from '@/components/home-view'
import { useTempo } from '@/lib/store'

const SPLASH_SESSION_KEY = 'tempo-splash-shown'

// Entry gate for "/". Decides, from shared+persisted auth/onboarding state,
// whether this is a fresh user (→ onboarding → auth → planning mode) or a
// returning user (→ straight to Home) — never hardcoded page redirects.
export default function RootPage() {
  const { state } = useTempo()
  const router = useRouter()
  const [splashDone, setSplashDone] = useState(false)
  const decided = useRef(false)

  const journeyComplete = state.auth.hasCompletedOnboarding && state.auth.isAuthenticated && state.auth.hasSelectedPlanningMode

  useEffect(() => {
    if (!state.hydrated || decided.current) return
    decided.current = true

    // FIX: a returning, fully set-up user (onboarded + authenticated +
    // planning mode chosen) should never replay the splash/gate check.
    // Without this, every client-side navigation back to "/" (e.g.
    // clicking "Home" in the sidebar) remounted this component, resetting
    // `decided`/`splashDone`, and briefly re-ran the splash timer + gate
    // logic below -- which felt like "onboarding reopening" even though it
    // ultimately resolved back to Home. Short-circuit immediately instead.
    if (journeyComplete) {
      setSplashDone(true)
      return
    }

    const alreadyShownThisSession = typeof window !== 'undefined' && sessionStorage.getItem(SPLASH_SESSION_KEY)
    const delay = alreadyShownThisSession ? 250 : 1400

    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1')
      setSplashDone(true)
      if (!state.auth.hasCompletedOnboarding) {
        router.replace('/onboarding')
      } else if (!state.auth.isAuthenticated) {
        router.replace('/auth')
      } else if (!state.auth.hasSelectedPlanningMode) {
        router.replace('/setup/planning-mode')
      }
      // otherwise: stay on "/" — HomeView renders below
    }, delay)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, journeyComplete])

  if (!state.hydrated) return <Splash />
  if (journeyComplete) return <HomeView />
  if (!splashDone) return <Splash />
  return <Splash />
}