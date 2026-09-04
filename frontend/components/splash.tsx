'use client'

import { Mascot } from '@/components/mascot'
import { TempoLogo } from '@/components/brand/TempoLogo'

// Minimal, premium splash: official logo fade-in, subtle mascot presence, tagline fade-in.
// No looping/attention-grabbing animation — it should feel calm, not showy.
export function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-tempo-cream px-6">
      <div className="flex flex-col items-center text-center">
        <div className="tempo-splash-logo">
          <TempoLogo size="xl" />
        </div>
        <div className="tempo-splash-mascot mt-4">
          <Mascot size="sm" />
        </div>
        <p className="mono tempo-splash-tagline mt-5 text-[11px] uppercase tracking-[0.3em] text-tempo-sage">
          Your priorities, in rhythm.
        </p>
      </div>
    </div>
  )
}
