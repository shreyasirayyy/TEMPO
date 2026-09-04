'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Mascot } from '@/components/mascot'
import { TempoLogo } from '@/components/brand/TempoLogo'
import { useTempo } from '@/lib/store'

const SLIDES = [
  {
    title: 'Plan with what matters most',
    body: 'Tempo helps you prioritise, plan and adapt — without adding more pressure.',
  },
  {
    title: 'Drop anything.',
    body: 'Screenshot a message, paste a deadline, upload a file, or simply tell Tempo what you need to do.',
  },
  {
    title: 'When life changes, your plan can too.',
    body: 'Tempo adjusts what needs to move while keeping the rest of your day intact.',
  },
]

export default function OnboardingPage() {
  const { state, dispatch } = useTempo()
  const router = useRouter()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!state.hydrated) return
    // Returning users, or anyone deep-linking here after already onboarding, skip ahead.
    if (state.auth.hasCompletedOnboarding) {
      if (!state.auth.isAuthenticated) router.replace('/auth')
      else if (!state.auth.hasSelectedPlanningMode) router.replace('/setup/planning-mode')
      else router.replace('/')
    }
  }, [state.hydrated, state.auth, router])

  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]

  function finish() {
    dispatch({ type: 'COMPLETE_ONBOARDING' })
    router.push('/auth')
  }

  return (
    <div className="flex min-h-screen flex-col bg-tempo-cream px-6 pb-10 pt-8 safe-area-top">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <TempoLogo size="xs" showWordmark />
          {!isLast && (
            <button onClick={finish} className="text-xs font-semibold text-tempo-muted">
              Skip
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot size="lg" />
          <h1 className="serif mt-6 text-3xl leading-tight sm:text-4xl">{slide.title}</h1>
          <p className="mt-3 max-w-xs text-sm text-tempo-muted">{slide.body}</p>
        </div>

        <div className="mb-6 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-tempo-sage' : 'w-1.5 bg-tempo-line'}`} />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="rounded-xl border border-tempo-line bg-white px-5 py-3 text-sm font-semibold text-tempo-ink">
              Back
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tempo-sage px-5 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tempo-sage px-5 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Let&apos;s set up your Tempo — Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
