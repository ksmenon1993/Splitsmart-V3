import type { Balance, Expense, Group, Member } from './groups'
import { equalSplit } from './split'

export type Split = { expense_id: string; member_id: string; share_cents: number }

export type DemoData = {
  group: Group
  members: Member[]
  expenses: Expense[]
  splits: Split[]
}

// A sample group that lives only in the browser. Nothing here touches Supabase.
const MEMBERS: Member[] = [
  { id: 'demo-priya', name: 'Priya' },
  { id: 'demo-rahul', name: 'Rahul' },
  { id: 'demo-aisha', name: 'Aisha' },
  { id: 'demo-karan', name: 'Karan' },
]

// [description, rupees, payer, hours ago]. Totals ₹28,000, so everyone's share is a round
// ₹7,000 and the result reads at a glance: Priya and Rahul are owed, Aisha and Karan owe.
const EXPENSES: [string, number, string, number][] = [
  ['Villa booking (2 nights)', 12000, 'demo-priya', 52],
  ['Scooter rentals', 2500, 'demo-rahul', 49],
  ['Groceries & snacks', 1980, 'demo-karan', 46],
  ['Dinner at the beach shack', 4500, 'demo-aisha', 28],
  ['Parasailing for four', 6000, 'demo-rahul', 22],
  ['Lunch & coconut water', 1020, 'demo-priya', 3],
]

export function buildDemo(): DemoData {
  const now = Date.now()
  const expenses: Expense[] = EXPENSES.map(([description, rupees, paidBy, hoursAgo], i) => ({
    id: `demo-expense-${i}`,
    description,
    amount_cents: Math.round(rupees * 100),
    paid_by: paidBy,
    created_at: new Date(now - hoursAgo * 3_600_000).toISOString(),
  })).reverse() // newest first, like the real list

  const memberIds = MEMBERS.map((m) => m.id)
  const splits = expenses.flatMap((e) => splitsFor(e, memberIds))

  return { group: { id: 'demo', name: 'Goa Trip' }, members: MEMBERS, expenses, splits }
}

export function splitsFor(expense: Expense, memberIds: string[]): Split[] {
  return [...equalSplit(expense.amount_cents, memberIds, expense.paid_by)].map(([member_id, share_cents]) => ({
    expense_id: expense.id,
    member_id,
    share_cents,
  }))
}

/** Same result as the `balances` view, computed in the browser. */
export function computeBalances(members: Member[], expenses: Expense[], splits: Split[]): Balance[] {
  return members.map((m) => {
    const paid = expenses.filter((e) => e.paid_by === m.id).reduce((sum, e) => sum + e.amount_cents, 0)
    const share = splits.filter((s) => s.member_id === m.id).reduce((sum, s) => sum + s.share_cents, 0)
    return {
      member_id: m.id,
      name: m.name,
      total_paid_cents: paid,
      total_share_cents: share,
      balance_cents: paid - share,
    }
  })
}
