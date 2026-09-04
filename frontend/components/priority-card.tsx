'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Clock3, CheckCircle2, Circle, Timer } from 'lucide-react'
import type { PriorityItem } from '@/lib/types'
import { WhyButton } from '@/components/why-modal'
import { useTempo } from '@/lib/store'
import { focusContextForPriority } from '@/lib/focus'

const colors: Record<PriorityItem['priority'], string> = {
  Critical: 'bg-[#f8d9d5] text-[#a53d36] border-[#efb3ad]',
  High: 'bg-tempo-coralSoft text-tempo-coral border-[#f4c8c3]',
  Medium: 'bg-tempo-amberSoft text-[#a56d0f] border-[#f0dda9]',
  Low: 'bg-tempo-sageSoft text-tempo-sage border-[#cbe1d8]',
}

export function PriorityCard({ item }: { item: PriorityItem }) {
  const { dispatch } = useTempo()
  const router = useRouter()
  const href = item.sourceType === 'application' && item.sourceId ? `/growth/applications/${item.sourceId}` : '/plan'

  function startFocus() {
    dispatch({ type: 'SET_FOCUS_CONTEXT', context: focusContextForPriority(item) })
    router.push('/focus')
  }

  return (
    <div className={`rounded-2xl border bg-white/95 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft ${item.done ? 'border-tempo-line opacity-60' : 'border-tempo-line'}`}>
      <div className="flex items-start gap-3">
        <button
          aria-label={item.done ? 'Mark not done' : 'Mark done'}
          onClick={() => dispatch({ type: 'TOGGLE_PRIORITY_DONE', id: item.id })}
          className="mt-0.5 shrink-0 text-tempo-sage"
        >
          {item.done ? <CheckCircle2 size={19} /> : <Circle size={19} className="text-tempo-muted" />}
        </button>
        <Link href={href} className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${colors[item.priority]}`}>{item.priority} Priority</span>
          <h3 className={`mt-2 text-base font-semibold leading-snug ${item.done ? 'line-through' : ''}`}>{item.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tempo-muted">
            <span className="inline-flex items-center gap-1"><Clock3 size={12} />{item.due}</span>
            <span>{item.time}</span>
            <span>{item.category}</span>
          </div>
        </Link>
        <Link href={href} aria-label="Open"><ChevronRight size={17} className="mt-1 text-tempo-muted" /></Link>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <WhyButton item={item} />
        {!item.done && (
          <button onClick={startFocus} className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-sage">
            <Timer size={13} /> Start Focus
          </button>
        )}
      </div>
    </div>
  )
}
