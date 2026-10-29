(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PHASES = ['A','B','C'], LOWER = ['a','b','c'];
  const COLORS = ['#96470e','#273139','#68727b'];
  const groups = {
    Yy0: {hour:0, hv:'Y', lvReverse:false, text:'Mindkét oldal csillag. A megfelelő vonali feszültségek együtt állnak: 0° az eltérés.'},
    Yy6: {hour:6, hv:'Y', lvReverse:true, text:'Mindkét oldal csillag. A kisebb feszültségű oldalon a tekercsvégeket fordítva vezettük ki. A megfelelő feszültségek 180°-kal eltérnek.'},
    Dy11: {hour:11, hv:'D', lvReverse:false, text:'A felső oldal delta, az alsó csillag. A kisebb feszültségű oldal 330°-ot késik, ami ugyanaz a fázishelyzet, mint 30° sietés.'}
  };
  const stateByKey = new Map(), mounted = new WeakSet(), playing = new WeakMap();
  let serial = 0;
  const defaults=()=>({group:'Yy6',pair:0,all:false,rotation:0,view:'clock'});
  const normal = value => ((value%360)+360)%360;
  const point = (angle,r=1,cx=0,cy=0) => ({x:cx+r*Math.sin(angle*Math.PI/180),y:cy-r*Math.cos(angle*Math.PI/180)});
  const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
  const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
  const scale = (a,k) => ({x:a.x*k,y:a.y*k});
  const angleOf = v => normal(Math.atan2(v.x,-v.y)*180/Math.PI);
  const length = v => Math.hypot(v.x,v.y);

  // Positive ABC sequence. Clock angles increase clockwise; actual phasor
  // rotation is counterclockwise. The input phase A is 30° behind U_AB.
  function model(groupName='Yy6',rotation=0) {
    const spec=groups[groupName]||groups.Yy6;
    const hvPhase=PHASES.map((_,i)=>point(30+i*120-rotation));
    const hvLine=hvPhase.map((v,i)=>sub(v,hvPhase[(i+1)%3]));
    // D: A1-A2 is U_AB; Y: A1-A2 is U_AO. Dotted starts are
    // homologous on both windings. Yy6 connects LV starts to o.
    const hvCoil=spec.hv==='D'?hvLine:hvPhase;
    const lvPhase=hvCoil.map(v=>scale(v,spec.lvReverse?-1:1));
    const lvLine=lvPhase.map((v,i)=>sub(v,lvPhase[(i+1)%3]));
    return {group:groupName,hour:spec.hour,rotation,hvPhase,hvLine,hvCoil,lvPhase,lvLine,
      clock:normal(angleOf(lvLine[0])-angleOf(hvLine[0]))/30};
  }
  const number=n=>String(Math.round(n*10)/10).replace('.',',');
  const label=(x,y,s,cls='',anchor='middle')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s).replace(/U_([A-Za-z]+)/g,'U<tspan baseline-shift="sub" font-size="75%">$1</tspan>')}</text>`;
  function formatNotation(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement?.closest('svg,sub,script,style')&&/U_[A-Za-z]+/.test(node.textContent))nodes.push(node);}
    nodes.forEach(node=>{
      const fragment=document.createDocumentFragment();let start=0;
      for(const match of node.textContent.matchAll(/U_([A-Za-z]+)/g)){
        fragment.append(document.createTextNode(node.textContent.slice(start,match.index)+'U'));
        const sub=document.createElement('sub');sub.className='tf-sub';sub.textContent=match[1];fragment.append(sub);start=match.index+match[0].length;
      }
      fragment.append(document.createTextNode(node.textContent.slice(start)));node.replaceWith(fragment);
    });
  }
  function dot(x,y,cls=''){return `<circle cx="${x}" cy="${y}" r="3" class="tf-terminal ${cls}"/>`;}
  function coil(x,y,color,focus){
    return `<path d="M${x} ${y} ${Array.from({length:4},()=>`a5 5 0 0 1 0 10`).join(' ')}" class="tf-coil ${focus?'is-focus':''}" style="--tf-phase:${color}"/>`;
  }
  function windingDiagram(state){
    const spec=groups[state.group],xs=[46,134,222],hvFocus=spec.hv==='D'?[state.pair]:[state.pair,(state.pair+1)%3],lvFocus=[state.pair,(state.pair+1)%3];
    let s='';
    s+=label(8,18,'Nagyobb feszültségű oldal','tf-side','start');
    PHASES.forEach((p,i)=>{
      const x=xs[i],focus=hvFocus.includes(i);
      s+=`<g data-tf-coil="${p}" class="${focus?'tf-selected':''}">${label(x,42,p,'tf-terminal-name')}
        <path d="M${x} 48V64M${x} 104V120" class="tf-wire"/>${coil(x,64,COLORS[i],focus)}
        ${dot(x,48)}${dot(x,120)}<circle cx="${x-8}" cy="64" r="3" class="tf-polarity"/>
        ${label(x+12,61,p+'1','tf-end','start')}${label(x+12,115,p+'2','tf-end','start')}</g>`;
    });
    if(spec.hv==='Y')s+=`<path d="M46 120V133H222V120M134 120V133" class="tf-wire"/>${dot(134,133)}${label(247,138,'O','tf-point')}`;
    else {
      // No crossing junctions: A2-B1, B2-C1, C2-A1.
      s+=`<path d="M46 120H61L118 48H134M134 120H149L206 48H222M222 120V139H24V48H46" class="tf-wire"/>`;
      s+=label(134,158,'A2–B1 · B2–C1 · C2–A1','tf-connection');
    }
    s+=`<path d="M34 176H234" class="tf-core"/>${label(134,192,'Azonos oszlop: összetartozó tekercspár','tf-core-label')}`;
    s+=label(8,215,'Kisebb feszültségű oldal','tf-side','start');
    LOWER.forEach((p,i)=>{
      const x=xs[i],focus=lvFocus.includes(i);
      s+=`<g data-tf-coil="${p}" class="${focus?'tf-selected':''}"><path d="M${x} 246V262M${x} 302V318" class="tf-wire"/>
        ${coil(x,262,COLORS[i],focus)}${dot(x,246)}${dot(x,318)}<circle cx="${x-8}" cy="262" r="3" class="tf-polarity"/>
        ${label(x+12,259,p+'1','tf-end','start')}${label(x+12,313,p+'2','tf-end','start')}
        ${label(x,spec.lvReverse?343:239,p,'tf-terminal-name')}</g>`;
    });
    if(spec.lvReverse)s+=`<path d="M46 246V229H222V246M134 246V229" class="tf-wire"/>${dot(134,229)}${label(247,234,'o','tf-point')}`;
    else s+=`<path d="M46 318V331H222V318M134 318V331" class="tf-wire"/>${dot(134,331)}${label(247,336,'o','tf-point')}`;
    return `<svg class="tf-windings" viewBox="0 0 278 356" role="img" aria-label="${esc(state.group)} egyik lehetséges kapocskötése. A pontok azonos tekercspolaritást jelölnek.">${s}</svg>`;
  }
  function arrow(cx,cy,v,r,color,dashed,cls=''){
    const unit=scale(v,1/length(v)),end=add({x:cx,y:cy},scale(unit,r)),tip=scale(unit,7),perp={x:-unit.y*3.5,y:unit.x*3.5};
    const b=sub(end,tip),l=add(b,perp),rt=sub(b,perp);
    return `<g class="tf-vector ${dashed?'tf-lower':'tf-higher'} ${cls}" style="--tf-phase:${color}">${cls==='tf-shared-axis'?`<path d="M${cx} ${cy}L${end.x} ${end.y}" class="tf-halo"/>`:''}<path data-tf-arrow-shaft d="M${cx} ${cy}L${end.x} ${end.y}" ${dashed?'stroke-dasharray="7 4"':''}/><path d="M${l.x} ${l.y}L${end.x} ${end.y}L${rt.x} ${rt.y}"/></g>`;
  }
  function clockDiagram(state){
    const m=model(state.group,state.rotation),cx=139,cy=134,rotated=Math.abs(normal(state.rotation))>.01;
    let s=`<circle cx="${cx}" cy="${cy}" r="106" class="tf-clock-rim"/>`;
    for(let i=0;i<12;i++){
      const a=point(i*30,100,cx,cy),b=point(i*30,106,cx,cy),p=point(i*30,121,cx,cy);
      s+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="tf-tick"/>`;
      if(!rotated)s+=label(p.x,p.y+5,i||12,'tf-hour');
    }
    if(rotated)s+=`<path d="M139 134V27" class="tf-zero"/>`;
    const ids=state.all?[0,1,2]:[state.pair];
    ids.forEach(i=>{
      const selected=i===state.pair;
      s+=`<g data-tf-line="${i}" class="${selected?'tf-selected':'tf-muted'}">${arrow(cx,cy,m.hvLine[i],89,COLORS[i],false)}${arrow(cx,cy,m.lvLine[i],68,COLORS[i],true,groups[state.group].hour===0?'tf-shared-axis':'')}</g>`;
    });
    s+=`<circle cx="139" cy="134" r="3.5" class="tf-origin"/>`;
    if(!rotated && state.pair===0){
      const same=groups[state.group].hour===0;
      const p=point(groups[state.group].hour*30,74,cx,cy);
      s+=label(152,50,'U_AB','tf-vector-label','start');
      s+=label(same?126:p.x+(p.x<cx?-11:11),same?78:p.y+5,'U_ab','tf-vector-label',same?'end':p.x<cx?'end':'start');
    }
    const pairText=pairLabel(state.pair),description=rotated?'Közös forgásnézet; a relatív szög változatlan.':state.pair===0?'A nagyobb feszültségű oldal A–B vonali feszültsége 12 óránál, a kisebb feszültségű oldal a–b feszültsége '+groups[state.group].hour+' óránál.':'A kiválasztott '+pairText+' feszültségpár relatív eltérése '+groups[state.group].hour*30+' fok.';
    return `<svg class="tf-clock" viewBox="0 0 278 269" role="img" aria-label="${esc(state.group+'. '+description)}">${s}</svg>`;
  }
  const groupButtons=s=>Object.keys(groups).map(name=>`<button type="button" data-tf-group="${name}" aria-pressed="${s.group===name}">${name}</button>`).join('');
  const pairLabel=i=>PHASES[i]+PHASES[(i+1)%3]+' / '+LOWER[i]+LOWER[(i+1)%3];
  function voltageDetails(){
    return `<section class="tf-voltage-section" aria-label="Tekercsfeszültség és vonali feszültség"><h3>Tekercsfeszültség és vonali feszültség</h3>
      <p>A vonali feszültséget két fáziskapocs között mérjük. A tekercsfeszültség egy tekercs két vége közötti feszültség.</p>
      <div class="tf-voltage-pair"><figure><svg viewBox="0 0 260 177" role="img" aria-label="Csillag: egy tekercs A és O között, vonali feszültség A és B között.">
      <path d="M130 92V35M130 92L45 143M130 92L215 143" class="tf-wire"/>
      <rect x="122" y="49" width="16" height="29" class="tf-voltage-coil"/><rect x="67" y="117" width="29" height="16" transform="rotate(-31 81 125)" class="tf-voltage-coil"/><rect x="166" y="117" width="29" height="16" transform="rotate(31 181 125)" class="tf-voltage-coil"/>
      <path d="M144 41H173V90H144" class="tf-measure"/><path d="M119 27H26V143H34" class="tf-line-measure"/>
      ${dot(130,92)}${label(130,22,'A','tf-terminal-name')}${label(35,165,'B','tf-terminal-name')}${label(224,165,'C','tf-terminal-name')}${label(143,111,'O','tf-point')}${label(181,72,'U_t','tf-measure-label','start')}${label(15,92,'U_v','tf-measure-label')}
      </svg><figcaption><b>Csillag (Y): U_v = √3 · U_t</b><span>400 V vonali feszültségnél egy tekercsen körülbelül 230 V van.</span></figcaption></figure>
      <figure><svg viewBox="0 0 260 177" role="img" aria-label="Delta: az A–B tekercs közvetlenül két fáziskapocs között van.">
      <path d="M130 27L45 143H215Z" class="tf-wire"/>
      <rect x="76" y="73" width="16" height="29" transform="rotate(36 84 87)" class="tf-voltage-coil"/><rect x="168" y="73" width="16" height="29" transform="rotate(-36 176 87)" class="tf-voltage-coil"/><rect x="115" y="135" width="29" height="16" class="tf-voltage-coil"/>
      <path d="M118 27H26V143H34" class="tf-measure"/>${label(130,20,'A','tf-terminal-name')}${label(35,165,'B','tf-terminal-name')}${label(224,165,'C','tf-terminal-name')}${label(14,92,'U_v','tf-measure-label')}${label(97,94,'U_t','tf-measure-label','start')}
      </svg><figcaption><b>Delta (D): U_v = U_t</b><span>400 V vonali feszültségnél az A–B tekercsen is 400 V van.</span></figcaption></figure></div>
      <p><b>U_v</b>: vonali feszültség; <b>U_t</b>: tekercsfeszültség. A kapcsolat szimmetrikus háromfázisú rendszerre érvényes.</p>
      <p>A fázor egy szinuszos feszültség nagyságát és fázishelyzetét mutató nyíl. Az <b>U_AB = U_AO − U_BO</b> különbség csillagban 30°-kal siet az U_AO-hoz képest. Deltában az A–B tekercs feszültsége maga az U_AB. Ezért nem szabad az egyik oldal tekercsfeszültségét a másik oldal vonali feszültségével összehasonlítani az órajelhez.</p>
    </section>`;
  }
  function render(lessonOrSpec,key='machines-vector-group'){
    const k=String(key),s=stateByKey.get(k)||defaults();stateByKey.set(k,s);
    const id='tf-'+(++serial);
    return `<section class="tf-workbench" data-tf-key="${esc(k)}" aria-label="Transzformátor kapcsolási csoportok">
      <div class="tf-view-controls" role="tablist" aria-label="Szemléltetés nézete"><button type="button" role="tab" id="${id}-clock" aria-controls="${id}-clock-panel" data-tf-view="clock" aria-selected="${s.view==='clock'}">Kapcsolás és órajel</button><button type="button" role="tab" id="${id}-voltage" aria-controls="${id}-voltage-panel" data-tf-view="voltage" aria-selected="${s.view==='voltage'}">Feszültségek és n</button></div>
      <div id="${id}-clock-panel" role="tabpanel" aria-labelledby="${id}-clock" data-tf-view-panel="clock" ${s.view==='clock'?'':'hidden'}>
      <div class="tf-group-controls" role="group" aria-label="Kapcsolási példa">${groupButtons(s)}</div>
      <p class="tf-group-explanation" data-tf-explanation>${groups[s.group].text}</p>
      <div class="tf-board"><figure class="tf-winding-figure"><figcaption>Kapocskötés</figcaption><div data-tf-winding>${windingDiagram(s)}</div></figure>
      <figure class="tf-phasor-figure"><figcaption>Órajel: 1 osztás = 30°</figcaption><div data-tf-clock>${clockDiagram(s)}</div>
      <div class="tf-clock-result" aria-live="polite"><b data-tf-result>${groups[s.group].hour} óra = ${groups[s.group].hour*30}°</b><span data-tf-rotation>${s.rotation?'Közös forgás: '+number(s.rotation)+'°':'A nagyobb feszültségű oldal referenciája 12-n áll.'}</span></div>
      <div class="tf-arrow-legend"><span><i></i>nagyobb feszültségű oldal</span><span><i class="tf-dash"></i>kisebb feszültségű oldal</span></div>
      <div class="tf-pairs" role="group" aria-label="Összehasonlított vonali feszültség">${PHASES.map((_,i)=>`<button type="button" data-tf-pair="${i}" aria-pressed="${s.pair===i}" style="--tf-phase:${COLORS[i]}">${pairLabel(i)}</button>`).join('')}</div>
      <label class="tf-all"><input type="checkbox" data-tf-all ${s.all?'checked':''}> Mindhárom feszültség</label>
      <div class="tf-motion-controls"><button type="button" data-tf-rotate>Fordítás 30°-kal ↶</button><button type="button" data-tf-play>Egy kör forgás ↶</button><button type="button" data-tf-reset>Vissza 12-re</button></div></figure></div>
      <p class="tf-reading" data-tf-reading>${reading(s)}</p>
      <p class="tf-legend"><b>A, B, C</b>: a felső oldal fáziskapcsai; <b>a, b, c</b>: az alsó oldaléi. <b>A1–A2</b> és <b>a1–a2</b>: az összetartozó tekercsek két vége; a többi betű ugyanígy olvasható. A fekete pont a tekercsek azonos pillanatnyi polaritású végét jelöli. <b>O, o</b>: belső csillagpont; itt nincs kivezetve. <b>U_AB</b>: az A és B közötti, <b>U_ab</b>: az a és b közötti vonali feszültség.</p>
      <p class="tf-scale-note">A két oldal nyilainak hossza az összehasonlítást segíti; nem a transzformátor feszültségáttételét mutatja. A színek a megfelelő fázisokat azonosítják. A rögzített fázissorrend A–B–C, illetve a–b–c.</p>
      </div><div id="${id}-voltage-panel" role="tabpanel" aria-labelledby="${id}-voltage" data-tf-view-panel="voltage" ${s.view==='voltage'?'':'hidden'}>
      <section class="tf-neutral-section" aria-label="Kivezetett nullapont"><h3>Mit változtat a Dyn11 jelben az n?</h3><p>A <b>Dy11</b> kisebb feszültségű oldala csillag, kivezetett nullapont nélkül. A <b>Dyn11</b>-nél ugyanezt a csillagpontot külön <b>n</b> kapocsra is kivezetik. Az n az y után, az óraszám elé kerül; az órajel marad 11. A kivezetett pont nullavezető csatlakoztatására használható; a földelés módját az n önmagában nem mondja meg.</p>
      <svg class="tf-neutral" viewBox="0 0 278 96" role="img" aria-label="Dyn11: a kisebb feszültségű oldal közös csillagpontja az n kapocsra ki van vezetve."><path d="M30 20V57H208V20M119 20V57" class="tf-wire"/>${dot(30,57)}${dot(119,57)}${dot(208,57)}<path d="M119 57V82H250" class="tf-neutral-wire"/>${dot(250,82,'tf-neutral-point')}${label(30,15,'a2')}${label(119,15,'b2')}${label(208,15,'c2')}${label(263,87,'n','tf-neutral-label')}</svg></section>
      ${voltageDetails()}
      </div>
    </section>`;
  }
  function reading(s){
    const p=s.pair,next=(p+1)%3,offset=groups[s.group].hour*30;
    if(s.rotation)return `Mindkét oldal fázorai azonos irányban, azonos szöggel forognak. Az egymáshoz viszonyított ${offset}°-os eltérés és a ${groups[s.group].hour} órás csoport megmarad. A leolvasáshoz válaszd a „Vissza 12-re” gombot.`;
    return p===0?`Az U_AB vonali feszültség a 12 órás referencia. Az U_ab ugyanilyen jellegű feszültség: ${groups[s.group].hour} óránál áll. Az óramutató járása szerint mérve ${groups[s.group].hour} × 30° = ${offset}° az eltérés.`:`Most az U_${PHASES[p]+PHASES[next]} és U_${LOWER[p]+LOWER[next]} vonali feszültséget látod. Mindkettő ugyanannyival fordult el az AB / ab párhoz képest, ezért köztük továbbra is ${offset}° az eltérés. Az óraszám leolvasásához válaszd az AB / ab párt.`;
  }
  function update(panel,s){
    panel.querySelector('[data-tf-winding]').innerHTML=windingDiagram(s);
    panel.querySelector('[data-tf-clock]').innerHTML=clockDiagram(s);
    panel.querySelector('[data-tf-explanation]').textContent=groups[s.group].text;
    panel.querySelector('[data-tf-result]').textContent=groups[s.group].hour+' óra = '+groups[s.group].hour*30+'°';
    panel.querySelector('[data-tf-reading]').textContent=reading(s);
    panel.querySelector('[data-tf-rotation]').textContent=s.rotation?'Közös forgás: '+number(normal(s.rotation))+'°':'A nagyobb feszültségű oldal referenciája 12-n áll.';
    panel.querySelectorAll('[data-tf-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tfGroup===s.group)));
    panel.querySelectorAll('[data-tf-pair]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.tfPair)===s.pair)));
    panel.querySelector('[data-tf-all]').checked=s.all;
    panel.querySelectorAll('[data-tf-view]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tfView===s.view));b.tabIndex=b.dataset.tfView===s.view?0:-1;});
    panel.querySelectorAll('[data-tf-view-panel]').forEach(p=>p.hidden=p.dataset.tfViewPanel!==s.view);
    panel.dataset.tfGroup=s.group;panel.dataset.tfRotation=normal(s.rotation);
    formatNotation(panel);
  }
  function stop(panel){const running=playing.get(panel);if(running){cancelAnimationFrame(running.frame);playing.delete(panel);}const b=panel.querySelector('[data-tf-play]');if(b){b.textContent='Egy kör forgás ↶';b.setAttribute('aria-pressed','false');}}
  function play(panel,s){
    if(playing.has(panel)){stop(panel);return;}
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){s.rotation=normal(s.rotation+30);update(panel,s);return;}
    const begun=performance.now(),from=s.rotation,run={frame:0};playing.set(panel,run);
    panel.querySelector('[data-tf-play]').textContent='Forgás megállítása';panel.querySelector('[data-tf-play]').setAttribute('aria-pressed','true');
    const tick=now=>{
      if(!panel.isConnected||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){stop(panel);return;}
      const t=Math.min(1,(now-begun)/4200);s.rotation=normal(from+360*t);
      panel.querySelector('[data-tf-clock]').innerHTML=clockDiagram(s);
      panel.querySelector('[data-tf-rotation]').textContent='Közös forgás: '+number(normal(s.rotation))+'°';
      panel.dataset.tfRotation=normal(s.rotation);
      if(t<.03){panel.querySelector('[data-tf-reading]').textContent=reading(s);formatNotation(panel);}
      if(t<1)run.frame=requestAnimationFrame(tick);else {s.rotation=from;update(panel,s);stop(panel);}
    };run.frame=requestAnimationFrame(tick);
  }
  function mount(root){
    if(!root)return;
    const panels=[...(root.matches?.('[data-tf-key]')?[root]:[]),...root.querySelectorAll('[data-tf-key]')];
    panels.forEach(panel=>{
      if(mounted.has(panel))return;mounted.add(panel);
      const s=stateByKey.get(panel.dataset.tfKey)||defaults();stateByKey.set(panel.dataset.tfKey,s);update(panel,s);
      panel.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button||!panel.contains(button))return;
        if(button.hasAttribute('data-tf-play')){play(panel,s);return;}
        stop(panel);
        if(button.dataset.tfView)s.view=button.dataset.tfView;
        else if(button.dataset.tfGroup){s.group=button.dataset.tfGroup;s.rotation=0;s.pair=0;}
        else if(button.hasAttribute('data-tf-pair')){s.pair=Number(button.dataset.tfPair);}
        else if(button.hasAttribute('data-tf-rotate'))s.rotation=normal(s.rotation+30);
        else if(button.hasAttribute('data-tf-reset')){s.rotation=0;s.pair=0;}
        else return;
        update(panel,s);
      });
      panel.addEventListener('change',event=>{if(event.target.matches('[data-tf-all]')){stop(panel);s.all=event.target.checked;update(panel,s);}});
      panel.addEventListener('keydown',event=>{
        const tab=event.target.closest('[data-tf-view]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();stop(panel);s.view=event.key==='Home'?'clock':event.key==='End'?'voltage':s.view==='clock'?'voltage':'clock';update(panel,s);panel.querySelector('[data-tf-view="'+s.view+'"]').focus();
      });
    });
  }
  const matches = lesson => lesson?.id==='machines-vector-group'||lesson?.variant==='transformer-vector-group';
  window.VVLearningTransformers={matches,render,mount,model,angleOf,normal};
})();
