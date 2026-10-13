const PATHS = {
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  close: 'M5 5l10 10M15 5L5 15',
  chevron: 'M7 8l3 3 3-3',
  save: 'M5 3.5h8l2.5 2.5v10.5h-11zM7 3.5v4h5v-4M7 16.5v-5h6v5',
  share: 'M8 11.5l4-2.5M8 8.5l4 2.5M6 12a2 2 0 100-4 2 2 0 000 4zM14 7a2 2 0 100-4 2 2 0 000 4zM14 17a2 2 0 100-4 2 2 0 000 4z',
  compare: 'M7 4v12M13 4v12M3.5 7.5L7 4l3.5 3.5M9.5 12.5L13 16l3.5-3.5',
  send: 'M3.5 10l13-6-4.5 13-2.5-5.5zM9.5 11.5l7-7.5',
  layers: 'M10 3.5l6.5 3.5-6.5 3.5L3.5 7zM3.5 10.5l6.5 3.5 6.5-3.5M3.5 13.5l6.5 3.5 6.5-3.5',
  eye: 'M2.5 10s3-5.5 7.5-5.5 7.5 5.5 7.5 5.5-3 5.5-7.5 5.5S2.5 10 2.5 10zM10 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z',
  home: 'M3.5 9l6.5-5.5L16.5 9v7.5h-4v-5h-5v5h-4z',
  plan: 'M3.5 3.5h13v13h-13zM3.5 9.5h6v7M9.5 3.5v3M12.5 9.5h4',
  window: 'M4 3.5h12v13H4zM10 3.5v13M4 10h12',
  info: 'M10 17a7 7 0 100-14 7 7 0 000 14zM10 9v4.5M10 6.5v.01',
  trash: 'M4.5 6h11M8 6V4h4v2M6 6l.8 10.5h6.4L14 6',
  pencil: 'M12.5 4.5l3 3L8 15H5v-3zM11 6l3 3',
  copy: 'M7 7h9v9H7zM4 13V4h9',
  print: 'M6 7V3.5h8V7M6 13H4V8h12v5h-2M6 11h8v5.5H6z',
  restore: 'M4 10a6 6 0 106-6 6 6 0 00-4.5 2M4 3.5V7h3.5',
  arrowLeft: 'M16 10H4M8.5 5.5L4 10l4.5 4.5',
  link: 'M8.5 11.5a3 3 0 004.2 0l2.6-2.6a3 3 0 00-4.2-4.2l-.9.9M11.5 8.5a3 3 0 00-4.2 0l-2.6 2.6a3 3 0 004.2 4.2l.9-.9',
  cursor: 'M5 3.5l10 5-4.5 1.5-1.5 4.5z',
  alert: 'M10 3.5l7 12.5H3zM10 8.5v3.5M10 14.2v.01',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Spinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M17.5 10A7.5 7.5 0 0010 2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
