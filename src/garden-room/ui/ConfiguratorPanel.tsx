import { useEffect, useRef } from 'react'
import { GROUPS, STUDIO, TEMPLATE, getOption } from '../domain/catalog'
import { GROUP_IDS, type AnyOption, type GroupId } from '../domain/types'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { OptionGrid } from './OptionGrid'
import { MaterialSwatch } from './Swatch'

function useSelected(group: GroupId) {
  const id = useStore((s) => s.config[group])
  return getOption(group, id) as AnyOption | undefined
}

function GroupRow({ group }: { group: GroupId }) {
  const active = useStore((s) => s.activeGroup === group)
  const hovered = useStore((s) => s.hoveredGroup === group)
  const setActiveGroup = useStore((s) => s.setActiveGroup)
  const selected = useSelected(group)
  const ref = useRef<HTMLElement>(null)

  // When the client clicks an object in the room, bring its section into view.
  useEffect(() => {
    if (!active) return
    const id = requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
    return () => cancelAnimationFrame(id)
  }, [active])

  return (
    <section ref={ref} className={`border-b border-line/80 transition-colors ${hovered && !active ? 'bg-linen/60' : ''}`} data-group={group}>
      <h3>
        <button
          type="button"
          aria-expanded={active}
          aria-controls={`panel-${group}`}
          onClick={() => setActiveGroup(group, { focus: true })}
          className="flex w-full items-center gap-3.5 px-6 py-3.5 text-left"
        >
          {selected && <MaterialSwatch option={selected} className="h-9 w-9 shrink-0 rounded-full ring-1 ring-ink/10" />}
          <span className="min-w-0 flex-1">
            <span className="eyebrow block">{GROUPS[group].label}</span>
            <span className="block truncate font-display text-[19px] leading-tight" data-testid={`current-${group}`}>
              {selected?.name}
            </span>
          </span>
          <Icon name="chevron" className={`shrink-0 text-mute transition-transform duration-300 ${active ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={`panel-${group}`} hidden={!active} className="px-6 pb-5">
        <p className="mb-3.5 text-[13px] leading-relaxed text-ink-soft">{selected?.description}</p>
        <OptionGrid group={group} />
      </div>
    </section>
  )
}

/** Phone / small tablet: one group at a time, chosen from a scrolling tab row; options in a swipeable strip. */
function MobileGroups() {
  const activeGroup = useStore((s) => s.activeGroup)
  const setActiveGroup = useStore((s) => s.setActiveGroup)
  const config = useStore((s) => s.config)
  const selected = useSelected(activeGroup)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="Customise" className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-2 [scrollbar-width:none]">
        {GROUP_IDS.map((g) => {
          const opt = getOption(g, config[g]) as AnyOption | undefined
          const active = g === activeGroup
          return (
            <button
              key={g}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls="mobile-options"
              onClick={() => setActiveGroup(g, { focus: true })}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-[12.5px] transition-colors ${
                active ? 'border-ink bg-ink text-paper' : 'border-line bg-white/60 text-ink'
              }`}
            >
              {opt && <MaterialSwatch option={opt} className="h-6 w-6 rounded-full ring-1 ring-white/30" />}
              {GROUPS[g].label}
            </button>
          )
        })}
      </div>
      <div id="mobile-options" role="tabpanel" className="px-4 pb-3">
        <p className="mb-2.5 text-[12.5px] leading-snug text-ink-soft">
          <span className="font-medium text-ink" data-testid={`current-${activeGroup}`}>
            {selected?.name}
          </span>{' '}
          — {selected?.description}
        </p>
        <OptionGrid group={activeGroup} layout="strip" />
      </div>
    </div>
  )
}

export function PanelActions({ compact = false }: { compact?: boolean }) {
  const saveCurrent = useStore((s) => s.saveCurrent)
  const openDialog = useStore((s) => s.openDialog)
  const savedCount = useStore((s) => s.saved.length)
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2'}`}>
      {compact ? (
        <>
          <ActionTile icon="save" label="Save" onClick={() => saveCurrent()} />
          <ActionTile icon="layers" label={`Designs${savedCount ? ` (${savedCount})` : ''}`} onClick={() => openDialog('designs')} />
          <ActionTile icon="share" label="Share" onClick={() => openDialog('share')} />
          <ActionTile icon="send" label="Brief" onClick={() => openDialog('brief')} primary />
        </>
      ) : (
        <>
          <button type="button" className="btn-secondary" onClick={() => saveCurrent()}>
            <Icon name="save" size={16} /> Save design
          </button>
          <button type="button" className="btn-secondary" onClick={() => openDialog('designs')}>
            <Icon name="layers" size={16} /> My designs
            {savedCount > 0 && <span className="rounded-full bg-ink px-1.5 text-[10.5px] leading-[18px] text-paper">{savedCount}</span>}
          </button>
          <button type="button" className="btn-secondary" onClick={() => openDialog('share')}>
            <Icon name="link" size={16} /> Share link
          </button>
          <button type="button" className="btn-primary" onClick={() => openDialog('brief')}>
            <Icon name="send" size={16} /> Send brief
          </button>
        </>
      )}
    </div>
  )
}

function ActionTile({ icon, label, onClick, primary }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors ${
        primary ? 'bg-ink text-paper' : 'border border-line bg-white/60 text-ink'
      }`}
    >
      <Icon name={icon} size={17} />
      {label}
    </button>
  )
}

export function ConfiguratorPanel() {
  const openDialog = useStore((s) => s.openDialog)
  const wide = useMediaQuery('(min-width: 1024px)')
  if (!wide) {
    // Phone / small tablet
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobileGroups />
        <div className="mt-auto border-t border-line/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <PanelActions compact />
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-6 pt-6 pb-4">
        <p className="eyebrow">{STUDIO.name} · Living room proposal</p>
        <h1 className="mt-1.5 font-display text-[38px] leading-[1.02]">
          {TEMPLATE.name.replace('Room', '')}
          <em className="text-bronze">Room</em>
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Explore the pieces and finishes your designer has approved. Every choice updates the room — click anything in it to
          change it.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line/80">
        {GROUP_IDS.map((g) => (
          <GroupRow key={g} group={g} />
        ))}
        <p className="px-6 py-4 text-[11.5px] leading-relaxed text-mute">
          Products shown are illustrative, not live listings — no prices or stock are implied.{' '}
          <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => openDialog('about')}>
            About this demo &amp; credits
          </button>
        </p>
      </div>
      <footer className="border-t border-line/80 bg-paper px-6 py-4">
        <PanelActions />
      </footer>
    </div>
  )
}
