'use client'

import { useEffect, useState } from 'react'
import { Download, Share } from 'lucide-react'

// Real beforeinstallprompt handling where supported (Chrome/Edge/Android).
// Falls back to honest platform-specific instructions instead of a fake button
// when the browser gives us no installability signal (iOS Safari, already installed, etc).
export function InstallPwa({ variant = 'button' }: { variant?: 'button' | 'menu-item' }) {
  const [promptEvent, setPromptEvent] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setInstalled(true))

    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream)
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (installed || standalone) return null

  const label = variant === 'menu-item' ? 'Install Tempo app' : 'Install Tempo'

  if (promptEvent) {
    return (
      <button
        onClick={async () => {
          promptEvent.prompt()
          await promptEvent.userChoice
          setPromptEvent(null)
        }}
        className={
          variant === 'menu-item'
            ? 'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-tempo-ink hover:bg-[#f5f1e9]'
            : 'inline-flex items-center gap-2 rounded-xl border border-tempo-line bg-white px-3 py-2 text-xs font-semibold text-tempo-ink shadow-sm'
        }
      >
        <Download size={14} /> {label}
      </button>
    )
  }

  if (isIOS) {
    return (
      <div className={variant === 'menu-item' ? 'rounded-xl bg-tempo-sageSoft px-3 py-2.5 text-xs text-tempo-ink' : 'text-[11px] text-tempo-muted'}>
        <span className="inline-flex items-center gap-1 font-medium"><Share size={12} /> Add to Home Screen</span>
        <div className="mt-0.5">Tap Share, then &quot;Add to Home Screen&quot; to install Tempo.</div>
      </div>
    )
  }

  // No install signal available yet (desktop browser without support, or criteria not met).
  return null
}
