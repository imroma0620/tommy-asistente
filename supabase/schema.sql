-- Tommy · IM ROMA — sync MVP (Supabase SQL Editor)
create table if not exists public.tommy_sync (
  workspace_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tommy_sync enable row level security;

-- MVP: un solo workspace compartido (IM ROMA). Ajusta el id si hace falta.
drop policy if exists "tommy_im_roma_rw" on public.tommy_sync;
create policy "tommy_im_roma_rw" on public.tommy_sync
  for all
  using (workspace_id = 'im-roma-diana')
  with check (workspace_id = 'im-roma-diana');
