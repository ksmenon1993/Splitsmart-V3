import type { Balance } from '../lib/groups'
import { formatMoney } from '../lib/money'
import { settleUp } from '../lib/settle'
import { Avatar } from './Avatar'

type Props = {
  balances: Balance[]
  meId: string | null
  onAddMembers: () => void
}

export default function BalancesView({ balances, meId, onAddMembers }: Props) {
  if (balances.length === 0) {
    return (
      <EmptyCard
        emoji="👋"
        title="Who's in?"
        body="Add the people in this group, then log expenses to see who owes whom."
        action="Add members"
        onAction={onAddMembers}
      />
    )
  }

  const nameById = new Map(balances.map((b) => [b.member_id, b.name]))
  const payments = settleUp(new Map(balances.map((b) => [b.member_id, b.balance_cents])))
  const sorted = [...balances].sort((a, b) => b.balance_cents - a.balance_cents)
  const hasExpenses = balances.some((b) => b.total_paid_cents > 0)

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="settle-heading">
        <h2 id="settle-heading" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Settle up
        </h2>

        {payments.length === 0 ? (
          <div className="mt-3 rounded-3xl bg-brand-50 px-5 py-8 text-center">
            <p className="text-4xl" aria-hidden="true">
              {hasExpenses ? '🎉' : '🧾'}
            </p>
            <p className="mt-2 text-xl font-semibold text-brand-700">
              {hasExpenses ? 'All settled up!' : 'Nothing to settle yet'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {hasExpenses ? 'Nobody owes anybody anything.' : 'Tap “Add expense” and the payments will show up here.'}
            </p>
          </div>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {payments.map((p) => (
              <li
                key={`${p.from}-${p.to}`}
                className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                {/* from → to, so the direction of money is obvious at a glance */}
                <div className="mb-3 flex items-center gap-2" aria-hidden="true">
                  <Avatar memberId={p.from} size="md" />
                  <span className="relative h-0 flex-1 border-t-2 border-dashed border-slate-300">
                    <span className="absolute -top-[0.7rem] right-0 text-sm text-slate-400">▶</span>
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 text-base">
                      💸
                    </span>
                  </span>
                  <Avatar memberId={p.to} size="md" />
                </div>
                <p className="text-lg leading-snug">
                  <span className="font-semibold text-red-600">{p.from === meId ? 'You' : nameById.get(p.from)}</span>
                  <span className="text-slate-500">{p.from === meId ? ' pay ' : ' pays '}</span>
                  <span className="font-semibold text-emerald-600">{p.to === meId ? 'you' : nameById.get(p.to)}</span>
                </p>
                <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatMoney(p.cents)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="balances-heading">
        <h2 id="balances-heading" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Balances
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {sorted.map((b) => {
            const owed = b.balance_cents > 0
            const owes = b.balance_cents < 0
            return (
              <li
                key={b.member_id}
                className={`flex gap-4 rounded-3xl px-4 py-4 ${
                  owed ? 'bg-emerald-50' : owes ? 'bg-red-50' : 'bg-slate-100'
                }`}
              >
                <Avatar memberId={b.member_id} size="lg" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-lg font-semibold">
                      {b.name}
                      {b.member_id === meId && <span className="font-normal text-slate-500"> (you)</span>}
                    </p>
                    <p
                      className={`shrink-0 text-sm font-medium ${
                        owed ? 'text-emerald-700' : owes ? 'text-red-700' : 'text-slate-500'
                      }`}
                    >
                      {owed ? 'gets back' : owes ? 'owes' : 'settled up'}
                    </p>
                  </div>
                  <p
                    className={`mt-1 text-[2.1rem] leading-tight font-bold tracking-tight tabular-nums ${
                      owed ? 'text-emerald-600' : owes ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    {owed ? '+' : owes ? '−' : ''}
                    {formatMoney(Math.abs(b.balance_cents))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Paid {formatMoney(b.total_paid_cents)} · Share {formatMoney(b.total_share_cents)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function EmptyCard(props: { emoji: string; title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-3xl bg-brand-50 px-5 py-10 text-center">
      <p className="text-4xl" aria-hidden="true">
        {props.emoji}
      </p>
      <p className="mt-2 text-xl font-semibold">{props.title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-600">{props.body}</p>
      <button
        type="button"
        onClick={props.onAction}
        className="mt-5 rounded-2xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
      >
        {props.action}
      </button>
    </div>
  )
}
