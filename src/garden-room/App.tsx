import { lazy, Suspense, useEffect, useState } from 'react'
import { GROUPS } from './domain/catalog'
import { GROUP_IDS } from './domain/types'
import { parseShareParams } from './domain/configuration'
import { loadWorkingDesign, storeWorkingDesign } from './lib/storage'
import { useStore } from './state/store'
import { AboutDialog } from './ui/AboutDialog'
import { BriefDialog } from './ui/BriefDialog'
import { ComparePanel } from './ui/ComparePanel'
import { ConfiguratorPanel } from './ui/ConfiguratorPanel'
import { DesignsDialog } from './ui/DesignsDialog'
import { ShareDialog } from './ui/ShareDialog'
import { Loader, MobileTitle, StatusChip, Toasts, UnsupportedNotice, ViewControls } from './ui/Viewport'

// The 3D bundle (three.js + R3F) loads in parallel with the UI shell.
const Experience = lazy(() => import('./scene/Experience').then((m) => ({ default: m.Experience })))

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * On load: a shared link wins (applied once, announced, then removed from the address bar so a
 * reload doesn't re-announce it); otherwise resume the design left in the room last time.
 */
let initialised = false
function initialiseDesign() {
  if (initialised) return
  initialised = true
  const { applyConfig } = useStore.getState()
  // Notices about the link are held until the room is on screen, so they aren't lost behind the loader.
  const toast: ReturnType<typeof useStore.getState>['toast'] = (...args) => {
    const show = () => useStore.getState().toast(...args)
    if (useStore.getState().scene.status !== 'loading') return show()
    const unsub = useStore.subscribe((s) => {
      if (s.scene.status !== 'loading') {
        unsub()
        setTimeout(show, 400)
      }
    })
  }
  const result = parseShareParams(window.location.search)
  if (result.status === 'none') {
    const working = loadWorkingDesign()
    if (working) applyConfig(working)
    return
  }
  if (result.status === 'ok') {
    applyConfig(result.config)
    toast('info', 'Opened a shared design', 'You’re seeing the exact selections from the link.')
  } else if (result.status === 'partial') {
    applyConfig(result.config)
    const labels = result.issues.filter((i) => i.group !== 'templateId').map((i) => GROUPS[i.group as keyof typeof GROUPS].label)
    toast('info', 'Part of this link wasn’t recognised', `We used the studio’s starting choice for: ${labels.join(', ')}.`)
  } else {
    toast('error', 'This link couldn’t be opened', 'It may be incomplete or out of date — showing the studio’s starting design instead.')
  }
  window.history.replaceState(null, '', window.location.pathname)
}

// Before the first render, so the scene loads the right design directly instead of the defaults first.
initialiseDesign()
useStore.subscribe((s, prev) => {
  if (s.config !== prev.config) storeWorkingDesign(s.config)
})

export default function App() {
  const [webgl] = useState(hasWebGL)
  const comparing = useStore((s) => s.compare !== null)
  const rendered = useStore((s) => s.rendered)
  const sceneStatus = useStore((s) => s.scene.status)
  const setSceneStatus = useStore((s) => s.setSceneStatus)
  useEffect(() => {
    if (!webgl) setSceneStatus('unsupported')
  }, [webgl, setSceneStatus])

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden lg:flex-row">
      <main className="relative h-[52dvh] min-h-[300px] shrink-0 overflow-hidden bg-linen sm:h-[64dvh] lg:h-full lg:min-w-0 lg:flex-1" aria-label="3D room"
        // What the 3D scene has actually committed — used by end-to-end tests to verify UI/scene sync.
        data-scene-status={sceneStatus}
        data-rendered={rendered ? GROUP_IDS.map((g) => `${g}:${rendered[g]}`).join(' ') : undefined}
      >
        {webgl ? (
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        ) : (
          <UnsupportedNotice />
        )}
        <Loader />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 lg:p-5">
          <MobileTitle />
        </div>
        {webgl && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 lg:flex-row lg:items-end lg:justify-between lg:p-5">
            <StatusChip />
            <ViewControls />
          </div>
        )}
      </main>
      <aside
        className="relative z-[1] flex min-h-0 flex-1 flex-col bg-paper shadow-[0_-12px_30px_-20px_rgba(35,32,28,0.4)] lg:w-[400px] lg:flex-none lg:shadow-[-12px_0_30px_-24px_rgba(35,32,28,0.4)] xl:w-[440px]"
        aria-label={comparing ? 'Compare designs' : 'Customise the room'}
      >
        {comparing ? <ComparePanel /> : <ConfiguratorPanel />}
      </aside>
      <ShareDialog />
      <DesignsDialog />
      <BriefDialog />
      <AboutDialog />
      <Toasts />
    </div>
  )
}
