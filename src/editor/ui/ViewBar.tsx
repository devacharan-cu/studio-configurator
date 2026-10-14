import { useState } from 'react'
import { PRESET_LABELS, type ViewPreset } from '../scene/framing'
import { useEditor } from '../store'
import { Icon } from './icons'
import { QualityPicker } from './QualityPicker'

/** Orbit-view camera controls over the 3D view: overview, preset viewpoints and frame selection. */
export function ViewBar() {
  const selection = useEditor((s) => s.selection)
  const requestView = useEditor((s) => s.requestView)
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-paper/90 p-1 shadow-md backdrop-blur-sm" role="toolbar" aria-label="Camera">
      <button type="button" className="btn-ghost h-7 w-7 px-0" onClick={() => requestView({ kind: 'preset', preset: 'overview' })} aria-label="Frame the whole home" title="Frame the whole home (H)">
        <Icon name="home" size={15} />
      </button>
      <button
        type="button"
        className="btn-ghost h-7 w-7 px-0"
        onClick={() => requestView({ kind: 'selection' })}
        disabled={!selection}
        aria-label="Frame selection"
        title="Frame the selected element (F)"
      >
        <Icon name="target" size={15} />
      </button>
      <div className="relative">
        <button type="button" className="btn-ghost h-7 px-2.5 text-[12px]" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
          <Icon name="cube" size={14} /> Views
        </button>
        {open && (
          <div className="absolute top-9 right-0 w-64 rounded-xl border border-line bg-paper p-1 shadow-xl">
            <div role="menu" aria-label="Views">
              {(Object.keys(PRESET_LABELS) as ViewPreset[]).map((v) => (
                <button
                  key={v}
                  role="menuitem"
                  type="button"
                  className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-linen"
                  onClick={() => {
                    requestView({ kind: 'preset', preset: v })
                    setOpen(false)
                  }}
                >
                  {PRESET_LABELS[v]}
                </button>
              ))}
            </div>
            <div className="mt-1 border-t border-line pt-1">
              <QualityPicker />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
