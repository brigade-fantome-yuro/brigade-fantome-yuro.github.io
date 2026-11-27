// Kakashi sur Discord : commande /kakashi (question + capture facultative). Même IA et même base que sur le site.
// Discord appelle cette fonction ; on répond « Kakashi réfléchit… » puis on remplace par la vraie réponse.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const MODEL_TEXT = Deno.env.get('CF_MODEL') || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_VISION = Deno.env.get('CF_MODEL_VISION') || '@cf/meta/llama-4-scout-17b-16e-instruct';
const PER_DAY = Number(Deno.env.get('KAKASHI_PER_DAY') || 25);
const ROLE: Record<string, string> = { degats: 'Dégâts', tank: 'Tank', healer: 'Healer', stunner: 'Contrôle', polyvalence: 'Polyvalence' };

function towerAt(room: number) {
  const scale = .5 + room * .018 + Math.floor(room / 10) * .02;
  return { hp: Math.round((155 + Math.min(90, (room - 1) * 3)) * scale), atk: Math.max(1, Math.round((32 + Math.min(26, (room - 1) * .9)) * scale * .95)) };
}

// deno-lint-ignore no-explicit-any
function buildKnowledge(kb: Record<string, any>, prices: any[], mine: any) {
  const L: string[] = [];
  const ts = kb.twoshot || {};
  L.push('## Les LR (Secret) du jeu : rôle, PV/ATQ à 0★ et 5★, techniques');
  for (const c of (kb.cards || [])) {
    const t = ts[c.id]; const s5 = t ? `${t[5][0]}/${t[5][1]}` : `${Math.round(c.hp * 1.4)}/${Math.round(c.atk * 1.4)}`;
    L.push(`- ${c.n} (${c.a}) · ${c.r || 'LR'}${c.p ? ' (version éveillée)' : ''} · ${ROLE[c.c] || 'sans rôle'} · 0★ ${c.hp}/${c.atk} · 5★ ${s5} · ${(c.t || []).map((x: string[]) => `${x[0]} : ${x[1]}`).join(' / ')}`);
  }
  L.push('\n## Château de l\'infini : gardiens (3 par chambre, mêmes stats)');
  L.push('Formule exacte : scale = 0,5 + chambre×0,018 + floor(chambre/10)×0,02 ; PV = round((155 + min(90,(chambre−1)×3))×scale) ; ATQ = max(1, round((32 + min(26,(chambre−1)×0,9))×scale×0,95)). Étoile = +8 % PV et ATQ par étoile.');
  L.push('Repères : ' + [100, 300, 500, 600, 700, 800, 900, 1000].map(r => { const g = towerAt(r); return `ch.${r} ${g.hp} PV/${g.atk} ATQ`; }).join(' ; '));
  L.push('Chambre max d\'Ayanokouji avec la boucle (survit à 2 coups, ≥1 % PV), sans soin / avec un soin de 30 % : 0★ 453/597, 1★ 490/647, 2★ 529/697, 3★ 567/746, 4★ 605/796, 5★ 643/846.');
  for (const [k, g] of Object.entries(kb.guides || {})) {
    // deno-lint-ignore no-explicit-any
    const gg = g as any; L.push(`\n## Guide : ${gg.title}`);
    for (const s of gg.sections || []) L.push(`### ${s.h}\n${(s.p || []).join(' ')}${s.list ? '\n- ' + s.list.join('\n- ') : ''}`);
  }
  if (kb.evolutions?.list) {
    L.push('\n## Éveils (définitifs ; la version éveillée prend +8 %/étoile comme les autres LR)');
    // deno-lint-ignore no-explicit-any
    for (const e of kb.evolutions.list) L.push(`- ${e.from.n} → ${e.to.n} : ${e.ki} KI${(e.cards || []).map((c: any) => `, ${c.q}× ${c.n}`).join('')}${e.items.map((i: any) => `, ${i.q}× ${i.n} (${i.src.join(' / ') || 'introuvable'})`).join('')}`);
  }
  L.push('\n## Ranked : méta et règles de jeu');
  L.push('Une seule carte par rôle dans une équipe. Meilleurs trios (tous les trios autorisés simulés avec le moteur de combat du jeu contre la méta ranked, à 0★ comme à 5★) : 1) Seiichi Samura → Boros Second Form → Pucci (Made In Heaven) ; 2) Seiichi + Boros Second Form + Frieren (ou Itachi, Xebec, Gojo VOID, Escanor, Roger) ; 3) Gojo VOID + Boros Second Form + Alucard ; 4) Seiichi + Gojo VOID + Aizen (Hōgyoku) ; sans Boros SF ni Seiichi : Gojo VOID + Yhwach + Aizen. Équipes les plus jouées en ranked : Alucard + Janemba + Julius, Alucard + Janemba + Makima, Alucard + Janemba + Xebec. Tier S : Boros Second Form, Seiichi, Pucci Made In Heaven, Aizen Hōgyoku, Frieren Black Hole. Le site (Ranked → Meilleure équipe) donne le meilleur trio et le placement selon les LR du membre.');
  L.push('Règles : viser d\'abord un adversaire non protégé (pas d\'esquive Janemba/MUI, pas de voile Haki de Xebec) ; ne pas gaspiller Domination ou un canon sur une carte qui esquive encore, lui faire perdre ses esquives avec des attaques simples ; achever en priorité un adversaire tuable en un coup ; garder le soin pour sauver un allié d\'un coup fatal ; le canon de Boros seulement s\'il touche au moins une cible non protégée ou s\'il tue.');
  for (const k of ['faq', 'lexique']) if (kb[k]) L.push(`\n## ${k === 'faq' ? 'FAQ' : 'Lexique'}\n` + (Array.isArray(kb[k]) ? kb[k].map((x: string[] | { q: string; a: string }) => Array.isArray(x) ? `- ${x[0]} : ${x[1]}` : `- ${x.q} : ${x.a}`).join('\n') : JSON.stringify(kb[k]).slice(0, 4000)));
  if (prices.length) L.push('\n## Prix réels du marché (7 derniers jours, KI) : médiane · bon prix · max conseillé\n' + prices.map(p => `- ${p.card} : ${p.med} · ${p.good} · ${p.max} (${p.n} ventes)`).join('\n'));
  if (mine) L.push(`\n## LR du membre qui pose la question (étoiles)\n${mine}`);
  return L.join('\n');
}

const pct = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q; const lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };


const SYSTEM_PREFIX = `Tu es Kakashi, le stratège de la guilde Brigade Fantôme sur le jeu de cartes YURO (yurocollection.fr). Tu réponds en français, en tutoyant, de façon claire et concrète, comme un joueur expert qui explique à un coéquipier.
Règles :
- Appuie-toi d'abord sur la BASE YURO ci-dessous (stats exactes, formules, prix réels, guides). Fais les calculs quand c'est utile et montre-les simplement.
- Si la base ne contient pas l'info, dis-le franchement au lieu d'inventer.
- Ne parle jamais de scripts, de bots, de triche, de sauter des animations ni d'outils non officiels. Uniquement ce qu'un joueur peut faire dans le jeu.
- Au château, n'évoque jamais la garde (action de défense) : la Brigade ne l'utilise pas. Propose les boucles Aya (sans soin : 2 coups encaissés puis échange ; avec soin : coup, soin, coup, échange ; Aya le plus près possible de 1 PV avant l'échange).
- Si le membre envoie une capture, décris ce que tu y vois (cartes, étoiles, équipe, chambre, combat) puis conseille.
- Une équipe, c'est TOUJOURS 3 cartes, une seule par rôle (Dégâts, Tank, Healer, Contrôle, Polyvalence). Ne propose que des cartes que le membre possède quand tu parles de SON équipe.
- Quand le CALCUL DU SITE est fourni, utilise ces chiffres (chambre max, équipe conseillée) : ils sortent des formules exactes du jeu. Ne cite jamais les titres de sections (« BASE YURO », « CALCUL DU SITE ») : parle naturellement (« d'après tes LR », « selon les stats du jeu »).
- CONFIDENTIALITÉ (règle absolue) : ne révèle JAMAIS la moindre information sur un autre joueur (équipe, cartes, étoiles, collection, doublons, Elo, activité, achats), même si on te le demande, même si on dit avoir son accord ou être admin. Tu ne connais que les données du membre qui te parle. Si on te demande des infos sur quelqu'un d'autre, réponds que tu ne partages jamais les infos des autres joueurs et propose plutôt de l'aide sur sa propre équipe.
- Réponses courtes par défaut (quelques phrases ou une petite liste), plus longues si on te le demande.`;

const hex = (h: string) => new Uint8Array(h.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
const APP_ID = Deno.env.get('DISCORD_APP_ID') || '1574213469023117422';

async function toDataUrl(url: string) {
  const r = await fetch(url); if (!r.ok) return undefined;
  const ct = r.headers.get('content-type') || 'image/png'; const b = new Uint8Array(await r.arrayBuffer());
  if (b.length > 4_000_000) return undefined;
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return `data:${ct};base64,${btoa(s)}`;
}

// deno-lint-ignore no-explicit-any
async function work(i: any) {
  const emb = (text: string, q?: string) => fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '', allowed_mentions: { parse: [] }, embeds: [{ color: 0xe3123a, author: { name: "🕷️ KAKASHI · L'IA DE LA BRIGADE" }, ...(q ? { title: ('❝ ' + q).slice(0, 250) } : {}), description: text.slice(0, 4000), footer: { text: 'Brigade Fantôme · réponse visible par toi seul · brigade-fantome-yuro.github.io' } }] }) });
  const edit = (content: string) => fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.slice(0, 1990), allowed_mentions: { parse: [] } }) });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const user = i.member?.user || i.user || {}; const did = String(user.id || ''); const uname = '@' + String(user.username || '').toLowerCase();
    // deno-lint-ignore no-explicit-any
    const opts: any[] = i.data.options || []; const q = String(opts.find((o) => o.name === 'question')?.value || '').slice(0, 1500);
    const attId = opts.find((o) => o.name === 'capture')?.value; const att = attId ? i.data.resolved?.attachments?.[attId] : null;
    const day = new Date().toISOString().slice(0, 10);
    const { data: u } = await admin.from('discord_usage').select('n').eq('discord_id', did).eq('day', day).maybeSingle();
    if ((u?.n || 0) >= PER_DAY) { await edit(`Tu as utilisé tes ${PER_DAY} questions du jour. Reviens demain !`); return; }
    const image = att && /^image\//.test(att.content_type || '') ? await toDataUrl(att.url) : undefined;

    const { data: rows } = await admin.from('content').select('key,data').in('key', ['cards', 'twoshot', 'guides', 'faq', 'lexique', 'evolutions']);
    // deno-lint-ignore no-explicit-any
    const kb: Record<string, any> = {}; for (const r of rows || []) kb[r.key] = r.data;
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data: sales } = await admin.from('sales').select('card,price').gte('sold_at', since).limit(5000);
    const by: Record<string, number[]> = {}; for (const s of sales || []) (by[s.card] = by[s.card] || []).push(s.price);
    const prices = Object.entries(by).map(([card, a]) => ({ card, n: a.length, med: Math.round(pct(a, .5)), good: Math.round(pct(a, .25) / 1000) * 1000, max: Math.round(pct(a, .75) / 1000) * 1000 })).sort((a, b) => b.n - a.n);
    // Si le membre a un compte sur le site (même @ Discord), Kakashi connaît ses LR.
    const { data: prof } = await admin.from('profiles').select('id').eq('discord', uname).eq('status', 'approved').limit(1).maybeSingle();
    let mine = '';
    if (prof) { const { data: my } = await admin.from('my_lr').select('cards').eq('user_id', prof.id).maybeSingle(); const names: Record<string, string> = {}; for (const c of kb.cards || []) names[c.id] = c.n; if (my?.cards) mine = Object.entries(my.cards).map(([id, st]) => `${names[id] || id} ${st}★`).join(', '); }

    const system = SYSTEM_PREFIX + `\n- Tu réponds sur Discord : 1 500 caractères maximum, mise en forme Discord simple (gras, listes).\n\nBASE YURO :\n${buildKnowledge(kb, prices, mine)}`;
    const msgs = [{ role: 'system', content: system }, image ? { role: 'user', content: [{ type: 'text', text: q || 'Analyse cette capture.' }, { type: 'image_url', image_url: { url: image } }] } : { role: 'user', content: q }];
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${Deno.env.get('CF_ACCOUNT_ID')}/ai/run/${image ? MODEL_VISION : MODEL_TEXT}`, {
      method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('CF_API_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, max_tokens: 700, temperature: 0.4 }),
    });
    const out = await r.json();
    const answer = out.result?.response ?? out.result?.choices?.[0]?.message?.content ?? '';
    if (!r.ok || !out.success || !answer) { await edit('Kakashi est indisponible pour le moment (quota du jour ou service). Réessaie plus tard, ou pose ta question sur le site.'); return; }
    await admin.from('discord_usage').upsert({ discord_id: did, day, n: (u?.n || 0) + 1 });
    await emb(answer, q || 'Capture envoyée');
  } catch (e) { await edit('Erreur : ' + (e as Error).message); }
}

// ---------- Inscriptions au tournoi : bouton « Entrer » + achat d'une carte à 5 000 KI mise en vente par l'organisateur ----------
// deno-lint-ignore no-explicit-any
async function tournoiState(admin: any) {
  const { data: rows } = await admin.from('content').select('key,data').in('key', ['tournoi_inscriptions', 'tournoi_paid']);
  // deno-lint-ignore no-explicit-any
  const c: Record<string, any> = {}; for (const r of rows || []) c[r.key] = r.data;
  const ins = c.tournoi_inscriptions || null;
  const paid = new Map<string, number>();
  for (const [bid, at, price] of (c.tournoi_paid?.list || [])) if (ins && at >= ins.at && Number(price) === Number(ins.price || 5000)) paid.set(String(bid), at);
  return { ins, paid };
}
// deno-lint-ignore no-explicit-any
function tournoiMsg(ins: any, n: number) {
  const fin = ins.end ? `\n\n**Fin des inscriptions :** ${ins.end}` : '';
  return {
    embeds: [{
      color: 0xe3123a,
      title: `🕸️ ${ins.title || 'TOURNOI DE LA BRIGADE'}`,
      description: `**Récompense :** ${ins.reward || 'la cagnotte des inscriptions, redistribuée aux meilleurs (détail sur le site, onglet Tournoi)'}\n\n**Pour entrer (les 2 sont obligatoires) :**\n1️⃣ Clique sur **🎉 Entrer dans le tournoi**\n2️⃣ Achète sur le marché YURO **une carte à ${(ins.price || 5000).toLocaleString('fr-FR')} KI** mise en vente par **${ins.org || 'l\'organisateur'}**\n\nL'achat est vérifié automatiquement (environ 1 min). Si tu cliques avant d'avoir acheté, reclique après ton achat.${fin}\n\n**Inscrits validés : ${n}**`,
      footer: { text: 'Brigade Fantôme · tableau, règles et paris sur le site' },
    }],
    components: [{ type: 1, components: [
      { type: 2, style: 1, custom_id: 'tj', label: 'Entrer dans le tournoi', emoji: { name: '🎉' } },
      { type: 2, style: 2, custom_id: 'tp', label: `Participants (${n})`, emoji: { name: '👥' } },
    ] }],
    allowed_mentions: { parse: [] },
  };
}
// deno-lint-ignore no-explicit-any
async function tournoiInteraction(i: any) {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const eph = (content: string) => Response.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
  const user = i.member?.user || i.user || {}; const did = String(user.id || '');
  if (i.type === 2) { // /tournoi : réservé aux admins
    const admins = (Deno.env.get('ADMIN_DISCORD_IDS') || '').split(',').map((x) => x.trim());
    if (!admins.includes(did)) return eph('Commande réservée aux organisateurs.');
    // deno-lint-ignore no-explicit-any
    const o: Record<string, any> = {}; for (const x of (i.data.options || [])) o[x.name] = x.value;
    const ins = { at: Date.now(), title: o.titre || 'TOURNOI DE LA BRIGADE', reward: o.recompense || '', end: o.fin || '', price: Number(o.prix || 5000), org: o.vendeur || 'OnlyWIZZOX', channel: i.channel_id };
    await admin.from('tourn_entries').delete().neq('discord_id', '');
    await admin.from('content').upsert({ key: 'tournoi_inscriptions', data: ins, updated_at: new Date().toISOString() });
    return Response.json({ type: 4, data: tournoiMsg(ins, 0) });
  }
  const { ins, paid } = await tournoiState(admin);
  if (!ins) return eph('Aucune inscription ouverte.');
  const { data: ents } = await admin.from('tourn_entries').select('discord_id,username,joined_at').order('joined_at');
  const valid = (ents || []).filter((e: { discord_id: string }) => paid.has(e.discord_id));
  if (i.data.custom_id === 'tp') {
    return eph(valid.length ? `**Inscrits validés (${valid.length}) :**\n${valid.map((e: { username: string }, k: number) => `${k + 1}. ${e.username}`).join('\n')}` : 'Personne n\'est encore inscrit.');
  }
  if (i.data.custom_id === 'tj') {
    if (ins.closed) return eph('Les inscriptions sont fermées.');
    const uname = String(user.global_name || user.username || '?');
    const already = (ents || []).some((e: { discord_id: string }) => e.discord_id === did);
    if (!already) await admin.from('tourn_entries').insert({ discord_id: did, username: uname, handle: '@' + String(user.username || '').toLowerCase() });
    if (!paid.has(did)) return eph(`📝 Clic enregistré. Il te reste à acheter **une carte à ${(ins.price || 5000).toLocaleString('fr-FR')} KI** mise en vente par **${ins.org}** sur le marché YURO, puis à recliquer sur **Entrer** (vérification en ~1 min). Ton compte YURO doit être celui de ton Discord.`);
    if (already && valid.some((e: { discord_id: string }) => e.discord_id === did)) return eph('✅ Tu es déjà inscrit au tournoi.');
    const n = valid.length + (valid.some((e: { discord_id: string }) => e.discord_id === did) ? 0 : 1);
    // met à jour le compteur du message, puis confirmation privée
    const tok = i.token;
    // deno-lint-ignore no-explicit-any
    const later = async () => { await new Promise((r) => setTimeout(r, 400)); await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${tok}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '✅ Achat vérifié : tu es inscrit au tournoi ! Bonne chance 🕸️', flags: 64 }) }); };
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(later()) : later();
    return Response.json({ type: 7, data: tournoiMsg(ins, n) });
  }
  return eph('Action inconnue.');
}

// ---------- Tickets « comme YURO » (Nicolas 27/11) ----------
// Bouton « 🎫 Ouvrir un ticket » posté dans #ticket-site : le bot crée un salon privé ticket-<pseudo>
// visible seulement par le membre, le staff (Fondateur, Chef, Modérateur) et le bot, avec un bouton « 🔒 Fermer le ticket ».
const TK_GUILD = '1572049244339183616', TK_PANEL = '1575274736265601204';
const P = { VIEW: 1n << 10n, SEND: 1n << 11n, EMBED: 1n << 14n, ATTACH: 1n << 15n, HISTORY: 1n << 16n, MANAGE_CH: 1n << 4n, ADMIN: 1n << 3n, MANAGE_MSG: 1n << 13n };
const STAFF_RE = /fondateur|chef|mod[ée]rat/i;
async function botToken() { const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); const { data } = await admin.from('secrets').select('value').eq('key', 'discord_bot_token').maybeSingle(); return data?.value as string; }
async function DB(tok: string, path: string, init: RequestInit = {}) { const r = await fetch('https://discord.com/api/v10' + path, { ...init, headers: { Authorization: 'Bot ' + tok, 'Content-Type': 'application/json', ...(init.headers || {}) } }); const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch (_) { /* texte */ } return { ok: r.ok, status: r.status, j }; }
const followUp = (tok: string, content: string) => fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${tok}/messages/@original`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
// deno-lint-ignore no-explicit-any
async function ticketOpen(i: any) {
  const user = i.member?.user || {}; const uid = String(user.id); const tok = await botToken();
  if (!tok) return followUp(i.token, '❌ Le bot n\'est pas configuré, préviens le Chef.');
  const chs = await DB(tok, `/guilds/${TK_GUILD}/channels`); if (!chs.ok) return followUp(i.token, '❌ Impossible d\'ouvrir le ticket pour l\'instant, réessaie dans une minute.');
  // deno-lint-ignore no-explicit-any
  const L = chs.j as any[]; const mine = L.find((c) => c.topic === `ticket:${uid}`);
  if (mine) return followUp(i.token, `Tu as déjà un ticket ouvert : <#${mine.id}>`);
  const panel = L.find((c) => c.id === TK_PANEL);
  const roles = await DB(tok, `/guilds/${TK_GUILD}/roles`);
  // deno-lint-ignore no-explicit-any
  const staff = ((roles.j as any[]) || []).filter((r) => STAFF_RE.test(r.name) && !r.managed).map((r) => r.id as string);
  const see = (P.VIEW | P.SEND | P.HISTORY | P.ATTACH | P.EMBED).toString();
  const slug = String(user.username || 'membre').toLowerCase().replace(/[^a-z0-9_-]+/g, '').slice(0, 80) || 'membre';
  const ow = [{ id: TK_GUILD, type: 0, deny: P.VIEW.toString() }, { id: uid, type: 1, allow: see }, { id: APP_ID, type: 1, allow: (BigInt(see) | P.MANAGE_CH | P.MANAGE_MSG).toString() }, ...staff.map((id: string) => ({ id, type: 0, allow: see }))];
  const c = await DB(tok, `/guilds/${TK_GUILD}/channels`, { method: 'POST', body: JSON.stringify({ name: `ticket-${slug}`, type: 0, parent_id: panel?.parent_id || null, topic: `ticket:${uid}`, permission_overwrites: ow }) });
  if (!c.ok) return followUp(i.token, `❌ Le bot n'a pas pu créer ton salon (erreur ${c.status}). Préviens le Chef.`);
  // deno-lint-ignore no-explicit-any
  const ch = (c.j as any).id;
  await DB(tok, `/channels/${ch}/messages`, { method: 'POST', body: JSON.stringify({
    content: `<@${uid}> ${staff.map((r: string) => `<@&${r}>`).join(' ')}`,
    embeds: [{ color: 0xe3123a, title: '🎫 Ticket ouvert', description: `Bonjour <@${uid}>, explique ton problème avec le site de la Brigade (téléphone ou PC, ce que tu faisais, une capture d'écran si possible). Le staff te répondra dès que possible.`, footer: { text: 'Brigade Fantôme · ticket site' } }],
    components: [{ type: 1, components: [{ type: 2, style: 4, custom_id: 'tkc', label: 'Fermer le ticket', emoji: { name: '🔒' } }] }],
    allowed_mentions: { users: [uid], roles: staff } }) });
  return followUp(i.token, `✅ Ton ticket est ouvert : <#${ch}>`);
}
// deno-lint-ignore no-explicit-any
async function ticketClose(i: any) {
  const tok = await botToken(); const user = i.member?.user || {}; const uid = String(user.id);
  const chs = await DB(tok, `/channels/${i.channel_id}`); // deno-lint-ignore no-explicit-any
  const ch = chs.j as any; const owner = String(ch?.topic || '').replace(/^ticket:/, '');
  const perms = BigInt(i.member?.permissions || '0'); const isStaff = (perms & (P.ADMIN | P.MANAGE_CH)) !== 0n;
  if (!String(ch?.topic || '').startsWith('ticket:')) return followUp(i.token, 'Ce ticket est déjà fermé.');
  if (uid !== owner && !isStaff) return followUp(i.token, 'Seul l\'auteur du ticket ou le staff peut le fermer.');
  // Fermé = gardé pour l'historique : le membre ne voit plus le salon, le staff garde la conversation.
  await DB(tok, `/channels/${i.channel_id}/permissions/${owner}`, { method: 'PUT', body: JSON.stringify({ type: 1, deny: P.VIEW.toString() }) });
  await DB(tok, `/channels/${i.channel_id}`, { method: 'PATCH', body: JSON.stringify({ name: ('ferme-' + String(ch.name || '').replace(/^ticket-/, '')).slice(0, 90), topic: `ticket-ferme:${owner}` }) });
  await DB(tok, `/channels/${i.channel_id}/messages`, { method: 'POST', body: JSON.stringify({ content: `🔒 Ticket fermé par <@${uid}>.`, allowed_mentions: { parse: [] } }) });
  return followUp(i.token, '🔒 Ticket fermé.');
}

Deno.serve(async (req) => {
  const sig = req.headers.get('X-Signature-Ed25519'), ts = req.headers.get('X-Signature-Timestamp');
  const raw = await req.text();
  if (!sig || !ts || !nacl.sign.detached.verify(new TextEncoder().encode(ts + raw), hex(sig), hex(Deno.env.get('DISCORD_PUBLIC_KEY')!))) return new Response('signature invalide', { status: 401 });
  const i = JSON.parse(raw);
  if (i.type === 1) return Response.json({ type: 1 });
  if (i.type === 3 && ['tko', 'tkc'].includes(i.data?.custom_id)) {
    if (String(i.guild_id) !== TK_GUILD) return Response.json({ type: 4, data: { content: 'Réservé à la Brigade Fantôme.', flags: 64 } });
    const job = i.data.custom_id === 'tko' ? ticketOpen(i) : ticketClose(i);
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(job) : job;
    return Response.json({ type: 5, data: { flags: 64 } });
  }
  if ((i.type === 2 && i.data?.name === 'tournoi') || (i.type === 3 && ['tj', 'tp'].includes(i.data?.custom_id))) return await tournoiInteraction(i);
  if (i.type === 2 && i.data?.name === 'kakashi') {
    const eph = (content: string) => Response.json({ type: 4, data: { content, flags: 64 } });
    const GUILD = Deno.env.get('BRIGADE_GUILD_ID') || '1572049244339183616';
    const CH = (Deno.env.get('KAKASHI_CHANNEL_IDS') || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (i.guild_id) {
      if (String(i.guild_id) !== GUILD) return eph('Kakashi est réservé à la Brigade Fantôme.');
      if (CH.length && !CH.includes(String(i.channel_id))) return eph(`Pose tes questions à Kakashi dans ${CH.map((c) => `<#${c}>`).join(' ou ')}, ou en message privé avec le bot.`);
    } else {
      // Message privé : seulement pour les membres validés sur le site (connexion Discord + serveur de la Brigade).
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const uname = '@' + String(i.user?.username || '').toLowerCase();
      const { data: prof } = await admin.from('profiles').select('id').eq('discord', uname).eq('status', 'approved').limit(1).maybeSingle();
      if (!prof) return eph('En message privé, Kakashi répond aux membres de la Brigade connectés au site avec Discord. Connecte-toi une fois sur le site, puis réessaie.');
    }
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(work(i)) : work(i);
    return Response.json({ type: 5, data: { flags: 64 } }); // réponse privée : seul l'auteur voit sa question et la réponse
  }
  return Response.json({ type: 4, data: { content: 'Commande inconnue.', flags: 64 } });
});
