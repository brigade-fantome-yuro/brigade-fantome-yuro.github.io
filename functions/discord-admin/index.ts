// Outil d'administration : enregistre la commande /kakashi sur le serveur de la Brigade.
// Protégé par le jeton de l'outil de publication ; utilise la clé secrète de l'application rangée dans la table secrets.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const APP = '1574213469023117422', GUILD = Deno.env.get('BRIGADE_GUILD_ID') || '1572049244339183616';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { token } = await req.json().catch(() => ({}));
    const { data: rows } = await admin.from('secrets').select('key,value').in('key', ['publisher', 'discord_client_secret']);
    const sec: Record<string, string> = {}; for (const r of rows || []) sec[r.key] = r.value;
    if (!token || token !== sec.publisher) return new Response('refusé', { status: 403, headers: CORS });
    if (!sec.discord_client_secret) return new Response('clé secrète absente', { status: 400, headers: CORS });
    const tr = await fetch('https://discord.com/api/v10/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(APP + ':' + sec.discord_client_secret) }, body: 'grant_type=client_credentials&scope=applications.commands.update' });
    const tj = await tr.json(); if (!tj.access_token) return Response.json({ step: 'token', status: tr.status, tj }, { headers: CORS });
    const H = { Authorization: 'Bearer ' + tj.access_token, 'Content-Type': 'application/json' };
    // Commande globale : utilisable sur le serveur (salon dédié) et en message privé avec le bot.
    const cmd = { name: 'kakashi', description: 'Pose une question à Kakashi, le stratège de la Brigade (YURO)', integration_types: [0], contexts: [0, 1], options: [{ type: 3, name: 'question', description: 'Ta question', required: true }, { type: 11, name: 'capture', description: "Une capture d'écran (facultatif)", required: false }] };
    const g = await fetch(`https://discord.com/api/v10/applications/${APP}/commands`, { method: 'PUT', headers: H, body: JSON.stringify([cmd]) });
    const gb = (await g.text()).slice(0, 300);
    const l = g.ok ? await fetch(`https://discord.com/api/v10/applications/${APP}/guilds/${GUILD}/commands`, { method: 'PUT', headers: H, body: '[]' }) : null;
    return Response.json({ step: 'commands', global: g.status, body: gb, guildCleared: l?.status }, { headers: CORS });
  } catch (e) { return new Response('Erreur : ' + (e as Error).message, { status: 500 }); }
});
