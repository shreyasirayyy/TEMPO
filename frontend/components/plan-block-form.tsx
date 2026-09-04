'use client'

import { useState } from 'react'
import { makeId } from '@/lib/id'
import { getBlockDurationMinutes, getPlanningWindow, parseTimeToMinutes } from '@/lib/planTime'
import { todayKey } from '@/lib/date'
import type { PlanBlock, PlanBlockKind, Priority } from '@/lib/types'
import type { TempoState, Action } from '@/lib/store'

type Props = {
  state: TempoState
  dispatch: React.Dispatch<Action>
  initial?: PlanBlock
  onClose: () => void
}

const days: PlanBlock['day'][] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const kinds: PlanBlockKind[] = ['task', 'learning', 'project', 'personal', 'application', 'class', 'break']
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low']

export function PlanBlockForm({ state, dispatch, initial, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [day, setDay] = useState<PlanBlock['day']>(initial?.day ?? todayKey())
  const [time, setTime] = useState(initial?.time ?? '18:00')
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? getBlockDurationMinutes(initial ?? { duration: '60m' })))
  const [kind, setKind] = useState<PlanBlockKind>(initial?.kind ?? 'task')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'Medium')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  function save() {
    const minutes = Number(duration)
    const window = getPlanningWindow(state.planningWindow)
    const start = parseTimeToMinutes(time)
    const candidate: PlanBlock = {
      id: initial?.id ?? makeId('blk'), day, time, title: title.trim(), duration: `${minutes}m`, durationMinutes: minutes,
      tag: initial?.tag ?? 'new', done: initial?.done ?? false, kind, priority, fixed: initial?.fixed ?? false,
      flexibility: initial?.flexibility ?? 'adjustable', canMove: initial?.canMove ?? true, sourceType: initial?.sourceType ?? 'manual',
      sourceId: initial?.sourceId, focusedMinutes: initial?.focusedMinutes, notes,
    }
    if (!candidate.title) return setError('Add a title so this block can be found later.')
    if (!/^\d{2}:\d{2}$/.test(time) || start < 0 || start > 1439) return setError('Enter a valid time, such as 18:00.')
    if (!Number.isInteger(minutes) || minutes <= 0) return setError('Duration must be a positive number of minutes.')
    if (start < window.start || start + minutes > window.end) return setError(`Choose a time inside your planning window (${state.planningWindow.start}–${state.planningWindow.end}).`)
    const overlaps = state.plan.some((block) => {
      if (block.id === initial?.id || block.day !== day || block.done) return false
      const blockStart = parseTimeToMinutes(block.time)
      const blockEnd = blockStart + getBlockDurationMinutes(block)
      return start < blockEnd && start + minutes > blockStart
    })
    if (overlaps) return setError('That time overlaps another planned block. Choose an open interval.')
    if (initial) dispatch({ type: 'UPDATE_PLAN_BLOCK', id: initial.id, patch: candidate })
    else dispatch({ type: 'ADD_PLAN_BLOCK', block: candidate })
    onClose()
  }

  return <div className="rounded-2xl border border-tempo-sage/40 bg-tempo-sageSoft/40 p-4">
    <div className="text-sm font-semibold">{initial ? 'Edit plan block' : 'Add to plan'}</div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-tempo-muted sm:col-span-2">Title<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="tempo-input mt-1" placeholder="Study React" /></label>
      <label className="text-xs text-tempo-muted">Day<select value={day} onChange={(e) => setDay(e.target.value as PlanBlock['day'])} className="tempo-input mt-1">{days.map((d) => <option key={d} value={d}>{d === todayKey() ? `${d} (today)` : d}</option>)}</select></label>
      <label className="text-xs text-tempo-muted">Start time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="tempo-input mt-1" /></label>
      <label className="text-xs text-tempo-muted">Duration (minutes)<input type="number" min="1" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} className="tempo-input mt-1" /></label>
      <label className="text-xs text-tempo-muted">Type<select value={kind} onChange={(e) => setKind(e.target.value as PlanBlockKind)} className="tempo-input mt-1">{kinds.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
      <label className="text-xs text-tempo-muted">Priority<select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="tempo-input mt-1">{priorities.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label className="text-xs text-tempo-muted sm:col-span-2">Notes (optional)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="tempo-input mt-1" rows={2} /></label>
    </div>
    {error && <p className="mt-3 rounded-lg bg-tempo-coralSoft px-3 py-2 text-xs text-tempo-coral">{error}</p>}
    <div className="mt-3 flex gap-2"><button onClick={save} className="rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white">{initial ? 'Save changes' : 'Add to plan'}</button><button onClick={onClose} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold text-tempo-muted">Cancel</button></div>
  </div>
}
