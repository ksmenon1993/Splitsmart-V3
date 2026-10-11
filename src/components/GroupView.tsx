import { useMemo, useRef, useState, type FormEvent } from 'react'
import { AvatarContext, buildAvatars } from '../lib/avatars'
import { groupUrl, type Balance, type Expense, type Group, type Member, type NewExpense } from '../lib/groups'
import { getMe, saveMe } from '../lib/me'
import { formatMoney } from '../lib/money'
import AddExpenseSheet from './AddExpenseSheet'
import { Avatar, AvatarStack } from './Avatar'
import BalancesView from './BalancesView'
import ExpenseList from './ExpenseList'
import ShareLink from './ShareLink'

type Props = {
  group: Group
  members: Member[]
  expenses: Expense[]
  balances: Balance[]
  onAddMember: (name: string) => Promise<void>
  onAddExpense: (expense: NewExpense) => Promise<void>
  /** Set when showing the in-browser sample group. */
  demo?: { onExit: () => void }
}

type Tab = 'balances' | 'expenses' | 'members'

const TABS: { id: Tab; label: string }[] = [
  { id: 'balances', label: 'Balances' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'members', label: 'Members' },
]

export default function GroupView(props: Props) {
  const { group, members, expenses, balances } = props
  // A brand-new group has nobody in it yet, so start where the first job is.
  const [tab, setTab] = useState<Tab>(members.length === 0 ? 'members' : 'balances')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [storedMe, setStoredMe] = useState(() => getMe(group.id))
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const meId = members.some((m) => m.id === storedMe) ? storedMe : null
  const avatars = useMemo(() => buildAvatars(members), [members])

  function setMe(memberId: string) {
    saveMe(group.id, memberId)
    setStoredMe(memberId)
  }

  function showToast(message: string) {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  async function handleAddExpense(expense: NewExpense) {
    await props.onAddExpense(expense)
    setSheetOpen(false)
    setTab('balances')
    const ways = expense.splitMemberIds?.length ?? members.length
    showToast(`Added ${formatMoney(expense.amountCents)} · split ${ways} ${ways === 1 ? 'way' : 'ways'}`)
  }

  return (
    <AvatarContext.Provider value={avatars}>
      <div className="flex flex-1 flex-col">
        {props.demo && <DemoBanner onExit={props.demo.onExit} />}
        <div className="bg-gradient-to-b from-brand-50 to-white px-4 pt-5 pb-1">
          <p className="text-xs font-medium tracking-wide text-brand-700/70 uppercase">Group</p>
          <h1 className="text-2xl font-semibold tracking-tight break-words">{group.name}</h1>
          <button
            type="button"
            onClick={() => setTab('members')}
            className="mt-3 flex items-center gap-3 rounded-full py-1 pr-3 text-left transition hover:bg-white/70"
            aria-label={`${members.length} ${members.length === 1 ? 'person' : 'people'} in this group. Show members.`}
          >
            {members.length > 0 ? (
              <AvatarStack members={members} />
            ) : (
              <span className="grid size-10 place-items-center rounded-full border-2 border-dashed border-slate-300 text-lg text-slate-400">
                +
              </span>
            )}
            <span className="text-sm">
              <span className="block font-semibold text-slate-900">
                {members.length === 0
                  ? 'No one yet'
                  : `${members.length} ${members.length === 1 ? 'person' : 'people'}`}
              </span>
              <span className="block text-slate-500">
                {members.length === 0 ? 'Add your crew to get started' : 'in this group'}
              </span>
            </span>
          </button>
        </div>

        <nav
          aria-label="Group sections"
          className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3rem+1px)] z-10 mt-4 border-b border-slate-100 bg-white/90 px-4 backdrop-blur"
        >
          <div role="tablist" className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px flex-1 border-b-2 px-2 py-3 text-sm font-semibold transition ${
                  tab === t.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                {t.id === 'expenses' && expenses.length > 0 && (
                  <span className="ml-1 font-normal text-slate-400">{expenses.length}</span>
                )}
                {t.id === 'members' && members.length > 0 && (
                  <span className="ml-1 font-normal text-slate-400">{members.length}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div role="tabpanel" className="flex-1 px-4 py-6">
          {tab === 'balances' && (
            <BalancesView balances={balances} meId={meId} onAddMembers={() => setTab('members')} />
          )}

          {tab === 'expenses' && (
            <section>
              <h2 className="text-sm font-semibold text-slate-700">History</h2>
              <ExpenseList expenses={expenses} members={members} />
            </section>
          )}

          {tab === 'members' && (
            <MembersPanel
              group={group}
              members={members}
              meId={meId}
              onSetMe={setMe}
              onAddMember={props.onAddMember}
              isDemo={!!props.demo}
            />
          )}
        </div>

        {/* Always one tap away, on every tab */}
        {members.length > 0 && (
          <div className="sticky bottom-0 z-20 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]"
            >
              + Add expense
            </button>
          </div>
        )}

        {toast && (
          <div
            role="status"
            className="fixed inset-x-0 bottom-28 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] animate-fade-in rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            ✓ {toast}
          </div>
        )}

        {sheetOpen && (
          <AddExpenseSheet
            members={members}
            meId={meId}
            onSetMe={setMe}
            onSubmit={handleAddExpense}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </div>
    </AvatarContext.Provider>
  )
}

function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-900">
        <span aria-hidden="true">👀 </span>This is a sample group
      </p>
      <p className="mt-0.5 text-sm text-amber-800">
        Poke around and add things. Nothing is saved, and nobody else can see it.
      </p>
      <button
        type="button"
        onClick={onExit}
        className="mt-2.5 w-full rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950 active:scale-[0.98]"
      >
        Clear sample &amp; start my own group
      </button>
    </div>
  )
}

function MembersPanel({
  group,
  members,
  meId,
  onSetMe,
  onAddMember,
  isDemo,
}: {
  group: Group
  members: Member[]
  meId: string | null
  onSetMe: (memberId: string) => void
  onAddMember: (name: string) => Promise<void>
  isDemo: boolean
}) {
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
      await onAddMember(trimmed)
      setName('')
    } catch {
      setError("Couldn't add that person. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-700">
          {members.length === 0
            ? 'Who’s coming?'
            : `${members.length} ${members.length === 1 ? 'person' : 'people'} in ${group.name}`}
        </h2>
        {members.length === 0 ? (
          <div className="mt-3 rounded-3xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
            <p className="text-3xl tracking-widest" aria-hidden="true">
              🦊🐼🐸🐯
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Everyone gets their own animal. Add yourself and your friends below.
            </p>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {members.map((m) => (
              <li
                key={m.id}
                className={`flex flex-col items-center rounded-3xl px-2 pt-4 pb-3 text-center ring-1 ${
                  m.id === meId ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-slate-200'
                }`}
              >
                <Avatar memberId={m.id} size="lg" />
                <span className="mt-2 w-full truncate text-sm font-semibold">{m.name}</span>
                {m.id === meId ? (
                  <span className="mt-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    You
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetMe(m.id)}
                    className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    That's me
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a member by name"
            aria-label="Member name"
            maxLength={50}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="shrink-0 rounded-2xl bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {isDemo ? (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Sharing is off for the sample group. Start your own group to get a link you can send.
        </p>
      ) : (
        <ShareLink url={groupUrl(group.id)} groupName={group.name} />
      )}
    </div>
  )
}
