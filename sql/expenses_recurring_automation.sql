-- ============================================================
-- Sideline Pro: recurring expense automation
--
-- Before this, is_recurring was only a label — nothing generated
-- the monthly charge, so a card in someone's name (e.g. Justin) never
-- produced a fresh "awaiting reimbursement" entry each period.
--
-- Model: the original recurring row is the TEMPLATE (is_recurring=true).
-- It holds the schedule in recurring_next_date. A daily cron calls
-- generate_due_recurring_expenses(), which copies the template into a
-- new plain expense (is_recurring=false, recurring_source_id=template)
-- for each period that has come due, carrying paid_by across — so the
-- copy lands as "awaiting reimbursement" automatically.
-- ============================================================

alter table public.expenses
  add column if not exists recurring_next_date date,
  add column if not exists recurring_source_id uuid
    references public.expenses(id) on delete set null;

-- Cron scans by due date; index the templates only.
create index if not exists expenses_recurring_next_idx
  on public.expenses (recurring_next_date)
  where recurring_next_date is not null;

-- Trace generated instances back to their template.
create index if not exists expenses_recurring_source_idx
  on public.expenses (recurring_source_id)
  where recurring_source_id is not null;

-- ── Keep recurring_next_date in step with the template ──────
-- Sets the next due date whenever a row is (or becomes) recurring, and
-- clears it otherwise. Fires only when the relevant inputs change, so the
-- cron's own advance of recurring_next_date is never clobbered.
create or replace function public.set_recurring_next_date()
returns trigger
language plpgsql
as $$
declare
  step interval;
begin
  if new.is_recurring is true then
    step := case new.recurring_frequency
              when 'monthly'   then interval '1 month'
              when 'quarterly' then interval '3 months'
              when 'yearly'    then interval '1 year'
              else interval '1 month'
            end;
    if new.recurring_next_date is null then
      new.recurring_next_date := (new.date + step)::date;
    end if;
  else
    new.recurring_next_date := null;
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_set_recurring_next on public.expenses;
create trigger expenses_set_recurring_next
  before insert or update of is_recurring, recurring_frequency, date
  on public.expenses
  for each row
  execute function public.set_recurring_next_date();

-- ── Generate every recurring charge that has come due ───────
-- Idempotent: guarded by (recurring_source_id, date) so re-runs and
-- catch-up loops never double up. Returns the number of rows created.
create or replace function public.generate_due_recurring_expenses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tmpl   record;
  step   interval;
  target date;
  made   integer := 0;
begin
  for tmpl in
    select * from public.expenses
    where is_recurring = true
      and recurring_next_date is not null
      and recurring_next_date <= current_date
  loop
    step := case tmpl.recurring_frequency
              when 'monthly'   then interval '1 month'
              when 'quarterly' then interval '3 months'
              when 'yearly'    then interval '1 year'
              else interval '1 month'
            end;
    target := tmpl.recurring_next_date;

    while target <= current_date loop
      if not exists (
        select 1 from public.expenses
        where recurring_source_id = tmpl.id and date = target
      ) then
        insert into public.expenses (
          date, description, amount_cents, gst_cents,
          status, paid_by, reimbursed, category, vendor,
          currency, original_amount_cents, fx_rate,
          is_recurring, recurring_frequency, recurring_source_id,
          created_by_email
        ) values (
          target, tmpl.description, tmpl.amount_cents, tmpl.gst_cents,
          'paid', tmpl.paid_by, false, tmpl.category, tmpl.vendor,
          tmpl.currency, tmpl.original_amount_cents, tmpl.fx_rate,
          false, null, tmpl.id,
          tmpl.created_by_email
        );
        made := made + 1;
      end if;
      target := (target + step)::date;
    end loop;

    update public.expenses
      set recurring_next_date = target, updated_at = now()
      where id = tmpl.id;
  end loop;

  return made;
end;
$$;

-- ── Backfill existing templates (forward only) ─────────────
-- Schedule the first occurrence strictly after today, so turning this on
-- does NOT retroactively generate months you've already handled by hand.
update public.expenses e
set recurring_next_date = (
  select g.d::date
  from generate_series(
    e.date::timestamp,
    (current_date + interval '1 year')::timestamp,
    case e.recurring_frequency
      when 'monthly'   then interval '1 month'
      when 'quarterly' then interval '3 months'
      when 'yearly'    then interval '1 year'
      else interval '1 month'
    end
  ) as g(d)
  where g.d::date > current_date
  order by g.d
  limit 1
)
where e.is_recurring = true
  and e.recurring_next_date is null;
