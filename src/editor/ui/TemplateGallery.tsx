import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTemplate, KIND_LABELS, TEMPLATES, templatePreview, type TemplateDef, type TemplateKind } from '../../engine/templates'
import { useEditor } from '../store'
import { Icon } from './icons'
import { PlanPreview } from './PlanPreview'

const thumb = (t: TemplateDef) => `/assets/templates/${t.id}.webp`

function Facts({ t }: { t: TemplateDef }) {
  if (!t.spec) return <p className="text-[11.5px] text-mute">Empty plan</p>
  const s = templatePreview(t).stats
  return (
    <p className="text-[11.5px] text-ink-soft tabular-nums" data-testid="template-facts">
      {s.bedrooms ? `${s.bedrooms} bed` : 'Studio'} · {s.bathrooms} bath · {s.floors} {s.floors === 1 ? 'floor' : 'floors'} · {s.area.toFixed(0)} m²
    </p>
  )
}

function Thumb({ t, className }: { t: TemplateDef; className: string }) {
  const [failed, setFailed] = useState(false)
  if (!t.spec) return <div className={`${className} grid place-items-center bg-linen text-mute`}><Icon name="room" size={28} /></div>
  // fall back to the plan drawn from the data if the captured image is missing
  return failed ? (
    <div className={`${className} bg-[#f7f5f0] p-2`}>
      <PlanPreview project={templatePreview(t).project} labels={false} className="h-full w-full" />
    </div>
  ) : (
    <img src={thumb(t)} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} object-cover`} />
  )
}

/**
 * The house library: browse by type, search, inspect a design (captured 3D view + its real plan +
 * numbers computed from the model), then create an editable copy. The template itself never changes.
 */
export function TemplateGallery({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [kind, setKind] = useState<TemplateKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<TemplateDef | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const kinds = useMemo(() => [...new Set(TEMPLATES.map((t) => t.kind))], [])
  const list = TEMPLATES.filter((t) => {
    const text = `${t.name} ${t.style} ${t.description} ${t.tags.join(' ')}`.toLowerCase()
    return (kind === 'all' || t.kind === kind) && text.includes(q.trim().toLowerCase())
  })

  useEffect(() => {
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (picked) setPicked(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [picked, onClose])

  const create = (t: TemplateDef) => {
    useEditor.getState().loadProject(buildTemplate(t), `New project from “${t.name}”. The template is unchanged; undo history starts here.`)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-3 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="House templates"
        className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-paper shadow-2xl outline-none"
        data-testid="template-gallery"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-line/80 px-5 py-3">
          <h2 className="font-display text-[24px]">{picked ? picked.name : 'Start from a design'}</h2>
          {!picked && (
            <>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Type">
                {(['all', ...kinds] as (TemplateKind | 'all')[]).map((k) => (
                  <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-full px-2.5 py-1 text-[12px] ${kind === k ? 'bg-ink text-paper' : 'bg-linen text-ink-soft hover:text-ink'}`}>
                    {k === 'all' ? 'All' : KIND_LABELS[k]}
                  </button>
                ))}
              </div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search designs…" aria-label="Search designs" className="field ml-auto w-56 py-1.5" />
            </>
          )}
          <button type="button" onClick={picked ? () => setPicked(null) : onClose} className="btn-ghost ml-auto h-8 px-2 text-[12.5px]" aria-label={picked ? 'Back to all designs' : 'Close'}>
            <Icon name="close" size={16} /> {picked ? 'Back' : ''}
          </button>
        </header>

        {picked ? (
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[3fr_2fr]" data-testid="template-preview">
            <div className="space-y-3">
              <Thumb t={picked} className="aspect-[16/10] w-full rounded-xl" />
              {picked.spec && (
                <div className="rounded-xl border border-line bg-[#f7f5f0] p-3">
                  <p className="eyebrow mb-1">Floor plan</p>
                  <PlanPreview project={templatePreview(picked).project} className="max-h-[38dvh] w-full" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="eyebrow">
                {KIND_LABELS[picked.kind]} · {picked.style}
              </p>
              <Facts t={picked} />
              <p className="text-[13.5px] leading-relaxed text-ink-soft">{picked.description}</p>
              {picked.spec && (
                <ul className="space-y-1 text-[12.5px]" aria-label="Rooms">
                  {Object.values(templatePreview(picked).project.rooms).map((r) => (
                    <li key={r.id} className="flex justify-between border-b border-line/50 py-1">
                      <span>{r.name}</span>
                      <span className="text-mute capitalize">{r.type}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-1">
                {picked.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-linen px-2 py-0.5 text-[11px] text-ink-soft">
                    {tag}
                  </span>
                ))}
              </div>
              <button type="button" className="btn-primary h-10 w-full justify-center text-[13px]" onClick={() => create(picked)}>
                Create a project from this design
              </button>
              <p className="text-[11.5px] text-mute">Your current project is replaced (export it first to keep a copy). The template itself never changes.</p>
            </div>
          </div>
        ) : (
          <ul className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Designs">
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setPicked(t)} data-template={t.id} className="group w-full overflow-hidden rounded-xl border border-line bg-white text-left transition hover:border-ink/40 hover:shadow-md">
                  <Thumb t={t} className="aspect-[16/10] w-full" />
                  <div className="space-y-1 p-3">
                    <p className="eyebrow">
                      {KIND_LABELS[t.kind]} · {t.style}
                    </p>
                    <p className="font-display text-[18px] leading-tight">{t.name}</p>
                    <Facts t={t} />
                  </div>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="col-span-full py-10 text-center text-[13px] text-mute">No design matches “{q}”.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
