import { useEffect, useState } from 'react'
import CreateGroup from './components/CreateGroup'
import GroupView from './components/GroupView'
import { buildDemo, computeBalances, splitsFor, type DemoData } from './lib/demo'
import {
  addExpense,
  addMember,
  groupIdFromUrl,
  groupUrl,
  loadBalances,
  loadGroup,
  type Balance,
  type Expense,
  type Group,
  type Member,
  type NewExpense,
} from './lib/groups'
import { setGroupId } from './lib/supabase'

type State =
  | { status: 'create' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; group: Group; members: Member[]; expenses: Expense[]; balances: Balance[] }
  | { status: 'demo'; data: DemoData }

const DEMO_URL = '?demo'

function initialState(): State {
  if (groupIdFromUrl()) return { status: 'loading' }
  if (new URLSearchParams(window.location.search).has('demo')) return { status: 'demo', data: buildDemo() }
  // A `group` param that isn't a valid id is a broken link, not a fresh start.
  return new URLSearchParams(window.location.search).has('group')
    ? { status: 'not-found' }
    : { status: 'create' }
}

function App() {
  const [state, setState] = useState<State>(initialState)
  const [reloadKey, setReloadKey] = useState(0)

  // Load the group named in the URL, and again whenever the user navigates back/forward.
  useEffect(() => {
    const onPopState = () => {
      setState(initialState())
      setReloadKey((k) => k + 1)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const id = groupIdFromUrl()
    if (!id) {
      setGroupId(null)
      return
    }
    let cancelled = false
    loadGroup(id)
      .then((result) => {
        if (cancelled) return
        setState(result ? { status: 'ready', ...result } : { status: 'not-found' })
      })
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function handleCreated(group: Group) {
    window.history.pushState(null, '', groupUrl(group.id))
    window.scrollTo(0, 0)
    setState({ status: 'ready', group, members: [], expenses: [], balances: [] })
  }

  // Balances are computed by the database view, so re-read them after any change.
  async function refreshBalances(groupId: string) {
    try {
      const balances = await loadBalances(groupId)
      setState((s) => (s.status === 'ready' && s.group.id === groupId ? { ...s, balances } : s))
    } catch {
      // Keep the previous balances; the next change or a refresh will catch up.
    }
  }

  async function handleAddMember(groupId: string, name: string) {
    const member = await addMember(groupId, name)
    setState((s) => (s.status === 'ready' ? { ...s, members: [...s.members, member] } : s))
    void refreshBalances(groupId)
  }

  async function handleAddExpense(groupId: string, input: NewExpense) {
    const expense = await addExpense(groupId, input)
    setState((s) => (s.status === 'ready' ? { ...s, expenses: [expense, ...s.expenses] } : s))
    void refreshBalances(groupId)
  }

  // The sample group lives only in memory: same screens, no Supabase.
  function updateDemo(update: (data: DemoData) => DemoData) {
    setState((s) => (s.status === 'demo' ? { ...s, data: update(s.data) } : s))
  }

  function openDemo() {
    window.history.pushState(null, '', DEMO_URL)
    window.scrollTo(0, 0)
    setGroupId(null)
    setState({ status: 'demo', data: buildDemo() })
  }

  function startOver() {
    window.history.pushState(null, '', window.location.pathname)
    window.scrollTo(0, 0)
    setGroupId(null)
    setState({ status: 'create' })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm sm:border-x sm:border-slate-200">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
        <button type="button" onClick={startOver} className="flex items-center gap-2" aria-label="SplitSmart home">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Split<span className="text-brand-600">Smart</span>
          </span>
        </button>
        {state.status === 'ready' && (
          <button
            type="button"
            onClick={startOver}
            className="rounded-xl px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            New group
          </button>
        )}
        {state.status === 'demo' && (
          <button
            type="button"
            onClick={startOver}
            className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-200"
          >
            Sample · Exit
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col">
        {state.status === 'create' && <CreateGroup onCreated={handleCreated} onOpenDemo={openDemo} />}

        {state.status === 'loading' && (
          <div className="flex flex-1 items-center justify-center text-slate-400" role="status">
            Loading group…
          </div>
        )}

        {(state.status === 'not-found' || state.status === 'error') && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h1 className="text-xl font-semibold">
              {state.status === 'not-found' ? 'Group not found' : 'Something went wrong'}
            </h1>
            <p className="mt-2 max-w-xs text-slate-500">
              {state.status === 'not-found'
                ? 'This link may be mistyped or incomplete. Ask whoever shared it to send it again.'
                : "We couldn't load this group. Check your connection and refresh."}
            </p>
            <button
              type="button"
              onClick={startOver}
              className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
            >
              Start a new group
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <GroupView
            key={state.group.id}
            group={state.group}
            members={state.members}
            expenses={state.expenses}
            balances={state.balances}
            onAddMember={(name) => handleAddMember(state.group.id, name)}
            onAddExpense={(input) => handleAddExpense(state.group.id, input)}
          />
        )}

        {state.status === 'demo' && (
          <GroupView
            key="demo"
            group={state.data.group}
            members={state.data.members}
            expenses={state.data.expenses}
            balances={computeBalances(state.data.members, state.data.expenses, state.data.splits)}
            demo={{ onExit: startOver }}
            onAddMember={async (name) =>
              updateDemo((d) => ({ ...d, members: [...d.members, { id: crypto.randomUUID(), name }] }))
            }
            onAddExpense={async (input) =>
              updateDemo((d) => {
                const expense: Expense = {
                  id: crypto.randomUUID(),
                  description: input.description,
                  amount_cents: input.amountCents,
                  paid_by: input.paidBy,
                  created_at: new Date().toISOString(),
                }
                const splitIds = input.splitMemberIds ?? d.members.map((m) => m.id)
                const splits = splitsFor(expense, d.members.map((m) => m.id).filter((id) => splitIds.includes(id)))
                return { ...d, expenses: [expense, ...d.expenses], splits: [...d.splits, ...splits] }
              })
            }
          />
        )}
      </main>

      <footer className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] text-center text-xs text-slate-400">
        Split bills, not friendships.
      </footer>
    </div>
  )
}

export default App
