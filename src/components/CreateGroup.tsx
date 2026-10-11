import { useState, type FormEvent } from 'react'
import { createGroup, type Group } from '../lib/groups'

type Props = {
  onCreated: (group: Group) => void
  onOpenDemo: () => void
}

export default function CreateGroup({ onCreated, onOpenDemo }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      onCreated(await createGroup(trimmed))
    } catch {
      setError("Couldn't create the group. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 grid size-24 place-items-center rounded-full bg-brand-50 text-5xl">
        <span role="img" aria-label="Receipt">
          🧾
        </span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Start a group</h1>
      <p className="mt-2 max-w-xs text-slate-500">
        For your trip, flat or dinner crew. Log who paid for what, and SplitSmart works out
        who owes whom.
      </p>

      <button
        type="button"
        onClick={onOpenDemo}
        className="mt-6 w-full max-w-xs rounded-2xl bg-brand-600 px-5 py-4 text-lg font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98]"
      >
        <span aria-hidden="true">✨ </span>See how it works
      </button>
      <p className="mt-1.5 text-xs text-slate-400">Opens a sample trip. No setup needed.</p>

      <div className="mt-8 flex w-full max-w-xs items-center gap-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-200" />
        or start your own
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 w-full max-w-xs text-left">
        <label htmlFor="group-name" className="text-sm font-medium text-slate-700">
          Group name
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Goa Trip"
          maxLength={100}
          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="mt-4 w-full rounded-2xl border-2 border-brand-600 bg-white px-5 py-3 font-medium text-brand-700 transition hover:bg-brand-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  )
}
