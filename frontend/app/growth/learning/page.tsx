'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Pencil, PlayCircle, Plus, Sparkles, Timer, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Mascot } from '@/components/mascot'
import { mapResourcesToSession, type LearningSessionPlan } from '@/lib/ai/learningMapper'
import { useTempo } from '@/lib/store'
import type { LearningTrack } from '@/lib/types'
import { makeId } from '@/lib/id'

// Resource titles are stand-ins for what a real integration (a synced
// playlist, course, or reading list) would supply per track.
const RESOURCE_BANK: Record<string, string[]> = {
  react: ['React docs — Hooks deep dive', 'Build a small project', 'Advanced patterns talk', 'Community forum thread', 'Cheat sheet'],
  ts: ['TS handbook — generics', 'Practice exercises', 'Type utility deep dive', 'Community Q&A thread'],
  sysdesign: ['System design primer', 'Case study: URL shortener', 'Scaling databases talk', 'Mock interview practice'],
}

const bucketLabel: Record<LearningSessionPlan['resources'][number]['bucket'], string> = {
  'must-watch': 'Must watch',
  recommended: 'Recommended',
  optional: 'Optional',
  'skip-for-now': 'Skip for now',
}

export default function LearnPage() {
  const { state, dispatch } = useTempo()
  const [sessionPlans, setSessionPlans] = useState<Record<string, LearningSessionPlan>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newTrack, setNewTrack] = useState({ name: '', nextSession: '', minutes: '25' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function logSession(track: LearningTrack) {
    dispatch({ type: 'COMPLETE_FOCUS_SESSION', minutes: 25, context: { kind: 'learning', sourceId: track.id, title: track.name, selectedAt: Date.now() } })
    const plan = mapResourcesToSession(track.name, RESOURCE_BANK[track.id] ?? [`${track.name} — session material`], track.progress, 25)
    setSessionPlans((prev) => ({ ...prev, [track.id]: plan }))
  }

  function commitEdit(track: LearningTrack) {
    if (editValue.trim()) dispatch({ type: 'UPDATE_LEARNING_TRACK', id: track.id, patch: { name: editValue.trim() } })
    setEditingId(null)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link href="/growth" className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-muted hover:text-tempo-sage"><ChevronLeft size={13} /> Growth</Link>
        <div className="mt-3 max-w-2xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Tempo Learn</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Keep building, at your pace.</h1>
          <p className="mt-2 text-sm text-tempo-muted">Learning tracks tied to your goals — sessions here feed straight into Goals and today&apos;s plan.</p>
        </div>

        <div className="mt-5"><button onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> Create learning track</button></div>
        {showAdd && <div className="mt-4 rounded-2xl border border-tempo-line bg-white/90 p-4"><div className="grid gap-3 sm:grid-cols-3"><input value={newTrack.name} onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} placeholder="Goal or skill" className="tempo-input" /><input value={newTrack.nextSession} onChange={(e) => setNewTrack({ ...newTrack, nextSession: e.target.value })} placeholder="Next session" className="tempo-input" /><input value={newTrack.minutes} onChange={(e) => setNewTrack({ ...newTrack, minutes: e.target.value })} type="number" min="0" placeholder="Minutes this week" className="tempo-input" /></div><div className="mt-3 flex gap-2"><button onClick={() => { if (!newTrack.name.trim()) return; dispatch({ type: 'ADD_LEARNING_TRACK', track: { id: makeId('learn'), name: newTrack.name.trim(), progress: 0, nextSession: newTrack.nextSession.trim() || 'Not scheduled', minutesThisWeek: Math.max(0, Number(newTrack.minutes) || 0) } }); setNewTrack({ name: '', nextSession: '', minutes: '25' }); setShowAdd(false) }} className="rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white">Save track</button><button onClick={() => setShowAdd(false)} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold">Cancel</button></div></div>}

        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {state.learning.map((track) => (
            <div key={track.id} className="flex flex-col rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                {editingId === track.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(track)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => commitEdit(track)}
                    className="min-w-0 flex-1 rounded-lg border border-tempo-sage bg-transparent px-2 py-1 text-lg font-semibold outline-none"
                  />
                ) : (
                  <div className="min-w-0 flex-1 truncate text-lg font-semibold">{track.name}</div>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    aria-label={`Edit ${track.name}`}
                    onClick={() => { setEditingId(track.id); setEditValue(track.name) }}
                    className="text-tempo-muted hover:text-tempo-sage"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    aria-label={`Delete ${track.name}`}
                    onClick={() => setConfirmDeleteId(track.id)}
                    className="text-tempo-muted hover:text-tempo-coral"
                  >
                    <Trash2 size={14} />
                  </button>
                  <Sparkles size={16} className="text-tempo-sage" />
                </div>
              </div>

              {confirmDeleteId === track.id && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-tempo-cream px-3 py-2 text-xs">
                  <span>Delete &quot;{track.name}&quot;?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { dispatch({ type: 'DELETE_LEARNING_TRACK', id: track.id }); setConfirmDeleteId(null) }}
                      className="rounded-lg bg-tempo-coral px-2.5 py-1 font-semibold text-white"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-tempo-line px-2.5 py-1 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-tempo-muted">
                <span>Progress</span>
                <span>{track.progress}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eceae3]">
                <div className="h-full rounded-full bg-tempo-sage transition-all" style={{ width: `${track.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-tempo-muted">Next session: {track.nextSession} · {track.minutesThisWeek}m this week</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => logSession(track)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <PlayCircle size={16} /> Log a session
                </button>
                <Link
                  href="/focus"
                  onClick={() => dispatch({ type: 'SET_FOCUS_CONTEXT', context: { kind: 'learning', sourceId: track.id, title: track.name, selectedAt: Date.now() } })}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-tempo-line px-3 py-2.5 text-xs font-semibold text-tempo-ink"
                >
                  <Timer size={13} /> Focus
                </Link>
              </div>
              {sessionPlans[track.id] && (
                <div className="mt-4 rounded-2xl bg-tempo-cream p-3">
                  <div className="mono text-[9px] uppercase tracking-widest text-tempo-sage">Session plan</div>
                  <div className="mt-2 space-y-1.5">
                    {sessionPlans[track.id].resources.map((r) => (
                      <div key={r.title} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="min-w-0 truncate text-tempo-ink">{r.title}</span>
                        <span className="shrink-0 text-tempo-muted">{bucketLabel[r.bucket]} · {r.estimatedMinutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 rounded-3xl border border-tempo-line bg-tempo-panel p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Mascot size="sm" />
            <div>
              <div className="text-sm font-semibold">Curious where this leads?</div>
              <div className="text-xs text-tempo-muted">See how these tracks map onto your career goals.</div>
            </div>
          </div>
          <Link href="/growth/career" className="rounded-xl border border-tempo-line px-4 py-2.5 text-sm font-semibold text-tempo-sage">View Goals</Link>
        </div>
      </div>
    </AppShell>
  )
}