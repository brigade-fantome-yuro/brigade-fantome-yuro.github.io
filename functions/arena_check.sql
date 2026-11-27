-- Validation des équipes par l'arbitre (Nicolas 27/11) :
-- choix des équipes → les deux joueurs prêts (ou délai écoulé) → statut « check » : l'arbitre voit les deux équipes
-- et clique « Valider les équipes » → le combat commence.

-- Les équipes restent secrètes pour les joueurs et les spectateurs tant que le combat n'a pas commencé.
drop policy if exists ap_read on arena_pick; create policy ap_read on arena_pick for select using (
  is_admin()
  or exists (select 1 from arena_match m join arena_tourn t on t.id = m.tourn_id where m.id = match_id
             and ((side = 0 and m.p1 = auth.uid()) or (side = 1 and m.p2 = auth.uid()) or auth.uid() = any(t.referees) or m.status not in ('pick', 'check'))));

-- Lancement du combat (appelé seulement après la validation de l'arbitre).
create or replace function arena_go(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; st int;
begin
  select * into m from arena_match where id = mid for update;
  if m.status <> 'check' then return; end if;
  if m.game = 1 then st := floor(random() * 2)::int; elsif m.game = 2 then st := 1 - m.first_starter; else st := floor(random() * 2)::int; end if;
  update arena_match set status = 'live', starter = st, first_starter = coalesce(m.first_starter, st),
    seed = floor(random() * 2000000000)::int, moves = '[]', turn_side = st, last_at = now(), note = null, ref_ok = true, updated_at = now() where id = mid;
end $$;

-- Fin du choix : équipes vérifiées puis figées, en attente de l'arbitre.
create or replace function arena_lock(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn; a jsonb; b jsonb; ea text; eb text;
begin
  select * into m from arena_match where id = mid for update;
  if m.status <> 'pick' then return; end if;
  if not ((m.ready[1] and m.ready[2]) or now() >= m.pick_until) then return; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  select team into a from arena_pick where match_id = mid and side = 0;
  select team into b from arena_pick where match_id = mid and side = 1;
  ea := arena_check_team(t, coalesce(a, '[]'), m.banned, m.round, m.p1); eb := arena_check_team(t, coalesce(b, '[]'), m.banned, m.round, m.p2);
  if ea is not null and eb is not null then
    update arena_match set status = 'dispute', note = 'Aucune équipe valable à la fin du temps de choix.', updated_at = now() where id = mid; return;
  elsif ea is not null or eb is not null then
    perform arena_finish(mid, case when ea is not null then 1 else 0 end, 'Équipe incomplète ou non valable à la fin du temps de choix.'); return;
  end if;
  update arena_match set status = 'check', team1 = a, team2 = b, ref_ok = false,
    note = 'Équipes choisies : en attente de la validation de l’arbitre.', updated_at = now() where id = mid;
end $$;

-- Bouton de l'arbitre : « Valider les équipes » lance le combat ; « Renvoyer au choix » rouvre 3 minutes de choix.
create or replace function arena_ref_ok(mid bigint, ok boolean) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update; select * into t from arena_tourn where id = m.tourn_id;
  if not (is_admin() or auth.uid() = any(t.referees)) then raise exception 'Réservé aux arbitres.'; end if;
  if m.status = 'check' then
    if ok then perform arena_go(mid);
    else update arena_match set status = 'pick', pick_until = now() + interval '3 minutes', ready = '{f,f}', ref_ok = false,
      note = 'L’arbitre a renvoyé les équipes : refais ton choix.', updated_at = now() where id = mid; end if;
    return;
  end if;
  update arena_match set ref_ok = ok, updated_at = now() where id = mid;
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

create or replace function arena_open(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; busy int; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update;
  if m.p1 is null or m.p2 is null or m.status not in ('wait', 'queue') then return; end if;
  select count(*) into busy from arena_match where tourn_id = m.tourn_id and status in ('ban', 'pick', 'check', 'live', 'dispute', 'mercato');
  if busy >= 8 then update arena_match set status = 'queue', updated_at = now() where id = mid; return; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  if arena_is_mercato(t, m.round) then perform arena_mercato_open(mid); return; end if;
  perform arena_draw_round(m.tourn_id, m.round);
  perform arena_new_game(mid);
end $$;

revoke execute on function arena_go(bigint) from public, anon, authenticated;
grant execute on function arena_ref_ok(bigint, boolean), arena_afk(bigint) to authenticated;
