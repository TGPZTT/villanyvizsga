(function () {
  'use strict';
  const number = new Intl.NumberFormat('hu-HU');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const iconPaths = {
    learn: '<path d="M3 5c4-2 7-1 9 1 2-2 5-3 9-1v15c-4-2-7-1-9 1-2-2-5-3-9-1Z"/><path d="M12 6v15M6 9h3M15 9h3M6 13h3M15 13h3"/>',
    bank: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M15 9v12M3 15h18"/>',
    practice: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/><path d="M4 14l5 5M13 21h8"/>',
    exam: '<circle cx="12" cy="14" r="8"/><path d="M12 9v5l3 2M9 2h6M12 2v4M18 6l2-2"/>',
    guide: '<path d="M19 3H6l7 9-7 9h13M3 7h2M3 17h2"/>'
  };
  const icon = type => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[type] || ''}</svg>`;
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
  function illustration(kind) {
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
    if(kind==='learn')drawing=`${ground}
      <path d="m36 112 101-58 69 40v23l-101 59-69-40Z" fill="#253c60"/>
      <path d="m41 116 96-55 62 35v17l-95 55-63-36Z" fill="url(#${p}-paper)"/>
      <g stroke="#bcb5a5" stroke-width=".65" opacity=".8"><path d="m43 121 61 34 92-53m-153 23 61 34 92-53m-153 23 61 34 92-53m-153 23 61 34 92-53"/></g>
      <path d="m36 111 69 40v25l-69-40Z" fill="#21375a"/>
      <path d="m40 113 7 4v24l-7-4Z" fill="url(#${p}-copper)"/>
      <path d="m48 111 92-53 59 34-93 54Z" fill="#fefaf0" stroke="#d7cfbe"/>
      <g stroke="#bdb8aa" stroke-width="1" opacity=".9"><path d="m71 108 58-33m-50 38 58-33m-50 38 58-33m-50 38 35-20"/></g>
      <g class="dash-book-page" data-dash-motion-part="book-page"><path d="m48 111 92-53 59 34-93 54Z" fill="url(#${p}-paper)" stroke="#c9c2b1"/><g stroke="#aaa79d" stroke-width="1"><path d="m70 108 58-34m-50 39 58-34m-50 39 58-34m-50 39 58-34"/></g><path d="m135 74 17 9-21 12-17-9Z" fill="#e8bd72" opacity=".75"/></g>
      <g class="dash-book-cover" data-dash-motion-part="book-cover"><path d="m36 108 102-59 70 40-102 59Z" fill="#1f3152"/><path d="m36 104 102-59 70 40-102 59Z" fill="url(#${p}-cobalt)" stroke="#7386a8" stroke-width=".8"/><path d="m36 104 102-59 70 40-102 59Z" fill="url(#${p}-grain)"/><path d="m46 104 92-53 59 34-92 53Z" fill="none" stroke="#a2afd0" stroke-opacity=".6" stroke-width=".7"/><path d="m56 99 6 4 89-52-6-4Z" fill="url(#${p}-copper)"/><g transform="matrix(.87,-.5,.87,.5,94,91)" stroke="#efcf98" fill="none" stroke-width="1.6"><path d="M0 0h14l4 3 4-3h14v24H22l-4 3-4-3H0Z"/><path d="M18 3v24M4 7h7m-7 5h7m14-5h7m-7 5h7"/></g><path d="m158 70 12 7-31 18-1-9-11 2Z" fill="url(#${p}-gold)"/></g>`;
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
      <path d="m110 103 12 9-18 14Z" fill="#e3c397"/><path d="m108 118 5 4-9 4Z" fill="#3c4050"/>
      <path d="m163 26 6-9q2-3 5-1l7 5q3 2 1 5l-6 8Z" fill="#4a628c"/>
      <path d="m160 30 4-6 14 9-4 6Z" fill="url(#${p}-copper)"/><path d="m163 30 12 8" stroke="#f7d2ab" stroke-width="1.2"/>
      <path d="m119 98 45-65" stroke="#bb7a31" stroke-width=".7"/></g>`;
    if(kind==='exam')drawing=`${ground}
      <g class="dash-exam-paper"><path d="m38 76 64-16 37 82-64 18Z" fill="#c8c5bb"/><path d="m36 71 64-16 37 82-64 18Z" fill="url(#${p}-paper)" stroke="#c1c5bc"/><g stroke="#a0a9a7" stroke-width="1.7"><path d="m51 87 34-9m-29 21 34-9m-29 21 26-7"/></g></g>
      <g class="dash-clock-button" data-dash-motion-part="clock-button"><path d="m131 55 3-24 11 1-3 25Z" fill="#7d553a"/><path d="m125 27 17-3 12 6-18 4Z" fill="url(#${p}-copper)" stroke="#bb9569"/><path d="m125 27 11 7v8l-11-7Z" fill="#925f38"/><path d="m136 34 18-4v8l-18 4Z" fill="#c79462"/><g stroke="#76533c" stroke-width=".6"><path d="M139 34v6m3-7v6m3-7v6m3-7v6"/></g></g>
      <ellipse cx="139" cy="105" rx="43" ry="51" fill="#7b5236"/>
      <ellipse cx="130" cy="101" rx="43" ry="51" fill="url(#${p}-copper)" stroke="#976b47"/>
      <ellipse cx="127" cy="99" rx="36" ry="43" fill="#5b6577"/>
      <ellipse cx="126" cy="98" rx="33" ry="40" fill="#fffdf5"/>
      <ellipse cx="126" cy="98" rx="29" ry="36" fill="none" stroke="#d9d3c5" stroke-width=".8"/>
      <g stroke="#536374" stroke-width="1.5"><path d="M126 62v7m0 58v7m-29-36h6m46 0h6m-48-26 4 5m32 42 4 5m-45-13 5-3m42-22 5-3m-36-18 2 5m15 49 2 5m-21-6 2-5m19-48-3 5"/></g>
      <g class="dash-clock-minute" data-dash-motion-part="clock-minute"><path d="M126 98V75" stroke="#3f4e68" stroke-width="3.1" stroke-linecap="round"/><path d="m126 98 16 10" stroke="#3f4e68" stroke-width="2.6" stroke-linecap="round"/></g>
      <g class="dash-clock-second" data-dash-motion-part="clock-second"><path d="M126 109V67" stroke="#ba6737" stroke-width="1.4" stroke-linecap="round"/></g><circle cx="126" cy="98" r="4" fill="#b8804f"/><circle cx="125" cy="97" r="1.5" fill="#f4d4a6"/>
      <path d="M105 70q-12 22-4 41" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    if(kind==='guide')drawing=`${ground}
      <path d="m31 53 119-20 31 108-118 22Z" fill="#867461"/>
      <path d="m28 48 119-20 31 108-119 22Z" fill="url(#${p}-paper)" stroke="#b7aa96"/>
      <path d="m34 52 109-18 27 97-108 20Z" fill="#fbfaf5" stroke="#d6cfbf"/>
      <path d="m35 52 108-18" stroke="#d4a364" stroke-width="2"/>
      <g transform="matrix(.95,-.18,.27,.95,53,84)" font-family="Georgia,serif" font-size="28" font-weight="500"><text x="0" y="22" fill="#4b5360">I</text><text x="22" y="22" fill="#67717b">=</text><g class="dash-guide-numerator" data-dash-motion-part="guide-numerator"><text x="58" y="2" fill="#ab6632">P</text></g><path class="dash-guide-fraction" data-dash-motion-part="guide-fraction" pathLength="1" d="M48 11h39" stroke="#68788a" stroke-width="1.7"/><g class="dash-guide-denominator" data-dash-motion-part="guide-denominator"><text x="56" y="38" fill="#496b9a">U</text></g><path class="dash-guide-underline" data-dash-motion-part="guide-underline" pathLength="1" d="M0 49h88" stroke="#c48b48" stroke-width="1.2"/></g>
      <path d="m61 145 112-20 5 9-113 22Z" fill="url(#${p}-gold)" stroke="#c79a60"/>
      <g stroke="#936d43" stroke-width=".8"><path d="m72 144 2 4m8-6 2 4m8-6 3 7m7-9 2 4m8-6 2 4m8-6 3 7m7-9 2 4m8-6 2 4m8-6 3 7m7-9 2 4"/></g>
      <path d="m152 151 27-5 6 9-27 5Z" fill="#c8a779"/><path d="m152 148 27-5 6 9-27 5Z" fill="#efd4a5"/><path d="m179 143 6 9v3l-6-9Z" fill="#c69a64"/>`;
    return `<svg class="vv-dash-object vv-dash-object--${kind}" viewBox="0 0 220 190" fill="none" aria-hidden="true">${defs}${drawing}</svg>`;
  }
  function heroArtwork() {
    if(window.VV_DASH_ART?.header)return window.VV_DASH_ART.header();
    return `<svg class="vv-dash-instrument" viewBox="0 0 520 270" fill="none" aria-hidden="true"><defs><linearGradient id="dash-hero-top" x1="120" y1="20" x2="380" y2="240" gradientUnits="userSpaceOnUse"><stop stop-color="#3a737b"/><stop offset="1" stop-color="#123c48"/></linearGradient><linearGradient id="dash-hero-dial" x1="220" y1="50" x2="340" y2="190" gradientUnits="userSpaceOnUse"><stop stop-color="#eaf9ef"/><stop offset="1" stop-color="#88bab2"/></linearGradient></defs><ellipse cx="280" cy="221" rx="166" ry="20" fill="#021e29" opacity=".45"/><g class="vv-dash-instrument-float"><path d="m76 140 233-81 150 81-233 83-150-70Z" fill="#092c38" stroke="#487b7f"/><path d="m76 127 233-81 150 81-233 83Z" fill="url(#dash-hero-top)" stroke="#689c9b"/><g stroke="#7cb3aa" stroke-width="1.4" opacity=".65"><path d="m102 127 110-38 53 28m-143 25 110-39m81-37 84 45-55 20m-189 23 72 39 58-21m93-32 48 26-83 29"/><path d="m144 116 40 21 50-18m110-28-26 9 42 23m-85 54 49-18 26 14"/></g><g fill="#cba66d"><circle cx="103" cy="127" r="4"/><circle cx="144" cy="116" r="4"/><circle cx="395" cy="137" r="4"/><circle cx="323" cy="160" r="4"/></g><path d="m186 121 82-28 67 36-82 30Z" fill="#092e3b" stroke="#699391"/><path d="m186 108 82-29 67 36-82 30Z" fill="#215763" stroke="#9ac0b7"/><ellipse cx="260" cy="109" rx="57" ry="31" fill="#0a3441" stroke="#a2cbc0" stroke-width="2"/><ellipse cx="260" cy="103" rx="51" ry="27" fill="url(#dash-hero-dial)"/><g stroke="#36636a" stroke-width="2"><path d="m220 103 8 1m-1-17 8 4m13-12 3 6m20-6-2 6m20 0-6 5m17 10-8 1"/></g><path class="vv-dash-needle" d="m260 103 27-13" stroke="#b97930" stroke-width="3" stroke-linecap="round"/><circle cx="260" cy="103" r="4" fill="#2b5e65"/><g class="vv-dash-signal" fill="#ffe2a4"><circle cx="103" cy="127" r="3"/><circle cx="323" cy="160" r="3"/></g></g></svg>`;
  }
  let settings = null, mounted = false, paused = false, returnFocus = null, resetDialog = null;
  const destinations = [
    {id:'learn',title:'Tananyag',text:'A fogalmakat, ábrákat és ellenőrző kérdéseket témánként találod meg.',action:'Tananyag megnyitása'},
    {id:'bank',title:'Feladatbank',text:'Keress a kérdések között, és kezeld a feladatokhoz mentett eredményeidet.',action:'Feladatok böngészése'},
    {id:'practice',title:'Gyakorlás',text:'Állíts össze feladatsort, és minden válasz után nézd meg az indoklást.',action:'Gyakorlás összeállítása'},
    {id:'exam',title:'Mintavizsga',text:'Oldj meg egy időzített feladatsort. A végén részletes kiértékelést kapsz.',action:'Mintavizsga indítása'},
    {id:'guide',title:'Számolási útmutató',text:'A képletek mellett lépésenként követheted a mintafeladatok megoldását.',action:'Számolási útmutató megnyitása'}
  ];
  function setupCardMotion(host) {
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    host.querySelectorAll('.vv-dash-portal').forEach(link=>{
      let hovered=false,focused=false;
      const animations=[];
      const pencil=link.querySelector('.dash-practice-pencil');
      const mark=link.querySelector('.dash-practice-mark');
      if(pencil&&mark){
        animations.push(pencil.animate([
          {transform:'translate(0px,0px) rotate(0deg)',offset:0},
          {transform:'translate(0px,0px) rotate(0deg)',offset:.12},
          {transform:'translate(15px,8px) rotate(0deg)',offset:.4},
          {transform:'translate(39px,-20px) rotate(0deg)',offset:.82},
          {transform:'translate(42px,-25px) rotate(-3deg)',offset:1}
        ],{duration:1450,fill:'both',easing:'linear'}));
        animations.push(mark.animate([
          {strokeDashoffset:1,offset:0},
          {strokeDashoffset:1,offset:.12},
          {strokeDashoffset:.68446,offset:.4},
          {strokeDashoffset:0,offset:.82},
          {strokeDashoffset:0,offset:1}
        ],{duration:1450,fill:'both',easing:'linear'}));
        animations.forEach(animation=>{animation.pause();animation.currentTime=0});
      }
      const updateMotion=()=>{
        const active=(hovered||focused)&&!reduced.matches;
        link.classList.toggle('is-active',active);
        animations.forEach(animation=>{
          if(reduced.matches){animation.pause();animation.currentTime=0;return}
          if(active){animation.playbackRate=1;animation.play()}
          else {animation.playbackRate=-1;animation.play()}
        });
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
      host.innerHTML = `<div class="vv-dashboard"><header class="vv-dash-hero"><div class="vv-dash-hero-copy"><h1 id="homeTitle">Villanyvizsga</h1><div class="vv-dash-learning-progress"><div><strong>Tanulási haladás</strong><span id="dashReadText">A tananyag betöltődik…</span></div><div id="dashReadProgress" class="vv-dash-progress" role="progressbar" aria-label="Átolvasott tananyag" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div></div><div class="vv-dash-hero-art">${heroArtwork()}<button id="dashMotion" class="vv-dash-motion" type="button" aria-pressed="false" aria-label="Az ábra mozgásának szüneteltetése"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path class="vv-pause-symbol" d="M6 5h3v10H6zm5 0h3v10h-3z"/><path class="vv-play-symbol" d="m7 4 8 6-8 6Z"/></svg></button></div></header><nav class="vv-dash-portals" aria-label="Válassz felületet">${portal(destinations[0])}${portal(destinations[1])}<div class="vv-dash-practice-pair" role="group" aria-label="Gyakorlás és mintavizsga">${portal(destinations[2])}${portal(destinations[3])}</div>${portal(destinations[4])}</nav><section class="vv-dash-results" aria-labelledby="dashResultsTitle"><div class="vv-dash-results-head"><h2 id="dashResultsTitle">Eredményeid</h2><p>Az ezen az eszközön mentett állapot.</p></div><div id="homeMetrics" class="vv-dash-metrics"></div></section><footer class="vv-dash-reset"><div><strong>Mentett eredmények</strong><p>A feladatok jelöléseit és a tanulási haladást itt törölheted.</p></div><button id="dashReset" type="button" class="vv-dash-danger-button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>Eredmények törlése</button></footer><p id="dashNotice" class="vv-dash-notice" role="status" aria-live="polite"></p></div>`;
      host.querySelectorAll('[data-dash-go]').forEach(link => link.addEventListener('click', event => {
        if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); settings.navigate?.(link.dataset.dashGo);
      }));
      host.querySelector('#dashMotion').addEventListener('click', () => {
        paused = !paused;
        host.querySelector('.vv-dash-hero').classList.toggle('is-paused', paused);
        const control = host.querySelector('#dashMotion');
        control.setAttribute('aria-pressed', String(paused));
        control.setAttribute('aria-label', paused ? 'Az ábra mozgásának folytatása' : 'Az ábra mozgásának szüneteltetése');
      });
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
    const entries = [{n:questions.length,label:'Összes feladat',className:''},{n:labelled.length,label:'Megoldott feladat',className:''},{n:correct,label:'Sikerült',className:'is-success'},{n:retry,label:'Újragyakorlandó',className:'is-retry'},{n:sheets,label:'Feladatsor',className:''}];
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
