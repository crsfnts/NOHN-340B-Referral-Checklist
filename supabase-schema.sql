create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audit_number text not null,
  audit_title text,
  status text not null default 'review',
  result text,
  answers jsonb not null default '[]'::jsonb,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audits add column if not exists site text;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_audits_updated_at on public.audits;
create trigger set_audits_updated_at
before update on public.audits
for each row
execute function public.handle_updated_at();

alter table public.audits enable row level security;

drop policy if exists "Users can view their own audits" on public.audits;
drop policy if exists "Users can insert their own audits" on public.audits;
drop policy if exists "Users can update their own audits" on public.audits;
drop policy if exists "Users can delete their own audits" on public.audits;

create policy "Users can view their own audits"
on public.audits
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own audits"
on public.audits
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own audits"
on public.audits
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own audits"
on public.audits
for delete
to authenticated
using (auth.uid() = user_id);
