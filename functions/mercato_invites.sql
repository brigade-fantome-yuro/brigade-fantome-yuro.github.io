-- Invitations Mercato : l'hôte d'un salon ouvert invite un membre ; l'invité voit un bandeau sur le site.
create table if not exists public.mercato_invites(
  id bigserial primary key,
  code text not null,
  from_id uuid not null default auth.uid(),
  from_name text not null default '',
  to_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists mercato_invites_to on public.mercato_invites(to_id);
alter table public.mercato_invites enable row level security;
drop policy if exists mi_read on public.mercato_invites;
create policy mi_read on public.mercato_invites for select using (auth.uid() in (from_id, to_id));
drop policy if exists mi_ins on public.mercato_invites;
create policy mi_ins on public.mercato_invites for insert with check (
  from_id = auth.uid() and is_member() and to_id <> auth.uid()
  and exists (select 1 from public.mercato_parties p where p.code = mercato_invites.code and p.host = auth.uid() and p.status = 'lobby' and p.guest is null));
drop policy if exists mi_del on public.mercato_invites;
create policy mi_del on public.mercato_invites for delete using (auth.uid() in (from_id, to_id));
