// Alertes du marché : quand une carte est mise en vente à un prix inférieur ou égal au prix d'alerte d'un membre,
// on lui envoie une vraie notification (téléphone ou ordinateur), 3 minutes après la mise en vente.
// Appelée par le relevé du marché (jeton « publisher ») avec les annonces, ou par un membre connecté pour un test.
// Chiffrement Web Push (RFC 8291, aes128gcm) et signature VAPID (RFC 8292) faits ici avec WebCrypto.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const enc = new TextEncoder();
const b64u = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hmac(key: Uint8Array, data: Uint8Array) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const norm = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

async function vapidHeader(endpoint: string, pub: string, priv: string) {
  const p = unb64u(pub);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: priv, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://brigade-fantome-yuro.github.io/' })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}
async function encrypt(sub: { p256dh: string; auth: string }, payload: Uint8Array) {
  const ua = unb64u(sub.p256dh), authSecret = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = (await hmac(await hmac(authSecret, ecdh), cat(enc.encode('WebPush: info\0'), ua, as, new Uint8Array([1])))).slice(0, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(payload, new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), as, ct);
}
async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, msg: unknown, pub: string, priv: string) {
  const body = await encrypt(sub, enc.encode(JSON.stringify(msg)));
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(sub.endpoint, pub, priv), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '600', Urgency: 'high' }, body });
  return r.status;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sec } = await admin.from('secrets').select('key,value').in('key', ['publisher', 'vapid_public', 'vapid_private']);
    const S: Record<string, string> = Object.fromEntries((sec || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    if (!S.vapid_public || !S.vapid_private) return json({ ok: false, reason: 'config' }, 500);
    const input = await req.json().catch(() => ({}));
    const deliver = async (userIds: string[], msg: Record<string, unknown>) => {
      if (!userIds.length) return 0;
      const { data: subs } = await admin.from('push_subs').select('endpoint,p256dh,auth,user_id').in('user_id', userIds);
      let n = 0;
      for (const s of subs || []) {
        try { const st = await sendPush(s, msg, S.vapid_public, S.vapid_private); if (st === 404 || st === 410) await admin.from('push_subs').delete().eq('endpoint', s.endpoint); else if (st < 300) n++; } catch (_) { /* abonnement illisible */ }
      }
      return n;
    };
    // Test demandé par un membre connecté : une notification vers ses propres appareils.
    if (input.test) {
      const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
      const { data: { user } } = await admin.auth.getUser(jwt);
      if (!user) return json({ ok: false, reason: 'auth' }, 401);
      const n = await deliver([user.id], { title: 'Brigade Fantôme', body: 'Test réussi : tes alertes du marché arriveront ici.', tag: 'bf-test', url: '#alertes' });
      return json({ ok: true, sent: n });
    }
    if (!input.token || input.token !== S.publisher) return json({ ok: false, reason: 'token' }, 403);
    const listings: { id: string; card: string; price: number; created_at: string | number }[] = (input.listings || []).filter((l: { id: unknown; card: unknown; price: unknown }) => l && l.id && l.card && Number(l.price) > 0).slice(0, 200);
    if (!listings.length) return json({ ok: true, sent: 0 });
    const { data: alerts } = await admin.from('alerts').select('user_id,card,max_price').not('max_price', 'is', null);
    let sent = 0, matched = 0;
    for (const l of listings) {
      const who = (alerts || []).filter((a: { card: string; max_price: number }) => norm(a.card) === norm(l.card) && Number(l.price) <= Number(a.max_price));
      for (const a of who) {
        const { error } = await admin.from('alert_sent').insert({ listing_id: String(l.id), user_id: a.user_id, card: l.card, price: Math.round(Number(l.price)) });
        if (error) continue; // déjà prévenu pour cette annonce
        matched++;
        sent += await deliver([a.user_id], { title: 'ALERTE marché', body: `ALERTE : ${l.card} a été listé sur le marché à ${fmt(Number(l.price))} ki (ton prix : ${fmt(Number(a.max_price))} ki)`, tag: 'bf-' + l.id, url: '#alertes' });
      }
    }
    return json({ ok: true, matched, sent });
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});
