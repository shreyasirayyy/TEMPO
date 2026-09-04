'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

// Shared bottom-sheet-on-mobile / centered-modal-on-desktop primitive.
// One component, two layouts driven entirely by Tailwind breakpoints —
// no separate mobile/desktop implementations.

// Module-level open count so the body scroll lock survives multiple sheets
// opening/closing in quick succession — only the LAST sheet to close should
// restore scrolling, not whichever one happens to unmount first.
let openSheetCount = 0
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    openSheetCount += 1
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      openSheetCount = Math.max(0, openSheetCount - 1)
      if (openSheetCount === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-tempo-ink/25 backdrop-blur-[1px] md:items-center md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <section
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[88vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl bg-tempo-panel shadow-soft md:max-h-[85vh] md:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-tempo-line px-5 pb-4 pt-5 md:px-7 md:pt-7">
          <div className="min-w-0">
            {eyebrow && <div className="mono text-[10px] uppercase tracking-widest text-tempo-sage">{eyebrow}</div>}
            <h2 className="serif mt-1 truncate text-2xl md:text-3xl">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-tempo-line bg-white text-tempo-muted"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7 md:py-6">{children}</div>
      </section>
    </div>
  )
}
