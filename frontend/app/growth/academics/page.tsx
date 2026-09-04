'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { computeAttendancePct, computeNeedToAttend, isTargetUnreachable } from '@/lib/attendance'
import { useTempo } from '@/lib/store'
import { CheckCircle2, Pencil, Plus, Trash2, XCircle } from 'lucide-react'
import { makeId } from '@/lib/id'

export default function AcademicsPage() {
  const { state, dispatch } = useTempo()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('75')
  const [total, setTotal] = useState('40')
  const [held, setHeld] = useState('0')
  const [attended, setAttended] = useState('0')
  const [error, setError] = useState('')
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [examTitle, setExamTitle] = useState('')
  function addCourse() {
    const values = [Number(total), Number(held), Number(attended), Number(target)]
    if (!name.trim() || values.some((value) => !Number.isFinite(value) || value < 0) || Number(held) > Number(total) || Number(attended) > Number(held) || Number(target) > 100) return setError('Enter a name and valid attendance values: attended ≤ held ≤ total.')
    const id = makeId('course')
    dispatch({ type: 'ADD_COURSE', course: { id, name: name.trim(), target: Number(target), totalClasses: Number(total), heldClasses: Number(held), attendedClasses: Number(attended) } })
    dispatch({ type: 'ADD_SUBJECT', subject: { id, name: name.trim() } })
    setName(''); setShowAdd(false); setError('')
  }
  function markAttendance(courseId: string, attendedToday: boolean) {
    const classDate = new Date().toISOString().slice(0, 10)
    dispatch({ type: 'SET_ATTENDANCE_RECORD', record: { id: `${courseId}_${classDate}`, courseId, classDate, attended: attendedToday } })
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link href="/growth" className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-muted hover:text-tempo-sage"><ChevronLeft size={13} /> Growth</Link>
        <div className="mt-3 max-w-2xl">
          <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Academics</div>
          <h1 className="serif mt-2 text-4xl sm:text-5xl">Attendance &amp; courses</h1>
          <p className="mt-2 text-sm text-tempo-muted">Stay above your attendance target without obsessing over it every day.</p>
        </div>
        <div className="mt-5"><button onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> Add subject</button></div>
        {showAdd && <div className="mt-4 rounded-2xl border border-tempo-line bg-white/90 p-4"><div className="grid gap-3 sm:grid-cols-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject name" className="tempo-input" /><input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min="0" max="100" placeholder="Target %" className="tempo-input" /><input value={total} onChange={(e) => setTotal(e.target.value)} type="number" min="0" placeholder="Total classes" className="tempo-input" /><input value={held} onChange={(e) => setHeld(e.target.value)} type="number" min="0" placeholder="Held classes" className="tempo-input" /><input value={attended} onChange={(e) => setAttended(e.target.value)} type="number" min="0" placeholder="Attended classes" className="tempo-input" /></div>{error && <p className="mt-2 text-xs text-tempo-coral">{error}</p>}<div className="mt-3 flex gap-2"><button onClick={addCourse} className="rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white">Save subject</button><button onClick={() => setShowAdd(false)} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold">Cancel</button></div></div>}

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {state.courses.map((c) => {
            const pct = computeAttendancePct(c.attendedClasses, c.heldClasses)
            const classesLeft = Math.max(0, c.totalClasses - c.heldClasses)
            const needToAttend = computeNeedToAttend(c.attendedClasses, c.heldClasses, classesLeft, c.target)
            const unreachable = isTargetUnreachable(c.attendedClasses, c.heldClasses, classesLeft, c.target)
            const safe = pct >= c.target
            return (
              <div key={c.id} className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{c.name}</div>
                    <div className="text-xs text-tempo-muted">Target {c.target}% · {classesLeft} classes left this term</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${safe ? 'bg-tempo-sageSoft text-tempo-sage' : 'bg-tempo-coralSoft text-tempo-coral'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eceae3]">
                  <div className={`h-full rounded-full ${safe ? 'bg-tempo-sage' : 'bg-tempo-coral'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className="mt-3 text-xs text-tempo-muted">
                  {safe
                    ? 'You are on track — no immediate action needed.'
                    : unreachable
                    ? `Even attending every remaining class this term may not reach ${c.target}%.`
                    : `Attend the next ${needToAttend} classes to get back above ${c.target}%.`}
                </p>
                {!safe && (
                  <Link href="/plan" className="mt-2 inline-block text-xs font-semibold text-tempo-sage hover:underline">
                    Protect study time for {c.name} in Plan →
                  </Link>
                )}
                <div className="mt-4 flex gap-2">
                  <button aria-label={`Edit ${c.name}`} onClick={() => { const nextName = window.prompt('Subject name', c.name); if (nextName?.trim()) { dispatch({ type: 'UPDATE_COURSE', id: c.id, patch: { name: nextName.trim() } }); dispatch({ type: 'UPDATE_SUBJECT', id: c.id, patch: { name: nextName.trim() } }) } }} className="rounded-xl border border-tempo-line px-3 py-2 text-xs text-tempo-muted"><Pencil size={13} /></button>
                  <button aria-label={`Delete ${c.name}`} onClick={() => { if (window.confirm(`Delete ${c.name}?`)) { dispatch({ type: 'DELETE_COURSE', id: c.id }); dispatch({ type: 'DELETE_SUBJECT', id: c.id }) } }} className="rounded-xl border border-tempo-line px-3 py-2 text-xs text-tempo-coral"><Trash2 size={13} /></button>
                  <button
                    disabled={classesLeft === 0}
                    onClick={() => markAttendance(c.id, true)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-tempo-sage px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} /> Attended today
                  </button>
                  <button
                    disabled={classesLeft === 0}
                    onClick={() => markAttendance(c.id, false)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-tempo-line px-3 py-2 text-xs font-semibold text-tempo-muted disabled:opacity-40"
                  >
                    <XCircle size={13} /> Missed
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card"><h2 className="font-semibold">Assignments</h2><div className="mt-3 flex gap-2"><input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} placeholder="Assignment title" className="tempo-input" /><button onClick={() => { if (assignmentTitle.trim()) { dispatch({ type: 'ADD_ASSIGNMENT', assignment: { id: makeId('assignment'), title: assignmentTitle.trim(), status: 'open' } }); setAssignmentTitle('') } }} className="rounded-xl bg-tempo-sage px-3 py-2 text-xs font-semibold text-white">Add</button></div><div className="mt-3 space-y-2">{state.assignments.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-tempo-line px-3 py-2 text-sm"><span className={item.status === 'done' ? 'line-through text-tempo-muted' : ''}>{item.title}</span><span className="flex gap-2"><button onClick={() => dispatch({ type: 'UPDATE_ASSIGNMENT', id: item.id, patch: { status: item.status === 'done' ? 'open' : 'done' } })} className="text-xs text-tempo-sage">{item.status === 'done' ? 'Reopen' : 'Done'}</button><button onClick={() => { const next = window.prompt('Assignment title', item.title); if (next?.trim()) dispatch({ type: 'UPDATE_ASSIGNMENT', id: item.id, patch: { title: next.trim() } }) }}><Pencil size={13} /></button><button onClick={() => dispatch({ type: 'DELETE_ASSIGNMENT', id: item.id })} className="text-tempo-coral"><Trash2 size={13} /></button></span></div>)}</div></section>
          <section className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card"><h2 className="font-semibold">Exams</h2><div className="mt-3 flex gap-2"><input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Exam title" className="tempo-input" /><button onClick={() => { if (examTitle.trim()) { dispatch({ type: 'ADD_EXAM', exam: { id: makeId('exam'), title: examTitle.trim() } }); setExamTitle('') } }} className="rounded-xl bg-tempo-sage px-3 py-2 text-xs font-semibold text-white">Add</button></div><div className="mt-3 space-y-2">{state.exams.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-tempo-line px-3 py-2 text-sm"><span>{item.title}</span><span className="flex gap-2"><button onClick={() => { const next = window.prompt('Exam title', item.title); if (next?.trim()) dispatch({ type: 'UPDATE_EXAM', id: item.id, patch: { title: next.trim() } }) }}><Pencil size={13} /></button><button onClick={() => dispatch({ type: 'DELETE_EXAM', id: item.id })} className="text-tempo-coral"><Trash2 size={13} /></button></span></div>)}</div></section>
        </div>
      </div>
    </AppShell>
  )
}
