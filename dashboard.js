(function () {
  'use strict';
  const number = new Intl.NumberFormat('hu-HU');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icon=type=>window.VV_NAV?.icon(type)||'';
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
  function illustration(kind) {
    if(kind==='learn')return window.VV_DASH_BOOK.render();
    if(kind==='exam')return window.VV_DASH_WATCH.render();
    const p=`dash-${kind}`;
    const defs=`<defs>
      <linearGradient id="${p}-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset=".65" stop-color="#f1ede3"/><stop offset="1" stop-color="#dbd4c5"/></linearGradient>
      <linearGradient id="${p}-cobalt" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#647bab"/><stop offset=".5" stop-color="#354f82"/><stop offset="1" stop-color="#23385e"/></linearGradient>
      <linearGradient id="${p}-copper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efc497"/><stop offset=".22" stop-color="#b77948"/><stop offset=".55" stop-color="#e6ad75"/><stop offset="1" stop-color="#8d542f"/></linearGradient>
      <linearGradient id="${p}-gold" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffe4a0"/><stop offset=".55" stop-color="#e7ac4f"/><stop offset="1" stop-color="#b97832"/></linearGradient>
      <radialGradient id="${p}-shadow"><stop stop-color="#2f3444" stop-opacity=".23"/><stop offset="1" stop-color="#2f3444" stop-opacity="0"/></radialGradient>
      <pattern id="${p}-grain" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 .5h4M1 2.5h2" stroke="#fff" stroke-opacity=".16" stroke-width=".5"/></pattern>
    </defs>`;
    const ground=`<ellipse cx="122" cy="163" rx="95" ry="15" fill="url(#${p}-shadow)"/>`;
    let drawing='';
    if(kind==='bank')drawing=`${ground}
      <g class="dash-bank-back" data-dash-motion-part="bank-back"><path d="m62 39 94-13 28 111-94 17Z" fill="#c8c5bd"/><path d="m59 35 94-13 28 111-94 17Z" fill="url(#${p}-paper)" stroke="#c6c3b9"/><path d="m64 36 31-4 2 9-31 4Z" fill="#c48652"/><g stroke="#a9aaa5" stroke-width="1.6"><path d="m78 59 53-8m-50 19 53-8m-50 19 53-8m-50 19 53-8"/></g></g>
      <g class="dash-bank-middle" data-dash-motion-part="bank-middle"><path d="m46 47 93-10 24 110-94 13Z" fill="#c5c4be"/><path d="m44 43 93-10 24 110-94 13Z" fill="url(#${p}-paper)" stroke="#c3c6c0"/><path d="m50 44 31-3 2 9-31 3Z" fill="#647cab"/><g stroke="#aaada8" stroke-width="1.6"><path d="m61 66 53-7m-50 19 53-7m-50 19 53-7m-50 19 53-7"/></g></g>
      <g class="dash-bank-front"><path d="m30 58 92-8 22 109-92 10Z" fill="#9eabae"/><path d="m28 53 92-8 22 109-92 10Z" fill="url(#${p}-paper)" stroke="#b9bfb8"/><path d="m34 54 31-3 2 9-31 3Z" fill="#e4af53"/><path d="m45 75 55-5" stroke="#5a6e87" stroke-width="3" stroke-linecap="round"/><g transform="matrix(.99,-.1,.2,.99,45,89)"><g fill="#fffaf0" stroke="#8c9b9c" stroke-width="1"><rect x="0" y="0" width="10" height="10" rx="1.6"/><rect x="0" y="20" width="10" height="10" rx="1.6"/><rect x="0" y="40" width="10" height="10" rx="1.6"/></g><g stroke="#9ba6a3" stroke-width="2" stroke-linecap="round"><path d="M18 3h37m-37 5h29M18 23h37m-37 5h25M18 43h37m-37 5h31"/></g><g class="dash-bank-checks" data-dash-motion-part="bank-checks" stroke="#3a5d8a" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" d="m2 5 3 3 4-6"/><path pathLength="1" d="m2 45 3 3 4-6"/></g></g></g>`;
    if(kind==='practice')drawing=`${ground}
      <path d="m31 90 100-28 64 70-100 30Z" fill="#b3b7b2"/>
      <path d="m29 85 100-28 64 70-100 30Z" fill="url(#${p}-paper)" stroke="#c3c8bf"/>
      <path d="m41 87 86-24" stroke="#d3a56d" stroke-width="4"/>
      <g stroke="#9baaa8" stroke-width="1.8" stroke-linecap="round"><path d="m53 99 39-11m-29 22 39-11m-29 22 19-5"/></g>
      <g transform="matrix(.95,-.28,.65,.69,104,126)" fill="none" stroke="#b3bcb3" stroke-width="1"><rect x="-7" y="-8" width="43" height="31" rx="3"/></g>
      <path class="dash-practice-mark" data-dash-motion-part="practice-mark" pathLength="1" d="m104 126 15 8 24-28" stroke="#3e6092" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <g class="dash-practice-pencil" data-dash-motion-part="practice-pencil"><path d="m104 126 6-23 53-77 13 8-54 78Z" fill="#8d5b2d"/>
      <path d="m110 103 53-77 13 8-54 78Z" fill="url(#${p}-gold)" stroke="#b88341" stroke-width=".7"/>
      <path d="m110 103 5 3 54-77-6-3Z" fill="#fce1a3"/><path d="m115 106 7 6 54-78-7-5Z" fill="#db9d43"/>
      <path d="m110 103 12 9-18 14Z" fill="#e3c397"/><path d="M106.1 117.95 110.3 121.1 104 126Z" fill="#3c4050"/>
      <path d="m163 26 6-9q2-3 5-1l7 5q3 2 1 5l-6 8Z" fill="#4a628c"/>
      <path d="m160 30 4-6 14 9-4 6Z" fill="url(#${p}-copper)"/><path d="m163 30 12 8" stroke="#f7d2ab" stroke-width="1.2"/>
      <path d="m119 98 45-65" stroke="#bb7a31" stroke-width=".7"/></g>`;
    if(kind==='guide')drawing=`${ground}
      <path d="m31 53 119-20 31 108-118 22Z" fill="#867461"/>
      <path d="m28 48 119-20 31 108-119 22Z" fill="url(#${p}-paper)" stroke="#b7aa96"/>
      <path d="m34 52 109-18 27 97-108 20Z" fill="#fbfaf5" stroke="#d6cfbf"/>
      <path d="m35 52 108-18" stroke="#d4a364" stroke-width="2"/>
<g class="dash-guide-equation" transform="matrix(.95,-.18,.27,.95,53,84)" font-family="Georgia,serif" font-size="28" font-weight="500">
  <text x="0" y="22" fill="#496b9a">U</text>
  <text x="25" y="22" fill="#67717b">=</text>
  <text class="dash-guide-resistance" data-dash-motion-part="guide-resistance" x="49" y="22" fill="#ab6632">R</text>
  <text x="73" y="22" fill="#67717b">·</text>
  <text class="dash-guide-current" data-dash-motion-part="guide-current" x="87" y="22" fill="#4b5360">I</text>
  <g class="dash-guide-ruler" data-dash-motion-part="guide-ruler"><rect x="0" y="49" width="101" height="9" rx=".7" fill="#e8bf77" stroke="#bc8a47" stroke-width=".7"/><g stroke="#98713e" stroke-width=".7"><path d="M5 49v4m8-4v3m8-3v3m8-3v5m8-5v3m8-3v3m8-3v5m8-5v3m8-3v3m8-3v5m8-5v3m8-3v3"/></g></g>
  <path class="dash-guide-underline" data-dash-motion-part="guide-underline" pathLength="1" d="M0 49h101" stroke="#567499" stroke-width="1.2"/>
</g>

      <path d="m152 151 27-5 6 9-27 5Z" fill="#c8a779"/><path d="m152 148 27-5 6 9-27 5Z" fill="#efd4a5"/><path d="m179 143 6 9v3l-6-9Z" fill="#c69a64"/>`;
    return `<svg class="vv-dash-object vv-dash-object--${kind}" viewBox="0 0 220 190" fill="none" aria-hidden="true">${defs}${drawing}</svg>`;
  }
  function heroArtwork(){return window.VV_DASH_ART?.header()||'';}
  let settings = null, mounted = false, returnFocus = null, resetDialog = null;
  const destinations = [
    {id:'learn',title:'Tananyag',text:'A fogalmakat, ábrákat és ellenőrző kérdéseket témánként találod meg.',action:'Tananyag megnyitása'},
    {id:'bank',title:'Feladatbank',text:'Keress a kérdések között, és kezeld a feladatokhoz mentett eredményeidet.',action:'Feladatok böngészése'},
    {id:'practice',title:'Gyakorlás',text:'Állíts össze feladatsort, és minden válasz után nézd meg az indoklást.',action:'Gyakorlás összeállítása'},
    {id:'exam',title:'Mintavizsga',text:'Oldj meg egy időzített feladatsort. A végén részletes kiértékelést kapsz.',action:'Mintavizsga indítása'},
    {id:'guide',title:'Számolási útmutató',text:'A képletek mellett lépésenként követheted a mintafeladatok megoldását.',action:'Számolási útmutató megnyitása'}
  ];
  function makePencilMotion(pencil,mark) {
    const origin={x:104,y:126};
    const length=mark.getTotalLength(),start=mark.getPointAtLength(0),end=mark.getPointAtLength(length);
    const durations={lower:150,draw:980,lift:180,fade:180,return:340};
    let phase='idle',elapsed=0,active=false,reduced=false,drawn=0,lift=1,opacity=0;
    let position={x:start.x,y:start.y},frame=0,previousTime=0,disposed=false;
    const ease=t=>t*t*t*(10+t*(-15+6*t));
    const render=()=>{
      const x=position.x+3*lift,y=position.y-8*lift,angle=-1.5*drawn-1.5*lift;
      pencil.style.transform=`translate(${(x-origin.x).toFixed(7)}px,${(y-origin.y).toFixed(7)}px) rotate(${angle.toFixed(7)}deg)`;
      mark.style.strokeDashoffset=String(1-drawn);
      mark.style.opacity=String(drawn>0?opacity:0);
      pencil.dataset.pencilPhase=phase;
    };
    const enter=next=>{phase=next;elapsed=0};
    const advance=milliseconds=>{
      let budget=Math.max(0,milliseconds),guard=0;
      while(budget>0&&guard++<12){
        if(phase==='idle'){
          if(!active)break;
          drawn=0;opacity=1;lift=1;position={x:start.x,y:start.y};enter('lower');
        }
        if(phase==='complete'){
          if(active)break;
          enter('fade');
        }
        const duration=durations[phase],take=Math.min(budget,duration-elapsed);
        elapsed+=take;budget-=take;
        const fraction=Math.min(1,elapsed/duration);
        if(phase==='lower'){lift=1-ease(fraction);opacity=1;}
        if(phase==='draw'){
          drawn=fraction;lift=0;opacity=1;
          const point=mark.getPointAtLength(drawn*length);position={x:point.x,y:point.y};
        }
        if(phase==='lift'){lift=ease(fraction);drawn=1;opacity=1;position={x:end.x,y:end.y};}
        if(phase==='fade'){lift=1;drawn=1;opacity=1-ease(fraction);}
        if(phase==='return'){
          const moved=ease(fraction);drawn=0;lift=1;opacity=0;
          position={x:end.x+(start.x-end.x)*moved,y:end.y+(start.y-end.y)*moved};
        }
        if(fraction<1)break;
        const next={lower:'draw',draw:'lift',lift:'complete',fade:'return',return:'idle'}[phase];
        enter(next);
      }
      render();
    };
    const shouldRun=()=>!reduced&&!disposed&&!(phase==='idle'&&!active)&&!(phase==='complete'&&active);
    const tick=time=>{
      frame=0;
      if(disposed||reduced)return;
      advance(previousTime?Math.min(64,Math.max(0,time-previousTime)):0);
      previousTime=time;
      if(shouldRun())frame=requestAnimationFrame(tick);else previousTime=0;
    };
    const schedule=()=>{if(!frame&&shouldRun()){previousTime=0;frame=requestAnimationFrame(tick)}};
    const setActive=(nextActive,nextReduced=false)=>{
      active=!!nextActive;
      if(nextReduced){
        reduced=true;if(frame)cancelAnimationFrame(frame);frame=0;previousTime=0;
        phase='complete';elapsed=0;drawn=1;lift=1;opacity=1;position={x:end.x,y:end.y};render();return;
      }
      if(reduced){
        reduced=false;phase='idle';elapsed=0;drawn=0;lift=1;opacity=0;position={x:start.x,y:start.y};render();
      }
      schedule();
    };
    render();
    return {setActive,dispose(){disposed=true;if(frame)cancelAnimationFrame(frame);frame=0;}};
  }
  function setupCardMotion(host) {
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    host.querySelectorAll('.vv-dash-portal').forEach(link=>{
      let hovered=false,focused=false;
      const bookMotion=window.VV_DASH_BOOK?.setup(link);
      const watchMotion=window.VV_DASH_WATCH?.setup(link);
      const pencil=link.querySelector('.dash-practice-pencil');
      const mark=link.querySelector('.dash-practice-mark');
      const pencilMotion=pencil&&mark?makePencilMotion(pencil,mark):null;
      pencilMotion?.setActive(false,reduced.matches);
      const updateMotion=()=>{
        const active=(hovered||focused)&&!reduced.matches;
        link.classList.toggle('is-active',active);
        pencilMotion?.setActive(active,reduced.matches);
        watchMotion?.setActive(active,reduced.matches);
        if(bookMotion){if(reduced.matches){bookMotion.pause();bookMotion.currentTime=0}else{bookMotion.playbackRate=active?1:-1;bookMotion.play()}}
      };
      link.addEventListener('pointerenter',()=>{hovered=true;updateMotion()});
      link.addEventListener('pointerleave',()=>{hovered=false;updateMotion()});
      link.addEventListener('focus',()=>{focused=true;updateMotion()});
      link.addEventListener('blur',()=>{focused=false;updateMotion()});
      reduced.addEventListener('change',updateMotion);
    });
  }
  const portal = item => `<a class="vv-dash-portal vv-dash-portal--${item.id}" href="#${item.id}" data-dash-go="${item.id}"><span class="vv-dash-portal-icon">${icon(item.id)}</span><div class="vv-dash-portal-art">${illustration(item.id)}</div><h2>${item.title}</h2><p>${item.text}</p><span class="vv-dash-portal-open"><span>Megnyitás</span>${arrow}</span></a>`;
  function render(config) {
    settings = config || settings;
    const host = document.getElementById('homeView');
    if (!host || !settings) return;
    if (!mounted || !host.querySelector('.vv-dashboard')) {
      host.innerHTML = `<div class="vv-dashboard"><header class="vv-dash-hero"><div class="vv-dash-hero-copy"><h1 id="homeTitle">Villanyvizsga</h1><div class="vv-dash-learning-progress"><div><strong>Tanulási haladás</strong><span id="dashReadText">A tananyag betöltődik…</span></div><div id="dashReadProgress" class="vv-dash-progress" role="progressbar" aria-label="Átolvasott tananyag" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div></div><div class="vv-dash-hero-art">${heroArtwork()}</div></header><nav class="vv-dash-portals" aria-label="Válassz felületet">${portal(destinations[0])}${portal(destinations[1])}<div class="vv-dash-practice-pair" role="group" aria-label="Gyakorlás és mintavizsga">${portal(destinations[2])}${portal(destinations[3])}</div>${portal(destinations[4])}</nav><section class="vv-dash-results" aria-labelledby="dashResultsTitle"><div class="vv-dash-results-head"><h2 id="dashResultsTitle">Eredményeid</h2><p>Az ezen az eszközön mentett állapot.</p></div><div id="homeMetrics" class="vv-dash-metrics"></div></section><footer class="vv-dash-reset"><div><strong>Mentett eredmények</strong><p>A feladatok jelöléseit és a tanulási haladást itt törölheted.</p></div><button id="dashReset" type="button" class="vv-dash-danger-button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>Eredmények törlése</button></footer><p id="dashNotice" class="vv-dash-notice" role="status" aria-live="polite"></p></div>`;
      host.querySelectorAll('[data-dash-go]').forEach(link => link.addEventListener('click', event => {
        if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); settings.navigate?.(link.dataset.dashGo);
      }));
      window.VV_DASH_ART?.setup(host);
      host.querySelector('#dashReset').addEventListener('click', openReset);
      setupCardMotion(host);
      mounted = true;
    }
    update();
  }
  function update() {
    if (!settings || !mounted) return;
    const questions = settings.questions || [], progress = settings.progress || {};
    const labelled = questions.filter(question => ['correct','retry'].includes(progress[question.id]?.status));
    const correct = labelled.filter(question => progress[question.id]?.status === 'correct').length;
    const retry = labelled.length - correct;
    const sheets = new Set(questions.map(question => question.sourceId)).size;
    const entries = [{n:questions.length,label:'Összes feladat',className:''},{n:labelled.length,label:'Megoldott feladat',className:''},{n:correct,label:'Sikerült',className:'is-success'},{n:retry,label:'Elrontott feladat',className:'is-retry'},{n:sheets,label:'Feladatsor',className:''}];
    const metrics = document.getElementById('homeMetrics');
    if (metrics) metrics.innerHTML = entries.map(entry => `<div class="metric vv-dash-metric ${entry.className}"><strong>${number.format(entry.n)}</strong><span>${entry.label}</span></div>`).join('');
    const learning = window.VV_LEARN?.stats();
    const total = learning?.lessons || 0, read = Math.min(total,learning?.read || 0), percentage = total ? Math.round(read / total * 100) : 0;
    const text = document.getElementById('dashReadText'), bar = document.getElementById('dashReadProgress');
    if (text) text.textContent = total ? `${number.format(read)} / ${number.format(total)} rész átolvasva` : 'A tananyag betöltődik…';
    if (bar) { bar.setAttribute('aria-valuenow',String(percentage)); bar.setAttribute('aria-valuetext',total ? `${read} átolvasott rész ${total} közül` : 'A tananyag betöltődik'); bar.querySelector('span').style.transform = `scaleX(${percentage / 100})`; }
    const navCount = document.getElementById('navCount');
    if (navCount) navCount.textContent = number.format(questions.length);
  }
  function closeReset() {
    if (!resetDialog) return;
    resetDialog.close(); resetDialog.remove(); resetDialog = null;
    returnFocus?.focus({preventScroll:true});
  }
  function resetStage(stage) {
    if (!resetDialog) return;
    resetDialog.dataset.stage = String(stage);
    const warning = '<svg class="vv-dash-warning-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M28 8a4.5 4.5 0 0 1 8 0l24 43a4.5 4.5 0 0 1-4 7H8a4.5 4.5 0 0 1-4-7Z"/><path d="M32 22v15m0 9v1" stroke-width="4"/></svg>';
    resetDialog.innerHTML = `<div class="vv-dash-danger-rule">${stage === 1 ? 'Törlés megerősítése' : 'Végleges törlés'}</div><div class="vv-dash-danger-content">${warning}<h2 id="dashResetTitle">${stage === 1 ? 'Törlöd a mentett eredményeket?' : 'Biztosan mindent törölsz?'}</h2><p id="dashResetDescription">${stage === 1 ? 'A feladatokhoz mentett sikerült és újragyakorlandó jelölések, az ellenőrző kérdések eredményei és az átolvasott részek jelölései törlődnek.' : 'Ezt a műveletet nem lehet visszavonni. A tananyagot és a feladatokat továbbra is eléred, de a személyes eredményeid elvesznek.'}</p>${stage === 2 ? '<label class="vv-dash-confirm-label" for="dashResetWord">A végleges törléshez írd be: <strong>TÖRLÉS</strong><input id="dashResetWord" type="text" name="reset-confirmation" autocomplete="off" spellcheck="false" aria-describedby="dashResetDescription" placeholder="TÖRLÉS"></label>' : '<p class="vv-dash-danger-note">A törlés csak ezen a böngészőn érvényes.</p>'}<p id="dashResetError" role="alert" hidden></p><div class="vv-dash-danger-actions"><button id="dashResetCancel" class="vv-dash-cancel" type="button">Mégse, megtartom</button><button id="dashResetConfirm" class="vv-dash-confirm" type="button" ${stage === 2 ? 'disabled' : ''}>${stage === 1 ? 'Tovább a végleges törléshez' : 'Végleg törlöm az eredményeket'}</button></div></div>`;
    const cancel = resetDialog.querySelector('#dashResetCancel');
    const confirm = resetDialog.querySelector('#dashResetConfirm');
    cancel.addEventListener('click',closeReset);
    if (stage === 1) confirm.addEventListener('click',() => resetStage(2));
    else {
      const field = resetDialog.querySelector('#dashResetWord');
      field.addEventListener('input',() => { confirm.disabled = field.value.trim().toLocaleUpperCase('hu-HU') !== 'TÖRLÉS'; });
      confirm.addEventListener('click',async () => {
        if (field.value.trim().toLocaleUpperCase('hu-HU') !== 'TÖRLÉS') return;
        confirm.disabled = true; confirm.textContent = 'Eredmények törlése…';
        try {
          if (typeof settings.onReset !== 'function') throw new Error('Missing reset handler');
          await settings.onReset();
          closeReset(); update();
          const notice = document.getElementById('dashNotice');
          if (notice) notice.textContent = 'A feladatok eredményeit és a tanulási haladást töröltük.';
        } catch {
          const error = resetDialog?.querySelector('#dashResetError');
          if (error) { error.hidden = false; error.textContent = 'Az eredmények nem törölhetők. Zárd be ezt az ablakot, majd próbáld újra.'; }
          confirm.disabled = false; confirm.textContent = 'Végleg törlöm az eredményeket';
        }
      });
    }
    cancel.focus({preventScroll:true});
  }
  function openReset() {
    if (resetDialog) return;
    returnFocus = document.activeElement;
    resetDialog = document.createElement('dialog');
    resetDialog.className = 'vv-dash-reset-dialog';
    resetDialog.setAttribute('aria-labelledby','dashResetTitle');
    resetDialog.setAttribute('aria-describedby','dashResetDescription');
    resetDialog.addEventListener('cancel',event => { event.preventDefault(); closeReset(); });
    resetDialog.addEventListener('keydown',event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); closeReset(); } });
    resetDialog.addEventListener('click',event => { if (event.target === resetDialog) { const box = resetDialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeReset(); } });
    document.body.appendChild(resetDialog); resetStage(1); resetDialog.showModal();
    resetDialog.querySelector('#dashResetCancel').focus({preventScroll:true});
  }
  ['vv-learning-ready','vv-learning-progress'].forEach(event => document.addEventListener(event,update));
  window.addEventListener('storage',update);
  window.VV_DASHBOARD = Object.freeze({render,update});
})();
