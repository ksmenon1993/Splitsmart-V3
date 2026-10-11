export type Payment = { from: string; to: string; cents: number }

// Exact search is 2^n; above this many non-zero balances fall back to greedy (≤ n-1 payments).
const EXACT_LIMIT = 16

/**
 * Fewest payments that bring every balance to zero.
 * balances: member id -> net cents (positive = is owed, negative = owes); must sum to 0.
 *
 * The minimum number of payments is n - k, where n is the number of non-zero balances and
 * k is the largest number of disjoint zero-sum groups they can be split into: each group
 * of size s settles internally in s - 1 payments. We find k exactly with a bitmask DP, then
 * settle each group greedily.
 */
export function settleUp(balances: Map<string, number>): Payment[] {
  const people = [...balances].filter(([, cents]) => cents !== 0)
  if (people.length === 0) return []
  if (people.length > EXACT_LIMIT) return settleGreedy(people)

  const n = people.length
  const full = (1 << n) - 1
  const sum = new Array<number>(1 << n).fill(0)
  const best = new Array<number>(1 << n).fill(0) // max zero-sum groups formable in mask
  const lastRemoved = new Array<number>(1 << n).fill(-1)

  for (let mask = 1; mask <= full; mask++) {
    const lowest = 31 - Math.clz32(mask & -mask)
    sum[mask] = sum[mask & (mask - 1)] + people[lowest][1]
    let bestPrev = -1
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue
      const prev = best[mask ^ (1 << i)]
      if (prev > bestPrev) {
        bestPrev = prev
        lastRemoved[mask] = i
      }
    }
    best[mask] = bestPrev + (sum[mask] === 0 ? 1 : 0)
  }

  // Walk back from the full set to get an ordering whose prefix sums hit zero at each
  // group boundary, then cut it into those zero-sum groups.
  const order: number[] = []
  for (let mask = full; mask; mask ^= 1 << lastRemoved[mask]) order.push(lastRemoved[mask])
  order.reverse()

  const payments: Payment[] = []
  let group: [string, number][] = []
  let running = 0
  for (const i of order) {
    group.push(people[i])
    running += people[i][1]
    if (running === 0) {
      payments.push(...settleGreedy(group))
      group = []
    }
  }
  return payments
}

/** Largest debtor pays largest creditor until everyone is square. */
function settleGreedy(people: [string, number][]): Payment[] {
  const creditors = people.filter(([, c]) => c > 0).map(([id, c]) => ({ id, c }))
  const debtors = people.filter(([, c]) => c < 0).map(([id, c]) => ({ id, c: -c }))
  const payments: Payment[] = []
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.c - a.c)
    debtors.sort((a, b) => b.c - a.c)
    const cr = creditors[0]
    const de = debtors[0]
    const cents = Math.min(cr.c, de.c)
    payments.push({ from: de.id, to: cr.id, cents })
    cr.c -= cents
    de.c -= cents
    if (cr.c === 0) creditors.shift()
    if (de.c === 0) debtors.shift()
  }
  return payments
}
