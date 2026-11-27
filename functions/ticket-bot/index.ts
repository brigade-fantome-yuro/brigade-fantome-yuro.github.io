// Tickets du site : le bot de la Brigade lit les fils privés du salon #ticket-site, y répond, les renomme et les ferme.
// Les réponses sont écrites par l'assistant (Claude) ; cette fonction ne fait que parler à Discord avec le jeton du bot.
// Protégée par le jeton de l'outil de publication (table secrets, clé « publisher »).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const GUILD = '1572049244339183616', CHANNEL = '1575274736265601204';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const { data: rows } = await admin.from('secrets').select('key,value').in('key', ['publisher', 'discord_bot_token']);
    const sec: Record<string, string> = {}; for (const r of rows || []) sec[r.key] = r.value;
    if (!body.token || body.token !== sec.publisher) return out({ error: 'refusé' }, 403);
    if (!sec.discord_bot_token) return out({ error: 'jeton du bot absent (secrets.discord_bot_token)' }, 400);
    const D = async (path: string, init: RequestInit = {}) => {
      const r = await fetch('https://discord.com/api/v10' + path, { ...init, headers: { Authorization: 'Bot ' + sec.discord_bot_token, 'Content-Type': 'application/json', ...(init.headers || {}) } });
      const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch (_) { /* texte */ }
      return { ok: r.ok, status: r.status, j };
    };
    const a = body.action;
    if (a === 'me') return out(await D('/users/@me'));
    if (a === 'list') { // fils actifs du salon + derniers messages de chacun
      const t = await D(`/guilds/${GUILD}/threads/active`); if (!t.ok) return out(t, 502);
      // deno-lint-ignore no-explicit-any
      const th = ((t.j as any).threads || []).filter((x: any) => x.parent_id === CHANNEL);
      const res = [];
      for (const x of th) {
        const m = await D(`/channels/${x.id}/messages?limit=${Math.min(50, body.limit || 20)}`);
        // deno-lint-ignore no-explicit-any
        const msgs = m.ok ? (m.j as any[]).reverse().map((y: any) => ({ id: y.id, at: y.timestamp, author: y.author?.username, authorId: y.author?.id, bot: !!y.author?.bot, content: y.content, files: (y.attachments || []).map((f: any) => f.url), type: y.type })) : { error: m.status };
        res.push({ id: x.id, name: x.name, owner: x.owner_id, created: x.thread_metadata?.create_timestamp, locked: x.thread_metadata?.locked, msgs });
      }
      // Salons privés ticket-<pseudo> ouverts par le bouton (27/11) : sujet « ticket:<id du membre> ».
      const cs = await D(`/guilds/${GUILD}/channels`);
      // deno-lint-ignore no-explicit-any
      for (const x of (cs.ok ? (cs.j as any[]) : []).filter((c: any) => /^ticket:/.test(c.topic || ''))) {
        const m = await D(`/channels/${x.id}/messages?limit=${Math.min(50, body.limit || 20)}`);
        // deno-lint-ignore no-explicit-any
        const msgs = m.ok ? (m.j as any[]).reverse().map((y: any) => ({ id: y.id, at: y.timestamp, author: y.author?.username, authorId: y.author?.id, bot: !!y.author?.bot, content: y.content, files: (y.attachments || []).map((f: any) => f.url), type: y.type })) : { error: m.status };
        res.push({ id: x.id, name: x.name, owner: String(x.topic).slice(7), kind: 'channel', msgs });
      }
      return out({ threads: res });
    }
    if (a === 'panel') { // message avec le bouton « Ouvrir un ticket » dans #ticket-site
      await D(`/channels/${CHANNEL}`, { method: 'PATCH', body: JSON.stringify({ topic: 'Un bug ou une question sur le site Brigade Fantôme ? Clique sur « 🎫 Ouvrir un ticket » : un salon privé s\'ouvre, visible seulement par toi et le staff.' }) });
      return out(await D(`/channels/${CHANNEL}/messages`, { method: 'POST', body: JSON.stringify({ embeds: [{ color: 0xe3123a, title: '🎫 Support du site Brigade Fantôme', description: 'Un bug, une question ou un souci de connexion sur le site ?\n\nClique sur **Ouvrir un ticket** : un salon privé **ticket-ton-pseudo** s\'ouvre, visible seulement par toi et le staff. Explique ton problème (téléphone ou PC, capture d\'écran si possible).', footer: { text: 'Brigade Fantôme · un ticket à la fois par membre' } }], components: [{ type: 1, components: [{ type: 2, style: 1, custom_id: 'tko', label: 'Ouvrir un ticket', emoji: { name: '🎫' } }] }] }) }));
    }
    if (a === 'close' && body.channel) { // ticket en salon : retire l'accès du membre et renomme
      const c = await D(`/channels/${body.channel}`); // deno-lint-ignore no-explicit-any
      const ch = c.j as any; const owner = String(ch?.topic || '').replace(/^ticket:/, '');
      await D(`/channels/${body.channel}/permissions/${owner}`, { method: 'PUT', body: JSON.stringify({ type: 1, deny: String(1 << 10) }) });
      return out(await D(`/channels/${body.channel}`, { method: 'PATCH', body: JSON.stringify({ name: ('ferme-' + String(ch.name || '').replace(/^ticket-/, '')).slice(0, 90), topic: `ticket-ferme:${owner}` }) }));
    }
    if (a === 'member') return out(await D(`/guilds/${GUILD}/members/${body.user}`));
    if (a === 'send') return out(await D(`/channels/${body.thread}/messages`, { method: 'POST', body: JSON.stringify({ content: String(body.content || '').slice(0, 2000), allowed_mentions: { parse: [], users: body.mention ? [body.mention] : [] } }) }));
    if (a === 'rename') return out(await D(`/channels/${body.thread}`, { method: 'PATCH', body: JSON.stringify({ name: String(body.name || '').slice(0, 90) }) }));
    if (a === 'close') return out(await D(`/channels/${body.thread}`, { method: 'PATCH', body: JSON.stringify({ archived: true, locked: true }) }));
    return out({ error: 'action inconnue' }, 400);
  } catch (e) { return out({ error: (e as Error).message }, 500); }
});
