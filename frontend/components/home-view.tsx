'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3, CheckCircle2, Circle, Timer, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { FixMyDayTrigger } from '@/components/fix-my-day'
import { Mascot } from '@/components/mascot'
import { PriorityCard } from '@/components/priority-card'
import { focusContextForPriority } from '@/lib/focus'
import { greetingForTime, todayKey } from '@/lib/date'
import { formatMinutes } from '@/lib/planTime'
import { useTempo, useUsableMinutesToday } from '@/lib/store'
import { getAttendanceRisk, getRelevantApplications, selectLearningTrack } from '@/lib/relevance'
import { tryHomeSummary, buildFallbackSummary, type HomeSignals } from '@/lib/ai/homeSummary'
import type { PriorityItem } from '@/lib/types'

function fallbackFocusPriority(top: PriorityItem[]): PriorityItem | null {
  return top.find((item) => item.category !== 'Personal') ?? top[0] ?? null
}

export function HomeView() {
  const { state, dispatch } = useTempo()
  const top = [...state.priorities].filter((priority) => !priority.done).sort((a, b) => b.score - a.score || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)).slice(0, 3)
  const todayBlocks = state.plan.filter((block) => block.day === todayKey()).sort((a, b) => a.time.localeCompare(b.time))
  const usableMinutes = useUsableMinutesToday()
  const usableLabel = formatMinutes(usableMinutes)
  const greeting = greetingForTime()
  const upcomingApplications = getRelevantApplications(state.applications)
  const attentionCourse = getAttendanceRisk(state.courses)
  const learning = selectLearningTrack(state.learning, state.plan)
  const focusPriority = fallbackFocusPriority(top)
  const focusContext = state.focusContext ?? (focusPriority ? focusContextForPriority(focusPriority) : null)
  const focusLabel = focusContext?.title ?? 'Choose one thing to focus on'

  // §1 Home summary: build the same signals either the LLM prompt or the
  // deterministic fallback reasons over, so both paths answer "what matters
  // now" from identical inputs.
  const homeSignals: HomeSignals = {
    studentName: state.userName || undefined,
    usableMinutesToday: usableMinutes,
    planningMode: state.planningMode,
    topPriority: top[0] ? { title: top[0].title, category: top[0].category, priority: top[0].priority, due: top[0].due } : null,
    secondaryPriority: top[1] ? { title: top[1].title, priority: top[1].priority, due: top[1].due } : null,
    attendanceRisk: attentionCourse ? { courseName: attentionCourse.name, pct: attentionCourse.pct, target: attentionCourse.target, needToAttend: attentionCourse.needToAttend } : null,
    urgentApplication: upcomingApplications[0] ? { company: upcomingApplications[0].company, role: upcomingApplications[0].role, status: upcomingApplications[0].status, deadline: upcomingApplications[0].deadline } : null,
    learningTrack: learning ? { name: learning.name, nextSession: learning.nextSession } : null,
  }
  const [homeSummary, setHomeSummary] = useState<string>(() => buildFallbackSummary(homeSignals))
  const signalsKey = JSON.stringify(homeSignals)

  useEffect(() => {
    let cancelled = false
    tryHomeSummary(homeSignals).then((summary) => {
      if (cancelled) return
      setHomeSummary(summary ?? buildFallbackSummary(homeSignals))
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalsKey])

  function startFocus() {
    if (focusContext) dispatch({ type: 'SET_FOCUS_CONTEXT', context: { ...focusContext, selectedAt: Date.now() } })
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Today</p>
            <h1 className="serif mt-2 text-4xl leading-tight sm:text-5xl">{greeting}, {state.userName || 'there'}.</h1>
            <p className="mt-2 text-sm text-tempo-muted">
              You&apos;ve got <strong className="text-tempo-ink">{usableLabel}</strong> of usable time left today.
              {state.planningMode === 'Gentle' && ' Plenty of room to breathe.'}
              {state.planningMode === 'Pressure' && ' Deadlines are front and center.'}
            </p>
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-tempo-line bg-tempo-sage/10 px-4 py-3 text-sm text-tempo-ink">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-tempo-sage" />
              <span>{homeSummary}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <FixMyDayTrigger />
            <Link href="/plan" className="hidden items-center gap-1 text-sm font-semibold text-tempo-sage sm:inline-flex">
              View full plan <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">What matters now</h2>
                <p className="text-xs text-tempo-muted">Ranked by the same context that powers your plan.</p>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <Mascot size="sm" />
                <span className="text-xs text-tempo-muted">Your plan can change. That&apos;s okay.</span>
              </div>
            </div>
            {top.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-tempo-line bg-white/70 p-8 text-center">
                <Mascot />
                <p className="mt-3 text-sm font-semibold">Nothing urgent right now.</p>
                <p className="mt-1 text-xs text-tempo-muted">Nice work — capture something new or take a break.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {top.map((item) => <PriorityCard key={item.id} item={item} />)}
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Today&apos;s plan</h2>
                <p className="mt-1 text-xs text-tempo-muted">Balanced around your top priorities.</p>
              </div>
              <Clock3 size={18} className="text-tempo-sage" />
            </div>
            <div className="mt-5 space-y-3">
              {todayBlocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-tempo-line bg-tempo-cream/60 p-6 text-center text-xs text-tempo-muted">Nothing scheduled yet today. Capture something or open Plan to add a block.</div>
              ) : todayBlocks.map((block) => (
                <button key={block.id} onClick={() => dispatch({ type: 'TOGGLE_BLOCK_DONE', id: block.id })} className="flex w-full items-center gap-3 rounded-2xl border border-tempo-line bg-tempo-cream px-3 py-3 text-left">
                  <div className="mono w-12 shrink-0 text-[10px] text-tempo-muted">{block.time}</div>
                  <div className={`min-w-0 flex-1 truncate text-sm font-medium ${block.done ? 'text-tempo-muted line-through' : ''}`}>{block.title}</div>
                  {block.done ? <CheckCircle2 size={16} className="shrink-0 text-tempo-sage" /> : <Circle size={16} className="shrink-0 text-tempo-muted" />}
                </button>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-8">
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.28em] text-tempo-sage">What changed · alerts</p>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard title="Application Deadlines" value={upcomingApplications.length ? `${upcomingApplications.length} relevant` : 'Nothing due soon'} href="/growth/applications">
              {upcomingApplications.length === 0 ? <p className="py-1.5 text-xs text-tempo-muted">No upcoming deadline or follow-up needs attention.</p> : upcomingApplications.map((app) => <div key={app.id} className="flex items-center justify-between gap-2 py-1.5 text-xs"><span className="min-w-0 truncate">{app.company || 'Application needs review'} · {app.role || 'Role needs review'}</span><span className="shrink-0 text-tempo-muted">{app.deadline || 'needs review'}</span></div>)}
            </MetricCard>
            <MetricCard title="Attendance Alert" value={attentionCourse ? `${attentionCourse.name} · ${attentionCourse.pct}%` : 'On track'} href="/growth/academics">
              {attentionCourse ? <><p className="mt-2 text-xs text-tempo-muted">{attentionCourse.unreachable ? `Even attending every remaining class may not reach ${attentionCourse.target}%.` : `Attend the next ${attentionCourse.needToAttend} classes to stay above ${attentionCourse.target}%.`}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eceae3]"><div className="h-full rounded-full bg-tempo-coral" style={{ width: `${attentionCourse.pct}%` }} /></div></> : <p className="mt-2 text-xs text-tempo-muted">No course currently needs attention.</p>}
            </MetricCard>
          </div>
        </section>

        <section className="mt-6">
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Context · focus</p>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard title="Learning Progress" value={learning ? `${learning.name} · ${learning.progress}%` : 'No learning session'} href="/growth/learning">
              {state.learning.length === 0 ? <p className="py-1.5 text-xs text-tempo-muted">No active learning tracks yet. Add one when you are ready.</p> : <div className="space-y-3">{state.learning.map((track) => <Progress key={track.id} label={track.name} value={track.progress} />)}</div>}
            </MetricCard>
            <MetricCard title="Focus" value={focusLabel} href="/focus" onOpen={startFocus}>
              {focusContext ? <><p className="text-sm text-tempo-ink">{state.focusMinutesToday ? `${state.focusMinutesToday}m completed today` : 'Ready for a focused session'}</p><p className="mt-1 text-xs text-tempo-muted">Continue with the selected context, or choose another item from Plan.</p></> : <p className="text-xs text-tempo-muted">Start from a priority or scheduled block to keep Focus connected to your plan.</p>}
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-tempo-sage"><Timer size={13} /> Start Focus</div>
            </MetricCard>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function MetricCard({ title, value, href, children, onOpen }: { title: string; value: string; href: string; children: React.ReactNode; onOpen?: () => void }) {
  return <div className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="text-xs text-tempo-muted">{title}</div><div className="mt-1 truncate text-lg font-semibold">{value}</div></div><Link href={href} onClick={onOpen} className="shrink-0 text-xs font-semibold text-tempo-sage">Open</Link></div><div className="mt-4">{children}</div></div>
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div><div className="flex justify-between text-xs"><span>{label}</span><span className="text-tempo-muted">{value}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eceae3]"><div className="h-full rounded-full bg-tempo-sage" style={{ width: `${value}%` }} /></div></div>
}
