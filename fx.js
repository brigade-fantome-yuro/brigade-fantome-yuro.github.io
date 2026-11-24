// Cinématiques des techniques du jeu YURO (modules d'effets du jeu, repris avec l'accord du développeur).
globalThis.__yuroBundleError=globalThis.__yuroBundleError||function(e,f){try{console.warn('[fx]',f,e&&e.message)}catch(_){}};
/* effects.js */
globalThis.__yuroSkip=0;
let packSceneTimer=null,packSceneVersion=0;
function applyMotionPreference(){document.documentElement.dataset.motion=reducedMotion()?'off':'on';const b=$('motionToggle');if(!b)return;b.setAttribute('aria-pressed',String(state.motion));b.setAttribute('aria-label',state.motion?'Désactiver les animations décoratives':'Activer les animations décoratives');b.querySelector('.motion-label').textContent=state.motion?'Effets activés':'Effets désactivés';}
if(!globalThis.__yuroSkip)try{$('motionToggle')?.remove();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{applyMotionPreference();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
let tiltFrame=0,tiltTarget=null,tiltPoint=null,tiltBounds=null;
let cardTiltSprings;
if(!globalThis.__yuroSkip)try{cardTiltSprings=new Map();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
let cardSpringFrame=0,cardSpringTime=0;
function writeCardTilt(target,s){const x=s.x,y=s.y;target.style.setProperty('--rx',(-y*28.57)+'deg');target.style.setProperty('--ry',(x*28.57)+'deg');target.style.setProperty('--background-x',(50+x*26)+'%');target.style.setProperty('--background-y',(50+y*34)+'%');target.style.setProperty('--mx',((x+.5)*88+6)+'%');target.style.setProperty('--my',((y+.5)*88+6)+'%');target.style.setProperty('--foil-pointer-x',String(x+.5));target.style.setProperty('--foil-pointer-y',String(y+.5));target.style.setProperty('--pointer-from-center',String(Math.min(1,Math.hypot(x,y)*1.414)));}
function clearCardTilt(target){if(typeof archiveCardSprings!=='undefined'){const archived=archiveCardSprings.get(target);if(archived)clearTimeout(archived.timer);archiveCardSprings.delete(target);}target.classList.remove('is-spring-tilt','is-tilt-active');for(const property of ['--rx','--ry','--mx','--my','--pointer-from-center','--foil-pointer-x','--foil-pointer-y'])target.style.removeProperty(property);cardTiltSprings.delete(target);}
function stepCardSprings(now){cardSpringFrame=0;const dt=cardSpringTime?Math.min(.032,Math.max(.001,(now-cardSpringTime)/1000)):1/60;cardSpringTime=now;for(const [target,s] of cardTiltSprings){if(!target.isConnected||reducedMotion()){clearCardTilt(target);continue;}const steps=Math.ceil(dt/(1/120)),h=dt/steps,k=s.returning?130:260,damping=s.returning?21:27;for(let i=0;i<steps;i++)for(const axis of ['x','y']){const velocity=axis==='x'?'vx':'vy',goal=axis==='x'?s.tx:s.ty;s[velocity]+=(k*(goal-s[axis])-damping*s[velocity])*h;s[axis]+=s[velocity]*h;}writeCardTilt(target,s);const settled=Math.abs(s.x-s.tx)+Math.abs(s.y-s.ty)<.0003&&Math.abs(s.vx)+Math.abs(s.vy)<.002;if(settled){if(s.returning)clearCardTilt(target);else{s.x=s.tx;s.y=s.ty;s.vx=s.vy=0;writeCardTilt(target,s);s.sleeping=true;}}}if([...cardTiltSprings.values()].some(s=>!s.sleeping||s.returning))cardSpringFrame=requestAnimationFrame(stepCardSprings);else cardSpringTime=0;}
function queueCardTilt(target,x,y,returning=false){let s=cardTiltSprings.get(target);if(!s){s={x:0,y:0,vx:0,vy:0};cardTiltSprings.set(target,s);}Object.assign(s,{tx:x,ty:y,returning,sleeping:false});target.classList.add('is-spring-tilt');if(!returning)target.classList.add('is-tilt-active');if(!cardSpringFrame){cardSpringTime=0;cardSpringFrame=requestAnimationFrame(stepCardSprings);}}
function applyPointerTilt(target,clientX,clientY,rect=target.getBoundingClientRect()){if(target.classList?.contains('reference-reveal-card'))return;if(reducedMotion()||!rect.width||!rect.height)return;const x=Math.min(1,Math.max(0,(clientX-rect.left)/rect.width)),y=Math.min(1,Math.max(0,(clientY-rect.top)/rect.height));const pack=target.classList?.contains('blue-booster-pack');const card=target.matches('.portrait-card,.detail-card,.reveal-card,.admin-preview-card,.yuro-material-surface,.wishlist-art');if(card){queueArchiveCardMotion(target,x,y);return;}target.style.setProperty('--rx',`${(.5-y)*(pack?42:card?26:8)}deg`);target.style.setProperty('--ry',`${(x-.5)*(pack?58:card?32:10)}deg`);target.style.setProperty('--pointer-from-center',String(Math.min(1,Math.hypot(x-.5,y-.5)*1.414)));target.style.setProperty('--foil-pointer-x',String(x));target.style.setProperty('--foil-pointer-y',String(y));target.style.setProperty('--mx',`${Math.max(6,Math.min(94,x*100))}%`);target.style.setProperty('--my',`${Math.max(6,Math.min(94,y*100))}%`);if(pack){target.style.setProperty('--tx',`${(x-.5)*24}px`);target.style.setProperty('--ty',`${(y-.5)*16}px`);target.style.setProperty('--rz',`${(x-.5)*7}deg`);}}
function insideTiltBounds(x,y,rect){return !!rect&&x>=rect.left&&x<=rect.left+rect.width&&y>=rect.top&&y<=rect.top+rect.height;}
function resetPointerTilt(target){if(!target)return;if(archiveCardSprings.has(target)){releaseArchiveCardMotion(target);if(tiltTarget===target){tiltTarget=null;tiltPoint=null;tiltBounds=null;}return;}if(cardTiltSprings.has(target)&&!reducedMotion()){queueCardTilt(target,0,0,true);if(tiltTarget===target){tiltTarget=null;tiltPoint=null;tiltBounds=null;}return;}clearCardTilt(target);target.classList.remove('is-tilt-active');for(const property of ['--rx','--ry','--mx','--my','--pointer-from-center','--foil-pointer-x','--foil-pointer-y','--tx','--ty','--rz'])target.style.removeProperty(property);if(tiltTarget===target){tiltTarget=null;tiltPoint=null;tiltBounds=null;}}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||reducedMotion())return;let target=event.target.closest?.('[data-tilt]');if(!target&&tiltTarget?.isConnected&&insideTiltBounds(event.clientX,event.clientY,tiltBounds))target=tiltTarget;if(!target||target.disabled){resetPointerTilt(tiltTarget);return;}if(target!==tiltTarget){resetPointerTilt(tiltTarget);tiltBounds=target.getBoundingClientRect();}tiltTarget=target;target.classList.add('is-tilt-active');tiltPoint={x:event.clientX,y:event.clientY};if(tiltFrame)return;tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;if(tiltTarget?.isConnected&&tiltPoint)applyPointerTilt(tiltTarget,tiltPoint.x,tiltPoint.y,tiltBounds);});},{passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerout',event=>{const target=event.target.closest?.('[data-tilt]');if(!target||target.contains(event.relatedTarget))return;if(event.relatedTarget&&target===tiltTarget&&insideTiltBounds(event.clientX,event.clientY,tiltBounds))return;resetPointerTilt(target);},{passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{window.addEventListener('blur',()=>resetPointerTilt(tiltTarget));
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{document.addEventListener('scroll',()=>resetPointerTilt(tiltTarget),{passive:true,capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{document.addEventListener('click',event=>{const button=event.target.closest('.btn,.chip,.nav-item,.round-button');if(!button||button.disabled||reducedMotion())return;const r=button.getBoundingClientRect(),dot=document.createElement('span');dot.className='press-ripple';dot.setAttribute('aria-hidden','true');dot.style.setProperty('--x',`${event.detail?event.clientX-r.left:r.width/2}px`);dot.style.setProperty('--y',`${event.detail?event.clientY-r.top:r.height/2}px`);button.append(dot);setTimeout(()=>dot.remove(),650);});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px 35px 0px'});function observeNewTiles(){for(const tile of document.querySelectorAll('.anime-tile:not([data-observed]),.booster-panel:not([data-observed])')){tile.dataset.observed='1';if(reducedMotion())continue;tile.classList.add('scroll-reveal');observer.observe(tile);}}const mutation=new MutationObserver(observeNewTiles);mutation.observe($('viewRoot'),{childList:true,subtree:true});observeNewTiles();}
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
function preparePackScene(){cancelPackScene();const dialog=$('packDialog');dialog.classList.add('staged');dialog.classList.remove('tearing');$('packStage').classList.remove('hidden');$('packStage').innerHTML=`<div class="pack-immersive-glow" aria-hidden="true"></div><div class="pack-tear-scene"><span class="pack-batch-label">${typeof packBatchCount!=='undefined'&&packBatchCount>1?`${packBatchCount} BOOSTERS · ${packBatchCount*5} CARTES`:'1 BOOSTER · 5 CARTES'}</span>${typeof openingPreviewHTML==='function'?openingPreviewHTML():''}<button id="tearPack" class="blue-booster-pack pack-to-open legendary-card ${typeof packOpeningId!=='undefined'&&packOpeningId==='halloween'?'halloween-multivers-pack':typeof packOpeningId!=='undefined'&&packOpeningId==='secret-dev'?'dev-secret-pack':typeof packOpeningId!=='undefined'&&packOpeningId==='eclipse'?'eclipse-pack':''}" data-tilt aria-label="Déchirer le booster : glisse sur la ligne ou clique pour ouvrir">${typeof openingPackHTML==='function'?openingPackHTML(typeof packOpeningId!=='undefined'?packOpeningId:'multivers'):'<span>YURO</span>'}<span class="tear-gesture" aria-hidden="true"><span class="tear-gesture-label">DÉCHIRE !</span><span class="tear-gesture-track"></span><span class="tear-gesture-hand">☝</span></span></button><p class="pack-tear-guide"><span>✂</span> Glisse sur la ligne ou clique sur le booster</p><span class="pack-tear-caption">Les deux gestes lancent la déchirure · Entrée fonctionne aussi</span></div>`;const pack=$('tearPack');let down=null,ignoreClick=false;pack.addEventListener('click',()=>{if(!ignoreClick)startPackScene();});pack.addEventListener('dragstart',event=>event.preventDefault());pack.addEventListener('pointerdown',event=>{event.preventDefault();const rect=pack.getBoundingClientRect();down={x:event.clientX,y:event.clientY,rect,seam:event.clientY<=rect.top+rect.height*.23};pack.setPointerCapture?.(event.pointerId);});pack.addEventListener('pointermove',event=>{if(!down||pack.disabled)return;if(!reducedMotion())applyPointerTilt(pack,event.clientX,event.clientY,down.rect);const dx=event.clientX-down.x,dy=event.clientY-down.y;if(Math.hypot(dx,dy)>12)ignoreClick=true;if(down.seam){pack.style.setProperty('--tear-direction',dx<0?-1:1);pack.style.setProperty('--rip-progress',Math.min(1,Math.abs(dx)/100));if(Math.abs(dx)>90){down=null;startPackScene();}}});const release=()=>{down=null;if(!pack.disabled)pack.style.setProperty('--rip-progress',0);setTimeout(()=>{ignoreClick=false;},0);};pack.addEventListener('pointerup',release);pack.addEventListener('pointercancel',release);}
function packOpeningCelebration(ids){const rarities=ids.map(id=>cardById(id)?.rarity);return rarities.some(r=>r==='Secret'||r==='Transcendant')?'royal':rarities.some(r=>['Légendaire','Mythique','Exclusive'].includes(r))?'lucky':'';}
function playPackOpeningCelebration(){const kind=packOpeningCelebration(currentPull);
 
 const pumpkin=typeof packOpeningId!=='undefined'&&packOpeningId==='hw26',dialog=$('packDialog');
 if(pumpkin){const terror=currentPull.some(id=>['Mythique','Secret','Transcendant'].includes(cardById(id)?.rarity));if(dialog)dialog.dataset.hwTerror=terror?'1':'';return terror;}
 if(!kind)return false;
 
 const stage=$('packStage'),pack=$('tearPack'),burst=document.createElement('div');burst.className='pf3 pf3-'+kind;burst.setAttribute('aria-hidden','true');
 burst.innerHTML='<i class="pf3-bloom"></i><i class="pf3-seam"></i>';setTimeout(()=>burst.remove(),1500);
 stage.append(burst);
 if(pack){const sr=stage.getBoundingClientRect(),pr=pack.getBoundingClientRect();burst.style.setProperty('--px',(pr.left+pr.width/2-sr.left)+'px');burst.style.setProperty('--py',(pr.top+pr.height*.45-sr.top)+'px');burst.style.setProperty('--pw',pr.width+'px');burst.style.setProperty('--ph',pr.height+'px');pack.classList.add('pf3-pack','pf3-pack-'+kind);setTimeout(()=>pack.classList.remove('pf3-pack','pf3-pack-'+kind),1500);}
 
 if(typeof playPackFortuneSound==='function')try{playPackFortuneSound(kind);}catch{}
 return false;}
function startPackScene(){const dialog=$('packDialog');if(dialog.classList.contains('tearing')||!dialog.classList.contains('staged'))return;dialog.classList.add('tearing');const fortune=playPackOpeningCelebration();if(fortune&&typeof playPackFortuneSound==='function')playPackFortuneSound(packOpeningCelebration(currentPull));if(typeof playPackTearSound==='function')playPackTearSound();$('tearPack').disabled=true;$('tearPack').style.setProperty('--rip-progress',1);const version=packSceneVersion;packSceneTimer=setTimeout(()=>{if(version!==packSceneVersion||!dialog.open)return;const emerging=dialog.querySelector?.('.pack-emerging-card'),from=emerging?.getBoundingClientRect();$('packStage').classList.add('hidden');dialog.classList.remove('staged','tearing');if(typeof beginPackReview==='function'){beginPackReview();const card=dialog.querySelector?.('#packCards .reveal-card');if(card&&from?.width&&!reducedMotion()&&card.animate){card.style.animation='none';card.style.transition='none';const to=card.getBoundingClientRect(),dx=from.left+from.width/2-to.left-to.width/2,dy=from.top+from.height/2-to.top-to.height/2;packFlow.busy=true;const animation=card.animate([{transform:`translate(${dx}px,${dy}px) scale(${from.width/to.width}) rotate(-5deg)`,opacity:1},{transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1}],{duration:850,easing:'cubic-bezier(.16,.8,.2,1)',fill:'both'});packFlow.animation=animation;animation.finished.then(()=>{if(packFlow.animation===animation){packFlow.animation=null;packFlow.busy=false;animation.cancel();card.style.removeProperty('animation');card.style.removeProperty('transition');card.classList.add('pack-arrived');}}).catch(()=>{});}}else $('keepCards').focus({preventScroll:true});},reducedMotion()?350:fortune?2600:1350);}
function cancelPackScene(){document.querySelectorAll('.pack-fortune').forEach(n=>n.remove());packSceneVersion++;clearTimeout(packSceneTimer);packSceneTimer=null;if(typeof cancelPackReview==='function')cancelPackReview();}
function cardRevealEffect(button,index){const card=cardById(currentPull[index]);if(['Commun','Rare','Épique'].includes(card?.rarity)&&typeof playRarityRevealSound==='function')playRarityRevealSound(card.rarity);if(['Légendaire','Mythique','Secret','Transcendant'].includes(card?.rarity)&&typeof playHighRarityRevealEffect==='function'){playHighRarityRevealEffect(button,card);return;}if(reducedMotion())return;if(typeof currentPull!=='undefined'&&index===currentPull.length-1){const burst=document.createElement('span');burst.className='final-card-burst';burst.setAttribute('aria-hidden','true');burst.innerHTML='<i></i><b>✦</b>';button.append(burst);button.animate?.([{scale:1},{scale:1.055,offset:.55},{scale:1}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'});setTimeout(()=>burst.remove(),900);}const particle=document.createElement('span');particle.className='reveal-particles';particle.setAttribute('aria-hidden','true');particle.innerHTML=Array.from({length:12},(_,i)=>{const angle=i/12*Math.PI*2,radius=50+(i%3)*14;return `<i style="--px:${Math.cos(angle)*radius}px;--py:${Math.sin(angle)*radius}px"></i>`}).join('');button.append(particle);setTimeout(()=>particle.remove(),950);}
let statObserver;
if(!globalThis.__yuroSkip)try{statObserver=new MutationObserver(entries=>{for(const entry of entries){const el=entry.target.nodeType===3?entry.target.parentElement:entry.target;if(!el?.matches?.('.stat strong')||reducedMotion())continue;el.classList.remove('counter-bump');requestAnimationFrame(()=>el.classList.add('counter-bump'));}});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{document.querySelectorAll('.stat strong').forEach(el=>statObserver.observe(el,{childList:true,characterData:true,subtree:true}));
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
if(!globalThis.__yuroSkip)try{document.addEventListener('dragstart',event=>{if(event.target.closest('.blue-booster-pack,.reveal-card'))event.preventDefault();});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
let archiveCardSprings;
if(!globalThis.__yuroSkip)try{archiveCardSprings=new Map();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}
let archiveCardFrame=0,archiveCardTime=0;
function queueArchiveCardMotion(target,x,y){let s=archiveCardSprings.get(target);if(!s){s={x:.5,y:.5,vx:0,vy:0,tx:x,ty:y,returning:false,timer:null};archiveCardSprings.set(target,s);}clearTimeout(s.timer);Object.assign(s,{tx:x,ty:y,returning:false});target.classList.add('archive-card-motion','is-tilt-active');if(!archiveCardFrame){archiveCardTime=0;archiveCardFrame=requestAnimationFrame(stepArchiveCardMotion);}}
function releaseArchiveCardMotion(target){const s=archiveCardSprings.get(target);if(!s)return;clearTimeout(s.timer);s.timer=setTimeout(()=>{s.returning=true;s.tx=.5;s.ty=.5;target.classList.remove('is-tilt-active');if(!archiveCardFrame){archiveCardTime=0;archiveCardFrame=requestAnimationFrame(stepArchiveCardMotion);}},500);}
function stepArchiveCardMotion(now){archiveCardFrame=0;const dt=archiveCardTime?Math.min(2,Math.max(.1,(now-archiveCardTime)/(1000/60))):1;archiveCardTime=now;let moving=false;for(const [target,s]of archiveCardSprings){if(!target.isConnected||reducedMotion()){clearTimeout(s.timer);archiveCardSprings.delete(target);target.classList.remove('archive-card-motion');continue;}const stiffness=s.returning?.01:.066,damping=s.returning?.06:.25;for(const axis of ['x','y']){const velocity=axis==='x'?'vx':'vy',goal=axis==='x'?s.tx:s.ty,delta=goal-s[axis];s[velocity]+=(stiffness*delta-damping*s[velocity])*dt;s[axis]+=s[velocity]*dt;}const x=Math.max(0,Math.min(1,s.x)),y=Math.max(0,Math.min(1,s.y));target.style.setProperty('--rx',((y*100-50)/3.5)+'deg');target.style.setProperty('--ry',(-(x*100-50)/3.5)+'deg');target.style.setProperty('--mx',(x*100)+'%');target.style.setProperty('--my',(y*100)+'%');target.style.setProperty('--background-x',(37+x*26)+'%');target.style.setProperty('--background-y',(33+y*34)+'%');target.style.setProperty('--pointer-from-center',String(Math.min(1,Math.hypot(x-.5,y-.5)*2)));target.style.setProperty('--foil-pointer-x',String(x));target.style.setProperty('--foil-pointer-y',String(y));const settled=Math.abs(s.x-s.tx)+Math.abs(s.y-s.ty)+Math.abs(s.vx)+Math.abs(s.vy)<.0003;if(!settled)moving=true;else if(s.returning){clearTimeout(s.timer);archiveCardSprings.delete(target);target.classList.remove('archive-card-motion');for(const key of ['--rx','--ry','--mx','--my','--background-x','--background-y','--pointer-from-center','--foil-pointer-x','--foil-pointer-y'])target.style.removeProperty(key);}}if(moving)archiveCardFrame=requestAnimationFrame(stepArchiveCardMotion);}
if(!globalThis.__yuroSkip)try{document.addEventListener('visibilitychange',()=>{document.documentElement.dataset.cardsPaused=document.hidden?'true':'false';if(!document.hidden)return;for(const target of [...archiveCardSprings.keys()]){clearCardTilt(target);target.classList.remove('archive-card-motion');for(const key of ['--background-x','--background-y'])target.style.removeProperty(key);}for(const target of [...cardTiltSprings.keys()])clearCardTilt(target);if(archiveCardFrame){cancelAnimationFrame(archiveCardFrame);archiveCardFrame=0;}if(cardSpringFrame){cancelAnimationFrame(cardSpringFrame);cardSpringFrame=0;}});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"effects.js");}

/* technique-audio.js */
globalThis.__yuroSkip=0;
let techniqueAudioPlaying;
if(!globalThis.__yuroSkip)try{techniqueAudioPlaying=new Set();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"technique-audio.js");}
let techniqueBufferURL,techniqueArrayURL;
if(!globalThis.__yuroSkip)try{techniqueBufferURL=new WeakMap();
techniqueArrayURL=new WeakMap();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"technique-audio.js");}
if(!globalThis.__yuroSkip)try{(function(){const f=window.fetch;if(typeof f!=='function')return;window.fetch=function(input){const url=typeof input==='string'?input:input?.url||'';const p=f.apply(this,arguments);if(!/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(url))return p;return p.then(r=>{const ab=r.arrayBuffer.bind(r);try{r.arrayBuffer=()=>ab().then(buf=>{techniqueArrayURL.set(buf,url);return buf;});}catch{}return r;});};
 const proto=(window.AudioContext||window.webkitAudioContext)?.prototype;const dec=proto?.decodeAudioData;if(!dec)return;proto.decodeAudioData=function(buf,...rest){const url=techniqueArrayURL.get(buf);const p=dec.call(this,buf,...rest);if(url&&p?.then)p.then(b=>{if(b)techniqueBufferURL.set(b,url);}).catch(()=>{});return p;};})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"technique-audio.js");}
function techniqueSpeed(){return typeof storySpeed==='number'&&storySpeed>0&&typeof storyAnimating!=='undefined'&&storyAnimating?storySpeed:1;}
function fadeTechniqueAudio(olderThan=-1){const audio=typeof gameAudio==='function'?gameAudio():null,now=audio?.currentTime||0,wall=performance.now()/1000;
 for(const entry of techniqueAudioPlaying){if(olderThan>=0&&wall-entry.wall<olderThan)continue;
  if(entry.el){const el=entry.el,v0=el.volume,t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/350);try{el.volume=v0*(1-k);}catch{}if(k<1)requestAnimationFrame(step);else{try{el.pause();el.removeAttribute('src');el.load();}catch{}}};step();}
  else{try{entry.gain.gain.cancelScheduledValues(now);entry.gain.gain.setValueAtTime(entry.gain.gain.value,now);entry.gain.gain.linearRampToValueAtTime(0,now+.35);entry.source.stop(now+.4);}catch{}}
  techniqueAudioPlaying.delete(entry);}}
function trackTechniqueAudio(source,gain){if(!source||!gain)return;fadeTechniqueAudio(.6);const audio=typeof gameAudio==='function'?gameAudio():null,speed=techniqueSpeed(),url=source.buffer&&techniqueBufferURL.get(source.buffer);
 if(speed!==1&&url&&audio){
  const startAt=audio.currentTime;let el;try{el=new Audio(url);el.loop=false;el.preservesPitch=true;setTimeout(()=>{try{if(!el.paused){el.pause();el.removeAttribute('src');el.load();}}catch{}},Math.min(20000,((source.buffer?.duration||8)/speed+1)*1000));el.mozPreservesPitch=true;el.webkitPreservesPitch=true;el.playbackRate=speed;el.volume=Math.max(0,Math.min(1,gain.gain.value||1));}catch{el=null;}
  if(el){try{gain.gain.cancelScheduledValues(audio.currentTime);gain.gain.setValueAtTime(0,audio.currentTime);source.stop(audio.currentTime+.05);}catch{}
   const entry={el,wall:performance.now()/1000};techniqueAudioPlaying.add(entry);el.addEventListener('ended',()=>techniqueAudioPlaying.delete(entry));
   const go=()=>{try{el.currentTime=Math.max(0,(source._offset||0)+(audio.currentTime-startAt)*speed);}catch{}el.play().catch(()=>{});};if(el.readyState>=1)go();else el.addEventListener('loadedmetadata',go,{once:true});return;}}
 const entry={source,gain,wall:performance.now()/1000};techniqueAudioPlaying.add(entry);source.addEventListener?.('ended',()=>techniqueAudioPlaying.delete(entry));}
if(!globalThis.__yuroSkip)try{for(const name of ['finishStoryAnimation','infinityFinishAnimation']){const original=globalThis[name];if(typeof original!=='function')continue;globalThis[name]=function(){fadeTechniqueAudio();return original.apply(this,arguments);};}
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"technique-audio.js");}

/* zawarudo.js */
globalThis.__yuroSkip=0;
let zaWarudoBuffer=null,zaWarudoLoading=null,zaWarudoSource=null,zaWarudoAudio=null;
let voicedZaWarudo,zaWarudoFile;
if(!globalThis.__yuroSkip)try{voicedZaWarudo=new WeakSet();
zaWarudoFile='https://yurocollection.fr/assets/dio-zawarudo.mp3';
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"zawarudo.js");}
function prepareZaWarudoVoice(){if(zaWarudoLoading)return zaWarudoLoading;const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.decodeAudioData||typeof fetch!=='function')return Promise.resolve(null);zaWarudoLoading=fetch(zaWarudoFile).then(r=>{if(!r.ok)throw Error('ZA WARUDO audio');return r.arrayBuffer();}).then(data=>audio.decodeAudioData(data)).then(buffer=>zaWarudoBuffer=buffer).catch(()=>{zaWarudoLoading=null;return null;});return zaWarudoLoading;}
function stopZaWarudoVoice(){try{zaWarudoSource?.stop();}catch{}zaWarudoSource=null;zaWarudoAudio?.pause();}
function playZaWarudoVoice(impact){if(!impact||voicedZaWarudo.has(impact)||!state.sound||document.hidden)return;voicedZaWarudo.add(impact);const audio=typeof gameAudio==='function'?gameAudio():null;stopZaWarudoVoice();if(audio?.createBufferSource&&zaWarudoBuffer){const start=()=>{if(!state.sound||document.hidden)return;try{const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=zaWarudoBuffer;gain.gain.value=1;source.connect(gain);gain.connect(audio.destination);source.onended=()=>{source.disconnect();gain.disconnect();};zaWarudoSource=source;source.start();try{const end=audio.currentTime+4.3/(storySpeed||1);gain.gain.setValueAtTime(1,Math.max(audio.currentTime,end-.3));gain.gain.linearRampToValueAtTime(0,end);source.stop(end+.05);}catch{}if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(source,gain);}catch{}};if(audio.state==='suspended')audio.resume().then(start).catch(()=>{});else start();return;}try{const Player=window.Audio||globalThis.Audio;zaWarudoAudio??=new Player(zaWarudoFile);zaWarudoAudio.preload='auto';zaWarudoAudio.currentTime=0;zaWarudoAudio.volume=1;zaWarudoAudio.play().catch(()=>{voicedZaWarudo.delete(impact);});}catch{voicedZaWarudo.delete(impact);}}
if(!globalThis.__yuroSkip)try{document.addEventListener('visibilitychange',()=>{if(document.hidden)stopZaWarudoVoice();});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"zawarudo.js");}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',event=>{const b=event.target?.closest?.('.zawarudo-skill');if(b&&!b.disabled){if(typeof gameAudio==='function')gameAudio();prepareZaWarudoVoice();}},{capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"zawarudo.js");}
const positionStoryEffectsBeforeZaWarudo=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeZaWarudo.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='zawarudo'){const arena=document.querySelector('.story-arena'),caster=arena?.querySelector('.uses-zawarudo'),dome=arena?.querySelector('.zw-dome');if(arena&&caster&&dome){const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect();dome.style.left=(c.left+c.width/2-a.left)+'px';dome.style.top=(c.top+c.height*.42-a.top)+'px';}playZaWarudoVoice(storyImpact);}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"zawarudo.js");}

/* rika.js */
globalThis.__yuroSkip=0;
let rikaBuffer=null,rikaLoading=null,rikaSource=null,rikaAudio=null;
let voicedRika,rikaVoiceFile;
if(!globalThis.__yuroSkip)try{voicedRika=new WeakSet();
rikaVoiceFile='https://yurocollection.fr/assets/yuta-rika.mp3';
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rika.js");}
function prepareRikaVoice(){if(rikaLoading)return rikaLoading;const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.decodeAudioData||typeof fetch!=='function')return Promise.resolve(null);rikaLoading=fetch(rikaVoiceFile).then(r=>{if(!r.ok)throw Error('Rika audio');return r.arrayBuffer();}).then(data=>audio.decodeAudioData(data)).then(buffer=>rikaBuffer=buffer).catch(()=>{rikaLoading=null;return null;});return rikaLoading;}
function playRikaVoice(impact){if(!impact||voicedRika.has(impact)||!state.sound||document.hidden)return;voicedRika.add(impact);const audio=typeof gameAudio==='function'?gameAudio():null;try{rikaSource?.stop();}catch{}if(audio?.createBufferSource&&rikaBuffer){const start=()=>{if(!state.sound||document.hidden)return;try{const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=rikaBuffer;gain.gain.value=1;source.connect(gain);gain.connect(audio.destination);source.onended=()=>{source.disconnect();gain.disconnect();};rikaSource=source;source.start();if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(source,gain);}catch{}};if(audio.state==='suspended')audio.resume().then(start).catch(()=>{});else start();return;}try{const Player=window.Audio||globalThis.Audio;rikaAudio??=new Player(rikaVoiceFile);rikaAudio.currentTime=0;rikaAudio.play().catch(()=>{voicedRika.delete(impact);});}catch{voicedRika.delete(impact);}}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',event=>{const b=event.target?.closest?.('.rika-skill');if(b&&!b.disabled){if(typeof gameAudio==='function')gameAudio();prepareRikaVoice();}},{capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rika.js");}
const positionStoryEffectsBeforeRika=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeRika.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='rika')playRikaVoice(storyImpact);else if(document.querySelector('.rika-skill'))prepareRikaVoice();}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rika.js");}
function rikaRingSVG(cls){return '<g class="rika-ring '+cls+'"><ellipse rx="34" ry="13" fill="none" stroke="url(#rikaSilver)" stroke-width="7"/><ellipse rx="34" ry="13" fill="none" stroke="#ffffffcc" stroke-width="1.6" transform="translate(0 -2.6) scale(.92)"/><circle cx="-6" cy="12.4" r="3.6" fill="#fff" stroke="#c9ced8" stroke-width="1"/><circle cx="-7" cy="11.4" r="1.1" fill="#bfe6ff"/></g>';}
function rikaLayoutBox(el,arena){let x=0,y=0,n=el;while(n&&n!==arena){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;if(n&&!arena.contains(n)&&n!==arena){const r=el.getBoundingClientRect(),a=arena.getBoundingClientRect();return {left:r.left-a.left,top:r.top-a.top,width:r.width,height:r.height};}}return {left:x,top:y,width:el.offsetWidth,height:el.offsetHeight};}
function drawRikaBond(){const arena=document.querySelector('.story-arena');if(!arena)return;arena.querySelector('.rika-bond')?.remove();const row=arena.querySelector('.story-team-row.players');if(!row)return;const fighters=[...row.querySelectorAll('.story-fighter')],yuta=fighters.find(f=>/^yuu?ta\b/i.test((f.querySelector('strong')?.textContent||'').trim())&&!f.classList.contains('is-rika')),ghost=row.querySelector('.rika-departing .story-fighter'),rika=ghost||fighters.find(f=>f.classList.contains('is-rika')&&!f.classList.contains('is-fainted'));if(!yuta||!rika)return;const mode=ghost?'is-breaking':storyAnimating&&storyImpact?.action==='rika'?'is-forming':'is-bound';const a=arena.getBoundingClientRect(),yb=rikaLayoutBox(yuta.querySelector('button')||yuta,arena),rb=rikaLayoutBox(rika.querySelector('button')||rika,arena);const top=Math.min(yb.top,rb.top),x1=yb.left+yb.width/2,y1=yb.top+4,x2=rb.left+rb.width/2,y2=rb.top+4,cx=(x1+x2)/2,cy=Math.max(26,top-Math.max(70,Math.abs(x2-x1)*.3)),mx=(x1+2*cx+x2)/4,my=Math.min((y1+2*cy+y2)/4,top-30);const svg='<svg class="rika-bond '+mode+'" width="'+a.width+'" height="'+a.height+'" viewBox="0 0 '+a.width+' '+a.height+'" aria-hidden="true"><defs><linearGradient id="rikaSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c9ced8"/><stop offset=".55" stop-color="#f7f8fb"/><stop offset=".8" stop-color="#8e95a3"/><stop offset="1" stop-color="#e9ecf2"/></linearGradient><clipPath id="rikaHalfL"><rect x="-60" y="-40" width="58" height="80"/></clipPath><clipPath id="rikaHalfR"><rect x="2" y="-40" width="58" height="80"/></clipPath></defs><path class="rika-thread" pathLength="1" d="M'+x1+' '+y1+' Q'+cx+' '+cy+' '+x2+' '+y2+'"/><g transform="translate('+mx+' '+my+')"><circle class="rika-ring-glow" r="46"/>'+(mode==='is-breaking'?'<g class="rika-half l" clip-path="url(#rikaHalfL)">'+rikaRingSVG('')+'</g><g class="rika-half r" clip-path="url(#rikaHalfR)">'+rikaRingSVG('')+'</g><g class="rika-crack"><path d="M-4 -22 L2 -6 L-3 2 L4 22"/></g>':rikaRingSVG('whole'))+'</g></svg>';arena.insertAdjacentHTML('beforeend',svg);}
const positionStoryEffectsBeforeRikaBond=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeRikaBond.apply(this,arguments);try{drawRikaBond();}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rika.js");}
if(!globalThis.__yuroSkip)try{addEventListener('resize',()=>{try{if(document.querySelector('.rika-bond'))drawRikaBond();}catch{}});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rika.js");}

/* madara.js */
globalThis.__yuroSkip=0;
let madaraVoices,voicedMadara;
if(!globalThis.__yuroSkip)try{madaraVoices={rinnegan:{file:'https://yurocollection.fr/assets/madara-rinnegan.mp3'},fullpower:{file:'https://yurocollection.fr/assets/madara-fullpower.mp3'}};
voicedMadara=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"madara.js");}
function prepareMadaraVoice(kind){const v=madaraVoices[kind];if(!v||v.loading)return v?.loading;const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.decodeAudioData||typeof fetch!=='function')return null;v.loading=fetch(v.file).then(r=>{if(!r.ok)throw Error('Madara audio');return r.arrayBuffer();}).then(d=>audio.decodeAudioData(d)).then(b=>v.buffer=b).catch(()=>{v.loading=null;return null;});return v.loading;}
function playMadaraVoice(kind,impact){const v=madaraVoices[kind];if(!v||!impact||voicedMadara.has(impact)||!state.sound||document.hidden)return;voicedMadara.add(impact);const audio=typeof gameAudio==='function'?gameAudio():null;try{v.source?.stop();}catch{}if(audio?.createBufferSource&&v.buffer){const start=()=>{if(!state.sound||document.hidden)return;try{const s=audio.createBufferSource(),g=audio.createGain();s.buffer=v.buffer;g.gain.value=1;s.connect(g);g.connect(audio.destination);s.onended=()=>{s.disconnect();g.disconnect();};v.source=s;s.start();if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};if(audio.state==='suspended')audio.resume().then(start).catch(()=>{});else start();return;}try{const Player=window.Audio||globalThis.Audio;v.audio??=new Player(v.file);v.audio.currentTime=0;v.audio.play().catch(()=>voicedMadara.delete(impact));}catch{voicedMadara.delete(impact);}}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',event=>{const b=event.target?.closest?.('.rinnegan-skill,.fullpower-skill');if(b&&!b.disabled){if(typeof gameAudio==='function')gameAudio();prepareMadaraVoice(b.classList.contains('rinnegan-skill')?'rinnegan':'fullpower');}},{capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"madara.js");}
const positionStoryEffectsBeforeMadara=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeMadara.apply(this,arguments);try{if(storyAnimating&&['rinnegan','fullpower'].includes(storyImpact?.action))playMadaraVoice(storyImpact.action,storyImpact);if(document.querySelector('.rinnegan-skill'))prepareMadaraVoice('rinnegan');if(document.querySelector('.fullpower-skill'))prepareMadaraVoice('fullpower');}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"madara.js");}

/* akaza.js */
globalThis.__yuroSkip=0;
const akazaFlakeCache={};
function akazaFlakeSVG(cls='ak'){if(akazaFlakeCache[cls])return akazaFlakeCache[cls];const hex=(x,y,r)=>'<polygon points="'+Array.from({length:6},(_,i)=>{const a=Math.PI/3*i+Math.PI/6;return (x+r*Math.cos(a)).toFixed(1)+','+(y+r*Math.sin(a)).toFixed(1);}).join(' ')+'"/>';const br=(y,len,side)=>{const a=(side*60-90)*Math.PI/180,x2=len*Math.cos(a+Math.PI/2*0)*0+Math.sin(side*Math.PI/3)*len,y2=y-Math.cos(Math.PI/3)*len;return '<path d="M0 '+y+' L'+x2.toFixed(1)+' '+y2.toFixed(1)+'"/>'+hex(x2,y2,len>16?4.6:3.4);};let arm='<path d="M0 -14 L0 -88"/>'+hex(0,-93,6.5)+hex(0,-50,4.2);for(const [y,l] of [[-28,24],[-48,19],[-68,14]])for(const s of [-1,1])arm+=br(y,l,s);arm+='<path d="M-6 -80 L0 -74 L6 -80"/>';let g='';for(let k=0;k<6;k++)g+='<g transform="rotate('+k*60+')">'+arm+'</g>';const svg='<svg class="'+cls+'-svg" viewBox="-104 -104 208 208" aria-hidden="true"><g class="'+cls+'-glow">'+g+hex(0,0,13)+hex(0,0,7)+'<circle r="3"/></g><g class="'+cls+'-line">'+g+hex(0,0,13)+hex(0,0,7)+'<circle r="3"/></g></svg>';return akazaFlakeCache[cls]=svg;}
const positionStoryEffectsBeforeAkaza=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeAkaza.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='akaza'){const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.ak-stage'),caster=arena?.querySelector('.uses-akaza>button');if(stage&&caster){const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect();stage.style.setProperty('--ax',(c.left+c.width/2-a.left)+'px');stage.style.setProperty('--ay',(c.top+c.height/2-a.top)+'px');}}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"akaza.js");}

/* cid.js */
globalThis.__yuroSkip=0;
const ATOMIC_LEN=7.6;
let atomicVoice,voicedAtomic;
if(!globalThis.__yuroSkip)try{atomicVoice={file:'https://yurocollection.fr/assets/cid-atomic.mp3'};
voicedAtomic=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"cid.js");}
function atomicStageHTML(){
  const streaks=Array.from({length:16},(_,i)=>'<i style="--x:'+((i*61)%100)+'%;--d:'+((i*137)%900)+'ms;--h:'+(40+(i*53)%55)+'%"></i>').join('');
  const rocks=Array.from({length:12},(_,i)=>{const a=(i/12)*Math.PI*2+.3,r=90+(i*37)%70;return '<i style="--dx:'+Math.round(Math.cos(a)*r)+'px;--dy:'+Math.round(Math.sin(a)*r*.7-40)+'px;--rot:'+((i*97)%360)+'deg;--s:'+(7+(i*5)%9)+'px"></i>';}).join('');
  return '<div class="atom-stage" aria-hidden="true"><b class="atom-tint"></b><div class="atom-charge"><div class="atom-streaks">'+streaks+'</div><div class="atom-halo"><i></i><i></i></div><div class="atom-ribbons"><span style="--a:-18deg"><i></i></span><span style="--a:24deg"><i></i></span><span style="--a:72deg"><i></i></span></div></div><b class="atom-speed"></b><b class="atom-white"></b><div class="atom-blast"><b class="atom-dome"></b><b class="atom-core"></b><i class="atom-col c1"></i><i class="atom-col c2"></i><i class="atom-col c3"></i><span class="atom-rocks">'+rocks+'</span></div></div>';
}
function prepareAtomicVoice(){if(atomicVoice.loading)return atomicVoice.loading;const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.decodeAudioData||typeof fetch!=='function')return null;atomicVoice.loading=fetch(atomicVoice.file).then(r=>{if(!r.ok)throw Error('Atomic audio');return r.arrayBuffer();}).then(d=>audio.decodeAudioData(d)).then(b=>atomicVoice.buffer=b).catch(()=>{atomicVoice.loading=null;return null;});return atomicVoice.loading;}
function playAtomicVoice(impact){if(!impact||voicedAtomic.has(impact)||!state.sound||document.hidden)return;voicedAtomic.add(impact);const audio=typeof gameAudio==='function'?gameAudio():null,offset=0;try{atomicVoice.source?.stop();}catch{}
  if(audio?.createBufferSource&&atomicVoice.buffer){const start=()=>{if(!state.sound||document.hidden)return;try{const s=audio.createBufferSource(),g=audio.createGain();s.buffer=atomicVoice.buffer;g.gain.value=1;s.connect(g);g.connect(audio.destination);s.onended=()=>{s.disconnect();g.disconnect();};atomicVoice.source=s;s.start(0,offset);const end=audio.currentTime+ATOMIC_LEN;g.gain.setValueAtTime(1,Math.max(audio.currentTime,end-.35));g.gain.linearRampToValueAtTime(0,end);s.stop(end+.05);if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};if(audio.state==='suspended')audio.resume().then(start).catch(()=>{});else start();return;}
  try{const Player=window.Audio||globalThis.Audio;atomicVoice.audio??=new Player(atomicVoice.file);atomicVoice.audio.currentTime=offset;atomicVoice.audio.play().catch(()=>voicedAtomic.delete(impact));}catch{voicedAtomic.delete(impact);}}
if(!globalThis.__yuroSkip)try{document.addEventListener('visibilitychange',()=>{if(document.hidden){try{atomicVoice.source?.stop();}catch{}atomicVoice.audio?.pause();}});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"cid.js");}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',event=>{const b=event.target?.closest?.('.atomic-skill');if(b&&!b.disabled){if(typeof gameAudio==='function')gameAudio();prepareAtomicVoice();}},{capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"cid.js");}
const positionStoryEffectsBeforeAtomic=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeAtomic.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='atomic'){playAtomicVoice(storyImpact);const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.atom-stage'),caster=arena?.querySelector('.uses-atomic>button'),foes=[...(arena?.querySelectorAll('[data-fighter-side="enemy"]>button')||[])];if(arena&&stage){const a=arena.getBoundingClientRect();if(caster){const c=caster.getBoundingClientRect();stage.style.setProperty('--cx',(c.left+c.width/2-a.left)+'px');stage.style.setProperty('--cy',(c.top+c.height/2-a.top)+'px');}if(foes.length){const r=foes.map(f=>f.getBoundingClientRect()),l=Math.min(...r.map(x=>x.left)),rt=Math.max(...r.map(x=>x.right)),t=Math.min(...r.map(x=>x.top)),bt=Math.max(...r.map(x=>x.bottom));stage.style.setProperty('--ex',((l+rt)/2-a.left)+'px');stage.style.setProperty('--ey',((t+bt)/2-a.top)+'px');stage.style.setProperty('--ew',Math.max(160,rt-l+60)+'px');}}}else if(document.querySelector('.atomic-skill'))prepareAtomicVoice();}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"cid.js");}

/* vampire.js */
globalThis.__yuroSkip=0;
const vampireBatPath='M0 6C3 2 6 2 8 5C9 3 10 3 11 5C12 3 13 3 14 5C16 2 19 2 22 6C19 5 17 7 16 9C14 8 12 9 11 11C10 9 8 8 6 9C5 7 3 5 0 6Z';
function vampireBatsHTML(){return Array.from({length:18},(_,i)=>{const a=-170+i*(160/17)+((i*37)%11-5),r=170+(i*53)%150,x=Math.round(Math.cos(a*Math.PI/180)*r),y=Math.round(Math.sin(a*Math.PI/180)*r*.9);return `<i style="--x:${x}px;--y:${y}px;--d:${(i*47)%260}ms;--s:${(.7+((i*29)%50)/100).toFixed(2)};--f:${180+(i*31)%120}ms"><svg viewBox="0 0 22 12"><path d="${vampireBatPath}"/></svg></i>`;}).join('');}
function vampireSealHTML(){const runes='CROMWELL · RESTRICTION LEVEL ZERO · RELEASE · CROMWELL · APPROVED · ';const hex=[0,1,2,3,4,5].map(k=>{const a=(k*60-90)*Math.PI/180;return [50+38*Math.cos(a),50+38*Math.sin(a)];});const tri=i=>[0,2,4].map(k=>hex[(k+i)%6].map(v=>v.toFixed(1)).join(',')).join(' ');return `<span class="vp-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="vpRunes" d="M50 50 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><circle cx="50" cy="50" r="48" class="o"/><circle cx="50" cy="50" r="40" class="o"/><text><textPath href="#vpRunes">${runes}</textPath></text><polygon points="${tri(0)}"/><polygon points="${tri(1)}"/><circle cx="50" cy="50" r="12" class="o"/></svg></span>`;}
function vampireCasterHTML(){return `${vampireSealHTML()}<span class="vp-eye" aria-hidden="true"><svg viewBox="0 0 120 50"><defs><radialGradient id="vpIris" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe08a"/><stop offset=".35" stop-color="#ff2d45"/><stop offset=".8" stop-color="#7a0010"/><stop offset="1" stop-color="#2a0005"/></radialGradient><clipPath id="vpLid"><path d="M4 25 Q60 -10 116 25 Q60 60 4 25Z"/></clipPath></defs><g clip-path="url(#vpLid)"><rect width="120" height="50" fill="#1a0003"/><circle cx="60" cy="25" r="19" fill="url(#vpIris)"/><ellipse cx="60" cy="25" rx="3.2" ry="15" fill="#000"/><circle cx="54" cy="18" r="3" fill="#fff" opacity=".8"/></g><path d="M4 25 Q60 -10 116 25 Q60 60 4 25Z" fill="none" stroke="#ff6b7a" stroke-width="2"/></svg></span><span class="vp-aura" aria-hidden="true"><i></i><b></b></span><span class="vp-bats" aria-hidden="true">${vampireBatsHTML()}</span><span class="arise-manga-bubble vampire-bubble" role="status"><small>吸血鬼</small><b>VAMPIRE</b></span>`;}
function vampireGunSVG(kind){const silver=kind==='casull',body=silver?'url(#vpSilver)':'url(#vpBlack)',ink=silver?'#2b2b31':'#cfd3da';return `<svg viewBox="0 0 160 52" class="vp-gun-svg"><defs><linearGradient id="vpSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6fa"/><stop offset=".45" stop-color="#b9bfca"/><stop offset=".55" stop-color="#8e95a2"/><stop offset="1" stop-color="#d9dde4"/></linearGradient><linearGradient id="vpBlack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f47"/><stop offset=".5" stop-color="#15181d"/><stop offset="1" stop-color="#2a2e35"/></linearGradient></defs><path d="M6 30 L18 26 L22 50 L8 52 Z" fill="#3b1f1a" stroke="#120806" stroke-width="1.2"/><path d="M14 8 H150 a4 4 0 0 1 4 4 V24 H14 Z" fill="${body}" stroke="#0d0e12" stroke-width="1.4"/><path d="M14 24 H96 V30 H14 Z" fill="${body}" stroke="#0d0e12" stroke-width="1.2"/><path d="M40 30 q4 10 14 10 h6 v-4 h-4 q-8 0 -10 -6 Z" fill="none" stroke="#0d0e12" stroke-width="2"/><rect x="150" y="13" width="6" height="6" rx="1" fill="#c47a3a"/><path d="M20 11 h22" stroke="${silver?'#fff':'#5b6270'}" stroke-width="1.4" opacity=".8"/><text x="60" y="20" font-family="Georgia,serif" font-style="italic" font-size="${silver?9:6.6}" fill="${ink}">${silver?'454 Casull AUTO':'Jesus Christ is in Heaven now'}</text><text x="60" y="28.5" font-family="Arial,sans-serif" font-size="3.4" fill="${ink}" opacity=".8">HELLSING ARMS WEAPON INDUSTRIALS</text></svg>`;}
function vampireStageHTML(){return `<div class="vp-stage" aria-hidden="true"><b class="vp-tint"></b><b class="vp-moon"></b><b class="vp-bars"></b><span class="vp-swarm">${Array.from({length:12},(_,i)=>{const ang=i/12*Math.PI*2,r=34+(i*17)%30;return `<i style="--ox:${Math.round(Math.cos(ang)*r)}px;--oy:${Math.round(Math.sin(ang)*r*.7)}px;--d:${(i*53)%300}ms;--f:${150+(i*29)%110}ms"><svg viewBox="0 0 22 12"><path d="${vampireBatPath}"/></svg></i>`;}).join('')}</span><span class="vp-ring r1"></span><span class="vp-ring r2"></span><span class="vp-claw"><i></i><i></i><i></i></span><div class="vp-gun casull">${vampireGunSVG('casull')}<b class="vp-flash"></b><b class="vp-smoke"></b><b class="vp-casing"></b></div><div class="vp-gun jackal">${vampireGunSVG('jackal')}<b class="vp-flash"></b><b class="vp-smoke"></b><b class="vp-casing"></b></div><i class="vp-tracer t1"></i><i class="vp-tracer t2"></i><span class="vp-splat">${Array.from({length:14},(_,i)=>{const a=(i*137.5)%360*Math.PI/180,r=34+(i*23)%46;return `<i style="--sx:${Math.round(Math.cos(a)*r)}px;--sy:${Math.round(Math.sin(a)*r)}px;--z:${(.6+(i%5)*.18).toFixed(2)}"></i>`;}).join('')}<b></b><em></em></span></div>`;}
const positionStoryEffectsBeforeVampire=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeVampire.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='vampire'){const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.vp-stage'),caster=arena?.querySelector('.uses-vampire>button'),target=arena?.querySelector('.vampire-target>button');if(arena&&stage&&caster){const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect(),t=(target||caster).getBoundingClientRect(),cx=c.left+c.width/2-a.left,cy=c.top+c.height*.38-a.top,tx=t.left+t.width/2-a.left,ty=t.top+t.height*.45-a.top,gap=Math.min(150,c.width*1.05),W=a.width,clamp=x=>Math.max(70,Math.min(W-70,x));stage.style.setProperty('--tx',tx+'px');stage.style.setProperty('--cx',cx+'px');stage.style.setProperty('--cy',cy+'px');stage.style.setProperty('--ty',ty+'px');[['1',clamp(cx-gap),cy+c.height*.05],['2',clamp(cx+gap),cy+c.height*.18]].forEach(([n,gx,gy])=>{const ang=Math.atan2(ty-gy,tx-gx),dist=Math.hypot(tx-gx,ty-gy);stage.style.setProperty('--g'+n+'x',gx+'px');stage.style.setProperty('--g'+n+'y',gy+'px');stage.style.setProperty('--a'+n,ang+'rad');stage.style.setProperty('--d'+n,Math.max(0,dist-40)+'px');});}}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vampire.js");}

/* vampire-sfx.js */
globalThis.__yuroSkip=0;
let vampireSfxPlayed,vampireRelease;
if(!globalThis.__yuroSkip)try{vampireSfxPlayed=new WeakSet();
vampireRelease={file:'https://yurocollection.fr/assets/alucard-laugh.mp3',buffer:null,loading:null};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vampire-sfx.js");}
function prepareVampireRelease(){if(vampireRelease.buffer||vampireRelease.loading)return vampireRelease.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;vampireRelease.loading=fetch(vampireRelease.file).then(r=>{if(!r.ok)throw Error('alucard audio');return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>vampireRelease.buffer=b).catch(()=>{vampireRelease.loading=null;});return vampireRelease.loading;}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('.story-battle')&&document.querySelector('.story-battle .vampire-skill'))prepareVampireRelease();},{capture:true,passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vampire-sfx.js");}
function playVampireRelease(ctx,at,T){const go=buf=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.playbackRate.value=1;g.gain.value=.95;s.connect(g);g.connect(ctx.destination);const startAt=Math.max(ctx.currentTime,at),end=startAt+Math.min(buf.duration/s.playbackRate.value,T);g.gain.setValueAtTime(.95,Math.max(startAt,end-.4));g.gain.linearRampToValueAtTime(0,end);s.start(startAt);s.stop(end+.05);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};if(vampireRelease.buffer)go(vampireRelease.buffer);else{const p=prepareVampireRelease();if(p)p.then(b=>{if(b&&ctx.currentTime<at+.6)go(b);});}}
let vampireNoise=null,vampireVerb=null;
function vampireSfxBus(ctx){const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=8;comp.ratio.value=6;comp.attack.value=.002;comp.release.value=.18;const master=ctx.createGain();master.gain.value=.9;master.connect(comp);comp.connect(ctx.destination);
 if(!vampireVerb||vampireVerb.context!==ctx){const len=Math.floor(ctx.sampleRate*1.6),ir=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}vampireVerb={context:ctx,buffer:ir};}
 const verb=ctx.createConvolver();verb.buffer=vampireVerb.buffer;const wet=ctx.createGain();wet.gain.value=.32;verb.connect(wet);wet.connect(master);return {ctx,master,verb,nodes:[comp,master,verb,wet]};}
function vampireNoiseBuffer(ctx){if(vampireNoise&&vampireNoise.sampleRate===ctx.sampleRate)return vampireNoise;const n=ctx.sampleRate*2,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return vampireNoise=b;}
function vampireNoiseHit(bus,at,{dur=.2,vol=.5,type='lowpass',f0=2000,f1=400,q=.7,send=.6,attack=.002}={}){const {ctx,master,verb}=bus,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=vampireNoiseBuffer(ctx);f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,at);f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),at+dur);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+dur);src.connect(f);f.connect(g);g.connect(master);if(send){const s=ctx.createGain();s.gain.value=send;g.connect(s);s.connect(verb);}src.start(at,Math.random()*1.5);src.stop(at+dur+.05);if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(src,g);}
function vampireTone(bus,at,{type='sine',f0=120,f1=40,dur=.2,vol=.6,send=.2,attack=.004}={}){const {ctx,master,verb}=bus,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,at);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),at+dur);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(g);g.connect(master);if(send){const s=ctx.createGain();s.gain.value=send;g.connect(s);s.connect(verb);}o.start(at);o.stop(at+dur+.05);if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(o,g);}
function vampireBats(bus,at,dur){const {ctx,master}=bus,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();src.buffer=vampireNoiseBuffer(ctx);f.type='bandpass';f.frequency.value=1400;f.Q.value=.9;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.16,at+.15);g.gain.exponentialRampToValueAtTime(.0001,at+dur);lfo.frequency.value=17;depth.gain.setValueAtTime(.0001,at);depth.gain.exponentialRampToValueAtTime(.12,at+.15);depth.gain.exponentialRampToValueAtTime(.0001,at+dur);lfo.connect(depth);depth.connect(g.gain);src.connect(f);f.connect(g);g.connect(master);src.start(at);src.stop(at+dur+.05);lfo.start(at);lfo.stop(at+dur+.05);if(typeof trackTechniqueAudio==='function'){trackTechniqueAudio(src,g);}}
function playVampireSfx(impact){if(!impact||vampireSfxPlayed.has(impact)||!state.sound||document.hidden)return;vampireSfxPlayed.add(impact);const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource)return;
 const go=()=>{try{const bus=vampireSfxBus(ctx),bt=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),TT=3.8*bt,t0=ctx.currentTime+.02,at=sec=>t0+sec*bt;
  playVampireRelease(ctx,t0,TT);bus.master.gain.value=.7;
  vampireBats(bus,t0,Math.min(1.2,1.2*bt));vampireTone(bus,at(.05),{type:'sawtooth',f0:48,f1:36,dur:1.2*bt,vol:.07,send:.6});
  
  vampireNoiseHit(bus,at(.55),{dur:.75*bt,vol:.28,type:'bandpass',f0:300,f1:2200,q:1.4,send:1,attack:.6*bt});
  
  vampireTone(bus,at(1.45),{f0:70,f1:30,dur:1.6*bt,vol:.75,send:.6,attack:.09*bt});vampireNoiseHit(bus,at(1.4),{dur:1.1*bt,vol:.45,type:'lowpass',f0:900,f1:140,q:.6,send:1.3,attack:.12*bt});
  
  vampireNoiseHit(bus,at(1.55),{dur:1.9*bt,vol:.24,type:'bandpass',f0:420,f1:1300,q:2.4,send:1.1,attack:.3*bt});vampireTone(bus,at(1.55),{type:'sawtooth',f0:36,f1:58,dur:1.8*bt,vol:.08,send:.7});
  vampireNoiseHit(bus,at(3.05),{dur:.8*bt,vol:.2,type:'lowpass',f0:1200,f1:100,send:1,attack:.15*bt});
  setTimeout(()=>{for(const n of bus.nodes){try{n.disconnect();}catch{}}},(TT+2.5)*1000);}catch{}};
 if(ctx.state==='suspended')ctx.resume().then(go).catch(()=>{});else go();}
const positionStoryEffectsBeforeVampireSfx=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeVampireSfx.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='vampire'){playVampireSfx(storyImpact);const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.vp-stage'),foes=[...(arena?.querySelectorAll('[data-fighter-side="enemy"]>button')||[])].map(b=>b.getBoundingClientRect()).filter(r=>r.width>0);if(arena&&stage&&foes.length){const a=arena.getBoundingClientRect(),l=Math.min(...foes.map(r=>r.left)),r=Math.max(...foes.map(r=>r.right)),t=Math.min(...foes.map(r=>r.top)),b=Math.max(...foes.map(r=>r.bottom)),w=Math.max(240,Math.min(a.width-20,r-l+90));stage.style.setProperty('--ex',(l+r)/2-a.left+'px');stage.style.setProperty('--ey',t+(b-t)*.62-a.top+'px');stage.style.setProperty('--ew',w+'px');const caster=arena.querySelector('.uses-vampire>button');if(caster){const c=caster.getBoundingClientRect(),cx=c.left+c.width/2-a.left,cy=c.top+c.height*.3-a.top,ex=(l+r)/2-a.left,ey=t+(b-t)*.62-a.top;stage.style.setProperty('--cx',cx+'px');stage.style.setProperty('--cy',cy+'px');stage.style.setProperty('--rang',(Math.atan2(ey-cy,ex-cx)+Math.PI/2)+'rad');stage.style.setProperty('--rlen',Math.max(60,Math.hypot(ex-cx,ey-cy))+'px');}}}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vampire-sfx.js");}
if(!globalThis.__yuroSkip)try{if(typeof vampireStageHTML==='function'){vampireStageHTML=function(){const bats=Array.from({length:22},(_,i)=>`<i style="--k:${i};--ox:${((i*67)%120)-60}px;--oy:${((i*41)%90)-45}px;--ar:${((i*29)%70)-35}px;--dl:${(i*37)%420}ms;--s:${(.6+((i*13)%50)/100).toFixed(2)}"><svg viewBox="0 0 22 12"><path d="${vampireBatPath}"/></svg></i>`).join('');
 const ribbons=[-1,-.45,.1,.6,1.1].map((k,i)=>`<path class="vd-rib r${i}" pathLength="100" d="M0 0 C ${-150*k} -90, ${130*k} -190, 0 -260"/>`).join('');
 const moon=`<svg viewBox="0 0 200 200"><defs><radialGradient id="vdMoon" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffd9d0"/><stop offset=".35" stop-color="#ff5a52"/><stop offset=".75" stop-color="#9c0b1a"/><stop offset="1" stop-color="#3c0008"/></radialGradient><radialGradient id="vdCrater" cx="40%" cy="40%" r="60%"><stop offset="0" stop-color="#5c0610" stop-opacity=".55"/><stop offset="1" stop-color="#5c0610" stop-opacity="0"/></radialGradient><radialGradient id="vdHalo"><stop offset=".45" stop-color="#ff2d45" stop-opacity=".55"/><stop offset=".7" stop-color="#ff2d45" stop-opacity=".12"/><stop offset="1" stop-color="#ff2d45" stop-opacity="0"/></radialGradient><clipPath id="vdMoonClip"><circle cx="100" cy="100" r="54"/></clipPath></defs><circle cx="100" cy="100" r="98" fill="url(#vdHalo)"/><circle cx="100" cy="100" r="54" fill="url(#vdMoon)"/><g clip-path="url(#vdMoonClip)"><circle cx="78" cy="82" r="13" fill="url(#vdCrater)"/><circle cx="118" cy="70" r="8" fill="url(#vdCrater)"/><circle cx="122" cy="118" r="16" fill="url(#vdCrater)"/><circle cx="86" cy="126" r="7" fill="url(#vdCrater)"/><circle cx="104" cy="98" r="5" fill="url(#vdCrater)"/><circle cx="126" cy="96" r="58" fill="#1a0004" opacity=".55" transform="translate(30 -6)"/></g><circle cx="100" cy="100" r="54" fill="none" stroke="#ffb3a8" stroke-opacity=".35" stroke-width="1.2"/><circle cx="100" cy="100" r="62" fill="none" stroke="#ff2d45" stroke-opacity=".25" stroke-width="1" stroke-dasharray="2 5"/><path d="M60 70 Q72 58 86 62" stroke="#ffe3dc" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
 const star=[0,1,2,3,4].map(k=>{const t=(k*144-90)*Math.PI/180;return (100+70*Math.cos(t)).toFixed(1)+','+(100+70*Math.sin(t)).toFixed(1);}).join(' ');
 const runes=Array.from({length:30},(_,k)=>{const t=k/30*Math.PI*2,x=100+93*Math.cos(t),y=100+93*Math.sin(t),r=(t*180/Math.PI+90).toFixed(1),v=k%4;return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r})" d="${['M-3 -4 L0 4 L3 -4','M-3 -4 H3 M0 -4 V4','M-3 4 Q0 -6 3 4','M-3 0 H3 M-2 -4 L2 4'][v]}"/>`;}).join('');
 const glyph=(x,y,d)=>`<path transform="translate(${x} ${y})" d="${d}"/>`;
 const sigil=`<svg viewBox="0 0 200 200"><defs><path id="vdRunes" d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0"/></defs><g class="o">${runes}</g><circle cx="100" cy="100" r="86" class="o"/><circle cx="100" cy="100" r="72" class="o"/><text><textPath href="#vdRunes">· RESTRICTION LEVEL ZERO · CROMWELL APPROVED · RELEASE ·</textPath></text><polygon points="${star}" class="o"/><circle cx="100" cy="100" r="70" class="o" stroke-dasharray="1 3"/><g class="o">${glyph(70,72,'M-5 -5 H5 M0 -5 V5 M-4 5 H4')}${glyph(130,72,'M-5 5 L0 -5 L5 5 M-3 1 H3')}${glyph(66,118,'M0 -6 V6 M-5 -2 H5 M-4 6 H4')}${glyph(134,118,'M-5 -5 V5 M0 -5 V5 M5 -5 V5 M-6 0 H6')}${glyph(100,132,'M-4 6 L0 -2 L4 6 M0 -2 V-6')}</g></svg>`;
 return `<div class="vp-stage vd" aria-hidden="true"><b class="vd-tint"></b><span class="vd-moon">${moon}<i class="vd-mist m1"></i><i class="vd-mist m2"></i></span><span class="vd-bats">${bats}</span><span class="vd-ribwrap"><svg viewBox="-200 -265 400 270" preserveAspectRatio="none" class="vd-ribsvg">${ribbons}</svg></span><span class="vd-sigil">${sigil}</span>${vampireAoeHTML()}<b class="vd-flash"></b></div>`;};}
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vampire-sfx.js");}
function vampireAoeHTML(){
 
 const eye=(i)=>`<svg viewBox="0 0 64 32"><defs><radialGradient id="vdIris${i}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff6b5a"/><stop offset=".55" stop-color="#e0001f"/><stop offset=".85" stop-color="#8a0012"/><stop offset="1" stop-color="#3a0006"/></radialGradient></defs><g class="vd-lid"><path d="M3 16 Q32 -5 61 16 Q32 37 3 16Z" fill="#fff6f2" stroke="#160003" stroke-width="2.4" stroke-linejoin="round"/><circle cx="32" cy="16" r="9.5" fill="url(#vdIris${i})" stroke="#3a0006" stroke-width="1.2"/><circle cx="32" cy="16" r="3.4" fill="#0a0002"/><circle cx="29.2" cy="13.2" r="1.6" fill="#fff" opacity=".9"/></g></svg>`;
 const eyes=Array.from({length:10},(_,i)=>`<i style="--a0:${i*36}deg;--dl:${i*60}ms;--bl:${(i*197)%900}ms">${eye(i)}</i>`).join('');
 const shards=Array.from({length:18},(_,i)=>`<i style="--rot:${Math.round(i*20+((i*53)%14)-7)}deg;--len:${60+(i*41)%80}px;--dl:${(i*61)%300}ms;--dark:${i%3?0:1}"></i>`).join('');
 const specks=Array.from({length:22},(_,i)=>`<i style="--sx:${(i*53)%100}%;--h:${50+(i*37)%110}px;--dl:${(i*83)%800}ms"></i>`).join('');
 const arcs=[[100,0,1.1,0],[80,14,.85,1],[56,30,1.3,0],[32,44,1,1]].map(([w,y,sp,rev],i)=>`<i class="aoe-arc" style="--w:${w}%;--y:${y}%;--sp:${sp};--i:${i}"><b style="animation-direction:${rev?'reverse':'normal'}"></b></i>`).join('');
 const ink=Array.from({length:9},(_,i)=>`<i style="--rot:${i*40+((i*29)%20)}deg;--d:${70+(i*37)%60}px;--dl:${(i*47)%200}ms;--s:${(.6+((i*31)%50)/100).toFixed(2)}"></i>`).join('');
 return `<div class="vp-aoe" aria-hidden="true"><b class="aoe-dark"></b><div class="aoe-core"><i class="aoe-ground g1"></i><i class="aoe-ground g2"></i><i class="aoe-dome"></i><span class="aoe-arcs">${arcs}</span><i class="aoe-swirl"></i><i class="aoe-swirl s2"></i><span class="aoe-shards">${shards}</span><i class="aoe-pillar"></i></div><b class="aoe-flash"></b></div>`;}
if(!globalThis.__yuroSkip)try{if(typeof vampireCasterHTML==='function'){vampireCasterHTML=function(){const eye=(i)=>`<svg viewBox="0 0 64 32"><defs><radialGradient id="vcIris${i}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff6b5a"/><stop offset=".55" stop-color="#e0001f"/><stop offset=".85" stop-color="#8a0012"/><stop offset="1" stop-color="#3a0006"/></radialGradient></defs><g class="vd-lid"><path d="M3 16 Q32 -5 61 16 Q32 37 3 16Z" fill="#fff6f2" stroke="#160003" stroke-width="2.4" stroke-linejoin="round"/><circle cx="32" cy="16" r="9.5" fill="url(#vcIris${i})" stroke="#3a0006" stroke-width="1.2"/><circle cx="32" cy="16" r="3.4" fill="#0a0002"/><circle cx="29.2" cy="13.2" r="1.6" fill="#fff" opacity=".9"/></g></svg>`;
 
 const spots=[[-96,-74,1,-8],[88,-104,.85,10],[-118,26,.9,6],[110,8,1.05,-6],[-64,112,.8,12],[74,96,.9,-10]];
 const eyes=spots.map(([x,y,z,r],i)=>`<i style="--x:${x}px;--y:${y}px;--z:${z};--r:${r}deg;--dl:${[0,260,120,380,200,460][i]}ms;--bl:${(i*197)%900}ms">${eye(i)}</i>`).join('');
 return `<span class="vd-aura" aria-hidden="true"><i></i><b></b></span><span class="vd-eyes" aria-hidden="true">${eyes}</span><span class="arise-manga-bubble vampire-bubble" role="status"><small>吸血鬼</small><b>VAMPIRE</b></span>`;};}
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vampire-sfx.js");}

/* technique-art.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){let queued=false;
 function paint(){queued=false;if(!document.querySelector('.story-battle .story-actions'))return; 
 document.querySelectorAll(['skill','purple','rage','ultimate' ].flatMap(a=>['story','infinity','duel'].map(k=>'.story-battle [data-'+k+'-action="'+a+'"]')).join(',')).forEach(paintOne);}
 function paintOne(btn){const special=[...btn.classList].some(c=>/-skill$/.test(c));
 
 const of=btn.dataset.skillOf,own=of!=null&&/^\d+$/.test(of)?document.querySelector(['data-story-active','data-infinity-active','data-duel-unit'].map(a=>'.story-battle ['+a+'="'+of+'"] img').join(',')):null;
 const img=own||document.querySelector('.story-battle .story-fighter.is-active>button img')||document.querySelector('.story-battle :is([data-story-active],[data-infinity-active],[data-duel-unit])[aria-pressed="true"] img');const src=special&&(btn.dataset.art||img?.getAttribute('src'))||'';
  let art=btn.querySelector(':scope>.skill-art');if(!src){art?.remove();btn.classList.remove('has-skill-art');return;}
  if(!art){art=document.createElement('span');art.className='skill-art';art.setAttribute('aria-hidden','true');art.innerHTML='<img alt="" decoding="async">';btn.append(art);}
  const im=art.firstChild;if(im.getAttribute('src')!==src)im.setAttribute('src',src);btn.classList.add('has-skill-art');}
 const root=document.getElementById('viewRoot');if(root)new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(paint);}}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-pressed']});})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"technique-art.js");}

/* gojo-void.js */
globalThis.__yuroSkip=0;
let gojoVoice,gojoPlayed,GOJO_T;
if(!globalThis.__yuroSkip)try{gojoVoice={file:'https://yurocollection.fr/assets/gojo-domaine-v5.mp3',buffer:null,loading:null};
gojoPlayed=new WeakSet();
GOJO_T=11.4;
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"gojo-void.js");}
function prepareGojoVoice(){if(gojoVoice.buffer||gojoVoice.loading)return gojoVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;gojoVoice.loading=fetch(gojoVoice.file).then(r=>{if(!r.ok)throw Error('gojo audio');return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>gojoVoice.buffer=b).catch(()=>{gojoVoice.loading=null;});return gojoVoice.loading;}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('.story-battle')&&document.querySelector('.story-battle .void-skill'))prepareGojoVoice();},{capture:true,passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"gojo-void.js");}
function gojoSpeed(){return typeof storySpeed==='number'&&storySpeed>0?storySpeed:1;}
function playGojoVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,sp=1;
 const go=buf=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.playbackRate.value=1;g.gain.value=1;s.connect(g);g.connect(ctx.destination);const lag=Math.max(0,ctx.currentTime-t0);s.start(ctx.currentTime,lag*sp);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(gojoVoice.buffer)go(gojoVoice.buffer);else{const p=prepareGojoVoice();if(p)p.then(b=>{if(b&&ctx.currentTime<t0+1.5)go(b);});}};if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
function voidStageHTML(){
 const clouds=Array.from({length:9},(_,i)=>`<i style="--y:${12+(i*29)%76}%;--s:${(.7+((i*31)%70)/100).toFixed(2)};--dl:${(i*53)%260}ms"></i>`).join('');
 const ink=Array.from({length:16},(_,i)=>`<i style="--x:${(i*61)%100}%;--y:${(i*37)%40-20}px;--s:${(.5+((i*29)%80)/100).toFixed(2)};--dl:${(i*43)%380}ms"></i>`).join('');
 const inkRing=Array.from({length:14},(_,i)=>`<i style="--rot:${i*25.7+((i*17)%12)}deg;--d:${60+(i*41)%70}%;--s:${(.6+((i*23)%60)/100).toFixed(2)}"></i>`).join('');
 const streaks=Array.from({length:26},(_,i)=>`<i style="--rot:${(i*137.5)%360}deg;--dl:${-(i*97)%1000}ms;--len:${30+(i*29)%60}px"></i>`).join('');
 const orbit=Array.from({length:12},(_,i)=>`<i style="--a:${i*30}deg;--dl:${-(i*170)}ms"></i>`).join('');
 return `<div class="gv-stage" aria-hidden="true"><b class="gv-dim"></b><b class="gv-void"></b><span class="gv-ink">${inkRing}</span><span class="gv-warp"><i class="gvw-1"></i><i class="gvw-2"></i><i class="gvw-3"></i></span><span class="gv-streaks">${streaks}</span><b class="gv-core"></b><span class="gv-clouds">${clouds}</span><b class="gv-pop"></b><span class="gv-space"><i class="gvs-neb gvs-n1"></i><i class="gvs-neb gvs-n2"></i><i class="gvs-neb gvs-n3"></i></span><span class="gv-hole"><i class="gvh-halo"></i><i class="gvh-swirl"></i><i class="gvh-ring"></i><i class="gvh-ring gvh-r2"></i><i class="gvh-arc"></i><i class="gvh-core"></i><span class="gvh-orbit">${orbit}</span></span><span class="gv-band"><i class="gvb-band"></i>${ink}</span><b class="gv-flash f1"></b><b class="gv-flash f2"></b></div>`;}
const positionStoryEffectsBeforeGojo=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeGojo.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='infinityvoid'){if(!gojoPlayed.has(storyImpact)){gojoPlayed.add(storyImpact);if(state.sound)playGojoVoice();}
 const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.gv-stage');if(arena&&stage){const a=arena.getBoundingClientRect(),caster=arena.querySelector('.uses-void>button'),foes=[...arena.querySelectorAll('[data-fighter-side="enemy"]>button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width>0);
  if(caster){const c=caster.getBoundingClientRect();stage.style.setProperty('--ox',c.left+c.width/2-a.left+'px');stage.style.setProperty('--oy',c.top+c.height/2-a.top+'px');}
  if(foes.length){const l=Math.min(...foes.map(r=>r.left)),r=Math.max(...foes.map(r=>r.right)),t=Math.min(...foes.map(r=>r.top)),b=Math.max(...foes.map(r=>r.bottom));stage.style.setProperty('--ex',(l+r)/2-a.left+'px');stage.style.setProperty('--ey',(t+b)/2-a.top+'px');stage.style.setProperty('--ew',Math.max(260,Math.min(a.width*.9,r-l+120))+'px');}}}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"gojo-void.js");}

/* technique-flow.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 const TECH=new Set(['arise','timestop','zawarudo','rika','vampire','atomic','akaza','rinnegan','fullpower','infinityvoid','hollowpurple','legendary','rage','firearrow','cannon','haki','geass','enuma','moon','door','sun','almighty','vampiric','mui','future','mugetsu','domination','arsenal','neant','overlord','xebec','berserk','hunt','slime','zanka','swap','alter','darkblade','armor','titan']);
 let queued=null;
 function inTechnique(){return typeof storyAnimating!=='undefined'&&storyAnimating&&!(typeof storyAuto!=='undefined'&&storyAuto);}
 document.addEventListener('click',e=>{const b=e.target.closest?.('.story-battle [data-story-action],.story-battle [data-story-active],.story-battle [data-story-target]');if(!b||!inTechnique())return;
  e.preventDefault();e.stopImmediatePropagation();
  const attr=b.hasAttribute('data-story-action')?'data-story-action':b.hasAttribute('data-story-active')?'data-story-active':'data-story-target';queued={attr,value:b.getAttribute(attr)};
  document.querySelectorAll('.story-battle .is-queued').forEach(x=>x.classList.remove('is-queued'));b.classList.add('is-queued');
  if(typeof notify==='function'&&attr==='data-story-action'&&TECH.has(storyImpact?.action))notify('Action enregistrée : elle part à la fin de l’animation.');},true);
 const original=globalThis.finishStoryAnimation;
 if(typeof original==='function')globalThis.finishStoryAnimation=function(){const r=original.apply(this,arguments);const q=queued;queued=null;if(q)setTimeout(()=>{document.querySelector('.story-battle ['+q.attr+'="'+CSS.escape(q.value)+'"]')?.click();},60);return r;};
 
 let towerQueued=null;
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-infinity-action]');if(!b||typeof infinityPlayback==='undefined'||!infinityPlayback.animating||infinityPlayback.auto)return;e.preventDefault();e.stopImmediatePropagation();towerQueued=b.dataset.infinityAction;document.querySelectorAll('.is-queued').forEach(x=>x.classList.remove('is-queued'));b.classList.add('is-queued');},true);
 const towerFinish=globalThis.infinityFinishAnimation;
 if(typeof towerFinish==='function')globalThis.infinityFinishAnimation=function(){const r=towerFinish.apply(this,arguments);const q=towerQueued;towerQueued=null;if(q)setTimeout(()=>{if(!infinityPlayback.animating)document.querySelector('[data-infinity-action="'+CSS.escape(q)+'"]')?.click();},60);return r;};
 
 function stopIfLeft(){if(document.querySelector('.story-battle'))return;queued=null;if(typeof fadeTechniqueAudio==='function')fadeTechniqueAudio();}
 const root=document.getElementById('viewRoot');if(root){let t=0;new MutationObserver(()=>{if(t)return;t=requestAnimationFrame(()=>{t=0;stopIfLeft();});}).observe(root,{childList:true});}
 if(typeof switchView==='function'){const base=switchView;switchView=async function(...a){const r=await base.apply(this,a);stopIfLeft();return r;};}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof fadeTechniqueAudio==='function')fadeTechniqueAudio();});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"technique-flow.js");}

/* purple.js */
globalThis.__yuroSkip=0;
let purpleVoice,purplePlayed;
if(!globalThis.__yuroSkip)try{purpleVoice={file:'https://yurocollection.fr/assets/gojo-hollow-purple-v1.mp3',buffer:null,loading:null};
purplePlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"purple.js");}
function preparePurpleVoice(){if(purpleVoice.buffer||purpleVoice.loading)return purpleVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;purpleVoice.loading=fetch(purpleVoice.file).then(r=>{if(!r.ok)throw Error('purple audio');return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>purpleVoice.buffer=b).catch(()=>{purpleVoice.loading=null;});return purpleVoice.loading;}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('.story-battle')&&document.querySelector('.story-battle .purple-skill'))preparePurpleVoice();},{capture:true,passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"purple.js");}
function playPurpleVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,sp=1;
 const go=buf=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.playbackRate.value=1;s.connect(g);g.connect(ctx.destination);s.start(ctx.currentTime,Math.max(0,ctx.currentTime-t0)*sp);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(purpleVoice.buffer)go(purpleVoice.buffer);else{const p=preparePurpleVoice();if(p)p.then(b=>{if(b&&ctx.currentTime<t0+1.2)go(b);});}};if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
function purpleBolt(seed,len=120,steps=8){let x=0,y=0,d='M0 0',mid='';const st=len/steps;for(let i=1;i<=steps;i++){x+=st*(.7+((seed*7+i*13)%7)/10);y+=((seed*11+i*17)%25)-12;d+=` L${x.toFixed(1)} ${y}`;if(i===Math.ceil(steps/2))mid=`M${x.toFixed(1)} ${y}`;}const sign=seed%2?1:-1;let bx=0,by=0,b=mid;for(let i=1;i<=3;i++){bx+=st*.8;by+=sign*(6+((seed*5+i*7)%8));b+=` l${(st*.8).toFixed(1)} ${sign*(6+((seed*5+i*7)%8))}`;}return {d,b};}
function boltSVG(cls,i,len,style){const p=purpleBolt(i+1,len),q=purpleBolt(i+5,len);return `<svg class="${cls}" style="${style}" viewBox="0 -40 ${len+10} 80"><g class="bk1"><path class="g" d="${p.d} ${p.b}"/><path class="c" d="${p.d} ${p.b}"/></g><g class="bk2"><path class="g" d="${q.d} ${q.b}"/><path class="c" d="${q.d} ${q.b}"/></g></svg>`;}
function purpleStageHTML(){
 const bolts=Array.from({length:10},(_,i)=>boltSVG('hp-bolt',i,110+(i%3)*25,`--rot:${i*36+((i*23)%18)}deg;--dl:${(i*53)%300}ms;--fl:${(.26+(i%4)*.05).toFixed(2)}s;--w:${110+(i%3)*25}px`)).join('');
 const arcs=Array.from({length:7},(_,i)=>boltSVG('hp-arc',i+3,70+(i%2)*20,`--rot:${i*51}deg;--dl:${(i*41)%240}ms;--fl:${(.2+(i%3)*.05).toFixed(2)}s;--w:${70+(i%2)*20}px`)).join('');
 const tailSparks=Array.from({length:16},(_,i)=>`<i style="--y:${((i*37)%60)-30}px;--dl:${(i*67)%600}ms;--s:${(.5+((i*29)%60)/100).toFixed(2)}"></i>`).join('');
 const dust=Array.from({length:22},(_,i)=>`<i style="--a:${(i*137.5)%360}deg;--r:${40+(i*23)%70}px;--s:${(.5+((i*29)%70)/100).toFixed(2)};--dl:${(i*41)%400}ms"></i>`).join('');
 const shards=Array.from({length:14},(_,i)=>`<i style="--rot:${i*25.7}deg;--d:${80+(i*37)%90}px;--dl:${(i*29)%160}ms"></i>`).join('');
 const sparks=Array.from({length:8},(_,i)=>`<i class="${i%2?'sr':'sb'}" style="--a:${i*45}deg;--o:${58+(i%3)*12}px;--sp:${(.55+(i%4)*.12).toFixed(2)}"></i>`).join('');
 const sparks2=Array.from({length:26},(_,i)=>`<i style="--a:${(i*137.5)%360}deg;--d:${110+(i*41)%140}px;--dl:${(i*13)%90}ms"></i>`).join('');
 const smoke=Array.from({length:7},(_,i)=>`<i style="--x:${((i-3)*.26).toFixed(2)};--y:${((((i*37)%30)-15)/100).toFixed(2)};--s:${(.8+((i*53)%50)/100).toFixed(2)};--dl:${(i*23)%120}ms"></i>`).join('');
 return `<div class="hp-stage" aria-hidden="true"><b class="hp-dim"></b><span class="hp-anchor"><i class="hp-orb hp-blue"><b></b></i><i class="hp-orb hp-red"><b></b></i><b class="hp-implode"></b><b class="hp-merge"></b><b class="hp-shock"></b><b class="hp-shock s2"></b><span class="hp-purple"><i class="hp-glow"></i><i class="hp-core"></i><i class="hp-band hb-blue"></i><i class="hp-band hb-red"></i><i class="hp-swirl"></i><i class="hp-rim"></i></span><span class="hp-orbit">${sparks}</span><span class="hp-bolts">${bolts}</span><span class="hp-dust">${dust}</span></span><span class="hp-shot"><span class="hp-tail"><i class="ht-glow"></i><i class="ht-plasma"></i><i class="ht-blue"></i><i class="ht-red"></i><i class="ht-core"></i><span class="ht-sparks">${tailSparks}</span></span><i class="hp-ball"></i><span class="hp-arcs">${arcs}</span></span><i class="hp-scar"></i><b class="hp-flash"></b><b class="hp-invert"></b><span class="hp-boom"><i class="hp-crater"></i><i class="hp-rays"></i><i class="hp-dome"></i><i class="hp-blast"></i><i class="hp-core2"></i><i class="hp-ripple"></i><i class="hp-ripple r2"></i><i class="hp-ripple r3"></i><span class="hp-sparks">${sparks2}</span><span class="hp-smoke">${smoke}</span><i class="hp-wave"></i><i class="hp-wave w2"></i><i class="hp-wave w3"></i><span class="hp-shards">${shards}</span></span></div>`;}
const positionStoryEffectsBeforePurple=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforePurple.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='hollowpurple'){if(!purplePlayed.has(storyImpact)){purplePlayed.add(storyImpact);if(state.sound)playPurpleVoice();}
 const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.hp-stage');if(arena&&stage){const a=arena.getBoundingClientRect(),caster=arena.querySelector('.uses-purple>button'),foes=[...arena.querySelectorAll('[data-fighter-side="enemy"]>button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width>0);
  let gx=a.width/2,gy=a.height*.7,ex=a.width/2,ey=a.height*.25,ew=300;if(caster){const c=caster.getBoundingClientRect();gx=c.left+c.width/2-a.left;gy=c.top-a.top-Math.min(70,c.height*.35);}
  if(foes.length){const l=Math.min(...foes.map(r=>r.left)),r=Math.max(...foes.map(r=>r.right)),t=Math.min(...foes.map(r=>r.top)),b=Math.max(...foes.map(r=>r.bottom));ex=(l+r)/2-a.left;ey=(t+b)/2-a.top;ew=r-l;}
  const s=(k,v)=>stage.style.setProperty(k,v);s('--gx',gx+'px');s('--gy',gy+'px');s('--ex',ex+'px');s('--ey',ey+'px');s('--ew',Math.max(220,ew)+'px');s('--dx',ex-gx+'px');s('--dy',ey-gy+'px');s('--ang',Math.atan2(ey-gy,ex-gx)+'rad');s('--dist',Math.hypot(ex-gx,ey-gy)+'px');}}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"purple.js");}

/* broly.js */
globalThis.__yuroSkip=0;
const LEGEND_ART='https://yurocollection.fr/assets/broly-legendaire.webp';
let legendVoice,legendPlayed;
if(!globalThis.__yuroSkip)try{legendVoice={file:'https://yurocollection.fr/assets/broly-legendaire-v1.mp3',buffer:null,loading:null};
legendPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"broly.js");}
function prepareLegendVoice(){if(legendVoice.buffer||legendVoice.loading)return legendVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;legendVoice.loading=fetch(legendVoice.file).then(r=>{if(!r.ok)throw Error('broly audio');return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>legendVoice.buffer=b).catch(()=>{legendVoice.loading=null;});return legendVoice.loading;}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('.story-battle')&&document.querySelector('.story-battle .legend-skill'))prepareLegendVoice();},{capture:true,passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"broly.js");}
function playLegendVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime;
 const go=buf=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s.start(ctx.currentTime,Math.max(0,ctx.currentTime-t0));s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(legendVoice.buffer)go(legendVoice.buffer);else{const p=prepareLegendVoice();if(p)p.then(b=>{if(b&&ctx.currentTime<t0+1)go(b);});}};if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
function legendBolt(seed){let x=0,y=0,d='M0 0';for(let i=1;i<=6;i++){y-=9+((seed*7+i*5)%7);x+=((seed*13+i*11)%17)-8;d+=` L${x} ${y}`;}return d;}
function legendAuraPath(seed){const rnd=i=>((Math.sin(seed*91.7+i*12.9898)*43758.5453)%1+1)%1;const W=y=>{const t=(300-y)/270;return 34+52*Math.sin(Math.min(1,t*1.15)*Math.PI*.82)+(t>.7?-(t-.7)*130:0);};
 const L=[],R=[];for(let i=0;i<=18;i++){const y=292-i*14.5,w=Math.max(16,W(y));const tip=18+rnd(i)*22,up=16+rnd(i+40)*14;L.push(`${(100-w).toFixed(1)} ${y.toFixed(1)}`,`${(100-w-tip).toFixed(1)} ${(y-up).toFixed(1)}`);R.unshift(`${(100+w+tip*(0.8+rnd(i+80)*.4)).toFixed(1)} ${(y-up).toFixed(1)}`,`${(100+w).toFixed(1)} ${y.toFixed(1)}`);}
 const C=[];for(let k=0;k<7;k++){const x=74+k*8.7,h=20+rnd(k+120)*28+(k===3?18:0);C.push(`${x.toFixed(1)} ${(30-h).toFixed(1)}`,`${(x+4.3).toFixed(1)} 26`);}
 return 'M100 300 L'+[...L,...C,...R].join(' L')+' Z';}
function legendAuraHTML(){return `<span class="lg-ssj" aria-hidden="true"><svg viewBox="0 -20 200 330" preserveAspectRatio="none"><defs><radialGradient id="lgAuraFill" cx="50%" cy="58%" r="60%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#f4ffec" stop-opacity=".85"/><stop offset=".86" stop-color="#c6ffa8" stop-opacity=".6"/><stop offset="1" stop-color="#86ff52" stop-opacity=".45"/></radialGradient></defs><path class="a1" d="${legendAuraPath(1)}"/><path class="a2" d="${legendAuraPath(2)}"/><path class="a3" d="${legendAuraPath(3)}"/></svg></span><span class="lg-pebbles" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--px:${[-62,58,-70,66,-48,44,-30,30][i]}%;--py:${[18,26,52,60,82,88,96,4][i]}%;--ps:${(.55+((i*37)%50)/100).toFixed(2)};--pd:${(1.6+(i%3)*.5).toFixed(1)}s;--pdl:-${(i*.37).toFixed(2)}s;--pr:${(i*47)%360}deg"></i>`).join('')}</span>`;}
function legendStageHTML(){return '<div class="lg-stage" aria-hidden="true"><b class="lg-dim"></b><b class="lg-flash"></b></div>';}
function legendFighterFX(){
 const beams=Array.from({length:7},(_,i)=>`<i style="--x:${-48+i*16}%;--w:${8+((i*7)%4)*5}%;--dl:${(i*110)%500}ms;--fl:${(.18+(i%3)*.05).toFixed(2)}s"></i>`).join('');
 const rocks=Array.from({length:12},(_,i)=>`<i style="--x:${-60+((i*37)%120)};--s:${(.6+((i*29)%70)/100).toFixed(2)};--r:${(i*47)%360}deg;--dl:${(i*170)%1600}ms;--up:${160+(i*31)%140}px"></i>`).join('');
 const bolts=Array.from({length:6},(_,i)=>`<svg style="--x:${-55+i*22}%;--dl:${(i*90)%400}ms;--fl:${(.16+(i%3)*.06).toFixed(2)}s" viewBox="-30 -70 60 75"><path d="${legendBolt(i+1)}"/></svg>`).join('');
 return `<span class="arise-manga-bubble legend-bubble" role="status"><small>伝説の超サイヤ人</small><b>LÉGENDAIRE</b></span><span class="lg-fx" aria-hidden="true"><span class="lg-aura"></span><span class="lg-beams">${beams}</span><span class="lg-bolts">${bolts}</span><span class="lg-rocks">${rocks}</span><b class="lg-wave"></b><b class="lg-wave w2"></b></span><img class="legend-reveal" src="${LEGEND_ART}" alt="" aria-hidden="true" decoding="async"><span class="legend-buff-pop" aria-hidden="true"><b>+40 % ATQ</b><b>+20 % PV</b></span>`;}
if(!globalThis.__yuroSkip)try{(function(){let q=false;const paint=()=>{q=false;if(!document.querySelector('.story-battle .has-legend-aura,.story-battle .uses-legend'))return;document.querySelectorAll('.story-battle .story-fighter.has-legend-aura:not(.uses-legend)>button>img').forEach(img=>{if(img.getAttribute('src')!==LEGEND_ART){img.dataset.baseSrc=img.getAttribute('src')||'';img.setAttribute('src',LEGEND_ART);}});
 document.querySelectorAll('.story-battle .story-fighter.has-legend-aura,.story-battle .story-fighter.uses-legend').forEach(f=>{if(!f.querySelector(':scope>.lg-ssj'))f.insertAdjacentHTML('afterbegin',legendAuraHTML());});
 document.querySelectorAll('.story-battle .story-fighter.uses-legend').forEach(f=>{const r=f.querySelector(':scope>.legend-reveal'),btn=f.querySelector(':scope>button');if(r&&btn)btn.append(r);});};
 const root=document.getElementById('viewRoot');if(root)new MutationObserver(()=>{if(!q){q=true;requestAnimationFrame(paint);}}).observe(root,{childList:true,subtree:true});})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"broly.js");}
const positionStoryEffectsBeforeLegend=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeLegend.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='legendary'&&!legendPlayed.has(storyImpact)){legendPlayed.add(storyImpact);if(state.sound)playLegendVoice();}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"broly.js");}

/* rage.js */
globalThis.__yuroSkip=0;
const RAGE_HITS=[0.8,1.03,1.26,1.49,1.72,1.95,2.18,2.65];
let rageVoice,ragePlayed;
if(!globalThis.__yuroSkip)try{rageVoice={file:'https://yurocollection.fr/assets/broly-rage-v2.mp3',buffer:null,loading:null};
ragePlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rage.js");}
function prepareRageVoice(){if(rageVoice.buffer||rageVoice.loading)return rageVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;rageVoice.loading=fetch(rageVoice.file).then(r=>{if(!r.ok)throw Error('rage audio');return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>rageVoice.buffer=b).catch(()=>{rageVoice.loading=null;});return rageVoice.loading;}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('.story-battle')&&document.querySelector('.story-battle .rage-skill'))prepareRageVoice();},{capture:true,passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rage.js");}
let rageNoise=null;
function rageNoiseBuffer(ctx){if(rageNoise&&rageNoise.sampleRate===ctx.sampleRate)return rageNoise;const len=Math.floor(ctx.sampleRate*.6),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return rageNoise=b;}
function rageTrack(src,g){if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(src,g);}
function ragePunch(ctx,out,at,heavy){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=rageNoiseBuffer(ctx);f.type='lowpass';f.frequency.setValueAtTime(heavy?2600:3600,at);f.frequency.exponentialRampToValueAtTime(heavy?180:400,at+(heavy?.35:.12));g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(heavy?1:.75,at+.004);g.gain.exponentialRampToValueAtTime(.001,at+(heavy?.45:.14));n.connect(f);f.connect(g);g.connect(out);n.start(at);n.stop(at+.5);rageTrack(n,g);
 const o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(heavy?150:170,at);o.frequency.exponentialRampToValueAtTime(heavy?32:55,at+(heavy?.5:.13));og.gain.setValueAtTime(0,at);og.gain.linearRampToValueAtTime(heavy?1.1:.8,at+.005);og.gain.exponentialRampToValueAtTime(.001,at+(heavy?.6:.16));o.connect(og);og.connect(out);o.start(at);o.stop(at+.65);rageTrack(o,og);}
function rageWhoosh(ctx,out,at,dur){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=rageNoiseBuffer(ctx);f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(500,at);f.frequency.exponentialRampToValueAtTime(2800,at+dur*.7);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.45,at+dur*.4);g.gain.exponentialRampToValueAtTime(.001,at+dur);n.connect(f);f.connect(g);g.connect(out);n.start(at);n.stop(at+dur+.05);rageTrack(n,g);}
function playRageSfx(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;
 const run=()=>{const bt=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),t0=ctx.currentTime+.02,at=s=>t0+s*bt;const bus=ctx.createGain();bus.gain.value=.85;bus.connect(ctx.destination);
  const shout=buf=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;g.gain.value=.9;s.connect(g);g.connect(ctx.destination);s.start(t0);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};rageTrack(s,g);}catch{}};
  if(rageVoice.buffer)shout(rageVoice.buffer);else{const p=prepareRageVoice();if(p)p.then(b=>{if(b&&ctx.currentTime<t0+.5)shout(b);});}
  rageWhoosh(ctx,bus,at(.3),.42*bt);rageWhoosh(ctx,bus,at(2.8),.38*bt);};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
function rageTargetFX(){const words=['DOM!','BAM!','ドッ','GOH!','ドド','BAM!','ゴッ!'];
 const hits=RAGE_HITS.map((t,i)=>{const last=i===RAGE_HITS.length-1,x=last?50:18+((i*41)%64),y=last?45:16+((i*29)%62);return `<i class="rg-hit${last?' rg-final':''}" style="--t:${t}s;--x:${x}%;--y:${y}%;--r:${(i*53)%360}deg"><b></b></i>${last?'':`<em class="rg-word" style="--t:${t}s;--x:${x>50?x-26:x+18}%;--y:${y>50?y-20:y+14}%;--rot:${((i*17)%30)-15}deg">${words[i]}</em>`}`;}).join('');
 return `<span class="rg-fx" aria-hidden="true"><i class="rg-lines"></i>${hits}<b class="rg-wave"></b><b class="rg-wave w2"></b><em class="rg-word rg-big" style="--t:2.65s;--x:50%;--y:8%;--rot:-8deg">ドゴォッ!!</em></span>`;}
const positionStoryEffectsBeforeRage=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeRage.apply(this,arguments);try{if(storyAnimating&&storyImpact?.action==='rage'&&!ragePlayed.has(storyImpact)){ragePlayed.add(storyImpact);if(state.sound)playRageSfx();}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"rage.js");}

/* sukuna.js */
globalThis.__yuroSkip=0;
let fireVoice,firePlayed;
if(!globalThis.__yuroSkip)try{fireVoice={file:'https://yurocollection.fr/assets/sukuna-fire-arrow-v4.mp3',buffer:null,loading:null,missing:false};
firePlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"sukuna.js");}
function prepareFireVoice(){if(fireVoice.missing||fireVoice.buffer||fireVoice.loading)return fireVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;fireVoice.loading=fetch(fireVoice.file).then(r=>{if(!r.ok){fireVoice.missing=true;throw Error('fire audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>fireVoice.buffer=b).catch(()=>{fireVoice.loading=null;});return fireVoice.loading;}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('.story-battle')&&document.querySelector('.story-battle .fire-skill'))prepareFireVoice();},{capture:true,passive:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"sukuna.js");}
let fireNoise=null;
function fireNoiseBuffer(ctx){if(fireNoise&&fireNoise.sampleRate===ctx.sampleRate)return fireNoise;const len=Math.floor(ctx.sampleRate*2.5),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.04*w)/1.04;d[i]=w*.55+last*3.2+(Math.random()<.0009?(Math.random()*2-1)*2.2:0);}return fireNoise=b;}
function fireTrack(s,g){if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}
function fireLayer(ctx,out,at,dur,{type='lowpass',f0=500,f1=1500,q=.7,vol=.5,attack=.3,release=.4}={}){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=fireNoiseBuffer(ctx);n.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,at);f.frequency.exponentialRampToValueAtTime(f1,at+dur);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+attack);g.gain.setValueAtTime(vol,at+Math.max(attack,dur-release));g.gain.exponentialRampToValueAtTime(.001,at+dur);n.connect(f);f.connect(g);g.connect(out);n.start(at,Math.random()*1.5);n.stop(at+dur+.05);fireTrack(n,g);}
function fireBoom(ctx,out,at,bt){fireLayer(ctx,out,at,1.7*bt,{f0:4200,f1:160,vol:1,attack:.01,release:1.2*bt});const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(90,at);o.frequency.exponentialRampToValueAtTime(28,at+1.1*bt);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(1.2,at+.01);g.gain.exponentialRampToValueAtTime(.001,at+1.3*bt);o.connect(g);g.connect(out);o.start(at);o.stop(at+1.4*bt);fireTrack(o,g);}
function playFireSynth(ctx,t0,bt){const bus=ctx.createGain();bus.gain.value=.8;bus.connect(ctx.destination);const at=s=>t0+s*bt;
 fireLayer(ctx,bus,at(.5),3.2*bt,{f0:300,f1:1600,vol:.55,attack:2.2*bt,release:.25*bt});fireLayer(ctx,bus,at(.9),2.8*bt,{type:'highpass',f0:2500,f1:4200,vol:.18,attack:1.6*bt,release:.2*bt});
 fireLayer(ctx,bus,at(3.72),.38*bt,{type:'bandpass',f0:700,f1:5200,q:1.4,vol:.7,attack:.05*bt,release:.2*bt});fireBoom(ctx,bus,at(4.05),bt);fireLayer(ctx,bus,at(4.3),2.1*bt,{f0:900,f1:420,vol:.35,attack:.2*bt,release:1.2*bt});}
function playFireArrowSound(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;
 const run=()=>{const bt=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),t0=ctx.currentTime+.02;
  const file=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.02,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};fireTrack(s,g);}catch{}};
  if(fireVoice.buffer){file(fireVoice.buffer);return;}
  
  const impact=storyImpact,p=prepareFireVoice();let done=false;
  const late=setTimeout(()=>{if(done)return;done=true;playFireSynth(ctx,ctx.currentTime+.02,bt);},2200);
  if(p)p.then(()=>{if(done||!fireVoice.buffer)return;done=true;clearTimeout(late);if(storyImpact!==impact||!storyAnimating)return;const off=Math.max(0,(ctx.currentTime-t0)/bt);if(off<fireVoice.buffer.duration-.5)file(fireVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
const FA_T=9;
function faHeatSprites(){if(faHeatSprites.c)return faHeatSprites.c;const cols=[[255,250,230],[255,226,140],[255,184,64],[255,128,30],[230,72,8],[160,30,0],[90,16,0]];
 faHeatSprites.c=cols.map(([r,g,b],i)=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,`rgba(${r},${g},${b},1)`);gr.addColorStop(.35,`rgba(${r},${g},${b},${i<2?.75:.55})`);gr.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=gr;x.fillRect(0,0,64,64);return c;});return faHeatSprites.c;}
function startFireCanvas(stage){if(stage._faRun)return;stage._faRun=true;const cv=stage.querySelector('.fa-canvas');if(!cv)return;const ctx=cv.getContext('2d');const spr=faHeatSprites();
  const faLow=(()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}})();const dpr=faLow?1:Math.min(1.5,window.devicePixelRatio||1);let W=0,H=0;const resize=()=>{const r=stage.getBoundingClientRect();W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};resize();
 const P=[];const MAX=faLow?850:1600;const rnd=(a,b)=>a+Math.random()*(b-a);
 const add=(x,y,vx,vy,o={})=>{if(P.length>=MAX)P.shift();P.push({x,y,vx,vy,age:0,life:o.life||rnd(.35,.7),size:(o.size||rnd(6,12))*(faLow?1.25:1),grow:o.grow??1.8,heat:o.heat??1,cool:o.cool??1,drag:o.drag??1.6,rise:o.rise??60,turb:o.turb??40,spark:o.spark||false,alpha:o.alpha??1,seed:Math.random()*99});};
 const geo=()=>stage._fa||{gx:W/2,gy:H*.7,ex:W/2,ey:H*.25,ew:300,foes:[]};
 let last=performance.now(),acc={};const emit=(key,rate,dt,fn)=>{acc[key]=(acc[key]||0)+rate*(faLow?.55:1)*dt;while(acc[key]>=1){acc[key]--;fn();}};
 const once={};const at=(key,cond,fn)=>{if(cond&&!once[key]){once[key]=1;fn();}};
 const tend=Array.from({length:7},(_,i)=>({a:i*51.4*Math.PI/180+rnd(-.2,.2),spin:rnd(-.9,.9),ph:rnd(0,6),on:rnd(.25,.6)}));
 const start=performance.now()-(stage._faSkip||0)*1000;
 function frame(now){if(!stage.isConnected){stage._faRun=false;return;}const dt=Math.min(.05,(now-last)/1000);last=now;const sp=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1;const t=(now-start)/1000*sp,sdt=dt*sp;
  const g=geo();const ux=Math.cos(g.ang??-1.57),uy=Math.sin(g.ang??-1.57),vx=-uy,vy=ux;const gx=g.gx,gy=g.gy;
  
  if(t>1&&t<2.5)emit('ign',(t-1)*90,sdt,()=>{const a=rnd(0,6.28),r=rnd(0,18);add(gx+Math.cos(a)*r,gy+Math.sin(a)*r,rnd(-30,30),rnd(-60,-10),{size:rnd(4,9),life:rnd(.3,.6),heat:rnd(.75,1),rise:80});});
  if(t>1&&t<4.6)emit('spk',40,sdt,()=>{const a=rnd(0,6.28),s=rnd(120,260);add(gx,gy,Math.cos(a)*s,Math.sin(a)*s,{spark:true,life:rnd(.15,.35),size:rnd(1,2),heat:1,drag:3,rise:0,turb:0});});
  
  if(t>2.1&&t<4.65){const pulse=1+.25*Math.sin(t*(t>3.9?22:9));emit('orb',260,sdt,()=>{const a=rnd(0,6.28),r=rnd(0,14*pulse);add(gx+Math.cos(a)*r,gy+Math.sin(a)*r,rnd(-25,25),rnd(-25,25),{size:rnd(10,20)*pulse,life:rnd(.18,.35),heat:rnd(.85,1),grow:1.2,rise:20,turb:20});});}
  
  if(t>2.3&&t<3.95)tend.forEach((d,i)=>{const live=Math.sin(t*2.6+d.ph)>-d.on;if(!live)return;d.a+=d.spin*sdt;const wob=Math.sin(t*7+d.ph)*.55;const a=d.a+wob;emit('t'+i,190,sdt,()=>{const s=rnd(230,340),perp=Math.sin(t*11+d.ph)*120;add(gx+Math.cos(a)*12,gy+Math.sin(a)*12,Math.cos(a)*s-Math.sin(a)*perp,Math.sin(a)*s+Math.cos(a)*perp,{size:rnd(7,13),life:rnd(.4,.65),heat:rnd(.8,1),grow:2.2,drag:1.3,rise:30,turb:80,cool:1.15});});});
  
  if(t>3.85&&t<4.6)emit('conv',220,sdt,()=>{const a=rnd(0,6.28),r=rnd(90,150);const x=gx+Math.cos(a)*r,y=gy+Math.sin(a)*r;add(x,y,(gx-x)*2.6,(gy-y)*2.6,{size:rnd(7,13),life:rnd(.32,.4),heat:rnd(.55,.85),grow:.4,drag:0,rise:0,turb:15,cool:-.9});});
  
  at('burst',t>=4.6,()=>{for(let i=0;i<240;i++){const a=rnd(0,6.28),s=rnd(120,520);add(gx,gy,Math.cos(a)*s,Math.sin(a)*s,{size:rnd(10,22),life:rnd(.35,.8),heat:rnd(.75,1),grow:2.2,drag:2.6,rise:40,turb:60});}});
  
  let arrow=null;
  if(t>=4.62&&t<6.45){const grow=Math.min(1,(t-4.62)/.35),pull=t>5?Math.min(1,(t-5)/1.4)*34:0,shake=t>5.8?Math.sin(t*90)*1.5:0;arrow={x:gx-ux*pull+vx*shake,y:gy-uy*pull+vy*shake,len:grow,charge:Math.max(0,Math.min(1,(t-4.95)/1.45))};}
  if(t>=6.45&&t<6.77){const p=Math.min(1,(t-6.45)/.3),e=p*p*.6+p*.4;arrow={x:gx+(g.ex-gx)*e,y:gy+(g.ey-gy)*e,len:1,charge:1,fly:true};}
  if(arrow){const L1=74,L2=150,tipx=arrow.x+ux*L1,tipy=arrow.y+uy*L1;const n=arrow.fly?520:360*arrow.len;
   emit('ah',n*1.5,sdt,()=>{
    const k=Math.random(),side=rnd(-1,1),w=k*26*side,back=k*L1*.7;const x=tipx-ux*back+vx*w,y=tipy-uy*back+vy*w;const s=rnd(90,arrow.fly?360:210),fl=side*k*rnd(90,230);add(x,y,-ux*s+vx*fl,-uy*s+vy*fl,{size:rnd(6,12),life:rnd(.25,.5),heat:rnd(.55,.9),grow:2.3,drag:1.1,rise:arrow.fly?0:30,turb:45,alpha:.55});});
   emit('as',(arrow.fly?420:300)*arrow.len,sdt,()=>{
    const k=Math.random()*arrow.len,x=arrow.x+ux*(L1*.3-k*L2),y=arrow.y+uy*(L1*.3-k*L2);const s=rnd(100,arrow.fly?420:240);add(x+vx*rnd(-6,6),y+vy*rnd(-6,6),-ux*s+vx*rnd(-55,55),-uy*s+vy*rnd(-55,55),{size:rnd(6,12),life:rnd(.3,.6),heat:rnd(.5,.85),grow:2.4,drag:1.1,rise:arrow.fly?0:40,turb:65,cool:1.15,alpha:.6});});
   emit('aedge',arrow.len*(arrow.fly?420:300),sdt,()=>{const k=Math.random(),side=Math.random()<.5?-1:1;const bx=tipx-ux*k*L1*.78,by=tipy-uy*k*L1*.78,w=k*26*side;const s=rnd(70,arrow.fly?300:170);add(bx+vx*w,by+vy*w,-ux*s+vx*side*rnd(60,180),-uy*s+vy*side*rnd(60,180),{size:rnd(7,14),life:rnd(.22,.45),heat:rnd(.75,1),grow:2.2,drag:1.5,rise:arrow.fly?0:60,turb:140});});
   emit('aout',arrow.len*(arrow.fly?320:280),sdt,()=>{const k=Math.random()*arrow.len;const x=arrow.x+ux*(L1*.8-k*(L1+L2)),y=arrow.y+uy*(L1*.8-k*(L1+L2));const s=rnd(50,arrow.fly?280:140);add(x+vx*rnd(-14,14),y+vy*rnd(-14,14),-ux*s+vx*rnd(-70,70),-uy*s+vy*rnd(-70,70),{size:rnd(14,26),life:rnd(.35,.7),heat:rnd(.5,.75),grow:2.2,drag:1.3,rise:arrow.fly?0:70,turb:120,alpha:.75});});
   if(arrow.charge>0)emit('ach',arrow.charge*60,sdt,()=>{const a=rnd(0,6.28),r=rnd(40,70);const x=tipx+Math.cos(a)*r,y=tipy+Math.sin(a)*r;add(x,y,(tipx-x)*3,(tipy-y)*3,{size:rnd(3,6),life:.3,heat:1,grow:.3,drag:0,rise:0,turb:0});});}
  
  at('impact',t>=6.75,()=>{for(let i=0;i<320;i++){const a=rnd(0,6.28),s=rnd(80,600);add(g.ex,g.ey,Math.cos(a)*s,Math.sin(a)*s*.7,{size:rnd(12,26),life:rnd(.4,1),heat:rnd(.7,1),grow:2.4,drag:2.8,rise:50,turb:80});}
   (g.foes||[]).forEach(f=>{for(let i=0;i<90;i++){const a=rnd(0,6.28),s=rnd(60,300);add(f.x,f.y,Math.cos(a)*s,Math.sin(a)*s,{size:rnd(10,20),life:rnd(.35,.8),heat:rnd(.75,1),grow:2,drag:2.6,rise:60,turb:60});}});});
  if(t>6.85&&t<8.75)(g.foes||[]).forEach((f,i)=>emit('burn'+i,170*Math.max(0,1-(t-6.85)/1.9),sdt,()=>{add(f.x+rnd(-.42,.42)*f.w,f.y+f.h*rnd(.15,.48),rnd(-15,15),rnd(-140,-60),{size:rnd(9,17),life:rnd(.4,.75),heat:rnd(.6,.95),grow:1.6,drag:.8,rise:120,turb:60,cool:1.1});}));
  if(t>6.8&&t<8.8)emit('emb',60,sdt,()=>{add(g.ex+rnd(-.5,.5)*g.ew,g.ey+rnd(-40,40),rnd(-40,40),rnd(-120,-40),{spark:true,size:rnd(1.2,2.4),life:rnd(.6,1.2),heat:1,drag:.4,rise:40,turb:50});});
  
  ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
  for(let i=P.length-1;i>=0;i--){const q=P[i];q.age+=sdt/q.life;if(q.age>=1){P.splice(i,1);continue;}const dr=Math.exp(-q.drag*sdt);q.vx*=dr;q.vy*=dr;q.vy-=q.rise*sdt;q.vx+=Math.sin(q.y*.045+t*5+q.seed)*q.turb*sdt;q.vy+=Math.cos(q.x*.04+t*4+q.seed)*q.turb*.5*sdt;q.x+=q.vx*sdt;q.y+=q.vy*sdt;
   const life=1-q.age;if(q.spark){ctx.globalAlpha=Math.min(1,life*1.4);ctx.strokeStyle='rgba(255,236,170,1)';ctx.lineWidth=q.size;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-q.vx*.035,q.y-q.vy*.035);ctx.stroke();continue;}
   const h=Math.max(0,Math.min(1,q.heat-q.age*.85*q.cool)),idx=Math.min(spr.length-1,Math.floor((1-h)*spr.length)),sz=q.size*(1+q.age*q.grow);ctx.globalAlpha=Math.pow(life,1.3)*q.alpha*(.55+.45*h);ctx.drawImage(spr[idx],q.x-sz,q.y-sz,sz*2,sz*2);}
  
  if(arrow){const L1=74,L2=150,len=arrow.len;ctx.save();{const hx=arrow.x+ux*L1*.55,hy=arrow.y+uy*L1*.55,hr=46+arrow.charge*26;ctx.globalAlpha=.55+.35*arrow.charge;ctx.globalAlpha*=.6;ctx.drawImage(spr[3],hx-hr,hy-hr,hr*2,hr*2);}ctx.globalAlpha=1;ctx.translate(arrow.x,arrow.y);ctx.rotate(Math.atan2(uy,ux));ctx.shadowColor='rgba(255,140,30,1)';ctx.shadowBlur=18+arrow.charge*14;
   const J=()=>rnd(-1,1);
   
   for(let pass=0;pass<3;pass++){ctx.strokeStyle=pass===2?'rgba(255,250,225,.95)':pass===1?'rgba(255,190,70,.75)':'rgba(255,100,10,.55)';ctx.lineWidth=pass===2?2.2:pass===1?5:9;ctx.beginPath();const x0=L1*.35-L2*len,x1=L1*.42,steps=12;for(let i=0;i<=steps;i++){const x=x0+(x1-x0)*i/steps,amp=(1-i/steps)*(pass===2?2.5:5);const y=J()*amp;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
   if(len>.55){const hk=(len-.55)/.45;
    
    const edge=(sgn)=>{const pts=[];for(let i=0;i<=8;i++){const u=i/8,x=L1*1.1*hk-(L1*1.1*hk-L1*.24)*u,base=24*hk*Math.pow(u,.8);pts.push([x+J()*3,sgn*(base+(i%2?rnd(3,9):rnd(-2,2))*hk)]);}return pts;};
    const up=edge(-1),dn=edge(1);ctx.beginPath();ctx.moveTo(L1*1.14*hk,0);up.forEach(([x,y])=>ctx.lineTo(x,y));ctx.lineTo(L1*.46+J()*3,0);dn.reverse().forEach(([x,y])=>ctx.lineTo(x,y));ctx.closePath();
    const hg=ctx.createLinearGradient(L1*.24,0,L1*1.12,0);hg.addColorStop(0,'rgba(220,50,0,'+(.7*hk)+')');hg.addColorStop(.45,'rgba(255,140,30,'+(.9*hk)+')');hg.addColorStop(.8,'rgba(255,220,120,1)');hg.addColorStop(1,'rgba(255,252,235,1)');ctx.fillStyle=hg;ctx.fill();
    ctx.shadowBlur=0;ctx.globalAlpha=.85;ctx.strokeStyle='rgba(255,236,170,.9)';ctx.lineWidth=1.2;ctx.stroke();ctx.globalAlpha=1;
    
    ctx.fillStyle='rgba(255,255,240,.9)';ctx.beginPath();ctx.moveTo(L1*1.02*hk,0);ctx.lineTo(L1*.6,-7*hk);ctx.lineTo(L1*.5,0);ctx.lineTo(L1*.6,7*hk);ctx.closePath();ctx.fill();}
   ctx.restore();}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(t<FA_T+.3)requestAnimationFrame(frame);else stage._faRun=false;}
 requestAnimationFrame(frame);}
function fireStageHTML(){
 const burn='<b class="fa-burn-glow"></b>';
 return `<div class="fa-stage" aria-hidden="true"><b class="fa-dim"></b>
<span class="fa-anchor"><i class="fa-heat"></i><b class="fa-pop"></b></span><canvas class="fa-canvas"></canvas><b class="fa-flash"></b>
<span class="fa-boom"><img class="fa-cloud c1" src="https://yurocollection.fr/assets/fire-cloud.webp" alt=""><img class="fa-cloud c2" src="https://yurocollection.fr/assets/fire-cloud.webp" alt=""><i class="fa-core"></i><i class="fa-wave"></i></span>
${[0,1,2].map(n=>`<span class="fa-ex" data-fa-ex="${n}" style="--n:${n}"><i class="fa-hit"></i><span class="fa-burn">${burn}</span></span>`).join('')}</div>`;}
const positionStoryEffectsBeforeFire=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeFire.apply(this,arguments);try{if(!fireVoice.buffer&&document.querySelector('.story-battle .fire-skill'))prepareFireVoice();if(storyAnimating&&storyImpact?.action==='firearrow'){if(!firePlayed.has(storyImpact)){firePlayed.add(storyImpact);if(state.sound)playFireArrowSound();}
 const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.fa-stage');if(arena&&stage){const a=arena.getBoundingClientRect(),caster=arena.querySelector('.uses-fire>button'),foes=[...arena.querySelectorAll('[data-fighter-side="enemy"]>button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width>0);
  let gx=a.width/2,gy=a.height*.7,ex=a.width/2,ey=a.height*.25,ew=300;if(caster){const c=caster.getBoundingClientRect(),up=!foes.length||Math.min(...foes.map(r=>r.top+r.height/2))<c.top+c.height/2; gx=c.left+c.width/2-a.left;gy=up?c.top-a.top-Math.min(60,c.height*.3):c.bottom-a.top+Math.min(60,c.height*.3);}
  if(foes.length){const l=Math.min(...foes.map(r=>r.left)),r=Math.max(...foes.map(r=>r.right)),t=Math.min(...foes.map(r=>r.top)),bt=Math.max(...foes.map(r=>r.bottom));ex=(l+r)/2-a.left;ey=(t+bt)/2-a.top;ew=r-l;}
  const s=(k,v)=>stage.style.setProperty(k,v);s('--gx',gx+'px');s('--gy',gy+'px');s('--ex',ex+'px');s('--ey',ey+'px');s('--ew',Math.max(220,ew)+'px');s('--dx',ex-gx+'px');s('--dy',ey-gy+'px');s('--ang',Math.atan2(ey-gy,ex-gx)+'rad');s('--dist',Math.hypot(ex-gx,ey-gy)+'px');
  stage.querySelectorAll('[data-fa-ex]').forEach((el,i)=>{const f=foes[i];if(!f){el.hidden=true;return;}el.hidden=false;el.style.left=(f.left+f.width/2-a.left)+'px';el.style.top=(f.top+f.height/2-a.top)+'px';el.style.setProperty('--fw',f.width+'px');});arena.style.setProperty('--fa-cx',gx+'px');arena.style.setProperty('--fa-cy',gy+'px');arena.style.setProperty('--fa-dx',(ex-gx)+'px');arena.style.setProperty('--fa-dy',(ey-gy)+'px');stage._fa={gx,gy,ex,ey,ew:Math.max(220,ew),ang:Math.atan2(ey-gy,ex-gx),foes:foes.map(f=>({x:f.left+f.width/2-a.left,y:f.top+f.height/2-a.top,w:f.width,h:f.height}))};startFireCanvas(stage);}}}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"sukuna.js");}

/* burn-fx.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const reduce=()=>false;
 const freshAt=new WeakMap();let pending=false,cv=null,ctx=null,raf=0,last=0,parts=[],seen=new WeakSet(),bursts=[],targets=[],scanAt=0,dpr=1;
 const sprite=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.75)');r.addColorStop(.6,'rgba(255,255,255,.22)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;})();
 
 const tongue=(()=>{const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');g.globalCompositeOperation='lighter';for(let i=0;i<=40;i++){const k=i/40,y=104-k*96,r=26*(1-k)**1.35+2;const gr=g.createRadialGradient(32,y,0,32,y,r);gr.addColorStop(0,`rgba(255,255,255,${.16*(1-k*.6)})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(32,y,r,0,7);g.fill();}return c;})();
 const tongues=[[255,246,200],[255,206,96],[255,150,40],[240,90,16],[190,44,8]].map(([r,g,b])=>{const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');x.drawImage(tongue,0,0);x.globalCompositeOperation='source-in';x.fillStyle=`rgb(${r},${g},${b})`;x.fillRect(0,0,64,128);return c;});
 
 const tints=[[255,250,220],[255,226,140],[255,178,60],[255,120,24],[230,64,10],[150,28,6]].map(([r,g,b])=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(sprite,0,0);x.globalCompositeOperation='source-in';x.fillStyle=`rgb(${r},${g},${b})`;x.fillRect(0,0,64,64);return c;});
 const smoke=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(sprite,0,0);x.globalCompositeOperation='source-in';x.fillStyle='rgb(40,30,28)';x.fillRect(0,0,64,64);return c;})();
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function ensure(){if(cv&&cv.isConnected)return;cv=document.createElement('canvas');cv.className='burn-fx-layer';cv.setAttribute('aria-hidden','true');document.body.appendChild(cv);ctx=cv.getContext('2d');size();}
 function size(){if(!cv)return;dpr=Math.min(1,window.devicePixelRatio||1);cv.width=Math.round(innerWidth*dpr);cv.height=Math.round(innerHeight*dpr);}
 window.addEventListener('resize',size,{passive:true});
 function speed(){return typeof storySpeed==='number'&&storySpeed>0?storySpeed:1;}
 function scan(now){scanAt=now;pending=false;targets=[...document.querySelectorAll('.story-battle .story-fighter.is-burning>button')].filter(btn=>{const m=btn.parentElement?.querySelector(':scope>.burn-start');if(!m)return true;if(!freshAt.has(m)){const ad=getComputedStyle(m).animationDelay.split(',')[0];let d=parseFloat(ad);if(/ms/.test(ad))d/=1000;freshAt.set(m,now+(d>=0?d:.5)*1000);}if(now<freshAt.get(m)){pending=true;return false;}return true;});
  document.querySelectorAll('.story-battle .burn-flames').forEach(el=>{if(seen.has(el))return;seen.add(el);const btn=el.closest('.story-fighter')?.querySelector(':scope>button');if(!btn)return;
   const probe=el.querySelector('i'),ad=probe?getComputedStyle(probe).animationDelay.split(',')[0]:'';let d=parseFloat(ad);if(/ms/.test(ad))d/=1000;if(!(d>=0))d=.4/speed();bursts.push({btn,at:now+d*1000,until:now+d*1000+1050/speed()});});}
 function spawn(r,kind){const w=r.width,h=r.height;
  if(kind==='flame'){const x=r.left+w*(.08+Math.random()*.84),edge=Math.abs((x-r.left)/w-.5)*2;parts.push({k:0,x,y:r.bottom-h*rnd(-.02,.08),vx:rnd(-10,10),vy:-rnd(60,120)*(1.15-edge*.45),life:rnd(.5,.95),t:0,s:w*rnd(.16,.28)*(1-edge*.4),wob:rnd(0,6.28)});}
  else if(kind==='burst'){const x=r.left+w*rnd(.05,.95);parts.push({k:0,x,y:r.bottom-h*rnd(0,.5),vx:rnd(-30,30),vy:-rnd(120,240),life:rnd(.5,.9),t:0,s:w*rnd(.22,.4),wob:rnd(0,6.28)});}
  else if(kind==='ember'){parts.push({k:1,x:r.left+w*rnd(.1,.9),y:r.bottom-h*rnd(0,.3),vx:rnd(-25,25),vy:-rnd(60,160),life:rnd(.8,1.6),t:0,s:rnd(1.4,2.8),wob:rnd(0,6.28)});}
  else parts.push({k:2,x:r.left+w*rnd(.2,.8),y:r.bottom-h*rnd(.25,.5),vx:rnd(-8,8),vy:-rnd(25,55),life:rnd(1.2,2),t:0,s:w*rnd(.18,.3),wob:0});}
 function frame(now){raf=0;if(!document.querySelector('.story-battle')){parts=[];bursts=[];if(cv)ctx.clearRect(0,0,cv.width,cv.height);return;}
  if(now-scanAt>250)scan(now);const dt=Math.min(.05,(now-(last||now))/1000)*speed();last=now;
  const arena=document.querySelector('.story-battle .story-arena')?.getBoundingClientRect();
  const glows=[];const live=document.querySelector('.story-end-screen')?[]:targets.filter(b=>b.isConnected);
  for(const b of live){const r=b.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;const n=dt*(live.length>2?34:46);for(let i=0;i<n||Math.random()<n-i;i++){spawn(r,'flame');if(i>8)break;}glows.push(r);if(Math.random()<dt*7)spawn(r,'ember');if(Math.random()<dt*2.5)spawn(r,'smoke');}
  bursts=bursts.filter(x=>now<x.until&&x.btn.isConnected);for(const x of bursts){if(now<x.at)continue;const r=x.btn.getBoundingClientRect(),k=1-(now-x.at)/(x.until-x.at),n=dt*120*k;glows.push({left:r.left,width:r.width,bottom:r.bottom-r.height*.15*k,height:r.height,boost:k});for(let i=0;i<n||Math.random()<n-i;i++){spawn(r,'burst');if(i>14)break;}if(Math.random()<dt*30*k)spawn(r,'ember');}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
  if(arena){ctx.save();ctx.beginPath();ctx.rect(arena.left,arena.top,arena.width,arena.height);ctx.clip();}
  const next=[];
  
  ctx.globalCompositeOperation='source-over';
  for(const p of parts){p.t+=dt;if(p.t>=p.life)continue;next.push(p);if(p.k!==2)continue;const a=p.t/p.life;p.x+=p.vx*dt;p.y+=p.vy*dt;const s=p.s*(1+a*1.6);ctx.globalAlpha=.28*Math.sin(Math.PI*a);ctx.drawImage(smoke,p.x-s/2,p.y-s/2,s,s);}
  ctx.globalCompositeOperation='lighter';
  for(const r of glows){const fl=.75+Math.sin(now/90+r.left)*.12+Math.random()*.13,cx=r.left+r.width/2,cy=r.bottom-r.height*.04,rw=r.width*.62,g=ctx.createRadialGradient(cx,cy,0,cx,cy,rw);g.addColorStop(0,`rgba(255,140,40,${.42*fl*(1+(r.boost||0))})`);g.addColorStop(.5,`rgba(255,70,10,${.18*fl})`);g.addColorStop(1,'rgba(255,40,0,0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.scale(1,.55);ctx.translate(-cx,-cy);ctx.fillRect(cx-rw,cy-rw,rw*2,rw*2);ctx.restore();}
  for(const p of next){if(p.k===2)continue;const a=p.t/p.life;p.wob+=dt*9;p.vx+=Math.sin(p.wob)*40*dt;p.vy*=1-dt*.9;p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.k===1){ctx.globalAlpha=(1-a)*.95;ctx.drawImage(tints[a<.4?1:2],p.x-p.s*2,p.y-p.s*2,p.s*4,p.s*4);continue;}
   const s=p.s*(1-a*.55),ti=Math.min(4,Math.floor(a*5.4));ctx.globalAlpha=(a<.15?a/.15:1-(a-.15)/.85)*.9;
   
   const lean=Math.max(-.5,Math.min(.5,p.vx/160));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.translate(p.x,p.y);ctx.rotate(lean);ctx.drawImage(tongues[ti],-s/2,-s*1.75,s,s*2);ctx.setTransform(dpr,0,0,dpr,0,0);}
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;if(arena)ctx.restore();
  parts=next.length>700?next.slice(-700):next;
  if(parts.length||live.length||bursts.length||pending)raf=requestAnimationFrame(frame);else{last=0;ctx.clearRect(0,0,innerWidth,innerHeight);}}
 function kick(){ return;if(reduce()||raf||document.hidden)return;if(!document.querySelector('.story-battle .is-burning, .story-battle .burn-flames'))return;ensure();last=0;scanAt=0;raf=requestAnimationFrame(frame);}
 const root=document.getElementById('viewRoot');if(root){let q=0;new MutationObserver(()=>{if(q)return;q=setTimeout(()=>{q=0;kick();},30);}).observe(root,{childList:true,subtree:true});}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick();});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"burn-fx.js");}

/* haki.js */
globalThis.__yuroSkip=0;
let hakiVoice,hakiPlayed;
if(!globalThis.__yuroSkip)try{hakiVoice={file:'https://yurocollection.fr/assets/roger-haki-v2.mp3',buffer:null,loading:null,missing:false};
hakiPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"haki.js");}
function prepareHakiVoice(){if(hakiVoice.missing||hakiVoice.buffer||hakiVoice.loading)return hakiVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 hakiVoice.loading=fetch(hakiVoice.file).then(r=>{if(!r.ok){hakiVoice.missing=true;throw Error('haki audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>hakiVoice.buffer=b).catch(()=>{hakiVoice.loading=null;});return hakiVoice.loading;}
function playHakiVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(hakiVoice.buffer){go(hakiVoice.buffer);return;}const p=prepareHakiVoice();if(p)p.then(()=>{if(!hakiVoice.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<hakiVoice.buffer.duration-.4)go(hakiVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
function hakiBoltPath(seed,L=120,amp=26,branches=3){let s=(seed*7919+13)%233280;const rnd=()=>(s=(s*9301+49297)%233280)/233280;
 const split=(a,b,d,depth,out)=>{if(!depth){out.push(b);return;}const m=[(a[0]+b[0])/2+(rnd()-.5)*d*.35,(a[1]+b[1])/2+(rnd()-.5)*d];split(a,m,d*.62,depth-1,out);split(m,b,d*.62,depth-1,out);};
 const line=(a,b,d,depth)=>{const pts=[a];split(a,b,d,depth,pts);return pts;};const fmt=pts=>'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');
 const main=line([0,0],[L,(rnd()-.5)*amp*.6],amp,5);let br='';
 for(let i=0;i<branches;i++){const k=Math.floor((.2+.55*rnd())*(main.length-1)),o=main[k],ang=(rnd()<.5?-1:1)*(.35+.5*rnd()),len=L*(.22+.25*rnd());br+=fmt(line(o,[o[0]+Math.cos(ang)*len,o[1]+Math.sin(ang)*len],amp*.5,4))+' ';}
 return {main:fmt(main),branch:br.trim()};}
function hakiBoltSVG(seed,L,amp,branches){const b=hakiBoltPath(seed,L,amp,branches);return `<path class="hk-bolt-glow" d="${b.main} ${b.branch}"/><path class="hk-bolt-body" d="${b.main}"/><path class="hk-bolt-body hk-br" d="${b.branch}"/><path class="hk-bolt-core" d="${b.main}"/><path class="hk-bolt-core hk-br" d="${b.branch}"/>`;}
function hakiStageHTML(){
 const spokes=Array.from({length:18},(_,i)=>`<i style="--a:${i*20+((i*7)%9)}deg;--w:${2+(i%4)}px;--dl:${(i%5)*18}ms"></i>`).join('');
 const bolts=Array.from({length:9},(_,i)=>`<svg style="--a:${i*40+10}deg;--dl:${(i*70)%420}ms;--s:${(.7+((i*37)%50)/100).toFixed(2)}" viewBox="0 -40 120 80" preserveAspectRatio="none">${hakiBoltSVG(i+1,120,46,3)}</svg>`).join('');
 const shards=Array.from({length:16},(_,i)=>`<i style="--a:${i*22.5+((i*13)%11)}deg;--d:${(30+((i*41)%45))}vmax;--s:${(4+((i*7)%7))}px;--r:${(i*97)%360}deg;--dl:${(i%4)*25}ms"></i>`).join('');
 return `<div class="hk-stage" aria-hidden="true"><b class="hk-dim"></b><b class="hk-flash"></b><span class="hk-burst"><span class="hk-spokes">${spokes}</span><i class="hk-ring r1"></i><i class="hk-ring r2"></i><i class="hk-ring r3"></i><i class="hk-core"></i><span class="hk-shards">${shards}</span></span><span class="hk-bolts">${bolts}</span><b class="hk-split"></b><b class="hk-flash2"></b></div><div class="hk-back" aria-hidden="true"><b class="hk-red"></b><b class="hk-speed"></b><b class="hk-kanji">覇</b></div>`;}
function hakiFighterFX(){const crackle=Array.from({length:6},(_,i)=>`<svg style="--a:${i*60+15}deg;--dl:${i*55}ms" viewBox="0 -20 60 40">${hakiBoltSVG(i+11,60,22,1)}</svg>`).join('');
 return `<span class="arise-manga-bubble haki-bubble" role="status"><small>覇王色の覇気</small><b>HAKI</b></span><span class="haki-laugh" aria-hidden="true"><b>わははははは！</b><small>WAHAHAHAHA</small></span><span class="hk-fx" aria-hidden="true"><i class="hk-aura"></i><span class="hk-crackle">${crackle}</span><i class="hk-eye"></i></span>`;}
const positionStoryEffectsBeforeHaki=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeHaki.apply(this,arguments);try{
 if(!hakiVoice.buffer&&document.querySelector('.story-battle .haki-skill'))prepareHakiVoice();
 if(storyAnimating&&storyImpact?.action==='haki'){const arena=document.querySelector('.story-battle .story-arena'),stage=arena?.querySelector('.hk-stage'),caster=arena?.querySelector('.story-fighter.uses-haki>button');
  if(arena&&stage&&caster){const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect();stage.style.setProperty('--hk-x',((c.left+c.width/2-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--hk-y',((c.top+c.height*.35-a.top)/a.height*100).toFixed(2)+'%');stage.style.setProperty('--hk-r',Math.hypot(a.width,a.height).toFixed(0)+'px');}
  if(!hakiPlayed.has(storyImpact)){hakiPlayed.add(storyImpact);if(state.sound)playHakiVoice();}}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"haki.js");}

/* geass.js */
globalThis.__yuroSkip=0;
let geassVoice,geassPlayed;
if(!globalThis.__yuroSkip)try{geassVoice={file:'https://yurocollection.fr/assets/lelouch-geass-v2.mp3',buffer:null,loading:null,missing:false};
geassPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"geass.js");}
function prepareGeassVoice(){if(geassVoice.missing||geassVoice.buffer||geassVoice.loading)return geassVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 geassVoice.loading=fetch(geassVoice.file).then(r=>{if(!r.ok){geassVoice.missing=true;throw Error('geass audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>geassVoice.buffer=b).catch(()=>{geassVoice.loading=null;});return geassVoice.loading;}
function playGeassVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(geassVoice.buffer){go(geassVoice.buffer);return;}const p=prepareGeassVoice();if(p)p.then(()=>{if(!geassVoice.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<geassVoice.buffer.duration-.5)go(geassVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
function geassDefs(){if(typeof document==='undefined'||document.getElementById('geassDefs'))return;const d=document.createElement('div');d.id='geassDefs';d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
 d.innerHTML='<svg width="0" height="0"><defs><linearGradient id="gsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b86"/><stop offset=".5" stop-color="#ff1f4b"/><stop offset="1" stop-color="#b3001f"/></linearGradient><filter id="gsGlow" x="-40%" y="-60%" width="180%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/><feFlood flood-color="#ff1f4b"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>';
 (document.body||document.documentElement).appendChild(d);}
const GEASS_SIGIL='<svg class="gs-sigil-svg" viewBox="-20 -20 240 160"><g filter="url(#gsGlow)"><path d="M100 114 L92 87 Q60 79 31 51 Q14 35 8 7 Q27 34 51 53 Q77 71 96 70 L100 56 L104 70 Q123 71 149 53 Q173 34 192 7 Q186 35 169 51 Q140 79 108 87 Z" fill="url(#gsFill)" stroke="#ffd5dd" stroke-width="1.6"/><path d="M100 104 L96 90 L100 80 L104 90 Z" fill="#ffd5dd" opacity=".75"/></g></svg>';
function geassRng(seed){let s=seed;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};}
const geassNetCache={};
function geassNetSVG(seed){if(geassNetCache[seed])return geassNetCache[seed];const rnd=geassRng(seed),W=400,H=260,pts=Array.from({length:58},()=>[rnd()*W,rnd()*H]);let d='',spark='';
 for(let i=0;i<pts.length;i++){const [px,py]=pts[i];let poly=[[-10,-10],[W+10,-10],[W+10,H+10],[-10,H+10]];
  for(let j=0;j<pts.length&&poly.length;j++){if(j===i)continue;const [qx,qy]=pts[j],mx=(px+qx)/2,my=(py+qy)/2,nx=qx-px,ny=qy-py,side=p=>(p[0]-mx)*nx+(p[1]-my)*ny,out=[];
   for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],sa=side(a),sb=side(b);if(sa<=0)out.push(a);if((sa<=0)!==(sb<=0)){const t=sa/(sa-sb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}poly=out;}
  if(poly.length<3)continue;const sh=poly.map(p=>[px+(p[0]-px)*.9,py+(p[1]-py)*.9]),mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],f=v=>v.toFixed(1);let m=mid(sh[0],sh[1]);d+=`M${f(m[0])} ${f(m[1])}`;
  for(let k=1;k<=sh.length;k++){const v=sh[k%sh.length],n=mid(v,sh[(k+1)%sh.length]);d+=`Q${f(v[0])} ${f(v[1])} ${f(n[0])} ${f(n[1])}`;}d+='Z';
  if(rnd()<.35){const v=sh[Math.floor(rnd()*sh.length)];spark+=`<circle cx="${f(v[0])}" cy="${f(v[1])}" r="${(1+rnd()*1.6).toFixed(1)}"/>`;}}
 return geassNetCache[seed]=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><path class="gn-halo" d="${d}"/><path class="gn-glow" d="${d}"/><path class="gn-line" d="${d}"/><g class="gn-spark">${spark}</g></svg>`;}
let geassVeinCache='';
function geassVeinSVG(){if(geassVeinCache)return geassVeinCache;const rnd=geassRng(11),cx=200,cy=130;let main='',thin='';
 const branch=(x,y,ang,len,depth)=>{let d=`M${x.toFixed(0)} ${y.toFixed(0)}`;const steps=6;for(let s=1;s<=steps;s++){ang+=(rnd()-.5)*.5;const l=len/steps;x+=Math.cos(ang)*l;y+=Math.sin(ang)*l;d+=`L${x.toFixed(0)} ${y.toFixed(0)}`;
  if(depth<2&&s>1&&s<steps&&rnd()<.45)branch(x,y,ang+(rnd()<.5?-1:1)*(.4+rnd()*.5),len*(.35+rnd()*.25),depth+1);}if(depth)thin+=d;else main+=d;};
 for(let i=0;i<15;i++)branch(cx,cy,i/15*Math.PI*2+rnd()*.3,230+rnd()*90,0);
 return geassVeinCache=`<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><path class="gv-halo" d="${main}"/><path class="gv-glow" d="${main}"/><path class="gv-glow thin" d="${thin}"/><path class="gv-core" d="${main}"/><path class="gv-core thin" d="${thin}"/></svg>`;}
let geassBoltCache='';
function geassBoltSVG(){if(geassBoltCache)return geassBoltCache;const rnd=geassRng(23),cx=200,cy=130;let d='';
 for(let i=0;i<11;i++){let a=i/11*Math.PI*2+rnd()*.4,r=8,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;d+=`M${x.toFixed(0)} ${y.toFixed(0)}`;while(r<280){r+=14+rnd()*20;a+=(rnd()-.5)*.35;x=cx+Math.cos(a)*r;y=cy+Math.sin(a)*r*.75;d+=`L${x.toFixed(0)} ${y.toFixed(0)}`;}}
 return geassBoltCache=`<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><path class="gb-halo" d="${d}"/><path class="gb-glow" d="${d}"/><path class="gb-core" d="${d}"/></svg>`;}
let geassNoiseURL='';
function geassNoise(){if(geassNoiseURL||typeof document==='undefined')return geassNoiseURL;try{const c=document.createElement('canvas'),S=256;c.width=c.height=S;const g=c.getContext('2d'),rnd=geassRng(5);g.fillStyle='#d0102f';g.fillRect(0,0,S,S);
  for(let i=0;i<420;i++){const x=rnd()*S,y=rnd()*S,r=2+rnd()*rnd()*22,light=rnd()<.42,col=light?'255,140,150':'90,0,18',a=light?.18+rnd()*.25:.2+rnd()*.3;
   const xs=[0,...(x<r?[S]:x>S-r?[-S]:[])],ys=[0,...(y<r?[S]:y>S-r?[-S]:[])];for(const ox of xs)for(const oy of ys){const gr=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,r);gr.addColorStop(0,`rgba(${col},${a})`);gr.addColorStop(1,`rgba(${col},0)`);g.fillStyle=gr;g.fillRect(x+ox-r,y+oy-r,r*2,r*2);}}
  geassNoiseURL=c.toDataURL('image/png');const im=new Image();im.src=geassNoiseURL;im.decode?.().catch(()=>{});geassNoise.img=im;}catch{}return geassNoiseURL;}
function geassStageHTML(){geassDefs();const noise=geassNoise();
 const sparks=Array.from({length:10},(_,i)=>`<i style="--x:${(i*37)%100}%;--y:${(i*53)%100}%;--dl:${(i*120)%1200}ms"></i>`).join('');
 return `<div class="gs-stage" aria-hidden="true"><b class="gs-dim"></b><span class="gs-feathers">${sparks}</span><span class="gs-zoom">${GEASS_SIGIL}</span>`
 +`<span class="gs-red"><b class="gs-red-base"></b><b class="gs-red-grain" style="${noise?`background-image:url(${noise})`:''}"></b><b class="gs-red-tint"></b></span>`
 +`<span class="gs-veins">${geassVeinSVG()}</span>`
 +`<span class="gs-tunnel"><b class="gs-tun-base"></b><b class="gs-tun-streaks"></b><span class="gs-bolts">${geassBoltSVG()}</span><span class="gs-bolts b2">${geassBoltSVG()}</span><b class="gs-tun-pale"></b></span>`
 +`<b class="gs-flash"></b><span class="gs-net"><span class="gs-net-a">${geassNetSVG(7)}</span><span class="gs-net-b">${geassNetSVG(19)}</span></span><b class="gs-flash2"></b></div>`;}
function geassFighterFX(){geassDefs();return `<span class="arise-manga-bubble geass-bubble" role="status"><small>ギアス</small><b>GEASS</b></span><span class="gs-fx" aria-hidden="true"><i class="gs-glow"></i><span class="gs-sigil">${GEASS_SIGIL}</span><i class="gs-ring"></i><i class="gs-ring r2"></i></span>`;}
if(!globalThis.__yuroSkip)try{(function(){let q=false;const paint=()=>{q=false;const nodes=document.querySelectorAll('.story-battle .geass-sigil-idle:empty,.story-battle .geass-reflect-fx>i:empty,.story-battle .geass-control>i:empty');if(!nodes.length)return;geassDefs();nodes.forEach(n=>{n.innerHTML=GEASS_SIGIL;});};
 const root=typeof document!=='undefined'&&document.getElementById('viewRoot');if(root)new MutationObserver(()=>{if(!q){q=true;requestAnimationFrame(paint);}}).observe(root,{childList:true,subtree:true});})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"geass.js");}
const positionStoryEffectsBeforeGeass=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeGeass.apply(this,arguments);try{
 if(document.querySelector('.story-battle .geass-skill')){if(!geassVoice.buffer)prepareGeassVoice();geassDefs();if(!geassNoiseURL){const warm=()=>{geassNoise();geassNetSVG(7);geassNetSVG(19);geassVeinSVG();geassBoltSVG();};if(typeof requestIdleCallback==='function')requestIdleCallback(warm,{timeout:1500});else setTimeout(warm,300);}}
 if(storyAnimating&&storyImpact?.action==='geass'){const arena=document.querySelector('.story-battle .story-arena'),stage=arena?.querySelector('.gs-stage'),caster=arena?.querySelector('.story-fighter.uses-geass>button');
  if(arena&&stage&&caster&&!stage.dataset.placed){stage.dataset.placed='1';const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect();stage.style.setProperty('--gx',((c.left+c.width/2-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--gy',((c.top+c.height*.3-a.top)/a.height*100).toFixed(2)+'%');stage.style.setProperty('--gw',(c.width*1.15).toFixed(0)+'px');stage.style.setProperty('--gz',(Math.hypot(a.width,a.height)/(c.width*1.15)*2.4).toFixed(2));}
  if(!geassPlayed.has(storyImpact)){geassPlayed.add(storyImpact);if(state.sound)playGeassVoice();}}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"geass.js");}

/* enuma.js */
globalThis.__yuroSkip=0;
let enumaVoice,enumaPlayed;
if(!globalThis.__yuroSkip)try{enumaVoice={file:'https://yurocollection.fr/assets/gilgamesh-enuma-v1.mp3',buffer:null,loading:null,missing:false};
enumaPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"enuma.js");}
function prepareEnumaVoice(){if(enumaVoice.missing||enumaVoice.buffer||enumaVoice.loading)return enumaVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 enumaVoice.loading=fetch(enumaVoice.file).then(r=>{if(!r.ok){enumaVoice.missing=true;throw Error('enuma audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>enumaVoice.buffer=b).catch(()=>{enumaVoice.loading=null;});return enumaVoice.loading;}
function playEnumaVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(enumaVoice.buffer){go(enumaVoice.buffer);return;}const p=prepareEnumaVoice();if(p)p.then(()=>{if(!enumaVoice.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<enumaVoice.buffer.duration-.5)go(enumaVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
const ENUMA_SWORD='<span class="ea-sword"><i class="ea-spear-glow"></i></span>';
function enumaStageHTML(){
 const flames=Array.from({length:14},(_,i)=>`<i style="--x:${(i*7.3+((i*37)%5))%100}%;--w:${8+((i*13)%9)}%;--h:${38+((i*29)%34)}%;--dl:${(i*97)%600}ms;--d:${900+((i*53)%500)}ms"></i>`).join('');
 const cols=Array.from({length:9},(_,i)=>`<i style="--x:${4+i*11.5+((i*7)%5)}%;--w:${7+((i*11)%6)}%;--dl:${(i*83)%420}ms"></i>`).join('');
 const rays=Array.from({length:12},(_,i)=>`<i style="--a:${i*30+((i*7)%11)}deg"></i>`).join('');
 const embers=Array.from({length:16},(_,i)=>`<i style="--x:${(i*23)%100}%;--dl:${(i*170)%2400}ms;--s:${3+(i%4)}px"></i>`).join('');
 return `<div class="ea-stage" aria-hidden="true"><b class="ea-dim"></b><span class="ea-wind"></span><span class="ea-swing"><b></b></span>`
 +`<span class="ea-red"><b class="ea-red-base"></b><span class="ea-flames">${flames}</span><b class="ea-sun"></b></span>`
 +`<span class="ea-orb"><span class="ea-orb-rays">${rays}</span><b class="ea-orb-core"></b><b class="ea-orb-cross"></b></span>`
 +`<b class="ea-flash"></b><b class="ea-dome"></b><span class="ea-cols">${cols}</span><b class="ea-vortex"></b>`
 +`<span class="ea-beams"><b class="ea-beam b1"></b><b class="ea-beam b2"></b><b class="ea-beam-core"></b></span><span class="ea-embers">${embers}</span><b class="ea-smoke"></b></div>`;}
function enumaFighterFX(){return `<span class="arise-manga-bubble enuma-bubble" role="status"><small>乖離剣エア</small><b>ENUMA ELISH</b></span><span class="ea-fx" aria-hidden="true"><i class="ea-aura"></i><span class="ea-gates"><i></i><i></i><i></i><i></i><i></i></span>${ENUMA_SWORD}</span>`;}
const positionStoryEffectsBeforeEnuma=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeEnuma.apply(this,arguments);try{
 if(!enumaVoice.buffer&&document.querySelector('.story-battle .enuma-skill'))prepareEnumaVoice();
 if(storyAnimating&&storyImpact?.action==='enuma'){const arena=document.querySelector('.story-battle .story-arena'),stage=arena?.querySelector('.ea-stage');
  if(arena&&stage&&!stage.dataset.placed){stage.dataset.placed='1';const a=arena.getBoundingClientRect(),caster=arena.querySelector('.story-fighter.uses-enuma>button'),hit=[...arena.querySelectorAll('.story-fighter.enuma-hit>button')],foes=hit.length?hit:[...arena.querySelectorAll('.story-team-row.enemies .story-fighter>button')];
   if(caster){const c=caster.getBoundingClientRect();stage.style.setProperty('--ex',((c.left+c.width/2-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--ey',((c.top+c.height*.4-a.top)/a.height*100).toFixed(2)+'%'); stage.style.setProperty('--sx',stage.style.getPropertyValue('--ex'));stage.style.setProperty('--sy',((c.top-c.height*.52-a.top)/a.height*100).toFixed(2)+'%');}
   if(foes.length){const r=foes.map(f=>f.getBoundingClientRect()),cy=r.reduce((n,x)=>n+x.top+x.height/2,0)/r.length,cx=r.reduce((n,x)=>n+x.left+x.width/2,0)/r.length;stage.style.setProperty('--tx',((cx-a.left)/a.width*100).toFixed(2)+'%');stage.style.setProperty('--ty',((cy-a.top)/a.height*100).toFixed(2)+'%');const xs=r.map(x=>x.left+x.width/2);stage.style.setProperty('--tw',((Math.max(...xs)-Math.min(...xs))/2/a.width*100).toFixed(2)+'%');}}
  if(!enumaPlayed.has(storyImpact)){enumaPlayed.add(storyImpact);if(state.sound)playEnumaVoice();}}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"enuma.js");}

/* enuma-gl.js */
globalThis.__yuroSkip=0;
const yuroGLLow_enumagl=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}},yuroGLScale_enumagl=(a,s)=>{const px=a.width*a.height*s*s,cap=120000;return yuroGLLow_enumagl()&&px>cap?s*Math.sqrt(cap/px):s;};
const ENUMA_FRAG=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R;uniform float T;uniform vec2 C;uniform vec2 G;uniform vec2 S;uniform float W;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float fbm3(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
vec3 fire(float x){x=clamp(x,0.,1.);vec3 c=mix(vec3(0.),vec3(.55,.02,0.),smoothstep(0.,.28,x));c=mix(c,vec3(1.,.22,.02),smoothstep(.22,.5,x));c=mix(c,vec3(1.,.62,.16),smoothstep(.48,.75,x));return mix(c,vec3(1.,.96,.78),smoothstep(.74,1.,x));}
float win(float t,float a,float b,float f){return smoothstep(a,a+f,t)*(1.-smoothstep(b-f,b,t));}
float flare(vec2 d,float k){return exp(-abs(d.y)*90.)*exp(-abs(d.x)*2.2)*k+exp(-length(d)*14.)*k*.6;}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec4 over(vec4 top,vec4 base){return top+base*(1.-top.a);}
void main(){
 vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.);vec2 c=(C-.5)*vec2(asp,1.);vec2 g=(G-.5)*vec2(asp,1.);vec2 s=(S-.5)*vec2(asp,1.);
 vec4 o=vec4(0.);
 // fond : léger voile sombre et rougeâtre, l'arène reste visible
 float veil=win(T,0.,7.45,.35);
 {float vg=length(p-mix(s,g,.5*smoothstep(1.9,3.2,T)));vec3 vc=mix(vec3(.08,.01,0.),vec3(.18,.03,.01),fbm3(p*2.+T*.15));float va=(.32+.25*smoothstep(.2,1.2,vg))*veil;o=over(vec4(vc,1.)*va,o);}
 // 1) « Enuma Elish ! » : Gilgamesh brandit Ea, le vent rouge s'enroule et remonte vers la pointe
 float w1=win(T,0.,3.2,.3);
 if(w1>0.){vec2 d=p-s;float r=length(d),a=atan(d.y,d.x);float a2=a<0.?a+6.2832:a,wb=smoothstep(.35,.65,abs(a)/3.1416);
  float k=smoothstep(0.,1.6,T);float st=mix(fbm(vec2((a+T*2.6+5.*r)*2.,r*9.+T*6.)),fbm(vec2((a2+T*2.6+5.*r)*2.,r*9.+T*6.)),wb);st=pow(smoothstep(.45,.9,st),1.8);
  float m=smoothstep(.02,.08,r)*smoothstep(.55,.08,r)*(.3+.9*k);
  vec3 col=vec3(1.,.16,.04)*st*m*1.6+vec3(1.,.72,.3)*pow(st,3.)*m;
  float mote=smoothstep(.986,1.,noise(p*70.+vec2(0.,-T*4.)))*smoothstep(.5,.05,length(p-c));col+=vec3(1.,.8,.4)*mote*2.;
  o=over(vec4(col,clamp(max(col.r,col.g)*.9,0.,1.))*w1,o);}
 // 2) le coup d'épée : traînée dorée en arc
 float w2=win(T,1.58,2.0,.05);
 if(w2>0.){vec2 d=p-c;float r=length(d),a=atan(d.x,d.y);float sweep=mix(-1.4,1.1,smoothstep(1.58,1.9,T));
  float arc=exp(-pow((r-.3)/.05,2.))*smoothstep(.35,0.,abs(a-sweep+.25)-.2)*smoothstep(-.6,0.,a-sweep+.9);
  vec3 col=vec3(1.,.8,.3)*arc*1.6+vec3(1.,.97,.85)*pow(arc,4.);o=over(vec4(col,clamp(arc,0.,1.))*w2,o);}
 // 3) charge : une sphère d'énergie grossit au bout d'Ea, éclairs, particules aspirées
 float w3=win(T,1.9,3.3,.12);
 if(w3>0.){vec2 d=p-s;float r=length(d),a=atan(d.y,d.x);float RR=mix(.015,.085,smoothstep(1.95,3.1,T))*(1.+.06*sin(T*40.));
  vec3 col=vec3(0.);float al=0.;
  if(r<RR){float z=sqrt(1.-r*r/(RR*RR));float sw=fbm(rot(T*3.)*(d/(RR*(z+.4)))*2.5+T*2.);col=fire(.6+sw*.45+z*.25);al=1.;}
  else{float h=exp(-(r-RR)*22.);col=vec3(1.,.3,.08)*h*1.4+vec3(1.,.8,.5)*exp(-(r-RR)*60.);al=clamp(h,0.,1.);}
  float in1=fbm(vec2(a*3.+log(r+.02)*4.+T*5.,log(r+.02)*3.+T*9.));float suck=pow(smoothstep(.55,.9,in1),2.)*smoothstep(.45,RR,r)*smoothstep(RR,RR+.05,r);
  col+=vec3(1.,.35,.1)*suck*1.6;al=max(al,suck*.9);
  float bolt=smoothstep(.93,1.,1.-abs(fbm3(vec2(a*2.2+T*8.,r*14.))-.5)*2.)*smoothstep(.3,RR,r)*step(RR,r)*step(.5,fract(T*7.));col+=vec3(1.,.9,.8)*bolt*1.5;al=max(al,bolt);
  float glow=exp(-length(p-c)*5.)*.35*smoothstep(1.95,3.,T);col+=vec3(1.,.4,.1)*glow;al=max(al,glow);
  float fk=flare(p-s,.55*smoothstep(2.2,3.1,T));col+=vec3(1.,.45,.25)*fk;al=max(al,clamp(fk,0.,1.));
  o=over(vec4(col,clamp(al,0.,1.))*w3,o);}
 // 4) le laser : de la pointe d'Ea jusqu'à l'équipe adverse, vent rouge en spirale autour
 float w4=win(T,3.1,5.05,.06);
 if(w4>0.){vec2 dir=normalize(g-s+vec2(1e-4));vec2 nrm=vec2(-dir.y,dir.x);vec2 d=p-s;float along=dot(d,dir),acr=dot(d,nrm);float L=length(g-s);
  float head=mix(0.,L+2.,smoothstep(3.1,3.3,T));float span=smoothstep(-.02,.02,along)*smoothstep(head+.05,head-.05,along);
  float wd=.07*smoothstep(3.1,3.35,T)*(1.+.12*sin(T*55.))*(1.-.5*smoothstep(4.75,5.05,T));
  float tb=(noise(vec2(along*14.-T*40.,1.))-.5)*.012;float x=abs(acr+tb)/max(wd,1e-3);
  float core=exp(-x*x*2.5),outer=exp(-x*.9);
  float spiral=.5+.5*sin((along*26.-T*48.)+atan(acr,wd*.8)*3.);float wind=smoothstep(2.6,.6,x)*smoothstep(.2,.95,spiral)*fbm3(vec2(along*8.-T*30.,acr*30.));
  vec3 col=vec3(1.,.06,.03)*outer*1.7+vec3(1.,.5,.35)*core*1.5+vec3(1.,.97,.92)*pow(core,3.)*1.2+vec3(1.,.2,.05)*wind*1.4;
  float rings=pow(.5+.5*sin(along*34.-T*70.),10.)*smoothstep(2.4,.8,x);col+=vec3(1.,.75,.6)*rings*1.2;
  float sp=smoothstep(.975,1.,noise(vec2(along*28.,acr*55.-sign(acr)*T*30.)))*exp(-abs(acr)*9.)*smoothstep(1.2,3.,x);col+=vec3(1.,.8,.5)*sp*2.;
  float al=clamp(outer*1.1+wind+rings*.5+sp,0.,1.)*span;
  float imp=smoothstep(3.25,3.35,T);float rg=length(p-g);float bloom=exp(-rg*7.)*(1.2+.3*sin(T*37.))*imp;float spark=smoothstep(.985,1.,noise((p-g)*90.+T*20.))*exp(-rg*5.)*imp;
  col=col*span+vec3(1.,.55,.2)*bloom+vec3(1.,.9,.6)*spark*2.;al=max(al,clamp(bloom+spark,0.,1.));
  float tipf=flare(p-s,.9*smoothstep(3.1,3.2,T)*(1.+.25*sin(T*47.)));col+=vec3(1.,.5,.35)*tipf;al=max(al,clamp(tipf,0.,1.));
  o=over(vec4(col,al)*w4,o);}
 // 5) l'explosion sur la ligne ennemie : boule de feu, onde de choc, puis fumée
 float w5=win(T,4.78,7.45,.08);
 if(w5>0.){float te=T-4.8;vec2 d=p-g;float r=length(d),a=atan(d.y,d.x);
  float RR=.44*(1.-exp(-max(te,0.)*5.));float turb=fbm(d*4.-vec2(0.,te*1.2)+fbm3(d*3.+te)*1.4);
  float edge=r/(RR+1e-3)+(turb-.5)*.55;float ball=smoothstep(1.05,.75,edge);
  float heat=clamp(1.15-edge*.75-te*.33+turb*.35,0.,1.);float smoke=smoothstep(.4,1.8,te)*smoothstep(1.,.3,edge);
  vec3 col=mix(fire(heat),mix(vec3(.12,.07,.06),vec3(.3,.12,.06),turb),smoke*(1.-heat*.8));float al=ball*(1.-smoothstep(1.6,2.6,te)*.7);
  for(int k=0;k<2;k++){float sgn=k==0?-1.:1.;float tk=te-.1-.08*float(k);vec2 dk=p-(g+vec2(sgn*W*asp,0.));float rk=length(dk);float Rk=.26*(1.-exp(-max(tk,0.)*6.));float tbk=fbm(dk*5.+float(k)*7.-vec2(0.,tk));float ek=rk/(Rk+1e-3)+(tbk-.5)*.6;float bk=smoothstep(1.05,.75,ek)*step(0.,tk)*(1.-smoothstep(1.4,2.4,tk)*.75);vec3 ck=mix(fire(clamp(1.1-ek*.8-tk*.4+tbk*.35,0.,1.)),vec3(.14,.08,.06),smoothstep(.5,1.7,tk)*.8);col=mix(col,ck,bk*(1.-al*.5));al=max(al,bk);}
  float deb=pow(noise(vec2(cos(a),sin(a))*14.),7.)*smoothstep(RR*.6,RR,r)*smoothstep(RR+.35*smoothstep(0.,.8,te),RR,r)*(1.-smoothstep(.4,1.2,te));col+=vec3(1.,.6,.25)*deb*3.;al=max(al,clamp(deb*2.,0.,1.));
  float xf=flare(d,1.2*exp(-te*3.5));col+=vec3(1.,.6,.4)*xf;al=max(al,clamp(xf,0.,1.));
  float ring=exp(-abs(r-te*1.6-(noise(vec2(cos(a),sin(a))*3.+te*3.)-.5)*.06)*30.)*(1.-smoothstep(.1,.9,te));col+=vec3(1.,.8,.5)*ring*1.5;al=max(al,clamp(ring,0.,1.));
  float fl=exp(-te*9.)*smoothstep(-.02,0.,te)*exp(-r*2.2);col+=vec3(1.,.95,.85)*fl;al=max(al,fl*.9);
  float ember=smoothstep(.99,1.,noise(p*85.+vec2(te*5.,-te*16.)))*smoothstep(1.3,.2,r)*smoothstep(.1,.4,te);col+=vec3(1.,.75,.35)*ember*2.;al=max(al,ember);
  o=over(vec4(col,clamp(al,0.,1.))*w5,o);}
 gl_FragColor=o;}`;
let enumaGL;
if(!globalThis.__yuroSkip)try{enumaGL={canvas:null,gl:null,loc:null,failed:false,started:new WeakMap(),raf:0};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"enuma-gl.js");}
function enumaStartGL(){if(enumaGL.gl||enumaGL.failed||enumaGL.pend)return;try{const cv=document.createElement('canvas');cv.className='ea-canvas';const gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});if(!gl)throw Error('no webgl');gl.getExtension('KHR_parallel_shader_compile');
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};const fs=sh(gl.FRAGMENT_SHADER,ENUMA_FRAG);const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 v;void main(){gl_Position=vec4(v,0.,1.);}'));gl.attachShader(pr,fs);gl.linkProgram(pr);enumaGL.pend={cv,gl,pr,fs};}catch(e){enumaGL.failed=true;}}
function enumaPrime(tries=0){const pd=enumaGL.pend;if(enumaGL.primed||enumaGL.failed)return;if(pd){const ext=pd.gl.getExtension('KHR_parallel_shader_compile');if(ext&&!pd.gl.getProgramParameter(pd.pr,ext.COMPLETION_STATUS_KHR)&&tries<60){setTimeout(()=>enumaPrime(tries+1),250);return;}}
 const go=()=>{if(storyAnimating){setTimeout(go,400);return;}try{const gl=enumaInitGL();if(!gl||enumaGL.canvas.isConnected)return;enumaGL.canvas.width=enumaGL.canvas.height=1;gl.viewport(0,0,1,1);gl.uniform2f(enumaGL.loc.R,1,1);gl.uniform1f(enumaGL.loc.T,1.5);gl.drawArrays(gl.TRIANGLES,0,3);enumaGL.primed=true;}catch{}};
 if(typeof requestIdleCallback==='function')requestIdleCallback(go,{timeout:2500});else setTimeout(go,300);}
function enumaInitGL(){if(enumaGL.gl||enumaGL.failed)return enumaGL.gl;if(!enumaGL.pend)enumaStartGL();const pd=enumaGL.pend;if(!pd)return null;delete enumaGL.pend;try{const {cv,gl,pr,fs}=pd;if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getShaderInfoLog(fs)||gl.getProgramInfoLog(pr));gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const v=gl.getAttribLocation(pr,'v');gl.enableVertexAttribArray(v);gl.vertexAttribPointer(v,2,gl.FLOAT,false,0,0);
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();enumaGL.failed=true;enumaGL.gl=null;});
  Object.assign(enumaGL,{canvas:cv,gl,loc:{R:gl.getUniformLocation(pr,'R'),T:gl.getUniformLocation(pr,'T'),C:gl.getUniformLocation(pr,'C'),G:gl.getUniformLocation(pr,'G'),S:gl.getUniformLocation(pr,'S'),W:gl.getUniformLocation(pr,'W')}});}catch(e){enumaGL.failed=true;enumaGL.err=String(e);}return enumaGL.gl;}
function enumaRunGL(stage,arena,impact){const gl=enumaInitGL();if(!gl)return false;const cv=enumaGL.canvas,a=arena.getBoundingClientRect();if(!a.width||!a.height)return false;
 const scale=yuroGLScale_enumagl(a,Math.min(1,760/a.width)*Math.min(window.devicePixelRatio||1,1.5)*.72),W=Math.max(2,Math.round(a.width*scale)),H=Math.max(2,Math.round(a.height*scale));if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}gl.viewport(0,0,W,H);
 const pt=(name,fallback)=>{const v=getComputedStyle(stage).getPropertyValue(name).trim();const n=parseFloat(v);return Number.isFinite(n)?n/100:fallback;};
 const cx=pt('--ex',.5),cy=1-pt('--ey',.72),tx=pt('--tx',.5),ty=1-pt('--ty',.24),sx=pt('--sx',cx),sy=1-pt('--sy',1-cy+.2),tw=pt('--tw',.2);
 stage.prepend(cv);stage.classList.add('ea-gl');
 if(!enumaGL.started.has(impact))enumaGL.started.set(impact,performance.now());const t0=enumaGL.started.get(impact),speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1;
 cancelAnimationFrame(enumaGL.raf);
 const _low=yuroGLLow_enumagl();let _sk=true;const frame=now=>{if(!cv.isConnected||!stage.isConnected||enumaGL.failed)return; if(_low&&(_sk=!_sk)){enumaGL.raf=requestAnimationFrame(frame);return;}const t=(now-t0)/1000*speed;gl.uniform2f(enumaGL.loc.R,W,H);gl.uniform1f(enumaGL.loc.T,t);gl.uniform2f(enumaGL.loc.C,cx,cy);gl.uniform2f(enumaGL.loc.G,tx,ty);gl.uniform2f(enumaGL.loc.S,sx,sy);gl.uniform1f(enumaGL.loc.W,tw);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);if(t<7.5)enumaGL.raf=requestAnimationFrame(frame);else{gl.clear(gl.COLOR_BUFFER_BIT);}};
 enumaGL.raf=requestAnimationFrame(frame);return true;}
const positionStoryEffectsBeforeEnumaGL=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeEnumaGL.apply(this,arguments);try{
 if(!enumaGL.gl&&!enumaGL.failed&&!enumaGL.pend&&document.querySelector('.story-battle .enuma-skill')){const warm=()=>{enumaStartGL();enumaPrime();};if(typeof requestIdleCallback==='function')requestIdleCallback(warm,{timeout:2000});else setTimeout(warm,400);}
 if(storyAnimating&&storyImpact?.action==='enuma'){const arena=document.querySelector('.story-battle .story-arena'),stage=arena?.querySelector('.ea-stage');if(stage&&!stage.querySelector('.ea-canvas'))enumaRunGL(stage,arena,storyImpact);}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"enuma-gl.js");}

/* muzan.js */
globalThis.__yuroSkip=0;
const MOON_ORDER=['kokushibo','doma','akaza','daki'];
const MOON_ROLES={tank:{icon:'🛡',label:'TANK',text:'Attire toutes les attaques ennemies et encaisse 30 % de dégâts en moins.'},damage:{icon:'⚔',label:'DÉGÂTS',text:'Frappe très fort : attaque ×1,8 celle de Muzan.'},stun:{icon:'❄',label:'GEL',text:'Chaque coup qui touche gèle la cible pendant 1 tour.'},heal:{icon:'✚',label:'SOINS',text:'Soigne toute l’équipe de 12 % de ses PV max à chaque fin de tour.'}};
function moonPanelHTML(b){if(typeof MOONS==='undefined'||!b||b.result)return '';const active=b.players?.[b.active];if(!active||active.hp<=0||active.acted)return '';const card=active.name?active:(typeof cardById==='function'?cardById(active.cardId):null);
 if(!isMuzanName(active,card)||active.muzanUsed)return '';const busy=(typeof storyAuto!=='undefined'&&storyAuto)||(typeof storyAnimating!=='undefined'&&storyAnimating),occupied=b.players.some(u=>u.summon&&u.hp>0);
 const items=MOON_ORDER.map(k=>{const m=MOONS[k],r=MOON_ROLES[m.role],hp=Math.round(active.maxHp*m.hp),atk=Math.round(active.attack*m.atk);
  return `<button type="button" class="moon-choice moon-${k}" style="--mc:${m.color}" data-story-action="moon-${k}" ${busy||occupied?'disabled':''} aria-label="Invoquer ${m.name}, ${m.title}, ${r.label}"><span class="moon-art"><img src="${typeof escapeHTML==='function'?escapeHTML(MOON_IMAGES[k]):MOON_IMAGES[k]}" alt="" loading="lazy" draggable="false"><i class="moon-rank" lang="ja">${m.rank}</i></span><span class="moon-copy"><span class="moon-role">${r.icon} ${r.label}</span><b>${m.name}</b><small>${m.title}</small><em>${r.text}</em><span class="moon-stats"><span>❤ ${hp}</span><span>⚔ ${atk}</span><span>⌛ 3 tours</span></span></span></button>`;}).join('');
 return `<aside class="moon-panel" aria-label="Lunes supérieures de Muzan"><header><span class="moon-panel-mark" aria-hidden="true">鬼</span><div><b>LUNES SUPÉRIEURES</b><small>${occupied?'Une invocation est déjà sur le terrain':'Choisis une lune · une seule fois par combat'}</small></div></header><div class="moon-list">${items}</div></aside>`;}

/* door.js */
globalThis.__yuroSkip=0;
let doorVoice,doorPlayed;
if(!globalThis.__yuroSkip)try{doorVoice={file:'https://yurocollection.fr/assets/muzan-door-v1.mp3',buffer:null,loading:null,missing:false};
doorPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"door.js");}
function prepareDoorVoice(){if(doorVoice.missing||doorVoice.buffer||doorVoice.loading)return doorVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 doorVoice.loading=fetch(doorVoice.file).then(r=>{if(!r.ok){doorVoice.missing=true;throw Error('door audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>doorVoice.buffer=b).catch(()=>{doorVoice.loading=null;});return doorVoice.loading;}
function playDoorVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(doorVoice.buffer){go(doorVoice.buffer);return;}const p=prepareDoorVoice();if(p)p.then(()=>{if(!doorVoice.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<doorVoice.buffer.duration-.4)go(doorVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
const positionStoryEffectsBeforeDoor=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeDoor.apply(this,arguments);try{
 if(!doorVoice.buffer&&document.querySelector('.story-battle .door-skill'))prepareDoorVoice();
 if(storyAnimating&&storyImpact?.action==='door'&&!doorPlayed.has(storyImpact)){doorPlayed.add(storyImpact);if(state.sound)playDoorVoice();}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"door.js");}

/* almighty.js */
globalThis.__yuroSkip=0;
let almightyVoice,almightyPlayed;
if(!globalThis.__yuroSkip)try{almightyVoice={file:'https://yurocollection.fr/assets/yhwach-almighty-v1.mp3',buffer:null,loading:null,missing:false};
almightyPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"almighty.js");}
function prepareAlmightyVoice(){if(almightyVoice.missing||almightyVoice.buffer||almightyVoice.loading)return almightyVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 almightyVoice.loading=fetch(almightyVoice.file).then(r=>{if(!r.ok){almightyVoice.missing=true;throw Error('almighty audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>almightyVoice.buffer=b).catch(()=>{almightyVoice.loading=null;});return almightyVoice.loading;}
function playAlmightyVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(almightyVoice.buffer){go(almightyVoice.buffer);return;}const p=prepareAlmightyVoice();if(p)p.then(()=>{if(!almightyVoice.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<almightyVoice.buffer.duration-.5)go(almightyVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
let ALMIGHTY_W,ALMIGHTY_H,ALMIGHTY_CARD;
if(!globalThis.__yuroSkip)try{ALMIGHTY_W=300;
ALMIGHTY_H=360;
ALMIGHTY_CARD={x0:responsiveX0(),x1:300-responsiveX0(),y0:125,y1:327};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"almighty.js");}
function responsiveX0(){return 300*.34/1.68;}
function almightyRng(seed){let s=seed;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};}
let almightyMassCache='';
function almightyMassSVG(){if(almightyMassCache)return almightyMassCache;const rnd=almightyRng(19),blobs=[];
 const inside=(x,y)=>Math.abs((x-150)/146)**2.4+Math.abs((y-200)/196)**(y<200?3.2:2)<=1;
 for(let n=0;n<900&&blobs.length<95;n++){const x=rnd()*ALMIGHTY_W,y=rnd()*ALMIGHTY_H,r=14+rnd()*26;if(!inside(x,y))continue;blobs.push([x,y,r]);}
 const circ=blobs.map(([x,y,r])=>`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}"/>`).join('');
 const rims=blobs.filter((b,i)=>i%2===0).map(([x,y,r])=>`<path d="M${(x-r*.7).toFixed(0)} ${(y-r*.55).toFixed(0)} A${r.toFixed(0)} ${r.toFixed(0)} 0 0 1 ${(x+r*.6).toFixed(0)} ${(y-r*.6).toFixed(0)}"/>`).join('');
 return almightyMassCache=`<svg class="aa-mass" viewBox="0 0 ${ALMIGHTY_W} ${ALMIGHTY_H}" preserveAspectRatio="none"><defs><filter id="aaGlow" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/><feGaussianBlur in="d" stdDeviation="5" result="b"/><feFlood flood-color="#9a1428"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#aaGlow)"><path d="M18 360 C8 250 10 120 40 60 C70 14 230 14 260 60 C290 120 292 250 282 360Z" fill="#050103"/><g fill="#070205" stroke="#2a0710" stroke-width="2">${circ}</g></g><g fill="none" stroke="#5a1220" stroke-width="2.2" stroke-linecap="round" opacity=".85">${rims}</g></svg>`;}
let ALMIGHTY_EYES;
if(!globalThis.__yuroSkip)try{ALMIGHTY_EYES=(()=>{const rnd=almightyRng(7),out=[],cx=150,cy=205;let k=0;
 const big=[[104,60,54,-14],[196,58,56,14],[150,34,40,0],[56,110,40,-24],[244,108,42,24],[150,92,30,0]];for(const [x,y,w,rt] of big)out.push([x,y,w,rt,k++]);
 for(let n=0;n<600&&out.length<20;n++){const x=rnd()*ALMIGHTY_W,y=rnd()*ALMIGHTY_H;if(Math.abs((x-150)/136)**2.4+Math.abs((y-200)/186)**(y<200?3.2:2)>1)continue;const c=ALMIGHTY_CARD;if(x>c.x0-6&&x<c.x1+6&&y>c.y0-10)continue;if(out.some(e=>Math.hypot(e[0]-x,e[1]-y)<e[2]*.9))continue;out.push([x,y,18+rnd()*20,(rnd()-.5)*50,k++]);}
 return out.map(([x,y,w,rt,i])=>[6+x/ALMIGHTY_W*88,5+y/ALMIGHTY_H*90,w/ALMIGHTY_W*100,rt,i]);})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"almighty.js");}
const ALMIGHTY_EYE='<svg viewBox="0 0 40 56"><path d="M20 3 C35 15 37 36 20 53 C3 36 5 15 20 3Z" fill="#ead2d8" stroke="#0a0204" stroke-width="3.4"/><path d="M20 3 C35 15 37 36 20 53" fill="none" stroke="#b6909a" stroke-width="4" opacity=".55"/><ellipse cx="20" cy="29" rx="5.6" ry="9.6" fill="#5a0612" stroke="#1a0206" stroke-width="1.4"/><ellipse cx="20" cy="29" rx="2.2" ry="5" fill="#2a0207"/></svg>';
function almightyAuraHTML(live){const eyes=(live?ALMIGHTY_EYES:ALMIGHTY_EYES.slice(0,14)).map(([x,y,w,r,i])=>`<i style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${w.toFixed(1)}%;--r:${r.toFixed(0)}deg;--k:${i}">${ALMIGHTY_EYE}</i>`).join('');return `<span class="aa-glow"></span><span class="aa-smoke">${'<i></i>'.repeat(11)}</span><span class="aa-eyes">${eyes}</span>`;}
if(!globalThis.__yuroSkip)try{(function(){let q=false;const paint=()=>{q=false;document.querySelectorAll('.story-battle .almighty-aura:empty').forEach(n=>{n.innerHTML=almightyAuraHTML(!!n.closest('.uses-almighty'));});};
 const root=typeof document!=='undefined'&&document.getElementById('viewRoot');if(root)new MutationObserver(()=>{if(!q){q=true;requestAnimationFrame(paint);}}).observe(root,{childList:true,subtree:true});})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"almighty.js");}
const positionStoryEffectsBeforeAlmighty=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeAlmighty.apply(this,arguments);try{
 if(!almightyVoice.buffer&&document.querySelector('.story-battle .almighty-skill'))prepareAlmightyVoice();
 if(storyAnimating&&storyImpact?.action==='almighty'&&!almightyPlayed.has(storyImpact)){almightyPlayed.add(storyImpact);if(state.sound)playAlmightyVoice();}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"almighty.js");}

/* sun-gl.js */
globalThis.__yuroSkip=0;
const yuroGLLow_sungl=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}},yuroGLScale_sungl=(a,s)=>{const px=a.width*a.height*s*s,cap=120000;return yuroGLLow_sungl()&&px>cap?s*Math.sqrt(cap/px):s;};
const SUN_FRAG=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R;uniform float T;uniform vec2 C;uniform vec2 G;uniform float W;uniform vec2 K;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float win(float t,float a,float b,float f){return smoothstep(a,a+f,t)*(1.-smoothstep(b-f,b,t));}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec4 over(vec4 top,vec4 base){return top+base*(1.-top.a);}
/* DA de la flamme de référence : base rouge vif, taches bordeaux, coulées orange, traînées jaunes étirées dans le sens du mouvement, éclats crème, bords rouges dentelés */
vec3 pal(float h,float dk){vec3 c=vec3(.8,.07,.02);c=mix(c,vec3(.38,.01,.02),smoothstep(.56,.74,dk)*(1.-smoothstep(.45,.62,h)));
 c=mix(c,vec3(1.,.34,.04),smoothstep(.44,.52,h));c=mix(c,vec3(1.,.7,.15),smoothstep(.6,.68,h));return mix(c,vec3(1.,.95,.72),smoothstep(.76,.84,h));}
// x : le long du flux ; y : en travers (bord à ±1) ; amp : épaisseur/vie ; cool : refroidissement
vec4 artFire(float x,float y,float t,float amp,float cool){
 vec2 w=vec2(fbm(vec2(x*1.1-t*.7,y*1.8)),fbm(vec2(x*1.1+3.7,y*1.8+t*.6)));float body=max(0.,1.-y*y);float core=body*amp;if(core<=.001)return vec4(0.);
 float n=fbm(vec2(x*2.3-t*1.7+w.x*1.6,y*4.6+w.y*2.2));float D=core+(n-.5)*1.15*smoothstep(0.,.35,core);
 float glow=smoothstep(-.15,.2,D)*.22;if(D<.12)return vec4(vec3(1.,.22,.04)*glow,glow*.55);
 float st=fbm(vec2(x*2.1-t*2.3+w.y*1.4,y*5.2+w.x*2.4));float dk=fbm(vec2(x*2.6-t*1.3+w.x,y*3.8+4.));
 float h=st*.82+body*.28*min(amp,1.2)+(D-.2)*.22-cool*.55;vec3 col=pal(h,dk);
 float rim=1.-smoothstep(.13,.27,D);col=mix(col,vec3(.98,.16,.03),rim*.75);float a=smoothstep(.12,.17,D);
 return over(vec4(col*a,a),vec4(vec3(1.,.22,.04)*glow,glow*.55));}
/* flammèche en goutte : cœur jaune, bord rouge */
vec4 fleck(vec2 f,float sz,float cool){vec2 q=f/sz;q.y+=.25;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.4),q.y*.75));if(d>1.)return vec4(0.);vec3 c=pal(1.-d*.85-cool*.5,0.);float a=smoothstep(1.,.85,d);return vec4(c*a,a);}
void main(){
 vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),g=(G-.5)*vec2(asp,1.);vec2 kk=max(K,vec2(.04,.06));
 float RR=max(.17,W*asp*1.55);vec4 o=vec4(0.);
 {float v=win(T,.0,3.3,.3);o=vec4(vec3(.09,.02,.0),1.)*(.28*v);}
 // 1) garde : un anneau de feu tourne autour de Yoriichi puis se resserre
 float w1=win(T,0.,.66,.12);if(w1>0.){vec2 d=(p-c)*vec2(1.,.82);float r=length(d),an=atan(d.y,d.x);float gr=smoothstep(0.,.28,T),sh=1.-smoothstep(.46,.64,T);float Rc=kk.y*1.15*mix(.75,1.,gr)*mix(.5,1.,sh);
  float spin=an-T*9.;float arc=.5+.5*cos(spin);float y=(r-Rc)/(Rc*(.16+.14*arc))+sin(an*3.+T*6.)*.25;o=over(artFire(an*2.4-T*9.,y,T,max(0.,arc*1.5-.2)*gr*sh,0.)*w1,o);}
 // 2) charge : sillage de feu entre sa place et la cible
 float w2=win(T,.58,1.,.07);if(w2>0.){float k=smoothstep(.6,.82,T);vec2 h=mix(c,g,k);vec2 sd=h-c;float L=max(length(sd),1e-3);vec2 dir=sd/L,nr=vec2(-dir.y,dir.x);vec2 d=p-c;float al=dot(d,dir),ac=dot(d,nr);
  float u=clamp(al/L,0.,1.);float on=smoothstep(-.01,.03,al)*smoothstep(L+.02,L-.01,al);float wid=.008+.03*u;o=over(artFire(al*9.,ac/wid,T,(.35+.8*u)*on*(1.-smoothstep(.8,1.,T)),smoothstep(.85,1.,T))*w2,o);}
 // 3) l'entaille : croissant de feu sur la cible + trait dentelé
 float te=T-.84;
 if(te>0.&&te<1.15){vec2 d=rot(.35)*(p-g-vec2(RR*.12,-RR*.32));float r=length(d),an=atan(d.y,d.x);
  float a0=-1.75,a1=2.2;float sweep=smoothstep(0.,.12,te)*1.08;float u=(an-a0)/(a1-a0);float head=smoothstep(sweep,sweep-.07,u)*step(0.,u);
  float taper=pow(sin(3.1416*clamp(u,0.,1.)),.7)*(.8+.45*smoothstep(.25,0.,abs(u-.35)));float th=RR*.34*taper+.004;
  float y=(r-RR)/th+sin(an*2.6+te*4.)*.28;float life=1.3*(1.-smoothstep(.28,1.05,te));float cool=smoothstep(.15,.7,te);
  vec4 k=artFire(an*3.2-te*6.,y,T,(life+.15)*head*taper,cool);float hot=exp(-pow((u-sweep+.03)/.05,2.))*(1.-smoothstep(.1,.2,te));k.rgb+=vec3(1.,.8,.45)*hot*k.a*.6;o=over(k,o);
  // traînées de feu qui débordent du croissant vers l'extérieur
  float y2=(r-RR*1.18)/(th*.55);o=over(artFire(an*5.-te*9.+7.,y2,T+3.,(life*.75)*head*taper*step(.3,u),cool+.1)*.9,o);
  vec2 q=rot(.75)*(p-g+vec2(RR*.45,-RR*.05));float L=RR*2.4;float al=q.x/L;float grow=smoothstep(0.,.08,te);
  if(abs(al)<grow){float hh=hash(vec2(floor(q.x*70.),5.));float spk=.007+.034*hh*hh*max(0.,1.-abs(fract(q.x*70.)-.5)*2.);float sw=spk*(1.-abs(al))*mix(1.,.3,smoothstep(.1,.4,te));float sf=1.-abs(q.y)/sw;
   float hs=step(smoothstep(.2,.55,te),noise(vec2(q.x*60.,te*6.)));float sa=smoothstep(0.,.15,sf)*hs*(1.-smoothstep(.45,.7,te));o=over(vec4(pal(.55+sf*.4-smoothstep(.05,.35,te)*.4,0.)*sa,sa),o);}
  float fl=exp(-te*14.)*exp(-length(p-g)*7.)*smoothstep(0.,.02,te);o=over(vec4(vec3(1.,.93,.7)*fl,fl*.9),o);}
 // 4) flammèches qui se détachent
 float w4=win(T,.95,2.4,.15);if(w4>0.){float tf=T-.95;vec2 q=(p-g)/RR+vec2(0.,tf*tf*.5);float an=atan(q.y,q.x);vec2 cell=vec2(an*4.5,length(q)*4.-tf*1.3);vec2 id=floor(cell);vec2 f=fract(cell)-.5;float h=hash(id);
  if(h>.86&&length(q)<1.7)o=over(fleck(f+vec2(sin(tf*4.+h*20.)*.12,0.),.2+.12*h,tf*.5)*w4,o);}
 // 6) impact : onde de chaleur, gerbe d'étincelles projetées, éclat solaire bref
 {float ti=T-.86;if(ti>0.&&ti<.9){vec2 d=p-g;float r=length(d),an=atan(d.y,d.x);
  float ring=exp(-pow((r-ti*RR*2.6)/(.006+ti*.03),2.))*(1.-smoothstep(.1,.6,ti));o=over(vec4(vec3(1.,.72,.3)*ring,ring*.8),o);
  float sun=exp(-ti*9.)*pow(max(0.,cos(an*4.+.4)),30.)*exp(-r/(RR*1.4));o=over(vec4(vec3(1.,.9,.6)*sun,sun*.8),o);
  vec2 cell=vec2(an*6.,r*14.-ti*16.);vec2 id=floor(cell),f=fract(cell)-.5;float h=hash(id);float sp=step(.86,h)*smoothstep(.13,.0,length(f*vec2(1.,.3)))*(1.-smoothstep(.2,.8,ti))*step(r,RR*2.2);o=over(vec4(mix(vec3(1.,.5,.1),vec3(1.,.95,.7),h)*sp,sp),o);}}
 gl_FragColor=o;}`;
let sunGL;
if(!globalThis.__yuroSkip)try{sunGL={canvas:null,gl:null,loc:null,failed:false,started:new WeakMap(),raf:0};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"sun-gl.js");}
function sunStartGL(){if(sunGL.gl||sunGL.failed||sunGL.pend)return;try{const cv=document.createElement('canvas');cv.className='sn-canvas';const gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});if(!gl)throw Error('no webgl');gl.getExtension('KHR_parallel_shader_compile');
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};const fs=sh(gl.FRAGMENT_SHADER,SUN_FRAG);const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 v;void main(){gl_Position=vec4(v,0.,1.);}'));gl.attachShader(pr,fs);gl.linkProgram(pr);sunGL.pend={cv,gl,pr,fs};}catch(e){sunGL.failed=true;}}
function sunPrime(tries=0){const pd=sunGL.pend;if(sunGL.primed||sunGL.failed)return;if(pd){const ext=pd.gl.getExtension('KHR_parallel_shader_compile');if(ext&&!pd.gl.getProgramParameter(pd.pr,ext.COMPLETION_STATUS_KHR)&&tries<60){setTimeout(()=>sunPrime(tries+1),250);return;}}
 const go=()=>{if(storyAnimating){setTimeout(go,400);return;}try{const gl=sunInitGL();if(!gl||sunGL.canvas.isConnected)return;sunGL.canvas.width=sunGL.canvas.height=1;gl.viewport(0,0,1,1);gl.uniform2f(sunGL.loc.R,1,1);gl.uniform1f(sunGL.loc.T,1.5);gl.drawArrays(gl.TRIANGLES,0,3);sunGL.primed=true;}catch{}};
 if(typeof requestIdleCallback==='function')requestIdleCallback(go,{timeout:2500});else setTimeout(go,300);}
function sunInitGL(){if(sunGL.gl||sunGL.failed)return sunGL.gl;if(!sunGL.pend)sunStartGL();const pd=sunGL.pend;if(!pd)return null;delete sunGL.pend;try{const {cv,gl,pr,fs}=pd;if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getShaderInfoLog(fs)||gl.getProgramInfoLog(pr));gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const v=gl.getAttribLocation(pr,'v');gl.enableVertexAttribArray(v);gl.vertexAttribPointer(v,2,gl.FLOAT,false,0,0);
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();sunGL.failed=true;sunGL.gl=null;});
  Object.assign(sunGL,{canvas:cv,gl,loc:{K:gl.getUniformLocation(pr,'K'),R:gl.getUniformLocation(pr,'R'),T:gl.getUniformLocation(pr,'T'),C:gl.getUniformLocation(pr,'C'),G:gl.getUniformLocation(pr,'G'),W:gl.getUniformLocation(pr,'W')}});}catch(e){sunGL.failed=true;sunGL.err=String(e);}return sunGL.gl;}
function sunStageHTML(){return '<div class="sn-stage" aria-hidden="true"></div>';}
let sunVoice,sunPlayed;
if(!globalThis.__yuroSkip)try{sunVoice={file:'https://yurocollection.fr/assets/yoriichi-sun-v4.mp3',buffer:null,loading:null,missing:false};
sunPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"sun-gl.js");}
function prepareSunVoice(){if(sunVoice.missing||sunVoice.buffer||sunVoice.loading)return sunVoice.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 sunVoice.loading=fetch(sunVoice.file).then(r=>{if(!r.ok){sunVoice.missing=true;throw Error('sun audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>sunVoice.buffer=b).catch(()=>{sunVoice.loading=null;});return sunVoice.loading;}
function playSunVoice(){const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(sunVoice.buffer){go(sunVoice.buffer);return;}const p=prepareSunVoice();if(p)p.then(()=>{if(!sunVoice.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<sunVoice.buffer.duration-.4)go(sunVoice.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
const positionStoryEffectsBeforeSun=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeSun.apply(this,arguments);try{
 if(document.querySelector('.story-battle .sun-skill')){if(!sunVoice.buffer)prepareSunVoice();if(!sunGL.gl&&!sunGL.failed&&!sunGL.pend){const warm=()=>{sunStartGL();sunPrime();};if(typeof requestIdleCallback==='function')requestIdleCallback(warm,{timeout:2000});else setTimeout(warm,400);}}
 if(storyAnimating&&storyImpact?.action==='sun'){const arena=document.querySelector('.story-battle .story-arena'),stage=arena?.querySelector('.sn-stage'),fighter=arena?.querySelector('.story-fighter.uses-sun'),caster=fighter?.querySelector(':scope>button');
  if(arena&&stage&&caster&&!stage.dataset.placed){stage.dataset.placed='1';const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect(),hit=[...arena.querySelectorAll('.story-fighter.sun-hit>button')],foes=hit.length?hit:[...arena.querySelectorAll('.story-team-row.enemies .story-fighter>button')];
   const rs=foes.map(f=>f.getBoundingClientRect()),gx=rs.length?rs.reduce((n,x)=>n+x.left+x.width/2,0)/rs.length:a.left+a.width/2,gy=rs.length?rs.reduce((n,x)=>n+x.top+x.height/2,0)/rs.length:a.top+a.height*.25,xs=rs.map(x=>x.left+x.width/2),spread=rs.length?(Math.max(...xs)-Math.min(...xs))/2+Math.max(...rs.map(x=>x.width))*.55:a.width*.2;
   const cx=c.left+c.width/2,cy=c.top+c.height/2;fighter.style.setProperty('--sdx',(gx+(rs[0]?.width||80)*.75-cx).toFixed(0)+'px');fighter.style.setProperty('--sdy',(gy+(rs[0]?.height||100)*.8-cy).toFixed(0)+'px');
   const gl=sunInitGL();if(gl){const cv=sunGL.canvas,scale=yuroGLScale_sungl(a,Math.min(1,760/a.width)*Math.min(window.devicePixelRatio||1,1.25)),W=Math.max(2,Math.round(a.width*scale)),H=Math.max(2,Math.round(a.height*scale));cv.width=W;cv.height=H;gl.viewport(0,0,W,H);stage.append(cv);
    if(!sunGL.started.has(storyImpact))sunGL.started.set(storyImpact,performance.now());const t0=sunGL.started.get(storyImpact),speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,
     u=[(cx-a.left)/a.width,1-(cy-a.top)/a.height,(gx-a.left)/a.width,1-(gy-a.top)/a.height,spread/a.width,(rs[0]?.width||a.width*.15)/2/a.height,(rs[0]?.height||a.height*.3)/2/a.height];cancelAnimationFrame(sunGL.raf);
    const _low=yuroGLLow_sungl();let _sk=true;const frame=now=>{if(!cv.isConnected||sunGL.failed)return; if(_low&&(_sk=!_sk)){sunGL.raf=requestAnimationFrame(frame);return;}const t=(now-t0)/1000*speed;gl.uniform2f(sunGL.loc.R,W,H);gl.uniform1f(sunGL.loc.T,t);gl.uniform2f(sunGL.loc.C,u[0],u[1]);gl.uniform2f(sunGL.loc.G,u[2],u[3]);gl.uniform1f(sunGL.loc.W,u[4]);gl.uniform2f(sunGL.loc.K,u[5],u[6]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);if(t<3.45)sunGL.raf=requestAnimationFrame(frame);else gl.clear(gl.COLOR_BUFFER_BIT);};sunGL.raf=requestAnimationFrame(frame);}}
  if(!sunPlayed.has(storyImpact)){sunPlayed.add(storyImpact);if(state.sound)playSunVoice();}}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"sun-gl.js");}

/* transform-fx.js */
globalThis.__yuroSkip=0;
let transformVoices,transformPlayed;
if(!globalThis.__yuroSkip)try{transformVoices={tornado:{file:'https://yurocollection.fr/assets/axel-tornado.mp3',skill:'.tornado-skill'},dslash:{file:'https://yurocollection.fr/assets/yami-dimension-slash.mp3',skill:'.dslash-skill'},blackhole:{file:'https://yurocollection.fr/assets/frieren-black-hole.mp3',skill:'.blackhole-skill'},bhreflect:{file:'https://yurocollection.fr/assets/frieren-zoltraak.mp3',skill:'.has-blackhole'},swap:{file:'https://yurocollection.fr/assets/ayanokoji-swap.mp3',skill:'.swap-skill'},zanka:{file:'https://yurocollection.fr/assets/yamamoto-zanka-v2.mp3',skill:'.zanka-skill'},slime:{file:'https://yurocollection.fr/assets/rimuru-slime.mp3',skill:'.slime-skill'},hunt:{file:'https://yurocollection.fr/assets/chrollo-hunt-v2.mp3',skill:'.hunt-skill'},xebec:{file:'https://yurocollection.fr/assets/xebec-haki-v2.mp3',skill:'.xebec-skill'},berserk:{file:'https://yurocollection.fr/assets/guts-berserker-v2.mp3',skill:'.berserk-skill'},overlord:{file:'https://yurocollection.fr/assets/ainz-overlord.mp3',skill:'.overlord-skill'},neant:{file:'https://yurocollection.fr/assets/zeno-neant.mp3',skill:'.neant-skill'},domination:{file:'https://yurocollection.fr/assets/makima-domination-v3.mp3',skill:'.domination-skill'},arsenal:{file:'https://yurocollection.fr/assets/toji-arsenal-v5.mp3',skill:'.arsenal-skill'},mugetsu:{file:'https://yurocollection.fr/assets/ichigo-mugetsu.mp3',skill:'.mugetsu-skill'},future:{file:'https://yurocollection.fr/assets/shinra-future.mp3',skill:'.future-skill'},mui:{file:'https://yurocollection.fr/assets/goku-mui-v4.mp3',skill:'.mui-skill'},alter:{file:'https://yurocollection.fr/assets/afo-alter-v2.mp3',skill:'.alter-skill'},darkblade:{file:'https://yurocollection.fr/assets/mihawk-darkblade-v3.mp3',skill:'.blade-skill'},armor:{file:'https://yurocollection.fr/assets/escanor-armor-v2.mp3',skill:'.armor-skill'},vampiric:{file:'https://yurocollection.fr/assets/alucard-vampiric-v1.mp3',skill:'.vampiric-skill'},titan:{file:'https://yurocollection.fr/assets/eren-titan-v1.mp3',skill:'.titan-skill'}};
transformPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"transform-fx.js");}
function prepareTransformVoice(key){const v=transformVoices[key];if(!v||v.missing||v.buffer||v.loading)return v?.loading;const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.decodeAudioData)return null;
 v.loading=fetch(v.file).then(r=>{if(!r.ok){v.missing=true;throw Error('audio');}return r.arrayBuffer();}).then(d=>ctx.decodeAudioData(d)).then(b=>v.buffer=b).catch(()=>{v.loading=null;});return v.loading;}
function playTransformVoice(key){const v=transformVoices[key],ctx=typeof gameAudio==='function'?gameAudio():null;if(!v||!ctx?.createBufferSource||!state.sound||document.hidden)return;const t0=ctx.currentTime,impact=storyImpact;
 const go=(buf,offset=0)=>{try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.connect(g);g.connect(ctx.destination);s._offset=offset;s.start(ctx.currentTime+.01,offset);s.onended=()=>{try{s.disconnect();g.disconnect();}catch{}};if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const run=()=>{if(v.buffer){go(v.buffer);return;}const p=prepareTransformVoice(key);if(p)p.then(()=>{if(!v.buffer||storyImpact!==impact||!storyAnimating)return;const speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,off=(ctx.currentTime-t0)*speed;if(off<v.buffer.duration-.4)go(v.buffer,off);});};
 if(ctx.state==='suspended')ctx.resume().then(run).catch(()=>{});else run();}
let transformRecent;
if(!globalThis.__yuroSkip)try{transformRecent=new Map();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"transform-fx.js");}
const positionStoryEffectsBeforeTransform=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeTransform.apply(this,arguments);try{
 for(const k in transformVoices){if(!transformVoices[k].buffer&&document.querySelector('.story-battle '+transformVoices[k].skill))prepareTransformVoice(k);}
 const a=storyImpact?.action; const tk=a+':'+(storyImpact?.player??'')+':'+(storyImpact?.enemy??'')+':'+(storyImpact?.damage??'');if(storyAnimating&&transformVoices[a]&&!transformPlayed.has(storyImpact)&&!(transformRecent.has(tk)&&Date.now()-transformRecent.get(tk)<5000)){transformPlayed.add(storyImpact);transformRecent.set(tk,Date.now());if(transformRecent.size>40)transformRecent.delete(transformRecent.keys().next().value);if(state.sound)playTransformVoice(a);}
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"transform-fx.js");}

/* transform-gl.js */
globalThis.__yuroSkip=0;
const yuroGLLow_transformgl=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}},yuroGLScale_transformgl=(a,s,cap=120000)=>{const px=a.width*a.height*s*s;return yuroGLLow_transformgl()&&px>cap?s*Math.sqrt(cap/px):s;};
const TF_HEAD=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R;uniform float T;uniform vec2 C;uniform vec2 K;uniform vec2 S0;uniform vec2 S1;uniform vec2 S2;uniform float N;uniform float L;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float win(float t,float a,float b,float f){return smoothstep(a,a+f,t)*(1.-smoothstep(b-f,b,t));}
vec4 over(vec4 top,vec4 base){return top+base*(1.-top.a);}
`;
const VAMP_FRAG=TF_HEAD+`
vec2 bz(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
vec3 rib(vec2 p,vec2 a,vec2 c,float sd){vec2 m=(a+c)*.5+vec2((sd-.5)*.7,.08+.3*sd);float best=1e9,bt=0.,side=1.;vec2 pr=a;
 for(int i=1;i<=12;i++){float t=float(i)/12.;vec2 q=bz(a,m,c,t)+vec2(sin(t*8.+T*5.+sd*11.),cos(t*6.-T*4.+sd*7.)*.4)*.022*sin(t*3.1416);vec2 e=q-pr;float h=clamp(dot(p-pr,e)/max(dot(e,e),1e-6),0.,1.);vec2 d=p-pr-e*h;float dd=length(d);if(dd<best){best=dd;bt=(float(i-1)+h)/12.;side=sign(e.x*d.y-e.y*d.x);}pr=q;}
 return vec3(best*side,bt,0.);}
vec4 blood(vec3 r,float T,float sd){float head=smoothstep(.42,1.35,T+sd*.12),tail=smoothstep(1.55,2.45,T+sd*.1);float bt=r.y;
 if(bt>head||bt<tail)return vec4(0.);float bol=smoothstep(.7,1.,sin(bt*16.-T*19.+sd*9.));float pulse=.9+.12*sin(bt*22.-T*12.+sd*6.)+.35*bol;float taper=smoothstep(0.,.07,head-bt)*smoothstep(0.,.05,bt-tail);
 float w=mix(.016,.007,bt)*pulse*mix(.3,1.,taper)+.0015;float x=r.x/w;if(abs(x)>1.)return vec4(0.);
 float z=sqrt(1.-x*x);vec3 col=mix(vec3(.12,0.,.01),vec3(.62,.0,.03),z);col=mix(col,vec3(.9,.06,.08),z*z*z*(.5+.5*bol));
 col+=vec3(1.,.8,.8)*pow(clamp(1.-abs(x+.42)*5.,0.,1.),2.)*(.65+.35*bol);col+=vec3(.6,.1,.1)*pow(clamp(1.-abs(x-.6)*6.,0.,1.),2.)*.3;
 float a=smoothstep(1.,.75,abs(x));return vec4(col*a,a);}
vec4 splash(vec2 p,vec2 s,float T,float sd){float te=T-.32-sd*.08;if(te<0.||te>1.)return vec4(0.);vec4 o=vec4(0.);vec2 d=p-s;
 for(int i=0;i<9;i++){float fi=float(i);float an=1.0+fi*.27+hash(vec2(fi,sd))*.5-.25;float sp=.25+hash(vec2(sd,fi))*.35;vec2 q=s+vec2(cos(an),sin(an))*sp*te*vec2(1.6,1.)-vec2(0.,1.1*te*te);
  float rr=.011*(1.-te*.7)*(.6+hash(vec2(fi+3.,sd)));float k=length(p-q)/rr;if(k<1.){float z=sqrt(1.-k*k);vec3 c=mix(vec3(.2,0.,.01),vec3(.8,.03,.05),z)+vec3(1.,.6,.6)*pow(max(0.,1.-length((p-q)/rr+vec2(.35,-.35))*1.6),3.);float a=smoothstep(1.,.8,k);o=over(vec4(c*a,a),o);}}
 float mist=fbm(d*14.+vec2(0.,te*2.))*1.3-length(d*vec2(1.,1.3))*(9.-te*5.);float ma=clamp(mist,0.,1.)*(1.-smoothstep(.3,1.,te))*.8;o=over(o,vec4(vec3(.35,0.,.02)*ma,ma));return o;}
/* chauve-souris : corps + ailes festonnées qui battent */
float bat(vec2 q,float flap){float ax=abs(q.x);if(ax>1.)return 0.;float body=step(length(q*vec2(3.2,1.6)),.42);float top=.12+ax*flap*.55-ax*ax*.15;float bot=top-.42*(1.-ax)-.1+.09*abs(sin(ax*9.42));
 float wing=step(bot,q.y)*step(q.y,top)*step(.08,ax);float ears=step(abs(abs(q.x)-.07),.03)*step(.18,q.y)*step(q.y,.32);return max(max(body,wing),ears);}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec4 o=vec4(0.);
 float dk=win(T,0.,3.4,.35);float rc=length((p-c)*vec2(1.,.8));
 o=vec4(vec3(.05,0.,.01),1.)*(.5*dk)+vec4(vec3(.5,0.,.04),1.)*(.28*dk*exp(-rc*3.));o.a=min(o.a,1.);
 // vignette pourpre
 float vg=smoothstep(.35,1.05,length(uv-.5)*1.5)*dk;o=over(vec4(vec3(.12,0.,.02)*vg,vg*.6),o);
 // lune de sang au-dessus de l'arène
 {vec2 mc=vec2(asp*.32,.3);float r=length(p-mc),mr=.11;float disk=smoothstep(mr,mr-.004,r);float cr=fbm((p-mc)*28.)*.5+fbm((p-mc)*9.)*.5;vec3 mcol=mix(vec3(.55,.03,.05),vec3(.95,.2,.15),cr)*(1.-.35*smoothstep(.0,mr,length(p-mc-vec2(-.03,.03))));
  float halo=exp(-max(r-mr,0.)*18.)*.35*(1.-disk);float ma=(disk*.85+halo)*dk;o=over(vec4(mix(vec3(.8,.08,.06),mcol,disk)*ma,ma),o);}
 // tourbillon de sang autour d'Alucard
 float sw=win(T,.9,2.75,.3);if(sw>0.){vec2 d=(p-c)*vec2(1.,1.25);float r=length(d),an=atan(d.y,d.x);float rr=mix(.2,.06,smoothstep(1.,2.6,T));
  float spi=fbm(vec2(an*2.+log(r+.01)*5.-T*7.,r*8.));float band=exp(-pow((r-rr)/(.05+.03*spi),2.));float a=clamp(band*(spi*1.6-.25),0.,1.)*sw*.85;o=over(vec4(mix(vec3(.25,0.,.02),vec3(.85,.05,.08),spi)*a,a),o);}
 vec2 ss[3];ss[0]=(S0-.5)*vec2(asp,1.);ss[1]=(S1-.5)*vec2(asp,1.);ss[2]=(S2-.5)*vec2(asp,1.);
 for(int i=0;i<3;i++){if(float(i)>=N)break;float sd=float(i)/3.+.15;o=over(splash(p,ss[i],T,sd),o);
  for(int j=0;j<3;j++){float s2=sd+float(j)*.37;vec2 off=vec2((float(j)-1.)*.028,0.);o=over(blood(rib(p,ss[i]+off,c+vec2((float(j)-1.)*.012,K.y*.3),fract(s2*1.7)),T,fract(s2*2.3)),o);}}
 // nuée de chauves-souris qui jaillit d'Alucard quand il a bu
 float bw=win(T,2.25,3.4,.15);if(bw>0.){for(int i=0;i<12;i++){float fi=float(i);float t0=2.25+fi*.04;float tt=T-t0;if(tt<0.)continue;float an=fi*2.4+.3;vec2 dir=vec2(cos(an),sin(an)*.7+.35);
  vec2 bp=c+dir*tt*(.55+.3*hash(vec2(fi,1.)))+vec2(sin(tt*9.+fi)*.02,cos(tt*7.+fi)*.015);float sz=.05+.035*hash(vec2(fi,2.));vec2 q=(p-bp)/sz;q.x*=sign(dir.x+.001);
  float b=bat(q,sin(tt*28.+fi*3.));if(b>0.){float fa=bw*(1.-smoothstep(.7,1.1,tt));o=over(vec4(vec3(.05,0.,.01),1.)*fa,o);}else{float g=bat(q*.86,sin(tt*28.+fi*3.));o=over(vec4(vec3(.9,.05,.08),1.)*g*.55*bw*(1.-smoothstep(.7,1.1,tt)),o);}}}
 // absorption : pulsation rouge + anneau
 float te=T-2.35;if(te>0.&&te<1.){float ring=exp(-pow((rc-.04-te*.32)/(.006+te*.014),2.))*(1.-te);float fl=exp(-te*6.)*exp(-rc*6.);o=over(vec4(vec3(1.,.2,.25)*ring,ring*.7),o);o=over(vec4(vec3(1.,.25,.25)*fl,fl*.8),o);}
 gl_FragColor=o;}`;
const TITAN_FRAG=TF_HEAD+`
vec3 fire(float x){x=clamp(x,0.,1.);vec3 c=mix(vec3(.25,.04,0.),vec3(.9,.25,.02),smoothstep(0.,.3,x));c=mix(c,vec3(1.,.6,.12),smoothstep(.25,.6,x));c=mix(c,vec3(1.,.88,.5),smoothstep(.55,.85,x));return mix(c,vec3(1.,.99,.94),smoothstep(.85,1.,x));}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec4 o=vec4(0.);
 float dk=win(T,0.,4.8,.3);o=vec4(vec3(.01,.02,.02),1.)*(.45*dk);
 // nuages d'orage en haut, éclairés par la foudre
 float cw=win(T,0.,2.6,.35);if(cw>0.){vec2 q=(p-vec2(c.x,.62))*vec2(1.,1.8);float r=length(q),an=atan(q.y,q.x);float n=fbm(vec2(an*1.5-T*.6,r*3.-T*.4)+fbm(q*3.+T*.3));
  float d=clamp(n*1.7-.55+smoothstep(.0,.45,uv.y-.45)*.6,0.,1.)*smoothstep(.35,.7,uv.y);vec3 col=mix(vec3(.04,.05,.06),vec3(.16,.16,.18),n)+vec3(1.,.82,.45)*L*pow(n,2.)*1.4;o=over(vec4(col*d,d)*cw,o);}
 o.rgb+=vec3(1.,.85,.5)*L*.12*dk;
 // explosion : flash de feu au cœur puis vapeur en volutes qui s'élève et s'éclaircit
 float te=T-.48;if(te>0.&&te<3.6){float Rr=.06+.36*(1.-exp(-te*3.2));vec2 cc=c+vec2(0.,.08*te+.03);vec2 q=(p-cc)/Rr;q.y*=.85;
  vec2 w=vec2(fbm(q*1.3+vec2(te*.35,0.)),fbm(q*1.3+vec2(5.,-te*.35)));vec2 qq=q*1.5+w*.9+vec2(0.,-te*.7);
  float n=fbm(qq);float bl=1.-abs(noise(qq*2.3)*2.-1.);float rq=length(q);
  float dens=n*1.45+bl*.3-rq*.95+.12;float a=smoothstep(0.,.55,dens)*(1.-smoothstep(1.6,3.6,te))*.9;
  float heat=clamp(1.25-te*2.4-rq*.7+n*.55,0.,1.);float glow=exp(-rq*rq*2.5)*smoothstep(1.4,.2,te)*.75;
  float shade=clamp(.62+n*.55+bl*.18-q.y*.08,0.,1.2);vec3 smoke=mix(vec3(.42,.36,.32),vec3(.93,.91,.88),smoothstep(.25,1.6,te))*shade;
  vec3 col=mix(smoke,fire(heat),smoothstep(.1,.6,heat));col+=vec3(1.,.62,.25)*glow*(1.-heat);
  vec2 kd=abs(p-c)/K;float card=1.-smoothstep(.5,1.2,length(kd*vec2(.85,.75)));a*=1.-card*smoothstep(.6,1.2,te)*.88;
  o=over(vec4(col*a,a),o);
  float emb=smoothstep(.975,1.,noise(q*20.+vec2(te*2.,-te*9.)))*smoothstep(1.8,.4,rq)*win(te,.05,1.8,.3);o=over(vec4(vec3(1.,.72,.3)*emb,emb),o);}
 // ondes de choc : l'éclair puis le rugissement
 float rc=length((p-c)*vec2(1.,1.15));
 for(int i=0;i<4;i++){float t0=i==0?.5:1.75+float(i-1)*.55;float tt=T-t0;if(tt>0.&&tt<1.2){float ring=exp(-pow((rc-tt*(i==0?1.1:.8))/(.006+tt*.018),2.))*(1.-tt/1.2);vec3 rcol=i==0?vec3(1.,.9,.6):vec3(1.,.97,.9);o=over(vec4(rcol*ring,ring)*(i==0?1.:.45),o);}}
 // flash de transformation
 float fl=T>.48?exp(-(T-.48)*6.5):0.;fl=fl*(.55+.45*exp(-rc*2.5));o=over(vec4(vec3(1.,.95,.8)*fl,fl*.92),o);
 gl_FragColor=o;}`;
const ARMOR_FRAG=TF_HEAD+`
uniform float M;uniform float P;
/* feu solaire d'Escanor : même DA que le feu de Yoriichi (coulées étirées, taches sombres, bords dentelés) mais doré */
vec3 spal(float h,float dk){vec3 c=vec3(.86,.22,.02);c=mix(c,vec3(.45,.06,.01),smoothstep(.56,.74,dk)*(1.-smoothstep(.45,.62,h)));
 c=mix(c,vec3(1.,.5,.06),smoothstep(.42,.5,h));c=mix(c,vec3(1.,.8,.25),smoothstep(.58,.66,h));return mix(c,vec3(1.,.98,.85),smoothstep(.74,.82,h));}
vec4 sFire(float x,float y,float t,float amp){float body=max(0.,1.-y*y);float core=body*amp;if(core<=.001)return vec4(0.);
 vec2 w=vec2(fbm(vec2(x*1.1-t*.7,y*1.8)),fbm(vec2(x*1.1+3.7,y*1.8+t*.6)));float n=fbm(vec2(x*2.3-t*1.9+w.x*1.6,y*4.6+w.y*2.2));float D=core+(n-.5)*1.15*smoothstep(0.,.35,core);
 float glow=smoothstep(-.15,.2,D)*.25;if(D<.12)return vec4(vec3(1.,.4,.05)*glow,glow*.55);
 float st=fbm(vec2(x*2.1-t*2.4+w.y*1.4,y*5.2+w.x*2.4));float dk=fbm(vec2(x*2.6-t*1.3+w.x,y*3.8+4.));float h=st*.85+body*.3*min(amp,1.2)+(D-.2)*.24;
 vec3 col=spal(h,dk);float rim=1.-smoothstep(.13,.27,D);col=mix(col,vec3(1.,.35,.04),rim*.7);float a=smoothstep(.12,.17,D);return over(vec4(col*a,a),vec4(vec3(1.,.4,.05)*glow,glow*.55));}
/* flammes qui montent tout autour d'une carte (demi-taille k), sens du flux vers le haut */
vec4 cardFire(vec2 p,vec2 c,vec2 k,float t,float amp){vec2 q=(p-c)/k.y;float rc=.14;vec2 h=vec2(k.x/k.y,1.)-rc;vec2 e=abs(q)-h;float d=length(max(e,0.))+min(max(e.x,e.y),0.)-rc;d+=(fbm(vec2(atan(q.y,q.x)*2.,t*.4))-.5)*.12;if(d<-.02||amp<=0.)return vec4(0.);
 vec2 w=vec2(fbm(q*2.+vec2(0.,-t*1.3)),fbm(q*2.+vec2(5.,-t*1.1)));float n=fbm(vec2(q.x*3.4+w.x*.8,q.y*1.7-t*2.6+w.y*.9));float st=fbm(vec2(q.x*5.+w.y,q.y*2.2-t*3.2));
 float reach=(.08+.26*smoothstep(-1.,1.15,q.y)+.08*smoothstep(.85,1.25,q.y))*amp;float D=n*1.35-d/max(reach,.01)*.75-.12;if(D<.0){float g=smoothstep(-.35,0.,D)*.3*amp;return vec4(vec3(1.,.4,.05)*g,g*.5);}
 float hh=st*.72+D*.5+.06*exp(-d*14.);vec3 col=spal(hh,fbm(q*4.+vec2(0.,-t*2.)));float rim=1.-smoothstep(0.,.12,D);col=mix(col,vec3(1.,.3,.03),rim*.7);float a=smoothstep(0.,.05,D);
 return over(vec4(col*a,a),vec4(vec3(1.,.4,.05)*.3*amp,.15*amp));}
/* aura de flammes qui enveloppe toute la carte : halo doré régulier + langues de feu qui montent, tout autour */
vec4 auraFire(vec2 p,vec2 c,vec2 k,float t,float amp){vec2 q=(p-c)/k.y;float rc=.16;vec2 h=vec2(k.x/k.y,1.)-rc;vec2 e=abs(q)-h;float d=length(max(e,0.))+min(max(e.x,e.y),0.)-rc;if(d<-.04||amp<=0.)return vec4(0.);
 float halo=exp(-max(d,0.)/.22)*.5*amp*(.85+.15*sin(t*7.+q.y*3.));vec4 o=vec4(vec3(1.,.55,.12)*halo,halo*.75);
 vec2 w=vec2(fbm(q*2.2+vec2(0.,-t*1.4)),fbm(q*2.2+vec2(5.,-t*1.2)));float n=fbm(vec2(q.x*4.+w.x,q.y*2.2-t*2.8+w.y));
 float reach=(.17+.13*smoothstep(-1.,1.2,q.y))*amp;float D=n*1.3-max(d,0.)/max(reach,.01)*.6-.16;
 if(D>0.){float hh=.28+n*.32+D*.35+.1*exp(-max(d,0.)*16.);vec3 col=spal(hh,fbm(q*5.-t));float a=smoothstep(0.,.08,D)*.85;col=mix(col,vec3(1.,.4,.05),(1.-smoothstep(0.,.12,D))*.6);o=over(vec4(col*a,a),o);}
 return o;}
/* brasier derrière la carte (silhouette de flammes en capuche, comme l'aura de Yhwach) */
vec4 bigFire(vec2 p,vec2 c,vec2 k,float t,float amp){vec2 q=(p-c)/k.y;float ax=k.x/k.y*1.95;float sh=1.-length(vec2(q.x/ax,(q.y-.3)/(q.y>.3?1.75:1.12)));if(sh<-.5||amp<=0.)return vec4(0.);
 vec2 w=vec2(fbm(q*1.6+vec2(0.,-t*1.2)),fbm(q*1.6+vec2(4.,-t*1.)));float n=fbm(vec2(q.x*2.6+w.x,q.y*1.5-t*2.6+w.y));float D=sh*1.3*amp+(n-.55)*1.1;
 float glow=smoothstep(-.4,.1,D)*.35*amp;vec4 o=vec4(vec3(1.,.45,.08)*glow,glow*.6);if(D<0.)return o;
 float hh=.3+n*.4+D*.45;vec3 col=spal(hh,fbm(q*3.-vec2(0.,t*1.5)));float a=smoothstep(0.,.08,D);col=mix(col,vec3(1.,.32,.04),(1.-smoothstep(0.,.15,D))*.6);return over(vec4(col*a,a),o);}
/* bouclier en écu : or martelé, soleil gravé, liseré de feu */
float shieldIn(vec2 q){float w=q.y>-.1?.78:.78*sqrt(max(0.,1.-pow((q.y+.1)/1.,2.)));return step(abs(q.x),w)*step(q.y,.82-.12*q.x*q.x)*step(-1.08,q.y);}
vec4 shield(vec2 q,float t,float lit){float a=shieldIn(q);if(a<=0.){float rim=shieldIn(q*.86);float g=rim*(.5+.5*fbm(q*5.+vec2(0.,-t*4.)));return vec4(vec3(1.,.45,.06)*g,g*.8);}
 float inner=shieldIn(q*1.18);vec3 gold=mix(vec3(.62,.32,.05),vec3(1.,.82,.36),clamp(.55+q.y*.35-q.x*.25+.2*noise(q*9.),0.,1.));
 float sun=length(q-vec2(0.,.1));float rays=smoothstep(.06,.0,abs(fract(atan(q.y-.1,q.x)*1.91)-.5)-.38)*step(.2,sun)*step(sun,.42);vec3 col=mix(vec3(.75,.38,.05),gold,inner);
 col=mix(col,vec3(1.,.95,.7),smoothstep(.2,.14,sun)+rays*.6);col*=lit;return vec4(col,1.);}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec4 o=vec4(0.);vec2 k=K;
 if(M>1.5){o=shield((p)/vec2(.42,.42),T,1.);gl_FragColor=o;return;}
 if(M>.5){// image de boucle : deux couches décalées d'une période, fondu enchaîné = boucle sans couture
  float L=1.6,t1=P*L,t2=t1-L;vec4 a1=bigFire(p,c,k,t1+10.,.95),a2=bigFire(p,c,k,t2+10.,.95);gl_FragColor=mix(a2,a1,P);return;}
 float dk=win(T,0.,4.85,.4);vec2 kd=abs(p-c)/k;float card=1.-smoothstep(.9,1.05,max(kd.x,kd.y));o=vec4(vec3(.05,.02,0.),1.)*(.55*dk)*(1.-card);
 // rayons de lumière du soleil qui balaient l'arène
 float rise=smoothstep(.1,2.2,T),fall=smoothstep(2.6,3.42,T);vec2 sc=c+vec2(0.,mix(k.y*.4,k.y*2.,rise)*(1.-fall)*(1.-fall));float rs=mix(.006,k.x*.62,smoothstep(.1,2.,T))*(1.-fall*.5);
 float sw=win(T,.1,3.6,.3);
 if(sw>0.){float an0=atan(p.y-sc.y,p.x-sc.x);float rr=length(p-sc);float rays=pow(max(0.,sin(an0*9.+T*.8))*max(0.,sin(an0*5.-T*.5+1.)),3.)*exp(-rr*2.2)*smoothstep(rs,rs*2.,rr)*.55*smoothstep(.5,2.,T)*sw;o=over(vec4(vec3(1.,.75,.3)*rays,rays*.6),o);}
 // 1) le Soleil cruel : petite étoile éblouissante — cœur blanc, halo doré, couronne de rayons en étoile qui tourne, protubérances, reflet horizontal
 if(sw>0.){vec2 d=p-sc;float r=length(d);float an=atan(d.y,d.x);float rr=r/max(rs,.001);float pulse=1.+.06*sin(T*14.)+.04*sin(T*31.);
  float core=smoothstep(1.,.55,rr);float glow=exp(-rr*rr*.9)*1.1+exp(-rr*1.6)*.55;
  float spikes=pow(max(0.,cos(an*6.+T*.9)),24.)*exp(-rr*.55)+pow(max(0.,cos(an*6.-T*.6+.26)),40.)*exp(-rr*.4)*.8+pow(max(0.,cos(an*16.+T*2.)),8.)*exp(-rr*1.4)*.5;
  float flare=exp(-pow(d.y/(rs*.07),2.))*exp(-abs(d.x)/(rs*3.2))*.9;
  float prom=0.;{float ring=exp(-pow((rr-1.15-.25*fbm(vec2(an*3.,T*1.5)))/.12,2.));prom=ring*smoothstep(.45,.75,fbm(vec2(an*2.5-T*.8,T*.3)))*.9;}
  vec3 col=vec3(1.,.97,.9)*core+vec3(1.,.78,.32)*glow+vec3(1.,.85,.5)*spikes*pulse+vec3(1.,.9,.7)*flare+vec3(1.,.45,.08)*prom;
  float a=clamp(core+glow*.75+spikes*.8+flare*.7+prom*.8,0.,1.)*sw*step(.003,rs);o=over(vec4(min(col,vec3(1.))*a,a),o);
  float hz=exp(-pow(length((p-c)/vec2(k.x*2.,k.y*1.6)),2.))*.22*smoothstep(.3,2.,T)*sw;o=over(vec4(vec3(1.,.55,.15)*hz,hz*.5),o);}
 // 2) braises qui montent
 {vec2 q=(p-c)/k;vec2 cell=vec2(q.x*3.,q.y*2.-T*1.6);vec2 id=floor(cell),f=fract(cell)-.5;float h=hash(id);float e=step(.86,h)*smoothstep(.1,0.,length(f))*smoothstep(2.5,.8,abs(q.x))*dk;o=over(vec4(vec3(1.,.75,.3)*e,e),o);}
 float te=T-3.5;
 // 3) le soleil s'écrase sur lui : colonne de feu qui jaillit vers le ciel
 if(te>-.05&&te<.9){float y=p.y-c.y+k.y;float cw=k.x*(1.05-.35*clamp(y*1.5,0.,1.))*(1.-smoothstep(.25,.9,te));float x=(p.x-c.x+(fbm(vec2(y*4.,T*5.))-.5)*k.x*.9)/max(cw,.001);o=over((1.-card*.9)*sFire(y*5.-T*7.,x,T,.85*smoothstep(-.05,.05,te)*smoothstep(-k.y*.4,0.,y)*(1.-smoothstep(.25,.9,te))),o);}
 // 4) l'armure s'embrase : flash, ondes, flammes autour de la carte, étincelles projetées
 if(te>-.05){float fl=exp(-max(te,0.)*7.)*smoothstep(-.05,0.,te)*(1.-card);float r=length((p-c)*vec2(1.,.8));o=over(vec4(vec3(1.,.8,.45)*fl*exp(-r*2.5),fl*exp(-r*2.5)*.45),o);
  for(int i=0;i<2;i++){float tt=te-float(i)*.18;if(tt>0.){float ring=exp(-pow((r-tt*1.)/(.008+tt*.025),2.))*(1.-smoothstep(.2,.9,tt));o=over(vec4(vec3(1.,.8,.35)*ring,ring*(i==0?1.:.6)),o);}}
  float amp=smoothstep(0.,.2,te)*(1.15+.7*exp(-te*3.))*(1.-smoothstep(1.,1.35,te));o=over(bigFire(p,c,k,T,amp)*(1.-card),o);
  if(te>0.&&te<1.){vec2 q=(p-c);float an=atan(q.y,q.x);float rr=length(q);vec2 cell=vec2(an*7.,rr*9.-te*9.);vec2 id=floor(cell);vec2 f=fract(cell)-.5;float h=hash(id);float sp=step(.82,h)*smoothstep(.12,0.,length(f*vec2(1.,.35)))*(1.-te);o=over(vec4(vec3(1.,.85,.45)*sp,sp),o);}}
 // 5) boucliers en orbite, avec traînée de feu
 if(te>0.){float fo=1.-smoothstep(1.,1.35,te);float rad=mix(.2,1.,1.-exp(-te*6.));
  for(int i=0;i<4;i++){float a=T*2.4+float(i)*1.5708;float z=-sin(a);vec2 sp=c+vec2(cos(a)*k.x*2.25*rad,(z*.24-.05)*k.y*rad);float sz=k.y*.52*mix(.72,1.05,(z+1.)*.5)*smoothstep(0.,.25,te);
   for(int j=1;j<3;j++){float aj=a-float(j)*.16;float zj=-sin(aj);vec2 tp=c+vec2(cos(aj)*k.x*2.25*rad,(zj*.24-.05)*k.y*rad);float g=exp(-pow(length(p-tp)/(sz*(.55-.1*float(j))),2.))*(.5-.12*float(j))*fo;o=over(vec4(vec3(1.,.5,.08)*g,g*.8),o);}
   vec2 q=(p-sp)/vec2(sz*mix(.3,1.,abs(z)),sz);if(abs(q.x)<1.4&&abs(q.y)<1.4){vec4 sh=shield(q,T,mix(.55,1.1,(z+1.)*.5));float spec=smoothstep(.15,0.,abs(q.x+q.y*.6-fract(T*.9+float(i)*.25)*3.+1.5))*sh.a*.6;sh.rgb+=vec3(1.,.95,.8)*spec;o=over(sh*fo*(z<0.?.45:1.),o);}}}
 gl_FragColor=o;}`;
const BLADE_FRAG=TF_HEAD+`
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
/* Yoru d'après l'image : lame noire légèrement courbe aux reflets bleu-vert en bandes, pointe en biseau, grande garde en croix crème ornée de joyaux bleus et verts, poignée blanche bandée, pommeau bleu */
float yoruIn(vec2 q,float L,out int part){float u=q.y/L;part=0;
 float cx=.06*L*u*u,vr=q.x-cx,w=.072*L*(.75+.35*u);if(u>=0.&&u<=1.&&abs(vr)<w&&u<1.-(vr/w+1.)*.07){part=1;return 1.;}
 float ax=abs(q.x);if(abs(q.y)<.028*L*(1.-smoothstep(.3*L,.42*L,ax))+.006*L&&ax<.42*L){part=2;return 1.;}
 if(abs(q.x)<.075*L&&abs(q.y)<.075*L&&abs(q.x)+abs(q.y)<.09*L){part=2;return 1.;}
 if(u<-.02&&u>-.34&&abs(q.x)<.024*L){part=3;return 1.;}
 if(length(q-vec2(0.,-.37*L))<.04*L){part=4;return 1.;}return 0.;}
vec4 yoru(vec2 q,float L){int part;float in1=yoruIn(q,L,part);int pe;float inE=yoruIn(q*1.06,L,pe);
 if(in1<.5){int pp;float rim=yoruIn(q*.93,L,pp);return vec4(vec3(.25,1.,.55)*rim*.75,rim*.6);}
 float u=q.y/L;vec3 col;
 if(part==1){float vr=(q.x-.06*L*u*u)/(.072*L*(.75+.35*u));float band=step(.5,fract(u*4.3+.15));col=mix(vec3(.02,.05,.07),vec3(.14,.42,.48),smoothstep(-.6,.9,vr)*(.45+.55*band));col=mix(col,vec3(.55,.85,.9),smoothstep(.75,.95,vr)*.6);}
 else if(part==2){col=vec3(.9,.85,.66);float gem=0.;vec2 g1=vec2(.33*L,0.),g2=vec2(-.33*L,0.);gem=step(length(q-g1),.02*L)+step(length(q+g1),.02*L);float gc=step(length(q),.03*L);
  col=mix(col,vec3(.6,.55,.38),step(abs(q.y),.008*L)*step(abs(q.x),.38*L)*.6);col=mix(col,vec3(.16,.28,.78),gem);col=mix(col,vec3(.15,.6,.35),gc);}
 else if(part==3){float st=step(.55,fract(q.y/(.035*L)));col=mix(vec3(.94,.94,.9),vec3(.35,.33,.3),st*.8);}
 else col=vec3(.2,.35,.9)+vec3(.4)*smoothstep(.02*L,0.,length(q-vec2(-.012*L,-.36*L)));
 if(pe!=part||inE<.5)col*=.35;return vec4(col,1.);}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec4 o=vec4(0.);vec2 k=K;
 vec2 l0=(S0-.5)*vec2(asp,1.),l1=(S1-.5)*vec2(asp,1.);float ly=(l0.y+l1.y)*.5,xm=(l0.x+l1.x)*.5,hw=abs(l1.x-l0.x)*.5+k.x*1.1;
 float dk=win(T,0.,3.1,.3);vec2 kd=abs(p-c)/k;float card=1.-smoothstep(.9,1.05,max(kd.x,kd.y));o=vec4(vec3(0.,.02,.01),1.)*(.5*dk)*(1.-card);
 // aura verte autour de Mihawk : volutes qui montent le long des bords de la carte
 {vec2 q=(p-c)/k;vec2 e=abs(q)-vec2(1.);float d=length(max(e,0.))+min(max(e.x,e.y),0.);float n=fbm(vec2(q.x*2.5,q.y*1.5-T*2.2));float a=smoothstep(.0,.05,d)*exp(-max(d,0.)*5.)*(n*1.4-.35)*win(T,0.,1.05,.2);a=clamp(a,0.,1.)*.7;o=over(vec4(vec3(.15,.9,.45)*a,a*.8),o);}
 // 0) les yeux de faucon s'allument (or) avec un reflet horizontal
 {float ew=win(T,.08,.85,.12);if(ew>0.){for(int i=0;i<2;i++){vec2 ec=c+vec2((float(i)*2.-1.)*k.x*.24,k.y*.42);vec2 d=(p-ec)/vec2(k.x*.2,k.x*.07);float e=exp(-dot(d,d)*1.4);float st=exp(-pow((p.y-ec.y)/(k.x*.012),2.))*exp(-abs(p.x-ec.x)/(k.x*.9))*.8;
  float a=clamp(e+st,0.,1.)*ew*(.8+.2*sin(T*30.));o=over(vec4(mix(vec3(1.,.7,.1),vec3(1.,.97,.8),e)*a,a),o);}}}
 // 1) il dégaine Yoru (la lame sort vers le haut), l'arme en arrière (anticipation), puis l'abat d'un coup sec avec traînée et léger rebond
 float sw=win(T,.05,1.05,.1);if(sw>0.){float draw=smoothstep(.05,.4,T);float wind=smoothstep(.45,.7,T);float strike=smoothstep(.72,.86,T);float settle=smoothstep(.86,1.,T);
  float ang=.42*wind*(1.-strike)-2.75*strike+.15*settle*(1.-settle)*4.;vec2 base=c+vec2(k.x*.42,-k.y*.08)+vec2(-.01,.015)*wind*(1.-strike)+vec2(.015,-.01)*strike;float L=k.y*1.85;
  vec2 q=rot(ang)*(p-base)-vec2(0.,-L*(1.-draw)*.6);float vis=smoothstep(0.,.25,draw);
  // images rémanentes pendant le coup
  if(strike>0.&&strike<1.){for(int g=1;g<=3;g++){float sp=smoothstep(.72,.86,T-float(g)*.018);float ag=.42*wind*(1.-sp)-2.75*sp;vec4 gh=yoru(rot(ag)*(p-base),L);o=over(vec4(vec3(.2,.9,.5)*gh.a,gh.a)*(.28/float(g))*(1.-strike*.3),o);}}
  o=over(yoru(q,L)*sw*vis,o);
  float te=T-.73;if(te>0.&&te<.4){float r=length(p-base),an=atan(p.y-base.y,p.x-base.x);float a1=1.57-smoothstep(0.,.13,te)*4.4;float on=smoothstep(a1,a1+.3,an)*step(an,1.9);float band=exp(-pow((r-L*.72)/(L*.24),2.))*on*(1.-te/.4)*(.6+.4*fbm(vec2(an*5.,r*20.)));o=over(vec4(mix(vec3(.02,.05,.03),vec3(.6,1.,.75),smoothstep(.5,1.,band)),1.)*band,o);}}
 // 2) l'entaille file en ligne droite : croissant noir massif, veines vertes, deux images rémanentes, traînée de fumée
 for(int g=1;g<=2;g++){float tw=T-.92-float(g)*.045;if(tw>0.&&tw<1.){float yw=tw<.34?mix(c.y+k.y*.6,ly,pow(tw/.34,1.7)):ly+(tw-.34)*1.6;float dx=(p.x-xm)/(hw*(1.+.15*smoothstep(0.,.4,tw)));float bow=1.-dx*dx;
  float e=abs(p.y-yw-.075*bow)/(.04*sqrt(max(bow,0.))+.002);float a=step(e,1.)*step(abs(dx),1.)*(1.-smoothstep(.55,1.,tw))*.32/float(g);o=over(vec4(mix(vec3(.01,.03,.02),vec3(.5,.9,.65),smoothstep(.5,.95,e))*a,a),o);}}
 {float tw=T-.92;if(tw>0.&&tw<1.){float yw=tw<.34?mix(c.y+k.y*.6,ly,pow(tw/.34,1.7)):ly+(tw-.34)*1.6;float dx=(p.x-xm)/(hw*(1.+.15*smoothstep(0.,.4,tw)));float bow=1.-dx*dx;
  if(abs(dx)<1.){float arcY=yw+.075*bow;float dy=p.y-arcY;float th=.052*sqrt(max(bow,0.))+.002;float e=abs(dy)/th;float fade=1.-smoothstep(.55,1.,tw);
   if(e<1.){float fil=pow(1.-abs(fbm(vec2(p.x*14.-tw*22.,dy/th*1.2+3.))*2.-1.),10.)*1.6;vec3 col=mix(vec3(.01,.03,.02),vec3(.75,1.,.85),smoothstep(.5,.95,e));col+=vec3(.2,1.,.5)*fil*(1.-e)*.8;o=over(vec4(col,1.)*fade,o);}
   float glow=exp(-pow(max(e-1.,0.)*.7,2.))*(1.-step(e,1.))*.65*fade;o=over(vec4(vec3(.2,1.,.5)*glow,glow*.8),o);
   if(dy<0.&&dy>-.34){float sm=noise(vec2(p.x*9.,dy*14.-tw*9.));float tr=smoothstep(.0,.6,(1.+dy/.34)*sqrt(max(bow,0.))*(.55+.7*sm)-.25)*fade*.9;o=over(vec4(mix(vec3(0.,.02,.01),vec3(.05,.35,.18),sm*sm*sm*1.5)*tr,tr),o);}
   float ck=step(.7,noise(vec2(p.x*60.,tw*30.)))*exp(-pow((abs(dy)-th*1.15)/.004,2.))*fade*step(abs(dx),.95);o=over(vec4(vec3(.7,1.,.8)*ck,ck),o);
   float ring=exp(-pow((length((p-vec2(xm,arcY))*vec2(.6,1.))-tw*.5)/.01,2.))*(1.-smoothstep(.05,.35,tw))*.5;o=over(vec4(vec3(.6,1.,.75)*ring,ring*.5),o);}}}
 // flash au lâcher + lignes de vitesse
 {float tf=T-.92;if(tf>0.&&tf<.5){vec2 d=p-(c+vec2(0.,k.y*.6));float r=length(d),an=atan(d.y,d.x);float fl=exp(-tf*12.)*exp(-r*3.);o=over(vec4(vec3(.85,1.,.9)*fl,fl*.8),o);
  float ln=step(.86,hash(vec2(floor(an*48.),3.)))*smoothstep(.08,.2,r)*exp(-r*4.)*(1.-tf/.5);o=over(vec4(vec3(.6,1.,.75)*ln*.35,ln*.28),o);}}
 // 3) le sillage : une entaille droite reste gravée entre Mihawk et la ligne adverse
 {float tg=T-.92;if(tg>0.&&tg<2.){float y0=c.y+k.y*.6;float head=tg<.38?mix(y0,ly,smoothstep(0.,.38,tg)):ly;float jx=(noise(vec2(p.y*40.,1.))-.5)*.006;float dx=abs(p.x-xm-jx);float on=step(y0,p.y)*step(p.y,head)*(1.-smoothstep(1.2,2.,tg));
  float gash=exp(-pow(dx/.0025,2.))*on;float gl=exp(-pow(dx/.018,2.))*on*.5;o=over(vec4(vec3(.85,1.,.9)*gash,gash),o);o=over(vec4(vec3(.2,1.,.5)*gl,gl*.6),o);}}
 // 4) trait de coupe sur la ligne adverse, puis l'espace se fend : une faille noire bordée de vert s'ouvre et se referme, poussière et éclats
 float tc=T-1.3;if(tc>0.&&tc<1.8){float dy=p.y-ly;float x0=l0.x-k.x*1.2,x1=l1.x+k.x*1.2;float grow=smoothstep(0.,.12,tc);float on=smoothstep(x0,x0+.06,p.x)*smoothstep(mix(x0,x1,grow)+.001,mix(x0,x1,grow)-.06,p.x);float ends=smoothstep(x0,x0+.1,p.x)*smoothstep(x1,x1-.1,p.x);
  float line=exp(-pow(dy/.0035,2.))*on*(1.-smoothstep(.15,.35,tc));o=over(vec4(vec3(.9,1.,.92)*line,line),o);
  float tb=tc-.18;if(tb>0.){float open=.022*smoothstep(0.,.12,tb)*(1.-smoothstep(.5,1.1,tb))+.001;float wob=(fbm(vec2(p.x*7.,tb*2.))-.5)*open*1.2;float dd=abs(dy+wob);
   float rift=smoothstep(open,open*.6,dd)*ends;float edge=exp(-pow((dd-open)/.004,2.))*ends*(1.-smoothstep(.8,1.2,tb));
   o=over(vec4(vec3(.0,.015,.01),1.)*rift,o);o=over(vec4(vec3(.7,1.,.8)*edge,edge),o);float eg=exp(-pow((dd-open)/.03,2.))*ends*.45*(1.-smoothstep(.7,1.3,tb));o=over(vec4(vec3(.15,.9,.45)*eg,eg*.6),o);
   float dust=fbm(vec2(p.x*6.,dy*9.-sign(dy)*tb*1.5))*smoothstep(.16+tb*.08,.0,abs(dy))*smoothstep(.05,.3,tb)*(1.-smoothstep(.8,1.6,tb))*ends;float da=clamp(dust*1.4-.45,0.,1.)*.75;o=over(vec4(mix(vec3(.12,.16,.14),vec3(.3,.45,.38),dust)*da,da),o);
   vec2 cell=vec2(p.x*14.,dy*10.-sign(dy)*tb*6.);vec2 id=floor(cell),f=fract(cell)-.5;float hh=hash(id);float sh=step(.88,hh)*smoothstep(.15,.0,length(f*vec2(1.,2.5)))*ends*step(abs(dy),.22)*(1.-smoothstep(.3,1.2,tb));o=over(vec4(vec3(.15,.6,.35)*sh,sh),o);}
  float fl=exp(-tc*10.)*exp(-pow(dy/.09,2.))*ends*.55;o=over(vec4(vec3(.85,1.,.9)*fl,fl),o);}
 // 5) chaque carte de la ligne prend le coup : éclat vert, gerbe d'éclats noirs et verts
 {float th=T-1.32;if(th>0.&&th<.8){for(int i=0;i<3;i++){vec2 tp=mix(l0,l1,float(i)*.5);if(i==1&&abs(l1.x-l0.x)<.01)continue;vec2 d=p-tp;float r=length(d),an=atan(d.y,d.x);
   float fl=exp(-th*12.)*exp(-r*r/(k.x*k.x*.5));o=over(vec4(vec3(.8,1.,.88)*fl,fl*.8),o);
   vec2 cell=vec2(an*5.,r*20.-th*14.);vec2 id=floor(cell)+float(i)*7.;vec2 f=fract(cell)-.5;float h=hash(id);float sp=step(.84,h)*smoothstep(.14,.0,length(f*vec2(1.,.35)))*(1.-smoothstep(.15,.7,th))*step(r,k.x*2.2);o=over(vec4(mix(vec3(.01,.05,.03),vec3(.4,1.,.6),step(.93,h))*sp,sp),o);}}}
 gl_FragColor=o;}`;
const ALTER_FRAG=TF_HEAD+`
/* All For One · ALTER (3,6 s) : aura noire aux reflets cramoisis, tentacules qui jaillissent vers la cible, arrachent un orbe de pouvoir et le ramènent à AFO */
vec2 bz(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),tg=(S0-.5)*vec2(asp,1.);vec4 o=vec4(0.);vec2 k=K;
 float dk=win(T,0.,3.6,.35);vec2 kd=abs(p-c)/k;float card=1.-smoothstep(.92,1.05,max(kd.x,kd.y));vec2 kt=abs(p-tg)/k;float tcard=1.-smoothstep(.92,1.05,max(kt.x,kt.y));o=vec4(vec3(.03,0.,.01),1.)*(.32*dk*(1.-card)*(1.-tcard));
 // aura d'ombre autour d'AFO : fine, collée à la carte
 {vec2 q=(p-c)/k.y;vec2 e=abs(q)-vec2(k.x/k.y,1.)*.92;float dd=length(max(e,0.));float n=fbm(vec2(q.x*3.,q.y*2.-T*1.8));float sh=.32+.22*n-dd*2.2;float a=smoothstep(0.,.25,sh)*win(T,0.,3.5,.4)*(1.-card)*.85;
  vec3 col=mix(vec3(.02,0.,.01),vec3(.75,.05,.1),smoothstep(.0,.25,sh)*(1.-smoothstep(.25,.6,sh))*.9);o=over(vec4(col*a*.92,a*.92),o);}
 // tentacules : sortent (0,45 → 1,25 s), agrippent (→ 1,9 s), se rétractent en ramenant l'orbe (→ 2,9 s)
 float ext=smoothstep(.45,1.25,T)*(1.-smoothstep(1.95,2.85,T));
 float back=smoothstep(1.85,2.85,T);
 for(int i=0;i<5;i++){float fi=float(i);float sd=hash(vec2(fi,4.));vec2 a0=c+vec2((fi-2.)*k.x*.3,k.y*.62);vec2 mid=(a0+tg)*.5+vec2((sd-.5)*.55+(fi-2.)*.07,.14+.14*sd);vec2 a1=tg+vec2((fi-2.)*k.x*.18,-k.y*.1+abs(fi-2.)*.012);
  float L=ext;if(L<=.001)continue;float best=1e9,bt=0.,sgn=1.;vec2 pr=a0,dir=vec2(0.,1.);for(int j=1;j<=12;j++){float t=float(j)/12.*L;vec2 q=bz(a0,mid,a1,t)+vec2(sin(t*8.+T*5.+fi),cos(t*6.-T*4.+fi*2.))*.014*sin(t*3.1416);vec2 e=q-pr;float h=clamp(dot(p-pr,e)/max(dot(e,e),1e-6),0.,1.);vec2 dv=p-pr-e*h;float dd=length(dv);if(dd<best){best=dd;bt=(float(j-1)+h)/12.;sgn=sign(e.x*dv.y-e.y*dv.x);dir=normalize(e);}pr=q;}
  float tipT=1.-smoothstep(.86,1.,bt/max(L,.01)*L);float w=(mix(.021,.009,bt)+.003)*mix(.35,1.,tipT);float x=best/w;
  if(x<1.){float z=sqrt(1.-x*x);float ridge=.55+.45*smoothstep(.2,.8,abs(fract(bt*44.-T*3.)-.5)*2.);vec3 col=mix(vec3(.015,.008,.012),vec3(.16,.09,.12),z*z)*ridge;col+=vec3(.75,.06,.12)*pow(max(0.,1.-abs(x*sgn+.15)*4.5),3.)*(.5+.5*sin(bt*30.-T*14.));col+=vec3(.6,.5,.55)*pow(clamp(1.-abs(x*sgn-.55)*4.,0.,1.),4.)*.35;
   float a=smoothstep(1.,.82,x);o=over(vec4(col*a,a),o);}
  float glow=exp(-pow(best/(w*2.6),2.))*(1.-step(x,1.))*.4;o=over(vec4(vec3(.85,.08,.15)*glow,glow*.6),o);
  float arc=step(.84,noise(vec2(bt*26.-T*22.,fi*3.+floor(T*14.))))*exp(-pow(best/(w*1.6),2.))*step(1.,x);o=over(vec4(vec3(1.,.55,.6)*arc,arc*.85),o);
  // griffe au bout du câble (se referme sur la cible)
  if(L>.95){vec2 tip=bz(a0,mid,a1,L);float cl=smoothstep(1.25,1.4,T);for(int f2=0;f2<3;f2++){float an=atan(dir.y,dir.x)+(float(f2)-1.)*mix(.8,.35,cl);vec2 cd=vec2(cos(an),sin(an));vec2 pq=p-tip;float along=dot(pq,cd),across=abs(dot(pq,vec2(-cd.y,cd.x)));float len=.026;float cw=max(.005*(1.-clamp(along/len,0.,1.)),.0002);float claw=step(0.,along)*step(along,len)*smoothstep(cw,cw*.4,across);o=over(vec4(vec3(.08,.02,.03)+vec3(.5,.05,.08)*(1.-along/len),1.)*claw,o);}}}
 // yeux rouges d'AFO + fumée noire qui s'élève autour de lui
 {float ew=win(T,.15,3.3,.25);if(ew>0.)for(int e=0;e<2;e++){vec2 ep=c+vec2((float(e)*2.-1.)*k.x*.22,k.y*.38);vec2 d=(p-ep)/vec2(k.x*.16,k.x*.035);float g=exp(-dot(d,d))*ew*(.8+.2*sin(T*20.));o=over(vec4(vec3(1.,.15,.2)*g,g),o);}
  vec2 q=(p-c)/k;vec2 cell=vec2(q.x*2.5,q.y*1.4-T*.9);vec2 id=floor(cell),f=fract(cell)-.5;float h=hash(id);float sm=step(.9,h)*smoothstep(.3,.05,length(f))*smoothstep(1.6,.9,abs(q.x))*ew*.4;o=over(vec4(vec3(.02,0.,.01)*sm,sm),o);}
 // l'emprise : ondes sombres qui aspirent la cible
 {float tw=T-1.3;if(tw>0.&&tw<1.){float r=length((p-tg)*vec2(1.,.85));for(int i=0;i<3;i++){float rr=k.y*1.6*(1.-fract(tw*1.6+float(i)/3.));float ring=exp(-pow((r-rr)/.008,2.))*(1.-tw)*.7;o=over(vec4(vec3(.8,.05,.12)*ring,ring),o);}}}
 // l'orbe arraché à la cible, ramené le long des tentacules
 if(T>1.45&&T<3.){float t=back;vec2 op=bz(tg,(c+tg)*.5+vec2(0.,.12),c+vec2(0.,k.y*.4),t*t*(3.-2.*t));float r=length(p-op);float s=max(.035*(1.+.25*sin(T*25.))*smoothstep(1.45,1.7,T),.0001);
  float core=smoothstep(s,s*.3,r);float halo=exp(-r*r/(s*s*6.))*.8;o=over(vec4(vec3(1.,.85,.5)*halo,halo*.8),o);o=over(vec4(vec3(1.,.97,.85)*core,core),o);
  float g=exp(-pow(length(p-tg)/(k.y*.9),2.))*smoothstep(1.4,1.6,T)*(1.-smoothstep(1.7,2.2,T))*.45;o=over(vec4(vec3(.9,.1,.15)*g,g*.6),o);}
 // absorption : anneau cramoisi et éclat
 {float te=T-2.85;if(te>0.&&te<.7){float r=length((p-c)*vec2(1.,.85));float ring=exp(-pow((r-te*.55)/(.006+te*.02),2.))*(1.-te/.7);o=over(vec4(vec3(1.,.2,.25)*ring,ring*.85),o);float fl=exp(-te*8.)*exp(-r*6.)*(1.-card*.7);o=over(vec4(vec3(1.,.6,.6)*fl,fl*.6),o);}}
 gl_FragColor=o;}`;
const MUI_FRAG=TF_HEAD+`
/* Goku · MUI (3,8 s) : aura argentée, disparition (transmission instantanée), réapparition sur la cible, coup de poing destructeur (onde, éclats, lignes de vitesse) */
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),tg=(S0-.5)*vec2(asp,1.);vec4 o=vec4(0.);vec2 k=K;
 float dk=win(T,0.,3.7,.3);o=vec4(vec3(.01,.02,.05),1.)*(.42*dk);
 // aura argentée d'Ultra Instinct (flammes fines qui montent, bord bleu-violet), sur Goku chez lui puis sur la cible pendant le coup
 for(int s=0;s<2;s++){vec2 ac=s==0?c:tg+vec2(0.,-k.y*2.02);float aw=s==0?win(T,0.,1.02,.15)+win(T,1.98,3.4,.3):win(T,1.12,1.88,.06);if(aw<=0.)continue;
  vec2 q=(p-ac)/k.y;float r=length(q*vec2(1./max(k.x/k.y*1.45,.1),.72));float n=fbm(vec2(q.x*4.,q.y*2.4-T*3.6));float sh=.84+.36*n-r+max(q.y,0.)*.16;vec2 kd=abs(p-ac)/k;float inCard=1.-smoothstep(.88,1.02,max(kd.x,kd.y));float a=smoothstep(0.,.3,sh)*(1.-smoothstep(.5,1.1,sh))*aw*.6*(1.-inCard*.95);
  vec3 col=mix(vec3(.55,.62,1.),vec3(.97,.98,1.),smoothstep(.15,.45,sh));o=over(vec4(col*a,a),o);
  vec2 cell=vec2(q.x*5.,q.y*3.-T*3.);vec2 id=floor(cell),f=fract(cell)-.5;float h=hash(id);float sp=step(.92,h)*smoothstep(.1,0.,length(f*vec2(1.,.4)))*aw*step(r,1.25)*(1.-inCard*.85)*.8;o=over(vec4(vec3(.85,.9,1.)*sp,sp),o);}
 // disparition : éclat + son « shunk » (traits de lumière verticaux)
 {float tv=T-1.02;if(tv>-.02&&tv<.25){float a=exp(-abs(tv-.03)*30.)*exp(-pow((p.x-c.x)/(k.x*.6),2.))*smoothstep(k.y*1.4,0.,abs(p.y-c.y));o=over(vec4(vec3(.9,.95,1.)*a,a),o);}}
 // réapparition + coup (1,15 → 1,3 s), impact à 1,3 s
 float ti=T-1.28;
 if(ti>-.15&&ti<.15){float a=exp(-abs(ti+.1)*30.)*exp(-pow((p.x-tg.x)/(k.x*.6),2.))*smoothstep(k.y*1.4,0.,abs(p.y-tg.y+k.y*2.02));o=over(vec4(vec3(.9,.95,1.)*a,a),o);}
 // lignes de vitesse qui convergent juste avant le coup
 if(ti>-.14&&ti<.02){vec2 d=p-tg;float r=length(d),an=atan(d.y,d.x);float ln=step(.8,hash(vec2(floor(an*60.),7.)))*smoothstep(.06,.3,r)*smoothstep(1.2,.4,r)*smoothstep(-.14,-.04,ti);o=over(vec4(vec3(.9,.95,1.)*ln*.6,ln*.5),o);}
 // nuage de poussière et rochers projetés
 if(ti>0.&&ti<2.2){vec2 d=p-tg;float r=length(d);float R0=k.y*(.6+1.6*(1.-exp(-ti*3.)));float n=fbm(d*6./k.y+vec2(ti*.6,-ti*.4));float dust=smoothstep(R0,R0*.35,r+(n-.5)*k.y*.6)*(1.-smoothstep(.6,2.1,ti))*.55;o=over(vec4(mix(vec3(.45,.5,.62),vec3(.8,.84,.95),n)*dust,dust),o);
  for(int i=0;i<12;i++){float fi=float(i);float an2=fi*.52+hash(vec2(fi,9.))*.4;float sp=.5+.6*hash(vec2(fi,3.));vec2 rp=tg+vec2(cos(an2),sin(an2)*.8+.3)*sp*ti*.55-vec2(0.,.55*ti*ti);float sz=.008+.01*hash(vec2(fi,5.));vec2 q=(p-rp)/sz;float rk=step(abs(q.x)+abs(q.y)*1.3,1.)*(1.-smoothstep(1.2,1.8,ti));o=over(vec4(vec3(.18,.2,.26)+vec3(.3)*step(.3,q.y),1.)*rk,o);}}
 if(ti>0.&&ti<1.6){vec2 d=p-tg;float r=length(d),an=atan(d.y,d.x);
  float fl=exp(-ti*9.)*exp(-r*r/(k.y*k.y*.8));o=over(vec4(vec3(1.,1.,1.)*fl,fl*.7),o);
  for(int i=0;i<3;i++){float tt=ti-float(i)*.08;if(tt>0.){float ring=exp(-pow((r-tt*(1.1-float(i)*.25))/(.006+tt*.02),2.))*(1.-smoothstep(.15,.9,tt));o=over(vec4(mix(vec3(.75,.85,1.),vec3(1.),float(i==0))*ring,ring*(1.-float(i)*.25)),o);}}
  float rays=pow(max(0.,cos(an*7.+1.)),18.)*exp(-r*2.2)*smoothstep(.05,.2,r)*exp(-ti*4.);o=over(vec4(vec3(.85,.92,1.)*rays,rays*.8),o);
  float ln=step(.84,hash(vec2(floor(an*56.),2.)))*smoothstep(.1,.25,r)*exp(-r*2.)*exp(-ti*5.);o=over(vec4(vec3(1.)*ln*.5,ln*.4),o);
  vec2 cell=vec2(an*6.,r*16.-ti*18.);vec2 id=floor(cell),f=fract(cell)-.5;float h=hash(id);float sp=step(.86,h)*smoothstep(.13,.0,length(f*vec2(1.,.3)))*(1.-smoothstep(.15,.9,ti))*step(r,k.y*3.);o=over(vec4(mix(vec3(.6,.75,1.),vec3(1.),h)*sp,sp),o);
  float crack=step(.6,fbm(vec2(an*3.,r*12.)))*exp(-pow((r-k.y*.75)/(k.y*.5),2.))*smoothstep(0.,.05,ti)*(1.-smoothstep(.6,1.4,ti))*.35;o=over(vec4(vec3(.7,.8,1.)*crack,crack),o);}
 // retour : traits de transmission instantanée
 {float tr=T-1.86;if(tr>-.02&&tr<.2){float a=exp(-abs(tr-.03)*30.)*exp(-pow((p.x-tg.x)/(k.x*.6),2.))*smoothstep(k.y*1.4,0.,abs(p.y-tg.y+k.y*2.02));o=over(vec4(vec3(.9,.95,1.)*a,a),o);}}
 gl_FragColor=o;}`;
let tfGL;
if(!globalThis.__yuroSkip)try{tfGL={canvas:null,lcanvas:null,gl:null,progs:{},failed:false,started:new WeakMap(),impactAt:new WeakMap(),raf:0};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"transform-gl.js");}
const FUTURE_FRAG=TF_HEAD+`
/* Shinra · THE FUTURE (3,75 s) : Adolla Burst (pieds-réacteurs, flammes blanches/dorées, halo ardent), comète de feu vers l'allié tombé,
   braises aspirées à rebours, horloge d'Adolla qui remonte le temps, colonne de lumière, éclat de résurrection et étoile d'Adolla */
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float zz(float x,float s){float i=floor(x),f=fract(x);return mix(hash(vec2(i,s)),hash(vec2(i+1.,s)),f)-.5;}
/* distance à un éclair A→B : déplacement latéral anguleux (3 octaves de bruit linéaire par morceaux), nul aux extrémités */
float bolt(vec2 p,vec2 A,vec2 B,float sd,float amp){vec2 ba=B-A;float L=max(length(ba),1e-4);vec2 dr=ba/L,nr=vec2(-dr.y,dr.x);vec2 pa=p-A;float t=dot(pa,dr)/L;float tc=clamp(t,0.,1.);
 float t2=min(tc+.004,1.);float j=(zz(tc*6.,sd)+.5*zz(tc*15.,sd+3.)+.22*zz(tc*34.,sd+7.))*sin(3.1416*tc),j2=(zz(t2*6.,sd)+.5*zz(t2*15.,sd+3.)+.22*zz(t2*34.,sd+7.))*sin(3.1416*t2);
 float sl=(j2-j)/.004*amp*1.4/L;float off=(dot(pa,nr)-j*amp*1.4)/sqrt(1.+sl*sl);float de=(t<0.?-t:t>1.?t-1.:0.)*L;return length(vec2(off,de));}
vec2 bz(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
vec3 fireCol(float x){return mix(mix(vec3(.55,.08,.02),vec3(1.,.45,.08),smoothstep(0.,.45,x)),mix(vec3(1.,.82,.4),vec3(1.,.98,.92),smoothstep(.7,1.,x)),smoothstep(.4,.8,x));}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),tg=(S0-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 gold=vec3(1.,.8,.4),white=vec3(1.,.97,.9);
 // étalonnage global : voile chaud + vignette, plus sombre pendant la réécriture
 float dk=win(T,0.,3.62,.35);float vig=smoothstep(.35,1.05,length((uv-.5)*vec2(asp*.8,1.)));o=vec4(mix(vec3(.05,.025,.0),vec3(.0),vig)*1.,1.)*((.3+.25*vig+.12*win(T,1.4,2.2,.3))*dk);
 // 1) Adolla Burst sur Shinra
 {float aw=win(T,.02,1.7,.18)+win(T,2.85,3.6,.3)*.45;if(aw>0.){vec2 q=(p-c)/k.y;vec2 kd=abs(p-c)/k;float m=max(kd.x,kd.y);float inCard=1.-smoothstep(.9,1.02,m);
  // aura de feu ovale (pas de cadre carré) : plus haute au-dessus, flammes qui s'étirent vers le haut
  vec2 e=q*vec2(k.y/max(k.x,.001)*.93,.8);e.y-=.05;float r=length(e);float n1=fbm(vec2(atan(e.x,e.y)*3.,r*2.4-T*6.)),n2=fbm(vec2(q.x*10.,q.y*6.-T*10.));float sh=1.02+.32*n1+.16*n2-r+max(q.y,0.)*.2;float tongue=smoothstep(0.,.2,sh)*(1.-smoothstep(.28,.62,sh));float fA=tongue*aw*.72*(1.-inCard*.97);
  o=over(vec4(fireCol(clamp(.3+sh*.9,0.,1.))*fA,fA*.92),o);
  // pieds-réacteurs : jets de feu sous la carte (les pas du diable) + onde de départ
  vec2 f=p-(c-vec2(0.,k.y*1.02));for(int s=0;s<2;s++){float sx=(float(s)-.5)*k.x*.9;float jx=f.x-sx;float jet=smoothstep(k.x*.28,0.,abs(jx)*(1.+max(-f.y,0.)/k.y*1.6))*smoothstep(.0,-.004,f.y)*smoothstep(-k.y*(.7+.25*sin(T*40.+float(s)*2.)),0.,f.y);float jn=fbm(vec2(jx*30./k.y*.1,f.y*20./k.y*.1+T*12.));jet*=.55+.6*jn;jet*=aw;o=over(vec4(fireCol(clamp(.6+jn*.5-(-f.y/k.y)*.4,0.,1.))*jet,jet),o);}
  float t0=T-.12;if(t0>0.&&t0<.7){float rr=length((p-(c-vec2(0.,k.y)))*vec2(1.,2.6));float sw=exp(-pow((rr-t0*.55)/(.006+t0*.03),2.))*(1.-t0/.7);o=over(vec4(gold*sw,sw*.8),o);}
  // halo d'Adolla ardent + rayons
  vec2 h=(p-(c+vec2(0.,k.y*1.16)));float hr=length(h*vec2(1.,3.));float hn=fbm(vec2(atan(h.y*3.,h.x)*3.,T*3.));float halo=exp(-pow((hr-k.x*.6)/(k.y*(.03+.03*hn)),2.))*aw;o=over(vec4(mix(gold,white,.6)*halo,halo),o);
  float flick=exp(-pow((hr-k.x*.6)/(k.y*.12),2.))*smoothstep(0.,k.y*.25,h.y+k.y*.02)*hn*aw*.5;o=over(vec4(fireCol(.75)*flick,flick*.7),o);}}
 // 2) comète de feu de Shinra vers l'allié tombé
 {float tb=T-1.0;if(tb>0.&&tb<.85){float head=clamp(tb/.42,0.,1.);head=1.-pow(1.-head,2.);vec2 mid=(c+tg)*.5+vec2(0.,max(k.y*1.5,abs(c.x-tg.x)*.42));float d=1e5,along=0.;vec2 hp=c;for(int i=0;i<20;i++){float t1=float(i)/20.,t2=float(i+1)/20.;if(t1>head)break;float te=min(t2,head);vec2 a1=bz(c,mid,tg,t1),a2=bz(c,mid,tg,te);float dd=seg(p,a1,a2);if(dd<d){d=dd;along=te;}hp=a2;}
  float fade=1.-smoothstep(.45,.85,tb);float tail=smoothstep(head-.55,head,along);float wid=k.y*(.012+.05*tail);float n=fbm(vec2(along*14.-T*8.,d/k.y*6.));float body=smoothstep(wid*(1.6+n),0.,d)*tail*fade;o=over(vec4(fireCol(clamp(.45+.6*tail-d/wid*.25,0.,1.))*body,body*.95),o);
  float core=exp(-d*d/(k.y*k.y*.0006))*tail*fade;o=over(vec4(white*core,core),o);
  float hd=exp(-dot(p-hp,p-hp)/(k.y*k.y*.03))*fade;o=over(vec4(white*hd,hd),o);
  vec2 cell=(p-hp)/k.y*vec2(8.,8.);vec2 id=floor(cell+T*vec2(3.,5.));float sp=step(.9,hash(id))*smoothstep(.25,.0,length(fract(cell+T*vec2(3.,5.))-.5))*exp(-length(p-hp)/(k.y*.6))*fade;o=over(vec4(fireCol(.8)*sp,sp),o);}}
 // 3) braises aspirées vers l'allié (le temps remonte)
 {float aw=win(T,1.2,2.15,.15);if(aw>0.){vec2 d=p-tg;float r=length(d),an=atan(d.y,d.x);float lanes=an/6.2832*28.;float sg=floor(lanes);float h=hash(vec2(sg,4.));float tt=fract(T*1.5+h);float rad=k.y*(.35+2.*(1.-tt));float lane=1.-abs(fract(lanes)-.5)*2.;float e=smoothstep(.75,1.,lane)*exp(-pow((r-rad)/(k.y*(.02+.09*(1.-tt))),2.))*step(.45,h)*aw*tt;o=over(vec4(fireCol(.85)*e,e*.9),o);}}
 // 4) horloge d'Adolla qui tourne à l'envers autour de l'allié, puis se fige
 {float aw=win(T,1.3,3.25,.25);if(aw>0.){vec2 d=p-tg;float r=length(d),an=atan(d.y,d.x);float R0=k.y*.86*(.75+.25*smoothstep(1.3,1.7,T));
  float spin=T<2.05?-(T-1.3)*(3.+(T-1.3)*9.):-(.75*(3.+.75*9.));
  float ring=exp(-pow((r-R0)/(k.y*.016),2.))+exp(-pow((r-R0*.88)/(k.y*.008),2.))*.7+exp(-pow((r-R0*1.1)/(k.y*.006),2.))*.5;
  float a12=an+spin*.15;float tickB=smoothstep(.992,1.,cos(a12*12.))*step(R0*.9,r)*step(r,R0*.99);float tickS=smoothstep(.998,1.,cos(a12*60.))*step(R0*.94,r)*step(r,R0*.99)*.6;
  float teeth=step(.5,fract((an-spin*.08)*36./6.2832))*step(R0*1.1,r)*step(r,R0*1.16)*.55;
  float h1=spin*2.6+1.57,h2=spin*.6+1.57;vec2 v1=vec2(cos(h1),sin(h1)),v2=vec2(cos(h2),sin(h2));float hand=exp(-pow(seg(d,vec2(0.),v1*R0*.8)/(k.y*.01),2.))+exp(-pow(seg(d,vec2(0.),v2*R0*.52)/(k.y*.02),2.));
  float hub=exp(-r*r/(k.y*k.y*.002));float fl=fbm(vec2(an*4.,r/k.y*3.-T*3.));
  float a=(ring*.75+tickB+tickS+teeth*.8+hand*.8+hub)*aw*(.75+.25*fl);o=over(vec4(mix(gold,white,.35+.3*fl)*a,a*.72),o);}}
 // 5) colonne de lumière + éclat de résurrection + étoile d'Adolla
 {float tp=T-1.55;if(tp>0.&&tp<2.){vec2 d=p-tg;float colw=k.x*(.78+.1*sin(T*9.));float colA=smoothstep(colw,colw*.15,abs(d.x))*smoothstep(-.1,.25,tp)*(1.-smoothstep(1.,1.9,tp))*(.3+.7*smoothstep(-k.y*1.3,k.y*.6,d.y));float shaft=colA*(.4+.45*fbm(vec2(d.x*22.,d.y*3.+T*7.)));o=over(vec4(mix(gold,white,.65)*shaft,shaft*.5),o);
  float tr=tp-.5;if(tr>0.){float fl=exp(-tr*6.)*exp(-dot(d,d)/(k.y*k.y*1.2));o=over(vec4(white*fl,fl*.85),o);
   float an=atan(d.y,d.x),r=length(d);float star=pow(max(0.,cos(an*4.)),40.)+pow(max(0.,cos(an*4.+.785)),60.)*.5;float sA=star*smoothstep(k.y*(.2+tr*3.),0.,r)*exp(-tr*3.)*1.2;o=over(vec4(mix(gold,white,.7)*sA,sA),o);
   for(int i=0;i<3;i++){float tt=tr-float(i)*.1;if(tt>0.){float rr=length(d*vec2(1.,1.2));float ring=exp(-pow((rr-k.y*.85-tt*(.34-float(i)*.08))/(.005+tt*.012),2.))*(1.-smoothstep(.12,.7,tt));o=over(vec4(gold*ring,ring*.75),o);}}}
  vec2 kd=abs(d)/k;float m=max(kd.x,kd.y);float band=step(.8,hash(vec2(floor(d.y/(k.y*.06)+T*30.),floor(T*24.))));float scan=band*smoothstep(1.25,1.02,m)*step(1.,m)*(1.-smoothstep(.3,.9,tp))*.6;o=over(vec4(white*scan,scan),o);}}
 // 6) braises et cendres qui montent partout
 {vec2 cell=vec2(p.x*14.,p.y*9.-T*1.7);vec2 id=floor(cell),f=fract(cell)-.5;float h=hash(id);float sp=step(.92,h)*smoothstep(.08,0.,length(f+vec2(sin(T*3.+h*20.)*.2,0.)))*win(T,.25,3.5,.4);o=over(vec4(fireCol(.55+h*.45)*sp,sp*.9),o);}
 gl_FragColor=o;}`;
const MUGETSU_FRAG=TF_HEAD+`
/* Ichigo · MUGETSU (3,6 s) : flammes noires du Getsuga, les ténèbres envahissent l'écran, une lame noire part tout droit et tranche l'adversaire en deux,
   rideau de traînées verticales et fumée blanche au front de la vague, puis les piliers noirs se retirent vers le ciel */
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),tg=(S0-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec2 dir=normalize(tg-c+vec2(0.,.0001));vec2 nrm=vec2(-dir.y,dir.x);float along=dot(p-c,dir),across=dot(p-c,nrm);float dist=length(tg-c);
 // 0) l'écran s'assombrit pendant la charge
 float dim=.18+.3*smoothstep(.1,1.,T);dim*=1.-smoothstep(2.9,3.55,T);o=vec4(0.,0.,0.,dim);
 // 1) flammes noires du Getsuga autour d'Ichigo (bord rouge sombre), qui montent
 {float aw=win(T,.05,1.35,.2);if(aw>0.){vec2 q=(p-c)/k.y;vec2 kd=abs(p-c)/k;float inCard=1.-smoothstep(.9,1.02,max(kd.x,kd.y));vec2 e=q*vec2(k.y/max(k.x,.001)*.9,.78);float r=length(e);float n=fbm(vec2(atan(e.x,e.y)*3.,r*2.2-T*5.))*.9+fbm(vec2(q.x*8.,q.y*4.-T*8.))*.4;float sh=.98+.4*n-r+max(q.y,0.)*.3;float body=smoothstep(0.,.3,sh)*aw*(1.-inCard*.97);float rim=smoothstep(.0,.16,sh)*(1.-smoothstep(.16,.5,sh))*aw*(1.-inCard);
  float smk=fbm(vec2(q.x*6.,q.y*4.-T*3.));o=over(vec4(mix(vec3(.0),vec3(.16,.02,.02),smk*smoothstep(.1,.6,sh))*body,body*.8),o);o=over(vec4(vec3(.5,.03,.03)*rim,rim*.32),o);
  // vrilles noires qui s'élèvent
  for(int i=0;i<5;i++){float fi=float(i);float x0=(fi-2.)*k.x*.55+sin(T*2.+fi)*k.x*.15;float yy=(p.y-c.y)/k.y;float wv=x0+sin(yy*3.-T*4.+fi*1.7)*k.x*.25*(yy+1.);float tw=k.x*max(.13-.03*yy,.02);float v=(1.-smoothstep(.6,2.6,yy))*smoothstep(tw,tw*.3,abs(p.x-c.x-wv))*step(-1.,yy)*smoothstep(-1.,-.6,yy)*(1.-smoothstep(1.6,2.6,yy-(T-.2)*1.5+1.))*aw*(1.-inCard*.85);o=over(vec4(vec3(.01)*v,v*.9),o);}}}
 // 2) la vague de ténèbres qui part de la lame et envahit l'écran
 float wt=T-1.38;float front=0.;
 if(wt>0.){float W=wt*1.9+.01;float rec=1.-smoothstep(2.35,3.2,T);float edgeN=fbm(vec2(along*6.,T*2.))*.12;float inW=smoothstep(W+.04,W-.06,abs(across)+edgeN)*rec;vec2 kt=abs(p-tg)/k;float spot=1.-.62*smoothstep(1.35,.95,max(kt.x,kt.y));inW*=spot;
  float curtain=fbm(vec2(across*34.,T*.4+uv.y*.6))*.5+fbm(vec2(across*90.,uv.y*2.))*.25;vec3 dc=vec3(.012)+vec3(.22)*smoothstep(.5,.95,curtain)*smoothstep(.15,1.,uv.y);o=over(vec4(dc*inW,inW*.96),o);
  front=exp(-pow((abs(across)-W)/(.03+wt*.02),2.))*rec*step(.0,1.);
  // fumée blanche au front de la vague (surtout en bas, comme dans l'animé)
  float sm=fbm(vec2(across*7.+T,uv.y*5.-T*.8))*1.2;float smoke=front*smoothstep(.62,.0,uv.y)*smoothstep(.35,.75,sm)*1.1+smoothstep(W+.15,W-.02,abs(across))*smoothstep(.22,.0,uv.y)*smoothstep(.5,.85,sm)*rec*.8;o=over(vec4(vec3(.92,.93,.95)*smoke,clamp(smoke,0.,1.)),o);}
 // 3) la lame noire : une ligne droite qui part d'Ichigo et traverse l'adversaire jusqu'au bord de l'écran
 {float tl=T-.98;if(tl>0.&&tl<2.3){float L=mix(0.,dist+2.,smoothstep(0.,.16,tl));float on=step(0.,along)*step(along,L);float th=k.y*(.012+.03*exp(-tl*5.));float d=abs(across);float core=smoothstep(th,th*.4,d)*on;float halo=exp(-d/(k.y*.05))*on*(1.-smoothstep(.2,1.4,tl))*.8;float fade=1.-smoothstep(1.4,2.3,tl);
  o=over(vec4(vec3(.85,.88,.95)*halo,halo*fade),o);o=over(vec4(vec3(0.)*core,core*fade),o);
  float tip=exp(-pow((along-L)/(k.y*.08),2.))*exp(-d*d/(k.y*k.y*.004))*(1.-smoothstep(.12,.22,tl));o=over(vec4(vec3(1.)*tip,tip),o);}}
 // 4) l'impact : fente blanche verticale sur l'adversaire, éclats
 {float ti=T-1.16;if(ti>0.&&ti<1.2){vec2 d=p-tg;float ac=dot(d,nrm),al=dot(d,dir);float slit=exp(-ac*ac/(k.y*k.y*(.00015+ti*.0012)))*smoothstep(k.y*1.5,k.y*.3,abs(al))*exp(-ti*3.5);o=over(vec4(vec3(1.)*slit,slit),o);
  float fl=exp(-ti*10.)*exp(-dot(d,d)/(k.y*k.y*.6));o=over(vec4(vec3(1.)*fl,fl*.7),o);
  for(int i=0;i<14;i++){float fi=float(i);float an=hash(vec2(fi,3.))*6.2832;float sp=.25+.5*hash(vec2(fi,8.));vec2 sp2=tg+vec2(cos(an),sin(an))*sp*ti*.6;float sz=k.y*(.012+.012*hash(vec2(fi,1.)));float pt=smoothstep(sz,0.,length(p-sp2))*(1.-smoothstep(.3,1.,ti));o=over(vec4(vec3(1.)*pt,pt),o);}}}
 {float tl2=T-1.2;if(tl2>0.&&tl2<1.9){vec2 kt=abs(p-tg)/k;float m=max(kt.x,kt.y);float rimL=exp(-pow((m-1.01)/.035,2.))*(1.-smoothstep(1.2,1.9,tl2))*smoothstep(0.,.15,tl2)*.75;o=over(vec4(vec3(.95)*rimL,rimL),o);}}
 // 5) les piliers noirs se retirent vers le ciel
 {float tr=T-2.15;if(tr>0.){float rec=1.-smoothstep(.9,1.4,tr);vec2 top=vec2(p.x*.6,.95);float an=atan(p.x-top.x*0.,(.9-p.y));float ray=smoothstep(.55,.95,fbm(vec2(an*9.,tr*.6)))*smoothstep(-.6,.5,p.y-(.5-tr*.9))*rec;o=over(vec4(vec3(.02)*ray,ray*.75),o);}}
 gl_FragColor=o;}`;
const DOMINATION_FRAG=TF_HEAD+`
/* Makima · DOMINATION (3,6 s) : ondes hypnotiques aux anneaux dorés autour de Makima, deux lourdes chaînes de fer rougeoyant
   qui fondent sur la cible et l'enserrent, fils de marionnette qui la tiennent depuis le ciel, puis entaille forcée vers son allié */
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float zz(float x,float s){float i=floor(x),f=fract(x);return mix(hash(vec2(i,s)),hash(vec2(i+1.,s)),f)-.5;}
/* distance à un éclair A→B : déplacement latéral anguleux (3 octaves de bruit linéaire par morceaux), nul aux extrémités */
float bolt(vec2 p,vec2 A,vec2 B,float sd,float amp){vec2 ba=B-A;float L=max(length(ba),1e-4);vec2 dr=ba/L,nr=vec2(-dr.y,dr.x);vec2 pa=p-A;float t=dot(pa,dr)/L;float tc=clamp(t,0.,1.);
 float t2=min(tc+.004,1.);float j=(zz(tc*6.,sd)+.5*zz(tc*15.,sd+3.)+.22*zz(tc*34.,sd+7.))*sin(3.1416*tc),j2=(zz(t2*6.,sd)+.5*zz(t2*15.,sd+3.)+.22*zz(t2*34.,sd+7.))*sin(3.1416*t2);
 float sl=(j2-j)/.004*amp*1.4/L;float off=(dot(pa,nr)-j*amp*1.4)/sqrt(1.+sl*sl);float de=(t<0.?-t:t>1.?t-1.:0.)*L;return length(vec2(off,de));}
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec2 bz(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
// une chaîne le long d'une courbe de Bézier : maillons alternés de face / de profil, fer sombre, reflets, lueur rouge
vec4 chain(vec2 p,vec2 a,vec2 m,vec2 b,float ext,float LL,float fade){vec4 o=vec4(0.);float best=1e5,bt=0.;vec2 bn=vec2(0.);for(int i=0;i<24;i++){float t1=float(i)/24.,t2=float(i+1)/24.;if(t1>ext)break;vec2 a1=bz(a,m,b,t1),b1=bz(a,m,b,min(t2,ext));vec2 pa=p-a1,ba=b1-a1;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);float d=length(pa-ba*h);if(d<best){best=d;bt=mix(t1,min(t2,ext),h);bn=normalize(vec2(-ba.y,ba.x));}}
 if(best>LL*.9)return o;float along=bt*length(b-a)*1.25;float sd=dot(p-bz(a,m,b,bt),bn);float k=floor(along/LL);float f=fract(along/LL)-.5;vec2 q=vec2(f*LL,sd);float face=1.-mod(k,2.);
 float dl=face>.5?abs(sdRB(q,vec2(LL*.62,LL*.34),LL*.3))-LL*.085:sdRB(q,vec2(LL*.62,LL*.07),LL*.06);float m2=smoothstep(LL*.04,0.,dl);
 float sh=face>.5?.55+.45*smoothstep(LL*.3,-LL*.3,q.y):.4+.3*smoothstep(LL*.07,-LL*.07,q.y);vec3 iron=mix(vec3(.04,.035,.04),vec3(.46,.42,.44),sh);float glint=pow(max(0.,sin(along/LL*1.7-T*9.)),24.);iron+=vec3(1.,.35,.18)*glint*.6+vec3(.8,.12,.08)*exp(-abs(dl)/(LL*.06))*.18;
 o=vec4(iron*m2,m2)*fade;float gl=exp(-max(dl,0.)/(LL*.35))*.22*fade;o=over(o,vec4(vec3(.7,.05,.05)*gl,gl));return o;}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),ct=(S0-.5)*vec2(asp,1.),vt=(S1-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 gold=vec3(1.,.8,.36),crim=vec3(.8,.06,.08);
 // voile cramoisi + vignette
 float dk=win(T,0.,3.5,.35);float vig=smoothstep(.3,1.,length((uv-.5)*vec2(asp*.8,1.)));o=vec4(mix(vec3(.09,0.,.015),vec3(.01,0.,0.),vig),(.34+.3*vig)*dk);
 // 1) ondes hypnotiques : anneaux dorés concentriques qui partent de Makima (comme les anneaux de ses yeux)
 {float aw=win(T,.0,2.2,.3);if(aw>0.){vec2 d=p-c;float r=length(d*vec2(1.,1.1));float w=0.;for(int i=0;i<5;i++){float tt=T*1.15-float(i)*.22;if(tt>0.){float R0=tt*.62;w+=exp(-pow((r-R0)/(.004+.006*tt),2.))*(1.-smoothstep(.2,1.,tt))*(.9-float(i)*.12);}}float a=w*aw;o=over(vec4(gold*a,a*.85),o);
  float halo=exp(-r/(k.y*.9))*aw*.35;o=over(vec4(crim*halo,halo),o);
  // petit œil aux anneaux au-dessus de la tête de Makima
  vec2 e=p-(c+vec2(0.,k.y*1.25));float er=length(e*vec2(1.,1.));float eo=smoothstep(.0,.35,T)*(1.-smoothstep(1.7,2.2,T));float lid=abs(e.y)-k.y*.16*eo*(1.-pow(min(abs(e.x)/(k.x*.75),1.),2.));float inE=smoothstep(.003,-.003,lid)*step(abs(e.x),k.x*.75);float rg=smoothstep(.6,.95,.5+.5*cos(er/k.y*120.));vec3 iris=mix(vec3(1.,.78,.3),vec3(.45,.16,.05),rg);iris=mix(iris,vec3(.1,0.,0.),smoothstep(k.y*.035,k.y*.025,er));float ia=inE*smoothstep(k.y*.17,k.y*.15,er)*aw;o=over(vec4(iris*ia,ia),o);float lr=exp(-pow(lid/(k.y*.008),2.))*step(abs(e.x),k.x*.75)*aw*eo;o=over(vec4(vec3(.05,0.,0.)*lr+gold*lr*.3,lr*.9),o);}}
 // sceau de contrôle qui tourne sous Makima (cercle à graduations et anneaux)
 {float aw=win(T,.05,2.6,.3);if(aw>0.){vec2 d=(p-c-vec2(0.,-k.y*.95))*vec2(1.,2.6);float r=length(d),an=atan(d.y,d.x);float R0=k.x*1.5*smoothstep(.0,.45,T);float ring=exp(-pow((r-R0)/(k.y*.012),2.))+exp(-pow((r-R0*.82)/(k.y*.008),2.))*.8;float tick=smoothstep(.97,1.,cos(an*24.+T*1.5))*step(R0*.84,r)*step(r,R0*.98);float runes=step(.55,hash(vec2(floor((an+T*.8)*7.),2.)))*exp(-pow((r-R0*.91)/(k.y*.01),2.))*.8;float a=(ring+tick+runes)*aw;o=over(vec4(vec3(1.,.78,.35)*a,a*.8),o);float g=exp(-r/(R0+.001)*2.)*aw*.18;o=over(vec4(vec3(.8,.05,.08)*g,g),o);}}
 // 2) deux lourdes chaînes de Makima vers la cible
 {float tc=T-.62;if(tc>0.&&tc<1.95){float ext=smoothstep(0.,.34,tc);float fade=1.-smoothstep(1.4,1.95,tc);float LL=k.y*.15;
  for(int j=0;j<2;j++){float sgn=float(j)*2.-1.;vec2 a=c+vec2(sgn*k.x*.5,k.y*.3);vec2 b=ct+vec2(sgn*k.x*.55,-k.y*.15);vec2 m=(a+b)*.5+vec2(sgn*k.x*1.2,-k.y*.25*(1.-ext)+k.y*.15);m+=vec2(sin(T*5.+sgn)*k.x*.12,cos(T*4.)*k.y*.05)*(1.-smoothstep(.2,.5,tc));o=over(chain(p,a,m,b,ext,LL,fade),o);
   vec2 tipP=bz(a,m,b,ext),tipD=normalize(bz(a,m,b,ext)-bz(a,m,b,max(ext-.05,0.)));vec2 tn=vec2(-tipD.y,tipD.x);float al2=dot(p-tipP,tipD),ac2=abs(dot(p-tipP,tn));float bl=step(-LL*1.1,al2)*step(al2,LL*.9)*smoothstep(0.,LL*.03,(LL*.38)*(1.-clamp((al2+LL*.2)/(LL*1.1),0.,1.))*step(-LL*.2,al2)+LL*.12*step(al2,-LL*.2)-ac2);vec3 bc2=mix(vec3(.25,.22,.24),vec3(.95,.9,.92),smoothstep(LL*.3,0.,ac2))+vec3(1.,.3,.2)*.15;o=over(vec4(bc2*bl*fade,bl*fade),o);}
  // la chaîne s'enroule autour de la carte ciblée
  float wr=smoothstep(.3,.55,tc);if(wr>0.){vec2 q=(p-ct)/k;float an=atan(q.y,q.x);float r=length(q*vec2(1.,.82));float band=abs(r-1.08-.05*sin(an*2.+T*3.));float kk=floor((an+3.1416)/6.2832*26.);float f=fract((an+3.1416)/6.2832*26.)-.5;float face=1.-mod(kk,2.);float dl=face>.5?abs(length(vec2(f*1.6,band/.07)))-.55:abs(band)/.03-1.;float m2=smoothstep(.25,0.,dl)*step(band,.11)*step((an+3.1416)/6.2832,wr)*fade;o=over(vec4(mix(vec3(.12,.08,.08),vec3(.7,.6,.55),.5+.5*sin(an*26.))*m2,m2),o);}}}
 // 3) fils de marionnette tirés depuis le ciel jusqu'à la cible
 {float tf=T-1.2;if(tf>0.&&tf<1.25){float fade=smoothstep(0.,.12,tf)*(1.-smoothstep(.9,1.25,tf));for(int i=0;i<4;i++){float fi=float(i);vec2 a=vec2(ct.x+(fi-1.5)*k.x*.55+sin(T*3.+fi)*k.x*.08,.62);vec2 b=ct+vec2((fi-1.5)*k.x*.5,k.y*(.55-abs(fi-1.5)*.15))+vec2(sin(T*14.+fi)*k.x*.03,0.);float d=seg(p,a,b);float th=smoothstep(k.y*.006,0.,d)*fade;o=over(vec4(mix(gold,vec3(1.),.4)*th,th*.85),o);float g=exp(-d/(k.y*.02))*.25*fade;o=over(vec4(crim*g,g),o);}}}
 // 4) la frappe forcée : entaille rouge en arc vers l'allié (ou implosion sur elle-même)
 {float ts=T-1.95;float selfHit=step(length(vt-ct),.001);if(ts>0.&&ts<1.1){if(selfHit<.5){float head=smoothstep(0.,.18,ts);vec2 mid=(ct+vt)*.5+vec2(0.,k.y*.6);float d=1e5;for(int i=0;i<12;i++){float t1=float(i)/12.,t2=float(i+1)/12.;if(t1>head)break;d=min(d,seg(p,bz(ct,mid,vt,t1),bz(ct,mid,vt,min(t2,head))));}float w=k.y*(.03+.06*exp(-ts*6.));float sl=smoothstep(w,0.,d)*(1.-smoothstep(.25,.7,ts));o=over(vec4(mix(crim,vec3(1.,.85,.85),smoothstep(w,0.,d*2.))*sl,sl),o);float gl=exp(-d/(k.y*.1))*(1.-smoothstep(.2,.7,ts))*.5;o=over(vec4(crim*gl,gl),o);}
  float ti=ts-(selfHit>.5?.05:.18);if(ti>0.){vec2 d=p-vt;float r=length(d);float fl=exp(-ti*8.)*exp(-r*r/(k.y*k.y*.5));o=over(vec4(vec3(1.,.75,.75)*fl,fl*.8),o);float ring=exp(-pow((r-ti*.5)/(.006+ti*.02),2.))*(1.-smoothstep(.2,.8,ti));o=over(vec4(crim*ring,ring),o);
   for(int i=0;i<12;i++){float fi=float(i);float an=hash(vec2(fi,7.))*6.2832;vec2 sp=vt+vec2(cos(an),sin(an))*(.2+.5*hash(vec2(fi,2.)))*ti*.7;float pt=smoothstep(k.y*.02,0.,length(p-sp))*(1.-smoothstep(.25,.9,ti));o=over(vec4(vec3(.9,.05,.05)*pt,pt),o);}}}}
 gl_FragColor=o;}`;
const ARSENAL_FRAG=TF_HEAD+`
uniform float M;
/* Toji · ARSENAL (3,3 s) : le fléau-ver de l'inventaire (gros ver annelé violacé) s'enroule autour de Toji et recrache ses trois outils maudits
   vers la droite de la carte ; Toji fond sur la cible (traînées directionnelles, image rémanente) et frappe en croix avec la lance céleste inversée */
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float zz(float x,float s){float i=floor(x),f=fract(x);return mix(hash(vec2(i,s)),hash(vec2(i+1.,s)),f)-.5;}
/* distance à un éclair A→B : déplacement latéral anguleux (3 octaves de bruit linéaire par morceaux), nul aux extrémités */
float bolt(vec2 p,vec2 A,vec2 B,float sd,float amp){vec2 ba=B-A;float L=max(length(ba),1e-4);vec2 dr=ba/L,nr=vec2(-dr.y,dr.x);vec2 pa=p-A;float t=dot(pa,dr)/L;float tc=clamp(t,0.,1.);
 float t2=min(tc+.004,1.);float j=(zz(tc*6.,sd)+.5*zz(tc*15.,sd+3.)+.22*zz(tc*34.,sd+7.))*sin(3.1416*tc),j2=(zz(t2*6.,sd)+.5*zz(t2*15.,sd+3.)+.22*zz(t2*34.,sd+7.))*sin(3.1416*t2);
 float sl=(j2-j)/.004*amp*1.4/L;float off=(dot(pa,nr)-j*amp*1.4)/sqrt(1.+sl*sl);float de=(t<0.?-t:t>1.?t-1.:0.)*L;return length(vec2(off,de));}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),tg=(S0-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 float dk=win(T,0.,3.2,.3);float vig=smoothstep(.35,1.,length((uv-.5)*vec2(asp*.8,1.)));o=vec4(vec3(.0,.01,.008),(.26+.3*vig)*dk);
 // 1) le fléau-ver est l'image découpée (CSS .toji-worm) : ici seulement une ombre violacée derrière la carte
 {float aw=win(T,.05,1.6,.25);vec2 q=(p-c-vec2(k.x*.6,k.y*1.25))/k.y;float g=exp(-dot(q,q)*3.)*aw*.25;o=over(vec4(vec3(.25,.08,.3)*g,g),o);}
 // 2) les trois outils sortent de la bouche et filent se ranger à droite de la carte
 {float te=T-.85;if(te>0.&&te<1.){for(int i=0;i<3;i++){float fi=float(i);vec2 from=c+vec2(k.x*.68,k.y*1.4);vec2 to=c+vec2(k.x*1.22,k.y*(.78-fi*.78));float h=smoothstep(fi*.15,fi*.15+.28,te);vec2 mid=(from+to)*.5+vec2(k.x*.4,k.y*.25);vec2 cur=mix(mix(from,mid,h),mix(mid,to,h),h);float d=1e5;for(int s2=0;s2<8;s2++){float t1=float(s2)/8.*h,t2=float(s2+1)/8.*h;d=min(d,seg(p,mix(mix(from,mid,t1),mix(mid,to,t1),t1),mix(mix(from,mid,t2),mix(mid,to,t2),t2)));}
  vec3 col=i==0?vec3(.7,1.,.82):i==1?vec3(.95,.95,1.):vec3(1.,.42,.32);float fade=step(.01,h)*(1.-smoothstep(.55,1.,te));float tr=smoothstep(k.y*.035,0.,d)*fade*.8;o=over(vec4(col*tr,tr),o);float hd=exp(-dot(p-cur,p-cur)/(k.y*k.y*.006))*fade;o=over(vec4(col*hd,hd),o);
  float land=te-(fi*.15+.28);if(land>0.&&land<.3){float rr=length(p-to);float ring=exp(-pow((rr-land*.25)/(.004+land*.01),2.))*(1.-land/.3);o=over(vec4(col*ring,ring),o);}}}}
 // 3) ruée : traînées dans l'axe de la course, puis impact en croix avec la lance
 {float tr=T-1.3;vec2 dir=normalize(tg-c+vec2(0.,.0001)),nrm=vec2(-dir.y,dir.x);if(tr>0.&&tr<.4){float al=dot(p-c,dir),ac=dot(p-c,nrm);float L=length(tg-c);float lane=floor(ac/(k.x*.12));float h=hash(vec2(lane,5.));float st=step(.55,h)*smoothstep(k.x*.05,0.,abs(fract(ac/(k.x*.12))-.5)*k.x*.12)*step(0.,al)*step(al,L)*smoothstep(k.x*1.3,0.,abs(ac));float head=smoothstep(0.,.22,tr)*L;st*=smoothstep(head-L*.6,head,al)*step(al,head)*(1.-smoothstep(.3,.4,tr));o=over(vec4(vec3(.9,.95,1.)*st,st*.7),o);}
  float ti=T-1.55;vec3 wc=M<1.5?vec3(.6,1.,.75):M<2.5?vec3(1.,.32,.3):vec3(1.,.8,.35);if(ti>0.&&ti<1.3){vec2 d=p-tg;float r=length(d);float fl=exp(-ti*9.)*exp(-r*r/(k.y*k.y*.55));o=over(vec4(mix(vec3(1.),wc,.35)*fl,fl*.85),o);
   for(int s2=0;s2<2;s2++){if(M>2.5||(M>1.5&&s2==1))continue;vec2 ax=normalize(s2==0?vec2(1.,.85):vec2(1.,-.85));float x=abs(dot(d,vec2(-ax.y,ax.x))),along=abs(dot(d,ax));float w=k.y*(.01+.03*exp(-ti*7.));float cut=smoothstep(w,0.,x)*smoothstep(k.y*1.35,k.y*.2,along)*(1.-smoothstep(.12,.55,ti))*step(float(s2)*.06,ti);o=over(vec4(vec3(1.)*cut,cut),o);float g=exp(-x/(k.y*.05))*smoothstep(k.y*1.4,0.,along)*(1.-smoothstep(.1,.5,ti))*.5*step(float(s2)*.06,ti);o=over(vec4(wc*g,g),o);}if(M>2.5){float sw=exp(-pow((r-ti*.7)/(.01+ti*.05),2.))*(1.-smoothstep(.15,.6,ti));o=over(vec4(wc*sw,sw),o);float cr=step(.62,fbm(vec2(atan(d.y,d.x)*4.,r*14.)))*smoothstep(k.y*1.1,k.y*.3,r)*smoothstep(0.,.05,ti)*(1.-smoothstep(.5,1.2,ti))*.5;o=over(vec4(wc*cr,cr),o);}
   float ring=exp(-pow((r-ti*.45)/(.005+ti*.016),2.))*(1.-smoothstep(.2,.7,ti));o=over(vec4(wc*ring,ring*.8),o);
   for(int i=0;i<14;i++){float fi=float(i);float an=hash(vec2(fi,4.))*6.2832;vec2 sp=tg+vec2(cos(an),sin(an))*(.15+.45*hash(vec2(fi,6.)))*ti*.8-vec2(0.,.3*ti*ti);float pt=smoothstep(k.y*.022,0.,length(p-sp))*(1.-smoothstep(.3,1.,ti));o=over(vec4(vec3(.85,.9,.95)*pt,pt),o);}}
  // soin de la lance céleste : volutes vertes qui remontent sur Toji
  float th=T-1.7;if(M<1.5&&th>0.&&th<1.2){vec2 q=p-c;vec2 cell=vec2(q.x*15.,q.y*9.-th*5.);vec2 id=floor(cell);float hh=hash(id);float sp=step(.82,hh)*smoothstep(.14,0.,length(fract(cell)-.5))*smoothstep(k.x*1.25,k.x*.4,abs(q.x))*smoothstep(k.y*1.4,k.y*.1,abs(q.y))*(1.-smoothstep(.7,1.2,th));o=over(vec4(vec3(.45,1.,.62)*sp,sp),o);float gl=exp(-dot(q,q)/(k.y*k.y*1.4))*win(th,0.,1.1,.3)*.22;o=over(vec4(vec3(.3,1.,.5)*gl,gl),o);}}
 gl_FragColor=o;}`;
const NEANT_FRAG=TF_HEAD+`
/* Zeno · NÉANT (3,4 s) : claquement de doigts (étincelle, rayons, ondes), un dôme d'effacement blanc à franges irisées engloutit la ligne adverse,
   éclair blanc total, puis chaque carte se fissure de lumière et part en éclats lumineux qui s'élèvent */
vec2 h2(vec2 p){return vec2(hash(p),hash(p+17.3));}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 wb=vec3(.9,.95,1.),cy=vec3(.5,.85,1.),mg=vec3(1.,.6,.95);
 vec2 f0=(S0-.5)*vec2(asp,1.),f1=(S1-.5)*vec2(asp,1.),f2=(S2-.5)*vec2(asp,1.);vec2 ctr=N>2.5?(f0+f1+f2)/3.:N>1.5?(f0+f1)*.5:f0;
 // voile qui pâlit tout l'écran, plus fort à l'effacement
 float flash=exp(-pow((T-1.2)/.1,2.));float veil=win(T,.3,3.1,.4)*.14+flash*.55;o=vec4(wb*veil,veil);
 // 1) claquement : étincelle + rayons + deux ondes qui plissent l'espace
 {vec2 hp=c+vec2(k.x*.35,k.y*1.12);float ts=T-.32;if(ts>-.05&&ts<.55){float d=length(p-hp);float sp=exp(-d*d/(k.y*k.y*.008))*exp(-abs(ts)*12.);float an=atan(p.y-hp.y,p.x-hp.x);float rays=(pow(max(0.,cos(an*3.)),40.)+pow(max(0.,cos(an*3.+1.05)),60.))*exp(-d/(k.y*.6))*exp(-abs(ts)*8.);o=over(vec4(vec3(1.)*(sp+rays),clamp(sp+rays,0.,1.)),o);}
  if(ts>0.&&ts<1.5){float r=length(p-hp);for(int i=0;i<3;i++){float tt=ts-float(i)*.09;if(tt>0.){float R0=tt*1.3;float ring=exp(-pow((r-R0)/(.003+tt*.012),2.))*(1.-smoothstep(.4,1.4,tt))*(1.-float(i)*.25);vec3 col=i==0?wb:i==1?cy:mg;o=over(vec4(col*ring,ring*.7),o);}}}}
 // 2) le dôme d'effacement : sphère blanche à franges irisées qui grossit sur la ligne adverse
 {float td=T-.5;if(td>0.&&td<1.1){float grow=smoothstep(0.,.7,td);float span=max(max(length(f0-ctr),length(f1-ctr)),length(f2-ctr))+k.x*1.6;float R0=mix(k.y*.2,span,grow);vec2 d=(p-ctr)*vec2(1.,1.25);float r=length(d);float an=atan(d.y,d.x);float wob=.012*sin(an*7.+T*9.)+.01*fbm(vec2(an*3.,T*3.));float fade=1.-smoothstep(.62,1.05,td);
   float inside=smoothstep(R0+wob,R0-.02+wob,r)*(.18+.25*grow)*fade;float edgeW=exp(-pow((r-R0-wob)/.012,2.))*fade;float edgeC=exp(-pow((r-R0-wob-.018)/.012,2.))*fade;float edgeM=exp(-pow((r-R0-wob+.018)/.012,2.))*fade;
   o=over(vec4(wb*inside,inside),o);o=over(vec4(cy*edgeC*.8,edgeC*.6),o);o=over(vec4(mg*edgeM*.6,edgeM*.45),o);o=over(vec4(vec3(1.)*edgeW,edgeW),o);
   float lines=smoothstep(.75,1.,sin((r-T*.4)*140.))*smoothstep(R0,R0*.3,r)*.12*fade;o=over(vec4(wb*lines,lines),o);}}
 // éclair d'effacement total
 o=over(vec4(vec3(1.)*flash*.6,flash*.6),o);
 // 3) chaque carte se fissure de lumière puis part en éclats qui montent
 for(int i=0;i<3;i++){if(float(i)>=N)break;vec2 f=i==0?f0:i==1?f1:f2;vec2 q=(p-f)/k;float te=T-1.2-float(i)*.05;
  if(te>-.25&&te<2.){float inCard=step(abs(q.x),1.)*step(abs(q.y),1.);
   // fissures (diagramme de Voronoï) qui s'allument juste avant l'effacement
   vec2 g=q*vec2(2.,3.)+float(i)*7.;vec2 gi=floor(g),gf=fract(g);float d1=8.,d2=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o2=vec2(float(x),float(y));vec2 pt=o2+h2(gi+o2)*.8+.1;float dd=length(pt-gf);if(dd<d1){d2=d1;d1=dd;}else if(dd<d2)d2=dd;}
   float crack=smoothstep(.07,.0,d2-d1)*inCard*smoothstep(-.25,.0,te)*(1.-smoothstep(.15,.6,te));o=over(vec4(mix(cy,vec3(1.),.6)*crack,crack),o);
   float glow=inCard*exp(-pow(te/.12,2.))*.55;o=over(vec4(vec3(1.)*glow,glow),o);
   // éclats lumineux
   for(int sI=0;sI<14;sI++){float fs=float(sI)+float(i)*20.;vec2 st=vec2(hash(vec2(fs,1.))*2.-1.,hash(vec2(fs,2.))*2.-1.)*.85;float tt=max(te-.02,0.);vec2 vel=vec2((st.x)*.4+(hash(vec2(fs,4.))-.5)*.5,1.+hash(vec2(fs,3.))*1.4);vec2 cpos=st+vel*tt*1.1;vec2 lq=q-cpos;float ang=tt*(hash(vec2(fs,5.))-.5)*8.;lq=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*lq;vec2 sz=vec2(.09+.08*hash(vec2(fs,6.)),.07+.06*hash(vec2(fs,7.)))*(1.-smoothstep(.3,1.6,tt));float sh=step(abs(lq.x),sz.x)*step(abs(lq.y),sz.y)*step(0.,te)*(1.-smoothstep(1.,1.7,tt));float rimS=sh*(1.-step(abs(lq.x),sz.x*.6)*step(abs(lq.y),sz.y*.6));o=over(vec4(mix(wb,cy,hash(vec2(fs,9.)))*sh*.85+vec3(1.)*rimS*.3,sh*.9),o);}
   // halo cyan résiduel
   float res=exp(-dot(q*vec2(1.,.75),q*vec2(1.,.75))*.9)*win(te,0.,1.6,.4)*.22;o=over(vec4(cy*res,res),o);}}
 gl_FragColor=o;}`;
const OVERLORD_FRAG=TF_HEAD+`
uniform float M;
/* Ainz · OVERLORD (3,6 s) : aura de mort violette, cercles magiques runiques sous Ainz, les sept joyaux du sceptre s'allument,
   un flot d'âmes vert-violet file vers l'allié tombé qui se relève (M=1) ; ou un bouclier de mort se referme sur Ainz (M=2) */
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float zz(float x,float s){float i=floor(x),f=fract(x);return mix(hash(vec2(i,s)),hash(vec2(i+1.,s)),f)-.5;}
/* distance à un éclair A→B : déplacement latéral anguleux (3 octaves de bruit linéaire par morceaux), nul aux extrémités */
float bolt(vec2 p,vec2 A,vec2 B,float sd,float amp){vec2 ba=B-A;float L=max(length(ba),1e-4);vec2 dr=ba/L,nr=vec2(-dr.y,dr.x);vec2 pa=p-A;float t=dot(pa,dr)/L;float tc=clamp(t,0.,1.);
 float t2=min(tc+.004,1.);float j=(zz(tc*6.,sd)+.5*zz(tc*15.,sd+3.)+.22*zz(tc*34.,sd+7.))*sin(3.1416*tc),j2=(zz(t2*6.,sd)+.5*zz(t2*15.,sd+3.)+.22*zz(t2*34.,sd+7.))*sin(3.1416*t2);
 float sl=(j2-j)/.004*amp*1.4/L;float off=(dot(pa,nr)-j*amp*1.4)/sqrt(1.+sl*sl);float de=(t<0.?-t:t>1.?t-1.:0.)*L;return length(vec2(off,de));}
vec2 bz(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),tg=(S0-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 vio=vec3(.62,.32,1.),soul=vec3(.45,1.,.7),gold=vec3(1.,.82,.4);
 float dk=win(T,0.,3.5,.35);float vig=smoothstep(.3,1.,length((uv-.5)*vec2(asp*.8,1.)));vec2 stv=(p-(c+vec2(-k.x*1.02,k.y*.35)))/k.y;float clear=1.-.85*exp(-length(stv*vec2(2.,.7))*1.6);o=vec4(mix(vec3(.04,.0,.07),vec3(.0),vig),(.32+.3*vig)*dk*clear);
 // 1) aura de mort discrète : volutes sombres à liseré violet qui montent surtout côté droit et au-dessus, jamais sur le sceptre (à gauche)
 {float aw=win(T,.05,2.9,.3);vec2 q=(p-c)/k.y;vec2 kd=abs(p-c)/k;float inCard=1.-smoothstep(.9,1.02,max(kd.x,kd.y));vec2 e=q*vec2(k.y/max(k.x,.001)*.95,.85);float r=length(e);float n=fbm(vec2(atan(e.x,e.y)*3.,r*2.3-T*3.))+.4*fbm(vec2(q.x*8.,q.y*4.-T*5.));float sh=.9+.3*n-r+max(q.y,0.)*.22;
  vec2 st=(p-(c+vec2(-k.x*1.02,k.y*.35)))/k.y;float staffMask=1.-smoothstep(.12,.32,abs(st.x))*0.-(1.-smoothstep(.1,.3,abs(st.x)))*smoothstep(-1.,-.6,st.y)*(1.-smoothstep(1.,1.3,st.y));
  float body=smoothstep(0.,.22,sh)*aw*(1.-inCard*.97)*max(staffMask,0.);float rim=smoothstep(0.,.04,sh)*(1.-smoothstep(.04,.13,sh))*aw*(1.-inCard)*max(staffMask,0.);o=over(vec4(vec3(.02,0.,.04)*body,body*.4),o);o=over(vec4(vio*rim,rim*.22),o);
  // volutes qui s'élèvent
  for(int i=0;i<4;i++){float fi=float(i);float x0=(fi-1.)*k.x*.55+k.x*.15;float yy=(p.y-c.y)/k.y;float wv=x0+sin(yy*3.-T*3.+fi*1.9)*k.x*.18;float tw=k.x*max(.07-.015*yy,.02);float v=smoothstep(tw,tw*.2,abs(p.x-c.x-wv))*(1.-smoothstep(.8,2.2,yy))*smoothstep(.85,1.05,yy)*(1.-smoothstep(1.6,2.2,yy-(T-.3)*1.2+.8))*aw;o=over(vec4(mix(vec3(.05,0.,.08),vio,.35)*v,v*.55),o);}
  // halo doré autour du sceptre pour le mettre en valeur
  float sg=exp(-length(st*vec2(2.2,.55))*2.2)*aw*.35;o=over(vec4(mix(vec3(1.,.82,.4),vio,.3)*sg,sg),o);}
 // 2) cercles magiques runiques sous Ainz (deux anneaux qui tournent en sens inverse)
 {float aw=win(T,.1,3.2,.35);vec2 d=(p-c-vec2(0.,-k.y*.98))*vec2(1.,2.7);float r=length(d),an=atan(d.y,d.x);float R0=k.x*1.75*smoothstep(.1,.6,T);float a=0.;a+=exp(-pow((r-R0)/(k.y*.012),2.));a+=exp(-pow((r-R0*.86)/(k.y*.008),2.))*.8;a+=exp(-pow((r-R0*.55)/(k.y*.008),2.))*.7;
  float runeA=step(.5,hash(vec2(floor((an+T*.6)*9.),3.)))*smoothstep(R0*.88,R0*.9,r)*smoothstep(R0*.98,R0*.96,r);float runeB=step(.45,hash(vec2(floor((an-T*.9)*6.),7.)))*smoothstep(R0*.57,R0*.59,r)*smoothstep(R0*.84,R0*.82,r)*.6;float star=0.;for(int i=0;i<5;i++){float a1=T*.4+float(i)*1.2566,a2=a1+2.5133;star=max(star,exp(-pow(seg(d,vec2(cos(a1),sin(a1))*R0*.55,vec2(cos(a2),sin(a2))*R0*.55)/(k.y*.006),2.)));}
  float tot=(a+runeA*.8+runeB+star*.7)*aw;o=over(vec4(mix(vio,vec3(.9,.8,1.),.3)*tot,tot*.85),o);float g=exp(-r/(R0+.001)*1.6)*aw*.2;o=over(vec4(vio*g,g),o);}
 // 3) les sept joyaux du sceptre (au-dessus d'Ainz) s'allument un par un, puis lancent des rayons
 vec2 sp=c+vec2(-k.x*.98,k.y*1.04);
 {for(int i=0;i<7;i++){float fi=float(i);float ton=.75+fi*.07;float on=smoothstep(ton,ton+.08,T)*(1.-smoothstep(2.6,3.2,T));vec2 gp=sp+vec2((fi-3.)*k.x*.07,abs(fi-3.)*-k.y*.02);vec3 gc=i==0?vec3(.3,.6,1.):i==1?vec3(1.,.3,.25):i==2?vec3(1.,.85,.3):i==3?vec3(.9,.9,1.):i==4?vec3(.35,1.,.5):i==5?vec3(.75,.4,1.):vec3(.3,.9,1.);float gl=exp(-dot(p-gp,p-gp)/(k.y*k.y*.0025))*on;o=over(vec4(gc*gl,gl),o);float halo=exp(-length(p-gp)/(k.y*.12))*on*.35;o=over(vec4(gc*halo,halo),o);}
  float tr=T-1.3;if(tr>0.&&tr<.9){float an=atan(p.y-sp.y,p.x-sp.x);float rays=pow(max(0.,cos(an*7.+T*2.)),30.)*exp(-length(p-sp)/(k.y*.9))*win(tr,0.,.9,.25);o=over(vec4(mix(gold,vio,.4)*rays,rays*.8),o);}}
 // 4a) M=1 : flot d'âmes du sceptre vers l'allié tombé, puis il se relève dans une colonne verte-violette
 if(M<1.5){float ts=T-1.35;if(ts>0.&&ts<1.){float head=smoothstep(0.,.55,ts);vec2 mid=(sp+tg)*.5+vec2(0.,k.y*1.1);float d=1e5,al=0.;for(int i=0;i<16;i++){float t1=float(i)/16.,t2=float(i+1)/16.;if(t1>head)break;float dd=seg(p,bz(sp,mid,tg,t1),bz(sp,mid,tg,min(t2,head)));if(dd<d){d=dd;al=t1;}}float fade=1.-smoothstep(.65,1.,ts);float n=fbm(vec2(al*12.-T*6.,d/k.y*8.));float w=k.y*(.03+.04*n);float st=smoothstep(w,0.,d)*fade;o=over(vec4(mix(soul,vio,n)*st,st*.9),o);float core=exp(-d*d/(k.y*k.y*.0008))*fade;o=over(vec4(vec3(.9,1.,.95)*core,core),o);
   for(int i=0;i<10;i++){float fi=float(i);float t1=fract(ts*1.6+hash(vec2(fi,1.)))*head;vec2 pp=bz(sp,mid,tg,t1)+vec2(sin(fi*7.+T*5.),cos(fi*5.+T*4.))*k.y*.06;float sk=exp(-dot(p-pp,p-pp)/(k.y*k.y*.003))*fade;o=over(vec4(soul*sk,sk),o);}}
  float tp=T-1.95;if(tp>0.&&tp<1.6){vec2 d=p-tg;float colw=k.x*(.85+.1*sin(T*8.));float colA=smoothstep(colw,colw*.15,abs(d.x))*win(tp,0.,1.5,.3)*(.3+.7*smoothstep(-k.y*1.3,k.y*.6,d.y));float sh2=colA*(.4+.5*fbm(vec2(d.x*20.,d.y*3.-T*5.)));o=over(vec4(mix(soul,vio,.5)*sh2,sh2*.55),o);
   float fl=exp(-tp*6.)*exp(-dot(d,d)/(k.y*k.y*1.2));o=over(vec4(vec3(.85,1.,.95)*fl,fl*.8),o);float ring=exp(-pow((length(d*vec2(1.,1.2))-k.y*.8-tp*.3)/(.005+tp*.012),2.))*(1.-smoothstep(.15,.7,tp));o=over(vec4(soul*ring,ring*.8),o);
   vec2 cell=vec2(d.x/k.y*8.,d.y/k.y*6.-tp*3.);vec2 id=floor(cell);float h=hash(id);float mote=step(.84,h)*smoothstep(.2,.05,length(fract(cell)-.5))*smoothstep(k.x*1.3,k.x*.3,abs(d.x))*smoothstep(-k.y*1.2,0.,d.y)*smoothstep(k.y*2.2,k.y*.6,d.y)*win(tp,.1,1.5,.3);o=over(vec4(mix(soul,vio,h)*mote,mote),o);}}
 // 4b) M=2 : bouclier de mort qui se referme sur Ainz (hexagones violets) et crâne-sceau
 else{float ts=T-1.4;if(ts>0.&&ts<2.){vec2 d=(p-c)/k.y;float r=length(d*vec2(k.y/k.x*.7,.78));float R0=1.25;float close=smoothstep(0.,.5,ts);float fade=1.-smoothstep(1.4,2.,ts);float shell=exp(-pow((r-R0)/.025,2.))*close*fade;vec2 hx=d*6.;vec2 hq=vec2(hx.x+hx.y*.577,hx.y*1.155);vec2 hf=fract(hq)-.5;float hexA=smoothstep(.45,.5,max(abs(hf.x),abs(hf.y)))*smoothstep(R0+.05,R0-.25,r)*smoothstep(R0-.5,R0-.1,r)*close*fade*.5;o=over(vec4(vio*(shell+hexA),(shell+hexA)*.8),o);float fl=exp(-pow((ts-.5)/.08,2.))*smoothstep(R0,0.,r)*.6;o=over(vec4(vec3(.85,.7,1.)*fl,fl),o);}}
 gl_FragColor=o;}`;
const XEBEC_FRAG=TF_HEAD+`
/* Xebec · HAKI (3,2 s) : son œil s'allume, flash blanc, explosion de Haki des rois (rayons rouges et noirs en éventail, ondes de choc à bord noir,
   éclairs noirs à liseré rouge), le ciel vire au rouge sombre, puis chaque allié garde un liseré de Haki crépitant */
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float zz(float x,float s){float i=floor(x),f=fract(x);return mix(hash(vec2(i,s)),hash(vec2(i+1.,s)),f)-.5;}
/* distance à un éclair A→B : déplacement latéral anguleux (3 octaves de bruit linéaire par morceaux), nul aux extrémités */
float bolt(vec2 p,vec2 A,vec2 B,float sd,float amp){vec2 ba=B-A;float L=max(length(ba),1e-4);vec2 dr=ba/L,nr=vec2(-dr.y,dr.x);vec2 pa=p-A;float t=dot(pa,dr)/L;float tc=clamp(t,0.,1.);
 float t2=min(tc+.004,1.);float j=(zz(tc*6.,sd)+.5*zz(tc*15.,sd+3.)+.22*zz(tc*34.,sd+7.))*sin(3.1416*tc),j2=(zz(t2*6.,sd)+.5*zz(t2*15.,sd+3.)+.22*zz(t2*34.,sd+7.))*sin(3.1416*t2);
 float sl=(j2-j)/.004*amp*1.4/L;float off=(dot(pa,nr)-j*amp*1.4)/sqrt(1.+sl*sl);float de=(t<0.?-t:t>1.?t-1.:0.)*L;return length(vec2(off,de));}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 red=vec3(1.,.1,.14),deep=vec3(.35,0.,.03),blk=vec3(.01,0.,.0);
 vec2 d=p-c;float r=length(d),an=atan(d.y,d.x);
 // fond : assombrissement puis ciel rouge sombre pendant l'explosion
 float dk=win(T,0.,3.1,.3);float boom=win(T,.52,1.9,.25);float vig=smoothstep(.3,1.05,length((uv-.5)*vec2(asp*.8,1.)));o=vec4(mix(mix(vec3(.03,0.,.01),deep,boom*(1.-vig*.6)),vec3(0.),vig*.6),(.35+.25*vig+.22*boom)*dk);
 // 1) l'œil de Xebec s'illumine
 {float te=T-.15;if(te>-.05&&te<.5){vec2 ep=c+vec2(k.x*.18,k.y*.55);vec2 q=(p-ep)/vec2(k.x*.5,k.y*.05);float gl=exp(-dot(q,q))*exp(-abs(te)*7.)*1.4;float st=exp(-abs(p.y-ep.y)/(k.y*.01))*smoothstep(k.x*2.,0.,abs(p.x-ep.x))*exp(-abs(te)*9.);o=over(vec4(red*(gl+st),clamp(gl+st,0.,1.)),o);}}
 // 2) flash blanc puis éventail de rayons rouges et noirs
 {float fl=exp(-pow((T-.46)/.05,2.));o=over(vec4(vec3(1.)*fl*.8,fl*.8),o);
  float tr=T-.55;if(tr>0.&&tr<1.5){float wedge=step(.5,fract(an*12./6.2832+tr*.15));float rays=smoothstep(.15,.6,r)*(1.-smoothstep(.8,1.4,tr));vec3 rc=mix(blk,red*.7,wedge);float ra=rays*(.22+.16*wedge)*smoothstep(0.,.08,tr);o=over(vec4(rc*ra,ra),o);}}
 // 3) ondes de choc : anneau épais noir + liseré rouge
 for(int i=0;i<3;i++){float ts=T-.55-float(i)*.14;if(ts>0.&&ts<1.3){float R0=ts*(1.25-float(i)*.2);float w=.012+ts*.035;float ring=exp(-pow((r*1.0-R0)/w,2.))*(1.-smoothstep(.35,1.3,ts));float rr=exp(-pow((r-R0-w*1.2)/(w*.35),2.))*(1.-smoothstep(.35,1.3,ts));o=over(vec4(blk*ring,ring*.85),o);o=over(vec4(red*rr,rr*.9),o);}}
 // 4) éclairs du Haki des rois : tracés fractals (zigzags anguleux sur 3 octaves) avec ramifications ; halo rouge large, corps noir, filament blanc-rose qui scintille
 {float aw=win(T,.52,1.75,.18);if(aw>0.){float ft=floor(T*12.);for(int i=0;i<7;i++){float fi=float(i);float on=step(.22,hash(vec2(fi,ft+9.)));if(on<.5)continue;float a0=fi*.8976+hash(vec2(fi,ft))*.5;vec2 dir=vec2(cos(a0),sin(a0));vec2 A=c+dir*k.y*.5;float len=(.38+.5*hash(vec2(fi,ft+3.)))*smoothstep(.5,.72,T);vec2 B=A+dir*len;float sd=fi*17.+ft;
   float dm=bolt(p,A,B,sd,len*.13);vec2 bo=A+(B-A)*(.35+.3*hash(vec2(fi,ft+5.)));float ba=a0+(hash(vec2(fi,ft+6.))<.5?-1.:1.)*(.45+.4*hash(vec2(fi,ft+7.)));float db=bolt(p,bo,bo+vec2(cos(ba),sin(ba))*len*.45,sd+40.,len*.07);
   float fl=.75+.25*hash(vec2(fi,floor(T*40.)));float glow=(exp(-dm/.028)*.55+exp(-db/.02)*.35)*fl;o=over(vec4(red*glow,glow*aw),o);
   float body=smoothstep(.0085,.0045,dm)+smoothstep(.0048,.0022,db);o=over(vec4(blk*clamp(body,0.,1.)*aw,clamp(body,0.,1.)*aw),o);
   float hot=(smoothstep(.0016,.0004,dm)+.6*smoothstep(.001,.0002,db))*fl;o=over(vec4(vec3(1.,.82,.86)*hot,clamp(hot,0.,1.)*aw),o);}}}
 // 5) liseré de Haki autour de chaque allié protégé, parcouru de petits arcs électriques noirs et rouges
 for(int i=0;i<3;i++){if(float(i)>=N)break;vec2 f=((i==0?S0:i==1?S1:S2)-.5)*vec2(asp,1.);float aw=win(T,1.05+float(i)*.08,3.1,.3);vec2 q=abs(p-f)/k;float m=max(q.x,q.y);float band=exp(-pow((m-1.05)/.035,2.))*aw;o=over(vec4(blk*band,band*.6),o);o=over(vec4(red*band*.55,band*.4),o);
  float ft=floor(T*10.+float(i)*3.);for(int j=0;j<2;j++){float fj=float(j);float a1=hash(vec2(fj+float(i)*5.,ft))*6.2832,a2=a1+.5+.6*hash(vec2(fj,ft+2.));vec2 v1=vec2(cos(a1),sin(a1)),v2=vec2(cos(a2),sin(a2));v1*=1.07/max(abs(v1.x)/k.x,abs(v1.y)/k.y);v2*=1.07/max(abs(v2.x)/k.x,abs(v2.y)/k.y);
   float da=bolt(p,f+v1,f+v2,ft*3.+fj+float(i)*11.,length(v2-v1)*.12);float g=exp(-da/.012)*.6*aw;o=over(vec4(red*g,g),o);float bd=smoothstep(.0035,.0015,da)*aw;o=over(vec4(blk*bd,bd),o);float ht=smoothstep(.0012,.0003,da)*aw;o=over(vec4(vec3(1.,.8,.85)*ht,ht),o);}
  float land=exp(-pow((T-1.05-float(i)*.08)/.06,2.))*smoothstep(1.4,.9,m);o=over(vec4(red*land,land*.6),o);}
 gl_FragColor=o;}`;
const BERSERK_FRAG=TF_HEAD+`
/* Guts · BERSERKER (2,8 s) : aura noire de l'armure (fumée sombre, pas de feu), yeux rouges du casque, explosion de rage sombre ; la jauge de rage s'allume au-dessus de lui */
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 float dk=win(T,0.,2.7,.3);float vig=smoothstep(.3,1.,length((uv-.5)*vec2(asp*.8,1.)));o=vec4(vec3(.02,0.,0.),(.34+.3*vig)*dk);
 // 1) aura noire qui monte : fumée épaisse à reflets gris, liseré rouge sombre très fin
 {float aw=win(T,.05,2.5,.3);vec2 q=(p-c)/k.y;vec2 kd=abs(p-c)/k;float inCard=1.-smoothstep(.9,1.02,max(kd.x,kd.y));vec2 e=q*vec2(k.y/max(k.x,.001)*.92,.8);float r=length(e);float n=fbm(vec2(atan(e.x,e.y)*3.,r*2.2-T*3.2))+.5*fbm(vec2(q.x*7.,q.y*4.-T*4.5));float sh=.62+.26*n-r+max(q.y,0.)*.2;float body=smoothstep(0.,.3,sh)*aw*(1.-inCard*.97);float tone=fbm(q*5.+T*.5);
  o=over(vec4(mix(vec3(.0),vec3(.16,.15,.17),tone*smoothstep(.1,.6,sh))*body,body*.88),o);float rim=smoothstep(0.,.05,sh)*(1.-smoothstep(.05,.14,sh))*aw*(1.-inCard);o=over(vec4(vec3(.45,0.,.02)*rim,rim*.4),o);
  for(int i=0;i<5;i++){float fi=float(i);float x0=(fi-2.)*k.x*.32;float yy=(p.y-c.y)/k.y;float wv=x0+sin(yy*2.6-T*2.6+fi*1.7)*k.x*.12*(yy+1.);float tw=k.x*max(.08-.02*yy,.015);float v=smoothstep(tw,tw*.25,abs(p.x-c.x-wv))*(1.-smoothstep(.8,1.6,yy))*smoothstep(-1.,-.6,yy)*aw*(1.-inCard*.9);o=over(vec4(vec3(.01)*v,v*.85),o);}}
 // 2) yeux rouges du casque
 {float aw=win(T,.4,2.4,.2);vec2 ey=c+vec2(0.,k.y*1.2);for(int i=0;i<2;i++){vec2 e2=ey+vec2((float(i)-.5)*k.x*.42,0.);vec2 d=(p-e2)/vec2(k.x*.16,k.y*.035);float slit=smoothstep(1.,.5,length(d))*aw;float gl=exp(-length((p-e2)/vec2(k.x*.4,k.y*.12)))*aw*.6;o=over(vec4(vec3(1.,.1,.08)*gl,gl),o);o=over(vec4(vec3(1.,.75,.7)*slit,slit),o);}}
 // 3) explosion de rage : onde noire, fissures rouges au sol
 {float ts=T-.75;if(ts>0.&&ts<1.4){vec2 d=(p-c-vec2(0.,-k.y*.9))*vec2(1.,2.2);float r=length(d);float ring=exp(-pow((r-ts*.9)/(.012+ts*.03),2.))*(1.-smoothstep(.3,1.2,ts));o=over(vec4(vec3(.0)*ring,ring*.9),o);float rr=exp(-pow((r-ts*.9-.02)/(.005+ts*.01),2.))*(1.-smoothstep(.3,1.2,ts));o=over(vec4(vec3(.8,0.,.05)*rr,rr*.8),o);float an=atan(d.y,d.x);float crack=step(.62,fbm(vec2(an*4.,r*16.)))*smoothstep(k.x*2.,k.x*.3,r)*smoothstep(0.,.08,ts)*(1.-smoothstep(.8,1.4,ts))*.6;o=over(vec4(vec3(.7,0.,.04)*crack,crack),o);}}
 gl_FragColor=o;}`;
const HUNT_FRAG=TF_HEAD+`
/* Chrollo · SKILL HUNTER (3,6 s) : le Bandit's Secret s'ouvre au-dessus de sa carte (lueur violette et or, rayons de pages),
   un sceau runique se referme sur la cible, sa technique s'en échappe en un flot de glyphes lumineux aspiré par le livre, éclair d'absorption.
   Sans technique à voler (M = 0) : le flot est orangé (il vole de la force). */
uniform float M;
float sg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
vec2 bz(vec2 a,vec2 m,vec2 b,float t){return mix(mix(a,m,t),mix(m,b,t),t);}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),f=(S0-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 vio=vec3(1.,.2,.28),gold=vec3(1.,.82,.45),ink=vec3(.08,.01,.03);if(M<.5)vio=vec3(1.,.45,.2);
 float dk=win(T,0.,3.5,.3);float vig=smoothstep(.3,1.05,length((uv-.5)*vec2(asp*.8,1.)));o=vec4(ink*(1.-vig*.5),(.36+.28*vig)*dk);
 vec2 bp=c+vec2(0.,k.y*.92);
 // 1) le livre s'ouvre : halo violet et or, rayons de pages qui montent
 {float aw=win(T,.25,3.25,.3);vec2 d=(p-bp)/vec2(k.x*1.3,k.y*.75);float h=exp(-dot(d,d)*1.4)*aw;o=over(vec4(mix(vio,gold,.35)*h*.9,h*.7),o);
  float an=atan(p.x-bp.x,p.y-bp.y);float up=smoothstep(-.1,.4,p.y-bp.y);float rays=pow(max(0.,sin(an*9.+T*.6)),6.)*up*exp(-length(p-bp)*5.)*win(T,.55,2.9,.3);o=over(vec4(gold*rays*.55,rays*.3),o);
  for(int i=0;i<14;i++){float fi=float(i);float lt=fract(hash(vec2(fi,3.))+T*.35);vec2 q=bp+vec2((hash(vec2(fi,1.))-.5)*k.x*2.4,lt*k.y*1.4);float dd=length((p-q)/vec2(1.,1.4));float sp=smoothstep(.008,.0,dd)*(1.-lt)*aw;o=over(vec4(mix(gold,vio,hash(vec2(fi,5.)))*sp,sp),o);}}
 {
  // 2) la main se plaque sur la cible : onde de choc rouge au moment de l'impact
  {float ts=T-1.04;if(ts>0.&&ts<.6){float r=length((p-f)/vec2(1.,1.25));float ring=exp(-pow((r-ts*.5)/(.008+ts*.03),2.))*(1.-smoothstep(.1,.6,ts));o=over(vec4(vio*ring,ring*.8),o);float fl=exp(-pow(ts/.05,2.))*exp(-r/.12);o=over(vec4(vec3(1.,.9,.85)*fl,fl*.7),o);}}
  // 3) la technique s'échappe : ruban de lumière + glyphes aspirés vers le livre
  {vec2 mid=(f+bp)*.5+vec2((f.x<bp.x?-1.:1.)*.18+.0,.22);float aw=win(T,1.65,2.42,.1);
   float dm=1e5;vec2 pr=f;for(int j=1;j<=16;j++){vec2 q=bz(f,mid,bp,float(j)/16.);dm=min(dm,sg(p,pr,q));pr=q;}
   float rib=exp(-dm/.03)*.35*aw;o=over(vec4(mix(vio,gold,.4)*rib,clamp(rib,0.,1.)),o);
   for(int i=0;i<26;i++){float fi=float(i);float tt=fract(hash(vec2(fi,7.))+(T-1.6)*1.5);vec2 q=bz(f,mid,bp,tt)+vec2(hash(vec2(fi,8.))-.5,hash(vec2(fi,9.))-.5)*.05*(1.-tt);vec2 g=abs(p-q);float gl=max(g.x*1.6,g.y);float sp=(smoothstep(.007,.003,gl)+exp(-gl/.012)*.4)*aw;o=over(vec4(mix(gold,vec3(1.),tt*.5)*sp,clamp(sp,0.,1.)),o);}}
  // 4) absorption : éclair d'or dans le livre, onde
  {float ts=T-2.38;if(ts>-.05&&ts<.9){float fl=exp(-pow(ts/.06,2.));float r=length(p-bp);float burst=exp(-r/(.05+ts*.2))*fl*1.4;o=over(vec4(gold*burst,clamp(burst,0.,1.)),o);float ring=exp(-pow((r-ts*.55)/(.01+ts*.02),2.))*(1.-smoothstep(.2,.9,ts))*step(0.,ts);o=over(vec4(mix(gold,vio,.4)*ring,ring*.8),o);}}
 }
gl_FragColor=o;}`;
const SLIME_FRAG=TF_HEAD+`
/* Rimuru · SLIME (3,4 s) : lumière aquatique, bulles qui montent, la carte fond en flaque ; au 2e rebond (≈1,77 s) une vague d'eau de soin
   part du slime et enveloppe chaque allié soigné (S0..S2, N) : halo turquoise, croix de soin, gouttes qui remontent. */
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 vec3 aq=vec3(.42,.86,1.),deep=vec3(.02,.12,.22),wh=vec3(.9,1.,1.);
 float dk=win(T,0.,3.3,.3);float vig=smoothstep(.3,1.05,length((uv-.5)*vec2(asp*.8,1.)));
 // caustiques d'eau en fond
 float cau=pow(abs(sin(fbm(p*6.+vec2(T*.4,-T*.3))*6.2832)),8.);o=vec4(deep*(1.-vig*.5)+aq*cau*.12,(.3+.22*vig)*dk);
 // 1) la carte fond : lueur bleue et éclaboussure au sol
 {float ts=T-.62;if(ts>0.&&ts<.9){vec2 d=(p-c-vec2(0.,-k.y*.75))*vec2(1.,3.);float r=length(d);float ring=exp(-pow((r-ts*.55)/(.01+ts*.03),2.))*(1.-smoothstep(.2,.9,ts));o=over(vec4(aq*ring,ring*.7),o);}}
 {float aw=win(T,.2,2.9,.3);vec2 d=(p-c)/vec2(k.x*1.5,k.y*1.1);float h=exp(-dot(d,d)*1.3)*aw*.55;o=over(vec4(aq*h,h*.6),o);}
 // 2) bulles qui montent autour du slime
 for(int i=0;i<18;i++){float fi=float(i);float lt=fract(hash(vec2(fi,2.))+T*(.35+.25*hash(vec2(fi,4.))));vec2 q=c+vec2((hash(vec2(fi,1.))-.5)*k.x*3.2+sin(T*3.+fi)*.01,-k.y*.8+lt*k.y*2.6);float rr=.004+.007*hash(vec2(fi,6.));float d=length(p-q);float ring=smoothstep(rr,rr*.6,abs(d-rr))*(1.-lt)*win(T,.3,2.9,.3);float hl=smoothstep(rr*.5,0.,length(p-q-vec2(-rr*.4,rr*.4)))*(1.-lt)*win(T,.3,2.9,.3);o=over(vec4(wh*(ring*.8+hl),clamp(ring*.7+hl,0.,1.)),o);}
 // 3) vague de soin : grande onde turquoise depuis le slime au rebond
 {float ts=T-1.77;if(ts>0.&&ts<1.2){float r=length(p-c-vec2(0.,-k.y*.3));float w=.02+ts*.05;float wave=exp(-pow((r-ts*.9)/w,2.))*(1.-smoothstep(.3,1.2,ts));float wob=.5+.5*sin(atan(p.y-c.y,p.x-c.x)*14.-ts*10.);o=over(vec4(mix(aq,wh,.3*wob)*wave,wave*.7),o);float fl=exp(-pow(ts/.06,2.))*exp(-r/.2);o=over(vec4(wh*fl,fl*.6),o);}}
 // 4) sur chaque allié soigné : halo, croix de soin, gouttes qui remontent
 for(int i=0;i<3;i++){if(float(i)>=N)break;vec2 f=((i==0?S0:i==1?S1:S2)-.5)*vec2(asp,1.);float aw=win(T,1.85+float(i)*.06,3.1,.25);vec2 q=(p-f)/k;float m=max(abs(q.x),abs(q.y));
  float halo=exp(-pow((m-1.02)/.07,2.))*aw;o=over(vec4(aq*halo,halo*.75),o);
  vec2 cq=(p-f-vec2(0.,k.y*.15+(T-1.9)*.05))/k.y;float cr=(step(abs(cq.x),.07)*step(abs(cq.y),.24)+step(abs(cq.y),.07)*step(abs(cq.x),.24));cr=min(cr,1.)*win(T,1.95+float(i)*.06,2.75,.15);o=over(vec4(mix(wh,aq,.35)*cr,cr*.85),o);
  for(int j=0;j<7;j++){float fj=float(j);float lt=fract(hash(vec2(fj,float(i)+3.))+(T-1.9)*.9);vec2 dq=f+vec2((hash(vec2(fj,float(i)))-.5)*k.x*1.8,-k.y*.9+lt*k.y*2.);float dd=length((p-dq)/vec2(1.,1.5));float sp=smoothstep(.009,.003,dd)*(1.-lt)*aw;o=over(vec4(mix(wh,aq,.5)*sp,sp),o);}}
 gl_FragColor=o;}`;
const ZANKA_FRAG=TF_HEAD+`
/* Yamamoto · ZANPAKUTŌ / Zanka no Tachi (3,8 s) — la lame elle-même (image + flammes) est en CSS ;
   ici : chaleur qui monte, braises qui convergent vers la lame (S2), puis à 2,0 s le jet de feu part de la pointe (S1) droit vers la cible (S0) :
   des bouffées de flammes turbulentes sont accumulées en densité puis colorées (blanc → jaune → orange → rouge), flash, onde de choc, braises. */
vec3 fire(float x){x=clamp(x,0.,1.);vec3 a=mix(vec3(.25,.01,0.),vec3(.95,.18,.02),smoothstep(0.,.3,x));a=mix(a,vec3(1.,.55,.07),smoothstep(.28,.6,x));return mix(a,vec3(1.,.96,.8),smoothstep(.62,1.,x));}
void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.),c=(C-.5)*vec2(asp,1.),f=(S0-.5)*vec2(asp,1.),tip=(S1-.5)*vec2(asp,1.),mid=(S2-.5)*vec2(asp,1.);vec2 k=K;vec4 o=vec4(0.);
 float dk=win(T,0.,3.7,.3);float vig=smoothstep(.3,1.05,length((uv-.5)*vec2(asp*.8,1.)));float charge=smoothstep(.3,1.9,T);
 float heat=fbm(vec2(p.x*3.,p.y*2.-T*1.2));o=vec4(mix(vec3(.035,.008,0.),vec3(.17,.03,0.),charge*.55+heat*.3)*(1.-vig*.4),(.36+.26*vig)*dk);
 // 1) halo de chaleur autour de la lame et lueur au sol
 {vec2 d=(p-mid)/vec2(k.x*.9,k.y*1.4);float g=exp(-dot(d,d)*1.6)*win(T,.2,2.3,.3)*(.25+.75*charge);o=over(vec4(vec3(1.,.4,.06)*g*.5,g*.4),o);
  vec2 d2=(p-c-vec2(k.x*.6,-k.y*.95))*vec2(1.,3.2);float g2=exp(-dot(d2,d2)*16.)*win(T,.2,2.3,.3)*(.3+.7*charge);o=over(vec4(fire(.6)*g2*.8,g2*.6),o);}
 // 2) braises qui convergent en spirale vers la lame
 {float aw=win(T,.3,1.95,.2);if(aw>0.)for(int i=0;i<30;i++){float fi=float(i);float pr=fract(hash(vec2(fi,1.))+T*(.55+.3*hash(vec2(fi,2.))));float a0=hash(vec2(fi,3.))*6.2832+pr*4.;float R0=.16+.24*hash(vec2(fi,4.));vec2 q=mid+vec2(cos(a0),sin(a0))*R0*(1.-pr)*vec2(1.,1.4);float d=length(p-q);float sp=(smoothstep(.006,.0015,d)+exp(-d/.012)*.35)*pr*aw;o=over(vec4(fire(.6+.4*pr)*sp,clamp(sp,0.,1.)),o);}}
 // 3) le jet de feu : bouffées turbulentes de la pointe vers la cible et au-delà
 vec2 dir=normalize(f-tip+vec2(1e-4)),nr=vec2(-dir.y,dir.x);float L=length(f-tip);
 {float aw=win(T,1.97,3.6,.3);if(aw>0.){vec2 pw=p+(vec2(fbm(p*8.+vec2(0.,-T*4.)),fbm(p*8.+vec2(5.,T*3.)))-.5)*.05;float dens=0.;
  for(int i=0;i<72;i++){float fi=float(i);float t0=1.97+pow(hash(vec2(fi,21.)),1.6)*1.0;float life=.38+.3*hash(vec2(fi,22.));float age=(T-t0)/life;if(age<0.||age>1.)continue;
   float reach=L*(1.15+.5*hash(vec2(fi,23.)));float sdist=reach*(1.-pow(1.-age,2.2));vec2 q=tip+dir*sdist+nr*(hash(vec2(fi,24.))-.5)*(.015+.12*age)+vec2(0.,.09*age*age);
   float r=.018+.05*age+.016*hash(vec2(fi,25.));vec2 dq=pw-q;float dd=dot(dq,dq)/(r*r);dens+=exp(-dd)*pow(1.-age,1.6)*(.7+.5*hash(vec2(fi,26.)));}
  // tracé initial : le coup lui-même, une lame de feu droite qui file en 0,15 s
  vec2 ps=pw-tip;float tt=dot(ps,dir),q=dot(ps,nr);float grow=smoothstep(1.97,2.12,T)*L*1.6;float line=exp(-pow(q/(.018+.01*smoothstep(1.97,2.4,T)),2.))*smoothstep(grow,grow-.1,tt)*smoothstep(-.02,.03,tt)*(1.-smoothstep(2.15,2.7,T));
  dens+=line*1.1;float brk=fbm(pw*15.-dir*T*9.)*1.1+fbm(pw*34.+vec2(0.,-T*6.))*.5;dens*=aw*clamp(brk+.05,0.,1.5);float h=1.-exp(-dens*1.1);h=h*h*(1.6-.6*h);
  o=over(vec4(fire(h)*smoothstep(.03,.3,h),smoothstep(.03,.25,h)),o);
  float glow=exp(-abs(q)/.09)*smoothstep(grow,grow-.3,tt)*step(0.,tt)*.18*(1.-smoothstep(2.3,3.3,T))*aw;o=over(vec4(vec3(1.,.42,.06)*glow,glow*.5),o);}}
 // 4) flash du coup, puis onde de choc à l'impact (sans flammes qui restent sur la cible)
 {float fl=exp(-pow((T-2.02)/.05,2.))*exp(-length(p-tip)*1.8);o=over(vec4(vec3(1.,.8,.5)*fl*.7,fl*.5),o);}
 // 4b) la cible EXPLOSE : boule de feu (bouffées accumulées puis colorées) qui vire à la fumée, onde de choc, éclats incandescents
 {float ts=T-2.08;if(ts>0.&&ts<1.65){vec2 pw=p+(vec2(fbm(p*10.+vec2(0.,-T*2.)),fbm(p*10.+vec2(4.,T*2.)))-.5)*.035;float dens=0.,smoke=0.;
  for(int i=0;i<26;i++){float fi=float(i);float a0=hash(vec2(fi,31.))*6.2832;float sp=.09+.15*hash(vec2(fi,32.));float age=ts/(.9+.5*hash(vec2(fi,33.)));if(age>1.)continue;
   vec2 q=f+vec2(cos(a0),sin(a0)*.85)*sp*(1.-pow(1.-min(age*1.6,1.),2.5))+vec2(0.,.12*age*age);float r=.026+.06*sqrt(age)+.018*hash(vec2(fi,34.));vec2 dq=pw-q;float g=exp(-dot(dq,dq)/(r*r));
   dens+=g*pow(1.-age,1.4)*1.3;smoke+=g*smoothstep(.25,.7,age)*(1.-age);}
  float core=exp(-pow(length(p-f)/(.05+ts*.25),2.))*exp(-ts*7.);dens+=core*2.5;
  float brk=.75+.6*fbm(pw*18.-vec2(0.,T*3.));float h=1.-exp(-dens*brk);
  o=over(vec4(vec3(.06,.04,.04)*clamp(smoke*.9,0.,1.),clamp(smoke*.55,0.,1.)*(1.-smoothstep(1.1,1.65,ts))),o);
  o=over(vec4(fire(h*1.1)*smoothstep(.03,.3,h),smoothstep(.03,.25,h)),o);
  float r=length((p-f)/vec2(1.,1.15));float ring=exp(-pow((r-ts*.75)/(.01+ts*.04),2.))*(1.-smoothstep(.1,.6,ts));o=over(vec4(vec3(1.,.85,.6)*ring,ring*.8),o);
  float fl=exp(-pow(ts/.05,2.))*exp(-r/.15);o=over(vec4(vec3(1.,.95,.8)*fl,fl*.85),o);
  for(int i=0;i<18;i++){float fi=float(i);float a0=hash(vec2(fi,41.))*6.2832;float v=.35+.45*hash(vec2(fi,42.));vec2 q=f+vec2(cos(a0),sin(a0))*v*ts+vec2(0.,-.35*ts*ts);vec2 vd=normalize(vec2(cos(a0),sin(a0)-.7*ts)+1e-4);vec2 pq=p-q;float al=dot(pq,vd),pe=dot(pq,vec2(-vd.y,vd.x));float sp=smoothstep(.003,.0008,abs(pe))*smoothstep(-.04,0.,al)*smoothstep(.006,0.,al)*(1.-smoothstep(.4,.9,ts));o=over(vec4(fire(.9)*sp,sp),o);}}}
 // 5) braises soufflées le long du jet
 {float aw=win(T,2.0,3.75,.3);if(aw>0.)for(int i=0;i<30;i++){float fi=float(i);float lt=fract(hash(vec2(fi,7.))+T*(.45+.4*hash(vec2(fi,8.))));vec2 o0=tip+dir*hash(vec2(fi,9.))*L*1.2;vec2 q=o0+nr*(hash(vec2(fi,10.))-.5)*.08+vec2(sin(lt*9.+fi)*.02,lt*(.2+.2*hash(vec2(fi,11.))));float d=length((p-q)/vec2(1.,1.6));float sp=(smoothstep(.0045,.001,d)+exp(-d/.01)*.3)*(1.-lt)*aw;o=over(vec4(fire(.7+.3*(1.-lt))*sp,clamp(sp,0.,1.)),o);}}
 gl_FragColor=o;}`;
const TF_SRC={vampiric:()=>VAMP_FRAG,titan:()=>TITAN_FRAG,armor:()=>ARMOR_FRAG,darkblade:()=>BLADE_FRAG,alter:()=>ALTER_FRAG,mui:()=>MUI_FRAG,future:()=>FUTURE_FRAG,mugetsu:()=>MUGETSU_FRAG,domination:()=>DOMINATION_FRAG,arsenal:()=>ARSENAL_FRAG,neant:()=>NEANT_FRAG,overlord:()=>OVERLORD_FRAG,xebec:()=>XEBEC_FRAG,berserk:()=>BERSERK_FRAG,hunt:()=>HUNT_FRAG,slime:()=>SLIME_FRAG,zanka:()=>yuroGLLow_transformgl()?ZANKA_FRAG.replace('for(int i=0;i<72;i++)','for(int i=0;i<40;i++)').replace('dens+=exp(-dd)*pow(1.-age,1.6)','dens+=1.8*exp(-dd)*pow(1.-age,1.6)'):ZANKA_FRAG},TF_SKILL={zanka:'.zanka-skill',slime:'.slime-skill',hunt:'.hunt-skill',xebec:'.xebec-skill',berserk:'.berserk-skill',overlord:'.overlord-skill',neant:'.neant-skill',domination:'.domination-skill',arsenal:'.arsenal-skill',mugetsu:'.mugetsu-skill',future:'.future-skill',mui:'.mui-skill',alter:'.alter-skill',vampiric:'.vampiric-skill',titan:'.titan-skill',armor:'.armor-skill',darkblade:'.blade-skill'};
function tfInit(){if(tfGL.gl||tfGL.failed)return tfGL.gl;try{const cv=document.createElement('canvas');cv.className='tf-canvas';const gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});if(!gl)throw Error('no webgl');
  tfGL.par=gl.getExtension('KHR_parallel_shader_compile');const vs=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vs,'attribute vec2 v;void main(){gl_Position=vec4(v,0.,1.);}');gl.compileShader(vs);tfGL.vs=vs;
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);tfGL.pending={};
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();tfGL.failed=true;tfGL.gl=null;});tfGL.canvas=cv;tfGL.gl=gl;tfGL.lcanvas=document.createElement('canvas');tfGL.lcanvas.className='tf-canvas tf-bolts';}catch(e){tfGL.failed=true;tfGL.err=String(e);}return tfGL.gl;}
function tfStartProg(key){const gl=tfInit();if(!gl||tfGL.progs[key]||tfGL.pending[key]||!TF_SRC[key])return;const fs=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fs,TF_SRC[key]());gl.compileShader(fs);const pr=gl.createProgram();gl.attachShader(pr,tfGL.vs);gl.attachShader(pr,fs);gl.linkProgram(pr);tfGL.pending[key]={pr,fs};}
function tfProg(key,wait){const gl=tfInit();if(!gl)return null;if(tfGL.progs[key])return tfGL.progs[key];if(!tfGL.pending[key]){if(!wait)return null;tfStartProg(key);}const pd=tfGL.pending[key];if(!pd)return null;
 if(!wait&&tfGL.par&&!gl.getProgramParameter(pd.pr,tfGL.par.COMPLETION_STATUS_KHR))return null;delete tfGL.pending[key];
 if(!gl.getProgramParameter(pd.pr,gl.LINK_STATUS)){tfGL.err=String(gl.getShaderInfoLog(pd.fs)||gl.getProgramInfoLog(pd.pr));tfGL.progs[key]=null;return null;}
 const loc={};for(const u of ['R','T','C','K','S0','S1','S2','N','L','M','P'])loc[u]=gl.getUniformLocation(pd.pr,u);return tfGL.progs[key]={pr:pd.pr,loc,v:gl.getAttribLocation(pd.pr,'v')};}
function tfPrime(key,tries=0){const gl=tfGL.gl;if(!gl||tfGL.primed?.[key])return;const P=tfProg(key,false);if(!P){if(tfGL.progs[key]===null||tries>60)return;setTimeout(()=>tfPrime(key,tries+1),250);return;}
 const go=()=>{if(storyAnimating){setTimeout(go,400);return;}try{const cv=tfGL.canvas;if(cv.isConnected)return;cv.width=cv.height=1;gl.viewport(0,0,1,1);gl.useProgram(P.pr);gl.enableVertexAttribArray(P.v);gl.vertexAttribPointer(P.v,2,gl.FLOAT,false,0,0);gl.uniform2f(P.loc.R,1,1);gl.uniform1f(P.loc.T,1.5);gl.drawArrays(gl.TRIANGLES,0,3);(tfGL.primed||={})[key]=true;}catch{}};
 if(typeof requestIdleCallback==='function')requestIdleCallback(go,{timeout:2500});else setTimeout(go,300);}
function tfWarm(){const keys=Object.keys(TF_SKILL).filter(k=>tfGL.progs[k]===undefined&&!tfGL.pending?.[k]&&document.querySelector('.story-battle '+TF_SKILL[k]));if(!keys.length||tfGL.warming)return;tfGL.warming=true;
 const step=()=>{const k=keys.shift();if(k)try{tfStartProg(k);tfPrime(k);}catch{}if(keys.length){if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:3000});else setTimeout(step,500);}else tfGL.warming=false;};
 if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:3000});else setTimeout(step,800);}
function tfBolt(x0,y0,x1,y1,disp,width,out,depth=0){const segs=[[x0,y0,x1,y1]];let d=disp;for(let it=0;it<6;it++){const next=[];for(const [a,b,c,e] of segs){const mx=(a+c)/2+(Math.random()-.5)*d,my=(b+e)/2+(Math.random()-.5)*d*.35;next.push([a,b,mx,my],[mx,my,c,e]);
  if(depth<2&&it>=2&&Math.random()<(depth?.12:.22)){const len=Math.hypot(c-a,e-b)*(2+Math.random()*2.5),an=Math.atan2(e-b,c-a)+(Math.random()<.5?-1:1)*(.4+Math.random()*.6);tfBolt(mx,my,mx+Math.cos(an)*len,my+Math.sin(an)*len,len*.45,width*.45,out,depth+1);}}segs.length=0;segs.push(...next);d*=.55;}
 out.push({segs,width});}
function tfDrawBolts(ctx,bolts,alpha,unit){ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
 for(const [mul,col] of [[16,'rgba(255,150,30,0.07)'],[7,'rgba(255,190,70,0.22)'],[2.6,'rgba(255,236,190,0.85)'],[1,'rgba(255,255,255,1)']])for(const b of bolts){ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=Math.max(.6,b.width*mul*unit);ctx.beginPath();for(const [a,c,e,f] of b.segs){ctx.moveTo(a,c);ctx.lineTo(e,f);}ctx.stroke();}ctx.globalAlpha=1;}
const TF_STRIKE=[[.36,1],[.41,.35],[.46,1],[.53,.5],[.58,.95],[.66,.3],[.72,.75],[.8,.25],[.86,.5],[.95,0]];
function tfStrikeLevel(t){if(t<.36||t>.95)return 0;let v=0;for(const [k,a] of TF_STRIKE){if(t>=k)v=a;}return v;}
function tfStage(arena){let st=arena.querySelector(':scope>.tf-stage');if(!st){st=document.createElement('div');st.className='tf-stage';st.setAttribute('aria-hidden','true');arena.append(st);}return st;}
const positionStoryEffectsBeforeTransformGL=positionStoryEffects;
if(!globalThis.__yuroSkip)try{positionStoryEffects=function(){const result=positionStoryEffectsBeforeTransformGL.apply(this,arguments);try{
 if(!tfGL.failed&&!storyAnimating)tfWarm();
 const act=storyImpact?.action;if((act!=='mui'||!storyAnimating)&&document.body.classList.contains('mui-go'))document.body.classList.remove('mui-go');if(!storyAnimating||(act!=='vampiric'&&act!=='titan'&&act!=='armor'&&act!=='darkblade'&&act!=='alter'&&act!=='mui'&&act!=='future'&&act!=='mugetsu'&&act!=='domination'&&act!=='arsenal'&&act!=='neant'&&act!=='overlord'&&act!=='xebec'&&act!=='berserk'&&act!=='hunt'&&act!=='slime'&&act!=='zanka'))return result;
 const arena=document.querySelector('.story-battle .story-arena'),fighter=arena?.querySelector('.story-fighter.uses-'+act),caster=fighter?.querySelector(':scope>button');if(!arena||!caster)return result;
 const stage=tfStage(arena);if(stage.dataset.placed===act)return result;
 if(act==='titan'){const img=caster.querySelector('img'),orig=typeof cardById==='function'?cardById(storyImpact.player)?.image:null;if(img&&orig&&!caster.querySelector('.tt-before')){const b=document.createElement('img');b.className='tt-before';b.src=orig;b.alt='';b.style.cssText=`left:${img.offsetLeft}px;top:${img.offsetTop}px;width:${img.offsetWidth}px;height:${img.offsetHeight}px`;img.after(b);}}
 if(act==='mui'&&!tfGL.impactAt.has(storyImpact)){tfGL.impactAt.set(storyImpact,performance.now());document.body.classList.remove('mui-go');}
 if(act==='mui'&&!fighter.style.getPropertyValue('--mdx')){const tb=arena.querySelector('.story-fighter.mui-hit>button')||arena.querySelector('.story-fighter[data-fighter-id="'+storyImpact.enemy+'"]>button');if(tb){const r=tb.getBoundingClientRect(),c0=caster.getBoundingClientRect();fighter.style.setProperty('--mdx',(r.left+r.width/2-(c0.left+c0.width/2)).toFixed(0)+'px');fighter.style.setProperty('--mdy',(r.bottom+c0.height*.48-(c0.top+c0.height/2)).toFixed(0)+'px');}}
 const gl=tfInit();const P=gl&&tfProg(act,true);if(!gl||!P){if(act==='mui')document.body.classList.add('mui-go');return result;}stage.dataset.placed=act;stage.dataset.fx=act;arena.classList.add('tf-gl');
 const a=arena.getBoundingClientRect(),c=caster.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,scale=yuroGLScale_transformgl(a,Math.min(1,(act==='armor'||act==='titan'?640:760)/a.width)*Math.min(window.devicePixelRatio||1,1.25),{zanka:55000,vampiric:90000,alter:90000,armor:90000,darkblade:95000,hunt:95000,future:95000,xebec:95000,overlord:100000}[act]||120000),W=Math.max(2,Math.round(a.width*scale)),H=Math.max(2,Math.round(a.height*scale));
 const cv=tfGL.canvas,lc=tfGL.lcanvas;cv.width=lc.width=W;cv.height=lc.height=H;gl.viewport(0,0,W,H);stage.replaceChildren(cv);if(act==='titan')stage.append(lc);
 gl.useProgram(P.pr);gl.enableVertexAttribArray(P.v);gl.vertexAttribPointer(P.v,2,gl.FLOAT,false,0,0);
 const foes=[...arena.querySelectorAll('.story-team-row.enemies .story-fighter>button')].filter(f=>!f.closest('.story-fighter')?.classList.contains('is-defeated')).slice(0,3).map(f=>f.getBoundingClientRect()).map(r=>[(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height*.4-a.top)/a.height]);
 if(!tfGL.started.has(storyImpact))tfGL.started.set(storyImpact,performance.now());let muiSync=act==='mui'&&!document.body.classList.contains('mui-go');let t0=tfGL.started.get(storyImpact),speed=typeof storySpeed==='number'&&storySpeed>0?storySpeed:1,dur=act==='titan'?4.85:act==='armor'?4.9:act==='darkblade'?3.15:act==='alter'?3.65:act==='mui'?3.85:act==='future'?3.75:act==='mugetsu'?3.6:act==='domination'?3.6:act==='arsenal'?3.3:act==='neant'?3.4:act==='overlord'?3.6:act==='xebec'?3.2:act==='berserk'?2.8:act==='hunt'?3.6:act==='slime'?3.4:act==='zanka'?3.8:3.45;
 const U=[(cx-a.left)/a.width,1-(cy-a.top)/a.height],KK=[c.width/2/a.height,c.height/2/a.height];
 gl.uniform2f(P.loc.R,W,H);gl.uniform2f(P.loc.C,U[0],U[1]);gl.uniform2f(P.loc.K,KK[0],KK[1]);gl.uniform1f(P.loc.N,foes.length);gl.uniform1f(P.loc.M,0);[P.loc.S0,P.loc.S1,P.loc.S2].forEach((l,i)=>{const f=foes[i]||[U[0],1];gl.uniform2f(l,f[0],f[1]);});if(act==='mui'){const tb=arena.querySelector('.story-fighter.mui-hit>button')||arena.querySelector('.story-fighter[data-fighter-id="'+storyImpact.enemy+'"]>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height*.45-a.top)/a.height);}}if(act==='xebec'){const xs=[...arena.querySelectorAll('.story-team-row.players .story-fighter.has-haki-ward>button')].slice(0,3).map(e=>e.getBoundingClientRect());[P.loc.S0,P.loc.S1,P.loc.S2].forEach((l,i)=>{const r=xs[i];if(r)gl.uniform2f(l,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);});gl.uniform1f(P.loc.N,xs.length);}if(act==='berserk'){const tb=arena.querySelector('.story-fighter.berserk-hit>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);}}if(act==='overlord'){gl.uniform1f(P.loc.M,storyImpact.overlordGuard?2:1);const tb=arena.querySelector('.story-team-row.players .story-fighter[data-fighter-id="'+storyImpact.overlordTarget+'"]>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);}}if(act==='domination'){const cen=el=>{const r=el.getBoundingClientRect();return [(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height];};const ce=arena.querySelector('.story-fighter.makima-ctl>button'),ve=arena.querySelector('.story-fighter.domination-hit>button')||ce;if(ce){const q=cen(ce);gl.uniform2f(P.loc.S0,q[0],q[1]);}if(ve){const q=cen(ve);gl.uniform2f(P.loc.S1,q[0],q[1]);}if(ce&&ve&&ve!==ce){const r1=ce.getBoundingClientRect(),r2=ve.getBoundingClientRect(),f=ce.closest('.story-fighter');if(f){f.style.setProperty('--dvx',((r2.left-r1.left)*.78).toFixed(0)+'px');f.style.setProperty('--dvy',((r2.top-r1.top)*.78).toFixed(0)+'px');}}}if(act==='arsenal'){gl.uniform1f(P.loc.M,storyImpact.tojiWeapon==='katana'?2:storyImpact.tojiWeapon==='cloud'?3:1);const tb=arena.querySelector('.story-fighter.arsenal-hit>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);}}if(act==='mugetsu'){const tb=arena.querySelector('.story-fighter.mugetsu-hit>button')||arena.querySelector('.story-team-row.enemies .story-fighter[data-fighter-id="'+storyImpact.enemy+'"]>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);}}if(act==='future'&&storyImpact.futureTarget!==undefined){const tb=arena.querySelector('.story-team-row.players .story-fighter[data-fighter-id="'+storyImpact.futureTarget+'"]>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);}}if(act==='hunt'){gl.uniform1f(P.loc.M,storyImpact.huntStolen?1:0);const tb=arena.querySelector('.story-fighter.hunt-target>button')||arena.querySelector('.story-fighter[data-fighter-id="'+storyImpact.enemy+'"]>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);const page=tb.parentElement.querySelector('.hunt-page-fly'),book=fighter.querySelector('.hunt-book');if(page&&book){const pr=page.getBoundingClientRect(),br=book.getBoundingClientRect();page.style.setProperty('--fx',Math.round(br.left+br.width*.75-(pr.left+pr.width/2))+'px');page.style.setProperty('--fy',Math.round(br.top+br.height/2-(pr.top+pr.height/2))+'px');}}}if(act==='zanka'){const tb=arena.querySelector('.story-fighter.zanka-hit>button')||arena.querySelector('.story-fighter[data-fighter-id="'+storyImpact.enemy+'"]>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height);}const kt=fighter.querySelector('.zanka-katana');if(kt&&tb){ const fr=fighter.getBoundingClientRect(),r=tb.getBoundingClientRect(),bx=fr.left+kt.offsetLeft+kt.offsetWidth/2,by=fr.top+kt.offsetTop+kt.offsetHeight*.92,dx=r.left+r.width/2-bx,dy=r.top+r.height/2-by,dist=Math.hypot(dx,dy)||1,th=Math.atan2(dx,-dy),lunge=Math.min(120,dist*.3),lx=dx/dist*lunge,ly=dy/dist*lunge,Lk=kt.offsetHeight*.9,tx=bx+lx+Math.sin(th)*Lk,ty=by+ly-Math.cos(th)*Lk;kt.style.setProperty('--ang',(th*180/Math.PI).toFixed(1)+'deg');kt.style.setProperty('--tx',lx.toFixed(0)+'px');kt.style.setProperty('--ty',ly.toFixed(0)+'px');gl.uniform2f(P.loc.S1,(tx-a.left)/a.width,1-(ty-a.top)/a.height);gl.uniform2f(P.loc.S2,(bx-a.left)/a.width,1-(by-kt.offsetHeight*.55-a.top)/a.height);}}if(act==='slime'){const hs=[...arena.querySelectorAll('.story-fighter.slime-healed>button')].slice(0,3).map(f=>f.getBoundingClientRect());hs.forEach((r,i)=>gl.uniform2f([P.loc.S0,P.loc.S1,P.loc.S2][i],(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height/2-a.top)/a.height));gl.uniform1f(P.loc.N,hs.length);}if(act==='alter'){const tb=arena.querySelector('.story-fighter[data-fighter-id="'+storyImpact.enemy+'"]>button')||arena.querySelector('.story-fighter.alter-target>button');if(tb){const r=tb.getBoundingClientRect();gl.uniform2f(P.loc.S0,(r.left+r.width/2-a.left)/a.width,1-(r.top+r.height*.45-a.top)/a.height);}}if(act==='darkblade'){const hb=[...arena.querySelectorAll('.story-fighter.blade-hit>button')].map(f=>f.getBoundingClientRect());const rr=hb.length?hb:[...arena.querySelectorAll('.story-team-row.enemies .story-fighter>button')].map(f=>f.getBoundingClientRect());if(rr.length){const xs=rr.map(r=>r.left+r.width/2),y=rr.reduce((n,r)=>n+r.top+r.height*.45,0)/rr.length;gl.uniform2f(P.loc.S0,(Math.min(...xs)-a.left)/a.width,1-(y-a.top)/a.height);gl.uniform2f(P.loc.S1,(Math.max(...xs)-a.left)/a.width,1-(y-a.top)/a.height);}}
 const lx=lc.getContext('2d'),unit=H/600,px=(cx-a.left)*scale,py=(cy-a.top)*scale,ch=c.height*scale,cw=c.width*scale;let bolts=[],boltAt=-1,arcs=[],arcAt=-1;
 cancelAnimationFrame(tfGL.raf);
 const _low=yuroGLLow_transformgl();let _sk=true;const frame=now=>{if(!cv.isConnected||tfGL.failed)return; if(_low&&(_sk=!_sk)){tfGL.raf=requestAnimationFrame(frame);return;}if(muiSync){muiSync=false;gl.uniform1f(P.loc.T,0);gl.uniform1f(P.loc.L,0);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);try{gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));}catch{}t0=performance.now();tfGL.started.set(storyImpact,t0);document.body.classList.add('mui-go');const lag=t0-(tfGL.impactAt.get(storyImpact)||t0);if(lag>40&&typeof storyPending!=='undefined'&&storyPending&&typeof storyDelay==='function'){const cb=storyPending.callback,rem=Math.max(0,storyPending.deadline-Date.now());storyDelay((rem+lag)*(storySpeed||1),cb);}tfGL.raf=requestAnimationFrame(frame);return;}let t=(now-t0)/1000*speed;if(act==='mui'){const fe=fighter.isConnected?fighter:arena.querySelector('.story-fighter.uses-mui'),ca=fe?.getAnimations().find(x=>x.animationName==='mui-caster');if(ca&&ca.currentTime!=null)t=ca.playState==='finished'?dur:ca.currentTime/1000*speed;}let L=0;
  if(act==='titan'){lx.clearRect(0,0,W,H);const s=tfStrikeLevel(t);L=s;
   if(t>.08&&t<.3){const f=(t>.1&&t<.13)||(t>.2&&t<.24)?.5:0;if(f){if(boltAt<0||t-boltAt>.05){bolts=[];tfBolt(px+(Math.random()-.5)*W*.5,0,px+(Math.random()-.5)*W*.3,H*.18,H*.12,1.2,bolts);boltAt=t;}tfDrawBolts(lx,bolts,f,unit);L=f*.6;}}
   if(s>0){if(boltAt<.3||t-boltAt>.06){bolts=[];tfBolt(px+(Math.random()-.5)*cw*.6,-10,px,py-ch*.35,H*.22,3.2,bolts);boltAt=t;}tfDrawBolts(lx,bolts,s,unit);
    const g=lx.createRadialGradient(px,py-ch*.3,0,px,py-ch*.3,ch*.9);g.addColorStop(0,`rgba(255,240,190,${.7*s})`);g.addColorStop(1,'rgba(255,160,40,0)');lx.globalCompositeOperation='lighter';lx.fillStyle=g;lx.fillRect(0,0,W,H);}
   if(t>.55&&t<2.4){const fade=1-Math.max(0,(t-1.4)/1);if(arcAt<0||t-arcAt>.07){arcs=[];const n=2+(Math.random()*2|0);for(let i=0;i<n;i++){const an=Math.random()*6.283,r1=.55+Math.random()*.25,an2=an+(Math.random()-.5)*1.6;tfBolt(px+Math.cos(an)*cw*r1,py+Math.sin(an)*ch*r1*.6,px+Math.cos(an2)*cw*(r1+.25),py+Math.sin(an2)*ch*(r1+.2)*.6,ch*.12,1,arcs,2);}arcAt=t;}if(Math.random()<.75)tfDrawBolts(lx,arcs,.85*fade,unit);}}
  gl.uniform1f(P.loc.T,t);gl.uniform1f(P.loc.L,L);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
  if(t<dur)tfGL.raf=requestAnimationFrame(frame);else{gl.clear(gl.COLOR_BUFFER_BIT);lx.clearRect(0,0,W,H);}};
 tfGL.raf=requestAnimationFrame(frame);
}catch{}return result;};
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"transform-gl.js");}

/* janemba-dimension.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const played=new WeakSet(),COLORS=['#e8442e','#ffd23a','#3fd1c4','#2d4bd8','#ff6fae','#c8b8ef','#ff9a2e'];
 let tpAudio=null;
 function tp(){try{if(typeof state!=='undefined'&&state.sound===false)return;tpAudio=tpAudio||new Audio('https://yurocollection.fr/assets/janemba-bunkai.mp3');const a=tpAudio.cloneNode();a.volume=.85;a.play().catch(()=>{});}catch{}}
 const reduced=()=>typeof reducedMotion==='function'&&reducedMotion();
  
  
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
  
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('jbDimLayer')||document.createElement('div');L.id='jbDimLayer';L.className='jb-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 function rectOf(el){const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};}
 
 function blocks(from,to,count,delay,dur,inward){const l=layer(),out=[];for(let i=0;i<count;i++){const b=document.createElement('i'),s=10+Math.random()*20,c=COLORS[i%COLORS.length];
   const sx=from.x+Math.random()*from.w,sy=from.y+Math.random()*from.h,ex=to.cx+(Math.random()-.5)*to.w*.7,ey=to.cy+(Math.random()-.5)*to.h*.7,mx=(sx+ex)/2+(Math.random()-.5)*160,my=Math.min(sy,ey)-40-Math.random()*120;
   b.className='jb-block';b.style.cssText=`--c:${c};width:${s}px;height:${s}px;left:0;top:0`;l.append(b);
   const rot=(Math.random()-.5)*720,burst=[sx+(Math.random()-.5)*90,sy+(Math.random()-.5)*90];
   const kf=inward?[{transform:`translate(${sx}px,${sy}px) rotate(0) scale(.2)`,opacity:0},{transform:`translate(${mx}px,${my}px) rotate(${rot/2}deg) scale(1)`,opacity:1,offset:.45},{transform:`translate(${ex}px,${ey}px) rotate(${rot}deg) scale(.6)`,opacity:1,offset:.9},{transform:`translate(${ex}px,${ey}px) rotate(${rot}deg) scale(0)`,opacity:0}]
    :[{transform:`translate(${sx}px,${sy}px) rotate(0) scale(1)`,opacity:1},{transform:`translate(${burst[0]}px,${burst[1]}px) rotate(${rot/3}deg) scale(1.1)`,opacity:1,offset:.25},{transform:`translate(${mx}px,${my}px) rotate(${rot*.7}deg) scale(.9)`,opacity:1,offset:.6},{transform:`translate(${ex}px,${ey}px) rotate(${rot}deg) scale(.3)`,opacity:0}];
   b.animate(kf,{duration:dur*(.8+Math.random()*.4),delay:delay+Math.random()*120,easing:'cubic-bezier(.3,.6,.3,1)',fill:'forwards'}).onfinish=()=>b.remove();out.push(b);}return out;}
 function orb(at,delay,dur){const l=layer(),o=document.createElement('b');o.className='jb-orb';o.style.cssText=`left:${at.cx}px;top:${at.cy}px`;l.append(o);o.animate([{transform:'translate(-50%,-50%) scale(.1)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.4},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:dur,delay,easing:'ease-out',fill:'both'}).onfinish=()=>o.remove();}
 function slash(at,delay,dur){const l=layer(),s=document.createElement('b');s.className='jb-slash';s.style.cssText=`left:${at.cx}px;top:${at.cy}px;width:${Math.max(at.w,at.h)*1.7}px`;l.append(s);s.animate([{transform:'translate(-50%,-50%) rotate(-32deg) scaleX(0)',opacity:1},{transform:'translate(-50%,-50%) rotate(-32deg) scaleX(1)',opacity:1,offset:.35},{transform:'translate(-50%,-50%) rotate(-32deg) scaleX(1.08)',opacity:0}],{duration:dur,delay,easing:'cubic-bezier(.2,.9,.2,1)',fill:'both'}).onfinish=()=>s.remove();}
 function run(actor,target){const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rectOf(actor),T=rectOf(target),T2={...T,cx:T.cx-T.w*.5,cy:T.cy+T.h*.12,x:T.x-T.w*.5,y:T.y+T.h*.12};
  const dx=T2.cx-A.cx,dy=T2.cy-A.cy,place=`translate(${dx}px,${dy}px)`;
  actor.classList.add('jb-actor');
  
  const anim=actor.animate([
   {transform:'none',opacity:1,filter:'none',offset:0},
   {transform:'translateX(-3px)',opacity:1,filter:'drop-shadow(0 0 14px #ff5fc8)',offset:.06},
   {transform:'translateX(3px) scale(1.04)',opacity:1,filter:'drop-shadow(0 0 22px #ff5fc8)',offset:.12},
   {transform:'scale(1.08)',opacity:0,filter:'drop-shadow(0 0 22px #ff5fc8)',offset:.14},
   {transform:place+' scale(.9)',opacity:0,filter:'none',offset:.40},
   {transform:place+' scale(1)',opacity:1,filter:'drop-shadow(0 0 18px #ff5fc8)',offset:.47},
   {transform:place+' translateX(26px) rotate(6deg) scale(1.05)',opacity:1,filter:'drop-shadow(0 0 12px #ff5fc8)',offset:.55},
   {transform:place+' translateX(6px)',opacity:1,filter:'none',offset:.68},
   {transform:place+' scale(1.06)',opacity:0,filter:'drop-shadow(0 0 18px #ff5fc8)',offset:.74},
   {transform:'scale(.92)',opacity:0,filter:'none',offset:.88},
   {transform:'none',opacity:1,filter:'none',offset:1}],{duration:3000*k,easing:'linear'});
  anim.onfinish=anim.oncancel=()=>actor.classList.remove('jb-actor');
  setTimeout(tp,120*k);
  blocks(A,T2,64,360*k,820*k,false);
  orb(T2,1050*k,700*k);blocks({x:T2.cx-160,y:T2.cy-140,w:320,h:280},T2,40,950*k,420*k,true);
  slash(T,1560*k,520*k);setTimeout(()=>{target.classList.add('jb-struck');setTimeout(()=>target.classList.remove('jb-struck'),420*k);},1600*k);
  blocks({x:T2.cx-A.w/2,y:T2.cy-A.h/2,w:A.w,h:A.h},A,44,2220*k,520*k,false);}
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='dimension'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-dimension');if(!actor)return;
   const target=document.querySelector('.dimension-hit')||[...document.querySelectorAll('.story-battle [data-story-target],.story-battle [data-infinity-target],.story-battle [data-duel-target]')].find(e=>e.offsetParent)||null;if(!target)return;played.add(storyImpact);if(reduced()){tp();return;}run(actor,target);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"janemba-dimension.js");}

/* aizen-ultrafragor.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
  const fxN=n=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760?Math.ceil(n*.55):n;}catch{return n;}};
 if(typeof document==='undefined')return;
 const played=new WeakSet();let audio=null;
 function sfx(){try{if(typeof state!=='undefined'&&state.sound===false)return;audio=audio||new Audio('https://yurocollection.fr/assets/aizen-ultrafragor.mp3');const a=audio.cloneNode();a.volume=.55;a.play().catch(()=>{});}catch{}}
  
  
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
  
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('afLayer')||document.createElement('div');L.id='afLayer';L.className='af-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function run(actor,target,others){const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rect(actor),T=rect(target),arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena'),R=Math.max(T.w,T.h),HIT=1100*k;
  const dx=T.cx-A.cx,dy=(T.cy+T.h*.55)-A.cy;
  
  const dark=el('af-dark',`--tx:${T.cx}px;--ty:${T.cy}px`);go(dark,[{opacity:0},{opacity:1,offset:.14},{opacity:1,offset:.62},{opacity:0}],{duration:3300*k,easing:'ease-out'});
  
  const aura=el('af-aura',`left:${A.cx}px;top:${A.cy}px;width:${A.w*1.9}px;height:${A.h*1.5}px`);go(aura,[{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-50%) scale(1.05)',opacity:1,offset:.5},{transform:'translate(-50%,-50%) scale(1.25)',opacity:0}],{duration:620*k,easing:'ease-out'});
  for(let i=0;i<fxN(14);i++){const p=el('af-rise',`left:${A.x+Math.random()*A.w}px;top:${A.y+A.h*rnd(.4,1)}px`);go(p,[{transform:'translateY(0) scaleY(.4)',opacity:0},{transform:`translateY(-${rnd(40,110)}px) scaleY(1)`,opacity:1,offset:.5},{transform:`translateY(-${rnd(120,190)}px) scaleY(.6)`,opacity:0}],{duration:rnd(420,620)*k,delay:rnd(0,260)*k,easing:'ease-out'});}
  
  actor.classList.add('af-actor');
  const an=actor.animate([
   {transform:'none',filter:'none',offset:0},
   {transform:'translateY(4px) scale(.97)',filter:'drop-shadow(0 0 20px #8f62ff) brightness(1.15)',offset:.12},
   {transform:'translateY(8px) scale(.95)',filter:'drop-shadow(0 0 30px #b89bff) brightness(1.3)',offset:.22},
   {transform:`translate(${dx*.9}px,${dy*.9}px) scale(1.12)`,filter:'drop-shadow(0 0 34px #fff) brightness(1.5)',offset:.30},
   {transform:`translate(${dx*.9}px,${dy*.9}px) scale(1.12)`,filter:'drop-shadow(0 0 34px #fff) brightness(1.6)',offset:.34},
   {transform:`translate(${dx*.78}px,${dy*.78}px) scale(1.05)`,filter:'drop-shadow(0 0 22px #8f62ff)',offset:.44},
   {transform:`translate(${dx*.74}px,${dy*.74}px) scale(1.04)`,filter:'drop-shadow(0 0 16px #8f62ff)',offset:.78},
   {transform:'none',filter:'none',offset:1}],{duration:3300*k,easing:'linear'});
  an.onfinish=an.oncancel=()=>actor.classList.remove('af-actor');
  sfx();
  
  const ang=Math.atan2(dy,dx)*180/Math.PI,len=Math.hypot(dx,dy);
  for(let i=0;i<fxN(7);i++){const s=el('af-streak',`left:${A.cx+rnd(-A.w*.4,A.w*.4)}px;top:${A.cy+rnd(-A.h*.3,A.h*.3)}px;width:${len*rnd(.6,1)}px`);go(s,[{transform:`rotate(${ang}deg) scaleX(0)`,opacity:0},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.4},{transform:`rotate(${ang}deg) translateX(${len*.4}px) scaleX(.2)`,opacity:0}],{duration:320*k,delay:(720+i*12)*k,easing:'cubic-bezier(.2,.9,.3,1)'});}
  
  for(let i=0;i<fxN(26);i++){const a=rnd(0,Math.PI*2),d=R*rnd(1.1,1.9),o=el('af-spark',`left:${T.cx}px;top:${T.cy}px;--a:${a*180/Math.PI+90}deg`);
   go(o,[{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d}px,${Math.sin(a)*d*.55}px) rotate(var(--a)) scaleY(.2)`,opacity:0},{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d*.7}px,${Math.sin(a)*d*.4}px) rotate(var(--a)) scaleY(1)`,opacity:1,offset:.3},{transform:`translate(-50%,-50%) translate(${Math.cos(a+.9)*R*.12}px,${Math.sin(a+.9)*R*.05}px) rotate(var(--a)) scaleY(.4)`,opacity:0}],{duration:rnd(380,620)*k,delay:rnd(220,820)*k,easing:'cubic-bezier(.6,0,.9,.6)'});}
  const ring=el('af-ring',`left:${T.cx}px;top:${T.cy}px;width:${R*1.5}px;height:${R*1.5}px`);
  go(ring,[{transform:'translate(-50%,-50%) scaleY(.3) rotate(0) scale(1.3)',opacity:0},{transform:'translate(-50%,-50%) scaleY(.3) rotate(240deg) scale(1)',opacity:1,offset:.45},{transform:'translate(-50%,-50%) scaleY(.3) rotate(520deg) scale(.5)',opacity:1,offset:.92},{transform:'translate(-50%,-50%) scaleY(.3) rotate(560deg) scale(.15)',opacity:0}],{duration:640*k,delay:HIT-640*k,easing:'cubic-bezier(.6,0,.9,.5)'});
  
  const flash=el('af-white');go(flash,[{opacity:0},{opacity:.95,offset:.08},{opacity:0}],{duration:320*k,delay:HIT-20*k,easing:'ease-out'});
  go(el('af-core',`left:${T.cx}px;top:${T.cy}px;width:${R*1.5}px;height:${R*1.5}px`),[{transform:'translate(-50%,-50%) scale(.1)',opacity:1},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.18},{transform:'translate(-50%,-50%) scale(1.6)',opacity:0}],{duration:640*k,delay:HIT,easing:'cubic-bezier(.1,.9,.3,1)'});
  go(el('af-pillar',`left:${T.cx}px;top:${T.cy+T.h*.5}px;width:${T.w*.62}px;height:${window.innerHeight*1.2}px`),[{transform:'translate(-50%,-100%) scaleX(.05)',opacity:0},{transform:'translate(-50%,-100%) scaleX(1.15)',opacity:1,offset:.12},{transform:'translate(-50%,-100%) scaleX(.7)',opacity:.85,offset:.5},{transform:'translate(-50%,-100%) scaleX(0)',opacity:0}],{duration:1100*k,delay:HIT,easing:'ease-out'});
  
  for(let i=0;i<fxN(26);i++){const a=rnd(0,Math.PI*2),d=rnd(R*.8,R*2.6),s=el('af-shard',`left:${T.cx}px;top:${T.cy}px;width:${rnd(5,13)}px;height:${rnd(9,22)}px`);
   go(s,[{transform:`translate(-50%,-50%) rotate(0) scale(1)`,opacity:1},{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d}px,${Math.sin(a)*d*.7-rnd(20,90)}px) rotate(${rnd(-540,540)}deg) scale(.6)`,opacity:0}],{duration:rnd(650,1000)*k,delay:HIT+rnd(0,60)*k,easing:'cubic-bezier(.1,.8,.3,1)'});}
  
  go(el('af-wave thick',`left:${T.cx}px;top:${T.cy}px;width:${R}px;height:${R}px`),[{transform:'translate(-50%,-50%) scaleY(.34) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scaleY(.34) scale(5.5)',opacity:0}],{duration:760*k,delay:HIT+30*k,easing:'cubic-bezier(.05,.75,.25,1)'});
  go(el('af-wave',`left:${T.cx}px;top:${T.cy}px;width:${R}px;height:${R}px`),[{transform:'translate(-50%,-50%) scaleY(.34) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scaleY(.34) scale(8)',opacity:0}],{duration:1000*k,delay:HIT+170*k,easing:'cubic-bezier(.05,.75,.25,1)'});
  go(el('af-blast',`left:${T.cx}px;top:${T.cy}px;width:${R*3}px;height:${R*3}px`),[{transform:'translate(-50%,-50%) scale(.2)',opacity:.9},{transform:'translate(-50%,-50%) scale(1.3)',opacity:0}],{duration:700*k,delay:HIT,easing:'ease-out'});
  
  {const nd=fxN(14);for(let i=0;i<nd;i++){const a=i/nd*Math.PI*2+rnd(-.2,.2),d=R*rnd(1.1,2.2),sz=R*rnd(.5,.95),pf=el('af-dust',`left:${T.cx}px;top:${T.cy+T.h*.3}px;width:${sz}px;height:${sz*.7}px`);
   go(pf,[{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d*.55}px,${Math.sin(a)*d*.18}px) scale(1)`,opacity:.85,offset:.25},{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d}px,${Math.sin(a)*d*.25-R*.35}px) scale(1.6)`,opacity:0}],{duration:rnd(1500,2100)*k,delay:HIT+rnd(40,160)*k,easing:'cubic-bezier(.1,.7,.3,1)'});}}
  for(let i=0;i<fxN(16);i++){const a=rnd(-Math.PI,0),d=rnd(R*.6,R*1.8),sz=rnd(6,18),rk=el('af-rock',`left:${T.cx}px;top:${T.cy+T.h*.2}px;width:${sz}px;height:${sz*rnd(.7,1)}px`),vx=Math.cos(a)*d,up=Math.abs(Math.sin(a))*d*rnd(.7,1.2);
   go(rk,[{transform:'translate(-50%,-50%) rotate(0)',opacity:1},{transform:`translate(-50%,-50%) translate(${vx*.5}px,${-up}px) rotate(${rnd(-300,300)}deg)`,opacity:1,offset:.45},{transform:`translate(-50%,-50%) translate(${vx}px,${R*rnd(.2,.6)}px) rotate(${rnd(-600,600)}deg)`,opacity:0}],{duration:rnd(1000,1400)*k,delay:HIT+rnd(0,80)*k,easing:'cubic-bezier(.25,.4,.6,1)'});}
  
  for(let i=0;i<4;i++)go(el('af-ripple',`left:${T.cx}px;top:${T.cy+T.h*.15}px;width:${R*.8}px;height:${R*.8}px`),[{transform:'translate(-50%,-50%) scaleY(.32) scale(.3)',opacity:0},{transform:'translate(-50%,-50%) scaleY(.32) scale(1.3)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scaleY(.32) scale(3)',opacity:0}],{duration:900*k,delay:HIT+(520+i*150)*k,easing:'ease-out'});
  for(let i=0;i<fxN(18);i++){const e=el('af-ember',`left:${T.cx+rnd(-R*.8,R*.8)}px;top:${T.cy+rnd(-R*.2,R*.4)}px`);go(e,[{transform:'translateY(0) scale(1)',opacity:0},{transform:`translate(${rnd(-20,20)}px,-${rnd(30,70)}px) scale(1)`,opacity:1,offset:.3},{transform:`translate(${rnd(-40,40)}px,-${rnd(110,200)}px) scale(.3)`,opacity:0}],{duration:rnd(900,1400)*k,delay:HIT+rnd(300,700)*k,easing:'ease-out'});}
  
  setTimeout(()=>{arena?.animate([{transform:'scale(1)'},{transform:'scale(1.035)',offset:.15},{transform:'scale(1)'}],{duration:520*k,easing:'ease-out',composite:'add'});arena?.classList.add('af-shake');target.classList.add('af-struck');document.body.classList.add('af-hitstop');setTimeout(()=>document.body.classList.remove('af-hitstop'),110*k);setTimeout(()=>{arena?.classList.remove('af-shake');target.classList.remove('af-struck');},620*k);},HIT);
  setTimeout(()=>{for(const o of others){o.classList.add('af-struck','is-wave');setTimeout(()=>o.classList.remove('af-struck','is-wave'),520*k);}},HIT+200*k);}
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='ultrafragor'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-ultrafragor');if(!actor)return;
   const hits=[...document.querySelectorAll('.ultrafragor-hit')],main=document.querySelector('.story-battle [data-story-target="'+storyImpact.ultraTarget+'"],.story-battle [data-infinity-target="'+storyImpact.ultraTarget+'"],.story-battle [data-duel-target="'+storyImpact.ultraTarget+'"]'),target=(main&&(main.closest('.ultrafragor-hit')||main.parentElement))||hits[0]||null;if(!target)return;played.add(storyImpact);
   if(typeof reducedMotion==='function'&&reducedMotion()){sfx();return;}run(actor,target,hits.filter(h=>h!==target));}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"aizen-ultrafragor.js");}

/* garp-galaxy.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
  const fxN=n=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760?Math.ceil(n*.55):n;}catch{return n;}};
 if(typeof document==='undefined')return;
 const played=new WeakSet();let audio=null;
 function sfx(){try{if(typeof state!=='undefined'&&state.sound===false)return;audio=audio||new Audio('https://yurocollection.fr/assets/garp-galaxy-impact-v3.mp3');const a=audio.cloneNode();a.volume=.5;a.play().catch(()=>{});}catch{}}
  
  
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
  
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('ggLayer')||document.createElement('div');L.id='ggLayer';L.className='gg-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 
 function starfield(W,H){const s=[];for(let i=0;i<fxN(150);i++){const c=Math.random()<.12?['#ffd27a','#9fc6ff','#ff9fd0'][i%3]:'#fff';s.push(`${Math.round(rnd(0,W))}px ${Math.round(rnd(0,H))}px 0 ${Math.random()<.15?1:0}px ${c}`);}return s.join(',');}
 function run(actor,target){const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rect(actor),T=rect(target),arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena'),R=Math.max(T.w,T.h),W=innerWidth,H=innerHeight,HIT=4980*k,END=6650*k;
  const dx=T.cx-A.cx,dy=(T.cy+T.h*.5)-A.cy;
  
  go(el('gg-dark'),[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.5},{opacity:0}],{duration:END,easing:'ease-out'});
  go(el('gg-aura',`left:${A.cx}px;top:${A.cy}px;width:${A.w*2}px;height:${A.h*1.6}px`),[{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{transform:'translate(-50%,-50%) scale(1.05)',opacity:1,offset:.55},{transform:'translate(-50%,-50%) scale(1.3)',opacity:0}],{duration:900*k,easing:'ease-out'});
  for(let i=0;i<fxN(12);i++){go(el('gg-rise',`left:${A.x+Math.random()*A.w}px;top:${A.y+A.h*rnd(.35,1)}px`),[{transform:'translateY(0) scaleY(.4)',opacity:0},{transform:`translateY(-${rnd(40,100)}px) scaleY(1)`,opacity:1,offset:.5},{transform:`translateY(-${rnd(120,180)}px) scaleY(.5)`,opacity:0}],{duration:rnd(420,640)*k,delay:rnd(0,380)*k,easing:'ease-out'});}
  
  const space=el('gg-space');go(space,[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.78},{opacity:0}],{duration:1750*k,delay:200*k,easing:'ease-in-out'});
  const stars=el('gg-stars',`box-shadow:${starfield(W,H)}`);go(stars,[{transform:'scale(1)',opacity:0},{transform:'scale(1.04)',opacity:1,offset:.15},{transform:'scale(1.18)',opacity:1,offset:.8},{transform:'scale(1.25)',opacity:0}],{duration:1750*k,delay:200*k,easing:'linear'});
  for(let i=0;i<3;i++){const gx=W*[.2,.72,.5][i],gy=H*[.3,.62,.18][i],sz=Math.min(W,H)*rnd(.18,.3);go(el('gg-galaxy',`left:${gx}px;top:${gy}px;width:${sz}px;height:${sz*.45}px;--rot:${rnd(-40,40)}deg`),[{transform:`translate(-50%,-50%) rotate(var(--rot)) scale(.6)`,opacity:0},{transform:`translate(-50%,-50%) rotate(calc(var(--rot) + 8deg)) scale(1)`,opacity:.9,offset:.3},{transform:`translate(-50%,-50%) rotate(calc(var(--rot) + 20deg)) scale(1.2)`,opacity:0}],{duration:1550*k,delay:(250+i*90)*k,easing:'ease-out'});}
  for(let i=0;i<5;i++){const fx=i===0?W/2:rnd(W*.1,W*.9),fy=i===0?H/2:rnd(H*.15,H*.85),sz=i===0?Math.min(W,H)*.55:rnd(60,150);go(el('gg-flare',`left:${fx}px;top:${fy}px;width:${sz}px;height:${sz}px`),[{transform:'translate(-50%,-50%) scale(0) rotate(0)',opacity:0},{transform:'translate(-50%,-50%) scale(1) rotate(8deg)',opacity:1,offset:.35},{transform:'translate(-50%,-50%) scale(.4) rotate(18deg)',opacity:0}],{duration:rnd(600,800)*k,delay:(300+i*260)*k,easing:'cubic-bezier(.2,.8,.3,1)'});}
  for(let i=0;i<fxN(9);i++){const ang=rnd(-60,-25)+(i%2?180:0),thick=rnd(3,i<3?26:9),y=rnd(-H*.2,H*1.2);go(el('gg-beam'+(i%3===0?' is-red':''),`left:${-W*.2}px;top:${y}px;width:${W*1.6}px;height:${thick}px;--a:${ang}deg`),[{transform:'rotate(var(--a)) scaleX(0)',opacity:0},{transform:'rotate(var(--a)) scaleX(1)',opacity:1,offset:.3},{transform:'rotate(var(--a)) scaleX(1) translateY(10px)',opacity:0}],{duration:rnd(380,560)*k,delay:(1150+i*80)*k,easing:'cubic-bezier(.2,.8,.3,1)'});}
  const word=(text,cls,delay,dur)=>go(el('gg-word '+cls,'', 'b'),[{transform:'translate(-50%,-50%) scale(1.25)',opacity:0,letterSpacing:'.5em'},{transform:'translate(-50%,-50%) scale(1)',opacity:1,letterSpacing:'.18em',offset:.2},{transform:'translate(-50%,-50%) scale(.98)',opacity:1,offset:.75},{transform:'translate(-50%,-50%) scale(1.06)',opacity:0}],{duration:dur*k,delay:delay*k,easing:'ease-out'}).effect.target.textContent=text;
  word('GALAXY…','is-galaxy',150,1600);word('…IMPACT !','is-impact',1750,3200);
  
  const art=(actor.querySelector('img')?.currentSrc||actor.querySelector('img')?.src||'').replace(/"/g,'%22');
  if(art){const ci=el('gg-cutin',`--art:url("${art}")`);go(ci,[{transform:'translateX(-110%) skewX(-12deg)',opacity:1},{transform:'translateX(0) skewX(-12deg)',opacity:1,offset:.18},{transform:'translateX(3%) skewX(-12deg)',opacity:1,offset:.78},{transform:'translateX(110%) skewX(-12deg)',opacity:0}],{duration:1150*k,delay:60*k,easing:'cubic-bezier(.2,.8,.3,1)'});
   const ci2=el('gg-cutin2',`--art:url("${art}")`);go(ci2,[{transform:'translate(-50%,-50%) scale(.55)',opacity:0,filter:'brightness(1)'},{transform:'translate(-50%,-50%) scale(1)',opacity:1,filter:'brightness(1.15)',offset:.2},{transform:'translate(-50%,-50%) scale(1.5)',opacity:1,filter:'brightness(1.8)',offset:.85},{transform:'translate(-50%,-50%) scale(2.4)',opacity:0,filter:'brightness(3)'}],{duration:(HIT-1800*k)+60*k,delay:1800*k,easing:'cubic-bezier(.5,0,.9,.6)'});}
  
  go(el('gg-speed'),[{transform:'translate(-50%,-50%) rotate(0deg) scale(1.1)',opacity:0},{transform:'translate(-50%,-50%) rotate(4deg) scale(1)',opacity:.9,offset:.15},{transform:'translate(-50%,-50%) rotate(9deg) scale(.92)',opacity:.9,offset:.85},{transform:'translate(-50%,-50%) rotate(12deg) scale(.85)',opacity:0}],{duration:(HIT-1750*k),delay:1750*k,easing:'linear'});
  go(el('gg-speed is-gold'),[{transform:'translate(-50%,-50%) rotate(3deg) scale(1.2)',opacity:0},{transform:'translate(-50%,-50%) rotate(-3deg) scale(1)',opacity:.7,offset:.2},{transform:'translate(-50%,-50%) rotate(-8deg) scale(.9)',opacity:0}],{duration:(HIT-3000*k),delay:3000*k,easing:'linear'});
  
  go(el('gg-nebula',`left:${W/2}px;top:${H/2}px;width:${Math.max(W,H)*1.1}px;height:${Math.max(W,H)*1.1}px`),[{transform:'translate(-50%,-50%) rotate(0) scale(.9)',opacity:0},{transform:'translate(-50%,-50%) rotate(25deg) scale(1)',opacity:.75,offset:.3},{transform:'translate(-50%,-50%) rotate(60deg) scale(1.1)',opacity:0}],{duration:1750*k,delay:200*k,easing:'ease-in-out'});
  for(let i=0;i<3;i++){const sx=rnd(-W*.1,W*.3),sy=rnd(-H*.1,H*.3),ex=T.cx,ey=T.cy,cang=Math.atan2(ey-sy,ex-sx)*180/Math.PI,cl=Math.hypot(ex-sx,ey-sy);go(el('gg-comet',`left:${sx}px;top:${sy}px;width:${cl}px;--a:${cang}deg`),[{transform:'rotate(var(--a)) scaleX(0)',opacity:0},{transform:'rotate(var(--a)) scaleX(1)',opacity:1,offset:.5},{transform:'rotate(var(--a)) scaleX(1) translateX(30%)',opacity:0}],{duration:520*k,delay:(900+i*220)*k,easing:'cubic-bezier(.4,0,.6,1)'});}
  
  actor.classList.add('gg-actor');
  const an=actor.animate([
   {transform:'none',filter:'none',offset:0},
   {transform:'translateY(6px) scale(.96)',filter:'drop-shadow(0 0 18px #ffb12e) brightness(1.15)',offset:0.075},
   {transform:'translateY(10px) scale(.94) rotate(-2deg)',filter:'drop-shadow(0 0 30px #ffd66b) brightness(1.3)',offset:0.681},
   {transform:`translate(${dx*.9}px,${dy*.9}px) scale(1.16) rotate(2deg)`,filter:'drop-shadow(0 0 40px #fff6d0) brightness(1.8)',offset:0.74},
   {transform:`translate(${dx*.9}px,${dy*.9}px) scale(1.16) rotate(2deg)`,filter:'drop-shadow(0 0 40px #fff) brightness(2)',offset:0.767},
   {transform:`translate(${dx*.72}px,${dy*.72}px) scale(1.06)`,filter:'drop-shadow(0 0 24px #ffb12e)',offset:0.827},
   {transform:`translate(${dx*.68}px,${dy*.68}px) scale(1.05)`,filter:'drop-shadow(0 0 16px #ff8a1e)',offset:0.902},
   {transform:'none',filter:'none',offset:1}],{duration:END,easing:'linear'});
  an.onfinish=an.oncancel=()=>actor.classList.remove('gg-actor');
  

  {const img=actor.querySelector('img');if(img&&img.currentSrc||img?.src){const ghost=el('gg-ghost',`left:${A.x}px;top:${A.y}px;width:${A.w}px;height:${A.h}px;background-image:url("${String(img.currentSrc||img.src).replace(/"/g,'%22')}")`);const fr=an.effect.getKeyframes().map(f=>({transform:f.transform,filter:f.filter,offset:f.offset,opacity:1}));fr[0].opacity=0;fr.splice(1,0,{opacity:1,offset:.02,transform:fr[0].transform,filter:fr[0].filter});fr[fr.length-1].opacity=0;go(ghost,fr,{duration:END,easing:'linear'});}}
  sfx();
  
  const ang=Math.atan2(dy,dx)*180/Math.PI,len=Math.hypot(dx,dy);
  for(let i=0;i<fxN(8);i++)go(el('gg-streak',`left:${A.cx+rnd(-A.w*.4,A.w*.4)}px;top:${A.cy+rnd(-A.h*.3,A.h*.3)}px;width:${len*rnd(.6,1)}px`),[{transform:`rotate(${ang}deg) scaleX(0)`,opacity:0},{transform:`rotate(${ang}deg) scaleX(1)`,opacity:1,offset:.45},{transform:`rotate(${ang}deg) scaleX(1) translateX(${len*.3}px)`,opacity:0}],{duration:420*k,delay:(HIT-500*k)+rnd(0,140)*k,easing:'ease-out'});
  
  go(el('gg-glow'),[{opacity:0},{opacity:.35,offset:.45},{opacity:.9,offset:.92},{opacity:0}],{duration:HIT-1750*k+120*k,delay:1750*k,easing:'ease-in'});
  for(let i=0;i<fxN(8);i++){const a2=rnd(-60,-25)+(i%2?180:0);go(el('gg-beam'+(i%3===1?' is-red':''),`left:${-W*.2}px;top:${rnd(-H*.2,H*1.2)}px;width:${W*1.6}px;height:${rnd(3,14)}px;--a:${a2}deg`),[{transform:'rotate(var(--a)) scaleX(0)',opacity:0},{transform:'rotate(var(--a)) scaleX(1)',opacity:1,offset:.3},{transform:'rotate(var(--a)) scaleX(1) translateY(10px)',opacity:0}],{duration:rnd(380,520)*k,delay:(2000+i*350)*k,easing:'cubic-bezier(.2,.8,.3,1)'});}
  
  go(el('gg-white'),[{opacity:0},{opacity:1,offset:.08},{opacity:.9,offset:.3},{opacity:0}],{duration:620*k,delay:HIT,easing:'ease-out'});
  go(el('gg-sun',`left:${T.cx}px;top:${T.cy}px;width:${R*1.5}px;height:${R*1.5}px`),[{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.18},{transform:'translate(-50%,-50%) scale(1.15)',opacity:.9,offset:.55},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:1400*k,delay:HIT+60*k,easing:'cubic-bezier(.1,.8,.3,1)'});
  go(el('gg-saturn',`left:${T.cx}px;top:${T.cy}px;width:${R*3.2}px;height:${R*3.2}px`),[{transform:'translate(-50%,-50%) rotate(-14deg) scaleY(.22) scale(.2)',opacity:0},{transform:'translate(-50%,-50%) rotate(-14deg) scaleY(.22) scale(1)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) rotate(-14deg) scaleY(.22) scale(1.6)',opacity:0}],{duration:1300*k,delay:HIT+120*k,easing:'cubic-bezier(.1,.8,.3,1)'});
  go(el('gg-pillar',`left:${T.cx}px;bottom:${H-T.cy-T.h*.45}px;width:${T.w*.55}px;height:${H*1.1}px`),[{transform:'translateX(-50%) scaleX(.15) scaleY(0)',opacity:0},{transform:'translateX(-50%) scaleX(1) scaleY(1)',opacity:1,offset:.18},{transform:'translateX(-50%) scaleX(.7) scaleY(1)',opacity:.9,offset:.55},{transform:'translateX(-50%) scaleX(.1) scaleY(1)',opacity:0}],{duration:1500*k,delay:HIT+80*k,easing:'ease-out'});
  for(let i=0;i<3;i++)go(el('gg-ring'+(i===1?' thick':''),`left:${T.cx}px;top:${T.cy+T.h*.25}px;width:${R*2}px;height:${R*2}px`),[{transform:'translate(-50%,-50%) scaleY(.3) scale(.15)',opacity:0},{transform:'translate(-50%,-50%) scaleY(.3) scale(1)',opacity:1,offset:.2},{transform:`translate(-50%,-50%) scaleY(.3) scale(${3.4+i})`,opacity:0}],{duration:(1100+i*200)*k,delay:HIT+(140+i*170)*k,easing:'cubic-bezier(.15,.7,.3,1)'});
  go(el('gg-dome',`left:${T.cx}px;top:${T.cy+T.h*.35}px;width:${R*2.4}px;height:${R*1.6}px`),[{transform:'translate(-50%,-100%) scale(.2)',opacity:0},{transform:'translate(-50%,-100%) scale(1)',opacity:1,offset:.25},{transform:'translate(-50%,-100%) scale(1.25)',opacity:0}],{duration:1300*k,delay:HIT+260*k,easing:'ease-out'});
  for(let i=0;i<fxN(10);i++){const a=rnd(-Math.PI,Math.PI),d=rnd(R*.7,R*1.8);go(el('gg-dust',`left:${T.cx}px;top:${T.cy+T.h*.3}px;width:${rnd(R*.4,R*.8)}px;height:${rnd(R*.25,R*.45)}px`),[{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d*.5}px,${Math.sin(a)*d*.15}px) scale(1)`,opacity:.85,offset:.25},{transform:`translate(-50%,-50%) translate(${Math.cos(a)*d}px,${Math.sin(a)*d*.25-R*.3}px) scale(1.6)`,opacity:0}],{duration:rnd(1400,2000)*k,delay:HIT+rnd(80,200)*k,easing:'cubic-bezier(.1,.7,.3,1)'});}
  for(let i=0;i<fxN(18);i++){const a=rnd(-Math.PI,0),d=rnd(R*.6,R*2),sz=rnd(6,18),vx=Math.cos(a)*d,up=Math.abs(Math.sin(a))*d*rnd(.8,1.3);go(el('gg-rock',`left:${T.cx}px;top:${T.cy+T.h*.2}px;width:${sz}px;height:${sz*rnd(.7,1)}px`),[{transform:'translate(-50%,-50%) rotate(0)',opacity:1},{transform:`translate(-50%,-50%) translate(${vx*.5}px,${-up}px) rotate(${rnd(-300,300)}deg)`,opacity:1,offset:.45},{transform:`translate(-50%,-50%) translate(${vx}px,${R*rnd(.2,.6)}px) rotate(${rnd(-600,600)}deg)`,opacity:0}],{duration:rnd(1000,1500)*k,delay:HIT+rnd(0,100)*k,easing:'cubic-bezier(.25,.4,.6,1)'});}
  for(let i=0;i<fxN(22);i++)go(el('gg-ember',`left:${T.cx+rnd(-R,R)}px;top:${T.cy+rnd(-R*.3,R*.4)}px`),[{transform:'translateY(0) scale(1)',opacity:0},{transform:`translate(${rnd(-20,20)}px,-${rnd(30,80)}px) scale(1)`,opacity:1,offset:.3},{transform:`translate(${rnd(-40,40)}px,-${rnd(120,220)}px) scale(.3)`,opacity:0}],{duration:rnd(900,1500)*k,delay:HIT+rnd(250,750)*k,easing:'ease-out'});
  
  for(let i=0;i<4;i++){const h=H*rnd(.55,.95),pts=[];let x=0;for(let y=0;y<=h;y+=h/9){pts.push(x.toFixed(1)+','+(-y).toFixed(1));x+=rnd(-T.w*.18,T.w*.18);}const bolt=el('gg-bolt',`left:${T.cx+rnd(-T.w*.2,T.w*.2)}px;top:${T.cy+T.h*.3}px`);bolt.innerHTML=`<svg width="1" height="1"><polyline points="${pts.join(' ')}"/></svg>`;go(bolt,[{opacity:0},{opacity:1,offset:.1},{opacity:.2,offset:.25},{opacity:1,offset:.4},{opacity:0,offset:.55},{opacity:.8,offset:.7},{opacity:0}],{duration:rnd(520,760)*k,delay:HIT+rnd(120,500)*k,easing:'steps(1,end)'});}
  go(el('gg-bands',`top:${T.cy+T.h*.15}px;height:${R*.7}px`),[{transform:'translateY(-50%) scaleX(.05) scaleY(.4)',opacity:0},{transform:'translateY(-50%) scaleX(1) scaleY(1)',opacity:1,offset:.25},{transform:'translateY(-50%) scaleX(1.1) scaleY(.15)',opacity:0}],{duration:1100*k,delay:HIT+420*k,easing:'cubic-bezier(.15,.7,.3,1)'});
  go(el('gg-ring huge',`left:${T.cx}px;top:${T.cy+T.h*.25}px;width:${Math.max(W,H)}px;height:${Math.max(W,H)}px`),[{transform:'translate(-50%,-50%) scaleY(.32) scale(.1)',opacity:0},{transform:'translate(-50%,-50%) scaleY(.32) scale(.6)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scaleY(.32) scale(2.2)',opacity:0}],{duration:1500*k,delay:HIT+380*k,easing:'cubic-bezier(.15,.7,.3,1)'});
  go(el('gg-tint'),[{opacity:0},{opacity:.55,offset:.15},{opacity:0}],{duration:1500*k,delay:HIT+300*k,easing:'ease-out'});
  
  for(let i=0;i<fxN(6);i++)go(el('gg-smoke',`left:${T.cx+rnd(-R*.8,R*.8)}px;top:${T.cy+T.h*.3}px;width:${rnd(R*.6,R*1.1)}px;height:${rnd(R*.5,R*.8)}px`),[{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:`translate(-50%,-70%) translate(${rnd(-30,30)}px,-${rnd(20,50)}px) scale(1)`,opacity:.7,offset:.3},{transform:`translate(-50%,-90%) translate(${rnd(-60,60)}px,-${rnd(80,140)}px) scale(1.5)`,opacity:0}],{duration:rnd(1400,1700)*k,delay:HIT+rnd(300,600)*k,easing:'ease-out'});
  
  setTimeout(()=>{arena?.animate([{transform:'scale(1)'},{transform:'scale(1.05)',offset:.12},{transform:'scale(1)'}],{duration:600*k,easing:'ease-out',composite:'add'});arena?.classList.add('gg-shake');target.classList.add('gg-struck');document.body.classList.add('gg-hitstop');setTimeout(()=>document.body.classList.remove('gg-hitstop'),140*k);setTimeout(()=>{arena?.classList.remove('gg-shake');target.classList.remove('gg-struck');},760*k);},HIT);}
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='galaxy'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-galaxy');if(!actor)return;
   const main=document.querySelector('.story-battle [data-story-target="'+storyImpact.galaxyTarget+'"],.story-battle [data-infinity-target="'+storyImpact.galaxyTarget+'"],.story-battle [data-duel-target="'+storyImpact.galaxyTarget+'"]'),target=(main&&(main.closest('.galaxy-hit')||main.parentElement))||document.querySelector('.galaxy-hit');if(!target)return;played.add(storyImpact);
   if(typeof reducedMotion==='function'&&reducedMotion()){sfx();return;}run(actor,target);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"garp-galaxy.js");}

/* boros-cannon.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const fxN=n=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760?Math.ceil(n*.55):n;}catch{return n;}};
 const played=new WeakSet();
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('bcLayer')||document.createElement('div');L.id='bcLayer';L.className='bc-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 
 const SFX={};function sfx(name){try{if(typeof state!=='undefined'&&state.sound===false)return;SFX[name]=SFX[name]||new Audio('https://yurocollection.fr/assets/boros-meteoric-'+name+'.mp3');const a=SFX[name].cloneNode();a.volume=.5;a.play().catch(()=>{});}catch{}}
 function speed(){return 1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1);}
 function shake(arena,k,ms=700){if(!arena)return;arena.classList.add('bc-shake');setTimeout(()=>arena.classList.remove('bc-shake'),ms*k);}

 
 
 function energyBeam(ox,oy,len,width,ang,dur){const dpr=Math.min(2,devicePixelRatio||1),pad=width*.35,H=width+pad*2,cv=document.createElement('canvas');cv.className='bc-energy-beam';const PX=width*.7;cv.width=Math.ceil((len+PX)*dpr);cv.height=Math.ceil(H*dpr);
  cv.style.cssText=`left:${ox}px;top:${oy}px;width:${len+PX}px;height:${H}px;margin:${-H/2}px 0 0 ${-PX}px;transform-origin:${PX}px 50%;transform:rotate(${ang}deg);opacity:1`;layer().append(cv);
  const g=cv.getContext('2d');g.scale(dpr,dpr);g.translate(PX,0);const mid=H/2,t0=performance.now(),ph0=Math.random()*100;
  const streaks=Array.from({length:fxN(46)},()=>({v:Math.random()*2-1,sp:rnd(1.4,3.2),off:Math.random(),l:rnd(.06,.2),w:rnd(1,3)})),rings=Array.from({length:5},(_,i)=>({off:i/5}));
  let bolts=[],boltAt=0;
  
  const half=(x,side,ph,scale)=>{const u=x/len,flare=1-Math.pow(1-Math.min(1,u/.14),2.2);return (width/2)*scale*flare*(1+.05*Math.sin(x*.045-ph*1.7+side*1.3)+.035*Math.sin(x*.11-ph*2.9+side*4)+.02*Math.sin(x*.27-ph*4.1));};
  const shape=(vis,ph,scale)=>{g.beginPath();g.moveTo(0,mid);for(let x=0;x<=vis;x+=6)g.lineTo(x,mid-half(x,1,ph,scale));for(let x=vis;x>=0;x-=6)g.lineTo(x,mid+half(x,-1,ph,scale));g.closePath();};
  function frame(now){const t=(now-t0)/dur;if(t>=1||!cv.isConnected){cv.remove();return;}
   const grow=Math.min(1,t/.13),vis=len*(1-Math.pow(1-grow,3)),thin=t<.72?1:Math.max(0,1-(t-.72)/.28),sc=(.55+.45*Math.min(1,t/.2))*(.25+.75*thin),ph=ph0+now/90;g.clearRect(-PX,0,len+PX,H);g.globalAlpha=Math.min(1,thin*1.6);g.globalCompositeOperation='lighter';
   
   g.save();g.shadowColor='#1e6bff';g.shadowBlur=34;shape(vis,ph,1.08*sc);g.fillStyle='rgba(30,90,255,.55)';g.fill();g.restore();
   shape(vis,ph+3,sc);let gr=g.createLinearGradient(0,mid-width/2*sc,0,mid+width/2*sc);gr.addColorStop(0,'rgba(40,120,255,.0)');gr.addColorStop(.12,'rgba(60,170,255,.85)');gr.addColorStop(.3,'rgba(120,235,255,.95)');gr.addColorStop(.5,'#ffffff');gr.addColorStop(.7,'rgba(120,235,255,.95)');gr.addColorStop(.88,'rgba(60,170,255,.85)');gr.addColorStop(1,'rgba(40,120,255,0)');g.fillStyle=gr;g.fill();
   shape(vis,ph*1.6+7,.42*sc);g.fillStyle='rgba(255,255,255,.95)';g.fill();
   
   g.save();shape(vis,ph,sc);g.clip();for(const s of streaks){const x=((s.off+(now-t0)/1000*s.sp)%1)*len,y=mid+s.v*half(Math.max(20,x),1,ph,sc)*.92;if(x>vis)continue;g.strokeStyle=Math.abs(s.v)<.45?'rgba(255,255,255,.9)':'rgba(170,240,255,.8)';g.lineWidth=s.w;g.beginPath();g.moveTo(x,y);g.lineTo(Math.max(0,x-len*s.l),y);g.stroke();}g.restore();
   
   for(const r of rings){const u=(r.off+(now-t0)/1000*1.1)%1,x=u*len;if(x>vis||u<.04)continue;const ry=half(x,1,ph,sc)*1.22,rx=Math.max(4,ry*.16);g.strokeStyle='rgba(190,245,255,'+(.75*(1-u))+')';g.lineWidth=3*(1-u)+1;g.beginPath();g.ellipse(x,mid,rx,ry,0,0,7);g.stroke();}
   
   if(now>boltAt){boltAt=now+70;bolts=Array.from({length:fxN(6)},()=>{const side=Math.random()<.5?1:-1,x0=rnd(.05,.85)*vis,n=7,pts=[];for(let j=0;j<=n;j++){const x=x0+j*rnd(14,34);pts.push([x,mid-side*(half(Math.min(len,x),side,ph,sc)*rnd(.95,1.35))+rnd(-8,8)]);}return pts;});}
   g.strokeStyle='rgba(220,250,255,.95)';g.lineWidth=1.8;g.shadowColor='#5fd0ff';g.shadowBlur=10;for(const b of bolts){g.beginPath();b.forEach((q,j)=>j?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();}g.shadowBlur=0;
   
   const mz=g.createRadialGradient(0,mid,0,0,mid,width*.55*sc);mz.addColorStop(0,'#fff');mz.addColorStop(.35,'rgba(150,235,255,.9)');mz.addColorStop(1,'rgba(40,120,255,0)');g.fillStyle=mz;g.beginPath();g.arc(0,mid,width*.55*sc,0,7);g.fill();
   g.globalCompositeOperation='source-over';requestAnimationFrame(frame);}
  requestAnimationFrame(frame);}

 function cannon(actor,targets,burst){sfx('cannon');const k=speed(),A=rect(actor),W=innerWidth,H=innerHeight,HIT=2600*k,arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  const rs=targets.map(rect),row=rs.length?{cx:rs.reduce((n,r)=>n+r.cx,0)/rs.length,cy:rs.reduce((n,r)=>n+r.cy,0)/rs.length,w:Math.max(...rs.map(r=>r.x+r.w))-Math.min(...rs.map(r=>r.x)),h:Math.max(...rs.map(r=>r.h))}:{cx:W/2,cy:H*.25,w:W*.6,h:H*.2};
  const ox=A.cx,oy=A.cy-A.h*.1,ang=Math.atan2(row.cy-oy,row.cx-ox)*180/Math.PI,len=Math.hypot(W,H)*1.4,R=Math.min(A.w,A.h),thick=Math.max(row.w*.95,row.h*(burst?1.3:1.1),R*1.2);
  layer().classList.toggle('is-burst',!!burst);
  go(el('bc-dark'),[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.8},{opacity:0}],{duration:4400*k,easing:'ease-in-out'});
  
  const t=el('bc-title','','div');t.innerHTML='<small>崩星咆哮砲</small><b>COLLAPSING STAR</b><b class="bc-t2">ROARING CANNON</b>'+(burst?'<em>METEORIC BURST · 200 % / 90 %</em>':'');go(t,[{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.12},{opacity:1,transform:'translate(-50%,-50%) scale(1.02)',offset:.7},{opacity:0,transform:'translate(-50%,-50%) scale(1.1)'}],{duration:2300*k,delay:150*k,easing:'ease-out'});
  
  const orb=el('bc-orb',`left:${ox}px;top:${oy}px;width:${R*1.6}px;height:${R*1.6}px`);go(orb,[{transform:'translate(-50%,-50%) scale(.05)',opacity:0},{transform:'translate(-50%,-50%) scale(.6)',opacity:1,offset:.3},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.85},{transform:'translate(-50%,-50%) scale(1.25)',opacity:1,offset:.93},{transform:'translate(-50%,-50%) scale(.4)',opacity:0}],{duration:HIT+500*k,delay:200*k,easing:'ease-in'});
  for(let i=0;i<4;i++)go(el('bc-ring',`left:${ox}px;top:${oy}px;width:${R*3}px;height:${R*3}px`),[{transform:'translate(-50%,-50%) scale(1.2)',opacity:0},{transform:'translate(-50%,-50%) scale(.9)',opacity:.9,offset:.3},{transform:'translate(-50%,-50%) scale(.1)',opacity:0}],{duration:620*k,delay:(450+i*430)*k,easing:'ease-in'});
  for(let i=0;i<fxN(36);i++){const a=rnd(0,Math.PI*2),d=rnd(R*1.4,R*3.2);go(el('bc-mote',`left:${ox}px;top:${oy}px`),[{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(1)`,opacity:0},{opacity:1,offset:.3},{transform:'translate(0,0) scale(.2)',opacity:0}],{duration:rnd(500,800)*k,delay:rnd(300,HIT/k-500)*k,easing:'ease-in'});}
  for(let i=0;i<fxN(6);i++){const a=rnd(0,360);go(el('bc-arc',`left:${ox}px;top:${oy}px;width:${R*rnd(1.2,2)}px;--a:${a}deg`),[{opacity:0},{opacity:1,offset:.1},{opacity:0,offset:.3},{opacity:1,offset:.5},{opacity:0}],{duration:rnd(300,500)*k,delay:rnd(900,HIT/k-300)*k,easing:'steps(1,end)'});}
  
  setTimeout(()=>energyBeam(ox,oy,Math.hypot(W,H),thick,ang,1650*k),HIT-220*k);
  go(el('bc-muzzle',`left:${ox}px;top:${oy}px;width:${R*2.4}px;height:${R*2.4}px`),[{transform:'translate(-50%,-50%) scale(.3)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.15},{transform:'translate(-50%,-50%) scale(1.3)',opacity:0}],{duration:1300*k,delay:HIT-200*k,easing:'ease-out'});
  
  go(el('bc-flash'),[{opacity:0},{opacity:.7,offset:.08},{opacity:0}],{duration:700*k,delay:HIT,easing:'ease-out'});
  rs.forEach((r,i)=>{go(el('bc-blast',`left:${r.cx}px;top:${r.cy}px;width:${Math.max(r.w,r.h)*1.6}px;height:${Math.max(r.w,r.h)*1.6}px`),[{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.2},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:1100*k,delay:HIT+i*60*k,easing:'ease-out'});
   for(let j=0;j<fxN(4);j++)go(el('bc-smoke',`left:${r.cx+rnd(-r.w*.4,r.w*.4)}px;top:${r.cy+rnd(-r.h*.2,r.h*.3)}px;width:${r.w*rnd(.6,1)}px;height:${r.w*rnd(.5,.8)}px`),[{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:`translate(-50%,-60%) translate(${rnd(-20,20)}px,-${rnd(10,30)}px) scale(1)`,opacity:.7,offset:.3},{transform:`translate(-50%,-80%) translate(${rnd(-40,40)}px,-${rnd(50,90)}px) scale(1.4)`,opacity:0}],{duration:rnd(1200,1500)*k,delay:HIT+rnd(200,500)*k,easing:'ease-out'});});
  setTimeout(()=>{shake(arena,k,800);targets.forEach(t=>t.classList.add('bc-struck'));setTimeout(()=>targets.forEach(t=>t.classList.remove('bc-struck')),800*k);},HIT);
  setTimeout(()=>layer().classList.remove('is-burst'),4600*k);}

 
 
 
 
 let holdStyle=null;
 function holdOldImage(actor){const id=actor.dataset.fighterId||actor.closest('[data-fighter-id]')?.dataset.fighterId;if(id===undefined)return;let old='';try{const c=typeof cardById==='function'?cardById(Number(id)):null;old=c?.image||'';}catch{}
  if(!holdStyle){holdStyle=document.createElement('style');document.head.append(holdStyle);}const sel='.story-battle [data-fighter-id="'+CSS.escape(String(id))+'"]';
  holdStyle.textContent=(old?sel+' img{content:url("'+old.replace(/["\\]/g,'')+'")}':sel+' img{opacity:0}')+sel+' img{filter:brightness(.45) saturate(.4)}';}
 function showNewImage(){if(holdStyle)holdStyle.textContent='';}
 function meteoric(actor,heal,delay=0){if(delay>0){actor.classList.add('bc-rising');holdOldImage(actor);setTimeout(()=>{if(actor.isConnected)meteoric(actor,heal);else{actor.classList.remove('bc-rising');showNewImage(actor);}},delay);return;}
  sfx('rise');
  const k=speed(),A=rect(actor),R=Math.max(A.w,A.h),FLASH=1500*k,arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');actor.classList.add('bc-rising');
  go(el('bc-dark is-violet'),[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.8},{opacity:0}],{duration:3400*k,easing:'ease-in-out'});
  
  const domeW=R*1.35,ball=el('bc-ball',`left:${A.cx}px;top:${A.cy}px;width:${domeW}px;height:${domeW}px`);
  go(ball,[{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:'translate(-50%,-50%) scale(.75)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(.95)',opacity:1,offset:.5},{transform:'translate(-50%,-50%) scale(.88)',opacity:1,offset:.62},{transform:'translate(-50%,-50%) scale(1.02)',opacity:1,offset:.78},{transform:'translate(-50%,-50%) scale(.96)',opacity:1,offset:.9},{transform:'translate(-50%,-50%) scale(1.25)',opacity:0}],{duration:FLASH+250*k,easing:'ease-out'});
  go(el('bc-ball-rim',`left:${A.cx}px;top:${A.cy}px;width:${domeW}px;height:${domeW}px`),[{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:'translate(-50%,-50%) scale(.75)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(.95)',opacity:1,offset:.5},{transform:'translate(-50%,-50%) scale(.88)',opacity:1,offset:.62},{transform:'translate(-50%,-50%) scale(1.02)',opacity:1,offset:.78},{transform:'translate(-50%,-50%) scale(.96)',opacity:1,offset:.9},{transform:'translate(-50%,-50%) scale(1.25)',opacity:0}],{duration:FLASH+250*k,easing:'ease-out'});
  for(let i=0;i<fxN(24);i++){const a=rnd(0,Math.PI*2),d=domeW*rnd(.7,1.2);go(el('bc-mote is-pink',`left:${A.cx}px;top:${A.cy}px`),[{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`,opacity:0},{opacity:1,offset:.3},{transform:`translate(${Math.cos(a)*domeW*.45}px,${Math.sin(a)*domeW*.45}px) scale(.3)`,opacity:0}],{duration:rnd(450,700)*k,delay:rnd(200,FLASH/k-400)*k,easing:'ease-in'});}
  
  for(let i=0;i<fxN(5);i++){const x0=A.cx+rnd(-domeW*.6,domeW*.6),y0=A.y-R*rnd(.3,.7),x1=A.cx+rnd(-domeW*.3,domeW*.3),y1=A.cy-domeW*.45;let pts=`${x0},${y0}`;for(let j=1;j<=6;j++){const t=j/6;pts+=` ${x0+(x1-x0)*t+rnd(-R*.12,R*.12)},${y0+(y1-y0)*t}`;}
   const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');sv.setAttribute('class','bc-bolt');sv.setAttribute('width',innerWidth);sv.setAttribute('height',innerHeight);sv.innerHTML=`<polyline points="${pts}"/>`;layer().append(sv);
   go(sv,[{opacity:0},{opacity:1,offset:.05},{opacity:.2,offset:.3},{opacity:1,offset:.45},{opacity:0}],{duration:rnd(380,600)*k,delay:rnd(450,FLASH/k-200)*k,easing:'steps(1,end)'});}
  
  go(el('bc-flash is-violet'),[{opacity:0},{opacity:1,offset:.12},{opacity:0}],{duration:900*k,delay:FLASH-80*k,easing:'ease-out'});
  holdOldImage(actor);setTimeout(()=>{showNewImage(actor);actor.classList.remove('bc-rising');actor.classList.add('bc-risen');setTimeout(()=>actor.classList.remove('bc-risen'),1700*k);shake(arena,k,600);},FLASH);
  
  const spikes=fxN(26);for(let i=0;i<spikes;i++){const ang=(i/spikes)*360+rnd(-6,6),len=R*rnd(.55,1.05),w=R*rnd(.09,.16);
   go(el('bc-spike',`left:${A.cx}px;top:${A.cy}px;width:${w}px;height:${len}px;margin:${-len}px 0 0 ${-w/2}px;--a:${ang}deg`),[{transform:'rotate(var(--a)) scaleY(.1)',opacity:0},{transform:'rotate(var(--a)) scaleY(1.1)',opacity:1,offset:.18},{transform:'rotate(var(--a)) scaleY(.85)',opacity:.9,offset:.5},{transform:'rotate(var(--a)) scaleY(1)',opacity:1,offset:.75},{transform:'rotate(var(--a)) scaleY(.3)',opacity:0}],{duration:rnd(1300,1700)*k,delay:FLASH+rnd(0,160)*k,easing:'ease-out'});}
  go(el('bc-aura is-violet',`left:${A.cx}px;top:${A.cy}px;width:${R*1.5}px;height:${R*1.6}px`),[{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:'translate(-50%,-50%) scale(1.1)',opacity:1,offset:.2},{transform:'translate(-50%,-50%) scale(1)',opacity:.9,offset:.7},{transform:'translate(-50%,-50%) scale(1.3)',opacity:0}],{duration:1800*k,delay:FLASH,easing:'ease-out'});
  go(el('bc-shock is-violet',`left:${A.cx}px;top:${A.cy}px;width:${R*3.2}px;height:${R*3.2}px`),[{transform:'translate(-50%,-50%) scale(.1)',opacity:1},{transform:'translate(-50%,-50%) scale(1.3)',opacity:0}],{duration:900*k,delay:FLASH,easing:'ease-out'});
  const t=el('bc-title is-violet','','div');t.innerHTML='<small>流星の如き爆発</small><b>METEORIC</b><b class="bc-t2">BURST</b><em>Revient à la vie avec 60 % de ses PV</em>';go(t,[{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.15},{opacity:1,offset:.8},{opacity:0,transform:'translate(-50%,-50%) scale(1.08)'}],{duration:1900*k,delay:FLASH+100*k,easing:'ease-out'});}

 
 
 function flameCone(ox,oy,len,spread,ang,dur){const dpr=Math.min(2,devicePixelRatio||1),pad=spread*.4,H=spread+pad*2,PX=spread*.5,cv=document.createElement('canvas');cv.className='bc-flame-cone';cv.width=Math.ceil((len+PX)*dpr);cv.height=Math.ceil(H*dpr);
  cv.style.cssText=`left:${ox}px;top:${oy}px;width:${len+PX}px;height:${H}px;margin:${-H/2}px 0 0 ${-PX}px;transform-origin:${PX}px 50%;transform:rotate(${ang}deg);opacity:1`;layer().append(cv);
  const g=cv.getContext('2d');g.scale(dpr,dpr);g.translate(PX,0);const mid=H/2,t0=performance.now(),sd=Array.from({length:40},()=>Math.random());
  const streaks=Array.from({length:fxN(40)},()=>({v:Math.random()*2-1,sp:rnd(1.2,2.8),off:Math.random(),l:rnd(.05,.16),w:rnd(1,2.6)})),grains=Array.from({length:fxN(320)},()=>({u:Math.random(),v:Math.random()*2-1,s:rnd(.8,2.4),c:Math.random(),sp:rnd(.2,.7)})),embers=Array.from({length:fxN(60)},()=>({u:Math.random(),side:Math.random()<.5?1:-1,d:rnd(1,1.5),s:rnd(1,2.6),sp:rnd(.15,.5)}));
  let bolts=[],boltAt=0;
  
  const half=(x,side,ph,scale,flame)=>{const u=Math.max(0,x/len),base=Math.pow(u,.9)*spread/2*scale;if(!flame||u<.12)return base;const k=(u-.12)/.88,n1=9,n2=17,f1=((u*n1-ph*.55+(side>0?.0:.47))%1+1)%1,f2=((u*n2-ph*.9+(side>0?.31:.83))%1+1)%1,i1=Math.floor(u*n1-ph*.55+(side>0?0:.47)),a1=spread*.17*k*(.45+sd[((i1%40)+40)%40]);return base+flame*(a1*Math.pow(f1,2.4)+spread*.06*k*Math.pow(f2,2))-flame*a1*.25;};
  const shape=(vis,ph,scale,flame)=>{g.beginPath();g.moveTo(0,mid);for(let x=0;x<=vis;x+=3)g.lineTo(x,mid-half(x,1,ph,scale,flame));for(let x=vis;x>=0;x-=3)g.lineTo(x,mid+half(x,-1,ph,scale,flame));g.closePath();};
  function frame(now){const t=(now-t0)/dur;if(t>=1||!cv.isConnected){cv.remove();return;}
   const el=(now-t0)/1000,grow=Math.min(1,t/.16),vis=len*(1-Math.pow(1-grow,3)),thin=t<.72?1:Math.max(0,1-(t-.72)/.28),sc=(.5+.5*Math.min(1,t/.22))*(.3+.7*thin),ph=now/110;g.clearRect(-PX,0,len+PX,H);g.globalAlpha=Math.min(1,thin*1.6);g.globalCompositeOperation='lighter';
   
   g.save();g.shadowColor='#ff7a00';g.shadowBlur=30;shape(vis,ph,sc*1.04,1.15);g.fillStyle='rgba(255,120,0,.5)';g.fill();g.restore();
   g.globalCompositeOperation='source-over';shape(vis,ph,sc,1);let gr=g.createLinearGradient(0,0,len,0);gr.addColorStop(0,'rgba(255,225,160,.9)');gr.addColorStop(.35,'rgba(255,180,40,.85)');gr.addColorStop(1,'rgba(255,120,10,.85)');g.fillStyle=gr;g.fill();
   shape(vis,ph+.06,sc*.95,.86);gr=g.createLinearGradient(0,mid-spread/2*sc,0,mid+spread/2*sc);gr.addColorStop(0,'#ff86d6');gr.addColorStop(.22,'#ffc4ec');gr.addColorStop(.5,'#fff6fc');gr.addColorStop(.78,'#ffc4ec');gr.addColorStop(1,'#ff86d6');g.fillStyle=gr;g.fill();
   shape(vis,ph*1.4+2,sc*.5,.2);g.fillStyle='rgba(255,255,255,.92)';g.fill();g.globalCompositeOperation='lighter';
   
   g.save();shape(vis,ph,sc*.97,.6);g.clip();
   for(const s of streaks){const x=((s.off+el*s.sp)%1)*len;if(x>vis)continue;const y=mid+s.v*half(Math.max(12,x),1,ph,sc,0)*.9;g.strokeStyle=Math.abs(s.v)<.4?'rgba(255,255,255,.9)':'rgba(255,190,235,.75)';g.lineWidth=s.w;g.beginPath();g.moveTo(x,y);g.lineTo(Math.max(0,x-len*s.l),y);g.stroke();}
   g.globalCompositeOperation='source-over';for(const d of grains){const x=((d.u+el*d.sp)%1)*len;if(x>vis||x<len*.1)continue;const y=mid+d.v*half(x,1,ph,sc,0)*.96;g.fillStyle=d.c<.45?'rgba(255,70,180,.7)':d.c<.8?'rgba(255,140,40,.7)':'rgba(255,255,255,.95)';g.fillRect(x,y,d.s,d.s);}g.restore();g.globalCompositeOperation='lighter';
   
   shape(vis,ph,sc,1);g.lineWidth=1.6;g.strokeStyle='rgba(255,246,200,.9)';g.shadowColor='#ffb52a';g.shadowBlur=12;g.stroke();g.shadowBlur=0;
   
   for(let i=0;i<4;i++){const u=(i/4+el*1.0)%1,x=u*len;if(x>vis||u<.08)continue;const ry=half(x,1,ph,sc,0)*1.3,rx=Math.max(3,ry*.14);g.strokeStyle='rgba(255,200,240,'+(.7*(1-u))+')';g.lineWidth=2.5*(1-u)+1;g.beginPath();g.ellipse(x,mid,rx,ry,0,0,7);g.stroke();}
   
   if(now>boltAt){boltAt=now+70;bolts=Array.from({length:fxN(5)},()=>{const side=Math.random()<.5?1:-1,x0=rnd(.15,.8)*vis,pts=[];for(let j=0;j<=6;j++){const x=x0+j*rnd(12,30);pts.push([x,mid-side*(half(Math.min(len,x),side,ph,sc,1)*rnd(1,1.3))+rnd(-7,7)]);}return pts;});}
   g.strokeStyle='rgba(255,215,245,.95)';g.lineWidth=1.7;g.shadowColor='#ff4fd8';g.shadowBlur=10;for(const b of bolts){g.beginPath();b.forEach((q,j)=>j?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();}g.shadowBlur=0;
   
   for(const e of embers){const u=(e.u+el*e.sp)%1,x=u*len;if(x>vis||u<.15)continue;const y=mid-e.side*half(x,e.side,ph,sc,1)*(e.d+((el*e.sp*3+e.u*7)%1)*.35);g.fillStyle='rgba(255,205,110,'+(.9*(1-u*.6))+')';g.fillRect(x,y,e.s,e.s);}
   
   const R0=spread*.2*(.6+.4*sc),tp=g.createRadialGradient(0,mid,0,0,mid,R0);tp.addColorStop(0,'#fff');tp.addColorStop(.3,'rgba(255,130,225,.95)');tp.addColorStop(1,'rgba(255,79,216,0)');g.fillStyle=tp;g.beginPath();g.arc(0,mid,R0,0,7);g.fill();
   g.globalCompositeOperation='source-over';requestAnimationFrame(frame);}
  requestAnimationFrame(frame);}

 
 
 function comet(actor,targets,main){const k=speed(),A=rect(actor),HIT=2600*k,W=innerWidth,arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  const R=Math.max(A.w,A.h),rs=targets.map(rect).sort((p,q)=>p.cx-q.cx);if(!rs.length)return;
  sfx('burst');
  layer().classList.add('is-burst');
  go(el('bc-dark is-violet'),[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.85},{opacity:0}],{duration:4400*k,easing:'ease-in-out'});
  const t=el('bc-title is-violet','','div');t.innerHTML='<small>流星の如き爆発</small><b>METEORIC</b><b class="bc-t2">BURST</b><em>200 % sur la cible · 90 % sur les autres</em>';go(t,[{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.15},{opacity:1,offset:.7},{opacity:0,transform:'translate(-50%,-50%) scale(1.1)'}],{duration:1300*k,delay:0,easing:'ease-out'});
  
  const rowY=rs.reduce((n,r)=>n+r.cy,0)/rs.length,post={cx:Math.max(R*.55,rs[0].x-R*.7),cy:rowY},side={cx:Math.max(R*.6,rs[0].x-R*.9),cy:(A.cy+rs[0].cy)/2},far={cx:Math.min(W-R*.6,rs[rs.length-1].x+rs[rs.length-1].w+R*.8),cy:rowY+R*.1};
  
  const T0=300*k,DASH=120*k,STOP=110*k,steps=[];let tt=T0+150*k;steps.push({q:side,at:tt,hold:0});rs.forEach(r=>{tt+=DASH;steps.push({q:{cx:r.cx-r.w*.18,cy:r.cy+r.h*.05},at:tt,hold:STOP,hit:r});tt+=STOP;});tt+=DASH;steps.push({q:far,at:tt,hold:0});tt+=170*k;steps.push({q:post,at:tt,hold:0});const END=tt;
  
  const CONE=1150*k,FIRE=HIT-380*k,BACK=FIRE+CONE,TOT=BACK+320*k,P=(q,s=.9,r=0)=>`translate(${q.cx-A.cx}px,${q.cy-A.cy}px) scale(${s}) rotate(${r}deg)`,glow='brightness(1.5) drop-shadow(0 0 22px #ff4fd8)',kf=[{transform:'none',filter:'none',offset:0},{transform:'scale(1.08)',filter:'brightness(1.8) drop-shadow(0 0 24px #ff4fd8)',offset:T0/TOT}];
  steps.forEach(s=>{kf.push({transform:P(s.q,s.hit?1.02:.9,s.hit?8:0),filter:glow,offset:s.at/TOT,easing:s.hold?'linear':'cubic-bezier(.7,0,.9,.4)'});if(s.hold)kf.push({transform:P({cx:s.q.cx+R*.06,cy:s.q.cy},1.02,-4),filter:glow,offset:(s.at+s.hold)/TOT,easing:'cubic-bezier(.7,0,.9,.4)'});});
  kf.push({transform:P(post,1),filter:glow,offset:BACK/TOT,easing:'cubic-bezier(.3,0,.2,1)'},{transform:'none',filter:'none',offset:1});
  try{actor.animate(kf,{duration:TOT,easing:'linear'});}catch{}
  
  const src=actor.querySelector('img')?.currentSrc||actor.querySelector('img')?.src||'',pts=[{q:{cx:A.cx,cy:A.cy},at:T0,hold:0},...steps];
  for(let i=0;i<pts.length-1;i++){const p0=pts[i].q,p1=pts[i+1].q,t0=pts[i].at+(pts[i].hold||0),dur=pts[i+1].at-t0,dx=p1.cx-p0.cx,dy=p1.cy-p0.cy,len=Math.hypot(dx,dy);if(len<4)continue;const a=Math.atan2(dy,dx)*180/Math.PI;
   go(el('bc-trail',`left:${p0.cx}px;top:${p0.cy}px;width:${len}px;height:${R*.5}px;--ang:${a}deg`),[{transform:'rotate(var(--ang)) translateY(-50%) scaleX(0)',opacity:1},{transform:'rotate(var(--ang)) translateY(-50%) scaleX(1)',opacity:1,offset:.3},{transform:'rotate(var(--ang)) translateY(-50%) scaleX(1) scaleY(.5)',opacity:.7,offset:.6},{transform:'rotate(var(--ang)) translateY(-50%) scaleX(1) scaleY(.05)',opacity:0}],{duration:dur*3.4,delay:t0,easing:'ease-out'});
   go(el('bc-trail-core',`left:${p0.cx}px;top:${p0.cy}px;width:${len}px;--ang:${a}deg`),[{transform:'rotate(var(--ang)) translateY(-50%) scaleX(0)',opacity:1},{transform:'rotate(var(--ang)) translateY(-50%) scaleX(1)',opacity:1,offset:.35},{transform:'rotate(var(--ang)) translateY(-50%) scaleX(1)',opacity:0}],{duration:dur*2.4,delay:t0,easing:'ease-out'});
   if(src)for(let j=1;j<=3;j++){const u=j/4;go(el('bc-ghost',`left:${p0.cx+dx*u}px;top:${p0.cy+dy*u}px;width:${A.w*.9}px;height:${A.h*.9}px;background-image:url("${src}")`),[{transform:'translate(-50%,-50%) scale(.95)',opacity:0},{transform:'translate(-50%,-50%) scale(.95)',opacity:.55,offset:.1},{transform:'translate(-50%,-50%) scale(.9)',opacity:0}],{duration:330*k,delay:t0+dur*u,easing:'ease-out'});}}
  
  steps.filter(s=>s.hit).forEach((s,i)=>{const r=s.hit,at=s.at,S=Math.max(r.w,r.h),e=targets.find(x=>Math.abs(rect(x).cx-r.cx)<2);
   go(el('bc-blast is-pink',`left:${r.cx}px;top:${r.cy}px;width:${S*1.5}px;height:${S*1.5}px`),[{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.2},{transform:'translate(-50%,-50%) scale(1.35)',opacity:0}],{duration:520*k,delay:at,easing:'ease-out'});
   go(el('bc-shock is-violet',`left:${r.cx}px;top:${r.cy}px;width:${S*1.9}px;height:${S*1.9}px`),[{transform:'translate(-50%,-50%) scale(.1)',opacity:1},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:420*k,delay:at,easing:'ease-out'});
   for(let j=0;j<10;j++){const an=j*36+rnd(-8,8),ln=S*rnd(.45,.85),w=S*rnd(.05,.09);go(el('bc-spike is-pink',`left:${r.cx}px;top:${r.cy}px;width:${w}px;height:${ln}px;margin:${-ln}px 0 0 ${-w/2}px;--a:${an}deg`),[{transform:'rotate(var(--a)) scaleY(.1)',opacity:1},{transform:'rotate(var(--a)) scaleY(1.15)',opacity:1,offset:.3},{transform:'rotate(var(--a)) scaleY(.2) translateY(-60%)',opacity:0}],{duration:300*k,delay:at,easing:'ease-out'});}
   [[-38,0],[42,50*k]].forEach(([an,d])=>go(el('bc-slash',`left:${r.cx}px;top:${r.cy}px;width:${S*1.7}px;--a:${an+rnd(-8,8)}deg`),[{transform:'translate(-50%,-50%) rotate(var(--a)) scaleX(0)',opacity:1},{transform:'translate(-50%,-50%) rotate(var(--a)) scaleX(1)',opacity:1,offset:.3},{transform:'translate(-50%,-50%) rotate(var(--a)) scaleX(1.1) scaleY(.15)',opacity:0}],{duration:360*k,delay:at+d,easing:'ease-out'}));
   for(let j=0;j<fxN(14);j++){const an=rnd(-70,70)*Math.PI/180,d=S*rnd(.5,1.3);go(el('bc-mote is-pink',`left:${r.cx}px;top:${r.cy}px`),[{transform:'translate(0,0) scale(1.4)',opacity:1},{transform:`translate(${Math.cos(an)*d}px,${Math.sin(an)*d-S*.15}px) scale(.2)`,opacity:0}],{duration:rnd(320,560)*k,delay:at,easing:'cubic-bezier(.1,.7,.3,1)'});}
   const word=el('bc-hitword',`left:${r.cx+r.w*.2}px;top:${r.y+r.h*.05}px`,'b');word.textContent=['ドッ','バキ','ドン'][i%3];go(word,[{transform:'translate(-50%,-50%) scale(.5) rotate(-12deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1.25) rotate(-12deg)',opacity:1,offset:.25},{transform:'translate(-50%,-80%) scale(1) rotate(-12deg)',opacity:0}],{duration:480*k,delay:at,easing:'ease-out'});
   if(e)try{e.animate([{transform:'none',filter:'none'},{transform:`translate(${S*.16}px,${-S*.06}px) rotate(7deg)`,filter:'brightness(2.6) saturate(.4)',offset:.25},{transform:`translate(${S*.1}px,${-S*.03}px) rotate(4deg)`,filter:'brightness(1.4)',offset:.6},{transform:'none',filter:'none'}],{duration:420*k,delay:at,easing:'ease-out'});}catch{}
   setTimeout(()=>shake(arena,k,150),at);});
  
  const left=Math.min(...rs.map(r=>r.x)),right=Math.max(...rs.map(r=>r.x+r.w)),row={cx:(left+right)/2,cy:rs.reduce((n,r)=>n+r.cy,0)/rs.length},ox=post.cx+R*.3,oy=post.cy,spread=Math.max(...rs.map(r=>r.h))*1.35,len=Math.max(right-ox+R*.9,spread*2.2),ang=0;
  go(el('bc-core',`left:${ox}px;top:${oy}px;width:${R*1.2}px;height:${R*1.2}px`),[{transform:'translate(-50%,-50%) scale(.1)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.6},{transform:'translate(-50%,-50%) scale(.5)',opacity:0}],{duration:FIRE-END+500*k,delay:END-150*k,easing:'ease-in'});
  setTimeout(()=>flameCone(ox,oy,len,spread,ang,CONE),FIRE);
  for(let i=0;i<fxN(40);i++){const u=rnd(.1,1),off=rnd(-.5,.5)*spread*u,a=ang*Math.PI/180,x=ox+Math.cos(a)*len*u*.8-Math.sin(a)*off,y=oy+Math.sin(a)*len*u*.8+Math.cos(a)*off;go(el('bc-mote is-gold',`left:${x}px;top:${y}px`),[{transform:'scale(.4)',opacity:0},{transform:'scale(1.2)',opacity:1,offset:.2},{transform:`translate(${Math.cos(a)*rnd(20,60)}px,${Math.sin(a)*rnd(20,60)}px) scale(.2)`,opacity:0}],{duration:rnd(500,900)*k,delay:FIRE+rnd(150,900)*k,easing:'ease-out'});}
  
  go(el('bc-flash is-pink'),[{opacity:0},{opacity:.85,offset:.08},{opacity:0}],{duration:800*k,delay:HIT,easing:'ease-out'});
  rs.forEach((r,i)=>{const S=Math.max(r.w,r.h)*1.8;go(el('bc-blast is-pink',`left:${r.cx}px;top:${r.cy}px;width:${S}px;height:${S}px`),[{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.2},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:1100*k,delay:HIT+i*60*k,easing:'ease-out'});});
  setTimeout(()=>{shake(arena,k,900);targets.forEach(t=>t.classList.add('bc-struck'));setTimeout(()=>targets.forEach(t=>t.classList.remove('bc-struck')),800*k);},HIT);
  setTimeout(()=>layer().classList.remove('is-burst'),4600*k);}

 
 function moment(name){try{const b=document.querySelector('.story-battle');if(!b)return 600;const p=document.createElement('i');p.style.cssText='position:absolute;animation-delay:var('+name+',.6s)';b.append(p);const v=getComputedStyle(p).animationDelay;p.remove();return parseFloat(v)*(/ms/.test(v)?1:1000)||600;}catch{return 600;}}
 const playedRise=new WeakSet();
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||typeof storyAnimating==='undefined'||!storyAnimating)return;
   
   if(storyImpact.borosRise!==undefined&&!playedRise.has(storyImpact)){const card=document.querySelector('.story-battle [data-fighter-id="'+storyImpact.borosRise+'"]');if(card){playedRise.add(storyImpact);if(!(typeof reducedMotion==='function'&&reducedMotion()))meteoric(card,0,moment(storyImpact.borosRiseAt==='hit'?'--hit-moment':'--counter-moment')+250);}}
   if(storyImpact.action!=='cannon'||played.has(storyImpact))return;
   const actor=document.querySelector('.uses-cannon');if(!actor)return;
   const targets=[...document.querySelectorAll('.story-battle .cannon-hit')];if(!targets.length)return;played.add(storyImpact);if(typeof reducedMotion==='function'&&reducedMotion())return;
   const burst=actor.closest('.story-fighter')?.classList.contains('is-meteoric')||actor.classList.contains('is-meteoric');
   if(burst){const id=storyImpact.cannonTarget,m=id===undefined?null:document.querySelector('.story-battle [data-story-target="'+id+'"],.story-battle [data-infinity-target="'+id+'"],.story-battle [data-duel-target="'+id+'"]');comet(actor,targets,(m&&(m.closest('.cannon-hit')||m.parentElement))||targets[0]);}else cannon(actor,targets,false);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"boros-cannon.js");}

/* axel-tornado.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const light=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}};
 const played=new WeakSet();
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('axLayer')||document.createElement('div');L.id='axLayer';L.className='ax-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 
 const glow=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;})();
 const tint={};function sprite(col){if(tint[col])return tint[col];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.drawImage(glow,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,64,64);return tint[col]=c;}

 
 const SOCCER=(()=>{const S=128,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),R=S/2-3,C=S/2;
  const poly=(cx,cy,rad,rot)=>{g.beginPath();for(let i=0;i<5;i++){const a=rot+i*Math.PI*2/5;g[i?'lineTo':'moveTo'](cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}g.closePath();};
  g.save();g.beginPath();g.arc(C,C,R,0,Math.PI*2);g.clip();
  const sh=g.createRadialGradient(C-R*.35,C-R*.4,R*.1,C,C,R*1.05);sh.addColorStop(0,'#ffffff');sh.addColorStop(.6,'#eceff2');sh.addColorStop(1,'#9aa3ad');g.fillStyle=sh;g.fillRect(0,0,S,S);
  const pr=R*.3,rot=-Math.PI/2;g.fillStyle='#16181c';poly(C,C,pr,rot);g.fill();
  g.strokeStyle='#3a3f47';g.lineWidth=2;
  for(let i=0;i<5;i++){const a=rot+i*Math.PI*2/5,vx=C+Math.cos(a)*pr,vy=C+Math.sin(a)*pr,ox=C+Math.cos(a)*R*.62,oy=C+Math.sin(a)*R*.62;g.beginPath();g.moveTo(vx,vy);g.lineTo(ox,oy);g.stroke();
   const b=a+Math.PI/5,px=C+Math.cos(b)*R*.98,py=C+Math.sin(b)*R*.98;g.fillStyle='#16181c';poly(px,py,pr*.95,b+Math.PI);g.fill();
   const ex=C+Math.cos(b)*R*.66,ey=C+Math.sin(b)*R*.66;g.beginPath();g.moveTo(ox,oy);g.lineTo(ex,ey);g.stroke();g.beginPath();g.moveTo(C+Math.cos(a+Math.PI*2/5)*R*.62,C+Math.sin(a+Math.PI*2/5)*R*.62);g.lineTo(ex,ey);g.stroke();}
  const hl=g.createRadialGradient(C-R*.4,C-R*.45,0,C-R*.4,C-R*.45,R*.55);hl.addColorStop(0,'rgba(255,255,255,.75)');hl.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=hl;g.fillRect(0,0,S,S);
  g.restore();g.strokeStyle='#2a2e34';g.lineWidth=3;g.beginPath();g.arc(C,C,R,0,Math.PI*2);g.stroke();return c;})();
 const heat=t=>t<.15?'#fff6d0':t<.35?'#ffd04a':t<.6?'#ff8a1a':t<.85?'#ff4a0a':'#b31800';
 function run(actor,target){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rect(actor),T=rect(target),arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena'),W=innerWidth,H=innerHeight,few=light();
  
  
  const BALL=0,CROUCH=300*k,RISE=600*k,FLIP=1650*k,KICK=1900*k,HIT=2400*k,END=3900*k;
  const lift=Math.min(110,A.h*.55),apexX=A.cx,apexY=A.y-lift-Math.min(70,A.h*.3);
  
  go(el('ax-dark'),[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.62},{opacity:0}],{duration:END,easing:'ease-out'});
  go(el('ax-heat',`left:${A.cx}px;top:${A.y+A.h}px;width:${A.w*3}px;height:${A.h*2.4}px`),[{transform:'translate(-50%,-70%) scale(.4)',opacity:0},{transform:'translate(-50%,-70%) scale(1)',opacity:1,offset:.3},{transform:'translate(-50%,-70%) scale(1.15)',opacity:.8,offset:.8},{transform:'translate(-50%,-70%) scale(1.3)',opacity:0}],{duration:KICK,easing:'ease-out'});
  
  actor.classList.add('ax-actor');
  actor.animate([{transform:'translateY(0) rotateY(0) rotate(0) scaleY(1)',filter:'brightness(1)'},
   {transform:'translateY(6px) rotateY(0) rotate(0) scaleY(.88)',filter:'brightness(1.2) sepia(.2)',offset:.25},
   {transform:`translateY(-${lift*.5}px) rotateY(540deg) rotate(0) scaleY(1.02)`,filter:'brightness(1.4) sepia(.35)',offset:.5},
   {transform:`translateY(-${lift}px) rotateY(1080deg) rotate(0) scaleY(1)`,filter:'brightness(1.6) sepia(.4)',offset:.72},
   {transform:`translateY(-${lift}px) rotateY(1080deg) rotate(-200deg) scaleY(1)`,filter:'brightness(1.9) sepia(.4)',offset:.84},
   {transform:`translateY(-${lift*.8}px) rotateY(1080deg) rotate(-360deg) scaleY(1)`,filter:'brightness(1.3)',offset:.92},
   {transform:'translateY(0) rotateY(1080deg) rotate(-360deg) scaleY(1)',filter:'brightness(1)'}],{duration:HIT+200*k,easing:'cubic-bezier(.4,0,.4,1)'});
  setTimeout(()=>actor.classList.remove('ax-actor'),HIT+260*k);
  
  const cv=el('ax-canvas','', 'canvas'),dpr=Math.min(2,devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;cv.style.cssText=`left:0;top:0;width:${W}px;height:${H}px;opacity:1`;const g=cv.getContext('2d');g.scale(dpr,dpr);
  const parts=[],t0=performance.now(),base=A.y+A.h*.95,col=(base-apexY)*1.05,R0=A.w*.55,R1=A.w*1.05,bx1=T.cx,by1=T.cy;let last=t0,exploded=false,ringDone=false,ballNow=null;
  const ease=p=>p<0?0:p>1?1:p*p*(3-2*p);
  function ballAt(t){if(t<RISE){const p=ease((t-BALL)/(RISE-BALL));return {x:A.cx+(apexX-A.cx)*p,y:A.cy+(apexY-A.cy)*p-Math.sin(p*Math.PI)*30,fire:0};}
   if(t<KICK)return {x:apexX+Math.sin(t/120)*3,y:apexY+Math.sin(t/180)*4,fire:ease((t-FLIP)/(KICK-FLIP))*.6};
   const p=Math.min(1,(t-KICK)/(HIT-KICK)),e=p*p;return {x:apexX+(bx1-apexX)*e,y:apexY+(by1-apexY)*e,fire:1};}
  function drawBall(b,t){const r=Math.max(16,Math.min(28,A.w*.22));
   
   if(b.fire>0){g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,b.fire+.2);const fl=r*(2.1+Math.sin(t/40)*.2);g.drawImage(sprite('#ff4a0a'),b.x-fl*1.5,b.y-fl*1.5,fl*3,fl*3);g.drawImage(sprite('#ffb02e'),b.x-fl,b.y-fl,fl*2,fl*2);}
   g.globalCompositeOperation='source-over';g.globalAlpha=1;g.save();g.translate(b.x,b.y);g.rotate(t/110);g.drawImage(SOCCER,-r,-r,r*2,r*2);g.restore();
   if(b.fire>0){g.globalCompositeOperation='source-atop';g.globalAlpha=b.fire*.35;g.fillStyle='#ff8a1a';g.beginPath();g.arc(b.x,b.y,r,0,7);g.fill();g.globalCompositeOperation='lighter';g.globalAlpha=b.fire*.5;g.drawImage(sprite('#ffd04a'),b.x-r*1.4,b.y-r*1.4,r*2.8,r*2.8);}}
  
  function ribbon(h0,h1,phase,spin,alpha,widthK){const n=26,pts=[];for(let q=0;q<=n;q++){const h=h0+(h1-h0)*q/n,ang=phase+h*Math.PI*2*1.5+spin,r=(R0+(R1-R0)*Math.min(1,Math.max(0,h)))*(1+Math.sin(ang*3+spin)*.04);pts.push({x:A.cx+Math.cos(ang)*r,y:base-h*col+Math.sin(ang)*r*.3,front:Math.sin(ang),taper:Math.sin(Math.PI*q/n)});}
   g.globalCompositeOperation='lighter';g.lineCap='round';
   for(const [w,c,al] of [[58,'#a81400',.22],[36,'#e8400a',.38],[20,'#ff9a1e',.6],[8,'#fff1b0',.95]]){g.strokeStyle=c;for(let q=0;q<n;q++){const a=pts[q],b=pts[q+1],vis=a.front>0?1:.35;g.globalAlpha=alpha*al*vis*(.3+.7*a.taper);g.lineWidth=Math.max(1,w*widthK*a.taper*(few?.8:1));g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}}
   for(let m=0;m<(few?2:4);m++){const q=pts[Math.floor(Math.random()*pts.length)];if(q.front<0&&Math.random()<.6)continue;const out=(q.x-A.cx)/Math.max(1,R1);parts.push({kind:'f',x:q.x,y:q.y,vx:out*rnd(.02,.08),vy:rnd(-.22,-.08),life:0,max:rnd(260,520)*k,size:rnd(10,22)*q.taper+6});}}
  function frame(now){const t=now-t0,dt=Math.min(50,now-last);last=now;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
   
   if(t>=CROUCH&&!ringDone){ringDone=true;for(let q=0;q<(few?40:80);q++){const a=rnd(0,Math.PI*2);parts.push({kind:'f',x:A.cx+Math.cos(a)*R0*1.1,y:base+Math.sin(a)*R0*.3,vx:Math.cos(a)*rnd(.02,.08),vy:rnd(-.32,-.12),life:0,max:rnd(400,800)*k,size:rnd(10,22)});}}
   if(t>=CROUCH&&t<RISE+500*k){const p=(t-CROUCH)/(RISE+500*k-CROUCH),r=R0*(.6+p*1.1);g.globalCompositeOperation='lighter';g.lineCap='round';for(const [w,c,al] of [[20,'#c41a00',.4],[10,'#ff7a1a',.7],[4,'#fff1b0',.95]]){g.globalAlpha=al*(1-p);g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.ellipse(A.cx,base,r,r*.28,0,0,Math.PI*2);g.stroke();}}
   
   if(t>=RISE-100*k&&t<FLIP+250*k){const p=ease((t-RISE+100*k)/(FLIP-RISE)),fade=t>FLIP?Math.max(0,1-(t-FLIP)/(250*k)):1,spin=t/1000/k*7.5,top=Math.min(1.05,.15+p*.95),bot=Math.max(0,top-.85);
    for(let r=0;r<2;r++)ribbon(bot,top,r*Math.PI,spin,fade,1);}
   
   if(t>=FLIP-80*k&&t<KICK+350*k){const p=(t-FLIP+80*k)/(KICK+350*k-FLIP+80*k),R=A.w*.95,sweep=Math.min(1,p*1.6)*Math.PI*1.9,a0=-Math.PI/2-p*Math.PI*1.2,fade=p>.7?(1-p)/.3:1,cy=A.y-lift+A.h*.35;g.globalCompositeOperation='lighter';g.lineCap='round';
    for(const [w,c,al] of [[60,'#a81400',.25],[38,'#e8400a',.4],[20,'#ff9a1e',.65],[8,'#fff1b0',.95]]){g.globalAlpha=al*fade;g.strokeStyle=c;g.lineWidth=w*(few?.8:1);g.beginPath();g.ellipse(A.cx,cy,R*.62,R,0,a0,a0+sweep);g.stroke();}}
   
   if(t<HIT){const b=ballAt(t);if(t>=KICK){for(let q=0;q<(few?5:11);q++)parts.push({kind:'f',x:b.x+rnd(-7,7),y:b.y+rnd(-7,7),vx:rnd(-.04,.04),vy:rnd(-.08,0),life:0,max:rnd(300,560)*k,size:rnd(14,30)});}ballNow=b;}else ballNow=null;
   if(t>=HIT&&!exploded){exploded=true;for(let q=0;q<(few?70:150);q++){const a=rnd(0,Math.PI*2),sp=rnd(.15,.75);parts.push({kind:'f',x:bx1,y:by1,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.15,life:0,max:rnd(500,1100)*k,size:rnd(14,40)});}for(let q=0;q<(few?20:45);q++){const a=rnd(-Math.PI,0),sp=rnd(.3,.9);parts.push({kind:'e',x:bx1,y:by1,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0,max:rnd(900,1600)*k,size:rnd(2,4)});}}
   g.globalCompositeOperation='lighter';
   for(let q=parts.length-1;q>=0;q--){const o=parts[q];o.life+=dt;const life=o.life/o.max;if(life>=1){parts.splice(q,1);continue;}let s,c;
    if(o.kind==='f'){o.x+=o.vx*dt;o.y+=o.vy*dt;o.vy-=.0002*dt;s=o.size*(1+life*.6);c=heat(life);}else{o.x+=o.vx*dt;o.y+=o.vy*dt;o.vy+=.0009*dt;s=o.size*3;c='#ffd27a';}
    g.globalAlpha=Math.max(0,1-life);g.drawImage(sprite(c),o.x-s,o.y-s,s*2,s*2);}
   if(ballNow)drawBall(ballNow,t);
   if(t<END||parts.length)requestAnimationFrame(frame);else cv.remove();}
  requestAnimationFrame(frame);
  
  const banner=el('ax-banner','','b');banner.innerHTML='<small>ファイアトルネード</small>TORNADE DE FEU';
  go(banner,[{transform:'translate(-50%,-50%) scale(1.4) skewX(-10deg)',opacity:0,letterSpacing:'.4em'},{transform:'translate(-50%,-50%) scale(1) skewX(-10deg)',opacity:1,letterSpacing:'.08em',offset:.18},{transform:'translate(-50%,-50%) scale(1.02) skewX(-10deg)',opacity:1,offset:.78},{transform:'translate(-50%,-50%) scale(1.1) skewX(-10deg)',opacity:0}],{duration:1500*k,delay:900*k,easing:'cubic-bezier(.2,.8,.3,1)'});
  
  go(el('ax-flash is-kick'),[{opacity:0},{opacity:.6,offset:.15},{opacity:0}],{duration:260*k,delay:KICK,easing:'ease-out'});
  const ang=Math.atan2(by1-apexY,bx1-apexX)*180/Math.PI;
  for(let q=0;q<(few?5:10);q++){const off=rnd(-60,60),len=Math.hypot(bx1-apexX,by1-apexY)*rnd(.6,1.1);go(el('ax-streak',`left:${apexX+off}px;top:${apexY+rnd(-40,40)}px;width:${len}px;--a:${ang}deg`),[{transform:'rotate(var(--a)) scaleX(0)',opacity:0},{transform:'rotate(var(--a)) scaleX(1)',opacity:1,offset:.5},{transform:'rotate(var(--a)) scaleX(1) translateX(30%)',opacity:0}],{duration:420*k,delay:KICK+rnd(0,200)*k,easing:'ease-out'});}
  
  go(el('ax-flash'),[{opacity:0},{opacity:.85,offset:.08},{opacity:0}],{duration:420*k,delay:HIT,easing:'ease-out'});
  go(el('ax-ring',`left:${bx1}px;top:${by1}px;width:${T.w*2.4}px;height:${T.w*2.4}px`),[{transform:'translate(-50%,-50%) scale(.1)',opacity:1},{transform:'translate(-50%,-50%) scale(1)',opacity:.9,offset:.4},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:700*k,delay:HIT,easing:'cubic-bezier(.15,.7,.3,1)'});
  go(el('ax-burst',`left:${bx1}px;top:${by1}px;width:${T.w*3}px;height:${T.w*3}px`),[{transform:'translate(-50%,-50%) scale(.2) rotate(0)',opacity:0},{transform:'translate(-50%,-50%) scale(1) rotate(10deg)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(1.3) rotate(18deg)',opacity:0}],{duration:600*k,delay:HIT,easing:'cubic-bezier(.15,.7,.3,1)'});
  go(el('ax-pillar',`left:${bx1}px;top:${T.y+T.h}px;width:${T.w*1.1}px;height:${T.h*1.8}px`),[{transform:'translate(-50%,-100%) scaleY(0)',opacity:0},{transform:'translate(-50%,-100%) scaleY(1)',opacity:1,offset:.2},{transform:'translate(-50%,-100%) scaleY(1.1)',opacity:0}],{duration:1100*k,delay:HIT+40*k,easing:'ease-out'});
  setTimeout(()=>{arena?.classList.add('ax-shake');target.classList.add('ax-struck');setTimeout(()=>{arena?.classList.remove('ax-shake');target.classList.remove('ax-struck');},700*k);},HIT);}
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='tornado'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-tornado');if(!actor)return;
   const main=document.querySelector('.story-battle [data-story-target="'+storyImpact.tornadoTarget+'"],.story-battle [data-infinity-target="'+storyImpact.tornadoTarget+'"],.story-battle [data-duel-target="'+storyImpact.tornadoTarget+'"]'),target=(main&&(main.closest('.tornado-hit')||main.parentElement))||document.querySelector('.tornado-hit');if(!target)return;played.add(storyImpact);
   if(typeof reducedMotion==='function'&&reducedMotion())return;run(actor,target);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"axel-tornado.js");}

/* yami-dslash.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const light=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}};
 const played=new WeakSet();
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('dsLayer')||document.createElement('div');L.id='dsLayer';L.className='ds-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const ease=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
 const glow=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;})();
 const tint={};function sprite(col){if(tint[col])return tint[col];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.drawImage(glow,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,64,64);return tint[col]=c;}

 
 function split(main,cut,k,dies,find){
  const parent=main.parentElement;if(!parent)return;
  const ps=getComputedStyle(parent).position,fixPos=ps==='static';if(fixPos)parent.style.position='relative';
  const pr=parent.getBoundingClientRect(),mr=main.getBoundingClientRect();
  const left=main.offsetParent===parent?main.offsetLeft:mr.left-pr.left-parent.clientLeft,top=main.offsetParent===parent?main.offsetTop:mr.top-pr.top-parent.clientTop;
  const w=main.offsetWidth,h=main.offsetHeight;
  const [a,b]=cut; 
  const polys=[`polygon(0 0,${a*100}% 0,${b*100}% 100%,0 100%)`,`polygon(${a*100}% 0,100% 0,100% 100%,${b*100}% 100%)`];
  
  const dx=(b-a)*w,dy=h,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=uy,ny=-ux;
  const halves=polys.map((clip,i)=>{const c=main.cloneNode(true);c.removeAttribute('id');c.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
   c.classList.add('ds-half');c.setAttribute('aria-hidden','true');c.tabIndex=-1;
   c.style.cssText+=`;left:${left}px;top:${top}px;width:${w}px;height:${h}px;clip-path:${clip};-webkit-clip-path:${clip};transform-origin:50% 50%`;c.style.setProperty('animation','none','important');c.style.setProperty('clip-path',clip,'important');c.style.setProperty('-webkit-clip-path',clip,'important');c.style.setProperty('opacity','1','important');c.style.setProperty('visibility','visible','important');
   c.querySelectorAll('*').forEach(n=>{n.style.animationPlayState='paused';});parent.append(c);return c;});
  main.classList.add('ds-hidden');
  
  let cur=main,scar=null,done=false;const moved=()=>[...halves,voidEl,scar].filter(Boolean);
  const follow=setInterval(()=>{if(done)return;if(cur.isConnected&&halves[0].parentElement===cur.parentElement)return;const nm=find&&find();if(!nm||!nm.parentElement)return;cur=nm;const np=nm.parentElement;if(getComputedStyle(np).position==='static')np.style.position='relative';nm.classList.add('ds-hidden');for(const n of moved())np.append(n);},16);
  setTimeout(()=>clearInterval(follow),2600*k);
  const gap=Math.max(18,w*.3),slide=h*.14;
  
  const voidEl=document.createElement('i');voidEl.className='ds-half ds-void';const pad=w*.35;
  voidEl.style.cssText=`left:${left-pad}px;top:${top-pad*.3}px;width:${w+pad*2}px;height:${h+pad*.6}px;z-index:30!important;clip-path:polygon(${(a*w+pad)}px ${-0}px,${(a*w+pad)}px 0,${(b*w+pad)}px 100%,${(b*w+pad)}px 100%)`;
  parent.append(voidEl);
  const band=f=>{const o=gap*1.15*f+1,x0=a*w+pad,x1=b*w+pad,y0=pad*.3,y1=h+pad*.3,ox=nx*o,oy=ny*o,ext=.12;const X0=x0-(x1-x0)*ext,Y0=y0-(y1-y0)*ext,X1=x1+(x1-x0)*ext,Y1=y1+(y1-y0)*ext;return `polygon(${X0-ox}px ${Y0-oy}px,${X0+ox}px ${Y0+oy}px,${X1+ox}px ${Y1+oy}px,${X1-ox}px ${Y1-oy}px)`;};
  
  const pose=(i,f,rot,drop=0)=>{const s=i?1:-1;return `translate(${(-nx*s*gap+ux*s*slide)*f}px,${(-ny*s*gap+uy*s*slide)*f+drop}px) rotate(${s*rot}deg)`;};
  if(dies){
   halves.forEach((c,i)=>c.animate([{easing:'cubic-bezier(.2,.7,.4,1)',transform:pose(i,0,0),opacity:1,filter:'brightness(1)'},{easing:'cubic-bezier(.2,.7,.4,1)',transform:pose(i,1,3),opacity:1,filter:'brightness(1.5)',offset:.1},{easing:'cubic-bezier(.2,.7,.4,1)',transform:pose(i,1.25,5,h*.03),opacity:1,filter:'brightness(.9)',offset:.5},{easing:'cubic-bezier(.2,.7,.4,1)',transform:pose(i,2.2,14,h*.45),opacity:0,filter:'brightness(.4) grayscale(1)'}],{duration:1800*k,easing:'linear',fill:'forwards'}));
   voidEl.animate([{easing:'cubic-bezier(.2,.7,.4,1)',clipPath:band(0),opacity:1},{easing:'cubic-bezier(.2,.7,.4,1)',clipPath:band(1),opacity:1,offset:.1},{easing:'cubic-bezier(.2,.7,.4,1)',clipPath:band(1.25),opacity:1,offset:.5},{easing:'cubic-bezier(.2,.7,.4,1)',clipPath:band(.2),opacity:0}],{duration:1800*k,easing:'linear',fill:'forwards'});
   setTimeout(()=>{done=true;halves.forEach(c=>c.remove());voidEl.remove();if(fixPos)parent.style.position='';},1850*k);
  }else{
   const sep=[{transform:pose(0,0,0)},{offset:.16},{offset:.62},{offset:.8},{}];
   halves.forEach((c,i)=>c.animate([{easing:'cubic-bezier(.3,.7,.4,1)',transform:pose(i,0,0),filter:'brightness(1)'},{easing:'cubic-bezier(.3,.7,.4,1)',transform:pose(i,1,2.5),filter:'brightness(1.5)',offset:.1},{easing:'cubic-bezier(.3,.7,.4,1)',transform:pose(i,1.1,3),filter:'brightness(1)',offset:.7},{easing:'cubic-bezier(.3,.7,.4,1)',transform:pose(i,0,0),filter:'brightness(1.4)',offset:.82},{easing:'cubic-bezier(.3,.7,.4,1)',transform:pose(i,0,0),filter:'brightness(1)'}],{duration:2000*k,easing:'linear',fill:'forwards'}));
   voidEl.animate([{easing:'cubic-bezier(.3,.7,.4,1)',clipPath:band(0),opacity:1},{easing:'cubic-bezier(.3,.7,.4,1)',clipPath:band(1),opacity:1,offset:.1},{easing:'cubic-bezier(.3,.7,.4,1)',clipPath:band(1.1),opacity:1,offset:.7},{easing:'cubic-bezier(.3,.7,.4,1)',clipPath:band(0),opacity:1,offset:.82},{easing:'cubic-bezier(.3,.7,.4,1)',clipPath:band(0),opacity:0}],{duration:2000*k,easing:'linear',fill:'forwards'});
   
   scar=document.createElement('i');scar.className='ds-half';const ang=Math.atan2(dy,dx)*180/Math.PI;
   scar.style.cssText=`left:${left+a*w}px;top:${top}px;width:${len}px;height:3px;transform-origin:0 50%;transform:rotate(${ang}deg);background:linear-gradient(90deg,transparent,#fff 12%,#ffd0dc 50%,#fff 88%,transparent);box-shadow:0 0 8px #ff3d6e,0 0 18px #c21a42;opacity:0`;
   parent.append(scar);scar.animate([{opacity:0},{opacity:0,offset:.68},{opacity:1,offset:.73},{opacity:0}],{duration:2400*k,fill:'forwards'});
   setTimeout(()=>{done=true;halves.forEach(c=>c.remove());voidEl.remove();cur.classList.remove('ds-hidden');},2010*k);
   setTimeout(()=>{scar.remove();if(fixPos)parent.style.position='';},2450*k);
  }
  return {ux,uy};
 }

 function run(actor,target,main,dies,find){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rect(actor),T=rect(main||target),arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena'),W=innerWidth,H=innerHeight,few=light();
  const AURA=0,CROUCH=300*k,SWING=2300*k,ARRIVE=2620*k,HIT=2720*k,SPLIT=2740*k,END=4600*k;
  const CUT=[.74,.26];
  
  const cx0=T.x+CUT[0]*T.w,cy0=T.y,cx1=T.x+CUT[1]*T.w,cy1=T.y+T.h,cdx=cx1-cx0,cdy=cy1-cy0,clen=Math.hypot(cdx,cdy),cux=cdx/clen,cuy=cdy/clen,cnx=cuy,cny=-cux;
  
  go(el('ds-dark'),[{opacity:0},{opacity:1,offset:.07},{opacity:1,offset:HIT/END},{opacity:.35,offset:(HIT+250*k)/END},{opacity:.3,offset:.85},{opacity:0}],{duration:END,easing:'linear'});
  
  const tx=(T.cx-A.cx)*.22,ty=(T.cy-A.cy)*.22;
  actor.classList.add('ds-actor');
  actor.animate([{easing:'cubic-bezier(.3,.7,.3,1)',transform:'translate(0,0) scale(1) rotate(0)',filter:'brightness(1) drop-shadow(0 0 0 #000)'},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:'translate(0,5px) scale(.96) rotate(0)',filter:'brightness(.85) drop-shadow(0 0 14px #000) drop-shadow(0 0 22px #9a0f2e)',offset:CROUCH/END+.05},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:'translate(0,5px) scale(.96) rotate(0)',filter:'brightness(.85) drop-shadow(0 0 14px #000) drop-shadow(0 0 22px #9a0f2e)',offset:(SWING-130*k)/END},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:`translate(${-tx*.25}px,${-ty*.25+4}px) scale(.97) rotate(-4deg)`,filter:'brightness(.9) drop-shadow(0 0 16px #000) drop-shadow(0 0 30px #c21a42)',offset:(SWING-40*k)/END},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:`translate(${tx}px,${ty}px) scale(1.06) rotate(6deg)`,filter:'brightness(1.5) drop-shadow(0 0 10px #000) drop-shadow(0 0 26px #ff2a55)',offset:(SWING+70*k)/END},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:`translate(${tx*.9}px,${ty*.9}px) scale(1.04) rotate(5deg)`,filter:'brightness(1.1) drop-shadow(0 0 12px #000)',offset:(HIT+250*k)/END},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:'translate(0,0) scale(1) rotate(0)',filter:'brightness(1) drop-shadow(0 0 0 #000)',offset:.92},
   {easing:'cubic-bezier(.3,.7,.3,1)',transform:'translate(0,0) scale(1) rotate(0)',filter:'none'}],{duration:END,easing:'linear'}).onfinish=()=>actor.classList.remove('ds-actor');
  
  const cv=document.createElement('canvas');cv.className='ds-canvas';const dpr=Math.min(2,devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;cv.style.cssText=`left:0;top:0;width:${W}px;height:${H}px`;layer().append(cv);
  const g=cv.getContext('2d');g.scale(dpr,dpr);const parts=[];const t0=performance.now();let last=t0;
  const smoke=sprite('rgba(0,0,0,1)'),crimson=sprite('#ff1f4f'),pink=sprite('#ffb0c4');
  
  const riftN=26,riftL=Math.min(Math.hypot(W,H)*1.1,clen*2.6),riftJag=Array.from({length:riftN+1},()=>[rnd(.4,1),rnd(.4,1)]);
  function crescent(px,py,ang,R,th,alpha){g.save();g.translate(px,py);g.rotate(ang);g.globalAlpha=alpha;
   const a=1.45,d=(2*R*th-th*th)/(2*(R*(1-Math.cos(a))-th)),ia=Math.atan2(R*Math.sin(a),R*Math.cos(a)+d);g.beginPath();g.arc(0,0,R,-a,a);g.arc(-d,0,R+d-th,ia,-ia,true);g.closePath();
   g.shadowColor='#c21a42';g.shadowBlur=30;g.fillStyle='#050003';g.fill();g.shadowBlur=0;
   g.lineWidth=Math.max(2,th*.12);const lg=g.createLinearGradient(0,-R,0,R);lg.addColorStop(0,'rgba(255,170,195,0)');lg.addColorStop(.5,'#fff2f6');lg.addColorStop(1,'rgba(255,170,195,0)');g.strokeStyle=lg;
   g.beginPath();g.arc(0,0,R,-1.2,1.2);g.stroke();g.restore();}
  function frame(now){const dt=Math.min(40,now-last);last=now;const t=now-t0;g.clearRect(0,0,W,H);
   
   if(t<SWING+200*k){const n=few?1:2;for(let q=0;q<n;q++){parts.push({kind:'s',x:A.x+rnd(-.1,1.1)*A.w,y:A.y+A.h*rnd(.5,1.05),vx:rnd(-.02,.02),vy:-rnd(.04,.11),life:0,max:rnd(900,1500)*k,size:rnd(14,30)});}
    if(Math.random()<(few?.3:.6))parts.push({kind:'e',x:A.x+rnd(0,1)*A.w,y:A.y+A.h*rnd(.3,1),vx:rnd(-.03,.03),vy:-rnd(.06,.15),life:0,max:rnd(600,1100)*k,size:rnd(2,4)});}
   for(let q=parts.length-1;q>=0;q--){const o=parts[q];o.life+=dt;const life=o.life/o.max;if(life>=1){parts.splice(q,1);continue;}o.x+=o.vx*dt;o.y+=o.vy*dt;
    if(o.kind==='s'){g.globalCompositeOperation='source-over';g.globalAlpha=Math.sin(life*Math.PI)*.55;const s=o.size*(1+life*1.2);g.drawImage(smoke,o.x-s,o.y-s,s*2,s*2);}
    else{g.globalCompositeOperation='lighter';g.globalAlpha=1-life;const s=o.size*3;g.drawImage(o.kind==='p'?pink:crimson,o.x-s,o.y-s,s*2,s*2);}}
   g.globalCompositeOperation='source-over';g.globalAlpha=1;
   
   if(t>=SWING+50*k&&t<HIT+260*k){const p=.22+.78*ease((t-SWING-50*k)/(ARRIVE-SWING-50*k));const px=A.cx+(T.cx-A.cx)*Math.min(1,p)+(t>ARRIVE?(t-ARRIVE)/k*.5*cux:0),py=A.cy+(T.cy-A.cy)*Math.min(1,p)+(t>ARRIVE?(t-ARRIVE)/k*.5*cuy:0);
    const ang=Math.atan2(T.cy-A.cy,T.cx-A.cx),R=T.h*(.4+.45*p),fade=t>ARRIVE?Math.max(0,1-(t-ARRIVE)/(380*k)):1;
    for(let q=6;q>=1;q--){const b=Math.max(0,p-q*.03);crescent(A.cx+(T.cx-A.cx)*b,A.cy+(T.cy-A.cy)*b,ang,R,R*.16,fade*.08*(7-q));}
    crescent(px,py,ang,R,R*.2,fade);
    if(Math.random()<.9)for(let q=0;q<(few?2:4);q++)parts.push({kind:'s',x:px+rnd(-R,R)*.4,y:py+rnd(-R,R)*.6,vx:rnd(-.03,.03),vy:rnd(-.03,.03),life:0,max:rnd(500,900)*k,size:rnd(16,30)});}
   
   if(t>=ARRIVE-40*k&&t<SPLIT+260*k){const p=ease((t-ARRIVE+40*k)/(120*k)),fade=t>SPLIT?Math.max(0,1-(t-SPLIT)/(260*k)):1,ext=clen*.35;
    const sx=cx0-cux*ext,sy=cy0-cuy*ext,L2=(clen+ext*2)*p;g.globalAlpha=fade;g.lineCap='round';g.shadowColor='#ff2a55';g.shadowBlur=22;g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+cux*L2,sy+cuy*L2);g.stroke();g.shadowBlur=0;g.globalAlpha=1;}
   
   if(t>=HIT&&t<HIT+1400*k){const u=(t-HIT)/(1400*k),open=u<.18?ease(u/.18):u<.55?1:Math.max(0,1-ease((u-.55)/.45)),wd=Math.max(T.w*.16,26)*open;
    const mx=T.x+T.w*(CUT[0]+CUT[1])/2,my=T.cy;g.save();g.translate(mx,my);
    const pts=(side)=>riftJag.map(([j1,j2],i)=>{const s=-riftL/2+riftL*i/riftN,taper=Math.max(0,1-Math.abs(s)/(riftL/2))**.6,o=wd*(side?j1:j2)*taper*(.35+.65*Math.min(1,Math.abs(s)<clen*.6?1:.6));return [cux*s+(side?1:-1)*cnx*o,cuy*s+(side?1:-1)*cny*o];});
    g.save();g.beginPath();g.rect(-W*2,-H*2,W*4,H*4);g.rect(T.x-mx-3,T.y-my-3,T.w+6,T.h+6);g.clip('evenodd');
    const p1=pts(1),p2=pts(0).reverse();g.beginPath();[...p1,...p2].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    g.shadowColor='#ff1f4f';g.shadowBlur=26;g.fillStyle='#000';g.fill();g.shadowBlur=0;g.lineWidth=1.5;g.strokeStyle='rgba(255,120,150,.85)';g.stroke();g.restore();
    
    if(open>.3&&Math.random()<.8){const s=rnd(-clen,clen);parts.push({kind:'p',x:mx+cux*s,y:my+cuy*s,vx:cnx*rnd(-.15,.15),vy:cny*rnd(-.15,.15),life:0,max:rnd(300,600)*k,size:rnd(2,3.5)});}
    g.restore();}
   if(t<END||parts.length)requestAnimationFrame(frame);else cv.remove();}
  requestAnimationFrame(frame);
  
  const banner=el('ds-banner','','b');banner.innerHTML='<small>闇魔法 · 次元斬り</small>DIMENSION SLASH';
  go(banner,[{transform:'translate(-50%,-50%) scale(1.35) skewX(-8deg)',opacity:0,letterSpacing:'.4em'},{transform:'translate(-50%,-50%) scale(1) skewX(-8deg)',opacity:1,letterSpacing:'.06em',offset:.15},{transform:'translate(-50%,-50%) scale(1.02) skewX(-8deg)',opacity:1,offset:.8},{transform:'translate(-50%,-50%) scale(1.08) skewX(-8deg)',opacity:0}],{duration:1650*k,delay:480*k,easing:'cubic-bezier(.2,.8,.3,1)'});
  
  go(el('ds-flash'),[{opacity:0},{opacity:.95,offset:.15},{opacity:0}],{duration:200*k,delay:HIT,easing:'ease-out'});
  go(el('ds-mono'),[{opacity:1},{opacity:1,offset:.6},{opacity:0}],{duration:260*k,delay:HIT+60*k,easing:'linear'});
  setTimeout(()=>{arena?.classList.add('ds-shake');setTimeout(()=>arena?.classList.remove('ds-shake'),600*k);},HIT);
  setTimeout(()=>{try{if(main&&main.isConnected)split(main,CUT,k,dies,find);}catch{}},SPLIT);}
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='dslash'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-dslash');if(!actor)return;
   const ti=storyImpact.dslashTarget,main=document.querySelector('.story-battle [data-story-target="'+ti+'"],.story-battle [data-infinity-target="'+ti+'"],.story-battle [data-duel-target="'+ti+'"]'),target=(main&&(main.closest('.dslash-hit')||main.parentElement))||document.querySelector('.dslash-hit');if(!target)return;played.add(storyImpact);
   const hit=Array.isArray(storyImpact.atomicHits)?storyImpact.atomicHits[ti]:null,dies=!!(hit&&hit.damage>0&&Number(hit.oldHp)-Number(hit.damage)<=0);
   if(typeof reducedMotion==='function'&&reducedMotion())return;const find=()=>document.querySelector('.story-battle [data-story-target="'+ti+'"],.story-battle [data-infinity-target="'+ti+'"],.story-battle [data-duel-target="'+ti+'"]');run(actor,target,main||target.querySelector('button')||target,dies,find);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"yami-dslash.js");}

/* frieren-bh.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const light=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}};
 const played=new WeakSet(),playedReflect=new WeakSet();
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('fbhLayer')||document.createElement('div');L.id='fbhLayer';L.className='fbh-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const speedK=()=>1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1);
 function moment(name){try{const b=document.querySelector('.story-battle');if(!b)return 600;const p=document.createElement('i');p.style.cssText='position:absolute;animation-delay:var('+name+',.6s)';b.append(p);const v=getComputedStyle(p).animationDelay;p.remove();return parseFloat(v)*(/ms/.test(v)?1:1000)||600;}catch{return 600;}}
 const NS='http://www.w3.org/2000/svg';
 const RUNES='ZOLTRAAK · VOLLZANBEL · JUDRADJIM · ÄUSSERE MAGIE · SCHWARZES LOCH · ';
 
 let uid=0;
 function sigil(size){const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','-200 -200 400 400');s.setAttribute('width',size);s.setAttribute('height',size);const id='fbhR'+(++uid);
  const C=(r,w,dash,cls='')=>`<circle r="${r}" fill="none" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''} class="fbh-stroke ${cls}" pathLength="1000"/>`;
  const star=[];for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5,b=-Math.PI/2+((i+2)%5)*Math.PI*2/5;const x1=Math.cos(a)*150,y1=Math.sin(a)*150,x2=Math.cos(b)*150,y2=Math.sin(b)*150;star.push(`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}" class="fbh-stroke" fill="none" stroke-width="3" pathLength="1000"/>`);}
  const small=[];for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5+Math.PI/5,x=Math.cos(a)*112,y=Math.sin(a)*112;small.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${C(30,3)}${C(21,1.6,'40 14')}${C(10,2.4)}</g>`);}
  s.innerHTML=`<defs><path id="${id}" d="M0,-178 a178,178 0 1,1 -0.1,0"/><path id="${id}b" d="M0,-80 a80,80 0 1,1 -0.1,0"/></defs>
   <g class="fbh-spin">${C(194,3)}${C(184,1.4)}<text class="fbh-runes"><textPath href="#${id}">${RUNES.repeat(3)}</textPath></text>${C(166,2.6)}</g>
   <g class="fbh-spin-r">${star.join('')}${small.join('')}${C(150,1.6,'6 10')}</g>
   <g class="fbh-spin">${C(92,2.6)}<text class="fbh-runes fbh-runes-s"><textPath href="#${id}b">${RUNES.repeat(2)}</textPath></text>${C(70,2)}</g>`;
  return s;}
 
 function circleAt(cx,cy,size,{draw=1200,hold=1000,fade=500,delay=0,k=1,flat=false}={}){
   const w=document.createElement('div');w.className='fbh-circle'+(flat?' is-flat':'');w.style.cssText=`left:${cx}px;top:${cy}px;width:${size}px;height:${size}px`;const s=sigil(size);w.append(s);layer().append(w);
  const strokes=[...s.querySelectorAll('.fbh-stroke')],runes=[...s.querySelectorAll('.fbh-runes')];
  strokes.forEach((p,i)=>{p.style.strokeDasharray=p.getAttribute('stroke-dasharray')||'1000';p.animate([{strokeDashoffset:1000},{strokeDashoffset:0}],{duration:draw*k*rnd(.6,1),delay:delay+i*18*k,easing:'cubic-bezier(.3,.6,.3,1)',fill:'both'});});
  runes.forEach(t=>t.animate([{opacity:0},{opacity:1}],{duration:500*k,delay:delay+draw*k*.55,fill:'both'}));
  const total=delay+(draw+hold+fade)*k;
  w.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.7) rotate(-20deg)'},{opacity:1,transform:'translate(-50%,-50%) scale(1) rotate(0)',offset:Math.min(.95,(delay+draw*k*.4)/total)},{opacity:1,transform:'translate(-50%,-50%) scale(1.02) rotate(14deg)',offset:Math.min(.97,(delay+(draw+hold)*k)/total)},{opacity:0,transform:'translate(-50%,-50%) scale(1.06) rotate(20deg)'}],{duration:total,easing:'linear',fill:'forwards'}).onfinish=()=>w.remove();
  return w;}
 function sketch(card,at,k){if(!card)return;setTimeout(()=>{const face=card.querySelector('button')||card;  const r=rect(face);const sk=el('fbh-sketch',`left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`);go(sk,[{opacity:0},{opacity:.9,offset:.1},{opacity:.6,offset:.6},{opacity:0}],{duration:1100*k,easing:'linear'});},at);}

 
 function canvas(){const W=innerWidth,H=innerHeight,cv=document.createElement('canvas');cv.className='fbh-canvas';const dpr=1;cv.width=W*dpr;cv.height=H*dpr;cv.style.cssText=`left:0;top:0;width:${W}px;height:${H}px`;layer().append(cv);const g=cv.getContext('2d');g.scale(dpr,dpr);return {cv,g,W,H};}

 function beam(g,A,T,p,fade,thick){
  const x2=A.cx+(T.cx-A.cx)*p,y2=A.cy+(T.cy-A.cy)*p;g.save();g.globalAlpha=fade;g.lineCap='round';
  for(const [w,c] of [[thick*3.4,'rgba(125,92,255,.16)'],[thick*2.4,'rgba(150,120,255,.3)'],[thick*1.5,'rgba(205,195,255,.75)'],[thick,'#ffffff']]){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(A.cx,A.cy);g.lineTo(x2,y2);g.stroke();}
  g.restore();}

 
 function run(actor){
  const k=speedK(),A=rect(actor),few=light(),arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  const PILLARS=900*k,CIRCLE=1350*k,FLASH=2750*k,FOLD=3450*k,END=4400*k;
  go(el('fbh-dark'),[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.78},{opacity:0}],{duration:END,easing:'linear'});
  const banner=el('fbh-banner','','b');banner.innerHTML='<small>黒い穴 · 魔法</small>BLACK HOLE';
  go(banner,[{transform:'translate(-50%,-50%) scale(1.2)',opacity:0,letterSpacing:'.5em'},{transform:'translate(-50%,-50%) scale(1)',opacity:1,letterSpacing:'.12em',offset:.18},{transform:'translate(-50%,-50%) scale(1.02)',opacity:1,offset:.82},{transform:'translate(-50%,-50%) scale(1.06)',opacity:0}],{duration:1700*k,delay:150*k,easing:'cubic-bezier(.2,.8,.3,1)'});
  const aura=el('fbh-aura',`left:${A.cx}px;top:${A.cy}px;width:${A.w*2}px;height:${A.h*1.7}px`);go(aura,[{opacity:0},{opacity:.7,offset:.25},{opacity:1,offset:.62},{opacity:.4,offset:.85},{opacity:0}],{duration:END,easing:'linear'});
  
  const size=Math.min(innerWidth*.92,innerHeight*.8,Math.max(A.h*2.1,240)),ccy=Math.max(size/2,Math.min(innerHeight-size/2,A.cy)),ccx=Math.max(size/2,Math.min(innerWidth-size/2,A.cx));
  circleAt(ccx,ccy,size,{draw:1250,hold:(FOLD-CIRCLE)/k-1250,fade:450,delay:CIRCLE,k});
  
  setTimeout(()=>{go(el('fbh-flash'),[{opacity:0},{opacity:.92,offset:.12},{opacity:0}],{duration:420*k,easing:'ease-out'});arena?.classList.add('fbh-shake');setTimeout(()=>arena?.classList.remove('fbh-shake'),500*k);},FLASH);
  const core=el('fbh-core',`left:${ccx}px;top:${ccy}px;width:${A.h*.9}px;height:${A.h*.9}px`);
  go(core,[{opacity:0,transform:'translate(-50%,-50%) scale(.1)'},{opacity:0,transform:'translate(-50%,-50%) scale(.1)',offset:FLASH/END},{opacity:1,transform:'translate(-50%,-50%) scale(1.15)',offset:(FLASH+250*k)/END},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:FOLD/END},{opacity:0,transform:'translate(-50%,-50%) scale(.35)'}],{duration:END,easing:'linear'});
  
  const {cv,g,W,H}=canvas();const parts=[];const t0=performance.now();let last=t0;
  const cols=Array.from({length:few?5:9},()=>({x:A.cx+rnd(-1.6,1.6)*A.w,w:rnd(6,22),d:rnd(0,500)*k}));
  function frame(now){const dt=Math.min(40,now-last);last=now;const t=now-t0;g.clearRect(0,0,W,H);
   if(t>PILLARS*.4&&t<FLASH+200*k){for(const c of cols){const u=(t-PILLARS*.4-c.d)/(1300*k);if(u<=0||u>=1)continue;const a=Math.sin(u*Math.PI)*.55;const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,`rgba(235,230,255,${a})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(c.x-c.w/2,0,c.w,H);}}
   if(t>FLASH&&t<FOLD+300*k&&Math.random()<(few?.5:.9)){const ang=rnd(0,Math.PI*2),R=size*rnd(.3,.5);parts.push({x:ccx+Math.cos(ang)*R,y:ccy+Math.sin(ang)*R,life:0,max:rnd(380,650)*k});}
   for(let q=parts.length-1;q>=0;q--){const o=parts[q];o.life+=dt;const u=o.life/o.max;if(u>=1){parts.splice(q,1);continue;}const x=o.x+(ccx-o.x)*u*u,y=o.y+(ccy-o.y)*u*u;g.globalAlpha=1-u;g.fillStyle=u<.5?'#fff':'#c7b6ff';g.beginPath();g.arc(x,y,2.2*(1-u)+.6,0,Math.PI*2);g.fill();}
   g.globalAlpha=1;if(t<END||parts.length)requestAnimationFrame(frame);else cv.remove();}
  requestAnimationFrame(frame);}

 
 function reflect(fromEl,toEl,at,withSound){
  const k=speedK();setTimeout(()=>{if(!fromEl.isConnected||!toEl.isConnected)return;const A=rect(fromEl.querySelector('button')||fromEl),T=rect(toEl.querySelector('button')||toEl),few=light();
   if(withSound&&typeof playTransformVoice==='function'&&typeof state!=='undefined'&&state.sound){try{if(typeof prepareTransformVoice==='function')prepareTransformVoice('bhreflect');playTransformVoice('bhreflect');}catch{}}
   const size=Math.min(innerWidth*.6,Math.max(A.h*1.5,170));
   circleAt(A.cx,A.cy,size,{draw:260,hold:700,fade:350,k});
   const core=el('fbh-core',`left:${A.cx}px;top:${A.cy}px;width:${A.h*.6}px;height:${A.h*.6}px`);go(core,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.1)',offset:.2},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.55},{opacity:0,transform:'translate(-50%,-50%) scale(.3)'}],{duration:1100*k,easing:'ease-out'});
   const {cv,g,W,H}=canvas();const t0=performance.now(),FIRE=300*k,ARRIVE=470*k,END=1250*k,thick=Math.max(10,Math.min(A.w,T.w)*.32);
   const orb=el('fbh-orb',`left:${T.cx}px;top:${T.cy}px;width:${T.h*1.5}px;height:${T.h*1.5}px`);go(orb,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:0,transform:'translate(-50%,-50%) scale(.2)',offset:ARRIVE/END},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:(ARRIVE+120*k)/END},{opacity:.8,transform:'translate(-50%,-50%) scale(1.15)',offset:.75},{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'}],{duration:END,easing:'linear'});
   function frame(now){const t=now-t0;g.clearRect(0,0,W,H);
    if(t>=FIRE&&t<END){const p=Math.min(1,(t-FIRE)/(ARRIVE-FIRE)),fade=t>END-300*k?Math.max(0,(END-t)/(300*k)):1;beam(g,A,T,p,fade,thick*(t>ARRIVE?1+Math.sin((t-ARRIVE)/40)*.06:1));
     if(!few&&t>ARRIVE)for(let q=0;q<3;q++){const s=rnd(0,1),x=A.cx+(T.cx-A.cx)*s,y=A.cy+(T.cy-A.cy)*s;g.globalAlpha=fade*.8;g.fillStyle='#fff';g.fillRect(x+rnd(-thick,thick),y+rnd(-thick,thick),rnd(1,3),rnd(6,16));}g.globalAlpha=1;}
    if(t<END)requestAnimationFrame(frame);else cv.remove();}
   requestAnimationFrame(frame);
   setTimeout(()=>go(el('fbh-flash'),[{opacity:0},{opacity:.7,offset:.15},{opacity:0}],{duration:300*k,easing:'ease-out'}),ARRIVE);
   sketch(toEl,ARRIVE,k);
  },at);}

 const find=(side,id)=>document.querySelector('.story-battle .story-team-row.'+side+' [data-fighter-id="'+id+'"]');
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||typeof storyAnimating==='undefined'||!storyAnimating)return;if(typeof reducedMotion==='function'&&reducedMotion())return;
  const I=storyImpact;
  if(I.action==='blackhole'&&!played.has(I)){const actor=document.querySelector('.story-battle .uses-blackhole');if(actor){played.add(I);run(actor);}}
  if(playedReflect.has(I))return;
  
  const rs=(I.reflects||[]).filter(r=>r.bh);
  if(rs.length){const pairs=rs.map(r=>[find('players',r.player),find('enemies',r.enemy)]);if(pairs.some(([a,b])=>!a||!b))return;playedReflect.add(I);const at=moment('--counter-moment');pairs.forEach(([a,b],i)=>reflect(a,b,Math.max(0,at-470*speedK())+i*140,i===0&&I.action!=='blackhole'));return;}
  
  const ds=I.bhReflects||[];
  if(ds.length){const pairs=ds.map(r=>[find('enemies',r.from),find('players',r.to)]);if(pairs.some(([a,b])=>!a||!b))return;playedReflect.add(I);const at=moment('--hit-moment');pairs.forEach(([a,b],i)=>reflect(a,b,Math.max(0,at-470*speedK())+i*140,i===0));}
 }catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"frieren-bh.js");}

/* seiichi-fx.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const light=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}};
 const played=new WeakSet();
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('szLayer')||document.createElement('div');L.id='szLayer';L.className='sz-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 
 function ended(){return !!document.querySelector('.story-end-screen')||!document.querySelector('.story-battle');}
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 const glow=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;})();
 const tint={};function sprite(col){if(tint[col])return tint[col];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.drawImage(glow,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,64,64);return tint[col]=c;}
 const fire=t=>t<.12?'#fff4d6':t<.3?'#ffd25a':t<.55?'#ff7a2a':t<.8?'#e8361a':'#8a1206';
 
 function feather(g,len,burn){const w=len*.24;g.beginPath();g.moveTo(0,-len/2);g.bezierCurveTo(w,-len*.25,w*.9,len*.25,0,len/2);g.bezierCurveTo(-w*.9,len*.25,-w,-len*.25,0,-len/2);
  const gr=g.createLinearGradient(0,-len/2,0,len/2);
  if(burn<=0){gr.addColorStop(0,'#2a2f45');gr.addColorStop(.5,'#0b0c14');gr.addColorStop(1,'#000');}
  else{gr.addColorStop(0,burn>.5?'#fff2c0':'#3a1a12');gr.addColorStop(.45,burn>.3?'#ff6a1a':'#2a0d08');gr.addColorStop(1,burn>.6?'#c21a06':'#0b0404');}
  g.fillStyle=gr;g.fill();g.strokeStyle=burn>0?'rgba(255,190,90,'+(.4+.6*burn)+')':'rgba(120,140,200,.45)';g.lineWidth=1;g.beginPath();g.moveTo(0,-len/2);g.lineTo(0,len/2);g.stroke();
  g.strokeStyle=burn>0?'rgba(255,120,40,.5)':'rgba(70,80,120,.5)';for(let i=-3;i<=3;i++){const y=i*len/8;g.beginPath();g.moveTo(0,y);g.lineTo(w*.8,y-len/10);g.moveTo(0,y);g.lineTo(-w*.8,y-len/10);g.stroke();}}
 
 
 const WING_IMG={};function wingImg(){if(!WING_IMG.c){const i=new Image();i.decoding='async';i.src='https://yurocollection.fr/assets/seiichi-wing.webp';WING_IMG.c=i;}return WING_IMG.c;}
 try{wingImg();}catch{}
 const WX=170,WY=600,WW=1280;
 
 const ARM=[{x:0,y:600},{x:170,y:600},{x:225,y:118},{x:520,y:60},{x:800,y:70},{x:1250,y:140},{x:1400,y:170}];
 function armAt(x){for(let i=1;i<ARM.length;i++)if(ARM[i].x>=x){const p=ARM[i-1],q=ARM[i],f=(x-p.x)/(q.x-p.x||1);return {x,y:p.y+(q.y-p.y)*f};}return ARM[ARM.length-1];}
 
 
 function runWings(card,mode,healed=[],delay=0){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),few=light(),W=innerWidth,H=innerHeight,suz=mode==='suzaku';
  const SW=suz?1750*k:0,GROW=450*k,BURST=suz?SW:650*k,OPEN=BURST+260*k,HEAL=2100*k,FADE=suz?2900*k:(270+2*1100+400+1500)*k,END=suz?3600*k:(270+2*1100+400+1500+600)*k;
  const dpr=Math.min(2,devicePixelRatio||1),cv=el('sz-canvas','left:0;top:0;width:'+W+'px;height:'+H+'px','canvas');cv.width=W*dpr;cv.height=H*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);
  const embers=[],feathers=[],lines=[];const sp=(x,y,vx,vy,life,size,col)=>embers.push({x,y,vx,vy,life,age:0,size,col});
  let A=null,targets=[],start=0,last=0,burst=false,rained=false;
  const NSW=suz?(few?28:56):0,swirl=Array.from({length:NSW},(_,i)=>({a:i/NSW*Math.PI*2,r0:0,len:rnd(14,28),delay:rnd(0,.35),ign:rnd(.45,.8)}));
  
  
  
  
  
  const CYC=1100*k,NF=2,T0=GROW*.6,SETTLE=400*k,HOLDP=.65;
  function stroke(t){if(t<0)return 0;if(t<NF*CYC){const u=t/CYC%1;return u<.4?ease(u/.4):1-ease((u-.4)/.6);}const e=ease(clamp((t-NF*CYC)/SETTLE));return HOLDP*e+Math.sin((t-NF*CYC)/1000/k*2.4)*.03*e;}
  function pose(t){const o=ease(clamp(t/(GROW*1.3))),p=stroke(t-T0)*o,pl=stroke(t-T0-110*k)*o;
   const ang=p=>.85-1.15*p;return {o,F:ang(p)+(1-o)*.3,lag:ang(pl)+(1-o)*.3,sx:(.3+.7*o)*(.42+.58*p),sy:.35+.65*o};}
  function frame(now){if(ended()){cv.remove();card.classList.remove('sz-actor','sz-gaibu');return;}if(!start){start=now;last=now;A=rect(card);targets=(healed.length?healed:[]).map(rect);for(const f of swirl)f.r0=rnd(.9,1.6)*Math.max(A.w,A.h)*.8;}const t=now-start,dt=Math.min(50,now-last)/1000;last=now;g.clearRect(0,0,W,H);
   const S=A.h*1.05,y0=A.y+A.h*.28,fade=1-clamp((t-FADE)/(END-FADE-200*k));
   
   if(t<(suz?FADE:BURST+1500*k)&&Math.random()<(few?.7:1))for(let i=0;i<(few?1:2);i++)sp(A.x+rnd(.05,.95)*A.w,A.y+A.h*rnd(.75,1),rnd(-15,15),rnd(-170,-70),rnd(.4,.8),rnd(12,26)*(suz&&t>SW*.5&&t<OPEN?1.4:1),suz?fire(rnd(0,.7)):(Math.random()<.6?'#3a3f55':'#ff7a2a'));
   
   if(suz&&t<SW+120*k){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.25+.5*clamp(t/SW);g.drawImage(sprite('#ff5a1a'),A.cx-S*.8,A.cy-S*.7,S*1.6,S*1.4);g.restore();
    for(const f of swirl){const lt=t/SW-f.delay*.4;if(lt<0)continue;const p=clamp(lt/(1-f.delay*.4)),burn=clamp((p-f.ign)/.2),spin=f.a+p*Math.PI*3.2,rr=f.r0*(1-ease(p)*.85),x=A.cx+Math.cos(spin)*rr,y=A.cy+Math.sin(spin)*rr*.72,al=clamp(lt*6)*(1-clamp((t-SW)/(120*k)));
     g.save();g.translate(x,y);g.rotate(spin+Math.PI/2);g.globalAlpha=al;feather(g,f.len*(1+burn*.3),burn);g.restore();if(burn>.5&&Math.random()<(few?.15:.3))sp(x,y,rnd(-20,20),rnd(-80,-20),rnd(.25,.45),rnd(8,16),fire(rnd(0,.5)));}}
   
   if(!suz&&fade>0){const img=wingImg();if(img.complete&&img.naturalWidth){const P=pose(t),D=A.h*1.05,N=few?6:10,bend=(P.F-P.lag)*2.4;g.save();g.globalAlpha=fade*clamp(P.o*1.5);
     g.beginPath();g.rect(0,0,W,H);g.rect(A.x+A.w,A.y,-A.w,A.h);g.clip('evenodd');
     for(const side of [1,-1]){g.save();g.translate(A.cx+side*A.w*.3,y0);g.scale(side*P.sx,P.sy);g.rotate(-P.F);g.scale(D/1024,D/1024);g.translate(-WX,-WY);g.shadowColor='rgba(185,195,255,.75)';g.shadowBlur=4;
      for(let i=0;i<N;i++){const x0=i?WX+(WW-WX)*i/N:-10,x1=WX+(WW-WX)*(i+1)/N;g.save();g.beginPath();g.rect(x0-2,-10,x1-x0+4,1044);g.clip();g.drawImage(img,0,0,WW,1024);g.restore();
       const j=armAt(x1),w=(i+1)/N;g.translate(j.x,j.y);g.rotate(bend*w*2/N);g.translate(-j.x,-j.y);}
      g.restore();}
     g.restore();}}
   
   if(!burst&&t>=BURST){burst=true;go(el('sz-negative'),[{opacity:1},{opacity:1,offset:.6},{opacity:0}],{duration:170*k,easing:'steps(2,end)'});
    go(el('sz-flash',`left:${A.cx}px;top:${A.cy}px;width:${A.h*3}px;height:${A.h*3}px`),[{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:'translate(-50%,-50%) scale(1.4)',opacity:0}],{duration:600*k,delay:150*k,easing:'ease-out'});
    for(let i=0;i<(few?14:28);i++){const a=-Math.PI/2+rnd(-1.4,1.4);lines.push({a,r:rnd(.2,.5)*S,len:rnd(.5,1.1)*S,age:0,life:rnd(.25,.45)});}
    for(let i=0;i<(few?30:70);i++){const a=rnd(-Math.PI,0),v=rnd(120,380);sp(A.cx,A.cy-A.h*.1,Math.cos(a)*v,Math.sin(a)*v,rnd(.5,1),rnd(10,22),suz?fire(rnd(0,.7)):(Math.random()<.5?'#ff7a2a':'#3a3f55'));}
    for(let i=0;i<(few?20:(suz?30:60));i++){const a=rnd(-Math.PI,0),v=rnd(80,300);feathers.push({x:A.cx+rnd(-A.w,A.w)*.6,y:A.y+rnd(0,A.h*.5),vx:Math.cos(a)*v,vy:Math.sin(a)*v,rot:rnd(0,6),vr:rnd(-5,5),len:rnd(12,24),age:0,life:rnd(1.3,2.2),burn:suz&&Math.random()<.6});}
    if(!suz)go(el('sz-banner gaibu',`left:${A.cx}px;top:${Math.max(30,A.y-A.h*.5)}px`),[{transform:'translate(-50%,0) scale(.8)',opacity:0},{transform:'translate(-50%,0) scale(1)',opacity:1,offset:.15},{transform:'translate(-50%,0) scale(1)',opacity:1,offset:.8},{transform:'translate(-50%,-8px) scale(1.02)',opacity:0}],{duration:1600*k,easing:'ease-out'}).effect.target.innerHTML='<small>外部・朱雀</small>GAIBU SUZAKU';}
   
   g.save();g.strokeStyle='rgba(255,240,220,.85)';g.lineCap='round';for(let i=lines.length-1;i>=0;i--){const l=lines[i];l.age+=dt/k;if(l.age>l.life){lines.splice(i,1);continue;}const p=l.age/l.life,r=l.r+p*S*1.2;g.globalAlpha=1-p;g.lineWidth=2.2*(1-p)+.5;g.beginPath();g.moveTo(A.cx+Math.cos(l.a)*r,A.cy+Math.sin(l.a)*r);g.lineTo(A.cx+Math.cos(l.a)*(r+l.len),A.cy+Math.sin(l.a)*(r+l.len));g.stroke();}g.restore();
   
   if(suz&&t>HEAL-200*k&&t<HEAL+500*k)for(const r of targets)for(let i=0;i<(few?1:3);i++)sp(r.x+rnd(.1,.9)*r.w,r.y-rnd(0,40),rnd(-15,15),rnd(180,340),rnd(.35,.6),rnd(8,16),Math.random()<.35?'#8affc0':fire(rnd(.05,.5)));
   if(suz&&!rained&&t>HEAL+250*k){rained=true;for(const r of targets)go(el('sz-heal',`left:${r.cx}px;top:${r.cy}px;width:${r.w*1.5}px;height:${r.h*1.2}px`),[{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.3},{transform:'translate(-50%,-55%) scale(1.15)',opacity:0}],{duration:900*k,easing:'ease-out'});}
   
   for(let i=feathers.length-1;i>=0;i--){const f=feathers[i];f.age+=dt/k;if(f.age>f.life){feathers.splice(i,1);continue;}f.vy+=110*dt/k;f.vx*=.985;f.x+=f.vx*dt/k+Math.sin(f.age*4+f.rot)*.6;f.y+=f.vy*dt/k;f.rot+=f.vr*dt/k;g.save();g.translate(f.x,f.y);g.rotate(f.rot);g.globalAlpha=1-f.age/f.life;feather(g,f.len,f.burn?clamp(f.age*1.5):0);g.restore();}
   
   g.save();g.globalCompositeOperation='lighter';for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.age+=dt/k;if(e.age>e.life){embers.splice(i,1);continue;}e.x+=e.vx*dt/k;e.y+=e.vy*dt/k;const a=1-e.age/e.life,s=e.size*(.5+a*.5);g.globalAlpha=a;g.drawImage(sprite(e.col),e.x-s/2,e.y-s/2,s,s);}g.restore();
   if(t<END||feathers.length||embers.length)requestAnimationFrame(frame);else cv.remove();}
  setTimeout(()=>{if(ended()){cv.remove();return;}card.classList.add(suz?'sz-actor':'sz-gaibu');setTimeout(()=>card.classList.remove('sz-actor','sz-gaibu'),END);if(suz)go(el('sz-dark'),[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.75},{opacity:0}],{duration:END,easing:'ease-out'});requestAnimationFrame(frame);},delay);}
 
 
 function runIai(actor,target,at){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),few=light(),W=innerWidth,H=innerHeight,PRE=170*k,END=PRE+750*k;
  setTimeout(()=>{const A=rect(actor),T=rect(target),dpr=Math.min(2,devicePixelRatio||1),cv=el('sz-canvas','left:0;top:0;width:'+W+'px;height:'+H+'px','canvas');cv.width=W*dpr;cv.height=H*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);
   actor.classList.add('sz-iai');setTimeout(()=>actor.classList.remove('sz-iai'),PRE+260*k);
   const sparks=[],bits=[],len=Math.hypot(T.w,T.h)*.75,ang=-Math.PI/4+rnd(-.15,.15),cx=T.cx,cy=T.cy,dx=Math.cos(ang),dy=Math.sin(ang);let start=0,last=0,hit=false;
   function frame(now){if(ended()){cv.remove();return;}if(!start){start=now;last=now;}const t=now-start,dt=Math.min(50,now-last)/1000;last=now;g.clearRect(0,0,W,H);
    
    if(t<PRE+180*k){const p=clamp(t/PRE),f=1-clamp((t-PRE)/(180*k));g.save();g.lineCap='round';
     for(let i=-2;i<=2;i++){const off=i*Math.min(A.w,T.w)*.12,nx=-(T.cy-A.cy),ny=T.cx-A.cx,nl=Math.hypot(nx,ny)||1,ox=nx/nl*off,oy=ny/nl*off,x0=A.cx+ox,y0=A.cy+oy,x1=A.cx+(T.cx-A.cx)*p+ox,y1=A.cy+(T.cy-A.cy)*p+oy;
      const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,'+(.9-Math.abs(i)*.25)*f+')');g.strokeStyle=gr;g.lineWidth=(i?1.5:3.5);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();}
     g.restore();}
    if(!hit&&t>=PRE){hit=true;
     go(el('sz-iai-flash',`left:${T.cx}px;top:${T.cy}px;width:${T.w*2.6}px;height:${T.w*2.6}px`),[{transform:'translate(-50%,-50%) scale(.4)',opacity:1},{transform:'translate(-50%,-50%) scale(1.2)',opacity:0}],{duration:380*k,easing:'ease-out'});
     go(el('sz-iai-word',`left:${T.cx+T.w*.55}px;top:${T.y+T.h*.1}px`),[{transform:'translate(-50%,0) scale(1.25)',opacity:0},{transform:'translate(-50%,0) scale(1)',opacity:1,offset:.12},{transform:'translate(-50%,0) scale(1)',opacity:1,offset:.7},{transform:'translate(-50%,-6px) scale(1)',opacity:0}],{duration:700*k,easing:'ease-out'}).effect.target.textContent='居合';
     for(let i=0;i<(few?14:30);i++){const u=rnd(-1,1),v=rnd(80,420),a=ang+(Math.random()<.5?-1:1)*Math.PI/2+rnd(-.5,.5);sparks.push({x:cx+dx*len*u*.5,y:cy+dy*len*u*.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,life:rnd(.15,.4),s:rnd(5,11)});}
     for(let i=0;i<(few?3:6);i++)bits.push({x:cx+rnd(-.3,.3)*T.w,y:cy+rnd(-.3,.3)*T.h,vx:rnd(-60,60),vy:rnd(-140,-40),rot:rnd(0,6),vr:rnd(-6,6),len:rnd(12,20),age:0,life:rnd(.8,1.2)});}
    
    if(t>=PRE){const p=clamp((t-PRE)/(70*k)),q=clamp((t-PRE-110*k)/(420*k)),a=1-q,half=len*(.5+.15*q);g.save();g.lineCap='round';g.globalCompositeOperation='lighter';
     const sx=cx-dx*half,sy=cy-dy*half,ex=sx+dx*half*2*p,ey=sy+dy*half*2*p,gap=q*Math.min(T.w,T.h)*.06,nx=-dy*gap,ny=dx*gap;
     for(const sgn of q>0?[1,-1]:[0]){g.shadowColor='rgba(220,235,255,1)';g.shadowBlur=18;g.strokeStyle='rgba(255,255,255,'+a+')';g.lineWidth=(q>0?2.4:4)*(1-q*.5);g.beginPath();g.moveTo(sx+nx*sgn,sy+ny*sgn);g.lineTo(ex+nx*sgn,ey+ny*sgn);g.stroke();}
     g.shadowBlur=0;g.strokeStyle='rgba(190,215,255,'+(.5*a)+')';g.lineWidth=10*(1-q);g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.stroke();g.restore();}
    g.save();g.globalCompositeOperation='lighter';for(let i=sparks.length-1;i>=0;i--){const e=sparks[i];e.age+=dt/k;if(e.age>e.life){sparks.splice(i,1);continue;}e.x+=e.vx*dt/k;e.y+=e.vy*dt/k;const a=1-e.age/e.life;g.globalAlpha=a;g.drawImage(sprite('#eef4ff'),e.x-e.s/2,e.y-e.s/2,e.s,e.s);}g.restore();
    for(let i=bits.length-1;i>=0;i--){const f=bits[i];f.age+=dt/k;if(f.age>f.life){bits.splice(i,1);continue;}f.vy+=260*dt/k;f.x+=f.vx*dt/k;f.y+=f.vy*dt/k;f.rot+=f.vr*dt/k;g.save();g.translate(f.x,f.y);g.rotate(f.rot);g.globalAlpha=1-f.age/f.life;feather(g,f.len,0);g.restore();}
    if(t<END||sparks.length||bits.length)requestAnimationFrame(frame);else cv.remove();}
   requestAnimationFrame(frame);},Math.max(0,at-PRE));}
 function runSuzaku(actor,healed){runWings(actor,'suzaku',healed);}
 function runGaibu(card,delay){runWings(card,'gaibu',[],delay);}
 
 function moment(name){try{const b=document.querySelector('.story-battle');if(!b)return 600;const p=document.createElement('i');p.style.cssText='position:absolute;animation-delay:var('+name+',.6s)';b.append(p);const v=getComputedStyle(p).animationDelay;p.remove();return parseFloat(v)*(/ms/.test(v)?1:1000)||600;}catch{return 600;}}
 const playedIai=new WeakSet();
 const seiichiCardId=id=>{try{const c=(typeof cards!=='undefined'?cards:[]).find(x=>String(x.id)===String(id));return !!c&&typeof isSeiichiName==='function'&&isSeiichiName(c);}catch{return false;}};
 function checkIai(){if(playedIai.has(storyImpact))return;const I=storyImpact,base=!I.action||I.action==='attack';
   const lunge=document.querySelector('.story-battle .story-fighter.attack-lunge');
   if(base&&lunge&&seiichiCardId(lunge.dataset.fighterId)){const target=document.querySelector('.story-battle .story-fighter.impact-hit')||document.querySelector('.story-battle [data-fighter-id="'+I.enemy+'"]');if(!target)return;playedIai.add(I);if(typeof reducedMotion==='function'&&reducedMotion())return;runIai(lunge,target,moment('--hit-moment'));return;}
   const cl=document.querySelector('.story-battle .story-fighter.counter-lunge');
   if(cl&&seiichiCardId(cl.dataset.fighterId)){const target=document.querySelector('.story-battle .story-fighter.counter-hit')||document.querySelector('.story-battle .players [data-fighter-id="'+I.player+'"]');if(!target)return;playedIai.add(I);if(typeof reducedMotion==='function'&&reducedMotion())return;runIai(cl,target,moment('--counter-moment'));}}
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||typeof storyAnimating==='undefined'||!storyAnimating)return;checkIai();if(played.has(storyImpact))return;
   if(storyImpact.action==='guerison'){const actor=document.querySelector('.story-battle .uses-guerison');if(!actor)return;played.add(storyImpact);if(typeof reducedMotion==='function'&&reducedMotion())return;runSuzaku(actor,[...document.querySelectorAll('.story-battle .guerison-healed')]);}
   if(storyImpact.seiichiRise!==undefined){const card=document.querySelector('.story-battle [data-fighter-id="'+storyImpact.seiichiRise+'"]');if(!card)return;played.add(storyImpact);if(typeof reducedMotion==='function'&&reducedMotion())return;runGaibu(card,moment(storyImpact.seiichiRiseAt==='hit'?'--hit-moment':'--counter-moment'));}}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&ended()){L.replaceChildren();for(const c of document.querySelectorAll('.sz-actor,.sz-gaibu'))c.classList.remove('sz-actor','sz-gaibu');return;}if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"seiichi-fx.js");}

/* hashirama-senpo.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const fxN=n=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760?Math.ceil(n*.55):n;}catch{return n;}};
 const played=new WeakSet();
 const muted=()=>typeof state!=='undefined'&&state.sound===false;
  
 function fadeOut(a,ms=900){if(!a||a.paused||a.__fading)return;a.__fading=true;const v0=a.volume,t0=performance.now();const step=()=>{const p=Math.min(1,(performance.now()-t0)/ms);a.volume=Math.max(0,v0*(1-p)*(1-p));if(p<1&&!a.paused)requestAnimationFrame(step);else{a.pause();}};requestAnimationFrame(step);}
 let voice=null;function sfx(endMs){try{if(muted())return null;voice=voice||new Audio('https://yurocollection.fr/assets/hashirama-senpo-mokuton.mp3');const a=voice.cloneNode();a.volume=.6;a.play().catch(()=>{});
   a.addEventListener('timeupdate',()=>{if(a.duration&&a.duration-a.currentTime<=.9)fadeOut(a,Math.max(200,(a.duration-a.currentTime)*1000));});
   if(endMs)setTimeout(()=>fadeOut(a,700),Math.max(0,endMs-700));return a;}catch{return null;}}
  
 let ac=null;function thud(strength=1){try{if(muted())return;ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const t=ac.currentTime,out=ac.createGain();out.gain.value=.55*strength;out.connect(ac.destination);
   const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.22);g.gain.setValueAtTime(1,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g).connect(out);o.start(t);o.stop(t+.32);
   const len=Math.floor(ac.sampleRate*.12),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
   const n=ac.createBufferSource(),f=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=b;f.type='bandpass';f.frequency.value=900;f.Q.value=.9;ng.gain.value=.8;n.connect(f).connect(ng).connect(out);n.start(t);}catch{}}
  
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('hsLayer')||document.createElement('div');L.id='hsLayer';L.className='hs-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i',parent){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;(parent||layer()).append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const HITS=[2750,3250,3750,4300]; 
 function run(actor,target){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rect(actor),T=rect(target),W=innerWidth,H=innerHeight,END=5600*k;
  const arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  sfx(END+400);
  go(el('hs-veil'),[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.86},{opacity:0}],{duration:END});
  const t=el('hs-title','','div');t.innerHTML='<b lang="ja">仙法・木遁</b><span>SENPO MOKUTON</span>';
  go(t,[{opacity:0,transform:'translate(-50%,-50%) scale(1.3)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.07},{opacity:1,offset:.36},{opacity:0,transform:'translate(-50%,-50%) scale(.96)',offset:.46},{opacity:0}],{duration:END});
  for(let i=0;i<fxN(36);i++){const leaf=el('hs-leaf',`left:${rnd(0,W)}px;top:${H+10}px;--h:${Math.round(rnd(95,135))}`);go(leaf,[{transform:'translate(0,0) rotate(0)',opacity:0},{opacity:.9,offset:.15},{transform:`translate(${rnd(-120,120)}px,-${rnd(H*.5,H*1.05)}px) rotate(${rnd(-540,540)}deg)`,opacity:0}],{duration:rnd(2400,3800)*k,delay:rnd(0,1600)*k,easing:'cubic-bezier(.2,.6,.3,1)'});}
  
  const size=Math.min(H*.6,W*.5,470),lean=Math.round(Math.max(-W*.3,Math.min(W*.3,(T.cx-A.cx)*.5))),rise=-size*.92;
  const wrap=el('hs-statue-wrap',`width:${size}px;height:${size}px;left:${A.cx}px;top:${A.y+A.h}px`,'div');
  const st=el('hs-statue','','img',wrap);st.src='https://yurocollection.fr/assets/hashirama-statue.webp';st.alt='';
  wrap.animate([
   {transform:'translate(-50%,0) scale(.55)',opacity:0,filter:'brightness(.4)',easing:'cubic-bezier(.2,.8,.3,1)'},
   {transform:`translate(-50%,${rise}px) scale(1)`,opacity:1,filter:'brightness(1)',offset:.3,easing:'cubic-bezier(.5,0,.3,1)'},
   {transform:`translate(-50%,${rise*.9}px) translateX(${lean}px) scale(1.04)`,opacity:1,filter:'brightness(1)',offset:.42},
   {transform:`translate(-50%,${rise*.9}px) translateX(${lean}px) scale(1.04)`,opacity:1,filter:'brightness(1)',offset:.84,easing:'cubic-bezier(.5,0,.8,.4)'},
   {transform:'translate(-50%,0) scale(.7)',opacity:0,filter:'brightness(.4)'}
  ],{duration:END,fill:'forwards'}).onfinish=()=>wrap.remove(); 
  for(let i=0;i<fxN(14);i++){const p=el('hs-dust',`left:${A.cx+rnd(-size*.4,size*.4)}px;top:${A.y+A.h}px`);go(p,[{transform:'translate(-50%,-50%) scale(.3)',opacity:.8},{transform:`translate(-50%,-50%) translate(${rnd(-80,80)}px,-${rnd(20,70)}px) scale(${rnd(1.6,2.6)})`,opacity:0}],{duration:1300*k,delay:rnd(150,700)*k,easing:'ease-out'});}
  
  const sx=A.cx+lean,sy=A.y+A.h+rise*.9+size/2,dx=(T.cx-sx)*.72,dy=(T.cy-sy)*.72;
  HITS.forEach((ms,n)=>{const at=ms*k,tilt=(n%2?1:-1)*5,last=n===HITS.length-1;
   st.animate([{transform:'translate(0,0) scale(1) rotate(0)'},{transform:`translate(${dx}px,${dy}px) scale(${last?1.2:1.12}) rotate(${tilt}deg)`,offset:.35,easing:'cubic-bezier(.2,.9,.3,1)'},{transform:'translate(0,0) scale(1) rotate(0)'}],{duration:(last?520:420)*k,delay:at-150*k,easing:'ease-in'});
   setTimeout(()=>{thud(last?1.25:1);
    const ring=el('hs-ring',`left:${T.cx}px;top:${T.cy}px`);go(ring,[{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:`translate(-50%,-50%) scale(${2.2+n*.35})`,opacity:0}],{duration:520*k,easing:'ease-out'});
    for(let i=0;i<fxN(last?16:10);i++){const s=el('hs-splinter',`left:${T.cx}px;top:${T.cy}px;rotate:${rnd(0,360)}deg`);go(s,[{transform:'translate(-50%,-50%) translate(0,0)',opacity:1},{transform:`translate(-50%,-50%) translate(${rnd(-170,170)}px,${rnd(-150,100)}px)`,opacity:0}],{duration:rnd(500,850)*k,easing:'cubic-bezier(.1,.7,.3,1)'});}
    target.classList.remove('hs-struck');void target.offsetWidth;target.classList.add('hs-struck');
    arena?.classList.remove('hs-shake');void arena?.offsetWidth;arena?.classList.add('hs-shake');
   },at);
  });
  setTimeout(()=>{target.classList.remove('hs-struck');arena?.classList.remove('hs-shake');},(HITS[HITS.length-1]+700)*k);
 }
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='senpo'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-senpo');if(!actor)return;
   const main=document.querySelector('.story-battle [data-story-target="'+storyImpact.senpoTarget+'"],.story-battle [data-infinity-target="'+storyImpact.senpoTarget+'"],.story-battle [data-duel-target="'+storyImpact.senpoTarget+'"]'),target=(main&&(main.closest('.senpo-hit')||main.parentElement))||document.querySelector('.senpo-hit');if(!target)return;played.add(storyImpact);
   if(typeof reducedMotion==='function'&&reducedMotion()){sfx();return;}run(actor,target);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"hashirama-senpo.js");}

/* black-freezer-orb.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const fxN=n=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760?Math.ceil(n*.55):n;}catch{return n;}};
 const played=new WeakSet();
 const muted=()=>typeof state!=='undefined'&&state.sound===false;
  
 function fadeOut(a,ms=800){if(!a||a.paused||a.__fading)return;a.__fading=true;const v0=a.volume,t0=performance.now();const step=()=>{const p=Math.min(1,(performance.now()-t0)/ms);a.volume=Math.max(0,v0*(1-p)*(1-p));if(p<1&&!a.paused)requestAnimationFrame(step);else a.pause();};requestAnimationFrame(step);}
 let laugh=null;function sfx(endMs){try{if(muted())return;laugh=laugh||new Audio('https://yurocollection.fr/assets/black-freezer-orb.mp3');const a=laugh.cloneNode();a.volume=1;a.play().catch(()=>{});
   a.addEventListener('timeupdate',()=>{if(a.duration&&a.duration-a.currentTime<=.8)fadeOut(a,Math.max(200,(a.duration-a.currentTime)*1000));});
   if(endMs)setTimeout(()=>fadeOut(a,700),Math.max(0,endMs-700));}catch{}}
 

 let ac=null;const bufs={};
 function decoded(file){ac=ac||new (window.AudioContext||window.webkitAudioContext)();return bufs[file]||(bufs[file]=fetch('https://yurocollection.fr/assets/'+file).then(r=>r.arrayBuffer()).then(x=>ac.decodeAudioData(x)).catch(()=>null));}
 function clip(file,start,dur,vol){try{if(muted())return;const p=decoded(file);if(ac.state==='suspended')ac.resume();p.then(buf=>{if(!buf)return;const t=ac.currentTime,s=dur/1000,fo=Math.min(.5,s*.4),src=ac.createBufferSource(),g=ac.createGain();src.buffer=buf;
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.08);g.gain.setValueAtTime(vol,t+s-fo);g.gain.exponentialRampToValueAtTime(.0001,t+s);src.connect(g).connect(ac.destination);src.start(t,start,s+.05);}).catch(()=>{});}catch{}}
 const boom=()=>clip('cid-atomic.mp3',4.9,2300,.95);
  
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('bfLayer')||document.createElement('div');L.id='bfLayer';L.className='bf-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i',parent){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;(parent||layer()).append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function run(actor,target){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),A=rect(actor),T=rect(target),W=innerWidth,H=innerHeight,END=4000*k,THROW=1900*k,HIT=2100*k,APPEAR=300*k,FULL=950*k;  
  const arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  decoded('cid-atomic.mp3'); 
  sfx(END+300);
  go(el('bf-veil'),[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.82},{opacity:0}],{duration:END});
   
  
  const art=actor.querySelector('.tcg-card-portrait,.portrait-card,img')||actor,C=rect(art),right=T.cx>=C.cx;
  const R=Math.min(84,Math.max(56,C.w*.5)),ox=right?C.x+C.w:C.x,oy=Math.max(R*.5,C.y),D=HIT+120*k;
   
  const orb=el('bf-orb',`left:${ox}px;top:${oy}px;width:${R*1.8}px;height:${R*1.8}px`,'div');el('bf-orb-img','','i',orb);
  orb.animate([
   {transform:'translate(-50%,-50%) scale(.2)',opacity:0,offset:0},
   {transform:'translate(-50%,-50%) scale(.2)',opacity:0,offset:APPEAR/D},
   {transform:'translate(-50%,-50%) scale(.4)',opacity:1,offset:(APPEAR+120*k)/D,easing:'cubic-bezier(.2,.7,.3,1)'},
   {transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:FULL/D},
   {transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:THROW/D,easing:'cubic-bezier(.7,0,1,.6)'},
   {transform:`translate(-50%,-50%) translate(${T.cx-ox}px,${T.cy-oy}px) scale(1)`,opacity:1,offset:HIT/D},
   {transform:`translate(-50%,-50%) translate(${T.cx-ox}px,${T.cy-oy}px) scale(.55)`,opacity:0}
  ],{duration:D,fill:'forwards'}).onfinish=()=>orb.remove();
  
  setTimeout(()=>{const len=Math.hypot(T.cx-ox,T.cy-oy),ang=Math.atan2(T.cy-oy,T.cx-ox)*180/Math.PI;const tr=el('bf-trail',`left:${ox}px;top:${oy}px;width:${len}px;height:${R*.55}px;rotate:${ang}deg`);go(tr,[{transform:'translateY(-50%) scaleX(0)',opacity:.9},{transform:'translateY(-50%) scaleX(1)',opacity:.8,offset:.45},{transform:'translateY(-50%) scaleX(1)',opacity:0}],{duration:(HIT-THROW)+350*k,easing:'ease-out'});},THROW);
  
  const big=Math.max(300,Math.min(W,H)*.62);
  setTimeout(()=>{boom();
   const dome=el('bf-dome',`left:${T.cx}px;top:${T.cy}px;width:${big}px;height:${big}px`,'div');el('bf-orb-img','','i',dome);
   go(dome,[{transform:'translate(-50%,-50%) scale(.18)',opacity:1},{transform:'translate(-50%,-50%) scale(.85)',opacity:1,offset:.28},{transform:'translate(-50%,-50%) scale(1.15)',opacity:0}],{duration:1150*k,easing:'cubic-bezier(.12,.8,.3,1)'});
   const glow=el('bf-glow',`left:${T.cx}px;top:${T.cy}px;width:${big*.5}px;height:${big*.5}px`);go(glow,[{transform:'translate(-50%,-50%) scale(.4)',opacity:1},{transform:'translate(-50%,-50%) scale(1.2)',opacity:0}],{duration:520*k,easing:'ease-out'});
   for(let n=0;n<2;n++){const ring=el('bf-ring',`left:${T.cx}px;top:${T.cy}px;width:${big*.4}px;height:${big*.4}px`);go(ring,[{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:`translate(-50%,-50%) scale(${2.6+n*.9})`,opacity:0}],{duration:(650+n*220)*k,delay:n*90*k,easing:'cubic-bezier(.1,.7,.3,1)'});}
   target.classList.add('bf-struck');arena?.classList.add('bf-shake');
   setTimeout(()=>{target.classList.remove('bf-struck');arena?.classList.remove('bf-shake');},700*k);
  },HIT);
 }
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='orb'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-orb');if(!actor)return;
   const main=document.querySelector('.story-battle [data-story-target="'+storyImpact.orbTarget+'"],.story-battle [data-infinity-target="'+storyImpact.orbTarget+'"],.story-battle [data-duel-target="'+storyImpact.orbTarget+'"]'),target=(main&&(main.closest('.orb-hit')||main.parentElement))||document.querySelector('.orb-hit');if(!target)return;played.add(storyImpact);
   if(typeof reducedMotion==='function'&&reducedMotion()){sfx(2500);return;}run(actor,target);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"black-freezer-orb.js");}

/* shanks-kamusari.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
 if(typeof document==='undefined')return;
 const played=new WeakSet();
 const muted=()=>typeof state!=='undefined'&&state.sound===false;
 const low=()=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760;}catch{return false;}};
 function fadeOut(a,ms=800){if(!a||a.paused||a.__fading)return;a.__fading=true;const v0=a.volume,t0=performance.now();const step=()=>{const p=Math.min(1,(performance.now()-t0)/ms);a.volume=Math.max(0,v0*(1-p)*(1-p));if(p<1&&!a.paused)requestAnimationFrame(step);else a.pause();};requestAnimationFrame(step);}
 let snd=null;function sfx(endMs){try{if(muted())return;snd=snd||new Audio('https://yurocollection.fr/assets/shanks-kamusari.mp3');const a=snd.cloneNode();a.volume=1;a.play().catch(()=>{});
   if(endMs)setTimeout(()=>fadeOut(a,700),Math.max(0,endMs-700));}catch{}}
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('kmLayer')||document.createElement('div');L.id='kmLayer';L.className='km-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i',parent){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;(parent||layer()).append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'both',...o}); a.onfinish=()=>e.remove();return a;};

  
 const FRAG=`precision mediump float;
uniform vec2 R;uniform float T;uniform vec2 C;uniform vec2 K;uniform vec2 P;uniform vec2 S0;uniform vec2 S1;uniform vec2 S2;uniform float N;uniform float D;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float win(float t,float a,float b,float f){return smoothstep(a,a+f,t)*(1.-smoothstep(b-f,b,t));}
vec4 over(vec4 top,vec4 base){return top+base*(1.-top.a);}
float zz(float x,float s){float i=floor(x),f=fract(x);return mix(hash(vec2(i,s)),hash(vec2(i+1.,s)),f)-.5;}
/* distance à un éclair A→B : zigzag anguleux (3 octaves), nul aux extrémités */
float bolt(vec2 p,vec2 A,vec2 B,float sd,float amp){vec2 ba=B-A;float Ln=max(length(ba),1e-4);vec2 dr=ba/Ln,nr=vec2(-dr.y,dr.x);vec2 pa=p-A;float t=dot(pa,dr)/Ln;float tc=clamp(t,0.,1.);
 float j=(zz(tc*6.,sd)+.5*zz(tc*15.,sd+3.)+.22*zz(tc*34.,sd+7.))*sin(3.1416*tc);float off=dot(pa,nr)-j*amp*1.4;float de=(t<0.?-t:t>1.?t-1.:0.)*Ln;return length(vec2(off,de));}
vec4 boltCol(vec2 p,vec2 A,vec2 B,float sd,float amp,float a,vec3 red){float d=bolt(p,A,B,sd,amp);float fl=.75+.25*hash(vec2(sd,floor(T*40.)));vec4 o=vec4(0.);
 float g=exp(-d/.022)*.6*fl;o=over(vec4(red*g,g*a),o);float body=smoothstep(.0075,.004,d);o=over(vec4(vec3(.01,0.,0.)*body*a,body*a),o);float hot=smoothstep(.0016,.0004,d)*fl;o=over(vec4(vec3(1.,.84,.88)*hot*a,hot*a),o);return o;}
void main(){vec2 p=(gl_FragCoord.xy-.5*R)/R.y;vec4 o=vec4(0.);vec3 red=vec3(1.,.08,.12),deep=vec3(.075,0.,.006);
 float vig=smoothstep(.25,1.,length(p*vec2(.8,1.)));
 // fond : assombrissement, puis ciel rouge sombre pendant le Haki des rois
 float dk=win(T,0.,D,.35);float boom=win(T,1.62,3.3,.3);
 o=vec4(mix(vec3(.02,0.,.01),deep,boom*(1.-vig*.5)),(.4+.25*vig+.1*boom)*dk);
 // 1) aura de Haki autour de Shanks : flammes noires qui montent, liseré rouge
 {float aw=win(T,.1,2.0,.3);vec2 q=p-C;float dOut=length(max(abs(q)-K,0.));float inside=step(dOut,0.)*step(max(abs(q.x)-K.x,abs(q.y)-K.y),0.);
  float an=atan(q.x,q.y);float n=fbm(vec2(an*3.2,dOut/K.y*3.-T*2.8))*fbm(vec2(an*6.+3.,dOut/K.y*5.-T*4.));
  float reach=K.y*(.06+.5*n+max(q.y/K.y,0.)*.12);float wisp=smoothstep(reach,reach*.15,dOut)*(1.-inside)*aw;
  o=over(vec4(vec3(.025,0.,.008)*wisp,wisp*.7),o);float rim=smoothstep(reach*.55,reach*.35,dOut)*(1.-smoothstep(reach*.35,reach*.15,dOut))*(1.-inside)*aw;o=over(vec4(red*rim*.9,rim*.55),o);
  float edge=exp(-dOut/(K.y*.025))*(1.-inside)*aw;o=over(vec4(red*edge,edge*.8),o);}
 // 2) les fissures de Haki autour de Shanks sont des textures (voir cracks)
 // 3) l'entaille elle-même est dessinée avec les textures (calque DOM, voir run)
 // flash blanc à l'impact
 {float fl=exp(-pow((T-1.56)/.045,2.));o=over(vec4(vec3(1.,.93,.94)*fl*.22,fl*.22),o);}
 // 4) Haki des rois : rayons rouges et noirs en éventail depuis Shanks
 {float tr=T-1.62;if(tr>0.&&tr<1.6){vec2 d=p-C;float r=length(d),an=atan(d.y,d.x);float wedge=step(.5,fract(an*12./6.2832+tr*.15));float rays=smoothstep(.12,.55,r)*(1.-smoothstep(.85,1.55,tr));
  vec3 rc=mix(vec3(.01,0.,0.),red*.7,wedge);float ra=rays*(.07+.09*wedge)*smoothstep(0.,.08,tr);o=over(vec4(rc*ra,ra),o);}}
 // ondes de choc : anneau noir épais + liseré rouge (depuis Shanks et depuis la cible)
 for(int i=0;i<3;i++){float ts=T-1.62-float(i)*.13;if(ts>0.&&ts<1.3){float R0=ts*(1.05-float(i)*.18);float w=.012+ts*.035;float r=length(p-C);float k=1.-smoothstep(.35,1.3,ts);
   float ring=exp(-pow((r-R0)/w,2.))*k;float rr=exp(-pow((r-R0-w*1.2)/(w*.35),2.))*k;o=over(vec4(vec3(0.)*ring,ring*.8),o);o=over(vec4(red*rr,rr*.9),o);}}
 {float ts=T-1.52;if(ts>0.&&ts<.8){float r=length(p-P);float R0=ts*.6;float w=.008+ts*.03;float k=1.-smoothstep(.2,.8,ts);float rr=exp(-pow((r-R0)/w,2.))*k;o=over(vec4(red*rr,rr*.8),o);}}
 // halo rouge sur chaque adversaire paralysé (les fissures de Haki sont des textures, voir cracks)
 for(int i=0;i<3;i++){if(float(i)>=N)break;vec2 S=i==0?S0:i==1?S1:S2;float aw=win(T,1.7,2.75,.15);float land=exp(-length(p-S)/(K.y*.6))*aw*.45;o=over(vec4(red*land,land*.45),o);}
 gl_FragColor=o;}`;
 const G={};
 function gl(){if(G.gl||G.failed)return G.gl;try{const cv=document.createElement('canvas');cv.className='km-canvas';const g=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});if(!g)throw 0;
   const sh=(t,s)=>{const x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(x));return x;};
   const pr=g.createProgram();g.attachShader(pr,sh(g.VERTEX_SHADER,'attribute vec2 v;void main(){gl_Position=vec4(v,0.,1.);}'));g.attachShader(pr,sh(g.FRAGMENT_SHADER,FRAG));g.linkProgram(pr);if(!g.getProgramParameter(pr,g.LINK_STATUS))throw Error(g.getProgramInfoLog(pr));
   const buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);const v=g.getAttribLocation(pr,'v');g.useProgram(pr);g.enableVertexAttribArray(v);g.vertexAttribPointer(v,2,g.FLOAT,false,0,0);
   const loc={};for(const u of ['R','T','C','K','P','S0','S1','S2','N','D'])loc[u]=g.getUniformLocation(pr,u);cv.addEventListener('webglcontextlost',e=>{e.preventDefault();G.failed=true;G.gl=null;});Object.assign(G,{gl:g,cv,loc});}catch(e){G.failed=true;G.err=String(e);}return G.gl;}

  
 const SWORD=`<svg viewBox="0 0 360 90" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="kmSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#b9c0c8"/><stop offset=".55" stop-color="#8d949d"/><stop offset="1" stop-color="#dfe3e8"/></linearGradient>
<linearGradient id="kmHaki" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050203"/><stop offset=".7" stop-color="#140306"/><stop offset="1" stop-color="#2a0409"/></linearGradient>
<linearGradient id="kmSheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3a46" stop-opacity=".0"/><stop offset=".35" stop-color="#ff5a64" stop-opacity=".85"/><stop offset=".55" stop-color="#ffd0d4" stop-opacity=".9"/><stop offset="1" stop-color="#ff3a46" stop-opacity="0"/></linearGradient>
<linearGradient id="kmGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#d9a92a"/><stop offset="1" stop-color="#8a6312"/></linearGradient>
<pattern id="kmWrap" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="7" height="7" fill="#17575b"/><rect width="3.2" height="7" fill="#0d3f43"/></pattern></defs>
<path class="km-blade" d="M98 41 Q230 36 352 20 Q240 50 98 51 Z" fill="url(#kmSteel)"/>
<path class="km-blade-haki" d="M98 41 Q230 36 352 20 Q240 50 98 51 Z" fill="url(#kmHaki)"/>
<path class="km-blade-sheen" d="M110 44 Q232 39 340 24" stroke="url(#kmSheen)" stroke-width="2.4" fill="none"/>
<rect x="88" y="37" width="12" height="18" rx="2" fill="url(#kmGold)"/>
<ellipse cx="92" cy="46" rx="5" ry="17" fill="url(#kmGold)" stroke="#6b4a0c" stroke-width="1"/>
<path d="M90 30 C70 6 34 6 22 30" stroke="url(#kmGold)" stroke-width="5" fill="none" stroke-linecap="round"/>
<rect x="24" y="38" width="64" height="16" rx="7" fill="url(#kmWrap)"/>
<rect x="12" y="38" width="14" height="16" rx="4" fill="url(#kmGold)"/>
<path d="M76 39 l9 -16" stroke="url(#kmGold)" stroke-width="4" stroke-linecap="round"/></svg>`;

  
 const TEX=n=>'url(assets/kamusari/km-'+n+'.png)';
 function tex(name,cls,css,parent){const e=el('km-tex '+cls,css,'i',parent);e.style.setProperty('--m',TEX(name));return e;}
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const fxN=n=>low()?Math.ceil(n*.55):n;
 const artOf=f=>f&&(f.querySelector(':scope>button img')||f.querySelector(':scope>button')||f.querySelector('img')||f);
  
 function aura(A,k){
  const n=fxN(26),per=2*(A.w+A.h);
  for(let i=0;i<n;i++){let d=Math.random()*per,x,y,nx,ny;
   if(d<A.w){x=A.x+d;y=A.y;nx=0;ny=-1;}else if((d-=A.w)<A.h){x=A.x+A.w;y=A.y+d;nx=1;ny=0;}else if((d-=A.h)<A.w){x=A.x+A.w-d;y=A.y+A.h;nx=0;ny=1;}else{d-=A.w;x=A.x;y=A.y+A.h-d;nx=-1;ny=0;}
   const red=Math.random()<.32,sz=A.w*rnd(.32,.58),dx=nx*sz*rnd(.35,.7)+rnd(-8,8),dy=ny*sz*rnd(.35,.7)-A.h*rnd(.12,.3),dur=rnd(650,1050)*k,del=rnd(60,1350)*k,rot=rnd(-60,60);
   const sm=tex(Math.random()<.5?'smoke':'smoke4',red?'is-red':'is-dark',`left:${x}px;top:${y}px;width:${sz}px;height:${sz}px`);
   go(sm,[{transform:`translate(-50%,-50%) rotate(${rot}deg) scale(.35)`,opacity:0},{transform:`translate(-50%,-50%) translate(${dx*.35}px,${dy*.35}px) rotate(${rot+25}deg) scale(.85)`,opacity:red?.75:.9,offset:.3},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${rot+60}deg) scale(1.35)`,opacity:0}],{duration:dur,delay:del,easing:'ease-out'});}
  for(let i=0;i<fxN(10);i++){const t=Math.random(),side=Math.random()<.5;const x=side?(Math.random()<.5?A.x:A.x+A.w):A.x+t*A.w,y=side?A.y+t*A.h:(Math.random()<.5?A.y:A.y+A.h),sz=rnd(18,34);
   const sp=tex('flare','is-red',`left:${x}px;top:${y}px;width:${sz}px;height:${sz}px`);go(sp,[{transform:'translate(-50%,-50%) scale(.2) rotate(0deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1) rotate(20deg)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(.4) rotate(45deg)',opacity:0}],{duration:rnd(260,420)*k,delay:rnd(300,1400)*k});}
 }
  
 function crack(x,y,size,ang,k,delay,dur){const six=Math.random()<.6,cell=six?[Math.floor(Math.random()*2),Math.floor(Math.random()*3)]:[0,Math.floor(Math.random()*4)];
  size*=1.35;const e=tex(six?'crack6':'crack4','is-dark is-crack',`left:${x}px;top:${y}px;width:${size}px;height:${size*(six?.5:.4)}px`);
  const ms=six?'200% 300%':'100% 400%',mp=six?`${cell[0]*100}% ${cell[1]*50}%`:`0% ${cell[1]*33.333}%`;e.style.maskSize=e.style.webkitMaskSize=ms;e.style.maskPosition=e.style.webkitMaskPosition=mp;
  go(e,[{transform:`translate(-50%,-50%) rotate(${ang}deg) scale(.55)`,opacity:0},{transform:`translate(-50%,-50%) rotate(${ang}deg) scale(1)`,opacity:1,offset:.15},{opacity:.35,offset:.35},{opacity:1,offset:.5},{transform:`translate(-50%,-50%) rotate(${ang}deg) scale(1.08)`,opacity:0}],{duration:dur*k,delay:delay*k,easing:'steps(6,end)'});}
 function edgePoint(R){const per=2*(R.w+R.h);let d=Math.random()*per;if(d<R.w)return [R.x+d,R.y,-90];if((d-=R.w)<R.h)return [R.x+R.w,R.y+d,0];if((d-=R.h)<R.w)return [R.x+R.w-d,R.y+R.h,90];d-=R.w;return [R.x,R.y+R.h-d,180];}
 function cracks(A,stunned,k){
  for(let i=0;i<fxN(14);i++){const [x,y,n]=edgePoint(A);crack(x,y,A.w*rnd(.42,.7),n+rnd(-35,35),k,rnd(450,1400),rnd(150,260));} 
  for(let i=0;i<fxN(12);i++){const a=rnd(0,360),r=A.h*rnd(.62,1.5);crack(A.cx+Math.cos(a*Math.PI/180)*r,A.cy+Math.sin(a*Math.PI/180)*r,A.w*rnd(.7,1.15),a+rnd(-20,20),k,1660+rnd(0,850),rnd(170,300));} 
  for(const R of stunned)for(let j=0;j<fxN(5);j++){const [x,y,n]=edgePoint(R);crack(x,y,R.w*rnd(.45,.75),n+rnd(-40,40),k,1720+rnd(0,800),rnd(160,280));} 
 }
  
 function slash(T,flip,k,W,H){
  const h=Math.max(T.h*2.5,220),w=h/2,ang=flip*-32;
  const cut=el('km-cut',`left:${T.cx}px;top:${T.cy}px;width:${w}px;height:${h}px`,'div');cut.style.transform=`translate(-50%,-50%) rotate(${ang}deg) scaleX(${-flip})`;
  tex('slash','is-red is-glow','inset:-12%',cut);tex('slash','is-dark','inset:0',cut);tex('slash','is-white is-core','inset:14% 10% 14% 30%',cut);
  go(cut,[{clipPath:'inset(0 0 100% 0)',opacity:1,filter:'brightness(1.6)'},{clipPath:'inset(0 0 0% 0)',opacity:1,filter:'brightness(1.2)',offset:.12},{clipPath:'inset(0 0 0% 0)',opacity:1,filter:'none',offset:.45},{clipPath:'inset(0 0 0% 0)',opacity:0,filter:'none'}],{duration:900*k,easing:'cubic-bezier(.2,.8,.3,1)'});
  const big=Math.min(W,H);
  const sp=tex('speed','is-red',`left:${T.cx}px;top:${T.cy}px;width:${big*1.1}px;height:${big*1.1}px`);go(sp,[{transform:`translate(-50%,-50%) rotate(${ang+90}deg) scale(.6)`,opacity:.9},{transform:`translate(-50%,-50%) rotate(${ang+90}deg) scale(1.3)`,opacity:0}],{duration:380*k,easing:'ease-out'});
  const st=tex('streak','is-white',`left:${T.cx}px;top:${T.cy}px;width:${big*1.05}px;height:${big*.28}px`);go(st,[{transform:`translate(-50%,-50%) rotate(${ang+18}deg) scaleX(.2)`,opacity:1},{transform:`translate(-50%,-50%) rotate(${ang+18}deg) scaleX(1)`,opacity:.9,offset:.35},{transform:`translate(-50%,-50%) rotate(${ang+18}deg) scaleX(1.1)`,opacity:0}],{duration:420*k});
  const fl=tex('flare','is-white',`left:${T.cx}px;top:${T.cy}px;width:${T.h*1.6}px;height:${T.h*1.6}px`);go(fl,[{transform:'translate(-50%,-50%) scale(.3) rotate(0deg)',opacity:1},{transform:'translate(-50%,-50%) scale(1.3) rotate(25deg)',opacity:.9,offset:.3},{transform:'translate(-50%,-50%) scale(1.6) rotate(40deg)',opacity:0}],{duration:420*k});
  const bd=tex('burst','is-dark',`left:${T.cx}px;top:${T.cy}px;width:${T.h*1.3}px;height:${T.h*1.3}px`);go(bd,[{transform:'translate(-50%,-50%) scale(.4) rotate(0deg)',opacity:.95},{transform:'translate(-50%,-50%) scale(1.25) rotate(18deg)',opacity:0}],{duration:480*k,delay:40*k,easing:'ease-out'});
  const br=tex('burst','is-red',`left:${T.cx}px;top:${T.cy}px;width:${T.h*1.5}px;height:${T.h*1.5}px`);go(br,[{transform:'translate(-50%,-50%) scale(.3) rotate(10deg)',opacity:1},{transform:'translate(-50%,-50%) scale(1.3) rotate(-8deg)',opacity:0}],{duration:420*k,easing:'ease-out'});
  const rg=tex('ring','is-red',`left:${T.cx}px;top:${T.cy}px;width:${T.h}px;height:${T.h}px`);go(rg,[{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:'translate(-50%,-50%) scale(2.8)',opacity:0}],{duration:620*k,delay:60*k,easing:'cubic-bezier(.1,.7,.3,1)'});
  const sk=tex('spikes','is-dark',`left:${T.cx}px;top:${T.cy}px;width:${T.h}px;height:${T.h}px`);go(sk,[{transform:'translate(-50%,-50%) scale(.5) rotate(0deg)',opacity:.9},{transform:'translate(-50%,-50%) scale(2.3) rotate(30deg)',opacity:0}],{duration:560*k,delay:20*k,easing:'cubic-bezier(.1,.7,.3,1)'});
   
  const imp=el('km-impact','inset:0');go(imp,[{opacity:0,background:'#c0001070'},{opacity:1,background:'#c0001070',offset:.05},{opacity:1,background:'#fff3',offset:.35},{opacity:0,background:'#fff0'}],{duration:220*k});
 }

 function run(actor,target,stunnedEls){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),W=innerWidth,H=innerHeight,D=3.9,END=D*1000*k;
  const A=rect(artOf(actor)),T=rect(artOf(target)); 
  const arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  sfx(0); 
  actor.classList.add('km-caster');setTimeout(()=>actor.classList.remove('km-caster'),2100*k);
  
  const g=gl();
  if(g){const cv=G.cv,sc=Math.min(1,(low()?520:900)/W)*Math.min(devicePixelRatio||1,1.25),cw=Math.max(2,Math.round(W*sc)),ch=Math.max(2,Math.round(H*sc));cv.width=cw;cv.height=ch;g.viewport(0,0,cw,ch);layer().append(cv);
   const N=(x,y)=>[(x-W/2)/H,(H/2-y)/H],c=N(A.cx,A.cy),pt=N(T.cx,T.cy),ss=stunnedEls.slice(0,3).map(e=>{const r=rect(artOf(e));return N(r.cx,r.cy);});
   g.uniform2f(G.loc.R,cw,ch);g.uniform2f(G.loc.C,c[0],c[1]);g.uniform2f(G.loc.K,A.w/2/H,A.h/2/H);g.uniform2f(G.loc.P,pt[0],pt[1]);g.uniform1f(G.loc.N,ss.length);g.uniform1f(G.loc.D,D);
   [G.loc.S0,G.loc.S1,G.loc.S2].forEach((l,i)=>{const s=ss[i]||pt;g.uniform2f(l,s[0],s[1]);});
   const t0=performance.now();const frame=()=>{const t=(performance.now()-t0)/1000/k;if(t>D||!cv.isConnected){cv.remove();return;}g.uniform1f(G.loc.T,t);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,3);requestAnimationFrame(frame);};requestAnimationFrame(frame);
  }else{go(el('km-veil'),[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.85},{opacity:0}],{duration:END});}
  aura(A,k);cracks(A,stunnedEls.map(e=>rect(artOf(e))),k);
  
  const SW=Math.min(380,Math.max(230,A.w*2.3)),SH=SW/4,right=T.cx>=A.cx,flip=right?1:-1;
  const ox=A.cx,oy=A.y+A.h*.12,hx=T.cx-ox-flip*SW*.32,hy=T.cy-oy+T.h*.28,Dsw=1950*k;
  const kf=[
   {transform:`translate(-28%,-50%) scaleX(${flip}) rotate(-35deg) scale(.4)`,opacity:0,offset:0},
   {transform:`translate(-28%,-50%) scaleX(${flip}) rotate(-62deg) scale(1)`,opacity:1,offset:.2,easing:'cubic-bezier(.2,.8,.3,1)'},
   {transform:`translate(-28%,-50%) scaleX(${flip}) rotate(-72deg) scale(1.04)`,opacity:1,offset:.69,easing:'cubic-bezier(.7,0,1,.5)'},
   {transform:`translate(-28%,-50%) translate(${hx}px,${hy}px) scaleX(${flip}) rotate(-95deg) scale(1.1)`,opacity:1,offset:.75,easing:'cubic-bezier(.3,0,.2,1)'},
   {transform:`translate(-28%,-50%) translate(${hx}px,${hy}px) scaleX(${flip}) rotate(28deg) scale(1.1)`,opacity:1,offset:.79,easing:'cubic-bezier(.2,.9,.3,1)'},
   {transform:`translate(-28%,-50%) translate(${hx}px,${hy}px) scaleX(${flip}) rotate(36deg) scale(1.1)`,opacity:0}];
  const mk=(cls,delay,opa)=>{const s=el('km-sword'+cls,`left:${ox}px;top:${oy}px;width:${SW}px;height:${SH}px`,'div');s.innerHTML=SWORD;
   s.animate(opa===1?kf:kf.map(f=>({...f,opacity:f.opacity*opa})),{duration:Dsw,delay:delay*k,fill:'both'}).onfinish=()=>s.remove();
   s.querySelector('.km-blade-haki').animate([{opacity:0},{opacity:0,offset:.2},{opacity:1,offset:.55},{opacity:1}],{duration:Dsw,delay:delay*k,fill:'both'});return s;};
  for(const [i,o] of [[3,.16],[2,.28],[1,.45]])mk(' km-ghost',i*22,o); 
  const sw=mk('',0,1);
  sw.querySelector('.km-blade-sheen').animate([{opacity:0,strokeDashoffset:240},{opacity:0,offset:.4},{opacity:1,offset:.6},{opacity:.9,offset:.75},{opacity:0}],{duration:Dsw,fill:'forwards'});
  setTimeout(()=>{slash(T,flip,k,W,H);target.classList.add('km-struck');arena?.classList.add('km-shake');
   setTimeout(()=>{target.classList.remove('km-struck');arena?.classList.remove('km-shake');},650*k);},1520*k);
  setTimeout(()=>{for(const s of stunnedEls)s.classList.add('km-cowed');arena?.classList.add('km-quake');setTimeout(()=>{for(const s of stunnedEls)s.classList.remove('km-cowed');arena?.classList.remove('km-quake');},1100*k);},1680*k);
 }
 const sel=i=>'.story-battle [data-story-target="'+i+'"],.story-battle [data-infinity-target="'+i+'"],.story-battle [data-duel-target="'+i+'"]';
 const card=e=>e&&(e.closest('.story-fighter')||e.parentElement);
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='kamusari'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-kamusari');if(!actor)return;
   const main=document.querySelector(sel(storyImpact.kamusariTarget)),target=(main&&(main.closest('.kamusari-hit')||card(main)))||document.querySelector('.kamusari-hit');if(!target)return;played.add(storyImpact);
   const stunned=(Array.isArray(storyImpact.kamusariStunned)?storyImpact.kamusariStunned:[]).map(i=>card(document.querySelector(sel(i)))).filter(Boolean);
   if(typeof reducedMotion==='function'&&reducedMotion()){sfx(2500);return;}run(actor,target,stunned);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"shanks-kamusari.js");}

/* pucci-heaven.js */
globalThis.__yuroSkip=0;
const HEAVEN_VOICE_SKIP=.3;
let heavenVoice,heavenVoiced,heavenPunched;
if(!globalThis.__yuroSkip)try{heavenVoice={file:'https://yurocollection.fr/assets/pucci-made-in-heaven.mp3'};
heavenVoiced=new WeakSet();
heavenPunched=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"pucci-heaven.js");}
const HEAVEN_T={stop:1.6,dash:.28,rush:1.0,back:.32};
function heavenSpeed(){return typeof storySpeed==='number'&&storySpeed>0?storySpeed:1;}
function heavenStageHTML(){
 const hs=1/heavenSpeed();
 const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].map((n,i)=>`<i style="--a:${i*30}deg">${n}</i>`).join('');
 const lines=Array.from({length:18},(_,i)=>`<i style="--r:${i*20+(i%3)*4}deg;--d:${(i*97)%600}ms"></i>`).join('');
 const tongues=Array.from({length:9},(_,i)=>`<i style="--x:${8+(i*11)%84}%;--d:${(i*137)%700}ms;--s:${.7+(i*7)%5/10};--c:${i%3===0?'#3fd0ff':i%3===1?'#8a5cff':'#c26bff'}"></i>`).join('');
 
 return `<div class="mih-stage mih-back" aria-hidden="true" style="--hs:${hs.toFixed(3)}"><b class="mih-tint"></b><b class="mih-daynight"></b><div class="mih-sky"><i class="mih-sun"></i><i class="mih-moon"></i></div><div class="mih-speed">${lines}</div></div><div class="mih-stage mih-front" aria-hidden="true" style="--hs:${hs.toFixed(3)}"><b class="mih-wave"></b><b class="mih-wave is-2"></b>
  <div class="mih-clock"><span class="mih-dial">${numerals}</span><b class="mih-hand is-h"></b><b class="mih-hand is-m"></b><b class="mih-pin"></b></div>
  <div class="mih-aura"><span class="mih-tongues">${tongues}</span><span class="mih-ghosts"><i></i><i></i><i></i></span><b class="mih-skin"></b></div>
  <div class="mih-rushes"></div><b class="mih-neg"></b>
  <div class="mih-title"><small lang="ja">メイド・イン・ヘブン</small><strong>MADE IN HEAVEN</strong><em lang="ja">時 の 加 速</em></div></div>`;}
function prepareHeavenVoice(){if(heavenVoice.loading)return heavenVoice.loading;const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.decodeAudioData||typeof fetch!=='function')return null;
 heavenVoice.loading=fetch(heavenVoice.file).then(r=>{if(!r.ok)throw Error('heaven audio');return r.arrayBuffer();}).then(d=>audio.decodeAudioData(d)).then(b=>heavenVoice.buffer=b).catch(()=>{heavenVoice.loading=null;return null;});return heavenVoice.loading;}
function playHeavenVoice(impact){if(!impact||heavenVoiced.has(impact)||!state.sound||document.hidden)return;heavenVoiced.add(impact);const audio=typeof gameAudio==='function'?gameAudio():null;
 const go=buf=>{try{const s=audio.createBufferSource(),g=audio.createGain();s.buffer=buf;g.gain.value=.9;s.connect(g);g.connect(audio.destination);s.onended=()=>{s.disconnect();g.disconnect();};s.start(0,HEAVEN_VOICE_SKIP);if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 if(audio?.createBufferSource&&heavenVoice.buffer){if(audio.state==='suspended')audio.resume().then(()=>go(heavenVoice.buffer)).catch(()=>{});else go(heavenVoice.buffer);return;}
 const p=prepareHeavenVoice();if(p)p.then(b=>{if(b&&storyImpact===impact&&storyAnimating)go(b);});}
function playHeavenPunches(impact,targets){if(!impact||heavenPunched.has(impact)||!state.sound||document.hidden)return;heavenPunched.add(impact);
 const ctx=typeof gameAudio==='function'?gameAudio():null;if(!ctx?.createBufferSource)return;const hs=1/heavenSpeed();
 const noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.09),ctx.sampleRate),d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.4);
 const bus=ctx.createGain();bus.gain.value=.55;bus.connect(ctx.destination);
 const punch=(at,strong)=>{try{const n=ctx.createBufferSource();n.buffer=noise;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=strong?900:1400+Math.random()*700;bp.Q.value=.9;const ng=ctx.createGain();ng.gain.setValueAtTime(strong?.9:.6,at);ng.gain.exponentialRampToValueAtTime(.001,at+.08);n.connect(bp);bp.connect(ng);ng.connect(bus);n.start(at);n.stop(at+.09);
  const o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(strong?120:150,at);o.frequency.exponentialRampToValueAtTime(42,at+.12);og.gain.setValueAtTime(strong?.95:.55,at);og.gain.exponentialRampToValueAtTime(.001,at+.13);o.connect(og);og.connect(bus);o.start(at);o.stop(at+.14);}catch{}};
 const start=()=>{const t0=ctx.currentTime+.02;let t=HEAVEN_T.stop+HEAVEN_T.dash;for(let k=0;k<targets;k++){ for(let i=0;i<9;i++){const hit=t+(i+.45)*HEAVEN_T.rush/9;punch(t0+hit*hs,i===8);if(i<8)punch(t0+(hit+HEAVEN_T.rush/18)*hs,false);}t+=HEAVEN_T.rush+HEAVEN_T.dash;}setTimeout(()=>{try{bus.disconnect();}catch{}},(t+1)*hs*1000);};
 if(ctx.state==='suspended')ctx.resume().then(start).catch(()=>{});else start();}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{const b=e.target?.closest?.('.heaven-skill');if(b&&!b.disabled){if(typeof gameAudio==='function')gameAudio();prepareHeavenVoice();}},{capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"pucci-heaven.js");}
if(!globalThis.__yuroSkip)try{(function(){if(typeof positionStoryEffects!=='function')return;const base=positionStoryEffects;
 positionStoryEffects=function(){const result=base.apply(this,arguments);try{if(!(storyAnimating&&storyImpact?.action==='heaven')){if(document.querySelector('.heaven-skill'))prepareHeavenVoice();return result;}
  const arena=document.querySelector('.story-arena'),stage=arena?.querySelector('.mih-front'),stages=[...(arena?.querySelectorAll('.mih-stage')||[])];if(!arena||!stage)return result;const a=arena.getBoundingClientRect(),hs=1/heavenSpeed();
  playHeavenVoice(storyImpact);
  const casterBox=arena.querySelector('.uses-heaven'),caster=casterBox?.querySelector(':scope>button')||casterBox;
  const foes=[...arena.querySelectorAll('[data-fighter-side="enemy"]')];
  const picks=(Array.isArray(storyImpact.heavenPicks)?storyImpact.heavenPicks:[]).map(i=>foes[i]).filter(Boolean);
  const targets=(picks.length?picks:[...arena.querySelectorAll('.heaven-hit')]).slice(0,2).map(t=>t.querySelector(':scope>button')||t);
  playHeavenPunches(storyImpact,targets.length);
  if(caster){const c=caster.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2;
   for(const st of stages){st.style.setProperty('--cx',(cx-a.left)+'px');st.style.setProperty('--cy',(cy-a.top)+'px');st.style.setProperty('--cw',c.width+'px');st.style.setProperty('--ch',c.height+'px');}
   const img=caster.querySelector('img')?.getAttribute('src');if(img&&stage.dataset.ghost!==img){stage.dataset.ghost=img;const u='url("'+img.replace(/"/g,'%22')+'")';stage.querySelectorAll('.mih-ghosts i,.mih-skin').forEach(g=>g.style.backgroundImage=u);}
   
   const off=t=>{if(!t)return [0,0];const q=t.getBoundingClientRect();return [Math.round(q.left+q.width/2-cx),Math.round(q.top+q.height*.72-cy)];};
   const [x1,y1]=off(targets[0]),[x2,y2]=targets[1]?off(targets[1]):[x1,y1];
   caster.style.setProperty('--h1x',x1+'px');caster.style.setProperty('--h1y',y1+'px');caster.style.setProperty('--h2x',x2+'px');caster.style.setProperty('--h2y',y2+'px');caster.style.setProperty('--hs',hs.toFixed(3));caster.classList.add('mih-dasher');}
  
  const box=stage.querySelector('.mih-rushes');
  if(box&&box.childElementCount!==targets.length)box.innerHTML=targets.map((_,k)=>`<span class="mih-rush" style="--k:${k}">${Array.from({length:14},(__,i)=>`<i style="--o:${-38+(i*29)%76}deg;--d:${i*68}ms;--l:${34+(i*13)%42}%"></i>`).join('')}<b></b><b></b><b></b><em>ドドド</em></span>`).join('');
  const home=caster?caster.getBoundingClientRect():null;
  [...(box?.children||[])].forEach((r,k)=>{const t=targets[k];if(!t)return;const q=t.getBoundingClientRect(),qx=q.left+q.width/2,qy=q.top+q.height/2;r.style.setProperty('--tx',(qx-a.left)+'px');r.style.setProperty('--ty',(qy-a.top)+'px');r.style.setProperty('--tw',q.width+'px');
   
   if(home){const ang=Math.atan2(home.top+home.height/2-qy,home.left+home.width/2-qx)*180/Math.PI;r.style.setProperty('--base',ang.toFixed(1)+'deg');}
   const at=HEAVEN_T.stop+HEAVEN_T.dash+k*(HEAVEN_T.rush+HEAVEN_T.dash);r.style.setProperty('--at',at+'s');t.style.setProperty('--hat',at+'s');t.style.setProperty('--hs',hs.toFixed(3));t.classList.add('mih-pummeled');
   
   const fighter=t.closest('.story-fighter');if(fighter){fighter.style.setProperty('--hat',at+'s');fighter.style.setProperty('--hs',hs.toFixed(3));}});
 }catch{}return result;};})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"pucci-heaven.js");}
if(!globalThis.__yuroSkip)try{(function(){if(typeof finishStoryAnimation!=='function')return;const base=finishStoryAnimation;finishStoryAnimation=function(){try{document.querySelectorAll('.mih-dasher,.mih-pummeled').forEach(e=>{e.classList.remove('mih-dasher','mih-pummeled');});}catch{}return base.apply(this,arguments);};})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"pucci-heaven.js");}
if(!globalThis.__yuroSkip)try{setTimeout(()=>{try{prepareHeavenVoice();}catch{}},2500);
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"pucci-heaven.js");}

/* itachi-genjutsu.js */
globalThis.__yuroSkip=0;
const GENJUTSU_T={morph:1.5};
let genjutsuSounds,genjutsuPlayed;
if(!globalThis.__yuroSkip)try{genjutsuSounds={voice:{file:'https://yurocollection.fr/assets/itachi-genjutsu-voice.mp3'},illusion:{file:'https://yurocollection.fr/assets/itachi-genjutsu-illusion.mp3'}};
genjutsuPlayed=new WeakSet();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"itachi-genjutsu.js");}
function genjutsuSpeed(){return typeof storySpeed==='number'&&storySpeed>0?storySpeed:1;}
function genjutsuStageHTML(){const hs=1/genjutsuSpeed();
 const crows=Array.from({length:9},(_,i)=>`<i style="--y:${8+(i*23)%62}%;--d:${(i*173)%900}ms;--s:${.55+(i*7)%5/10};--dir:${i%2?1:-1}"></i>`).join('');
 const rings=Array.from({length:3},(_,i)=>`<i style="--d:${i*180}ms"></i>`).join('');
 return `<div class="gj-stage gj-back" aria-hidden="true" style="--hs:${hs.toFixed(3)}"><b class="gj-sky"></b><b class="gj-moon"></b><span class="gj-crows">${crows}</span></div>
 <div class="gj-stage gj-front" aria-hidden="true" style="--hs:${hs.toFixed(3)}"><b class="gj-dark"></b>
  <div class="gj-eye"><span class="gj-rings">${rings}</span><img class="gj-mangekyo" src="https://yurocollection.fr/assets/itachi-sharingan.png" alt="" draggable="false"></div>
  <b class="gj-flash"></b></div>`;}
function loadGenjutsu(k){const snd=genjutsuSounds[k];if(snd.loading)return snd.loading;const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.decodeAudioData||typeof fetch!=='function')return null;
 snd.loading=fetch(snd.file).then(r=>{if(!r.ok)throw Error('genjutsu audio');return r.arrayBuffer();}).then(d=>audio.decodeAudioData(d)).then(b=>snd.buffer=b).catch(()=>{snd.loading=null;return null;});return snd.loading;}
function prepareGenjutsu(){loadGenjutsu('voice');loadGenjutsu('illusion');}
function playGenjutsu(impact){if(!impact||genjutsuPlayed.has(impact)||!state.sound||document.hidden)return;genjutsuPlayed.add(impact);
 const audio=typeof gameAudio==='function'?gameAudio():null;if(!audio?.createBufferSource)return;const hs=1/genjutsuSpeed();
 const play=(buf,delay,vol)=>{try{const s=audio.createBufferSource(),g=audio.createGain();s.buffer=buf;g.gain.value=vol;s.connect(g);g.connect(audio.destination);s.onended=()=>{s.disconnect();g.disconnect();};s.start(audio.currentTime+delay);if(typeof trackTechniqueAudio==='function')trackTechniqueAudio(s,g);}catch{}};
 const go=()=>{const t0=performance.now();
  for(const [k,at,vol] of [['voice',0,.95],['illusion',GENJUTSU_T.morph*hs,.85]]){const snd=genjutsuSounds[k];
   if(snd.buffer)play(snd.buffer,at,vol);else{const p=loadGenjutsu(k);if(p)p.then(b=>{if(!b||storyImpact!==impact||!storyAnimating)return;const late=(performance.now()-t0)/1000;if(late<at+.4)play(b,Math.max(0,at-late),vol);});}}};
 if(audio.state==='suspended')audio.resume().then(go).catch(()=>{});else go();}
if(!globalThis.__yuroSkip)try{document.addEventListener('pointerdown',e=>{const b=e.target?.closest?.('.genjutsu-skill');if(b&&!b.disabled){if(typeof gameAudio==='function')gameAudio();prepareGenjutsu();}},{capture:true});
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"itachi-genjutsu.js");}
if(!globalThis.__yuroSkip)try{(function(){if(typeof positionStoryEffects!=='function')return;const base=positionStoryEffects;
 positionStoryEffects=function(){const result=base.apply(this,arguments);try{
  if(!(storyAnimating&&storyImpact?.action==='genjutsu')){if(document.querySelector('.genjutsu-skill'))prepareGenjutsu();return result;}
  const arena=document.querySelector('.story-arena'),stages=[...(arena?.querySelectorAll('.gj-stage')||[])];if(!arena||!stages.length)return result;
  const a=arena.getBoundingClientRect(),hs=1/genjutsuSpeed();playGenjutsu(storyImpact);
  
  const casterBox=arena.querySelector('.uses-genjutsu'),caster=casterBox?.querySelector(':scope>button')||casterBox;
  if(caster){const c=caster.getBoundingClientRect();const dx=c.left+c.width/2-(a.left+a.width/2),dy=c.top+c.height*.32-(a.top+a.height/2);
   for(const st of stages){st.style.setProperty('--ex',Math.round(dx)+'px');st.style.setProperty('--ey',Math.round(dy)+'px');}
   caster.style.setProperty('--hs',hs.toFixed(3));caster.classList.add('gj-caster');}
  
  for(const f of arena.querySelectorAll('.genjutsu-hit')){f.style.setProperty('--hs',hs.toFixed(3));const btn=f.querySelector(':scope>button');
   if(btn&&!btn.querySelector('.gj-mark')){const m=document.createElement('i');m.className='gj-mark';m.setAttribute('aria-hidden','true');btn.append(m);}}
 }catch{}return result;};})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"itachi-genjutsu.js");}
if(!globalThis.__yuroSkip)try{(function(){if(typeof finishStoryAnimation!=='function')return;const base=finishStoryAnimation;finishStoryAnimation=function(){try{document.querySelectorAll('.gj-caster').forEach(e=>e.classList.remove('gj-caster'));document.querySelectorAll('.gj-mark').forEach(e=>e.remove());}catch{}return base.apply(this,arguments);};})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"itachi-genjutsu.js");}
globalThis.__yuroSkip=0;

;
'use strict';
globalThis.__yuroBundleError||=function(e,f){try{if(typeof reportError==='function')reportError(e);else console.error('['+f+']',e);}catch(_){}};

/* vegeta-sacrifice.js */
globalThis.__yuroSkip=0;
if(!globalThis.__yuroSkip)try{(function(){
  const fxN=n=>{try{return matchMedia('(pointer:coarse)').matches||innerWidth<=760?Math.ceil(n*.55):n;}catch{return n;}};
 if(typeof document==='undefined')return;
 const played=new WeakSet();let audio=null;
 function sfx(){try{if(typeof state!=='undefined'&&state.sound===false)return;audio=audio||new Audio('https://yurocollection.fr/assets/majin-vegeta-explosion-v4.mp3');const a=audio.cloneNode();a.volume=.5;a.play().catch(()=>{});}catch{}}
  
  
 function host(){const b=document.querySelector('dialog[open] .story-battle')||document.querySelector('.story-battle'),fs=document.fullscreenElement||document.webkitFullscreenElement;return b?.closest('dialog[open]')||(b&&fs?.contains(b)?fs:null)||b?.closest('.combat-expanded')||document.body;}
  
 let L=null;function layer(){const h=host();if(!L){L=document.getElementById('mvLayer')||document.createElement('div');L.id='mvLayer';L.className='mv-layer';L.setAttribute('aria-hidden','true');}if(L.parentNode!==h)h.append(L);return L;}
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
 function el(cls,css,tag='i'){const e=document.createElement(tag);e.className=cls;if(css)e.style.cssText=css;layer().append(e);return e;}
 const go=(e,kf,o)=>{const a=e.animate(kf,{fill:'forwards',...o});a.onfinish=()=>e.remove();return a;};
 const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=t=>1-Math.pow(1-clamp(t),3);
 
 function fireColor(t,a){const s=[[0,255,255,245],[.12,255,244,170],[.3,255,196,70],[.5,255,120,24],[.7,190,52,14],[.85,70,40,34],[1,40,34,32]];let i=0;while(i<s.length-2&&t>s[i+1][0])i++;const [t0,r0,g0,b0]=s[i],[t1,r1,g1,b1]=s[i+1],k=clamp((t-t0)/(t1-t0));return `rgba(${r0+(r1-r0)*k|0},${g0+(g1-g0)*k|0},${b0+(b1-b0)*k|0},${a})`;}
 
 let SPR=null;function sprites(){if(SPR)return SPR;const mk=(stops)=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);for(const [o,col] of stops)g.addColorStop(o,col);x.fillStyle=g;x.fillRect(0,0,64,64);return c;};
  const fire=[];for(let i=0;i<16;i++){const t=i/15; fire.push(mk([[0,fireColor(t,1)],[.55,fireColor(Math.min(1,t+.08),.55)],[1,fireColor(Math.min(1,t+.15),0)]]));}
  SPR={fire,aura:mk([[0,'rgba(255,250,215,1)'],[.5,'rgba(255,206,70,.6)'],[1,'rgba(255,160,0,0)']]),smoke:mk([[0,'rgba(70,60,56,1)'],[.6,'rgba(52,44,42,.5)'],[1,'rgba(40,34,32,0)']])};return SPR;}
 function lightning(ctx,x1,y1,x2,y2,spread,depth){if(depth<=0||Math.hypot(x2-x1,y2-y1)<6){ctx.lineTo(x2,y2);return;}const mx=(x1+x2)/2+rnd(-spread,spread),my=(y1+y2)/2+rnd(-spread,spread);lightning(ctx,x1,y1,mx,my,spread/2,depth-1);lightning(ctx,mx,my,x2,y2,spread/2,depth-1);}
 function run(actor,targets){
  const k=1/(typeof storySpeed==='number'&&storySpeed>0?storySpeed:1),HIT=4150*k,END=7800*k,W=innerWidth,H=innerHeight,A=rect(actor),T=targets.map(rect),R=Math.max(W,H);
  const arena=actor.closest('.story-battle')?.querySelector('.story-arena')||document.querySelector('.story-arena');
  const gx=A.cx,gy=Math.max(A.y+A.h,...T.map(r=>r.y+r.h))+6; 
  const cv=el('mv-canvas','','canvas'),S=sprites(); const dpr=(W*H>1.2e6?.5:.65);cv.width=Math.ceil(W*dpr);cv.height=Math.ceil(H*dpr);cv.style.opacity=1;const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);
  const img=actor.querySelector('img');
  
  const art=(img?.currentSrc||img?.src||'').replace(/"/g,'%22');
  if(art)go(el('mv-cutin',`--art:url("${art}")`),[{transform:'translateX(-110%) skewX(-12deg)',opacity:1},{transform:'translateX(0) skewX(-12deg)',opacity:1,offset:.15},{transform:'translateX(2%) skewX(-12deg)',opacity:1,offset:.8},{transform:'translateX(110%) skewX(-12deg)',opacity:0}],{duration:1300*k,delay:60*k,easing:'cubic-bezier(.2,.8,.3,1)'});
  const title=el('mv-title','','b');title.innerHTML='<small>自爆</small>EXPLOSION FINALE';go(title,[{transform:'translate(-50%,-50%) scale(1.3)',opacity:0,letterSpacing:'.5em'},{transform:'translate(-50%,-50%) scale(1)',opacity:1,letterSpacing:'.14em',offset:.15},{transform:'translate(-50%,-50%) scale(1.02)',opacity:1,offset:.8},{transform:'translate(-50%,-50%) scale(1.15)',opacity:0}],{duration:1900*k,delay:1400*k,easing:'ease-out'});
  
  actor.classList.add('mv-actor');const shake=[];for(let i=0;i<=44;i++){const t=i/44,a=t*t*8;shake.push({transform:`translate(${rnd(-a,a)}px,${rnd(-a,a)}px) scale(${1+t*.05})`,filter:`brightness(${1+t*1.8}) saturate(${1-t*.5}) drop-shadow(0 0 ${6+t*30}px rgba(255,214,90,${.4+t*.6}))`,offset:t*(HIT/END)*.98});}
  shake.push({transform:'scale(1.06)',filter:'brightness(4)',offset:HIT/END},{transform:'none',filter:'grayscale(1) brightness(.7) contrast(1.15)',offset:(HIT+1400*k)/END},{transform:'none',filter:'grayscale(1) brightness(.6)',offset:1});
  const an=actor.animate(shake,{duration:END,fill:'forwards'});an.onfinish=an.oncancel=()=>{actor.classList.remove('mv-actor');an.cancel();};
  sfx();
  
  const P=[];const add=o=>P.push(Object.assign({age:0,life:1,vx:0,vy:0,ax:0,ay:0,drag:0,size:4,grow:0,alpha:1,kind:'fire'},o));
  const edge=()=>{const s=Math.random()*4|0,u=Math.random();return s===0?[A.x+u*A.w,A.y]:s===1?[A.x+A.w,A.y+u*A.h]:s===2?[A.x+u*A.w,A.y+A.h]:[A.x,A.y+u*A.h];};
  const rocks=[];for(let i=0;i<0;i++)rocks.push({x:A.cx+rnd(-A.w*2.4,A.w*2.4),y:gy-rnd(0,10),s:rnd(3,9),r:rnd(0,6),vr:rnd(-2,2),lift:rnd(.25,1),t0:rnd(.15,.55)});
  let fragments=null;let bolts=[],nextBolt=0,last=performance.now(),t0=last,boomDone=false;
  const struck=()=>{arena?.animate([{transform:'scale(1)'},{transform:'scale(1.05)',offset:.1},{transform:'scale(1)'}],{duration:700*k,easing:'ease-out',composite:'add'});arena?.classList.add('mv-shake');document.body.classList.add('mv-hitstop');targets.forEach(t=>t.classList.add('mv-struck','mv-lit'));setTimeout(()=>document.body.classList.remove('mv-hitstop'),140*k);setTimeout(()=>{arena?.classList.remove('mv-shake');targets.forEach(t=>t.classList.remove('mv-struck'));},950*k);setTimeout(()=>targets.forEach(t=>t.classList.remove('mv-lit')),2200*k);};
  function boom(){boomDone=true;struck();const fx=(gx+(T.length?T.reduce((n,r)=>n+r.cx,0)/T.length:gx))/2;
   
   for(let i=0;i<fxN(160);i++){const a=rnd(0,Math.PI*2),sp=rnd(.3,1.2)*R*.7;add({kind:'spark',x:A.cx,y:A.cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,ay:R*.35,drag:1.2,size:rnd(1,2.4),life:rnd(.6,1.4)*k});}
   
   if(img&&img.complete&&img.naturalWidth){const cols=14,rows=20;fragments=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)fragments.push({c,r,cols,rows,x:A.x+c*A.w/cols,y:A.y+r*A.h/rows,vx:rnd(-30,60),vy:-rnd(20,90),rot:0,vr:rnd(-3,3),delay:(1.5+(r/rows)*.6+rnd(0,.35))*k,alpha:1});}
  }
  function frame(now){try{frameInner(now);}catch(e){console.error('[mv]',e&&e.stack||e);cv.remove();actor.style.visibility='';}}
  function frameInner(now){const dt=Math.min(.05,(now-last)/1000),t=now-t0;last=now;ctx.clearRect(0,0,W,H);
   const pre=clamp(t/HIT),post=t>HIT?clamp((t-HIT)/(END-HIT)):0;
   
   ctx.globalCompositeOperation='source-over';
   const darkA=t<HIT?.62*ease(pre/.25):.62*(1-ease((t-HIT-2200*k)/(1200*k)));
   if(darkA>0){const g=ctx.createRadialGradient(A.cx,A.cy,A.w*.4,A.cx,A.cy,R*.9);g.addColorStop(0,`rgba(6,8,20,${darkA*.2})`);g.addColorStop(1,`rgba(4,6,16,${darkA})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    
   ctx.globalCompositeOperation='lighter';
   if(t<HIT){
    
    const ra=ease((pre-.45)/.5);if(ra>0){ctx.save();ctx.translate(A.cx,A.cy);ctx.rotate(t/1800);for(let i=0;i<18;i++){ctx.rotate(Math.PI*2/18);const g=ctx.createLinearGradient(0,0,R,0);g.addColorStop(0,`rgba(255,240,180,${.22*ra})`);g.addColorStop(1,'rgba(255,200,80,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(R,-R*.04);ctx.lineTo(R,R*.04);ctx.closePath();ctx.fill();}ctx.restore();}
    
    ctx.save();ctx.translate(A.cx,A.cy);ctx.scale(1,1.35);const glow=ctx.createRadialGradient(0,0,A.w*.15,0,0,A.w*(1.1+pre*1.5));glow.addColorStop(0,`rgba(255,246,200,${.25+pre*.5})`);glow.addColorStop(.5,`rgba(255,200,60,${.12+pre*.3})`);glow.addColorStop(1,'rgba(255,160,0,0)');ctx.fillStyle=glow;ctx.fillRect(-W,-H,W*2,H*2);ctx.restore();
     const n=Math.round((5+pre*20)*dt*60);for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),rx=A.w*(.62+pre*.35),ry=A.h*(.52+pre*.2);add({kind:'aura',x:A.cx+Math.cos(a)*rx*rnd(.7,1),y:A.cy+Math.sin(a)*ry*rnd(.7,1)+A.h*.08,vx:Math.cos(a)*rnd(10,40),vy:-rnd(80,200)*(1+pre),ay:-80,drag:.5,size:rnd(9,20)*(1+pre*.7),grow:-10,life:rnd(.4,.75),alpha:rnd(.3,.6)});}
    
    if(pre>.2&&Math.random()<.5)add({kind:'aura',x:A.cx+rnd(-A.w*2,A.w*2),y:gy,vx:rnd(-10,10),vy:-rnd(40,90),drag:.4,size:rnd(2,4),life:rnd(.8,1.4),alpha:.5});
    
    if(t>nextBolt&&pre>.12){nextBolt=t+rnd(50,130)*k;bolts.push({born:t,life:rnd(70,140)*k,seed:Math.random(),x1:A.cx+rnd(-A.w*.3,A.w*.3),y1:A.cy+rnd(-A.h*.3,A.h*.3),x2:A.cx+rnd(-1,1)*A.w*(1+pre*1.4),y2:A.cy+rnd(-1,1)*A.h*(.8+pre)});}
    
    if(pre>.8){const ip=clamp((pre-.8)/.2);for(let j=0;j<12;j++){const a=rnd(0,Math.PI*2),d=rnd(R*.3,R*.7);add({kind:'aura',x:A.cx+Math.cos(a)*d,y:A.cy+Math.sin(a)*d,vx:-Math.cos(a)*d*2.8,vy:-Math.sin(a)*d*2.8,size:rnd(3,7),life:.36,alpha:.85});}
     
     ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(0,0,0,${.35*ip})`;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
     for(let j=0;j<3;j++){const rr=Math.max(2,R*(1-ease(clamp(ip*1.15-j*.12)))*.9);ctx.strokeStyle=`rgba(255,236,150,${.65*ip})`;ctx.lineWidth=3+6*ip;ctx.shadowColor='rgba(255,210,80,.9)';ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(A.cx,A.cy,rr,rr*.9,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}}
    
    const cr=A.w*(.15+Math.pow(pre,6)*1.4);const cg=ctx.createRadialGradient(A.cx,A.cy,0,A.cx,A.cy,cr);cg.addColorStop(0,`rgba(255,255,255,${.3+pre*.7})`);cg.addColorStop(.5,`rgba(255,240,170,${.2+pre*.5})`);cg.addColorStop(1,'rgba(255,200,80,0)');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(A.cx,A.cy,cr,0,Math.PI*2);ctx.fill();
   } else if(!boomDone)boom();
   
   ctx.globalCompositeOperation='source-over';
   for(const r of rocks){let y=r.y,x=r.x;if(t<HIT){const p=clamp((pre-r.t0)/(1-r.t0));y=r.y-ease(p)*r.lift*A.h*1.6+Math.sin(t/300+r.r)*3;r.vr*=1;r.r+=r.vr*dt;}else{if(!r.fly){r.fly=true;const a=Math.atan2(r.y-60-A.cy,r.x-A.cx);r.fx=r.x;r.fy=r.y-r.lift*A.h*1.6;r.fvx=Math.cos(a)*R*rnd(.4,.9);r.fvy=Math.sin(a)*R*.6-R*.3;}const s=(t-HIT)/1000;x=r.fx+r.fvx*s;y=r.fy+r.fvy*s+R*.9*s*s/2;r.r+=r.vr*dt*6;}
    if(x<-50||x>W+50||y>H+50)continue;ctx.save();ctx.translate(x,y);ctx.rotate(r.r);ctx.fillStyle='#3a2f26';ctx.strokeStyle='#120d0a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r.s,-r.s*.6);ctx.lineTo(r.s*.7,-r.s);ctx.lineTo(r.s,r.s*.4);ctx.lineTo(-r.s*.3,r.s);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
   ctx.globalCompositeOperation='lighter';
   
   ctx.lineCap='round';ctx.lineJoin='round';bolts=bolts.filter(b=>t-b.born<b.life);for(const b of bolts){const a=1-(t-b.born)/b.life;for(const [w,c] of [[7,`rgba(255,210,80,${.25*a})`],[3,`rgba(255,240,170,${.8*a})`],[1.2,`rgba(255,255,255,${a})`]]){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(b.x1,b.y1);const st=Math.random;lightning(ctx,b.x1,b.y1,b.x2,b.y2,A.w*.35,5);ctx.stroke();}}
   
   
   if(t>HIT){const e=(t-HIT)/1000;ctx.globalCompositeOperation='source-over';
    const spread=ease(e/.35),hold=1-clamp((e-1.35)/.85),pulse=1+.04*Math.sin(e*18);
    if(hold>0){const rad=Math.hypot(W,H)*1.05*spread;const g=ctx.createRadialGradient(A.cx,A.cy,0,A.cx,A.cy,Math.max(1,rad));
     g.addColorStop(0,`rgba(255,255,250,${hold})`);g.addColorStop(.25*pulse>1?1:.25*pulse,`rgba(255,250,200,${hold})`);g.addColorStop(.7,`rgba(255,228,90,${hold})`);g.addColorStop(.97,`rgba(255,196,40,${hold})`);g.addColorStop(1,'rgba(255,196,40,0)');
     ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
     
     ctx.globalCompositeOperation='lighter';for(let j=0;j<5;j++){const rr=(e*1.4+j*.25)%1.2*Math.hypot(W,H)*.6;ctx.strokeStyle=`rgba(255,255,230,${.18*hold*(1-rr/(Math.hypot(W,H)*.72))})`;ctx.lineWidth=18;ctx.beginPath();ctx.arc(A.cx,A.cy,rr,0,Math.PI*2);ctx.stroke();}}
    
    const flash=Math.max(0,1-e/.25);if(flash>0){ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,W,H);}
    if(e>1.4&&e<3&&Math.random()<.5)add({kind:'spark',x:rnd(0,W),y:rnd(H*.3,H),vx:rnd(-20,20),vy:-rnd(40,120),drag:.5,size:rnd(1,2),life:rnd(.8,1.6)*k});}
   
   for(let i=P.length-1;i>=0;i--){const p=P[i];if(p.delay){p.delay-=dt;if(p.delay>0)continue;p.delay=0;}p.age+=dt;const a=p.age/p.life;if(a>=1){P.splice(i,1);continue;}
    const d=Math.exp(-p.drag*dt);p.vx=p.vx*d+p.ax*dt;p.vy=p.vy*d+p.ay*dt;const px=p.x,py=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.size=Math.min(p.kind==='fire'?170:150,Math.max(.5,p.size+p.grow*dt));
    if(p.kind==='fire'){ctx.globalCompositeOperation=a<.5?'lighter':'source-over';ctx.globalAlpha=clamp(p.alpha*(1-a*a));ctx.drawImage(S.fire[Math.min(15,a*16|0)],p.x-p.size,p.y-p.size,p.size*2,p.size*2);ctx.globalAlpha=1;}
    else if(p.kind==='aura'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(p.alpha*(1-a));ctx.drawImage(S.aura,p.x-p.size,p.y-p.size,p.size*2,p.size*2);ctx.globalAlpha=1;}
    else if(p.kind==='smoke'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=clamp(p.alpha*Math.sin(Math.PI*a));ctx.drawImage(S.smoke,p.x-p.size,p.y-p.size,p.size*2,p.size*2);ctx.globalAlpha=1;}
    else if(p.kind==='debris'){ctx.globalCompositeOperation='source-over';ctx.strokeStyle=`rgba(255,170,70,${.5*(1-a)})`;ctx.lineWidth=p.size*.7;ctx.beginPath();ctx.moveTo(px-(p.x-px)*3,py-(p.y-py)*3);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle=`rgba(30,22,16,${1-a*.5})`;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}
    else if(p.kind==='spark'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,230,150,${1-a})`;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(p.x+(p.x-px)*1.5,p.y+(p.y-py)*1.5);ctx.stroke();}}
   
   if(fragments){ctx.globalCompositeOperation='source-over';const s=(t-HIT)/1000;const iw=img.naturalWidth,ih=img.naturalHeight,sc=Math.max(A.w/iw,A.h/ih),ox=(iw*sc-A.w)/2,oy=(ih*sc-A.h)/2;
    if(s>1.45&&!fragments.hidden){fragments.hidden=true;actor.style.visibility='hidden';setTimeout(()=>{actor.style.visibility='';},Math.max(0,END-t)+50);}
    if(fragments.hidden)for(const f of fragments){const fs=s-1.6-(f.delay/k-1.5);let fx=f.x,fy=f.y,al=1;if(fs>0){fx+=f.vx*fs+18*fs*fs;fy+=f.vy*fs-40*fs*fs;f.rot+=f.vr*dt;al=clamp(1-fs/.9);}al*=clamp((s-1.45)/.55);if(al<=0)continue;ctx.save();ctx.globalAlpha=al;ctx.translate(fx+A.w/f.cols/2,fy+A.h/f.rows/2);ctx.rotate(fs>0?f.rot:0);ctx.filter='grayscale(1) brightness(.75)';const sw=A.w/f.cols,sh=A.h/f.rows;try{ctx.drawImage(img,(f.c*sw+ox)/sc,(f.r*sh+oy)/sc,sw/sc,sh/sc,-sw/2,-sh/2,sw+.6,sh+.6);}catch{}ctx.restore();ctx.filter='none';}}
   if(t<END)requestAnimationFrame(frame);else{cv.remove();actor.style.visibility='';}}
  requestAnimationFrame(frame);
 }
 function check(){try{if(typeof storyImpact==='undefined'||!storyImpact||storyImpact.action!=='sacrifice'||played.has(storyImpact)||typeof storyAnimating==='undefined'||!storyAnimating)return;const actor=document.querySelector('.uses-sacrifice');if(!actor)return;
   played.add(storyImpact);const targets=[...document.querySelectorAll('.sacrifice-hit')];
   if(typeof reducedMotion==='function'&&reducedMotion()){sfx();return;}run(actor,targets);}catch{}}
 if(typeof positionStoryEffects==='function'){const prev=positionStoryEffects;positionStoryEffects=function(){const r=prev.apply(this,arguments);check();return r;};}
 new MutationObserver(()=>{if(L&&L.childElementCount&&!L.isConnected)layer();check();}).observe(document.getElementById('viewRoot')||document.body,{childList:true,subtree:true});
})();
}catch(e){globalThis.__yuroSkip=1;globalThis.__yuroBundleError(e,"vegeta-sacrifice.js");}

