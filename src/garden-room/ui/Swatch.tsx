import { useState } from 'react'
import type { AnyOption, GroupId } from '../domain/types'

/** Groups whose options are objects (shown with a rendered thumbnail) rather than materials. */
const OBJECT_GROUPS: GroupId[] = ['sofa', 'coffeeTable']

function thumbnailFor(group: GroupId, option: AnyOption): string | null {
  return OBJECT_GROUPS.includes(group) ? `/assets/thumbs/${option.id}.webp` : null
}

/** Material swatch: flat colour, or the real texture multiplied by the option's tint. */
export function MaterialSwatch({ option, className = '' }: { option: AnyOption; className?: string }) {
  const s = option.swatch
  if (s.kind === 'none') {
    return (
      <span className={`relative block overflow-hidden bg-linen ${className}`} aria-hidden="true">
        <span className="absolute top-1/2 left-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-mute/50" />
      </span>
    )
  }
  if (s.kind === 'color') return <span className={`block ${className}`} style={{ backgroundColor: s.value }} aria-hidden="true" />
  return (
    <span
      className={`block bg-cover bg-center ${className}`}
      style={{
        backgroundColor: s.tint,
        backgroundImage: `url(/assets/textures/${s.texture}/color.webp)`,
        backgroundBlendMode: 'multiply',
        backgroundSize: '220%',
      }}
      aria-hidden="true"
    />
  )
}

/** Rendered product thumbnail with graceful fallback to the material swatch if the image is missing. */
export function OptionVisual({ group, option, className = '' }: { group: GroupId; option: AnyOption; className?: string }) {
  const src = thumbnailFor(group, option)
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <MaterialSwatch option={option} className={className} />
  return (
    <img
      src={src}
      alt=""
      className={`block object-cover ${className}`}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
