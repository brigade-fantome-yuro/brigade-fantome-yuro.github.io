/* Transitions du jeu YURO recopiées pour l'écran de combat du site (relevé le 26/11) :
   - battle-transition.js : volets « YURO · AU COMBAT » au lancement d'un combat et sur les boutons de fin (rejouer, suivant, retour) ;
   - combat-arena.js : balayage gxWipe (kanji + nom du mode) ;
   - ranked-intro.js : écran « Match classé » (deux camps, VS) avant un duel en direct ;
   - fond de l'arène repris sur l'écran de fin (end-v2).
   Les styles viennent de la feuille du jeu chargée en direct par battle-frame.html. */
(function () {
  if (window.__yuroUi) return; window.__yuroUi = 1;
  var reduce = function () { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off'; } catch (e) { return false; } };
  var esc = function (v) { return typeof escapeHTML === 'function' ? escapeHTML(String(v == null ? '' : v)) : String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---- gxWipe (combat-arena.js) ---- */
  var wiping = false;
  function yuroWipe(k, label, next) {
    if (wiping) { next && next(); return; } if (reduce()) { next && next(); return; } wiping = true;
    var el = document.getElementById('gxWipe');
    if (!el) { el = document.createElement('div'); el.id = 'gxWipe'; el.className = 'gx-wipe'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i class="gx-wipe-a"></i><i class="gx-wipe-b"></i><i class="gx-wipe-s"></i><span class="gx-wipe-k"></span><b class="gx-wipe-n"></b>'; document.body.appendChild(el); }
    el.querySelector('.gx-wipe-k').textContent = k || '結'; el.querySelector('.gx-wipe-n').textContent = label || '';
    el.classList.remove('run'); void el.offsetWidth; el.classList.add('run');
    setTimeout(function () { try { next && next(); } catch (e) { console.warn('[yuro-ui]', e); } }, 440);
    setTimeout(function () { el.classList.remove('run'); wiping = false; }, 1130);
  }
  window.yuroWipe = yuroWipe;

  /* ---- Volets d'entrée en combat (battle-transition.js) ---- */
  var busy = false, overlay = null;
  function getOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div'); overlay.className = 'battle-transition'; overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<i class="bt-panel top"></i><i class="bt-panel bottom"></i><i class="bt-slash"></i><b class="bt-mark"><span>YURO</span><small></small></b>';
    document.body.appendChild(overlay); return overlay;
  }
  function arenaColor(el) { try { return getComputedStyle((el && el.closest && el.closest('.story-arena,.story-battle')) || document.querySelector('.story-arena') || document.body).getPropertyValue('--story-color').trim(); } catch (e) { return ''; } }
  // Ferme les volets, joue l'action au milieu (330 ms), rouvre quand l'écran de fin a disparu.
  function battleTransition(label, run, color) {
    if (busy) { run(); return; } busy = true;
    var o = getOverlay(), fast = reduce(), inMs = fast ? 120 : 330, hold = fast ? 40 : 140;
    o.style.setProperty('--bt-color', color || '#b98cff'); o.querySelector('small').textContent = label || 'AU COMBAT';
    o.classList.remove('is-out'); o.classList.toggle('is-fast', fast); void o.offsetWidth; o.classList.add('is-in');
    setTimeout(function () {
      try { run(); } catch (e) { console.warn('[yuro-ui]', e); }
      var started = Date.now(), open = function () { o.classList.add('is-out'); setTimeout(function () { o.classList.remove('is-in', 'is-out'); busy = false; }, fast ? 150 : 480); };
      (function wait() { if (document.querySelector('.story-battle .story-end-screen') && Date.now() - started < 5000) return setTimeout(wait, 40); setTimeout(open, hold); })();
    }, inMs);
  }
  window.yuroBattleTransition = battleTransition;
  var selector = '[data-story-map],[data-story-level],[data-raid-level],[data-farm-start],[data-halloween-level],[data-infinity-lobby],[data-infinity-replay],[data-infinity-start],[data-infinity-resume]';
  function label(b) {
    if (b.matches('[data-story-map],[data-infinity-lobby]')) return 'RETOUR';
    if (/rejouer/i.test(b.textContent)) return 'NOUVEL ESSAI';
    if (/suivant/i.test(b.textContent)) return 'COMBAT SUIVANT';
    return 'AU COMBAT';
  }
  window.addEventListener('click', function (event) {
    var b = event.target.closest && event.target.closest(selector);
    if (!b || b.disabled || b.dataset.btPass === '1' || !b.closest('.story-battle')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (busy) return;
    var key = b.getAttributeNames().filter(function (n) { return n.indexOf('data-') === 0; }).map(function (n) { return '[' + n + '="' + CSS.escape(b.getAttribute(n)) + '"]'; }).join(''), text = b.textContent.trim();
    battleTransition(label(b), function () {
      var target = b.isConnected ? b : (function () { var list = [].slice.call(document.querySelectorAll('.story-battle button' + key)); return list.find(function (x) { return x.textContent.trim() === text; }) || list[0] || null; })();
      if (target && !target.disabled) { target.dataset.btPass = '1'; try { target.click(); } finally { delete target.dataset.btPass; } }
    }, arenaColor(b));
  }, true);
  // Lancements pilotés par la page du site (simulateurs, château, arène) : mêmes volets que dans le jeu.
  ['BFCastle', 'BFDuel'].forEach(function (n) {
    var A = window[n]; if (!A || A.__btw) return; A.__btw = 1;
    ['start', 'spectate'].forEach(function (f) { var orig = A[f]; if (typeof orig !== 'function') return; A[f] = function () { var self = this, args = arguments; battleTransition('AU COMBAT', function () { orig.apply(self, args); }, arenaColor()); }; });
  });

  /* ---- Écran « Match classé » avant un duel en direct (ranked-intro.js) ----
     d = { names:[moi, adversaire], teams:[[{name,image,rarity}…],[…]], eyebrow, tags:[texte moi, texte adversaire], kanji } */
  function side(d, s, pos) {
    var foe = pos === 'top', team = (d.teams && d.teams[s] || []).slice(0, 3);
    var col = function (r) { try { return (typeof rarityColors !== 'undefined' && rarityColors[r]) || '#fff'; } catch (e) { return '#fff'; } };
    return '<section class="rki-side ' + pos + '" style="--rank-color:' + (foe ? '#e8433a' : '#d8b25e') + '"><i class="rki-wm" lang="ja" aria-hidden="true">' + (foe ? '敵' : '己') + '</i><div class="rki-band" aria-hidden="true"></div>'
      + '<div class="rki-id"><div class="rki-copy"><span>' + (foe ? 'ADVERSAIRE' : (d.meLabel || 'TOI')) + '</span><strong>' + esc(d.names && d.names[s] || 'Joueur') + '</strong><em>' + (d.tags && d.tags[s] ? '<i>' + esc(d.tags[s]) + '</i>' : '') + '</em></div></div>'
      + '<div class="rki-team">' + team.map(function (u, i) { return '<figure style="--i:' + i + ';--r:' + col(u.rarity) + '">' + (u.image ? '<img src="' + esc(u.image) + '" alt="" decoding="async">' : '') + '<figcaption>' + esc(u.name || '') + '</figcaption></figure>'; }).join('') + '</div></section>';
  }
  function yuroMatchIntro(d) {
    return new Promise(function (done) {
      if (document.querySelector('.rki')) { done(); return; }
      var red = reduce(), el = document.createElement('div'); el.className = 'rki' + (red ? ' is-reduced' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Début du combat');
      el.innerHTML = '<p class="rki-eyebrow"><i lang="ja" aria-hidden="true">' + esc(d.kanji || '位') + '</i>' + esc(d.eyebrow || 'Match classé') + '</p>' + side(d, 1, 'top') + '<div class="rki-vs" aria-hidden="true"><i class="rki-slash"></i><span class="rki-k" lang="ja">対</span><b><em>V</em><em>S</em></b></div><div class="rki-flash"></div><button type="button" class="rki-skip">Passer ›</button>' + side(d, 0, 'bottom');
      document.body.append(el); document.documentElement.classList.add('yuro-modal-open');
      var closed = false, close = function () { if (closed) return; closed = true; el.classList.add('is-out'); setTimeout(function () { el.remove(); document.documentElement.classList.remove('yuro-modal-open'); done(); }, red ? 0 : 520); };
      el.addEventListener('click', close);
      var start = function () { if (closed) return; el.classList.add('is-play'); try { if (typeof uiSound === 'function') uiSound('skill'); else if (typeof playBattleHitSound === 'function' && state.sound) playBattleHitSound(true); } catch (e) { /* rien */ } setTimeout(close, red ? 1400 : 3000); };
      var imgs = [].slice.call(el.querySelectorAll('img'));
      Promise.race([Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () { }) : 0; })), new Promise(function (r) { setTimeout(r, 900); })]).then(function () { requestAnimationFrame(function () { requestAnimationFrame(start); }); });
    });
  }
  window.yuroMatchIntro = yuroMatchIntro;

  /* ---- Fond de l'arène repris sur l'écran de fin (battle-transition.js, end-v2) ---- */
  (function () {
    var lastBg = '';
    var urlOf = function (el) { if (!el) return ''; var cs = getComputedStyle(el), src = cs.backgroundImage + ' ' + (cs.getPropertyValue('--ranked-arena-bg') || ''); var m = [], re = /url\((['"]?)(.*?)\1\)/g, x; while ((x = re.exec(src))) if (!/^data:image\/svg/.test(x[2])) m.push(x[2]); return m.length ? m[m.length - 1] : ''; };
    var paint = function () {
      var arena = document.querySelector('.story-arena'); if (arena) { var u0 = urlOf(arena); if (u0) lastBg = u0; }
      [].slice.call(document.querySelectorAll('.story-end-screen:not(.farm-end) .story-end-panel')).filter(function (p) { return !p.querySelector(':scope>.end-bg'); }).forEach(function (p) {
        p.insertAdjacentHTML('afterbegin', '<span class="end-bg" aria-hidden="true"></span>'); p.classList.add('end-v2'); if (lastBg) p.style.setProperty('--end-bg', 'url("' + lastBg.replace(/"/g, '%22') + '")');
      });
    };
    var q = 0; new MutationObserver(function () { if (!q) q = requestAnimationFrame(function () { q = 0; try { paint(); } catch (e) { /* rien */ } }); }).observe(document.body, { childList: true, subtree: true });
  })();
})();
