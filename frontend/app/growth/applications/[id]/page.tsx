'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, notFound } from 'next/navigation'
import { ArrowRight, CalendarPlus, ChevronLeft, ExternalLink, Pencil, Save, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useTempo } from '@/lib/store'
import type { Application, ApplicationStatus } from '@/lib/types'

const statuses: ApplicationStatus[] = ['Needs Review', 'Form Started', 'Applied', 'In Progress', 'Interview', 'Offer', 'Rejected']

function formFromApplication(app: Application) {
  return { company: app.company, role: app.role, status: app.status, deadline: app.deadline, link: app.link ?? '', notes: app.notes ?? '', followUpDate: app.followUpDate ?? '', questions: app.questions.join('\n'), submittedItems: app.submittedItems.join('\n'), appliedOn: app.appliedOn ?? '' }
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const { state, dispatch } = useTempo()
  const app = state.applications.find((application) => application.id === id)
  const [editing, setEditing] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const [draft, setDraft] = useState(() => app ? formFromApplication(app) : null)

  useEffect(() => {
    if (app) setDraft(formFromApplication(app))
  }, [app?.id])

  if (!app || !draft) return notFound()

  function save() {
    if (!draft) return
    dispatch({ type: 'UPDATE_APPLICATION', id: id as string, patch: { ...draft, questions: draft.questions.split(/\n|,/).map((value) => value.trim()).filter(Boolean), submittedItems: draft.submittedItems.split(/\n|,/).map((value) => value.trim()).filter(Boolean) } })
    setEditing(false)
  }

  return <AppShell>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link href="/growth/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-muted hover:text-tempo-sage"><ChevronLeft size={13} /> Applications</Link>
      <div className="mt-3 max-w-3xl"><div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Application memory</div><h1 className="serif mt-2 text-3xl leading-tight sm:text-5xl">{app.company || 'Company needs review'} — {app.role || 'Role needs review'}</h1><p className="mt-2 text-sm text-tempo-muted">Everything Tempo remembers about this application, in one place — and it feeds directly into your plan.</p></div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select value={app.status} onChange={(event) => dispatch({ type: 'UPDATE_APPLICATION_STATUS', id: app.id, status: event.target.value as ApplicationStatus })} className="rounded-full border border-tempo-line bg-white px-3 py-1.5 text-xs font-semibold text-tempo-sage">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        <span className="rounded-full bg-tempo-coralSoft px-2.5 py-1 text-[10px] font-semibold text-tempo-coral">Deadline {app.deadline || 'needs review'}</span>
        <button onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-tempo-line px-2.5 py-1 text-[10px] font-semibold text-tempo-ink">{editing ? <X size={11} /> : <Pencil size={11} />} {editing ? 'Cancel edit' : 'Edit details'}</button>
        {app.link && <a href={app.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-tempo-line px-2.5 py-1 text-[10px] font-semibold text-tempo-ink"><ExternalLink size={11} /> Portal link</a>}
        <button onClick={() => { if (window.confirm(`Delete ${app.company || 'this application'} from Application Memory? Linked plan and priority records will also be removed.`)) { dispatch({ type: 'DELETE_APPLICATION', id: app.id }); window.location.href = '/growth/applications' } }} className="inline-flex items-center gap-1 rounded-full border border-tempo-coral/50 px-2.5 py-1 text-[10px] font-semibold text-tempo-coral"><Trash2 size={11} /> Delete</button>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-tempo-line bg-white/90 p-5 lg:col-span-2">
          {editing ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Company"><input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className="input" /></Field><Field label="Role"><input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="input" /></Field><Field label="Deadline"><input value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} placeholder="e.g. Sep 12 or tomorrow at 11:59 PM" className="input" /></Field><Field label="Applied on"><input value={draft.appliedOn} onChange={(event) => setDraft({ ...draft, appliedOn: event.target.value })} className="input" /></Field><Field label="Follow-up date"><input value={draft.followUpDate} onChange={(event) => setDraft({ ...draft, followUpDate: event.target.value })} placeholder="Optional" className="input" /></Field><Field label="Link"><input value={draft.link} onChange={(event) => setDraft({ ...draft, link: event.target.value })} placeholder="https://" className="input" /></Field></div><Field label="Questions"><textarea value={draft.questions} onChange={(event) => setDraft({ ...draft, questions: event.target.value })} rows={4} placeholder="One question per line" className="input" /></Field><Field label="Submitted items"><textarea value={draft.submittedItems} onChange={(event) => setDraft({ ...draft, submittedItems: event.target.value })} rows={3} placeholder="Resume, GitHub, portfolio" className="input" /></Field><Field label="Notes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={4} placeholder="Notes, referral context, next steps" className="input" /></Field><button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white"><Save size={14} /> Save changes</button></div> : <><h2 className="text-lg font-semibold">What they asked</h2>{app.questions.length ? <ul className="mt-3 space-y-2 text-sm text-tempo-muted">{app.questions.map((question) => <li key={question}>• {question}</li>)}</ul> : <p className="mt-3 text-sm text-tempo-muted">Nothing captured yet.</p>}<h2 className="mt-6 text-lg font-semibold">What I submitted</h2>{app.submittedItems.length ? <div className="mt-3 grid gap-3 sm:grid-cols-3">{app.submittedItems.map((item) => <div key={item} className="truncate rounded-2xl bg-tempo-cream p-3 text-sm">{item}</div>)}</div> : <p className="mt-3 text-sm text-tempo-muted">Nothing submitted yet.</p>}<h2 className="mt-6 text-lg font-semibold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-tempo-muted">{app.notes || 'No notes yet.'}</p></>}

          {app.proof && <><h2 className="mt-6 text-lg font-semibold">Proof</h2><img src={app.proof} alt="Captured confirmation" className="mt-3 max-h-72 w-full rounded-2xl border border-tempo-line object-cover" /></>}
          <div className="mt-6 rounded-2xl border border-tempo-line bg-tempo-cream p-4 text-xs text-tempo-muted"><div className="mono mb-2 text-[10px] uppercase tracking-widest text-tempo-sage">How this connects</div><div className="flex flex-wrap items-center gap-1.5 font-medium text-tempo-ink"><span>Deadline</span><ArrowRight size={11} /><span>Priority Engine</span><ArrowRight size={11} /><span>Today</span><ArrowRight size={11} /><span>Fix My Day</span></div><p className="mt-2">The deadline and status above are weighed by the same Priority Engine used on your Today screen.</p></div>
        </section>

        <aside className="rounded-3xl border border-tempo-line bg-white/90 p-5"><div className="text-sm font-semibold">Timeline</div><div className="mt-4 space-y-4 text-sm">{app.timeline.length ? app.timeline.map((event) => <div key={event.id}><div className="font-medium">{event.label}</div><div className="text-xs text-tempo-muted">{event.date}{event.note ? ` · ${event.note}` : ''}</div></div>) : <p className="text-xs text-tempo-muted">No events recorded yet.</p>}</div><div className="mt-6 rounded-2xl bg-tempo-sageSoft p-4 text-sm"><strong>Schedule a follow-up</strong><p className="mt-1 text-xs text-tempo-muted">Keep a next step connected to this application.</p><div className="mt-3 flex gap-2"><input value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="e.g. Sept 12" className="min-w-0 flex-1 rounded-lg border border-tempo-line bg-white px-2 py-1.5 text-xs" /><button onClick={() => { if (!followUp.trim()) return; dispatch({ type: 'ADD_APPLICATION_FOLLOWUP', id: app.id, date: followUp.trim(), note: 'Manually scheduled' }); setFollowUp('') }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-tempo-sage px-3 py-1.5 text-xs font-semibold text-white"><CalendarPlus size={13} /> Set</button></div>{app.followUpDate && <div className="mt-2 text-xs text-tempo-ink">Currently: {app.followUpDate}</div>}</div></aside>
      </div>
    </div>
  </AppShell>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium text-tempo-muted"><span>{label}</span><div className="mt-1">{children}</div></label>
}
