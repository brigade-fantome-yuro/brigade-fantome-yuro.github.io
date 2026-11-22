// Vérifie qu'un membre connecté avec Discord est bien sur le serveur de la Brigade Fantôme,
// puis valide son accès. Le jeton Discord ne sert qu'à lire la liste de ses serveurs (scope "guilds").
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const GUILD = Deno.env.get('BRIGADE_GUILD_ID');
    if (!GUILD) return json({ ok: false, reason: 'config' }, 500);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error || !user) return json({ ok: false, reason: 'auth' }, 401);
    const { provider_token } = await req.json().catch(() => ({}));
    if (!provider_token) return json({ ok: false, reason: 'token' }, 400);

    const D = { headers: { Authorization: `Bearer ${provider_token}` } };
    const [meR, gR] = await Promise.all([fetch('https://discord.com/api/v10/users/@me', D), fetch('https://discord.com/api/v10/users/@me/guilds', D)]);
    if (!meR.ok || !gR.ok) return json({ ok: false, reason: 'discord' }, 502);
    const me = await meR.json(); const guilds = await gR.json();
    // Le compte Discord doit être celui de la session Supabase
    const ident = (user.identities || []).find((i) => i.provider === 'discord');
    if (!ident || String(ident.id) !== String(me.id) && String(ident.identity_data?.provider_id) !== String(me.id)) return json({ ok: false, reason: 'mismatch' }, 403);
    if (!Array.isArray(guilds) || !guilds.some((g: { id: string }) => g.id === GUILD)) return json({ ok: false, reason: 'not_member' });

    const name = '@' + String(me.username || '').toLowerCase();
    const { error: e2 } = await admin.from('profiles').update({ status: 'approved', discord: name }).eq('id', user.id);
    if (e2) return json({ ok: false, reason: 'db' }, 500);
    return json({ ok: true, discord: name });
  } catch (_e) {
    return json({ ok: false, reason: 'error' }, 500);
  }
});
