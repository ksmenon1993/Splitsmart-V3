import { useState } from 'react'

export default function ShareLink({ url, groupName }: { url: string; groupName: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (e.g. plain http on a phone); the link is still selectable.
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: `${groupName} on SplitSmart`, url })
    } catch {
      // User dismissed the share sheet.
    }
  }

  return (
    <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <h2 className="text-sm font-semibold text-brand-700">Invite your group</h2>
      <p className="mt-0.5 text-sm text-slate-600">Anyone with this link can view and add to the group.</p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Shareable group link"
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 truncate rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {'share' in navigator && (
        <button
          type="button"
          onClick={handleShare}
          className="mt-2 w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50 active:scale-[0.98]"
        >
          Share…
        </button>
      )}
    </section>
  )
}
