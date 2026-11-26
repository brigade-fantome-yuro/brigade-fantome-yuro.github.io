-- Arène : tours joués en Mercato YURO (règle unique, demandée par Nicolas le 26/11).
-- rules.mercato = 'all' (tout le tournoi) | 'r0' (premier tour) | 'qf' (quarts) | 'sf' (demi-finales) | 'f' (finale).
-- Pendant un tour Mercato : pas de ban, pas de choix d'équipe, pas de règle tirée. Le serveur crée la partie de Mercato
-- des deux joueurs ; le vainqueur du Mercato (2 combats en 3 contre 3, mort subite à 1-1) gagne le match.

alter table public.mercato_parties add column if not exists arena_mid bigint unique references public.arena_match(id) on delete set null;

create or replace function arena_is_mercato(t arena_tourn, rnd int) returns boolean language sql stable as $$
  select case coalesce(t.rules->>'mercato', '')
    when 'all' then true
    when 'r0' then rnd = 0
    when 'qf' then rnd = t.rounds - 3
    when 'sf' then rnd = t.rounds - 2
    when 'f' then rnd = t.rounds - 1
    else false end $$;

-- Crée (ou recrée) la partie de Mercato du match et met le match en statut « mercato ».
create or replace function arena_mercato_open(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; c text; k int := 0; A text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
begin
  select * into m from arena_match where id = mid for update;
  delete from mercato_parties where arena_mid = mid;
  loop
    select string_agg(substr(A, 1 + floor(random() * 24)::int, 1), '') into c from generate_series(1, 4);
    begin
      insert into mercato_parties (code, host, guest, host_name, guest_name, status, arena_mid)
      values (c, m.p1, m.p2, coalesce((select discord from profiles where id = m.p1), 'Joueur 1'), coalesce((select discord from profiles where id = m.p2), 'Joueur 2'), 'playing', mid);
      exit;
    exception when unique_violation then
      k := k + 1; if k > 30 then raise; end if;
    end;
  end loop;
  update arena_match set status = 'mercato', note = null, ready = '{f,f}', moves = '[]', turn_side = null, updated_at = now() where id = mid;
end $$;

-- Ouverture d'une salle : comme avant, sauf qu'un tour Mercato crée la partie de Mercato au lieu du ban.
create or replace function arena_open(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; busy int; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update;
  if m.p1 is null or m.p2 is null or m.status not in ('wait', 'queue') then return; end if;
  select count(*) into busy from arena_match where tourn_id = m.tourn_id and status in ('ban', 'pick', 'live', 'dispute', 'mercato');
  if busy >= 8 then update arena_match set status = 'queue', updated_at = now() where id = mid; return; end if;
  select * into t from arena_tourn where id = m.tourn_id;
  if arena_is_mercato(t, m.round) then perform arena_mercato_open(mid); return; end if;
  perform arena_draw_round(m.tourn_id, m.round);
  perform arena_new_game(mid);
end $$;

-- Fin du Mercato : n'importe quel écran peut le signaler, le serveur lit le vainqueur enregistré dans la partie.
create or replace function arena_mercato_done(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; p mercato_parties;
begin
  if not is_member() then return; end if;
  select * into m from arena_match where id = mid for update;
  if m is null or m.status <> 'mercato' then return; end if;
  select * into p from mercato_parties where arena_mid = mid;
  if p is null or p.status <> 'over' or p.winner is null or p.winner not in (m.p1, m.p2) then return; end if;
  perform arena_finish(mid, case when p.winner = m.p1 then 0 else 1 end, 'mercato');
end $$;

-- Arbitre : « faire rejouer » un match de tour Mercato relance une partie de Mercato neuve.
create or replace function arena_ref_decide(mid bigint, win_side int, replay boolean) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; t arena_tourn;
begin
  select * into m from arena_match where id = mid for update; select * into t from arena_tourn where id = m.tourn_id;
  if not (is_admin() or auth.uid() = any(t.referees)) then raise exception 'Réservé aux arbitres.'; end if;
  if replay and arena_is_mercato(t, m.round) then perform arena_mercato_open(mid);
  elsif replay then perform arena_new_game(mid);
  else perform arena_finish(mid, win_side, 'Décision de l’arbitre.'); end if;
end $$;

revoke execute on function arena_mercato_open(bigint), arena_is_mercato(arena_tourn, int) from public, anon, authenticated;
grant execute on function arena_mercato_done(bigint) to authenticated;
