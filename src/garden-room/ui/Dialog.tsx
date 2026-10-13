import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Accessible modal built on the native <dialog> element: focus is trapped and restored,
 * Escape closes, the page behind is inert. `variant="sheet"` docks to the right on desktop.
 */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  variant = 'modal',
  width = 'max-w-lg',
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  variant?: 'modal' | 'sheet'
  width?: string
  labelledBy?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = labelledBy ?? `dlg-${title.replace(/\W+/g, '-').toLowerCase()}`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  const position =
    variant === 'sheet'
      ? 'm-0 ml-auto h-dvh max-h-dvh w-full sm:max-w-md rounded-none sm:rounded-l-3xl'
      : `m-auto w-[calc(100%-1.5rem)] ${width} max-h-[min(92dvh,860px)] rounded-3xl`

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, outside the panel) closes.
        if (e.target === e.currentTarget) onClose()
      }}
      className={`${position} bg-paper p-0 text-ink shadow-[0_30px_80px_-20px_rgba(35,32,28,0.45)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px] open:animate-[dialog-in_280ms_var(--ease-soft)]`}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line/70 px-6 pt-5 pb-4">
            <div>
              {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
              <h2 id={titleId} className="font-display text-[28px] leading-tight">
                {title}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost -mr-2 h-9 w-9 shrink-0 px-0" aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          <div className="overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}
