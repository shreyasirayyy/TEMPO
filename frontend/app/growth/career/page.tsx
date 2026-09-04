'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, ChevronLeft, Pencil, Plus, Sparkles, Target, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useTempo } from '@/lib/store'
import type { SkillLevel } from '@/lib/types'
import { makeId } from '@/lib/id'
import { analyzeCareerGoal } from '@/lib/services/career'

const LEVEL_STYLE: Record<SkillLevel, string> = {
  Strong: 'bg-tempo-sageSoft text-tempo-sage',
  Learning: 'bg-tempo-amberSoft text-[#a56d0f]',
  Gap: 'bg-tempo-coralSoft text-tempo-coral',
  'Needs work': 'bg-tempo-coralSoft text-tempo-coral',
}

export default function GoalsPage() {
  const { state, dispatch } = useTempo()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const gapCount = state.goals.reduce((sum, g) => sum + g.skills.filter((s) => s.level === 'Gap' || s.level === 'Needs work').length, 0)

  // Inline-edit state (replaces window.prompt/confirm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function addGoal() {
    const normalized = title.trim()
    if (!normalized || analyzing) return
    setAnalyzing(true)
    const analysis = await analyzeCareerGoal(normalized, state.goals)
    dispatch({ type: 'ADD_GOAL', goal: { id: makeId('goal'), title: analysis.targetRole, progress: 0, skills: analysis.requiredSkills } })
    setTitle('')
    setShowAdd(false)
    setAnalyzing(false)
  }

  function commitEdit(id: string) {
    if (editValue.trim()) dispatch({ type: 'UPDATE_GOAL', id, patch: { title: editValue.trim() } })
    setEditingId(null)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link href="/growth" className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-muted hover:text-tempo-sage"><ChevronLeft size={13} /> Growth</Link>
        <div className="mt-3 max-w-2xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Career</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Goals &amp; skill map</h1>
          <p className="mt-2 text-sm text-tempo-muted">The long game behind today&apos;s tasks — every learning session and application nudges these forward.</p>
        </div>
        <div className="mt-5"><button onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> Add career goal</button></div>
        {showAdd && <div className="mt-4 flex gap-2 rounded-2xl border border-tempo-line bg-white/90 p-4"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Target role, e.g. Frontend Developer" className="tempo-input" /><button onClick={addGoal} disabled={analyzing} className="shrink-0 rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{analyzing ? 'Analyzing…' : 'Analyze goal'}</button></div>}

        {gapCount > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-tempo-line bg-white/80 p-4 text-xs text-tempo-muted sm:text-sm">
            <span>{gapCount} skill{gapCount === 1 ? '' : 's'} need attention.</span>
            <Link href="/growth/learning" className="inline-flex items-center gap-1 font-semibold text-tempo-sage"><Sparkles size={13} /> Close gaps in Learning</Link>
            <span className="text-tempo-line">·</span>
            <Link href="/growth/applications" className="inline-flex items-center gap-1 font-semibold text-tempo-sage"><BriefcaseBusiness size={13} /> See where this applies</Link>
          </div>
        )}

        <div className="mt-7 space-y-5">
          {state.goals.length === 0 && (
            <div className="rounded-3xl border border-dashed border-tempo-line bg-white/70 p-8 text-center text-sm text-tempo-muted">No goals set yet.</div>
          )}
          {state.goals.map((g) => (
            <div key={g.id} className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tempo-sageSoft text-tempo-sage"><Target size={18} /></div>
                  {editingId === g.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(g.id); if (e.key === 'Escape') setEditingId(null) }}
                      onBlur={() => commitEdit(g.id)}
                      className="min-w-0 flex-1 rounded-lg border border-tempo-sage bg-transparent px-1.5 py-0.5 text-lg font-semibold outline-none"
                    />
                  ) : (
                    <div className="min-w-0 flex-1 truncate text-lg font-semibold">{g.title}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label={`Edit ${g.title}`} onClick={() => { setEditingId(g.id); setEditValue(g.title) }} className="text-tempo-muted hover:text-tempo-sage"><Pencil size={14} /></button>
                  <button aria-label={`Delete ${g.title}`} onClick={() => setConfirmDeleteId(g.id)} className="text-tempo-muted hover:text-tempo-coral"><Trash2 size={14} /></button>
                  <span className="rounded-full bg-tempo-sageSoft px-3 py-1 text-xs font-semibold text-tempo-sage">{g.skills.length} skills mapped</span>
                </div>
              </div>

              {confirmDeleteId === g.id && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-tempo-cream px-3 py-2 text-xs">
                  <span>Delete &quot;{g.title}&quot;?</span>
                  <div className="flex gap-2">
                    <button onClick={() => { dispatch({ type: 'DELETE_GOAL', id: g.id }); setConfirmDeleteId(null) }} className="rounded-lg bg-tempo-coral px-2.5 py-1 font-semibold text-white">Delete</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-tempo-line px-2.5 py-1 font-semibold">Cancel</button>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {g.skills.map((s) => (
                  <div key={s.name} className="rounded-2xl border border-tempo-line bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_STYLE[s.level]}`}>{s.level}</span>
                    </div>
                    {s.evidence && <p className="mt-1 text-xs text-tempo-muted">{s.evidence}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}