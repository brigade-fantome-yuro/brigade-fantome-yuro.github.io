-- Mini-jeu Mercato YURO : une ligne par partie en ligne (2 joueurs).
-- La partie tourne chez le créateur (hôte) ; l'état est enregistré ici pour reprendre après un rechargement.
-- Les mises sous enveloppe et les trios pas encore révélés ne sont jamais enregistrés ici (ils restent chez l'hôte).
create table if not exists public.mercato_parties(
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{4}$'),
  host uuid not null default auth.uid() references auth.users on delete cascade,
  guest uuid references auth.users on delete cascade,
  host_name text not null default '',
  guest_name text,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'over')),
  state jsonb,
  winner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mercato_parties_host on public.mercato_parties(host);
create index if not exists mercato_parties_guest on public.mercato_parties(guest);
alter table public.mercato_parties enable row level security;

-- Lecture : membres de la Brigade.
drop policy if exists mp_read on public.mercato_parties;
create policy mp_read on public.mercato_parties for select using (is_member());
-- Création : uniquement pour soi, en tant qu'hôte.
drop policy if exists mp_ins on public.mercato_parties;
create policy mp_ins on public.mercato_parties for insert with check (host = auth.uid() and is_member());
-- Modification : les deux joueurs de la partie, ou un membre qui rejoint un salon encore libre (il devient l'invité).
drop policy if exists mp_upd on public.mercato_parties;
create policy mp_upd on public.mercato_parties for update
  using (is_member() and (auth.uid() in (host, guest) or (guest is null and status = 'lobby')))
  with check (auth.uid() in (host, guest) and guest is distinct from host);
-- Suppression : l'hôte, tant que personne n'a rejoint.
drop policy if exists mp_del on public.mercato_parties;
create policy mp_del on public.mercato_parties for delete using (host = auth.uid() and guest is null);

create or replace function public.mercato_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists mercato_touch on public.mercato_parties;
create trigger mercato_touch before update on public.mercato_parties for each row execute function public.mercato_touch();
-- Le jeu en direct passe par les canaux « broadcast » de Supabase Realtime (aucune autre table nécessaire).
