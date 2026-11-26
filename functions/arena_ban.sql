-- Bans : avant chaque manche, chaque joueur bannit 1 carte (choix secret, 30 s). Les cartes bannies sont interdites aux deux joueurs pour cette manche.
alter table arena_match add column if not exists ban_until timestamptz;
alter table arena_match add column if not exists banned jsonb not null default '[]';
alter table arena_pick add column if not exists ban int;

create or replace function arena_check_team(t arena_tourn, team jsonb, banned jsonb default '[]') returns text language plpgsql stable security definer set search_path = public as $$
declare cards jsonb; ids int[]; c jsonb; cats text[] := '{}'; i int;
begin
  select data into cards from content where key = 'cards';
  if jsonb_typeof(team) <> 'array' or jsonb_array_length(team) <> 3 then return 'Il faut 3 cartes.'; end if;
  select array_agg(x::int) into ids from jsonb_array_elements_text(team) x;
  if (select count(distinct v) from unnest(ids) v) <> 3 then return 'Trois cartes différentes.'; end if;
  foreach i in array ids loop
    select e into c from jsonb_array_elements(cards) e where (e->>'id')::int = i;
    if c is null or coalesce(c->>'r', '') = 'Transcendant' then return 'Carte hors tournoi.'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(t.rules->'bancard', '[]')) b where b::text = i::text or b #>> '{}' = i::text) then return (c->>'n') || ' est interdit dans ce tournoi.'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(banned, '[]')) b where b::text = i::text) then return (c->>'n') || ' est banni pour cette manche.'; end if;
    if coalesce(c->>'c', '') <> '' then
      if (t.rules->'bancat') ? (c->>'c') then return 'Rôle ' || (c->>'c') || ' interdit dans ce tournoi.'; end if;
      if (c->>'c') = any(cats) then return 'Une seule carte par rôle.'; end if;
      cats := cats || (c->>'c');
    end if;
  end loop;
  return null;
end $$;

-- Ouverture d'une salle : phase de ban d'abord.
create or replace function arena_open(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; busy int;
begin
  select * into m from arena_match where id = mid for update;
  if m.p1 is null or m.p2 is null or m.status not in ('wait', 'queue') then return; end if;
  select count(*) into busy from arena_match where tourn_id = m.tourn_id and status in ('ban', 'pick', 'live', 'dispute');
  if busy >= 8 then update arena_match set status = 'queue', updated_at = now() where id = mid; return; end if;
  perform arena_new_game(mid);
end $$;

create or replace function arena_new_game(mid bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  update arena_pick set ban = null where match_id = mid;
  update arena_match set status = 'ban', ban_until = now() + interval '30 seconds', banned = '[]', pick_until = null, ready = '{f,f}', ref_ok = false,
    moves = '[]', turn_side = null, note = null, updated_at = now() where id = mid;
end $$;

create or replace function arena_set_ban(mid bigint, card int) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn; s int; cards jsonb; c jsonb;
begin
  select * into m from arena_match where id = mid for update;
  s := arena_side(m); if s is null then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status <> 'ban' then raise exception 'La phase de ban est terminée.'; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  select data into cards from content where key = 'cards';
  select e into c from jsonb_array_elements(cards) e where (e->>'id')::int = card;
  if c is null or coalesce(c->>'r', '') = 'Transcendant' then raise exception 'Carte hors tournoi.'; end if;
  insert into arena_pick (match_id, side, ban, updated_at) values (mid, s, card, now())
    on conflict (match_id, side) do update set ban = excluded.ban, updated_at = now();
  update arena_match set ready[s + 1] = true, updated_at = now() where id = mid;
  perform arena_ban_lock(mid);
end $$;

-- Fin de la phase de ban : les deux ont banni, ou les 30 s sont écoulées (pas de ban pour celui qui n'a rien choisi).
create or replace function arena_ban_lock(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; bn jsonb;
begin
  select * into m from arena_match where id = mid for update;
  if m.status <> 'ban' then return; end if;
  if not ((m.ready[1] and m.ready[2]) or now() >= m.ban_until) then return; end if;
  select coalesce(jsonb_agg(distinct ban), '[]') into bn from arena_pick where match_id = mid and ban is not null;
  update arena_match set status = 'pick', banned = bn, pick_until = now() + interval '3 minutes', ready = '{f,f}', updated_at = now() where id = mid;
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
    err := arena_check_team(t, coalesce(tm, '[]'), m.banned); if err is not null then raise exception '%', err; end if;
  end if;
  update arena_match set ready[s + 1] = on_, updated_at = now() where id = mid;
  perform arena_lock(mid);
end $$;

create or replace function arena_lock(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn; a jsonb; b jsonb; ea text; eb text; st int;
begin
  select * into m from arena_match where id = mid for update;
  if m.status <> 'pick' then return; end if;
  if not ((m.ready[1] and m.ready[2]) or now() >= m.pick_until) then return; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  select team into a from arena_pick where match_id = mid and side = 0;
  select team into b from arena_pick where match_id = mid and side = 1;
  ea := arena_check_team(t, coalesce(a, '[]'), m.banned); eb := arena_check_team(t, coalesce(b, '[]'), m.banned);
  if ea is not null and eb is not null then
    update arena_match set status = 'dispute', note = 'Aucune équipe valable à la fin du temps de choix.', updated_at = now() where id = mid; return;
  elsif ea is not null or eb is not null then
    perform arena_finish(mid, case when ea is not null then 1 else 0 end, 'Équipe incomplète ou non valable à la fin du temps de choix.'); return;
  end if;
  if coalesce(t.rules->>'budget', '') <> '' and not m.ref_ok then
    if now() >= m.pick_until then update arena_match set note = 'En attente de la validation de l’arbitre (budget).', updated_at = now() where id = mid; end if;
    return;
  end if;
  if m.game = 1 then st := floor(random() * 2)::int; elsif m.game = 2 then st := 1 - m.first_starter; else st := floor(random() * 2)::int; end if;
  update arena_match set status = 'live', team1 = a, team2 = b, starter = st, first_starter = coalesce(m.first_starter, st),
    seed = floor(random() * 2000000000)::int, moves = '[]', turn_side = st, last_at = now(), note = null, updated_at = now() where id = mid;
end $$;

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
  w := m.wins; if res in (0, 1) then w[res + 1] := w[res + 1] + 1; end if;
  need := case when m.bo = 3 then 2 else 1 end;
  update arena_match set wins = w, history = history || jsonb_build_array(jsonb_build_object('game', m.game, 'starter', m.starter, 'seed', m.seed, 'team1', m.team1, 'team2', m.team2, 'banned', m.banned, 'moves', m.moves || jsonb_build_array(mv || jsonb_build_object('s', s)), 'winner', res)) where id = mid;
  if w[1] >= need or w[2] >= need then
    perform arena_finish(mid, case when w[1] >= need then 0 else 1 end, null);
  elsif res = -1 then
    update arena_match set moves = '[]', seed = floor(random() * 2000000000)::int, turn_side = m.starter, last_at = now() where id = mid;
  else
    update arena_match set game = m.game + 1 where id = mid;
    perform arena_new_game(mid);
  end if;
end $$;

create or replace function arena_afk(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; s int;
begin
  select * into m from arena_match where id = mid for update;
  s := arena_side(m);
  if s is null and not is_admin() then raise exception 'Tu ne joues pas ce match.'; end if;
  if m.status = 'ban' then perform arena_ban_lock(mid); return; end if;
  if m.status = 'pick' then perform arena_lock(mid); return; end if;
  if m.status <> 'live' or m.last_at > now() - interval '60 seconds' then return; end if;
  perform arena_finish(mid, 1 - m.turn_side, 'Forfait : 60 s sans jouer.');
end $$;

create or replace function arena_ref_decide(mid bigint, win_side int, replay boolean) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update; select * into t from arena_tourn where id = m.tourn_id;
  if not (is_admin() or auth.uid() = any(t.referees)) then raise exception 'Réservé aux arbitres.'; end if;
  if replay then perform arena_new_game(mid); else perform arena_finish(mid, win_side, 'Décision de l’arbitre.'); end if;
end $$;

drop function if exists arena_check_team(arena_tourn, jsonb);
grant execute on function arena_set_ban(bigint, int), arena_ready(bigint, boolean), arena_move(bigint, int, jsonb, int, int), arena_afk(bigint), arena_ref_decide(bigint, int, boolean) to authenticated;
revoke execute on function arena_new_game(bigint), arena_ban_lock(bigint), arena_check_team(arena_tourn, jsonb, jsonb) from public, anon, authenticated;
