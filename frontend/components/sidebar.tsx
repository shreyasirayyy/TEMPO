'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Sparkles,
  Target,
  User,
} from 'lucide-react'
import { useTempo } from '@/lib/store'
import { InstallPwa } from '@/components/install-pwa'
import { TempoLogo } from '@/components/brand/TempoLogo'

const primaryItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/plan', label: 'Plan', icon: CalendarDays },
  { href: '/capture', label: 'Capture', icon: Plus },
]

const growthItems = [
  { href: '/growth/learning', label: 'Learning', icon: Sparkles },
  { href: '/growth/academics', label: 'Academics', icon: GraduationCap },
  { href: '/growth/career', label: 'Career', icon: Target },
  { href: '/growth/applications', label: 'Applications', icon: BriefcaseBusiness },
]

function useInboxCount() {
  const { state } = useTempo()
  return state.captures.filter((c) => c.status === 'pending').length
}

export function Sidebar({ variant = 'fixed', onNavigate }: { variant?: 'fixed' | 'inline'; onNavigate?: () => void }) {
  const pathname = usePathname()
  const inboxCount = useInboxCount()
  const { state } = useTempo()

  const wrapperClass =
    variant === 'fixed'
      ? 'hidden w-64 shrink-0 border-r border-tempo-line bg-tempo-panel md:flex md:flex-col'
      : 'flex h-[calc(100%-64px)] w-full flex-col overflow-y-auto'

  const isGrowthActive = pathname.startsWith('/growth')

  return (
    <aside className={wrapperClass}>
      {variant === 'fixed' && (
        <div className="px-6 pb-4 pt-7">
          <Link href="/" className="block" aria-label="Tempo home">
            <TempoLogo size="sm" showWordmark wordmarkClassName="text-[28px]" />
            <div className="mono mt-2 pl-11 text-[8px] uppercase tracking-widest text-tempo-muted">Your priorities, in rhythm.</div>
          </Link>
        </div>
      )}
      <nav className="space-y-1 px-3 pt-3">
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active ? 'bg-tempo-sageSoft font-semibold text-tempo-ink' : 'text-tempo-muted hover:bg-[#f5f1e9] hover:text-tempo-ink'
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          )
        })}

        <div className={`mt-1 rounded-xl px-3 py-2.5 text-sm ${isGrowthActive ? 'bg-tempo-sageSoft' : ''}`}>
          <div className="flex items-center gap-3 font-semibold text-tempo-ink">
            <Target size={16} strokeWidth={1.8} />
            <span>Growth</span>
            {inboxCount > 0 && <span className="ml-auto rounded-full bg-[#f0b0a8] px-2 py-0.5 text-[10px] font-bold text-white">{inboxCount}</span>}
          </div>
          <div className="mt-1.5 space-y-0.5 pl-7">
            {growthItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                    active ? 'font-semibold text-tempo-sage' : 'text-tempo-muted hover:text-tempo-ink'
                  }`}
                >
                  <Icon size={13} strokeWidth={1.8} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        <Link
          href="/profile"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            pathname === '/profile' || pathname === '/insights' ? 'bg-tempo-sageSoft font-semibold text-tempo-ink' : 'text-tempo-muted hover:bg-[#f5f1e9] hover:text-tempo-ink'
          }`}
        >
          <User size={16} strokeWidth={1.8} />
          <span>Profile</span>
        </Link>
      </nav>
      <div className="mt-auto border-t border-tempo-line p-4">
        <div className="mb-3"><InstallPwa variant="menu-item" /></div>
        <Link href="/profile" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f5f1e9]">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dbc9bc] text-sm font-semibold">{state.userName[0]?.toUpperCase() ?? '?'}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{state.userName || 'Your profile'}</div>
            <div className="text-xs text-tempo-muted">{state.planningMode} mode</div>
          </div>
        </Link>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const isGrowthActive = pathname.startsWith('/growth')

  const item = (href: string, label: string, Icon: any, active: boolean) => (
    <Link key={href} href={href} className={`flex min-w-[56px] flex-col items-center gap-1 py-2 text-[10px] ${active ? 'font-semibold text-tempo-sage' : 'text-tempo-muted'}`}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around border-t border-tempo-line bg-[#fffdf9]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {item('/', 'Home', LayoutDashboard, pathname === '/')}
      {item('/plan', 'Plan', CalendarDays, pathname === '/plan')}
      <Link href="/capture" className="-mt-8 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-tempo-sage text-white shadow-soft ring-4 ring-[#fffdf9]">
        <Plus size={22} />
      </Link>
      {item('/growth', 'Growth', Target, isGrowthActive)}
      {item('/profile', 'Profile', User, pathname === '/profile' || pathname === '/insights')}
    </nav>
  )
}
