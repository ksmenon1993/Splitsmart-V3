-- Adds an expense and splits it equally among all of the group's members, atomically.
-- security invoker: runs as the caller, so the x-group-id RLS policies still apply.
-- Leftover cents (e.g. 100 / 3) go one each to the payer first, then members by join order,
-- so shares always add up exactly to the amount.

create or replace function public.add_expense(
  p_group_id     uuid,
  p_paid_by      uuid,
  p_description  text,
  p_amount_cents integer
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
  select count(*) into v_count from public.members where group_id = p_group_id;
  if v_count = 0 then
    raise exception 'Group has no members';
  end if;

  insert into public.expenses (group_id, paid_by, description, amount_cents)
  values (p_group_id, p_paid_by, trim(p_description), p_amount_cents)
  returning id into v_expense_id;

  insert into public.expense_splits (expense_id, member_id, share_cents)
  select
    v_expense_id,
    m.id,
    p_amount_cents / v_count
      + case when row_number() over (order by (m.id = p_paid_by) desc, m.created_at, m.id)
                  <= p_amount_cents % v_count
             then 1 else 0 end
  from public.members m
  where m.group_id = p_group_id;

  return v_expense_id;
end;
$$;

revoke execute on function public.add_expense(uuid, uuid, text, integer) from public;
grant execute on function public.add_expense(uuid, uuid, text, integer) to anon, authenticated;
