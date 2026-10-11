import type { Expense, Member } from '../lib/groups'
import { formatMoney } from '../lib/money'
import { Avatar } from './Avatar'

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

export default function ExpenseList({ expenses, members }: { expenses: Expense[]; members: Member[] }) {
  const nameById = new Map(members.map((m) => [m.id, m.name]))

  if (expenses.length === 0) {
    return (
      <p className="mt-2 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
        No expenses yet. Tap “Add expense” below to log the first one.
      </p>
    )
  }

  return (
    <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {expenses.map((e) => (
        <li key={e.id} className="flex items-center gap-3 px-4 py-3">
          <Avatar memberId={e.paid_by} size="md" />
          <div className="min-w-0 flex-1">
            <p className={`truncate font-medium ${e.description ? '' : 'text-slate-500'}`}>
              {e.description || 'Expense'}
            </p>
            <p className="truncate text-sm text-slate-500">
              {nameById.get(e.paid_by) ?? 'Someone'} paid · {dateFormatter.format(new Date(e.created_at))}
            </p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">{formatMoney(e.amount_cents)}</span>
        </li>
      ))}
    </ul>
  )
}
