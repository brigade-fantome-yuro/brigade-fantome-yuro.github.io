-- Règles de l'arène : règles du tournoi entier (fixed) + règle(s) tirée(s) au sort à chaque tour (même règle pour tous les matchs du tour).
alter table arena_tourn add column if not exists round_rules jsonb not null default '{}';

insert into content (key, data) values ('arena_tags', '{"villain":[105,117,122,156,175,190,256,308,340,363,474,499,972,973,1070,1071,1083,3239,3241,3243,3247,3248]}')
  on conflict (key) do update set data = excluded.data;

-- Cartes du tournoi (UR + LR, sans TRS) avec rôle, univers, rang de la tier list, points du budget et étiquette « méchant ».
create or replace function arena_cards() returns table(id int, n text, role text, anime text, tier text, pts int, vil boolean)
language sql stable security definer set search_path = public as $$
  with c as (select e from content, jsonb_array_elements(data) e where key = 'cards' and coalesce(e->>'r', '') <> 'Transcendant'),
  t as (select (x->>0)::int tid, x->>2 tier from content, jsonb_array_elements(data->'tiers') x where key = 'ranked_meta'),
  v as (select (x #>> '{}')::int vid from content, jsonb_array_elements(data->'villain') x where key = 'arena_tags')
  select (e->>'id')::int, e->>'n', coalesce(e->>'c', ''), e->>'a', t.tier,
         case t.tier when 'S' then 5 when 'A' then 4 when 'B' then 3 else 2 end, v.vid is not null
  from c left join t on t.tid = (e->>'id')::int left join v on v.vid = (e->>'id')::int $$;

-- Règles actives d'un match : celles du tournoi + celles du tour.
create or replace function arena_active(t arena_tourn, rnd int) returns jsonb language sql stable as $$
  select coalesce(t.rules->'fixed', '[]') || coalesce(t.round_rules->(rnd::text), '[]') $$;

create or replace function arena_has(r jsonb, rid text) returns boolean language sql immutable as $$
  select exists (select 1 from jsonb_array_elements(r) x where x->>'id' = rid) $$;

-- Existe-t-il au moins une équipe possible avec ces règles ? (pour ne jamais tirer une combinaison impossible)
create or replace function arena_feasible(r jsonb, bancat jsonb default '[]', bancard jsonb default '[]') returns boolean
language plpgsql stable security definer set search_path = public as $$
declare imp int; ok boolean;
begin
  select (x->>'card')::int into imp from jsonb_array_elements(r) x where x->>'id' = 'imposed' limit 1;
  with cc as (
    select * from arena_cards() c
    where not exists (select 1 from jsonb_array_elements(coalesce(bancard, '[]')) b where b #>> '{}' = c.id::text)
      and not (coalesce(bancat, '[]') ? c.role)
      and not (arena_has(r, 'nohealer') and c.role = 'healer')
      and not (arena_has(r, 'nostunner') and c.role = 'stunner')
      and not (arena_has(r, 'noS') and c.tier = 'S')
      and not (arena_has(r, 'villains') and not c.vil))
  select exists (
    select 1 from cc a join cc b on a.id < b.id join cc d on b.id < d.id
    where (a.role = '' or (a.role <> b.role and a.role <> d.role)) and (b.role = '' or b.role <> d.role)
      and (not arena_has(r, 'univers') or (a.anime = b.anime and b.anime = d.anime))
      and (not arena_has(r, 'healer1') or 'healer' in (a.role, b.role, d.role))
      and (not arena_has(r, 'budget') or a.pts + b.pts + d.pts <= 10)
      and (imp is null or imp in (a.id, b.id, d.id))) into ok;
  return ok;
end $$;

-- Contrôle d'une équipe : règles du tournoi, règles du tour, bans de la manche, compo du tour précédent.
create or replace function arena_check_team(t arena_tourn, team jsonb, banned jsonb default '[]', rnd int default 0, player uuid default null) returns text
language plpgsql stable security definer set search_path = public as $$
declare ids int[]; r jsonb; c record; roles text[] := '{}'; animes text[] := '{}'; pts int := 0; healer boolean := false; imp int; prev jsonb; i int;
begin
  if jsonb_typeof(team) <> 'array' or jsonb_array_length(team) <> 3 then return 'Il faut 3 cartes.'; end if;
  select array_agg(x::int) into ids from jsonb_array_elements_text(team) x;
  if (select count(distinct v) from unnest(ids) v) <> 3 then return 'Trois cartes différentes.'; end if;
  r := arena_active(t, rnd);
  foreach i in array ids loop
    select * into c from arena_cards() a where a.id = i;
    if c.id is null then return 'Carte hors tournoi.'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(t.rules->'bancard', '[]')) b where b #>> '{}' = i::text) then return c.n || ' est interdit dans ce tournoi.'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(banned, '[]')) b where b #>> '{}' = i::text) then return c.n || ' est banni pour cette manche.'; end if;
    if c.role <> '' then
      if coalesce(t.rules->'bancat', '[]') ? c.role then return 'Rôle ' || c.role || ' interdit dans ce tournoi.'; end if;
      if c.role = any(roles) then return 'Une seule carte par rôle.'; end if;
      roles := roles || c.role;
    end if;
    if arena_has(r, 'nohealer') and c.role = 'healer' then return 'Règle : healer interdit.'; end if;
    if arena_has(r, 'nostunner') and c.role = 'stunner' then return 'Règle : stunner interdit.'; end if;
    if arena_has(r, 'noS') and c.tier = 'S' then return 'Règle : ' || c.n || ' est du rang S.'; end if;
    if arena_has(r, 'villains') and not c.vil then return 'Règle : ' || c.n || ' n’est pas un méchant.'; end if;
    if c.role = 'healer' then healer := true; end if;
    animes := animes || c.anime; pts := pts + c.pts;
  end loop;
  if arena_has(r, 'univers') and (select count(distinct a) from unnest(animes) a) > 1 then return 'Règle : les 3 cartes doivent venir du même univers.'; end if;
  if arena_has(r, 'healer1') and not healer then return 'Règle : 1 healer obligatoire.'; end if;
  if arena_has(r, 'budget') and pts > 10 then return 'Règle : budget dépassé (' || pts || ' points sur 10).'; end if;
  select (x->>'card')::int into imp from jsonb_array_elements(r) x where x->>'id' = 'imposed' limit 1;
  if imp is not null and not (imp = any(ids)) then return 'Règle : la carte imposée doit être dans l’équipe.'; end if;
  if arena_has(r, 'nosame') and player is not null and rnd > 0 then
    select case when m.p1 = player then m.team1 else m.team2 end into prev from arena_match m
      where m.tourn_id = t.id and m.round = rnd - 1 and (m.p1 = player or m.p2 = player) and m.team1 is not null limit 1;
    if prev is not null and (select array_agg(x::int order by x::int) from jsonb_array_elements_text(prev) x) = (select array_agg(v order by v) from unnest(ids) v) then
      return 'Règle : interdit de reprendre ta compo du tour précédent.'; end if;
  end if;
  return null;
end $$;

-- Tirage des règles d'un tour (une seule fois, au début du tour). Familles différentes, jamais une règle déjà fixée, toujours jouable.
create or replace function arena_draw_round(tid bigint, rnd int) returns void language plpgsql security definer set search_path = public as $$
declare t arena_tourn; k int; fixed jsonb; pool text[][] := array[['nohealer','Rôles'],['nostunner','Rôles'],['healer1','Rôles'],['noS','Rang'],['budget','Draft'],['imposed','Draft'],['nosame','Format'],['villains','Fun']];
  fams text[]; draw jsonb; used text[]; tries int := 0; j int; ord int[]; card int;
begin
  select * into t from arena_tourn where id = tid for update;
  k := coalesce((t.rules->>'per_round')::int, 0);
  if k <= 0 or t.round_rules ? rnd::text then return; end if;
  fixed := coalesce(t.rules->'fixed', '[]');
  fams := '{}';
  for j in 1 .. array_length(pool, 1) loop if arena_has(fixed, pool[j][1]) then fams := fams || pool[j][2]; end if; end loop;
  while tries < 80 loop
    tries := tries + 1; draw := '[]'; used := fams;
    select array_agg(g order by random()) into ord from generate_subscripts(pool, 1) g;
    foreach j in array ord loop
      exit when jsonb_array_length(draw) >= k;
      if pool[j][2] = any(used) or arena_has(fixed, pool[j][1]) then continue; end if;
      if pool[j][1] = 'nosame' and rnd = 0 then continue; end if;
      if pool[j][1] = 'imposed' then
        select a.id into card from arena_cards() a order by random() limit 1;
        draw := draw || jsonb_build_array(jsonb_build_object('id', 'imposed', 'card', card));
      else draw := draw || jsonb_build_array(jsonb_build_object('id', pool[j][1])); end if;
      used := used || pool[j][2];
    end loop;
    if jsonb_array_length(draw) > 0 and arena_feasible(fixed || draw, t.rules->'bancat', t.rules->'bancard') then
      update arena_tourn set round_rules = round_rules || jsonb_build_object(rnd::text, draw) where id = tid; return;
    end if;
  end loop;
  update arena_tourn set round_rules = round_rules || jsonb_build_object(rnd::text, '[]'::jsonb) where id = tid;
end $$;

create or replace function arena_open(mid bigint) returns void language plpgsql security definer set search_path = public as $$
declare m arena_match; busy int;
begin
  select * into m from arena_match where id = mid for update;
  if m.p1 is null or m.p2 is null or m.status not in ('wait', 'queue') then return; end if;
  select count(*) into busy from arena_match where tourn_id = m.tourn_id and status in ('ban', 'pick', 'live', 'dispute');
  if busy >= 8 then update arena_match set status = 'queue', updated_at = now() where id = mid; return; end if;
  perform arena_draw_round(m.tourn_id, m.round);
  perform arena_new_game(mid);
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
    err := arena_check_team(t, coalesce(tm, '[]'), m.banned, m.round, case when s = 0 then m.p1 else m.p2 end); if err is not null then raise exception '%', err; end if;
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
  ea := arena_check_team(t, coalesce(a, '[]'), m.banned, m.round, m.p1); eb := arena_check_team(t, coalesce(b, '[]'), m.banned, m.round, m.p2);
  if ea is not null and eb is not null then
    update arena_match set status = 'dispute', note = 'Aucune équipe valable à la fin du temps de choix.', updated_at = now() where id = mid; return;
  elsif ea is not null or eb is not null then
    perform arena_finish(mid, case when ea is not null then 1 else 0 end, 'Équipe incomplète ou non valable à la fin du temps de choix.'); return;
  end if;
  if coalesce(t.rules->>'budget', '') <> '' and not m.ref_ok then
    if now() >= m.pick_until then update arena_match set note = 'En attente de la validation de l’arbitre.', updated_at = now() where id = mid; end if;
    return;
  end if;
  if m.game = 1 then st := floor(random() * 2)::int; elsif m.game = 2 then st := 1 - m.first_starter; else st := floor(random() * 2)::int; end if;
  update arena_match set status = 'live', team1 = a, team2 = b, starter = st, first_starter = coalesce(m.first_starter, st),
    seed = floor(random() * 2000000000)::int, moves = '[]', turn_side = st, last_at = now(), note = null, updated_at = now() where id = mid;
end $$;

drop function if exists arena_check_team(arena_tourn, jsonb, jsonb);
grant execute on function arena_feasible(jsonb, jsonb, jsonb) to authenticated;
revoke execute on function arena_draw_round(bigint, int), arena_check_team(arena_tourn, jsonb, jsonb, int, uuid) from public, anon, authenticated;
