(function () {
  'use strict';
  const colors = ['#087985', '#a65b08', '#7551a5', '#26764e', '#b34666', '#365bc0', '#855a32'];
  const sub = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₙ':'n','ₕ':'h','ₑ':'e','ₘ':'m','ₗ':'l'};
  const key = text => text.replace(/[₀-₉ₙₕₑₘₗ]/gu, c => sub[c] || c).replace(/[\s_]/g, '');
  const meanings = {P:'Hatásos teljesítmény',Pn:'Névleges leadott teljesítmény',U:'Feszültség',I:'Áramerősség',η:'Hatásfok','cosφ':'Teljesítménytényező','sinφ':'A fázisszög szinusza',ρ:'Fajlagos ellenállás',l:'Egyirányú vezetékhossz',lh:'Hurokhossz',A:'Vezető-keresztmetszet',E:'Villamos energia',t:'Üzemidő',c:'Egységár',C:'Költség',R:'Ellenállás',S:'Látszólagos teljesítmény',Sn:'Névleges látszólagos teljesítmény',f:'Hálózati frekvencia',p:'Póluspárok száma',nn:'Névleges fordulatszám',U0:'Fázisfeszültség',Z:'Hurokimpedancia',In:'Névleges áram',IW:'Hatásos áramösszetevő',ε:'Megengedett feszültségesés',Un:'Névleges feszültség',IΔn:'Névleges különbözeti kioldóáram',Ueleje:'Feszültség a vezeték elején',Uvége:'Feszültség a vezeték végén',Umax:'Méréshatár',N:'A teljes skála osztásainak száma',n:'Leolvasott osztások száma'};
  const make = (tag, cls, text) => {const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
  const mathText = text => {
    const fragment=document.createDocumentFragment();let at=0;
    for(const match of text.matchAll(/([\p{L}]+)_([\p{L}\d]+)/gu)){
      fragment.append(document.createTextNode(text.slice(at,match.index)+match[1]),make('sub','',match[2]));
      at=match.index+match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(at)));return fragment;
  };
  const numberKey = text => String(Number(text.replace(',', '.')));
  const numbers = text => [...text.matchAll(/\d+(?:[.,]\d+)?/gu)].filter(m => !/[\p{L}\d_√]/u.test(text[m.index-1] || '') && !/^\s*\/\s*min/u.test(text.slice(m.index+m[0].length)));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(root=document) {
    root.querySelectorAll('.worked-steps').forEach(example => {
      if(example.dataset.boardReady)return;
      example.dataset.boardReady='true';
      const original=[...example.querySelectorAll('.worked-steps__panel')].map(panel=>({
        title:panel.querySelector('.worked-steps__body > strong')?.textContent || '',
        note:panel.querySelector('.worked-steps__body > p')?.textContent || '',
        math:panel.querySelector('.worked-step-math')?.textContent || ''
      }));
      if(!original.length)return;
      const title=example.querySelector('.worked-steps__head strong')?.textContent || 'Mintamegoldás';
      const source=example.querySelector('.worked-source')?.cloneNode(true);
      if(source){
        const link=source.querySelector('[data-question-ref]');
        if(link)link.href=`${location.pathname.endsWith('/szamolas.html')?'index.html':''}#question/${encodeURIComponent(link.dataset.questionRef)}`;
      }
      const details=example.closest('.worked-details');
      let formula=details?.previousElementSibling;
      while(formula && !formula.classList.contains('formula-card'))formula=formula.previousElementSibling;
      const legend=new Map([...(formula?.querySelectorAll('.formula-legend > div') || [])].flatMap(row=>{const meaning=row.querySelector('dd').cloneNode(true);meaning.querySelectorAll('.unit-chip').forEach(unit=>unit.remove());return row.querySelector('dt').textContent.split(',').map(symbol=>[key(symbol),meaning.textContent.trim()])}));
      const values=new Map(),symbols=new Map();let flowCount=0;
      const flowFor=symbol=>{const name=key(symbol);if(name&&symbols.has(name))return symbols.get(name);const flow={id:`value-${flowCount}`,color:colors[flowCount++%colors.length]};if(name)symbols.set(name,flow);return flow};
      const token=(raw, flow)=>{const el=make('span','calc-number-token',raw);el.dataset.value=numberKey(raw);if(flow){el.dataset.flow=flow.id;el.style.setProperty('--value-color',flow.color);values.set(numberKey(raw),flow)}return el};
      function expression(text, suppliedFlow) {
        const fragment=document.createDocumentFragment();
        const pieces=text.split(/(;\s*)/u);
        for(const piece of pieces){
          const eq=piece.split(/([=≈])/u),seen=new Set();
          const variable=/^\s*([\p{L}₀-₉_Δφ\s,]+)\s*$/u.test(eq[0]) && !/\b(?:W|V|A|VA|kWh)\b/u.test(eq[0]) ? eq[0].trim() : '';
          let outputFlow=suppliedFlow || (variable?flowFor(variable):null);
          eq.forEach((segment,index)=>{
            let at=0;
            for(const m of numbers(segment)){
              fragment.append(mathText(segment.slice(at,m.index)));
              const value=numberKey(m[0]),known=values.get(value);
              const simpleResult=index>0 && numbers(segment).length===1 && !/[+−*/]/u.test(segment.replace(m[0],''));
              // A new intermediate result gets its own identity. A unit conversion
              // keeps the identity of the quantity being converted.
              const conversion=!variable&&/(?:k?W|k?VA|k?var|m?A|k?Wh|%)/u.test(eq[0]);
              if(simpleResult&&!known&&!outputFlow){
                const first=numbers(eq[0])[0];
                outputFlow=conversion&&first?values.get(numberKey(first[0])):null;
                outputFlow ||= flowFor('');
              }
              let flow=suppliedFlow || known || (simpleResult?outputFlow:null);
              fragment.append(token(m[0],flow));seen.add(value);at=m.index+m[0].length;
            }
            fragment.append(mathText(segment.slice(at)));
          });
        }
        return fragment;
      }
      function inputs(text) {
        const list=make('div','worked-input-list');list.setAttribute('aria-label','Megadott adatok');
        let entries=text.split(/\s*;\s*/u);
        // A transformer ratio carries two independently reusable input values.
        entries=entries.flatMap(entry=>{const ratio=entry.match(/^([^=]+?)\s*\/\s*([^=]+?)\s*=\s*([\d.,]+\s*A)\s*\/\s*([\d.,]+\s*A)$/u);return ratio?[`${ratio[1]} = ${ratio[3]}`,`${ratio[2]} = ${ratio[4]}`]:[entry]});
        for(const entry of entries){
          const match=entry.match(/^(.+?)\s*=\s*([\d.,].*)$/u);
          if(!match){const fallback=make('div','board-equation');fallback.append(expression(entry));list.append(fallback);continue}
          const symbol=match[1].trim(),value=match[2].trim(),primary=symbol.split('=')[0].trim(),symbolKey=key(primary);
          const rawMeaning=legend.get(symbolKey)||meanings[symbolKey]||(/^[UI][12]n?$/u.test(symbolKey)?`${symbolKey[0]==='U'?'Feszültség':'Áramerősség'} a ${symbolKey[1]==='1'?'primer':'szekunder'} oldalon`:/^R[12]$/u.test(symbolKey)?'A két ellenállás azonos értéke':/^A[ln]$/u.test(symbolKey)?'A fázis- és nullavezető keresztmetszete':symbol);
          const row=make('div','worked-input-row');
          const name=make('span','worked-input-symbol');name.append(mathText(symbol.length>12?'':symbol+' ='));const val=make('strong','worked-input-value');val.append(expression(value,flowFor(primary)));
          const meaning=make('span','worked-input-meaning',rawMeaning);
          row.append(name,val,meaning);list.append(row);
        }
        return list;
      }
      example.replaceChildren();example.classList.add('calculation-board');
      const head=make('div','board-heading');head.append(make('strong','',title),make('span','board-mode','Lépésenként'));
      const paper=make('div','board-paper');paper.setAttribute('aria-label',`${title} – megoldási lap`);
      const lines=original.map((step,index)=>{
        const line=make('section','board-line');line.dataset.step=String(index+1);
        const writing=make('div','board-writing'),note=make('div','board-note');
        note.append(make('strong','',step.title),make('p','',step.note));
        if(index===0 && /^adat|^írd ki az adat/iu.test(step.title)){writing.append(inputs(step.math));line.classList.add('board-data-line')}
        else {const math=make('div','board-equation');math.setAttribute('role','math');math.setAttribute('aria-label',step.math);math.append(expression(step.math));writing.append(math)}
        line.append(make('span','board-line-number',String(index+1).padStart(2,'0')),writing,note);paper.append(line);return line;
      });
      lines.at(-1).classList.add('board-result');
      const toolbar=make('div','worked-stepper-controls'),previous=make('button','button outline','← Előző'),next=make('button','button primary','Következő lépés →');
      const status=make('div','worked-stepper-status'),label=make('strong'),meter=make('span','worked-stepper-meter');status.setAttribute('aria-live','polite');status.append(label,meter);toolbar.append(previous,status,next);
      previous.type=next.type='button';example.append(head);if(source)example.append(source);example.append(paper,toolbar);
      let active=0,busy=false;const flights=new Set();
      const cancelFlights=()=>{for(const flight of flights)flight.cancel();flights.clear();paper.querySelectorAll('.is-arriving').forEach(t=>t.classList.remove('is-arriving'))};
      function flyInto(line) {
        if(reduced() || !Element.prototype.animate)return;
        const earlier=lines.slice(0,active).flatMap(item=>[...item.querySelectorAll('[data-flow]')]);
        let delay=0;
        line.querySelectorAll('[data-flow]').forEach(target=>{
          const source=earlier.findLast(item=>item.dataset.flow===target.dataset.flow&&item.dataset.value===target.dataset.value);
          if(!source)return;
          const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
          if(!a.width || !b.width)return;
          const ghost=source.cloneNode(true);ghost.className='board-ghost';ghost.setAttribute('aria-hidden','true');ghost.style.left=`${a.left}px`;ghost.style.top=`${a.top}px`;ghost.style.font=getComputedStyle(source).font;
          document.body.append(ghost);target.classList.add('is-arriving');
          const dx=b.left-a.left,dy=b.top-a.top;
          const animation=ghost.animate([{transform:'translate(0,0)',opacity:.95},{transform:`translate(${dx*.5}px,${dy*.5-22}px)`,opacity:1,offset:.5},{transform:`translate(${dx}px,${dy}px)`,opacity:1}],{duration:780,delay:delay,easing:'cubic-bezier(.35,0,.25,1)',fill:'both'});
          delay+=80;flights.add(animation);
          animation.finished.catch(()=>{}).finally(()=>{ghost.remove();target.classList.remove('is-arriving');flights.delete(animation)});
        });
      }
      function show(index,animate=false) {
        cancelFlights();active=index;
        lines.forEach((line,i)=>{line.hidden=i>active;line.classList.toggle('is-current',i===active);line.classList.remove('board-new-line')});
        label.textContent=`${active+1} / ${lines.length} lépés`;meter.style.setProperty('--step-progress',`${(active+1)/lines.length*100}%`);
        previous.disabled=active===0;next.textContent=active===lines.length-1?'Újrakezdés ↺':'Következő lépés →';example.classList.toggle('is-complete',active===lines.length-1);
        if(animate){const line=lines[active];line.classList.add('board-new-line');void line.offsetWidth;flyInto(line)}
      }
      previous.addEventListener('click',()=>{if(active>0)show(active-1)});
      next.addEventListener('click',()=>{if(busy)return;busy=true;show(active===lines.length-1?0:active+1,true);setTimeout(()=>busy=false,reduced()?0:240)});
      details?.addEventListener('toggle',()=>{if(!details.open)cancelFlights()});
      show(0);
    });
  }
  window.VV_WORKED={setup};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setup(),{once:true});else setup();
})();
