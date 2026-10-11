-- SplitSmart initial schema: groups, members, expenses, expense_splits, balances view.
--
-- Access model (no login yet): a group's id is its secret. The app sends it on every
-- request in an `x-group-id` header, and RLS only exposes rows for that one group.
-- Without the header, nothing can be read, so groups cannot be listed or enumerated.

-- Reads the group id the client sent in the `x-group-id` request header.
-- Returns null if the header is missing or not a valid uuid.
create or replace function public.request_group_id()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  return (current_setting('request.headers', true)::json ->> 'x-group-id')::uuid;
exception when others then
  return null;
end;
$$;

-- Tables ------------------------------------------------------------------------------

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (id, group_id) -- target for the composite FK below
);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  paid_by      uuid not null,
  description  text not null check (length(trim(description)) between 1 and 200),
  amount_cents integer not null check (amount_cents > 0),
  created_at   timestamptz not null default now(),
  -- the payer must be a member of the same group
  foreign key (paid_by, group_id) references public.members (id, group_id) on delete cascade
);

create table public.expense_splits (
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  member_id   uuid not null references public.members (id) on delete cascade,
  share_cents integer not null check (share_cents >= 0),
  primary key (expense_id, member_id)
);

create index members_group_id_idx        on public.members (group_id);
create index expenses_group_id_idx       on public.expenses (group_id);
create index expenses_paid_by_idx        on public.expenses (paid_by);
create index expense_splits_member_id_idx on public.expense_splits (member_id);

-- Row Level Security --------------------------------------------------------------------
-- Only SELECT and INSERT policies exist, so UPDATE and DELETE are denied for app clients.

alter table public.groups         enable row level security;
alter table public.members        enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;

-- groups: the client picks the uuid (crypto.randomUUID()), sends it as the header, inserts.
create policy "read own group" on public.groups
  for select to anon, authenticated
  using (id = public.request_group_id());
create policy "create own group" on public.groups
  for insert to anon, authenticated
  with check (id = public.request_group_id());

create policy "read group members" on public.members
  for select to anon, authenticated
  using (group_id = public.request_group_id());
create policy "add group members" on public.members
  for insert to anon, authenticated
  with check (group_id = public.request_group_id());

create policy "read group expenses" on public.expenses
  for select to anon, authenticated
  using (group_id = public.request_group_id());
create policy "add group expenses" on public.expenses
  for insert to anon, authenticated
  with check (group_id = public.request_group_id());

create policy "read group splits" on public.expense_splits
  for select to anon, authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and e.group_id = public.request_group_id()
  ));
-- both the expense and the member must belong to the header's group
create policy "add group splits" on public.expense_splits
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.group_id = public.request_group_id()
    )
    and exists (
      select 1 from public.members m
      where m.id = member_id and m.group_id = public.request_group_id()
    )
  );

grant select, insert on public.groups, public.members, public.expenses, public.expense_splits
  to anon, authenticated;

-- Balances view -------------------------------------------------------------------------
-- security_invoker makes the view respect the caller's RLS, so it is scoped to one group.
-- balance_cents > 0 means the member is owed money; < 0 means they owe.

create view public.balances
with (security_invoker = true) as
select
  m.group_id,
  m.id   as member_id,
  m.name,
  coalesce(p.total_paid, 0)                              as total_paid_cents,
  coalesce(s.total_share, 0)                             as total_share_cents,
  coalesce(p.total_paid, 0) - coalesce(s.total_share, 0) as balance_cents
from public.members m
left join (
  select paid_by, sum(amount_cents)::bigint as total_paid
  from public.expenses group by paid_by
) p on p.paid_by = m.id
left join (
  select member_id, sum(share_cents)::bigint as total_share
  from public.expense_splits group by member_id
) s on s.member_id = m.id;

grant select on public.balances to anon, authenticated;
