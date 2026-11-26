-- Arène de tournoi : combats en direct sur le site avec le moteur de combat de la Brigade.
-- Tout le monde a les mêmes cartes (UR + LR, sans EX ni TRS), au même niveau d'étoiles (0 ou 5, choisi par l'admin).

create table if not exists arena_tourn (
  id bigserial primary key,
  name text not null,
  stars int not null default 5 check (stars in (0, 5)),
  rules jsonb not null default '{}',          -- {bancat:[...], bancard:[ids], budget:"texte pour les arbitres"}
  referees uuid[] not null default '{}',
  players uuid[] not null default '{}',
  status text not null default 'draft',       -- draft | live | done
  rounds int,
  winner uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists arena_match (
  id bigserial primary key,
  tourn_id bigint not null references arena_tourn(id) on delete cascade,
  round int not null, slot int not null, bo int not null default 1,
  p1 uuid, p2 uuid,
  status text not null default 'wait',        -- wait | queue | pick | live | dispute | done
  game int not null default 1,
  wins int[] not null default '{0,0}',
  pick_until timestamptz,
  ready boolean[] not null default '{f,f}',
  ref_ok boolean not null default false,
  team1 jsonb, team2 jsonb,                   -- ids des 3 cartes, révélés au début de la manche
  starter int, first_starter int, seed int,
  moves jsonb not null default '[]',
  turn_side int,
  last_at timestamptz,
  history jsonb not null default '[]',
  winner uuid,
  note text,
  updated_at timestamptz default now(),
  unique (tourn_id, round, slot)
);

-- Équipe en cours de choix : visible seulement par son joueur, les arbitres et les admins tant que la manche n'a pas commencé.
create table if not exists arena_pick (
  match_id bigint not null references arena_match(id) on delete cascade,
  side int not null check (side in (0, 1)),
  team jsonb not null default '[]',
  updated_at timestamptz default now(),
  primary key (match_id, side)
);

alter table arena_tourn enable row level security;
alter table arena_match enable row level security;
alter table arena_pick enable row level security;

drop policy if exists at_read on arena_tourn; create policy at_read on arena_tourn for select using (is_member());
drop policy if exists am_read on arena_match; create policy am_read on arena_match for select using (is_member());
drop policy if exists ap_read on arena_pick; create policy ap_read on arena_pick for select using (
  is_admin()
  or exists (select 1 from arena_match m join arena_tourn t on t.id = m.tourn_id where m.id = match_id
             and ((side = 0 and m.p1 = auth.uid()) or (side = 1 and m.p2 = auth.uid()) or auth.uid() = any(t.referees) or m.status <> 'pick')));

-- Pas d'écriture directe : tout passe par les fonctions ci-dessous.

create or replace function arena_side(m arena_match) returns int language sql stable as $$
  select case when m.p1 = auth.uid() then 0 when m.p2 = auth.uid() then 1 else null end $$;

-- Une salle libre ? (8 combats au plus en même temps par tournoi)
create or replace function arena_open(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; busy int;
begin
  select * into m from arena_match where id = mid for update;
  if m.p1 is null or m.p2 is null or m.status not in ('wait', 'queue') then return; end if;
  select count(*) into busy from arena_match where tourn_id = m.tourn_id and status in ('pick', 'live', 'dispute');
  if busy >= 8 then update arena_match set status = 'queue', updated_at = now() where id = mid; return; end if;
  update arena_match set status = 'pick', pick_until = now() + interval '3 minutes', ready = '{f,f}', ref_ok = false, updated_at = now() where id = mid;
end $$;

-- Fait avancer le vainqueur dans le tableau et ouvre les salles en attente.
create or replace function arena_advance(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; nx bigint; q bigint; t arena_tourn;
begin
  select * into m from arena_match where id = mid;
  select * into t from arena_tourn where id = m.tourn_id;
  if m.round >= t.rounds - 1 then
    update arena_tourn set status = 'done', winner = m.winner where id = t.id;
  else
    if m.slot % 2 = 0 then update arena_match set p1 = m.winner, updated_at = now() where tourn_id = m.tourn_id and round = m.round + 1 and slot = m.slot / 2 returning id into nx;
    else update arena_match set p2 = m.winner, updated_at = now() where tourn_id = m.tourn_id and round = m.round + 1 and slot = m.slot / 2 returning id into nx; end if;
    perform arena_bye(nx);
    perform arena_open(nx);
  end if;
  for q in select id from arena_match where tourn_id = m.tourn_id and status = 'queue' order by round, slot loop perform arena_open(q); end loop;
end $$;

-- Exempt : un joueur seul dont l'adversaire ne viendra jamais (place vide du premier tour) passe directement.
create or replace function arena_bye(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; feed int;
begin
  select * into m from arena_match where id = mid;
  if m is null or m.status <> 'wait' then return; end if;
  if m.round = 0 then
    if (m.p1 is null) <> (m.p2 is null) then
      update arena_match set status = 'done', winner = coalesce(m.p1, m.p2), note = 'exempt', updated_at = now() where id = mid;
      perform arena_advance(mid);
    elsif m.p1 is null and m.p2 is null then
      update arena_match set status = 'done', note = 'vide', updated_at = now() where id = mid;
      perform arena_advance(mid);
    end if;
  else
    -- Un des deux matchs qui alimentent celui-ci n'a pas de vainqueur (deux places vides) : l'autre joueur passe.
    select count(*) into feed from arena_match where tourn_id = m.tourn_id and round = m.round - 1 and slot in (m.slot * 2, m.slot * 2 + 1) and status = 'done' and winner is null;
    if feed > 0 and (m.p1 is null) <> (m.p2 is null) then
      update arena_match set status = 'done', winner = coalesce(m.p1, m.p2), note = 'exempt', updated_at = now() where id = mid;
      perform arena_advance(mid);
    elsif feed = 2 then
      update arena_match set status = 'done', note = 'vide', updated_at = now() where id = mid;
      perform arena_advance(mid);
    end if;
  end if;
end $$;

-- Création (admin) : nom, étoiles, règles, arbitres, joueurs.
create or replace function arena_create(nm text, st int, rl jsonb, refs uuid[], pls uuid[]) returns bigint language plpgsql security definer set search_path = public as $$
declare tid bigint;
begin
  if not is_admin() then raise exception 'Réservé aux admins.'; end if;
  insert into arena_tourn (name, stars, rules, referees, players) values (nm, st, coalesce(rl, '{}'), coalesce(refs, '{}'), coalesce(pls, '{}')) returning id into tid;
  return tid;
end $$;

create or replace function arena_delete(tid bigint) returns void language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'Réservé aux admins.'; end if; delete from arena_tourn where id = tid; end $$;

-- Lancement (admin) : tableau tiré au sort, demi-finales et finale en BO3, tous les premiers matchs démarrent (8 salles au plus).
create or replace function arena_launch(tid bigint) returns void language plpgsql security definer set search_path = public as $$
declare t arena_tourn; n int; sz int := 2; nr int := 1; k int; j int; ps uuid[]; mid bigint;
begin
  if not is_admin() then raise exception 'Réservé aux admins.'; end if;
  select * into t from arena_tourn where id = tid for update;
  if t.status <> 'draft' then raise exception 'Tournoi déjà lancé.'; end if;
  n := coalesce(array_length(t.players, 1), 0);
  if n < 2 then raise exception 'Il faut au moins 2 joueurs.'; end if;
  while sz < n loop sz := sz * 2; nr := nr + 1; end loop;
  select array_agg(p order by random()) into ps from unnest(t.players) p;
  for k in 0 .. nr - 1 loop
    for j in 0 .. (sz / (2 ^ (k + 1)))::int - 1 loop
      insert into arena_match (tourn_id, round, slot, bo) values (tid, k, j, case when k >= nr - 2 then 3 else 1 end);
    end loop;
  end loop;
  -- Places vides réparties : un exempt par match au plus.
  for k in 0 .. sz / 2 - 1 loop
    update arena_match set p1 = case when k < n then ps[k + 1] end, p2 = case when sz / 2 + k < n then ps[sz / 2 + k + 1] end
      where tourn_id = tid and round = 0 and slot = k;
  end loop;
  update arena_tourn set status = 'live', rounds = nr where id = tid;
  for mid in select id from arena_match where tourn_id = tid and round = 0 order by slot loop perform arena_bye(mid); end loop;
  for mid in select id from arena_match where tourn_id = tid and status in ('wait', 'queue') and p1 is not null and p2 is not null order by round, slot loop perform arena_open(mid); end loop;
end $$;

-- Équipe en cours (3 cartes, 1 par rôle, cartes du tournoi uniquement, règles respectées).
create or replace function arena_check_team(t arena_tourn, team jsonb) returns text language plpgsql stable security definer set search_path = public as $$
declare cards jsonb; ids int[]; c jsonb; cats text[] := '{}'; i int;
begin
  select data into cards from content where key = 'cards';
  if jsonb_typeof(team) <> 'array' or jsonb_array_length(team) <> 3 then return 'Il faut 3 cartes.'; end if;
  select array_agg(x::int) into ids from jsonb_array_elements_text(team) x;
  if (select count(distinct v) from unnest(ids) v) <> 3 then return 'Trois cartes différentes.'; end if;
  foreach i in array ids loop
    select e into c from jsonb_array_elements(cards) e where (e->>'id')::int = i;
    if c is null or coalesce(c->>'r', '') = 'Transcendant' then return 'Carte hors tournoi.'; end if;
    if (t.rules->'bancard') ? i::text or exists (select 1 from jsonb_array_elements(coalesce(t.rules->'bancard', '[]')) b where b::text = i::text) then return c->>'n' || ' est interdit dans ce tournoi.'; end if;
    if coalesce(c->>'c', '') <> '' then
      if (t.rules->'bancat') ? (c->>'c') then return 'Rôle ' || (c->>'c') || ' interdit dans ce tournoi.'; end if;
      if (c->>'c') = any(cats) then return 'Une seule carte par rôle.'; end if;
      cats := cats || (c->>'c');
    end if;
  end loop;
  return null;
end $$;

create or replace function arena_set_pick(mid bigint, team jsonb) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn; s int; err text;
begin
  select * into m from arena_match where id = mid for update;
  s := arena_side(m); if s is null then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status <> 'pick' then raise exception 'Le choix des équipes est terminé.'; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  if jsonb_array_length(team) > 3 then raise exception 'Trois cartes au plus.'; end if;
  insert into arena_pick (match_id, side, team, updated_at) values (mid, s, team, now())
    on conflict (match_id, side) do update set team = excluded.team, updated_at = now();
  -- Changer d'équipe annule « Prêt ».
  if m.ready[s + 1] then update arena_match set ready[s + 1] = false, updated_at = now() where id = mid; end if;
end $$;

create or replace function arena_ready(mid bigint, on_ boolean) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn; s int; tm jsonb; err text;
begin
  select * into m from arena_match where id = mid for update;
  s := arena_side(m); if s is null then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status <> 'pick' then return; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  if on_ then
    select team into tm from arena_pick where match_id = mid and side = s;
    err := arena_check_team(t, coalesce(tm, '[]')); if err is not null then raise exception '%', err; end if;
  end if;
  update arena_match set ready[s + 1] = on_, updated_at = now() where id = mid;
  perform arena_lock(mid);
end $$;

-- Arbitre : valide les équipes (règle de budget) avant le début de la manche.
create or replace function arena_ref_ok(mid bigint, ok boolean) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update; select * into t from arena_tourn where id = m.tourn_id;
  if not (is_admin() or auth.uid() = any(t.referees)) then raise exception 'Réservé aux arbitres.'; end if;
  update arena_match set ref_ok = ok, updated_at = now() where id = mid;
  perform arena_lock(mid);
end $$;

-- Début de la manche : les deux joueurs sont prêts, ou les 3 minutes sont écoulées.
create or replace function arena_lock(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn; a jsonb; b jsonb; ea text; eb text; st int;
begin
  select * into m from arena_match where id = mid for update;
  if m.status <> 'pick' then return; end if;
  if not ((m.ready[1] and m.ready[2]) or now() >= m.pick_until) then return; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  select team into a from arena_pick where match_id = mid and side = 0;
  select team into b from arena_pick where match_id = mid and side = 1;
  ea := arena_check_team(t, coalesce(a, '[]')); eb := arena_check_team(t, coalesce(b, '[]'));
  if ea is not null and eb is not null then
    -- Aucune équipe valable : on attend l'arbitre.
    update arena_match set status = 'dispute', note = 'Aucune équipe valable à la fin du temps de choix.', updated_at = now() where id = mid; return;
  elsif ea is not null or eb is not null then
    perform arena_finish(mid, case when ea is not null then 1 else 0 end, 'Équipe incomplète ou non valable à la fin du temps de choix.'); return;
  end if;
  if coalesce(t.rules->>'budget', '') <> '' and not m.ref_ok then
    if now() >= m.pick_until then update arena_match set note = 'En attente de la validation de l’arbitre (budget).', updated_at = now() where id = mid; end if;
    return;
  end if;
  -- Qui commence : manche 1 au hasard, manche 2 l'autre joueur, manche 3 au hasard.
  if m.game = 1 then st := floor(random() * 2)::int; elsif m.game = 2 then st := 1 - m.first_starter; else st := floor(random() * 2)::int; end if;
  update arena_match set status = 'live', team1 = a, team2 = b, starter = st, first_starter = coalesce(m.first_starter, st),
    seed = floor(random() * 2000000000)::int, moves = '[]', turn_side = st, last_at = now(), note = null, updated_at = now() where id = mid;
end $$;

-- Fin du match (forfait ou victoire).
create or replace function arena_finish(mid bigint, win_side int, why text) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match;
begin
  select * into m from arena_match where id = mid for update;
  update arena_match set status = 'done', winner = case when win_side = 0 then m.p1 else m.p2 end, note = why, updated_at = now() where id = mid;
  perform arena_advance(mid);
end $$;

-- Un coup : seulement le joueur dont c'est le tour, dans l'ordre. Le moteur tourne sur l'écran de chaque joueur et de chaque spectateur :
-- l'adversaire recalcule chaque coup et signale tout écart (arena_dispute).
create or replace function arena_move(mid bigint, idx int, mv jsonb, nxt int, res int) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; s int; need int; w int[];
begin
  select * into m from arena_match where id = mid for update;
  s := arena_side(m); if s is null then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status <> 'live' then raise exception 'La manche n’est pas en cours.'; end if;
  if m.turn_side <> s then raise exception 'Ce n’est pas ton tour.'; end if;
  if jsonb_array_length(m.moves) <> idx then raise exception 'Coup hors séquence.'; end if;
  update arena_match set moves = moves || jsonb_build_array(mv || jsonb_build_object('s', s)), turn_side = nxt, last_at = now(), updated_at = now() where id = mid;
  if res is null then return; end if;
  -- Fin de manche.
  w := m.wins; if res in (0, 1) then w[res + 1] := w[res + 1] + 1; end if;
  need := case when m.bo = 3 then 2 else 1 end;
  update arena_match set wins = w, history = history || jsonb_build_array(jsonb_build_object('game', m.game, 'starter', m.starter, 'seed', m.seed, 'team1', m.team1, 'team2', m.team2, 'moves', m.moves || jsonb_build_array(mv || jsonb_build_object('s', s)), 'winner', res)) where id = mid;
  if w[1] >= need or w[2] >= need then
    perform arena_finish(mid, case when w[1] >= need then 0 else 1 end, null);
  elsif res = -1 then
    -- Égalité : la manche est rejouée avec les mêmes équipes.
    update arena_match set moves = '[]', seed = floor(random() * 2000000000)::int, turn_side = m.starter, last_at = now() where id = mid;
  else
    update arena_match set status = 'pick', game = m.game + 1, pick_until = now() + interval '3 minutes', ready = '{f,f}', ref_ok = false, moves = '[]', turn_side = null where id = mid;
  end if;
end $$;

-- Forfait : 60 s sans jouer pendant son tour.
create or replace function arena_afk(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; s int;
begin
  select * into m from arena_match where id = mid for update;
  s := arena_side(m);
  if s is null and not is_admin() then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status = 'pick' then perform arena_lock(mid); return; end if;
  if m.status <> 'live' or m.last_at > now() - interval '60 seconds' then return; end if;
  perform arena_finish(mid, 1 - m.turn_side, 'Forfait : 60 s sans jouer.');
end $$;

-- Écart de calcul signalé par un écran : la manche est suspendue, l'arbitre tranche.
create or replace function arena_dispute(mid bigint, why text) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match;
begin
  select * into m from arena_match where id = mid for update;
  if arena_side(m) is null then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status = 'live' then update arena_match set status = 'dispute', note = left(why, 300), updated_at = now() where id = mid; end if;
end $$;

-- Arbitre : donne la victoire, ou fait rejouer la manche.
create or replace function arena_ref_decide(mid bigint, win_side int, replay boolean) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update; select * into t from arena_tourn where id = m.tourn_id;
  if not (is_admin() or auth.uid() = any(t.referees)) then raise exception 'Réservé aux arbitres.'; end if;
  if replay then
    update arena_match set status = 'pick', pick_until = now() + interval '3 minutes', ready = '{f,f}', ref_ok = false, moves = '[]', turn_side = null, note = null, updated_at = now() where id = mid;
  else
    perform arena_finish(mid, win_side, 'Décision de l’arbitre.');
  end if;
end $$;

grant execute on function arena_create(text, int, jsonb, uuid[], uuid[]), arena_delete(bigint), arena_launch(bigint), arena_set_pick(bigint, jsonb),
  arena_ready(bigint, boolean), arena_ref_ok(bigint, boolean), arena_move(bigint, int, jsonb, int, int), arena_afk(bigint), arena_dispute(bigint, text),
  arena_ref_decide(bigint, int, boolean) to authenticated;
revoke execute on function arena_open(bigint), arena_advance(bigint), arena_bye(bigint), arena_lock(bigint), arena_finish(bigint, int, text) from public, anon, authenticated;
grant execute on function arena_lock(bigint) to authenticated;

do $$ begin
  begin alter publication supabase_realtime add table arena_match; exception when others then null; end;
  begin alter publication supabase_realtime add table arena_tourn; exception when others then null; end;
end $$;
