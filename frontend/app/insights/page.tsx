'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { todayKey } from '@/lib/date'
import { useTempo } from '@/lib/store'
import { AlertTriangle, CalendarClock, Layers, TrendingUp, History } from 'lucide-react'

export default function InsightsPage() {
  const { state } = useTempo()

  const byDay: Record<string, number> = {}
  state.plan.forEach((b) => { byDay[b.day] = (byDay[b.day] ?? 0) + 1 })
  const overloadedDays = Object.entries(byDay).filter(([, n]) => n >= 5)

  const sortedDeadlines = state.applications.filter((a) => a.deadlineAt != null).slice().sort((a, b) => (a.deadlineAt ?? Infinity) - (b.deadlineAt ?? Infinity))
  const clusters: string[] = []
  for (let i = 0; i < sortedDeadlines.length - 1; i++) {
    const gapDays = ((sortedDeadlines[i + 1].deadlineAt ?? 0) - (sortedDeadlines[i].deadlineAt ?? 0)) / (1000 * 60 * 60 * 24)
    if (gapDays >= 0 && gapDays <= 3) {
      clusters.push(`${sortedDeadlines[i].company} and ${sortedDeadlines[i + 1].company} deadlines are within ${Math.round(gapDays)} day(s) of each other.`)
    }
  }

  const followUps = state.applications.filter((a) => a.followUpDate)
  const atRisk = state.plan.filter((b) => b.day === todayKey() && !b.done)

  // §17 real trend data -- last 7 recorded days (excludes today, which is
  // still in progress and would skew an average downward).
  const history = [...state.dailySnapshots].sort((a, b) => b.date.localeCompare(a.date)).filter((entry) => entry.date !== todayKey()).slice(0, 7)
  const avgFocusMinutes = history.length ? Math.round(history.reduce((sum, entry) => sum + entry.focusMinutes, 0) / history.length) : null
  const overloadedRecentDays = history.filter((entry) => entry.overloadedDay).length
  const totalCompleted = history.reduce((sum, entry) => sum + entry.completedCount, 0)
  const totalPostponed = history.reduce((sum, entry) => sum + entry.postponedCount, 0)

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="max-w-2xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Profile</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Insights</h1>
          <p className="mt-2 text-sm text-tempo-muted">A light read on how your week is actually going — nothing to obsess over.</p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <InsightCard icon={Layers} title="Overloaded days">
            {overloadedDays.length ? (
              <ul className="space-y-1 text-xs text-tempo-muted">
                {overloadedDays.map(([day, n]) => <li key={day}>• {day.toUpperCase()} has {n} planned blocks — consider spreading some out.</li>)}
              </ul>
            ) : <p className="text-xs text-tempo-muted">No day looks overloaded this week.</p>}
          </InsightCard>

          <InsightCard icon={AlertTriangle} title="Deadline clusters">
            {clusters.length ? (
              <ul className="space-y-1 text-xs text-tempo-muted">{clusters.map((c) => <li key={c}>• {c}</li>)}</ul>
            ) : <p className="text-xs text-tempo-muted">Your application deadlines are well spread out.</p>}
          </InsightCard>

          <InsightCard icon={CalendarClock} title="Application follow-ups">
            {followUps.length ? (
              <ul className="space-y-1 text-xs text-tempo-muted">
                {followUps.map((a) => (
                  <li key={a.id}>
                    <Link href={`/growth/applications/${a.id}`} className="text-tempo-sage hover:underline">{a.company}</Link> · follow up {a.followUpDate}
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-tempo-muted">Nothing scheduled to follow up on.</p>}
          </InsightCard>

          <InsightCard icon={TrendingUp} title="Planning trends">
            <ul className="space-y-1 text-xs text-tempo-muted">
              <li>• {state.focusMinutesToday}m focused today · {state.focusStreak}-day streak</li>
              <li>• {atRisk.length} item(s) still open on today&apos;s plan</li>
              <li>• {state.applications.length} applications tracked in Application Memory</li>
            </ul>
          </InsightCard>

          <InsightCard icon={History} title={`Over the last ${history.length || 0} day${history.length === 1 ? '' : 's'}`}>
            {history.length ? (
              <ul className="space-y-1 text-xs text-tempo-muted">
                <li>• Averaging {avgFocusMinutes}m of focus time per day</li>
                <li>• {totalCompleted} item{totalCompleted === 1 ? '' : 's'} completed, {totalPostponed} still sitting past their deadline</li>
                <li>
                  {overloadedRecentDays > 0
                    ? `• Overloaded on ${overloadedRecentDays} of the last ${history.length} days — worth easing up if that keeps happening.`
                    : '• No overloaded days recently — your plan has been staying realistic.'}
                </li>
              </ul>
            ) : (
              <p className="text-xs text-tempo-muted">Keep using Tempo day to day — this fills in with real trends instead of a single snapshot.</p>
            )}
          </InsightCard>
        </div>
      </div>
    </AppShell>
  )
}

function InsightCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-tempo-sageSoft text-tempo-sage"><Icon size={15} /></div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
