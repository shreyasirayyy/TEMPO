'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Pause, Play, RotateCcw, Square } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Mascot } from '@/components/mascot'
import { useTempo } from '@/lib/store'
import type { FocusContext } from '@/lib/types'

const PRESETS = [15, 25, 45]

export default function FocusPage() {
  return <Suspense fallback={null}><FocusPageInner /></Suspense>
}

function FocusPageInner() {
  const { state, dispatch } = useTempo()
  const searchParams = useSearchParams()
  const [presetMinutes, setPresetMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const loggedRef = useRef(false)
  const queryContext = searchParams.get('title')
    ? { kind: 'task' as const, sourceId: searchParams.get('taskId') ?? undefined, title: searchParams.get('title')!, selectedAt: Date.now() }
    : null
  const context = state.focusContext ?? queryContext
  const [selectedContext, setSelectedContext] = useState<FocusContext | null>(context)
  const focusContext = selectedContext ?? context

  useEffect(() => {
    if (!state.focusContext && queryContext) dispatch({ type: 'SET_FOCUS_CONTEXT', context: queryContext })
  }, [dispatch, queryContext, state.focusContext])

  useEffect(() => { if (context) setSelectedContext(context) }, [context?.sourceId, context?.title])

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current)
          setRunning(false)
          if (!loggedRef.current) {
            dispatch({ type: 'COMPLETE_FOCUS_SESSION', minutes: presetMinutes, context: focusContext })
            loggedRef.current = true
          }
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [running, presetMinutes, dispatch, focusContext])

  function choosePreset(minutes: number) {
    setPresetMinutes(minutes)
    setSecondsLeft(minutes * 60)
    setRunning(false)
    loggedRef.current = false
  }

  function reset() {
    setSecondsLeft(presetMinutes * 60)
    setRunning(false)
    loggedRef.current = false
  }

  function endSession() {
    const elapsed = Math.floor((presetMinutes * 60 - secondsLeft) / 60)
    setRunning(false)
    if (elapsed > 0 && !loggedRef.current) dispatch({ type: 'COMPLETE_FOCUS_SESSION', minutes: elapsed, context: focusContext })
    loggedRef.current = true
    setSecondsLeft(0)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const pct = Math.round(((presetMinutes * 60 - secondsLeft) / (presetMinutes * 60)) * 100)

  function selectContext(value: string) {
    const [kind, id] = value.split(':')
    if (!id) return
    if (kind === 'learning') {
      const track = state.learning.find((item) => item.id === id)
      if (!track) return
      const next: FocusContext = { kind: 'learning', sourceId: id, title: track.name, selectedAt: Date.now() }
      setSelectedContext(next)
      dispatch({ type: 'SET_FOCUS_CONTEXT', context: next })
      return
    }
    const block = state.plan.find((item) => item.id === id)
    if (!block) return
    const next: FocusContext = { kind: block.kind, sourceId: id, title: block.title, selectedAt: Date.now() }
    setSelectedContext(next)
    dispatch({ type: 'SET_FOCUS_CONTEXT', context: next })
  }

  return <AppShell>
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="text-center"><div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Focus Mode</div><h1 className="serif mt-2 text-4xl sm:text-5xl">{focusContext?.title ?? 'Choose what to focus on.'}</h1><p className="mt-2 text-sm text-tempo-muted">{focusContext ? 'This session is connected to your Tempo plan and will log progress when complete.' : 'Choose a task or learning session before starting.'}</p></div>
      {!focusContext && <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-tempo-line bg-white/90 p-4 text-left"><label className="text-xs font-semibold text-tempo-muted">Focus context<select defaultValue="" onChange={(event) => selectContext(event.target.value)} className="tempo-input mt-1"><option value="">Select a task or learning session</option>{state.plan.filter((block) => !block.done).map((block) => <option key={`task:${block.id}`} value={`task:${block.id}`}>Task · {block.title}</option>)}{state.learning.map((track) => <option key={`learning:${track.id}`} value={`learning:${track.id}`}>Learning · {track.name}</option>)}</select></label></div>}
      <div className="mt-8 rounded-3xl border border-tempo-line bg-white/90 p-8 text-center shadow-card sm:p-12"><Mascot size="lg" /><div className="mono mt-6 text-6xl font-semibold tabular-nums sm:text-7xl">{mm}:{ss}</div><div className="mx-auto mt-5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#eceae3]"><div className="h-full rounded-full bg-tempo-sage transition-all" style={{ width: `${pct}%` }} /></div><div className="mt-6 flex justify-center gap-2">{PRESETS.map((minutes) => <button key={minutes} onClick={() => choosePreset(minutes)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${presetMinutes === minutes ? 'border-tempo-sage bg-tempo-sageSoft text-tempo-sage' : 'border-tempo-line text-tempo-muted'}`}>{minutes}m</button>)}</div><div className="mt-6 flex flex-wrap justify-center gap-3"><button disabled={!focusContext} onClick={() => setRunning((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-6 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-40">{running ? <Pause size={16} /> : <Play size={16} />} {running ? 'Pause' : secondsLeft === presetMinutes * 60 ? 'Start' : 'Resume'}</button><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-tempo-line px-6 py-3 text-sm font-semibold text-tempo-muted"><RotateCcw size={16} /> Reset</button><button disabled={!focusContext || secondsLeft === presetMinutes * 60} onClick={endSession} className="inline-flex items-center gap-2 rounded-xl border border-tempo-coral/50 px-4 py-3 text-sm font-semibold text-tempo-coral disabled:opacity-40"><Square size={14} /> End session</button></div>{secondsLeft === 0 && <p className="mt-5 text-sm font-semibold text-tempo-sage">Focus session logged to your plan.</p>}</div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-tempo-line bg-white/80 p-4 text-center"><div className="text-xs text-tempo-muted">Focused today</div><div className="mt-1 text-2xl font-semibold">{state.focusMinutesToday}m</div></div><div className="rounded-2xl border border-tempo-line bg-white/80 p-4 text-center"><div className="text-xs text-tempo-muted">Day streak</div><div className="mt-1 text-2xl font-semibold">{state.focusStreak}</div></div></div>
    </div>
  </AppShell>
}
