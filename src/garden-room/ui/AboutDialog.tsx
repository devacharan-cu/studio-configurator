import { useState } from 'react'
import { STUDIO } from '../domain/catalog'
import { clearAllData } from '../lib/storage'
import { useStore } from '../state/store'
import { Dialog } from './Dialog'

const CREDITS: { what: string; author: string; licence: string; href: string }[] = [
  {
    what: 'Curve velvet sofa (both colourways)',
    author: '“Glam Velvet Sofa” © 2021 Wayfair LLC, model by Eric Chadwick, from the Khronos glTF Sample Assets',
    licence: 'CC BY 4.0',
    href: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa',
  },
  {
    what: 'Coffee tables, lounge chair, side table, console, vases, plant',
    author: 'Poly Haven — Amin, Ulan Cabanilla, Kuutti Siitonen, James Ray Cock, Patrik Pangerl, Rico Cilliers',
    licence: 'CC0',
    href: 'https://polyhaven.com/models',
  },
  {
    what: 'Floor, wall, stone and fabric textures; lighting environment',
    author: 'Poly Haven — Rob Tuytel, Dimitrios Savva, Jenelle van Heerden, Sergej Majboroda, Rico Cilliers, colormass and others',
    licence: 'CC0',
    href: 'https://polyhaven.com/textures',
  },
  {
    what: 'Typefaces: Instrument Serif, Inter',
    author: 'The Instrument Serif Project Authors; Rasmus Andersson',
    licence: 'SIL OFL 1.1',
    href: 'https://fonts.google.com/specimen/Instrument+Serif',
  },
]

export function AboutDialog() {
  const open = useStore((s) => s.dialog === 'about')
  const closeDialog = useStore((s) => s.closeDialog)
  const toast = useStore((s) => s.toast)
  const [confirming, setConfirming] = useState(false)
  const clear = () => {
    const ok = clearAllData()
    useStore.setState({ saved: [], compare: null })
    setConfirming(false)
    toast(ok ? 'success' : 'error', ok ? 'All data cleared from this browser' : 'Couldn’t access this browser’s storage')
  }
  return (
    <Dialog open={open} onClose={closeDialog} title="About this demo" eyebrow="Prototype · Phase 1" width="max-w-xl">
      <div className="space-y-4 text-[13.5px] leading-relaxed text-ink-soft">
        <p>
          <strong className="font-medium text-ink">{STUDIO.name}</strong> is a fictional studio created to demonstrate a client-facing room
          configurator. The products are illustrative: they are not live listings, and no prices, stock or supplier relationships are
          implied.
        </p>
        <p>
          Pieces marked <em>studio-modelled</em> were built parametrically for this prototype (so they can be reconfigured and re-covered).
          Everything else is a third-party 3D model, credited below.
        </p>
        <p>Saved designs and briefs (including the contact details you enter) stay in this browser’s local storage. Nothing is sent to a server.</p>
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/60 p-3">
          {confirming ? (
            <>
              <span className="text-[12.5px] text-danger">Delete saved designs, briefs and the remembered room?</span>
              <button type="button" className="btn h-8 bg-danger px-3 text-paper hover:bg-danger/90" onClick={clear}>
                Delete all
              </button>
              <button type="button" className="btn-ghost h-8 px-3" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn-secondary h-8 px-3" onClick={() => setConfirming(true)}>
              Clear my data from this browser
            </button>
          )}
        </div>
      </div>
      <h3 className="eyebrow mt-6 mb-2">Credits &amp; licences</h3>
      <ul className="space-y-3">
        {CREDITS.map((c) => (
          <li key={c.what} className="rounded-xl bg-white/60 p-3 text-[12.5px] leading-relaxed">
            <p className="font-medium text-ink">{c.what}</p>
            <p className="text-ink-soft">
              {c.author}.{' '}
              <a href={c.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                {c.licence}
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11.5px] text-mute">Modifications: models were compressed and textures resized/recoloured for the web.</p>
    </Dialog>
  )
}
