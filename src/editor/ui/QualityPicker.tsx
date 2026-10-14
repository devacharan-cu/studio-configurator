import { QUALITY, QUALITY_LEVELS } from '../scene/quality'
import { useEditor } from '../store'

/** Rendering quality as a three-way radio group (kept per viewer, with the navigation settings). */
export function QualityPicker({ compact = false }: { compact?: boolean }) {
  const quality = useEditor((s) => s.nav.quality)
  const setNav = useEditor((s) => s.setNav)
  return (
    <div className={compact ? '' : 'px-2 py-1.5'}>
      {!compact && <div className="mb-1 text-[12px]">Graphics quality</div>}
      <div role="radiogroup" aria-label="Graphics quality" className="flex rounded-full border border-line bg-linen/60 p-0.5" data-testid="quality-picker">
        {QUALITY_LEVELS.map((q) => (
          <button
            key={q}
            type="button"
            role="radio"
            aria-checked={quality === q}
            title={QUALITY[q].hint}
            onClick={() => setNav({ quality: q })}
            className={`flex-1 rounded-full px-2 py-1 text-[11.5px] whitespace-nowrap transition-colors ${quality === q ? 'bg-ink text-paper' : 'text-mute hover:text-ink'}`}
          >
            {QUALITY[q].label}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-1 text-[11px] leading-snug text-mute">{QUALITY[quality].hint}</p>}
    </div>
  )
}
