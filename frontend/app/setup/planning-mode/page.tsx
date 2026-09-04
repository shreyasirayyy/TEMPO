'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Leaf, Zap } from 'lucide-react'
import { useTempo } from '@/lib/store'
import { TempoLogo } from '@/components/brand/TempoLogo'

const OPTIONS = [
  {
    key: 'Gentle' as const,
    icon: Leaf,
    title: 'Gentle',
    desc: 'A calm approach that helps you plan with balance and flexibility.',
    points: ['Balanced schedule', 'Breathing room', 'Realistic workload', 'Avoids overloading the day'],
  },
  {
    key: 'Pressure' as const,
    icon: Zap,
    title: 'Pressure',
    desc: 'A focused mode that helps you stay on track with important deadlines.',
    points: ['Stronger deadline emphasis', 'Tighter prioritisation', 'Focus on urgent commitments', 'Less flexible near deadlines'],
  },
]

export default function PlanningModeSetupPage() {
  const { state, dispatch } = useTempo()
  const router = useRouter()
  const [selected, setSelected] = useState<'Gentle' | 'Pressure' | null>(state.planningMode)

  useEffect(() => {
    if (!state.hydrated) return
    if (!state.auth.hasCompletedOnboarding) router.replace('/onboarding')
    else if (!state.auth.isAuthenticated) router.replace('/auth')
  }, [state.hydrated, state.auth, router])

  function proceed() {
    if (!selected) return
    dispatch({ type: 'SET_PLANNING_MODE', mode: selected })
    router.push('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tempo-cream px-6 py-10 safe-area-top safe-area-bottom">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <TempoLogo size="sm" showWordmark />
          <div className="mono mt-6 text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Almost there</div>
          <h1 className="serif mt-2 text-3xl sm:text-4xl">How do you want to plan today?</h1>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = selected === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className={`rounded-3xl border-2 p-6 text-left transition ${active ? 'border-tempo-sage bg-white shadow-soft' : 'border-tempo-line bg-white/70'}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? 'bg-tempo-sageSoft text-tempo-sage' : 'bg-tempo-cream text-tempo-muted'}`}>
                    <Icon size={20} />
                  </div>
                  {active && <CheckCircle2 size={20} className="text-tempo-sage" />}
                </div>
                <div className="mt-4 text-xl font-semibold">{opt.title}</div>
                <p className="mt-1.5 text-sm text-tempo-muted">{opt.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {opt.points.map((p) => (
                    <li key={p} className="text-xs text-tempo-muted">• {p}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <button
          disabled={!selected}
          onClick={proceed}
          className="mt-7 w-full rounded-xl bg-tempo-sage px-5 py-3.5 text-sm font-semibold text-white shadow-soft transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
        <p className="mt-3 text-center text-xs text-tempo-muted">I can change this later, from Profile.</p>
      </div>
    </div>
  )
}
