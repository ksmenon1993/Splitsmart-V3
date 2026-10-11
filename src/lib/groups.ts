import { setGroupId, supabase } from './supabase'

export type Group = { id: string; name: string }
export type Member = { id: string; name: string }
export type Expense = {
  id: string
  description: string
  amount_cents: number
  paid_by: string
  created_at: string
}

/** Row of the `balances` view. balance_cents > 0: is owed; < 0: owes. */
export type Balance = {
  member_id: string
  name: string
  total_paid_cents: number
  total_share_cents: number
  balance_cents: number
}

const EXPENSE_COLUMNS = 'id, description, amount_cents, paid_by, created_at'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function groupIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('group')
  return id && UUID_RE.test(id) ? id.toLowerCase() : null
}

export function groupUrl(id: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('group', id)
  return url.toString()
}

export async function createGroup(name: string): Promise<Group> {
  // The client picks the id so it can send it in the header the insert policy checks.
  const id = crypto.randomUUID()
  setGroupId(id)
  const { error } = await supabase.from('groups').insert({ id, name })
  if (error) throw error
  return { id, name }
}

export async function loadGroup(
  id: string,
): Promise<{ group: Group; members: Member[]; expenses: Expense[]; balances: Balance[] } | null> {
  setGroupId(id)
  const [groupRes, membersRes, expensesRes, balances] = await Promise.all([
    supabase.from('groups').select('id, name').eq('id', id).maybeSingle(),
    supabase.from('members').select('id, name').eq('group_id', id).order('created_at'),
    supabase
      .from('expenses')
      .select(EXPENSE_COLUMNS)
      .eq('group_id', id)
      .order('created_at', { ascending: false }),
    loadBalances(id),
  ])
  if (groupRes.error) throw groupRes.error
  if (membersRes.error) throw membersRes.error
  if (expensesRes.error) throw expensesRes.error
  if (!groupRes.data) return null
  return { group: groupRes.data, members: membersRes.data, expenses: expensesRes.data, balances }
}

export async function loadBalances(groupId: string): Promise<Balance[]> {
  const { data, error } = await supabase
    .from('balances')
    .select('member_id, name, total_paid_cents, total_share_cents, balance_cents')
    .eq('group_id', groupId)
  if (error) throw error
  // bigint sums can arrive as strings; amounts here stay well within Number range.
  return data.map((b) => ({
    member_id: b.member_id,
    name: b.name,
    total_paid_cents: Number(b.total_paid_cents),
    total_share_cents: Number(b.total_share_cents),
    balance_cents: Number(b.balance_cents),
  }))
}

export async function addMember(groupId: string, name: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ group_id: groupId, name })
    .select('id, name')
    .single()
  if (error) throw error
  return data
}

export type NewExpense = {
  paidBy: string
  amountCents: number
  description: string
  /** Members to split between; null means everyone in the group. */
  splitMemberIds: string[] | null
}

/** Saves the expense and its equal split in one transaction (see add_expense). */
export async function addExpense(groupId: string, input: NewExpense): Promise<Expense> {
  const { data: id, error } = await supabase.rpc('add_expense', {
    p_group_id: groupId,
    p_paid_by: input.paidBy,
    p_amount_cents: input.amountCents,
    p_description: input.description,
    p_split_member_ids: input.splitMemberIds,
  })
  if (error) throw error
  const { data, error: fetchError } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError
  return data
}
