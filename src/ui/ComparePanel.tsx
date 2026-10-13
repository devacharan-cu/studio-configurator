import { GROUPS, getOption } from '../domain/catalog'
import { differingGroups } from '../domain/configuration'
import { GROUP_IDS, type AnyOption } from '../domain/types'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { MaterialSwatch } from './Swatch'

/**
 * Replaces the configurator panel while comparing, so the room stays visible.
 * The client flips the room between A and B; neither saved design is modified.
 */
export function ComparePanel() {
  const compare = useStore((s) => s.compare)
  const saved = useStore((s) => s.saved)
  const showCompareSide = useStore((s) => s.showCompareSide)
  const endCompare = useStore((s) => s.endCompare)
  if (!compare) return null
  const a = saved.find((d) => d.id === compare.aId)
  const b = saved.find((d) => d.id === compare.bId)
  if (!a || !b) return null
  const diffs = differingGroups(a.config, b.config)

  const sideButton = (side: 'a' | 'b', name: string) => {
    const active = compare.showing === side
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => showCompareSide(side)}
        className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${
          active ? 'bg-ink text-paper shadow-sm' : 'text-ink-soft hover:text-ink'
        }`}
      >
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] ${active ? 'bg-paper text-ink' : 'bg-ink/10'}`}>
          {side.toUpperCase()}
        </span>
        <span className="truncate">{name}</span>
      </button>
    )
  }

  return (
    <section aria-labelledby="compare-title" className="flex min-h-0 flex-1 flex-col">
      <header className="px-5 pt-5 pb-3 lg:px-6 lg:pt-6">
        <button type="button" onClick={() => endCompare(false)} className="mb-3 flex items-center gap-1.5 text-[12.5px] text-mute hover:text-ink">
          <Icon name="arrowLeft" size={15} /> Back to my design
        </button>
        <p className="eyebrow">Comparing two saved designs</p>
        <h2 id="compare-title" className="mt-1 font-display text-[30px] leading-tight">
          {diffs.length === 0 ? 'These designs are identical' : `${diffs.length} ${diffs.length === 1 ? 'difference' : 'differences'}`}
        </h2>
        <div className="mt-3 flex rounded-full bg-linen p-1" role="group" aria-label="Show in the room">
          {sideButton('a', a.name)}
          {sideButton('b', b.name)}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 lg:px-6">
        <table className="w-full border-separate border-spacing-y-1.5 text-left">
          <caption className="sr-only">
            Option-by-option comparison of {a.name} and {b.name}
          </caption>
          <thead>
            <tr className="eyebrow">
              <th scope="col" className="w-[30%] pb-1 font-medium">
                Item
              </th>
              <th scope="col" className="pb-1 font-medium">
                A · {a.name}
              </th>
              <th scope="col" className="pb-1 font-medium">
                B · {b.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUP_IDS.map((g) => {
              const differs = diffs.includes(g)
              const cell = (id: string, side: 'a' | 'b') => {
                const opt = getOption(g, id) as AnyOption | undefined
                const showing = compare.showing === side
                return (
                  <td className={`rounded-xl px-2.5 py-2 align-top ${differs ? (showing ? 'bg-white ring-1 ring-ink/80' : 'bg-white/70') : ''}`}>
                    {opt && (
                      <span className="flex items-start gap-2">
                        <MaterialSwatch option={opt} className="mt-0.5 h-5 w-5 shrink-0 rounded-full ring-1 ring-ink/10" />
                        <span className={`text-[12.5px] leading-snug ${differs ? 'font-medium text-ink' : 'text-mute'}`}>{opt.name}</span>
                      </span>
                    )}
                  </td>
                )
              }
              return (
                <tr key={g} data-differs={differs}>
                  <th scope="row" className="py-2 pr-2 align-top text-[12.5px] font-normal text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      {differs && <span className="h-1.5 w-1.5 rounded-full bg-bronze" aria-hidden="true" />}
                      {GROUPS[g].label}
                      {differs && <span className="sr-only">(differs)</span>}
                    </span>
                  </th>
                  {cell(a.config[g], 'a')}
                  {cell(b.config[g], 'b')}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-[12px] leading-relaxed text-mute">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-bronze align-middle" aria-hidden="true" /> marks what changes between
          the two. Switching sides updates the room; both saved designs stay exactly as they are.
        </p>
      </div>
      <footer className="grid grid-cols-2 gap-2 border-t border-line/80 px-5 py-4 lg:px-6">
        <button type="button" className="btn-secondary" onClick={() => endCompare(false)}>
          Back to my design
        </button>
        <button type="button" className="btn-primary" onClick={() => endCompare(true)}>
          Continue with {compare.showing.toUpperCase()}
        </button>
      </footer>
    </section>
  )
}
