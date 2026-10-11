import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
}

// RLS only exposes rows for the group id sent in the `x-group-id` header
// (see supabase/migrations). Every request carries the current group's id.
let currentGroupId: string | null = null

export function setGroupId(id: string | null) {
  currentGroupId = id
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers)
      if (currentGroupId) headers.set('x-group-id', currentGroupId)
      return fetch(input, { ...init, headers })
    },
  },
})
