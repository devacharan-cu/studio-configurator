import { useMemo, useRef, useState } from 'react'
import { describeConfiguration, toShareUrl } from '../domain/configuration'
import { useStore } from '../state/store'
import { Dialog } from './Dialog'
import { copyText } from '../lib/clipboard'
import { Icon } from './Icon'

export function ShareDialog() {
  const open = useStore((s) => s.dialog === 'share')
  const closeDialog = useStore((s) => s.closeDialog)
  const config = useStore((s) => s.config)
  const toast = useStore((s) => s.toast)
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const url = useMemo(() => toShareUrl(config, window.location.href), [config])

  return (
    <Dialog
      open={open}
      onClose={() => {
        setCopied(false)
        closeDialog()
      }}
      title="Share this design"
      eyebrow="Link"
    >
      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        Anyone with this link sees the room exactly as it is now — no account needed. The link only contains your option choices, never
        personal details.
      </p>
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="share-url">
          Shareable link
        </label>
        <input id="share-url" ref={inputRef} readOnly value={url} className="field font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={async () => {
            const ok = await copyText(url, inputRef.current)
            setCopied(ok)
            if (ok) toast('success', 'Link copied')
            else toast('info', 'Press Ctrl+C / ⌘C to copy', 'Your browser blocked automatic copying, so the link is selected.')
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="mt-5 rounded-2xl bg-linen/70 p-4">
        <p className="eyebrow mb-2">This link opens</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {describeConfiguration(config).map((row) => (
            <div key={row.group} className="contents">
              <dt className="text-mute">{row.label}</dt>
              <dd className="font-medium">{row.option}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Dialog>
  )
}
