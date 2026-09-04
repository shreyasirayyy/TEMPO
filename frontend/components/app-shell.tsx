'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Search, Plus, Menu, X } from 'lucide-react'
import { Sidebar, MobileNav } from '@/components/sidebar'
import { FixMyDaySheet } from '@/components/fix-my-day'
import { InstallPwa } from '@/components/install-pwa'
import { Sheet } from '@/components/ui/sheet'
import { useTempo } from '@/lib/store'
import { TempoLogo } from '@/components/brand/TempoLogo'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { state } = useTempo()
  const router = useRouter()

  // Guard: any deep-linked app screen sends an incomplete first-time journey
  // back to the right step instead of exposing the product underneath it.
  useEffect(() => {
    if (!state.hydrated) return
    if (!state.auth.hasCompletedOnboarding) router.replace('/onboarding')
    else if (!state.auth.isAuthenticated) router.replace('/auth')
    else if (!state.auth.hasSelectedPlanningMode) router.replace('/setup/planning-mode')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, state.auth.hasCompletedOnboarding, state.auth.isAuthenticated, state.auth.hasSelectedPlanningMode])

  const journeyComplete = state.auth.hasCompletedOnboarding && state.auth.isAuthenticated && state.auth.hasSelectedPlanningMode
  if (!state.hydrated || !journeyComplete) return null

  const pendingCaptures = state.captures.filter((c) => c.status === 'pending')
  const upcomingDeadlines = state.applications.filter((a) => a.deadlineAt != null && a.deadlineAt > Date.now() && a.deadlineAt <= Date.now() + 48 * 3600000)

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 bg-tempo-cream">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-tempo-line bg-tempo-panel/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <button aria-label="Menu" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
            <Link href="/" aria-label="Tempo home"><TempoLogo size="xs" /></Link>
          </div>
          <div className="hidden max-w-md flex-1 md:block">
            <div className="flex items-center gap-2 rounded-xl border border-tempo-line bg-white px-3 py-2 text-sm text-tempo-muted">
              <Search size={15} /><span>Search anything…</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block"><InstallPwa /></div>
            <Link href="/capture" className="hidden items-center gap-2 rounded-xl bg-tempo-sage px-3 py-2 text-sm font-semibold text-white shadow-sm sm:flex">
              <Plus size={16} /> Capture
            </Link>
            <button
              onClick={() => setNotifOpen(true)}
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-tempo-line bg-white text-tempo-muted"
            >
              <Bell size={16} />
              {(pendingCaptures.length + upcomingDeadlines.length) > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-tempo-coral text-[9px] font-bold text-white">
                  {pendingCaptures.length + upcomingDeadlines.length}
                </span>
              )}
            </button>
          </div>
        </header>
        {state.dataError && <div className="border-b border-tempo-coral/30 bg-tempo-coralSoft px-4 py-2 text-xs text-tempo-coral md:px-8"><strong>Sync issue:</strong> {state.dataError}</div>}
        <main className="tempo-grid min-h-[calc(100vh-64px)]">{children}</main>
      </div>
      <MobileNav />
      <FixMyDaySheet />

      {/* Mobile slide-in menu — same Sidebar content, shown as an overlay only below md */}
      {mobileMenu && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setMobileMenu(false)}>
          <div className="h-full w-72 bg-tempo-panel shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4">
              <Link href="/" aria-label="Tempo home"><TempoLogo size="sm" showWordmark /></Link>
              <button onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={20} /></button>
            </div>
            <Sidebar variant="inline" onNavigate={() => setMobileMenu(false)} />
          </div>
          <div className="flex-1 bg-tempo-ink/25" />
        </div>
      )}

      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title="Notifications" eyebrow="Tempo">
        {pendingCaptures.length === 0 && upcomingDeadlines.length === 0 && (
          <p className="text-sm text-tempo-muted">You&apos;re all caught up. Nothing needs your attention right now.</p>
        )}
        {pendingCaptures.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold text-tempo-muted">Awaiting confirmation</div>
            <div className="space-y-2">
              {pendingCaptures.map((c) => (
                <Link key={c.id} href="/inbox" onClick={() => setNotifOpen(false)} className="block rounded-xl border border-tempo-line bg-white px-3 py-2.5 text-sm">
                  {c.extracted?.kind === 'application' ? `${c.extracted.company} — ${c.extracted.role}` : c.extracted?.title ?? 'New capture'}
                  <div className="text-xs text-tempo-muted">Review in Inbox</div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {upcomingDeadlines.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold text-tempo-muted">Deadlines in the next 48h</div>
            <div className="space-y-2">
              {upcomingDeadlines.map((a) => (
                <Link key={a.id} href={`/growth/applications/${a.id}`} onClick={() => setNotifOpen(false)} className="block rounded-xl border border-tempo-line bg-white px-3 py-2.5 text-sm">
                  {a.company} — {a.role}
                  <div className="text-xs text-tempo-muted">Due {a.deadline}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
