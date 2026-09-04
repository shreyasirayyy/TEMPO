'use client'

import Link from 'next/link'
import { Check, Inbox as InboxIcon, Plus, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Mascot } from '@/components/mascot'
import { findDuplicateApplication } from '@/lib/duplicates'
import { useTempo } from '@/lib/store'

export default function InboxPage() {
  const { state, dispatch } = useTempo()
  const pending = state.captures.filter((c) => c.status === 'pending' || c.status === 'processing')
  const resolved = state.captures.filter((c) => c.status === 'confirmed' || c.status === 'dismissed')

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mono text-[10px] uppercase tracking-[0.28em] text-tempo-sage">Tempo</div>
            <h1 className="serif mt-2 text-4xl sm:text-5xl">Inbox</h1>
            <p className="mt-2 text-sm text-tempo-muted">Everything Tempo has captured or extracted, waiting for your confirmation.</p>
          </div>
          <Link href="/capture" className="inline-flex items-center gap-2 rounded-xl bg-tempo-sage px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
            <Plus size={15} /> New capture
          </Link>
        </div>

        {pending.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-tempo-line bg-white/70 p-10 text-center">
            <Mascot />
            <p className="mt-3 text-sm font-semibold">Inbox zero.</p>
            <p className="mt-1 text-xs text-tempo-muted">Nothing is waiting on you right now.</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mt-7 space-y-3">
            {pending.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-tempo-line bg-white/90 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tempo-sageSoft text-tempo-sage"><InboxIcon size={16} /></div>
                  <div className="min-w-0">
                    {c.status === 'processing' ? (
                      <div className="text-sm font-semibold text-tempo-muted">Reading capture…</div>
                    ) : c.extracted?.kind === 'application' ? (
                      <>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold">{c.extracted.company} — {c.extracted.role}</span>
                          {findDuplicateApplication(c.extracted, state.applications) && (
                            <span className="shrink-0 rounded-full bg-tempo-amberSoft px-2 py-0.5 text-[9px] font-semibold text-[#8a5a0a]">
                              Possible duplicate
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-tempo-muted">Application detected · deadline {c.extracted.deadline}</div>
                      </>
                    ) : c.extracted ? (
                      <>
                        <div className="truncate text-sm font-semibold">{c.extracted.title}</div>
                        <div className="text-xs text-tempo-muted">Task detected · due {c.extracted.due}</div>
                      </>
                    ) : (
                      <div className="text-sm font-semibold">New capture</div>
                    )}
                  </div>
                </div>
                {c.status === 'pending' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => c.extracted && dispatch({ type: 'CONFIRM_CAPTURE', id: c.id, edited: c.extracted })}
                      className="inline-flex items-center gap-1 rounded-xl bg-tempo-sage px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Check size={13} /> Confirm
                    </button>
                    <button onClick={() => dispatch({ type: 'DISMISS_CAPTURE', id: c.id })} className="inline-flex items-center gap-1 rounded-xl border border-tempo-line px-3 py-2 text-xs font-semibold text-tempo-muted">
                      <Trash2 size={13} /> Discard
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {resolved.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-tempo-muted">Resolved</h2>
            <div className="mt-3 space-y-2">
              {resolved.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-tempo-line bg-white/60 px-4 py-2.5 text-xs text-tempo-muted">
                  <span className="truncate">{c.extracted?.kind === 'application' ? `${c.extracted.company} — ${c.extracted.role}` : c.extracted?.title ?? 'Capture'}</span>
                  <span className="shrink-0 capitalize">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
