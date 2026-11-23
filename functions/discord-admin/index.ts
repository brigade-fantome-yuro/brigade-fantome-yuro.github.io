// Outil d'administration : enregistre la commande /kakashi sur le serveur de la Brigade.
// Protégé par le jeton de l'outil de publication ; utilise la clé secrète de l'application rangée dans la table secrets.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const APP = '1574213469023117422', GUILD = Deno.env.get('BRIGADE_GUILD_ID') || '1572049244339183616';
Deno.serve(async (req) => {
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { token } = await req.json().catch(() => ({}));
    const { data: rows } = await admin.from('secrets').select('key,value').in('key', ['publisher', 'discord_client_secret']);
    const sec: Record<string, string> = {}; for (const r of rows || []) sec[r.key] = r.value;
    if (!token || token !== sec.publisher) return new Response('refusé', { status: 403 });
    if (!sec.discord_client_secret) return new Response('clé secrète absente', { status: 400 });
    const tr = await fetch('https://discord.com/api/v10/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(APP + ':' + sec.discord_client_secret) }, body: 'grant_type=client_credentials&scope=applications.commands.update' });
    const tj = await tr.json(); if (!tj.access_token) return Response.json({ step: 'token', status: tr.status, tj });
    const r = await fetch(`https://discord.com/api/v10/applications/${APP}/guilds/${GUILD}/commands`, { method: 'PUT', headers: { Authorization: 'Bearer ' + tj.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify([{ name: 'kakashi', description: 'Pose une question à Kakashi, le stratège de la Brigade (YURO)', options: [{ type: 3, name: 'question', description: 'Ta question', required: true }, { type: 11, name: 'capture', description: "Une capture d'écran (facultatif)", required: false }] }]) });
    return Response.json({ step: 'commands', status: r.status, body: (await r.text()).slice(0, 300) });
  } catch (e) { return new Response('Erreur : ' + (e as Error).message, { status: 500 }); }
});
