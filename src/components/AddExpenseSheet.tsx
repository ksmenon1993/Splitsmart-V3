import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Member, NewExpense } from '../lib/groups'
import { formatMoney, parseAmount } from '../lib/money'
import { equalSplit } from '../lib/split'
import { Avatar } from './Avatar'

type Props = {
  members: Member[]
  meId: string | null
  onSetMe: (memberId: string) => void
  onSubmit: (expense: NewExpense) => Promise<void>
  onClose: () => void
}

const chip = (selected: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full py-1 pr-3.5 pl-1 text-sm font-medium transition active:scale-95 ${
    selected
      ? 'bg-brand-600 text-white shadow-sm'
      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
  }`

/**
 * Bottom sheet for logging an expense. The fast path is: type an amount, press Enter.
 * Defaults: paid by me, split equally between everyone, no description.
 */
export default function AddExpenseSheet({ members, meId, onSetMe, onSubmit, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [payerChoice, setPayerChoice] = useState<string | null>(null)
  const [splitIds, setSplitIds] = useState<Set<string>>(() => new Set(members.map((m) => m.id)))
  const [showOptions, setShowOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // On open: cursor in the amount, Escape closes, page behind doesn't scroll.
  useEffect(() => {
    amountRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Someone'
  const payer = payerChoice ?? meId
  const amountCents = parseAmount(amount)
  const amountInvalid = amount.trim() !== '' && amountCents === null
  const everyone = splitIds.size === members.length
  const splitList = members.filter((m) => splitIds.has(m.id)).map((m) => m.id)
  const canSubmit = amountCents !== null && payer !== null && splitList.length > 0 && !saving

  // Exact shares for the preview, using the same rule as the database.
  const shares = amountCents !== null && payer && splitList.length ? equalSplit(amountCents, splitList, payer) : null
  const eachLabel = shares ? formatMoney(Math.min(...shares.values())) : null

  function pickMe(id: string) {
    onSetMe(id)
    setPayerChoice(null)
    amountRef.current?.focus()
  }

  function toggleSplit(id: string) {
    setSplitIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || amountCents === null || !payer) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        paidBy: payer,
        amountCents,
        description: description.trim(),
        splitMemberIds: everyone ? null : splitList,
      })
    } catch {
      setError("Couldn't save. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-slate-900/40"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        onSubmit={handleSubmit}
        className="relative max-h-[92dvh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 id="add-expense-title" className="text-lg font-semibold">
            Add an expense
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>

        {/* The one field that matters */}
        <label htmlFor="expense-amount" className="sr-only">
          Amount in rupees
        </label>
        <div
          className={`mt-4 flex items-baseline gap-1 border-b-2 pb-2 transition ${
            amountInvalid ? 'border-red-400' : 'border-brand-500'
          }`}
        >
          <span className="text-4xl font-semibold text-slate-400">₹</span>
          <input
            ref={amountRef}
            id="expense-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            aria-invalid={amountInvalid}
            className="w-full min-w-0 bg-transparent text-5xl font-bold tracking-tight tabular-nums outline-none placeholder:text-slate-300"
          />
        </div>
        {amountInvalid && <p className="mt-1.5 text-sm text-red-600">Enter an amount like 450 or 99.50.</p>}

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What for? (optional)"
          aria-label="Description (optional)"
          maxLength={200}
          enterKeyHint="done"
          className="mt-4 w-full rounded-xl bg-slate-50 px-4 py-3 text-base outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-brand-500"
        />

        {/* First time in this group: one tap to say who "I" am, which also sets the payer. */}
        {!meId && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="text-sm font-semibold text-amber-900">Which one is you?</p>
            <p className="text-xs text-amber-800">We'll remember it on this device.</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {members.map((m) => (
                <button key={m.id} type="button" onClick={() => pickMe(m.id)} className={chip(false)}>
                  <Avatar memberId={m.id} size="sm" />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary of the defaults, with the options tucked behind it */}
        {payer && (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <Avatar memberId={payer} size="sm" />
              <p className="min-w-0 flex-1 text-sm text-slate-600">
                Paid by <strong className="text-slate-900">{payer === meId ? 'you' : nameOf(payer)}</strong>
                {' · '}split equally between{' '}
                <strong className="text-slate-900">
                  {everyone ? `everyone (${members.length})` : `${splitList.length} of ${members.length}`}
                </strong>
                {eachLabel && (
                  <>
                    {' · '}
                    <span className="whitespace-nowrap">{eachLabel} each</span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowOptions((v) => !v)}
                aria-expanded={showOptions}
                className="shrink-0 text-sm font-semibold text-brand-700 hover:underline"
              >
                {showOptions ? 'Done' : 'Change'}
              </button>
            </div>

            {showOptions && (
              <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                <fieldset>
                  <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Paid by</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={payer === m.id}
                        onClick={() => setPayerChoice(m.id)}
                        className={chip(payer === m.id)}
                      >
                        <Avatar memberId={m.id} size="sm" />
                        {m.id === meId ? `${m.name} (you)` : m.name}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <div className="flex items-baseline justify-between">
                    <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Split between
                    </legend>
                    {!everyone && (
                      <button
                        type="button"
                        onClick={() => setSplitIds(new Set(members.map((m) => m.id)))}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Everyone
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={splitIds.has(m.id)}
                        onClick={() => toggleSplit(m.id)}
                        className={chip(splitIds.has(m.id))}
                      >
                        <Avatar
                          memberId={m.id}
                          size="sm"
                          className={splitIds.has(m.id) ? '' : 'opacity-40 grayscale'}
                        />
                        {m.id === meId ? `${m.name} (you)` : m.name}
                      </button>
                    ))}
                  </div>
                  {splitList.length === 0 && (
                    <p className="mt-2 text-sm text-red-600">Pick at least one person.</p>
                  )}
                </fieldset>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 w-full rounded-2xl bg-brand-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? 'Saving…'
            : !payer
              ? 'Tap your name above'
              : amountCents !== null
                ? `Add ${formatMoney(amountCents)}`
                : 'Add expense'}
        </button>
      </form>
    </div>
  )
}
