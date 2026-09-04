'use client'

import { Check, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/sheet'
import { dayLabel, todayKey } from '@/lib/date'
import { useTempo } from '@/lib/store'

function useContextualReason(explicitReason?: string): string {
  const { state } = useTempo()
  if (explicitReason) return explicitReason
  const urgent = [...state.priorities]
    .filter((priority) => !priority.done)
    .sort((a, b) => b.score - a.score || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))[0]
  if (!urgent) return 'Rebalancing today to keep the workload realistic.'
  return urgent.dueAt != null && urgent.dueAt <= Date.now() + 48 * 3600000
    ? `“${urgent.title}” is due soon — protecting a feasible slot for it.`
    : `Rebalancing today around “${urgent.title}” while keeping fixed commitments intact.`
}

export function FixMyDayTrigger({ reason }: { reason?: string }) {
  const { dispatch } = useTempo()
  const computedReason = useContextualReason(reason)
  return <button onClick={() => dispatch({ type: 'REQUEST_FIX_MY_DAY', reason: computedReason })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-tempo-sage px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"><Sparkles size={16} /> Fix My Day</button>
}

export function FixMyDaySheet() {
  const { state, dispatch } = useTempo()
  const router = useRouter()
  const suggestion = state.activeFixSuggestion
  const changeFor = (blockId: string) => suggestion?.changes.find((change) => change.blockId === blockId)

  return (
    <Sheet open={!!suggestion} onClose={() => dispatch({ type: 'DISMISS_FIX_SUGGESTION' })} title="Fix My Day" eyebrow="Adaptive planning" maxWidth="max-w-2xl">
      {suggestion && <>
        <div className="rounded-2xl border border-[#efd4a9] bg-[#fff8e9] p-4 text-sm"><strong>{suggestion.reason}</strong><div className="mt-1 text-tempo-muted">Tempo keeps fixed commitments, protects higher-priority work, and only moves a block when a feasible non-overlapping slot exists.</div></div>
        <div className="my-5 grid gap-3 sm:grid-cols-2">
          {state.plan.filter((block) => block.day === todayKey() && changeFor(block.id)).map((block) => {
            const change = changeFor(block.id)!
            const nextDay = change.day ?? block.day
            return <div key={block.id} className="rounded-2xl border border-tempo-line bg-white p-4"><div className="flex items-center justify-between gap-2"><span className="mono text-[10px] font-semibold text-tempo-muted">{change.tag.toUpperCase()}</span><span className="text-right text-xs text-tempo-muted">{dayLabel(nextDay)} · {change.time ?? block.time}</span></div><div className="mt-2 font-semibold">{block.title}</div><div className="mt-1 text-xs text-tempo-muted">{change.reason ?? `${block.kind} · ${block.flexibility}`}</div></div>
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row"><button onClick={() => dispatch({ type: 'ACCEPT_FIX_SUGGESTION' })} className="flex-1 rounded-xl bg-tempo-sage px-4 py-3 text-sm font-semibold text-white"><Check size={16} className="mr-1 inline" /> Accept changes</button><button onClick={() => { dispatch({ type: 'DISMISS_FIX_SUGGESTION' }); router.push('/plan') }} className="flex-1 rounded-xl border border-tempo-line px-4 py-3 text-sm font-semibold">Adjust manually</button></div>
      </>}
    </Sheet>
  )
}
