(function () {
  'use strict';
  const bound = new WeakSet();
  const configurations = new Map();
  const esc = value => String(value).replace(/[&<>"']/gu,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
  const earth = (x,y) => `<path d="M${x} ${y}v9M${x-13} ${y+9}h26M${x-9} ${y+15}h18M${x-4} ${y+21}h8" class="spd-earth-symbol"/>`;
  function render(lesson) {
    if (lesson?.id !== 'lightning-spd' || !lesson.spdModel) return '';
    const config=lesson.spdModel,{stages}=config;
    configurations.set(lesson.id,config);
    return `<section class="spd-model" data-spd-model aria-label="A három túlfeszültség-védelmi fokozat elvi működése">
      <div class="spd-zone-key"><span>Elvi zónasorrend</span><ol aria-label="Villámvédelmi zónák"><li>LPZ 0</li><li>LPZ 1</li><li>LPZ 2</li><li>LPZ 3</li></ol></div>
      <div class="spd-network" data-spd-network>
        <svg class="spd-wires" aria-hidden="true" focusable="false"></svg>
        <button type="button" class="spd-external" data-spd-select="external" aria-pressed="false" aria-label="A külső villámlevezető útjának kiemelése"><span class="spd-external-symbol" aria-hidden="true"><svg viewBox="0 0 32 40"><path d="M18 2 5 22h10l-2 16 14-23H17Z"/></svg></span><span>Külső<br>levezető</span></button>
        <span class="spd-supply-label">Betáplálás</span>
        <span class="spd-load" data-spd-load><svg viewBox="0 0 42 42" aria-hidden="true"><rect x="5" y="7" width="32" height="24" rx="2"/><path d="M16 36h10m-5-5v5"/></svg><span>Készülék</span></span>
        <div class="spd-device-row">${stages.map((s,i)=>`<button type="button" class="spd-stage${i===0?' is-selected':''}" data-spd-select="${s.key}" data-spd-index="${i}" aria-pressed="${i===0}" aria-label="${s.title}"><span class="spd-device" data-spd-device><strong>${s.name}</strong><span>SPD</span></span></button>`).join('')}</div>
        <span class="spd-protective-label">Védő egyenpotenciálú összekötés</span>
      </div>
      <div class="spd-explanation" aria-live="polite" aria-atomic="true"><h3 data-spd-title>${stages[0].title}</h3><p data-spd-detail>${stages[0].detail}</p><p class="spd-old-label" data-spd-old>${stages[0].old}</p></div>
      <p class="spd-operation-note">${esc(config.note)}</p>
      <div class="spd-withstand"><div class="spd-withstand-title"><h3>Lökőfeszültség-állóság</h3><span>${esc(config.voltageText)}</span></div><ol>${config.withstand.map(([category,value,place])=>`<li><span>${esc(category)}</span><strong>${esc(value)} <small>kV</small></strong><span>${esc(place)}</span></li>`).join('')}</ol><p>${esc(config.withstandNote)}</p></div>
    </section>`;
  }
  function mount(root) {
    const config=configurations.get('lightning-spd');
    if (!root || !config) return;
    const {stages,external}=config;
    const models=[...(root.matches?.('[data-spd-model]')?[root]:[]),...root.querySelectorAll('[data-spd-model]')];
    models.forEach(model=>{
      if(bound.has(model))return;bound.add(model);
      const network=model.querySelector('[data-spd-network]'),svg=network.querySelector('.spd-wires'),buttons=[...model.querySelectorAll('[data-spd-select]')];
      let selection='t1',flight;
      const local = element => {const r=element.getBoundingClientRect(),n=network.getBoundingClientRect();return {x:r.left-n.left,y:r.top-n.top,w:r.width,h:r.height};};
      function draw(animate=false) {
        flight?.cancel();
        const width=network.clientWidth,height=network.clientHeight;if(!width||!height)return;
        const deviceNodes=[...network.querySelectorAll('[data-spd-device]')].map(local),outside=local(network.querySelector('.spd-external-symbol')),outsideButton=local(network.querySelector('.spd-external')),loadPort=local(network.querySelector('[data-spd-load] rect'));
        const xExternal=outside.x+outside.w/2,ySupply=loadPort.y+loadPort.h/2,yProtective=height-43,xStart=Math.max(outsideButton.x+outsideButton.w+12,deviceNodes[0].x-24),xEnd=loadPort.x;
        const phases=deviceNodes.map(r=>({x:r.x+r.w/2,top:r.y,bottom:r.y+r.h}));
        const selected=phases[stages.findIndex(s=>s.key===selection)];
        const trace=selected?`M${xStart} ${ySupply}H${selected.x}V${yProtective}H${xExternal}V${height-26}`:`M${xExternal} ${outside.y+outside.h}V${height-26}`;
        svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
        svg.innerHTML=`<path d="M${xStart} ${ySupply}H${xEnd}" class="spd-phase"/>
          ${phases.map(p=>`<path d="M${p.x} ${ySupply}V${p.top}M${p.x} ${p.bottom}V${yProtective}" class="spd-branch"/><circle cx="${p.x}" cy="${ySupply}" r="3" class="spd-junction"/>`).join('')}
          <path d="M${xExternal} ${outside.y+outside.h}V${height-26}" class="spd-down-conductor"/>
          <path d="M${xExternal} ${yProtective}H${phases.at(-1).x+22}" class="spd-protective"/>
          <path d="M${xExternal} ${yProtective}H${phases.at(-1).x+22}" class="spd-protective-stripe"/>
          ${earth(xExternal,height-26)}<path d="${trace}" class="spd-selected-path" data-spd-trace/>`;
        if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
          const path=svg.querySelector('[data-spd-trace]'),length=path.getTotalLength();
          flight=path.animate([{strokeDasharray:`${length} ${length}`,strokeDashoffset:length,opacity:.25},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0,opacity:1}],{duration:1200,easing:'cubic-bezier(.22,.65,.3,1)'});
        }
      }
      buttons.forEach(button=>button.addEventListener('click',()=>{
        selection=button.dataset.spdSelect;
        const item=stages.find(s=>s.key===selection)||external;
        buttons.forEach(b=>{const active=b===button;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
        model.querySelector('[data-spd-title]').textContent=item.title;
        model.querySelector('[data-spd-detail]').textContent=item.detail;
        model.querySelector('[data-spd-old]').textContent=item.old;
        draw(true);
      }));
      const observer=new ResizeObserver(()=>{
        if(!network.isConnected){observer.disconnect();flight?.cancel();return;}
        draw();
      });
      observer.observe(network);
      draw();
    });
  }
  window.VVLearningSPD=Object.freeze({render,mount});
})();
