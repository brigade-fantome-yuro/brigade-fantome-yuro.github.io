// Niveaux Lurkr → rôle Nen sur le site. Lit le classement public de Lurkr pour le serveur de la Brigade,
// retrouve chaque membre du site par son identifiant Discord et enregistre son niveau et son rôle Nen.
// Appelée par le site (au plus une fois par heure et par visiteur) ; sans effet si le classement Lurkr n'est pas public.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const GUILD = '1572049244339183616';
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...H, 'Content-Type': 'application/json' } });
// Paliers des rôles Nen donnés par Lurkr sur le serveur.
const NEN: [number, string][] = [[75, 'Membre de la Brigade'], [50, 'En'], [40, 'Gyo'], [30, 'Hatsu'], [20, 'Ren'], [10, 'Zetsu'], [5, 'Ten']];
const nenOf = (lv: number) => (NEN.find(([n]) => lv >= n) || [0, null])[1];
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const lv: Record<string, number> = {};
    for (let page = 1; page <= 30; page++) {
      const r = await fetch(`https://api.lurkr.gg/v2/levels/${GUILD}?page=${page}`);
      if (r.status === 401 || r.status === 403) return json({ ok: false, reason: 'private' });
      if (!r.ok) break;
      const j = await r.json();
      const arr = (Array.isArray(j) ? j : j.levels || j.data || j.leaderboard || j.users || []) as Record<string, unknown>[];
      if (!arr.length) break;
      for (const x of arr) {
        const u = (x.user || {}) as Record<string, unknown>;
        const id = String(x.userId ?? x.user_id ?? u.id ?? x.id ?? '');
        const level = Number(x.level ?? x.lvl ?? 0);
        if (id && level >= 0) lv[id] = level;
      }
      if (arr.length < 100) break;
    }
    const map: Record<string, string> = {};
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) { const d = (u.identities || []).find((i) => i.provider === 'discord'); const did = d?.identity_data?.provider_id || d?.id; if (did) map[u.id] = String(did); }
      if (data.users.length < 1000) break;
    }
    let n = 0;
    for (const [uid, did] of Object.entries(map)) {
      const level = lv[did]; const patch = level == null ? { level: null, nen: null } : { level, nen: nenOf(level) };
      const { error } = await admin.from('profiles').update(patch).eq('id', uid); if (!error && level != null) n++;
    }
    await admin.from('content').upsert({ key: 'lurkr_sync', data: { at: Date.now(), members: n, ranked: Object.keys(lv).length }, updated_at: new Date().toISOString() });
    return json({ ok: true, members: n });
  } catch (e) { return json({ ok: false, reason: String(e) }, 500); }
});
