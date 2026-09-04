'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useTempo } from '@/lib/store'
import { getAttendanceRisk, selectLearningTrack } from '@/lib/relevance'
import { BriefcaseBusiness, ChevronRight, GraduationCap, Sparkles, Target } from 'lucide-react'

export default function GrowthPage() {
  const { state } = useTempo()
  const attentionCourse = getAttendanceRisk(state.courses)
  const learning = selectLearningTrack(state.learning, state.plan)
  const activeApps = state.applications.filter((a) => a.status !== 'Rejected' && a.status !== 'Offer').length

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="max-w-2xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Growth</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Everything that helps you move forward.</h1>
          <p className="mt-2 text-sm text-tempo-muted">
            Career direction shapes what you learn and where you apply. Academics and applications both feed straight into your Plan — nothing here lives in its own silo.
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <GrowthTile
            href="/growth/learning"
            icon={Sparkles}
            title="Learning"
            desc="Tempo Learn — turn goals and resources into a real study session."
            stat={learning ? `${learning.name} ${learning.progress}%` : 'No learning sessions yet'}
          />
          <GrowthTile
            href="/growth/academics"
            icon={GraduationCap}
            title="Academics"
            desc="Timetable, assignments, exams and attendance as planning context."
            stat={attentionCourse ? `${attentionCourse.name} ${attentionCourse.pct}% needs attention` : 'Attendance on track'}
          />
          <GrowthTile
            href="/growth/career"
            icon={Target}
            title="Career"
            desc="Target role, skill map, and where the gaps actually are."
            stat={`${state.goals.length} active goal${state.goals.length === 1 ? '' : 's'}`}
          />
          <GrowthTile
            href="/growth/applications"
            icon={BriefcaseBusiness}
            title="Applications"
            desc="Application Memory — remembered, not re-typed, and tied to your plan."
            stat={`${activeApps} active`}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-tempo-line bg-white/70 p-5 text-xs text-tempo-muted sm:p-6">
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.28em] text-tempo-sage">How it connects</p>
          <ul className="space-y-1.5">
            <li>Career goals shape what shows up in Learning and which applications are worth prioritizing.</li>
            <li>Academic attendance risk and Application deadlines both flow into Home and the Priority Engine.</li>
            <li>A Learning session can turn straight into a Focus session or a block on your Plan.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  )
}

function GrowthTile({ href, icon: Icon, title, desc, stat }: { href: string; icon: any; title: string; desc: string; stat: string }) {
  return (
    <Link href={href} className="flex items-start gap-4 rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5 sm:p-6">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tempo-sageSoft text-tempo-sage"><Icon size={20} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold">{title}</div>
          <ChevronRight size={17} className="shrink-0 text-tempo-muted" />
        </div>
        <p className="mt-1 text-xs text-tempo-muted">{desc}</p>
        {stat && <div className="mt-3 inline-block rounded-full bg-tempo-cream px-2.5 py-1 text-[11px] font-semibold text-tempo-ink">{stat}</div>}
      </div>
    </Link>
  )
}
