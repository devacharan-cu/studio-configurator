import { lazy, Suspense } from 'react'

// Two apps share one entry: the building editor, and the Phase 1 Garden Room configurator
// (kept at /garden-room as a working product demo and regression baseline).
const GardenRoom = lazy(() => import('./garden-room/App'))
const Editor = lazy(() => import('./editor/EditorApp'))
// Thumbnail studio for scripts/capture-thumbnails.mjs: development server only, stripped from builds.
const Studio = import.meta.env.DEV ? lazy(() => import('./editor/dev/ThumbStudio')) : null

export default function Root() {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (Studio && path === '/__studio')
    return (
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    )
  return <Suspense fallback={null}>{path === '/garden-room' ? <GardenRoom /> : <Editor />}</Suspense>
}
