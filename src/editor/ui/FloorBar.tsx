import { useState } from 'react'
import { addStairAnywhere, deleteLevel } from '../../engine/commands/stairs'
import { addLevel } from '../../engine/commands/structure'
import { sortedLevels } from '../../engine/model/query'
import { levelAbove } from '../../engine/model/stairs'
import { currentProject, useEditor, useProject } from '../store'
import { Icon } from './icons'

const short = (name: string) => name.replace(/ floor$/i, '')

/**
 * Floors: switch the floor being edited (the 3D view lifts off the floors above it), add a floor on top,
 * put a flight of stairs where it fits, or remove the top floor. Every action is one undoable command.
 */
export function FloorBar() {
  const p = useProject()
  const level = useEditor((s) => s.level)
  const { setLevel, run, notify, select } = useEditor.getState()
  const [menu, setMenu] = useState(false)
  const levels = sortedLevels(p)
  const top = levels[levels.length - 1]
  // stairs go up from this floor, or (on the top floor) up to it from the floor below
  const from = levelAbove(p, level) ? level : levels[levels.length - 2]?.id

  const addFloor = () => {
    const before = currentProject()
    if (!run(addLevel(before, {}))) return
    const created = sortedLevels(currentProject()).find((l) => !before.levels[l.id])
    if (created) {
      setLevel(created.id)
      notify('info', `Added the ${created.name.toLowerCase()} — draw its rooms over the dashed outline of the floor below, then add stairs.`)
    }
  }
  const addStairs = () => {
    if (!from) return
    const before = currentProject()
    if (!run(addStairAnywhere(before, { level: from }))) return
    const created = Object.keys(currentProject().stairs ?? {}).find((id) => !before.stairs?.[id])
    if (created) select({ kind: 'stair', id: created })
  }
  const removeTop = () => {
    setMenu(false)
    if (run(deleteLevel(currentProject(), { level: top.id }))) notify('info', `Removed the ${top.name.toLowerCase()} — undo to bring it back.`)
  }

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full bg-paper/95 p-1 shadow-md backdrop-blur-sm" data-testid="floor-bar">
      <div className="flex" role="radiogroup" aria-label="Floor">
        {[...levels].reverse().map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={l.id === level}
            title={`Edit the ${l.name.toLowerCase()}`}
            onClick={() => setLevel(l.id)}
            className={`h-7 rounded-full px-2.5 text-[12px] font-medium ${l.id === level ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
          >
            {short(l.name)}
          </button>
        ))}
      </div>
      <button type="button" className="btn-ghost h-7 px-2 text-[12px]" onClick={addFloor} title="Add a floor on top of the building">
        <Icon name="plus" size={14} /> Floor
      </button>
      {levels.length > 1 && (
        <button type="button" className="btn-ghost h-7 px-2 text-[12px]" onClick={addStairs} title="Add a flight of stairs between this floor and the next">
          <Icon name="stairs" size={14} /> Stairs
        </button>
      )}
      {levels.length > 1 && (
        <div className="relative">
          <button type="button" className="btn-ghost h-7 w-7 px-0" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label="More floor actions">
            <Icon name="more" size={15} />
          </button>
          {menu && (
            <div role="menu" className="absolute top-9 left-0 w-56 rounded-xl border border-line bg-paper p-1 shadow-xl">
              <button type="button" role="menuitem" className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-danger hover:bg-danger/10" onClick={removeTop}>
                Remove the {top.name.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
