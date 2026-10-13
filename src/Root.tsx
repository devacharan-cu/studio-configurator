import { lazy, Suspense } from 'react'

// Two apps share one entry: the building editor, and the Phase 1 Garden Room configurator
// (kept at /garden-room as a working product demo and regression baseline).
const GardenRoom = lazy(() => import('./garden-room/App'))
const Editor = lazy(() => import('./editor/EditorApp'))

export default function Root() {
  const isGardenRoom = window.location.pathname.replace(/\/+$/, '') === '/garden-room'
  return <Suspense fallback={null}>{isGardenRoom ? <GardenRoom /> : <Editor />}</Suspense>
}
