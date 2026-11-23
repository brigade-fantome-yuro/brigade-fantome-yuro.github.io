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
    await edit(`> ${q || 'Capture envoyée'}\n${answer}`);
  } catch (e) { await edit('Erreur : ' + (e as Error).message); }
}

Deno.serve(async (req) => {
  const sig = req.headers.get('X-Signature-Ed25519'), ts = req.headers.get('X-Signature-Timestamp');
  const raw = await req.text();
  if (!sig || !ts || !nacl.sign.detached.verify(new TextEncoder().encode(ts + raw), hex(sig), hex(Deno.env.get('DISCORD_PUBLIC_KEY')!))) return new Response('signature invalide', { status: 401 });
  const i = JSON.parse(raw);
  if (i.type === 1) return Response.json({ type: 1 });
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
    return Response.json({ type: 5 });
  }
  return Response.json({ type: 4, data: { content: 'Commande inconnue.', flags: 64 } });
});
