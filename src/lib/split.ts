/**
 * Equal split in integer paise, matching the add_expense SQL function exactly:
 * everyone gets amount / n, and the leftover paise go one each to the payer first,
 * then to members in join order. Shares always add up to the amount.
 */
export function equalSplit(amountCents: number, memberIds: string[], payerId: string): Map<string, number> {
  const n = memberIds.length
  const base = Math.floor(amountCents / n)
  const extra = amountCents % n
  const order = [...memberIds].sort((a, b) => Number(b === payerId) - Number(a === payerId))
  return new Map(order.map((id, i) => [id, base + (i < extra ? 1 : 0)]))
}
