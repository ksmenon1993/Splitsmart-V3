-- Quick expense entry: description becomes optional, and an expense can be split
-- between a chosen subset of members (default: everyone).

alter table public.expenses drop constraint expenses_description_check;
alter table public.expenses
  alter column description set default '',
  add constraint expenses_description_check check (length(description) <= 200);

-- Replaces the 4-argument version. Callers pass named arguments, so the new optional
-- ones are backwards compatible.
drop function public.add_expense(uuid, uuid, text, integer);

create function public.add_expense(
  p_group_id         uuid,
  p_paid_by          uuid,
  p_amount_cents     integer,
  p_description      text   default '',
  p_split_member_ids uuid[] default null -- null = split between all members
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_count      integer;
begin
  -- Only ids that are members of this group count; anything else is ignored.
  select count(*) into v_count
  from public.members
  where group_id = p_group_id
    and (p_split_member_ids is null or id = any (p_split_member_ids));
  if v_count = 0 then
    raise exception 'Nobody to split this expense between';
  end if;

  insert into public.expenses (group_id, paid_by, description, amount_cents)
  values (p_group_id, p_paid_by, trim(coalesce(p_description, '')), p_amount_cents)
  returning id into v_expense_id;

  -- Equal shares; leftover paise go to the payer first (if they're in the split),
  -- then members by join order. Mirrored in src/lib/split.ts.
  insert into public.expense_splits (expense_id, member_id, share_cents)
  select
    v_expense_id,
    m.id,
    p_amount_cents / v_count
      + case when row_number() over (order by (m.id = p_paid_by) desc, m.created_at, m.id)
                  <= p_amount_cents % v_count
             then 1 else 0 end
  from public.members m
  where m.group_id = p_group_id
    and (p_split_member_ids is null or m.id = any (p_split_member_ids));

  return v_expense_id;
end;
$$;

revoke execute on function public.add_expense(uuid, uuid, integer, text, uuid[]) from public;
grant execute on function public.add_expense(uuid, uuid, integer, text, uuid[]) to anon, authenticated;
