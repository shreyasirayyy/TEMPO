'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Clipboard, Image as ImageIcon, File as FileIcon, Check, Loader2, Pencil, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Mascot } from '@/components/mascot'
import { useTempo } from '@/lib/store'
import { makeId } from '@/lib/id'
import { detectDate, parseCapture, splitCaptureSegments } from '@/lib/ai/captureParser'
import { tryAiExtract, tryAiExtractAll } from '@/lib/ai/aiExtract'
import { tryAiExtractFromImage } from '@/lib/ai/imageExtract'
import { findDuplicateApplication } from '@/lib/duplicates'
import { transcribeAudio } from '@/lib/ai/transcriptionAdapter'
import type { Application, CaptureItem, CaptureType, Extracted } from '@/lib/types'

const typeMeta: Record<CaptureType, { label: string; icon: any; hint: string }> = {
  screenshot: { label: 'Upload screenshot', icon: ImageIcon, hint: 'PNG or JPG of a confirmation, portal, or message' },
  text: { label: 'Paste text', icon: Clipboard, hint: 'Paste an email, message, or assignment note' },
  voice: { label: 'Voice note', icon: Mic, hint: 'Record a real voice note, then review the extracted details' },
  file: { label: 'Upload file', icon: FileIcon, hint: 'PDF or document' },
}

export default function CapturePage() {
  const { state, dispatch } = useTempo()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeType, setActiveType] = useState<CaptureType | null>(null)
  const [textValue, setTextValue] = useState('')
  const [capture, setCapture] = useState<CaptureItem | null>(null)
  const [draft, setDraft] = useState<Extracted | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState('')
  // Queue of remaining already-extracted items when a single paste contained
  // multiple commitments -- confirm()/skip() pull the next one straight into
  // review instead of re-running extraction or clearing back to the drop zone.
  const [queue, setQueue] = useState<Extracted[]>([])

  // Shows one already-extracted item in the review panel, registering it as
  // its own capture entry (so Inbox/history has one row per real commitment,
  // not one row for the whole multi-task paste).
  function showExtracted(rawText: string, extracted: Extracted) {
    const item: CaptureItem = { id: makeId('cap'), type: 'text', rawText, createdAt: Date.now(), status: 'pending', extracted }
    dispatch({ type: 'ADD_CAPTURE', item })
    dispatch({ type: 'UPDATE_CAPTURE_EXTRACTION', id: item.id, extracted, status: 'pending' })
    setCapture(item)
    setDraft(extracted)
  }

  function extractedRawText(extracted: Extracted): string {
    return extracted.kind === 'task' ? extracted.title : `${extracted.company || 'Application'} — ${extracted.role || 'role'}`
  }

  // Text-paste entry point: sends the WHOLE pasted block to the LLM once,
  // which now finds every distinct commitment in it (see backend's
  // MULTI_CAPTURE_SYSTEM_PROMPT). Falls back to the local regex splitter +
  // per-segment parseCapture only if the LLM is unavailable/fails, so a
  // multi-task paste still degrades gracefully with no AI configured.
  async function beginTextCapture(rawText: string) {
    const placeholder: CaptureItem = { id: makeId('cap'), type: 'text', rawText, createdAt: Date.now(), status: 'processing' }
    setCapture(placeholder)
    setDraft(null)
    dispatch({ type: 'ADD_CAPTURE', item: placeholder })

    const llmItems = await tryAiExtractAll(rawText)
    const items = llmItems && llmItems.length > 0 ? llmItems : splitCaptureSegments(rawText).map((segment) => parseCapture('text', segment))

    const [first, ...rest] = items
    setQueue(rest)
    dispatch({ type: 'UPDATE_CAPTURE_EXTRACTION', id: placeholder.id, extracted: first, status: 'pending' })
    setCapture({ ...placeholder, status: 'pending', extracted: first })
    setDraft(first)
  }

  function startProcessing(type: CaptureType, rawText: string, proof?: string) {
    const item: CaptureItem = { id: makeId('cap'), type, rawText, createdAt: Date.now(), status: 'processing', proof }
    setCapture(item)
    setDraft(null)
    dispatch({ type: 'ADD_CAPTURE', item })
    void (async () => {
      // Screenshots get a real OCR+extraction pass over the actual image
      // (proof is the data URL) before falling back to text extraction --
      // for every other capture type, or if the image path returns nothing
      // usable, fall through to the same LLM-text -> regex fallback chain
      // as before.
      const imageResult = type === 'screenshot' && proof?.startsWith('data:image/') ? await tryAiExtractFromImage(proof) : null
      const llmResult = imageResult ?? (await tryAiExtract(rawText))
      const extracted = llmResult ?? parseCapture(type, rawText)
      dispatch({ type: 'UPDATE_CAPTURE_EXTRACTION', id: item.id, extracted, status: 'pending' })
      setCapture({ ...item, status: 'pending', extracted })
      setDraft(extracted)
    })()
  }

  async function beginVoice() {
    setVoiceError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('This browser does not support microphone recording.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
      }
      recorderRef.current = recorder
      setRecordingSeconds(0)
      setRecording(true)
      recorder.start()
    } catch (error) {
      setVoiceError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow access and try again.' : error instanceof Error ? error.message : 'Microphone recording could not start.')
    }
  }

  function stopVoice() { recorderRef.current?.stop(); setRecording(false) }
  function deleteVoice() { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); chunksRef.current = [] }
  async function useVoice() {
    if (!chunksRef.current.length) return
    const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || 'audio/webm' })
    const text = await transcribeAudio(blob)
    startProcessing('voice', text)
  }

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  function handleFile(type: CaptureType, file: File) {
    const reader = new FileReader()
    reader.onload = () => startProcessing(type, `${type} upload: ${file.name}`, typeof reader.result === 'string' ? reader.result : undefined)
    reader.readAsDataURL(file)
  }

  function reset() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    recorderRef.current = null
    chunksRef.current = []
    setActiveType(null)
    setCapture(null)
    setDraft(null)
    setTextValue('')
    setRecording(false)
    setAudioUrl(null)
    setQueue([])
  }

  // Pulls the next queued segment (if any) straight into processing instead
  // of dropping back to the "what are you capturing" screen -- keeps a
  // multi-task paste moving through review item-by-item.
  function advanceQueue() {
    setQueue((current) => {
      const [next, ...rest] = current
      if (next) showExtracted(extractedRawText(next), next)
      else reset()
      return rest
    })
  }

  function confirm() {
    if (!capture || !draft) return
    dispatch({ type: 'CONFIRM_CAPTURE', id: capture.id, edited: draft })
    if (draft.kind === 'application') {
      setSavedMessage(`Saved to Application Memory — ${draft.company || 'application details'} are now part of your plan. Review any fields marked Needs Review.`)
    } else {
      setSavedMessage(`Added to your plan — "${draft.title}" will show up in What Matters Now.`)
    }
    if (queue.length > 0) advanceQueue()
    else reset()
  }

  function skipQueued() {
    if (queue.length > 0) advanceQueue()
    else reset()
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Drop anything</div>
        <h1 className="serif mt-2 text-4xl sm:text-5xl">Smart Capture</h1>
        <p className="mt-2 max-w-2xl text-sm text-tempo-muted">
          Tempo turns messy messages, screenshots, voice notes and files into structured context — you always confirm before anything is saved.
        </p>

        {savedMessage && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#cbe1d8] bg-tempo-sageSoft px-4 py-3 text-sm text-tempo-ink">
            <span>{savedMessage}</span>
            <button onClick={() => setSavedMessage(null)} aria-label="Dismiss"><X size={15} /></button>
          </div>
        )}

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-3xl border border-tempo-line bg-white/90 p-5 shadow-card sm:p-6">
            {!capture && (
              <div className="rounded-2xl border-2 border-dashed border-[#dfe3dc] bg-tempo-cream p-6 text-center sm:p-8">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-tempo-sageSoft text-tempo-sage">
                  <ImageIcon size={22} />
                </div>
                <h2 className="mt-4 font-semibold">What are you capturing?</h2>
                <p className="mt-1 text-xs text-tempo-muted">Choose a source — Tempo extracts the structure for you.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {(Object.keys(typeMeta) as CaptureType[]).map((t) => {
                    const meta = typeMeta[t]
                    const Icon = meta.icon
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setActiveType(t)
                          if (t === 'screenshot' || t === 'file') fileInputRef.current?.click()
                          if (t === 'voice') beginVoice()
                        }}
                        className="rounded-xl border border-tempo-line bg-white px-4 py-2 text-sm font-semibold text-tempo-ink"
                      >
                        <Icon size={14} className="mr-1 inline" /> {meta.label}
                      </button>
                    )
                  })}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={activeType === 'screenshot' ? 'image/*' : undefined}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(activeType === 'file' ? 'file' : 'screenshot', file)
                    e.target.value = ''
                  }}
                />
                {activeType === 'text' && (
                  <div className="mt-5 text-left">
                    <textarea
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      rows={5}
                      placeholder="Paste an email, confirmation message, or assignment note…"
                      className="w-full rounded-2xl border border-tempo-line bg-white p-3 text-sm outline-none focus:border-tempo-sage"
                    />
                    <button
                      disabled={!textValue.trim()}
                      onClick={() => void beginTextCapture(textValue)}
                      className="mt-3 w-full rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      Process with Tempo
                    </button>
                  </div>
                )}
                {activeType === 'voice' && !capture && <VoiceRecorder recording={recording} seconds={recordingSeconds} audioUrl={audioUrl} error={voiceError} onStart={beginVoice} onStop={stopVoice} onDelete={deleteVoice} onUse={useVoice} onCancel={reset} />}
                {activeType !== 'text' && activeType !== 'voice' && (
                  <button onClick={() => setActiveType('text')} className="mt-4 text-xs font-semibold text-tempo-sage underline-offset-2 hover:underline">
                    Or paste text instead
                  </button>
                )}
              </div>
            )}

            {capture?.status === 'processing' && (
              <div className="grid place-items-center gap-3 py-10 text-center">
                <Mascot />
                <div className="flex items-center gap-2 text-sm font-semibold"><Loader2 size={15} className="animate-spin" /> Reading and understanding…</div>
                <p className="max-w-xs text-xs text-tempo-muted">Detecting company, role, dates, and what&apos;s already been submitted.</p>
              </div>
            )}

            {capture && draft && capture.status !== 'processing' && (
              <>
                {queue.length > 0 && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#cbe1d8] bg-tempo-sageSoft px-3 py-2 text-xs text-tempo-ink">
                    <span>{queue.length} more item{queue.length > 1 ? 's' : ''} detected in this paste — reviewing one at a time.</span>
                    <button onClick={skipQueued} className="shrink-0 font-semibold text-tempo-sage underline-offset-2 hover:underline">Skip this one</button>
                  </div>
                )}
                <ReviewPanel draft={draft} setDraft={setDraft} onConfirm={confirm} onCancel={queue.length > 0 ? skipQueued : reset} applications={state.applications} />
              </>
            )}
          </section>

          <aside className="rounded-3xl border border-tempo-line bg-tempo-panel p-6">
            <div className="mono text-[10px] uppercase tracking-widest text-tempo-sage">How it works</div>
            <div className="mt-4 space-y-4">
              {[
                ['01', 'Capture', 'Screenshot, text, voice, file'],
                ['02', 'Understand', 'Task, deadline, effort, context'],
                ['03', 'Prioritise', 'Urgency, impact, effort, dependencies'],
                ['04', 'Confirm', 'You approve before saving'],
              ].map(([n, t, d]) => (
                <div key={n} className="flex gap-3">
                  <div className="mono text-[10px] text-tempo-sage">{n}</div>
                  <div>
                    <div className="text-sm font-semibold">{t}</div>
                    <div className="text-xs text-tempo-muted">{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-tempo-sageSoft p-4 text-xs text-tempo-ink">
              Nothing is saved automatically. Every capture waits in your Inbox until you confirm it.
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

function VoiceRecorder({ recording, seconds, audioUrl, error, onStart, onStop, onDelete, onUse, onCancel }: { recording: boolean; seconds: number; audioUrl: string | null; error: string; onStart: () => void; onStop: () => void; onDelete: () => void; onUse: () => void; onCancel: () => void }) {
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <div className="mt-5 rounded-2xl border border-tempo-line bg-white p-4 text-left">
    <div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-full ${recording ? 'bg-tempo-coralSoft text-tempo-coral' : 'bg-tempo-sageSoft text-tempo-sage'}`}><Mic size={18} /></div><div><div className="text-sm font-semibold">{recording ? 'Recording…' : audioUrl ? 'Recording ready for review' : 'Voice recording'}</div><div className="mono text-xs text-tempo-muted">{clock}</div></div></div>
    {error && <p className="mt-3 rounded-lg bg-tempo-coralSoft px-3 py-2 text-xs text-tempo-coral">{error}</p>}
    {audioUrl && <audio className="mt-4 w-full" controls src={audioUrl} />}
    <div className="mt-4 flex flex-wrap gap-2">
      {!recording && !audioUrl && <button onClick={onStart} className="rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white">Start recording</button>}
      {recording && <button onClick={onStop} className="rounded-xl bg-tempo-coral px-4 py-2 text-xs font-semibold text-white">Stop recording</button>}
      {audioUrl && <><button onClick={onStart} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold">Record again</button><button onClick={onDelete} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold text-tempo-coral">Delete recording</button><button onClick={onUse} className="rounded-xl bg-tempo-sage px-4 py-2 text-xs font-semibold text-white">Use recording</button></>}
      <button onClick={onCancel} className="rounded-xl border border-tempo-line px-4 py-2 text-xs font-semibold text-tempo-muted">Cancel</button>
    </div>
  </div>
}

function NeedsReview({ show }: { show: boolean }) {
  if (!show) return null
  return <span className="shrink-0 rounded-full bg-tempo-coralSoft px-2 py-0.5 text-[9px] font-semibold text-tempo-coral">Needs Review</span>
}

function ReviewPanel({
  draft,
  setDraft,
  onConfirm,
  onCancel,
  applications,
}: {
  draft: Extracted
  setDraft: (d: Extracted) => void
  onConfirm: () => void
  onCancel: () => void
  applications: Application[]
}) {
  // Auto-open editing whenever Tempo couldn't confidently detect something —
  // uncertain fields should be visible and easy to fill in immediately,
  // not buried behind a "Review & edit" toggle.
  const [editing, setEditing] = useState(() => draft.uncertainFields.length > 0)
  const [confirmDuplicateAnyway, setConfirmDuplicateAnyway] = useState(false)

  const isUncertain = (field: string) => draft.uncertainFields.includes(field)
  const clearUncertain = (field: string) => draft.uncertainFields.filter((f) => f !== field)
  const setUncertain = (field: string, uncertain: boolean) => uncertain ? (draft.uncertainFields.includes(field) ? draft.uncertainFields : [...draft.uncertainFields, field]) : clearUncertain(field)

  const duplicateOf = draft.kind === 'application' ? findDuplicateApplication(draft, applications) : null
  const missingRequired = draft.kind === 'task' && !draft.title.trim()
  const blockedByDuplicate = !!duplicateOf && !confirmDuplicateAnyway
  const canSave = !missingRequired && !blockedByDuplicate

  return (
    <div className="rounded-2xl border border-tempo-line bg-[#fdfdf8] p-5">
      <div className="flex items-center gap-3">
        <Mascot size="sm" />
        <div>
          <div className="text-sm font-semibold">Tempo found something important.</div>
          <div className="text-xs text-tempo-muted">
            {draft.uncertainFields.length > 0 ? 'Some details need review before this can be saved.' : 'Review before anything gets saved.'}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {draft.kind === 'application' ? (
          <div className="rounded-2xl border border-tempo-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {editing ? (
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <input className="min-w-0 rounded-lg border border-tempo-line px-2 py-1 text-sm font-semibold" placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value, uncertainFields: setUncertain('company', !e.target.value.trim()) })} />
                  <input className="min-w-0 rounded-lg border border-tempo-line px-2 py-1 text-sm font-semibold" placeholder="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value, uncertainFields: setUncertain('role', !e.target.value.trim()) })} />
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 truncate font-semibold">
                    {draft.company || <span className="text-tempo-muted">Company needs review</span>} · {draft.role || <span className="text-tempo-muted">Role needs review</span>}
                  </div>
                  <NeedsReview show={isUncertain('company') || isUncertain('role')} />
                </div>
              )}
              <span className="shrink-0 rounded-full bg-tempo-sageSoft px-2 py-1 text-[10px] font-semibold text-tempo-sage">Application detected</span>
            </div>
            {editing ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as typeof draft.status })}
                    className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs"
                  >
                    {['Needs Review', 'Form Started', 'Applied', 'In Progress', 'Interview', 'Offer', 'Rejected'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Deadline" badge={<NeedsReview show={isUncertain('deadline')} />}>
                  <input
                    className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs"
                    placeholder="e.g. Sep 12"
                    value={draft.deadline}
                    onChange={(e) => {
                      const value = e.target.value
                      const detected = detectDate(value)
                      setDraft({
                        ...draft,
                        deadline: value,
                        deadlineAt: detected?.at ?? null,
                        uncertainFields: setUncertain('deadline', !detected),
                      })
                    }}
                  />
                </Field>
                <Field label="Applied on">
                  <input className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs" value={draft.appliedOn} onChange={(e) => setDraft({ ...draft, appliedOn: e.target.value })} />
                </Field>
                <Field label="Follow-up">
                  <input className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs" value={draft.followUpDate} onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })} />
                </Field>
                <Field label="Link" full>
                  <input className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder="https://" />
                </Field>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-tempo-muted">
                <span>{draft.status} · Deadline {draft.deadline || 'needs review'} · Applied {draft.appliedOn}{draft.followUpDate ? ` · Follow-up ${draft.followUpDate}` : ''}</span>
              </div>
            )}
            {draft.questions.length > 0 && (
              <div className="mt-3 text-xs text-tempo-muted"><strong className="text-tempo-ink">Questions detected:</strong> {draft.questions.join(', ')}</div>
            )}
            {draft.submittedItems.length > 0 && (
              <div className="mt-1 text-xs text-tempo-muted"><strong className="text-tempo-ink">Submitted:</strong> {draft.submittedItems.join(', ')}</div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-tempo-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {editing ? (
                <input className="min-w-0 flex-1 rounded-lg border border-tempo-line px-2 py-1 text-sm font-semibold" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              ) : (
                <div className="font-semibold">{draft.title}</div>
              )}
              <span className="shrink-0 rounded-full bg-tempo-amberSoft px-2 py-1 text-[10px] font-semibold text-[#a56d0f]">Task detected</span>
            </div>
            {editing ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Due" badge={<NeedsReview show={isUncertain('due')} />}>
                  <input
                    className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs"
                    placeholder="e.g. Tomorrow"
                    value={draft.due}
                    onChange={(e) => {
                      const value = e.target.value
                      const detected = detectDate(value)
                      setDraft({
                        ...draft,
                        due: value,
                        dueAt: detected?.at ?? null,
                        uncertainFields: setUncertain('due', !detected),
                      })
                    }}
                  />
                </Field>
                <Field label="Effort" badge={<NeedsReview show={isUncertain('effort')} />}>
                  <input
                    className="w-full rounded-lg border border-tempo-line px-2 py-1.5 text-xs"
                    placeholder="e.g. 45m"
                    value={draft.effort}
                    onChange={(e) => setDraft({ ...draft, effort: e.target.value, uncertainFields: e.target.value.trim() ? clearUncertain('effort') : draft.uncertainFields })}
                  />
                </Field>
              </div>
            ) : (
              <div className="mt-2 text-xs text-tempo-muted">Due {draft.due || 'needs review'} · {draft.effort || 'needs review'} · {draft.category}</div>
            )}
          </div>
        )}

        {duplicateOf && (
          <div className="rounded-xl border border-tempo-amber/60 bg-tempo-amberSoft p-3 text-xs text-[#8a5a0a]">
            <strong>This looks like it might already be tracked.</strong> {duplicateOf.company} — {duplicateOf.role} is already in Application Memory.{' '}
            <label className="mt-1 flex items-center gap-1.5 font-medium">
              <input type="checkbox" checked={confirmDuplicateAnyway} onChange={(e) => setConfirmDuplicateAnyway(e.target.checked)} />
              Save as a new entry anyway
            </label>
          </div>
        )}
        {missingRequired && (
          <div className="rounded-xl border border-tempo-coral/50 bg-tempo-coralSoft p-3 text-xs text-tempo-coral">
            A task needs a title before saving; due date and effort may stay marked Needs Review.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onConfirm}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} className="mr-1 inline" /> {draft.kind === 'application' ? 'Save to Application Memory' : 'Add to plan'}
          </button>
          <button onClick={() => setEditing((v) => !v)} className="rounded-xl border border-tempo-line px-4 py-2.5 text-sm font-semibold">
            <Pencil size={14} className="mr-1 inline" /> {editing ? 'Done editing' : 'Review & edit'}
          </button>
          <button onClick={onCancel} className="rounded-xl border border-tempo-line px-4 py-2.5 text-sm font-semibold text-tempo-muted">
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, full, badge }: { label: string; children: React.ReactNode; full?: boolean; badge?: React.ReactNode }) {
  return (
    <label className={`block text-[11px] font-medium text-tempo-muted ${full ? 'sm:col-span-2' : ''}`}>
      <span className="inline-flex items-center gap-1.5">{label}{badge}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}