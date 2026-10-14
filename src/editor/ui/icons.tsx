const P = {
  select: 'M5 3.5l10 5-4.5 1.5-1.5 4.5z',
  room: 'M3.5 4.5h13v11h-13zM3.5 4.5l2 2M16.5 4.5l-2 2M3.5 15.5l2-2M16.5 15.5l-2-2',
  door: 'M5 16.5V3.5h8v13M5 16.5h10M10.5 10.5v.01',
  window: 'M4 3.5h12v13H4zM10 3.5v13M4 10h12',
  passage: 'M3.5 16.5V5.5M16.5 16.5V5.5M3.5 5.5h4M12.5 5.5h4',
  sofa: 'M3.5 9.5v5h13v-5M5 9.5V7.5a1 1 0 011-1h8a1 1 0 011 1v2M3.5 14.5v1.5M16.5 14.5v1.5M6 11.5h8',
  undo: 'M7 7.5H4V4.5M4.3 7.3A6 6 0 1110 16',
  redo: 'M13 7.5h3V4.5M15.7 7.3A6 6 0 109.9 16',
  split: 'M3.5 4.5h13v11h-13zM10 4.5v11',
  plan: 'M3.5 3.5h13v13h-13zM3.5 9.5h6v7M9.5 3.5v3M12.5 9.5h4',
  cube: 'M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5zM10 10l6.5-3.75M10 10v7.5M10 10L3.5 6.25',
  walk: 'M10.5 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 18l2-6 2 2v4M7 9.5l2.5-3 3 2.5 2 .5M10 12L8.5 9',
  trash: 'M4.5 6h11M8 6V4h4v2M6 6l.8 10.5h6.4L14 6',
  close: 'M5 5l10 10M15 5L5 15',
  rotate: 'M4 10a6 6 0 106-6 6 6 0 00-4.5 2M4 3.5V7h3.5',
  menu: 'M3.5 6h13M3.5 10h13M3.5 14h13',
  download: 'M10 3.5v9M6.5 9l3.5 3.5L13.5 9M4 16.5h12',
  upload: 'M10 12.5v-9M6.5 7L10 3.5 13.5 7M4 16.5h12',
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  alert: 'M10 3.5l7 12.5H3zM10 8.5v3.5M10 14.2v.01',
  info: 'M10 17a7 7 0 100-14 7 7 0 000 14zM10 9v4.5M10 6.5v.01',
  layers: 'M10 3.5l6.5 3.5-6.5 3.5L3.5 7zM3.5 10.5l6.5 3.5 6.5-3.5',
  cut: 'M3.5 13.5h13M5 13.5V6.5h10v7M5 9.5h10',
  fly: 'M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4M10 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z',
  settings: 'M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
  expand: 'M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4',
  target: 'M10 16.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3',
  home: 'M3.5 9.5L10 4l6.5 5.5M5.5 8v8.5h9V8',
  keyboard: 'M2.5 5.5h15v9h-15zM5 8.5h.01M8 8.5h.01M11 8.5h.01M14 8.5h.01M6.5 11.5h7',
  copy: 'M7 7h9.5v9.5H7zM13 7V3.5H3.5V13H7',
  grid: 'M3.5 3.5h5.5v5.5H3.5zM11 3.5h5.5v5.5H11zM3.5 11h5.5v5.5H3.5zM11 11h5.5v5.5H11z',
  eye: 'M2.5 10s3-5.5 7.5-5.5 7.5 5.5 7.5 5.5-3 5.5-7.5 5.5S2.5 10 2.5 10zM10 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z',
} as const

export type IconName = keyof typeof P

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[name]} />
    </svg>
  )
}
