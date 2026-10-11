import { useContext } from 'react'
import { AvatarContext, useAvatar } from '../lib/avatars'
import type { Member } from '../lib/groups'

const SIZES = {
  xs: 'size-6 text-sm',
  sm: 'size-8 text-lg',
  md: 'size-10 text-2xl',
  lg: 'size-14 text-[2rem]',
}

type Size = keyof typeof SIZES

/** Animal avatar for a member. Decorative: the member's name is always shown alongside. */
export function Avatar({ memberId, size = 'md', className = '' }: { memberId: string; size?: Size; className?: string }) {
  const { animal, className: color } = useAvatar(memberId)
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full leading-none ring-2 select-none ${color} ${SIZES[size]} ${className}`}
    >
      {animal}
    </span>
  )
}

/** Overlapping row of avatars with a "+N" overflow bubble. */
export function AvatarStack({ members, max = 6, size = 'md' }: { members: Member[]; max?: number; size?: Size }) {
  const avatars = useContext(AvatarContext)
  const shown = members.slice(0, members.length > max ? max - 1 : max)
  const extra = members.length - shown.length
  return (
    <div className="flex items-center" aria-hidden="true">
      {shown.map((m, i) => (
        <span
          key={m.id}
          className={`${i > 0 ? '-ml-2.5' : ''} rounded-full ring-2 ring-white`}
          style={{ zIndex: shown.length - i }}
          title={`${m.name} (${avatars.get(m.id)?.label ?? 'person'})`}
        >
          <Avatar memberId={m.id} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className={`-ml-2.5 grid place-items-center rounded-full bg-slate-800 font-semibold text-white ring-2 ring-white ${SIZES[size]} !text-xs`}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
