import { GROUPS } from '../domain/catalog'
import type { AnyOption, GroupId } from '../domain/types'
import { useStore } from '../state/store'
import { Icon, Spinner } from './Icon'
import { OptionVisual } from './Swatch'

/**
 * The approved options for one group, as a native radio group: arrow keys move between options,
 * the selection is announced, and every choice immediately updates the room.
 */
export function OptionGrid({ group, layout = 'grid' }: { group: GroupId; layout?: 'grid' | 'strip' }) {
  const selected = useStore((s) => s.config[group])
  const selectOption = useStore((s) => s.selectOption)
  // The chosen option is still loading if the scene hasn't rendered it yet.
  const loading = useStore((s) => s.scene.status === 'ready' && s.rendered !== null && s.rendered[group] !== s.config[group])
  const failed = useStore((s) => s.scene.failed)
  const options = GROUPS[group].options as AnyOption[]

  return (
    <fieldset>
      <legend className="sr-only">{GROUPS[group].label} options</legend>
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-2 gap-2.5'
            : '-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]'
        }
      >
        {options.map((option) => {
          const isSelected = option.id === selected
          const isFailed = failed.includes(option.id)
          return (
            <label
              key={option.id}
              className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white/60 text-left transition-[border-color,box-shadow,background-color] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bronze ${
                layout === 'strip' ? 'w-[132px] shrink-0 snap-start' : ''
              } ${isSelected ? 'border-ink bg-white shadow-[0_6px_18px_-10px_rgba(35,32,28,0.5)]' : 'border-line hover:border-ink-soft/60'}`}
              data-option={option.id}
            >
              <input
                type="radio"
                name={`opt-${group}`}
                value={option.id}
                checked={isSelected}
                onChange={() => selectOption(group, option.id)}
                className="sr-only"
                aria-describedby={`desc-${option.id}`}
              />
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-linen">
                <OptionVisual group={group} option={option} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                {isSelected && (
                  <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-paper">
                    {loading ? <Spinner size={12} /> : <Icon name="check" size={13} />}
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col gap-0.5 px-3 pt-2 pb-2.5">
                <span className="text-[12.5px] leading-snug font-medium text-ink">{option.name}</span>
                {isFailed ? (
                  <span className="flex items-center gap-1 text-[11px] text-danger">
                    <Icon name="alert" size={12} /> Couldn’t load
                  </span>
                ) : (
                  option.provenance === 'studio-modelled' && <span className="text-[10.5px] text-mute">Studio-modelled</span>
                )}
              </span>
              <span id={`desc-${option.id}`} className="sr-only">
                {option.description}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
