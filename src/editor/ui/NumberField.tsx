import { useId, useState } from 'react'

/**
 * Numeric input that commits on Enter or blur (not on every keystroke), so each edit is one validated
 * command and one undo step. Shows the model value again if the edit was rejected.
 */
export function NumberField({
  label,
  value,
  unit = 'm',
  step = 0.05,
  min,
  max,
  decimals = 2,
  onCommit,
  testId,
}: {
  label: string
  value: number
  unit?: string
  step?: number
  min?: number
  max?: number
  decimals?: number
  onCommit: (v: number) => unknown
  testId?: string
}) {
  const id = useId()
  // While editing, show the draft; otherwise always show the model value.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value.toFixed(decimals)
  const setText = (t: string) => setDraft(t)

  const commit = () => {
    const v = Number(text.replace(',', '.'))
    setDraft(null)
    if (!Number.isFinite(v) || Math.abs(v - value) < 10 ** -(decimals + 1)) return
    onCommit(v)
  }

  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className="text-ink-soft">{label}</span>
      <span className="flex items-center rounded-lg border border-line bg-white focus-within:border-ink-soft">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={text}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setDraft(value.toFixed(decimals))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setDraft(value.toFixed(decimals))
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="w-[76px] bg-transparent px-2 py-1.5 text-right font-mono text-[12.5px] tabular-nums focus:outline-none"
        />
        <span className="pr-2 text-[11px] text-mute">{unit}</span>
      </span>
    </label>
  )
}
