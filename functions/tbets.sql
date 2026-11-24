-- Paris du tournoi : jetons virtuels (pas de KI), mise définitive une fois validée.
create table if not exists public.tbets(
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tour bigint not null,
  k int not null,
  i int not null,
  pick int not null,
  stake int not null check (stake between 10 and 1000000),
  created_at timestamptz not null default now(),
  unique (user_id, tour, k, i)
);
alter table public.tbets enable row level security;
drop policy if exists tb_read on public.tbets;
create policy tb_read on public.tbets for select using (is_member());
drop policy if exists tb_ins on public.tbets;
create policy tb_ins on public.tbets for insert with check (user_id = auth.uid() and is_member());
-- aucune politique update/delete : une mise ne peut être ni modifiée ni effacée
revoke update, delete on public.tbets from anon, authenticated;

-- Solde d'un joueur pour un tournoi : 1000 - mises + gains (pari mutuel par duel)
create or replace function public.tb_balance(uid uuid, tr bigint) returns bigint
language plpgsql stable security definer set search_path = public as $$
declare br jsonb; b record; m jsonb; w text; tot bigint; win bigint; bal bigint := 1000;
begin
  select data into br from content where key = 'tournoi_bracket';
  for b in select * from tbets where user_id = uid and tour = tr loop
    bal := bal - b.stake;
    if br is null or (br->>'at')::bigint <> tr then bal := bal + b.stake; continue; end if;
    m := br->'rounds'->b.k->b.i;
    if m is null or (m->>'a') is null or (m->>'b') is null or b.pick not in ((m->>'a')::int, (m->>'b')::int) then
      bal := bal + b.stake; continue; -- duel modifié : mise rendue
    end if;
    w := m->>'w';
    if w is null then continue; end if;
    if b.pick = w::int then
      select coalesce(sum(stake),0), coalesce(sum(stake) filter (where pick = w::int),0) into tot, win
        from tbets where tour = tr and k = b.k and i = b.i;
      bal := bal + floor(b.stake::numeric * tot / greatest(win,1));
    end if;
  end loop;
  return bal;
end $$;
grant execute on function public.tb_balance(uuid, bigint) to authenticated;

create or replace function public.tb_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare br jsonb; m jsonb; me text; pa text; pb text;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  select data into br from content where key = 'tournoi_bracket';
  if br is null or (br->>'at')::bigint <> new.tour then raise exception 'Ce tournoi n''est plus en cours.'; end if;
  m := br->'rounds'->new.k->new.i;
  if m is null or (m->>'a') is null or (m->>'b') is null then raise exception 'Les deux joueurs de ce duel ne sont pas encore connus.'; end if;
  if (m->>'w') is not null then raise exception 'Ce duel est déjà terminé.'; end if;
  if coalesce(br->'lock', '[]'::jsonb) ? (new.k || ':' || new.i) then raise exception 'Les paris sont fermés pour ce duel.'; end if;
  if new.pick not in ((m->>'a')::int, (m->>'b')::int) then raise exception 'Choix invalide.'; end if;
  select lower(discord) into me from profiles where id = auth.uid();
  pa := lower(br->'players'->((m->>'a')::int)->>'name'); pb := lower(br->'players'->((m->>'b')::int)->>'name');
  if me is not null and (ltrim(me,'@') = ltrim(pa,'@') or ltrim(me,'@') = ltrim(pb,'@')) then
    raise exception 'Tu ne peux pas parier sur ton propre duel.';
  end if;
  if new.stake > tb_balance(auth.uid(), new.tour) then raise exception 'Pas assez de jetons.'; end if;
  return new;
end $$;
drop trigger if exists tb_check on public.tbets;
create trigger tb_check before insert on public.tbets for each row execute function public.tb_check();

-- Classement des parieurs (pseudo + solde), visible des membres
create or replace function public.tb_board(tr bigint) returns table(discord text, bal bigint, n int)
language sql stable security definer set search_path = public as $$
  select p.discord, tb_balance(b.user_id, tr), count(*)::int
  from tbets b join profiles p on p.id = b.user_id
  where b.tour = tr and is_member()
  group by b.user_id, p.discord order by 2 desc;
$$;
grant execute on function public.tb_board(bigint) to authenticated;
