const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

// Amounts are stored as integer paise; the DB column is a 32-bit integer.
export const MAX_AMOUNT_CENTS = 1_00_00_000_00 // ₹1 crore

export function formatMoney(cents: number): string {
  return formatter.format(cents / 100)
}

/** Parses "120", "120.5" or "1,200.50" into paise. Returns null if invalid or out of range. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [rupees, paise = ''] = cleaned.split('.')
  const cents = Number(rupees) * 100 + Number(paise.padEnd(2, '0'))
  return cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null
}
