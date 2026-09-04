'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useTempo } from '@/lib/store'
import { makeId } from '@/lib/id'
import { parseDateText } from '@/lib/date'
import type { ApplicationStatus } from '@/lib/types'

const statusStyle: Record<string, string> = {
  Applied: 'bg-tempo-sageSoft text-tempo-sage',
  'In Progress': 'bg-tempo-amberSoft text-[#a56d0f]',
  'Form Started': 'bg-[#efefe9] text-tempo-muted',
  Interview: 'bg-[#e3ecfb] text-[#3560b0]',
  Offer: 'bg-tempo-sageSoft text-tempo-sage',
  Rejected: 'bg-tempo-coralSoft text-tempo-coral',
  'Needs Review': 'bg-tempo-coralSoft text-tempo-coral',
}

export default function ApplicationsPage() {
  const { state, dispatch } = useTempo()
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ company: '', role: '', status: 'Needs Review' as ApplicationStatus, deadline: '', appliedOn: '', link: '', notes: '', followUpDate: '' })
  const apps = state.applications

  const activeCount = apps.filter((a) => a.status !== 'Rejected' && a.status !== 'Offer').length
  const weekCount = apps.filter((a) => a.deadlineAt != null && a.deadlineAt > Date.now() && a.deadlineAt <= Date.now() + 7 * 24 * 3600000).length
  const awaitingCount = apps.filter((a) => a.status === 'Applied' || a.status === 'In Progress').length
  const followUpCount = apps.filter((a) => a.followUpDate).length

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link href="/growth" className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-muted hover:text-tempo-sage"><ChevronLeft size={13} /> Growth</Link>
        <div className="mt-3 max-w-2xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Career context</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Application Memory</h1>
          <p className="mt-2 text-sm text-tempo-muted">Never lose track of an application again — deadlines flow straight into your plan.</p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Active', activeCount],
            ['Deadlines this week', weekCount],
            ['Awaiting response', awaitingCount],
            ['Follow-ups scheduled', followUpCount],
          ].map(([a, b]) => (
            <div key={a as string} className="rounded-2xl border border-tempo-line bg-white/90 p-4">
              <div className="text-xs text-tempo-muted">{a}</div>
              <div className="mt-1 text-2xl font-semibold">{b}</div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your applications</h2>
          <button onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white">
            <Plus size={15} /> Add application
          </button>
        </div>
        {showAdd && <div className="mt-4 rounded-2xl border border-tempo-line bg-white/90 p-4"><div className="grid gap-3 sm:grid-cols-2"><input placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className="tempo-input" /><input placeholder="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="tempo-input" /><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ApplicationStatus })} className="tempo-input">{['Needs Review', 'Form Started', 'In Progress', 'Applied', 'Interview', 'Offer', 'Rejected'].map((status) => <option key={status}>{status}</option>)}</select><input placeholder="Deadline (e.g. Sep 12)" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} className="tempo-input" /><input placeholder="Application link" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} className="tempo-input sm:col-span-2" /><textarea placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="tempo-input sm:col-span-2" rows={2} /></div><div className="mt-3 flex gap-2"><button onClick={() => { if (!draft.company.trim() || !draft.role.trim()) return; dispatch({ type: 'ADD_APPLICATION', application: { id: makeId('app'), company: draft.company.trim(), role: draft.role.trim(), status: draft.status, deadline: draft.deadline.trim(), deadlineAt: parseDateText(draft.deadline)?.at ?? null, appliedOn: draft.appliedOn.trim() || undefined, link: draft.link.trim() || undefined, notes: draft.notes.trim() || undefined, followUpDate: draft.followUpDate.trim() || undefined, questions: [], submittedItems: [], timeline: [] } }); setDraft({ company: '', role: '', status: 'Needs Review', deadline: '', appliedOn: '', link: '', notes: '', followUpDate: '' }); setShowAdd(false) }} className="rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white">Save application</button><button onClick={() => setShowAdd(false)} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold">Cancel</button></div></div>}

        {apps.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-tempo-line bg-white/70 p-10 text-center text-sm text-tempo-muted">
            No applications yet. Use Smart Capture to add your first one.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {apps.map((a) => (
              <Link key={a.id} href={`/growth/applications/${a.id}`} className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{a.company}</div>
                    <div className="truncate text-sm text-tempo-muted">{a.role}</div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-tempo-muted" />
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle[a.status] ?? 'bg-[#efefe9] text-tempo-muted'}`}>{a.status}</span>
                  <span className="text-xs text-tempo-muted">Deadline {a.deadline}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
