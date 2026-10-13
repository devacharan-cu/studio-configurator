import { useId, useMemo, useState, type ReactNode } from 'react'
import { LIMITS, makeReference, validateBrief, type Brief, type BriefErrors, type BriefInput } from '../domain/brief'
import { STUDIO, TEMPLATE } from '../domain/catalog'
import { describeConfiguration, isSameConfiguration, toShareUrl } from '../domain/configuration'
import { copyText } from '../lib/clipboard'
import { storeBrief } from '../lib/storage'
import { useStore } from '../state/store'
import { Dialog } from './Dialog'
import { Icon } from './Icon'

const EMPTY: BriefInput = { name: '', email: '', phone: '', preferredContact: 'email', notes: '' }

function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  id: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-ink">
        {label}
        {hint && <span className="font-normal text-mute">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-danger" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      )}
    </div>
  )
}

function briefAsText(brief: Brief): string {
  const lines = [
    `Design brief ${brief.reference} — ${TEMPLATE.name}`,
    `Submitted: ${new Date(brief.submittedAt).toLocaleString()}`,
    '',
    `Client: ${brief.client.name}`,
    `Email: ${brief.client.email}`,
    brief.client.phone ? `Phone: ${brief.client.phone}` : '',
    `Preferred contact: ${brief.client.preferredContact}`,
    '',
    `Design: ${brief.designName}`,
    ...describeConfiguration(brief.config).map((r) => `  ${r.label}: ${r.option}`),
    '',
    brief.notes ? `Notes:\n${brief.notes}` : 'Notes: —',
    '',
    `Open this design: ${brief.shareUrl}`,
  ]
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')
}

function Confirmation({ brief, onDone }: { brief: Brief; onDone: () => void }) {
  const toast = useStore((s) => s.toast)
  return (
    <div data-testid="brief-confirmation">
      <div className="flex items-start gap-3 rounded-2xl bg-sage/12 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-paper">
          <Icon name="check" size={16} />
        </span>
        <div>
          <p className="font-medium">Brief saved on this device</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
            Reference <span className="font-mono font-medium text-ink">{brief.reference}</span>. This is a demo: nothing has been sent to{' '}
            {STUDIO.name} or any server. In the full product, this brief would go straight to your designer.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section>
          <h3 className="eyebrow mb-2">Contact</h3>
          <dl className="space-y-1 text-[13.5px]">
            <div>
              <dt className="sr-only">Name</dt>
              <dd className="font-medium">{brief.client.name}</dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd>{brief.client.email}</dd>
            </div>
            {brief.client.phone && (
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>{brief.client.phone}</dd>
              </div>
            )}
            <div className="text-mute">
              <dt className="inline">Prefers: </dt>
              <dd className="inline">{brief.client.preferredContact}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3 className="eyebrow mb-2">{brief.designName}</h3>
          <dl className="space-y-1 text-[13px]">
            {describeConfiguration(brief.config).map((r) => (
              <div key={r.group} className="flex justify-between gap-3">
                <dt className="text-mute">{r.label}</dt>
                <dd className="text-right font-medium">{r.option}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      {brief.notes && (
        <section className="mt-5">
          <h3 className="eyebrow mb-2">Notes for your designer</h3>
          <p className="rounded-xl bg-white/70 p-3 text-[13px] leading-relaxed whitespace-pre-wrap">{brief.notes}</p>
        </section>
      )}
      <div className="no-print mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            const ok = await copyText(briefAsText(brief))
            toast(ok ? 'success' : 'error', ok ? 'Brief copied as text' : 'Couldn’t access the clipboard')
          }}
        >
          <Icon name="copy" size={16} /> Copy as text
        </button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Icon name="print" size={16} /> Print / PDF
        </button>
        <button type="button" className="btn-primary ml-auto" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}

export function BriefDialog() {
  const open = useStore((s) => s.dialog === 'brief')
  const closeDialog = useStore((s) => s.closeDialog)
  const config = useStore((s) => s.config)
  const saved = useStore((s) => s.saved)
  const toast = useStore((s) => s.toast)
  const [input, setInput] = useState<BriefInput>(EMPTY)
  const [errors, setErrors] = useState<BriefErrors>({})
  const [submitted, setSubmitted] = useState<Brief | null>(null)
  const uid = useId()
  const id = (f: string) => `${uid}-${f}`

  const designName = useMemo(() => saved.find((d) => isSameConfiguration(d.config, config))?.name ?? 'Current design', [saved, config])

  const close = () => {
    closeDialog()
    if (submitted) {
      setSubmitted(null)
      setInput(EMPTY)
    }
  }

  const set = <K extends keyof BriefInput>(key: K, value: BriefInput[K]) => {
    setInput((s) => ({ ...s, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = validateBrief(input)
    if (!result.ok) {
      setErrors(result.errors)
      const first = Object.keys(result.errors)[0]
      document.getElementById(id(first))?.focus()
      return
    }
    const v = result.value
    const brief: Brief = {
      reference: makeReference(),
      submittedAt: new Date().toISOString(),
      designName,
      client: { name: v.name, email: v.email, phone: v.phone, preferredContact: v.preferredContact },
      notes: v.notes,
      config: { ...config },
      shareUrl: toShareUrl(config, window.location.href),
    }
    if (!storeBrief(brief)) toast('error', 'Couldn’t store the brief', 'This browser blocked local storage. Use “Copy as text” to keep a copy.')
    setSubmitted(brief)
  }

  const err = (f: keyof BriefInput) => ({
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${id(f)}-error` : undefined,
  })

  return (
    <Dialog open={open} onClose={close} title={submitted ? 'Thank you' : 'Send your brief'} eyebrow={`To ${STUDIO.name}`} width="max-w-2xl">
      {submitted ? (
        <Confirmation brief={submitted} onDone={close} />
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl bg-linen/70 p-4">
            <p className="eyebrow mb-2">Your selections · {designName}</p>
            <ul className="grid grid-cols-1 gap-x-5 gap-y-1 text-[13px] sm:grid-cols-2">
              {describeConfiguration(config).map((r) => (
                <li key={r.group} className="flex justify-between gap-3">
                  <span className="text-mute">{r.label}</span>
                  <span className="text-right font-medium">{r.option}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id('name')} label="Your name" error={errors.name}>
              <input id={id('name')} className="field" autoComplete="name" maxLength={LIMITS.name} value={input.name} onChange={(e) => set('name', e.target.value)} {...err('name')} />
            </Field>
            <Field id={id('email')} label="Email" error={errors.email}>
              <input
                id={id('email')}
                className="field"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={LIMITS.email}
                value={input.email}
                onChange={(e) => set('email', e.target.value)}
                {...err('email')}
              />
            </Field>
            <Field id={id('phone')} label="Phone" hint="Optional" error={errors.phone}>
              <input
                id={id('phone')}
                className="field"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={LIMITS.phone}
                value={input.phone}
                onChange={(e) => set('phone', e.target.value)}
                {...err('phone')}
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[12.5px] font-medium">Preferred contact</legend>
              <div className="flex rounded-xl border border-line bg-white/70 p-1">
                {(['email', 'phone'] as const).map((p) => (
                  <label
                    key={p}
                    className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-[13px] capitalize transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bronze ${
                      input.preferredContact === p ? 'bg-ink text-paper' : 'text-ink-soft'
                    }`}
                  >
                    <input type="radio" name={id('pref')} value={p} checked={input.preferredContact === p} onChange={() => set('preferredContact', p)} className="sr-only" />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <Field id={id('notes')} label="Notes for your designer" hint={`${input.notes.length}/${LIMITS.notes}`} error={errors.notes}>
            <textarea
              id={id('notes')}
              className="field min-h-24 resize-y"
              rows={4}
              maxLength={LIMITS.notes + 50}
              placeholder="e.g. We love the corner sofa but worry the bouclé won’t survive the dog. Could we see it in a darker fabric?"
              value={input.notes}
              onChange={(e) => set('notes', e.target.value)}
              {...err('notes')}
            />
          </Field>
          <div className="flex flex-col-reverse items-stretch gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11.5px] leading-relaxed text-mute sm:max-w-[34ch]">
              Demo: your brief is stored only in this browser. Nothing is emailed or uploaded.
            </p>
            <button type="submit" className="btn-primary h-11 px-6">
              <Icon name="send" size={16} /> Submit brief
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
