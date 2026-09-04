'use client'

import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import type { PriorityItem } from '@/lib/types'

export function WhyButton({ item }: { item: PriorityItem }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-tempo-sage"
      >
        <CircleHelp size={13} /> Why?
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={item.title} eyebrow="Why this priority">
        <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
          item.priority === 'High' ? 'border-[#f4c8c3] bg-tempo-coralSoft text-tempo-coral'
          : item.priority === 'Medium' ? 'border-[#f0dda9] bg-tempo-amberSoft text-[#a56d0f]'
          : 'border-[#cbe1d8] bg-tempo-sageSoft text-tempo-sage'
        }`}>{item.priority} Priority</div>
        <p className="mt-3 text-sm text-tempo-ink">{item.why}</p>
        <div className="mt-5 space-y-2">
          {item.whyFactors.map((f) => (
            <div key={f.label} className="flex items-start justify-between gap-4 rounded-xl border border-tempo-line bg-white px-3 py-2.5 text-sm">
              <span className="text-tempo-muted">{f.label}</span>
              <span className="text-right font-medium">{f.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-tempo-muted">
          Tempo weighs deadline proximity, consequence, effort, dependencies, your available time and your stated preferences
          to decide what surfaces first — nothing is hidden.
        </p>
      </Sheet>
    </>
  )
}
