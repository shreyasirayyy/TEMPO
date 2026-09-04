'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock3, ExternalLink, Pencil, Plus, Timer, Trash2, Upload } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { FixMyDayTrigger } from '@/components/fix-my-day'
import { todayKey } from '@/lib/date'
import { useTempo } from '@/lib/store'
import type { PlanBlock } from '@/lib/types'
import type { TempoState } from '@/lib/store'
import { PlanBlockForm } from '@/components/plan-block-form'
import { parseIcsEvents } from '@/lib/calendarImport'

function resolveOpenHref(state: TempoState, sourceId?: string): string | null {
  if (!sourceId) return null
  if (state.applications.some((a) => a.id === sourceId)) return `/growth/applications/${sourceId}`
  if (state.learning.some((l) => l.id === sourceId)) return '/growth/learning'
  if (state.courses.some((c) => c.id === sourceId)) return '/growth/academics'
  return null
}

const days: { key: PlanBlock['day']; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const tagStyle: Record<PlanBlock['tag'], string> = {
  keep: 'border-tempo-line text-tempo-muted',
  protect: 'border-[#f4c8c3] bg-tempo-coralSoft text-tempo-coral',
  move: 'border-[#f0dda9] bg-tempo-amberSoft text-[#a56d0f]',
  new: 'border-[#cbe1d8] bg-tempo-sageSoft text-tempo-sage',
  normal: 'border-tempo-line text-tempo-muted',
}

export default function PlanPage() {
  const { state, dispatch } = useTempo()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [activeDay, setActiveDay] = useState<PlanBlock['day']>(todayKey())
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<PlanBlock | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const icsInputRef = useRef<HTMLInputElement>(null)

  const blocksForDay = (day: PlanBlock['day']) => state.plan.filter((b) => b.day === day).sort((a, b) => a.time.localeCompare(b.time))

  async function handleIcsImport(file: File) {
    try {
      const text = await file.text()
      const events = parseIcsEvents(text)
      if (!events.length) { setImportMessage('No events found in that file — Tempo looks for VEVENT blocks with a SUMMARY and DTSTART.'); return }
      dispatch({ type: 'IMPORT_CALENDAR_EVENTS', events })
      setImportMessage(`Imported ${events.length} event${events.length === 1 ? '' : 's'} as fixed commitments — Fix My Day will always protect them, same as a class.`)
    } catch {
      setImportMessage('Could not read that file. Make sure it\'s a plain .ics calendar export.')
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Planner</div>
            <h1 className="serif mt-2 text-4xl sm:text-5xl">Your week, in rhythm.</h1>
            <p className="mt-2 text-sm text-tempo-muted">Every block here is the same data that powers Today and the Priority Engine.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditing(null); setShowAdd(true) }} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> Add to plan</button>
            <button onClick={() => icsInputRef.current?.click()} className="hidden items-center gap-2 rounded-xl border border-tempo-line bg-white px-4 py-2.5 text-sm font-semibold text-tempo-ink sm:inline-flex" title="Import a .ics calendar export as fixed commitments">
              <Upload size={15} /> Import calendar
            </button>
            <input ref={icsInputRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleIcsImport(file); e.target.value = '' }} />
            <Link href="/focus" className="hidden items-center gap-2 rounded-xl border border-tempo-line bg-white px-4 py-2.5 text-sm font-semibold text-tempo-ink sm:inline-flex">
              <Timer size={15} /> Focus
            </Link>
            <FixMyDayTrigger />
          </div>
        </div>

        {importMessage && <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-tempo-line bg-white px-4 py-3 text-xs text-tempo-muted"><span>{importMessage}</span><button onClick={() => setImportMessage(null)} className="font-semibold underline">Dismiss</button></div>}
        {(showAdd || editing) && <div className="mt-5"><PlanBlockForm state={state} dispatch={dispatch} initial={editing ?? undefined} onClose={() => { setShowAdd(false); setEditing(null) }} /></div>}
        {state.planNotice && <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-tempo-coral/40 bg-tempo-coralSoft px-4 py-3 text-xs text-tempo-coral"><span>{state.planNotice}</span><button onClick={() => dispatch({ type: 'CLEAR_PLAN_NOTICE' })} className="font-semibold underline">Dismiss</button></div>}

        <div className="mt-6 inline-flex rounded-xl border border-tempo-line bg-white p-1 text-sm">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 font-semibold capitalize transition ${view === v ? 'bg-tempo-sage text-white' : 'text-tempo-muted'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {view === 'day' && (
          <div className="mt-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setActiveDay(d.key)}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${
                    activeDay === d.key ? 'border-tempo-sage bg-tempo-sageSoft text-tempo-sage' : 'border-tempo-line bg-white text-tempo-muted'
                  }`}
                >
                  {d.label}
                  {d.key === todayKey() && <span className="mono ml-1.5 text-[9px] uppercase text-tempo-sage">· today</span>}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {blocksForDay(activeDay).length === 0 && (
                <div className="rounded-2xl border border-dashed border-tempo-line bg-white/70 p-8 text-center text-sm text-tempo-muted">Nothing planned yet.</div>
              )}
              {blocksForDay(activeDay).map((b) => (
                <DayBlock
                  key={b.id}
                  block={b}
                  openHref={resolveOpenHref(state, b.sourceId)}
                  onToggle={() => dispatch({ type: 'TOGGLE_BLOCK_DONE', id: b.id })}
                  onMove={(time) => dispatch({ type: 'MOVE_BLOCK', id: b.id, time })}
                  onStartFocus={() => dispatch({ type: 'SET_FOCUS_CONTEXT', context: { kind: b.kind, sourceId: b.id, title: b.title, selectedAt: Date.now() } })}
                  onEdit={() => { setEditing(b); setShowAdd(false) }}
                  onDelete={() => { if (window.confirm(`Remove “${b.title}” from your plan?`)) dispatch({ type: 'DELETE_PLAN_BLOCK', id: b.id }) }}
                />
              ))}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="mt-6 grid gap-3 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {days.map((d) => (
              <div key={d.key} className="min-w-[220px] rounded-2xl border border-tempo-line bg-white/80 p-3">
                <div className="mono text-[10px] uppercase tracking-widest text-tempo-sage">{d.label}</div>
                <div className="mt-3 space-y-2">
                  {blocksForDay(d.key).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveDay(d.key); setView('day') }}
                      className={`w-full rounded-xl border px-2.5 py-2 text-left text-xs ${tagStyle[b.tag]} ${b.done ? 'opacity-50 line-through' : ''}`}
                    >
                      <div className="mono text-[9px]">{b.time}</div>
                      <div className="mt-0.5 break-words font-semibold">{b.title}</div>
                    </button>
                  ))}
                  {blocksForDay(d.key).length === 0 && <div className="text-[11px] text-tempo-muted">Free</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function DayBlock({ block, openHref, onToggle, onMove, onStartFocus, onEdit, onDelete }: { block: PlanBlock; openHref: string | null; onToggle: () => void; onMove: (time: string) => void; onStartFocus: () => void; onEdit: () => void; onDelete: () => void }) {
  const [editingTime, setEditingTime] = useState(false)
  return (
    <div className={`flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-card ${block.done ? 'opacity-60' : ''} ${tagStyle[block.tag]}`}>
      <button aria-label="Toggle done" onClick={onToggle} className="shrink-0 text-tempo-sage">
        {block.done ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-tempo-muted" />}
      </button>
      {editingTime ? (
        <input
          autoFocus
          defaultValue={block.time}
          onBlur={(e) => {
            onMove(e.target.value || block.time)
            setEditingTime(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="mono w-16 shrink-0 rounded-lg border border-tempo-line px-1.5 py-1 text-xs"
        />
      ) : (
        <button onClick={() => setEditingTime(true)} aria-label="Edit time" className="mono flex shrink-0 items-center gap-1 text-xs text-tempo-ink">
          <Clock3 size={12} /> {block.time}
        </button>
      )}
      {openHref ? (
        <Link href={openHref} className={`flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold hover:underline ${block.done ? 'line-through' : ''}`}>
          <span className="truncate">{block.title}</span>
          <ExternalLink size={12} className="shrink-0 text-tempo-muted" />
        </Link>
      ) : (
        <div className={`min-w-0 flex-1 break-words text-sm font-semibold ${block.done ? 'line-through' : ''}`}>{block.title}</div>
      )}
      <div className="mono hidden shrink-0 text-[10px] uppercase text-tempo-muted sm:block">{block.tag}</div>
      <span className="shrink-0 text-xs text-tempo-muted">{block.duration}</span>
      <button onClick={onEdit} aria-label="Edit plan block" className="shrink-0 text-tempo-muted hover:text-tempo-sage"><Pencil size={14} /></button>
      <button onClick={onDelete} aria-label="Delete plan block" className="shrink-0 text-tempo-muted hover:text-tempo-coral"><Trash2 size={14} /></button>
      {!block.done && (
        <Link href="/focus" onClick={onStartFocus} aria-label="Start focus session" className="shrink-0 text-tempo-sage">
          <Timer size={16} />
        </Link>
      )}
    </div>
  )
}
