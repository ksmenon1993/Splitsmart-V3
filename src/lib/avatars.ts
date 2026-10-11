import { createContext, useContext } from 'react'
import type { Member } from './groups'

export type AvatarStyle = { animal: string; label: string; className: string }

// Friendly, easy-to-tell-apart animals. Assigned by join order, so within a group nobody
// shares one (up to 20 people) and every device shows the same animal for the same person.
const ANIMALS: [string, string][] = [
  ['🦊', 'fox'],
  ['🐼', 'panda'],
  ['🐸', 'frog'],
  ['🐯', 'tiger'],
  ['🐨', 'koala'],
  ['🐧', 'penguin'],
  ['🦁', 'lion'],
  ['🐰', 'bunny'],
  ['🐵', 'monkey'],
  ['🦉', 'owl'],
  ['🐻', 'bear'],
  ['🐙', 'octopus'],
  ['🐶', 'puppy'],
  ['🦄', 'unicorn'],
  ['🐱', 'cat'],
  ['🐢', 'turtle'],
  ['🐷', 'piglet'],
  ['🦔', 'hedgehog'],
  ['🐹', 'hamster'],
  ['🐮', 'cow'],
]

// Full class strings so Tailwind can see them.
const COLORS = [
  'bg-orange-100 ring-orange-200',
  'bg-sky-100 ring-sky-200',
  'bg-lime-100 ring-lime-200',
  'bg-amber-100 ring-amber-200',
  'bg-violet-100 ring-violet-200',
  'bg-cyan-100 ring-cyan-200',
  'bg-yellow-100 ring-yellow-200',
  'bg-pink-100 ring-pink-200',
  'bg-emerald-100 ring-emerald-200',
  'bg-indigo-100 ring-indigo-200',
  'bg-rose-100 ring-rose-200',
  'bg-teal-100 ring-teal-200',
]

const FALLBACK: AvatarStyle = { animal: '🙂', label: 'person', className: 'bg-slate-100 ring-slate-200' }

/** members must be in join order (as loaded). */
export function buildAvatars(members: Member[]): Map<string, AvatarStyle> {
  return new Map(
    members.map((m, i) => {
      const [animal, label] = ANIMALS[i % ANIMALS.length]
      return [m.id, { animal, label, className: COLORS[i % COLORS.length] }]
    }),
  )
}

export const AvatarContext = createContext<Map<string, AvatarStyle>>(new Map())

export function useAvatar(memberId: string): AvatarStyle {
  return useContext(AvatarContext).get(memberId) ?? FALLBACK
}
