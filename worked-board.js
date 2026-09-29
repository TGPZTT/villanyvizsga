(function () {
  'use strict';
  const colors = ['#087985', '#a65b08', '#7551a5', '#26764e', '#b34666', '#365bc0', '#855a32'];
  const sub = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₙ':'n','ₕ':'h','ₑ':'e','ₘ':'m','ₗ':'l'};
  const key = text => text.replace(/[₀-₉ₙₕₑₘₗ]/gu, c => sub[c] || c).replace(/[\s_]/g, '');
  const meanings = {P:'Hatásos teljesítmény',Pn:'Névleges leadott teljesítmény',U:'Feszültség',I:'Áramerősség',I1n:'Primer névleges áram',I2n:'Szekunder névleges áram',I1:'Primer oldali áram',I2:'Mért szekunder áram',η:'Hatásfok','cosφ':'Teljesítménytényező','sinφ':'A fázisszög szinusza',ρ:'Fajlagos ellenállás',l:'Egyirányú vezetékhossz',lh:'Hurokhossz',A:'Vezető-keresztmetszet',E:'Villamos energia',t:'Üzemidő',c:'Egységár',C:'Költség',R:'Ellenállás',S:'Látszólagos teljesítmény',Sn:'Névleges látszólagos teljesítmény',f:'Hálózati frekvencia',p:'Póluspárok száma',nn:'Névleges fordulatszám',U0:'Fázisfeszültség',Z:'Hurokimpedancia',In:'Névleges áram',IW:'Hatásos áramösszetevő',ε:'Megengedett feszültségesés',Un:'Névleges feszültség',IΔn:'Névleges különbözeti kioldóáram',Ueleje:'Feszültség a vezeték elején',Uvége:'Feszültség a vezeték végén',Umax:'Méréshatár',N:'A teljes skála osztásainak száma',n:'Leolvasott osztások száma'};
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
      const values=new Map(),symbols=new Map();let flowCount=0,currentStep='';
      const flowFor=(symbol,meaning)=>{const name=key(symbol);if(name&&symbols.has(name))return symbols.get(name);const flow={id:`value-${flowCount}`,color:colors[flowCount++%colors.length],label:meaning||meanings[name]||legend.get(name)||currentStep||'Számított érték'};if(name)symbols.set(name,flow);return flow};
      const token=(raw, unit, flow)=>{const el=make('span','calc-number-token',raw+unit);el.dataset.value=numberKey(raw);if(flow){el.dataset.flow=flow.id;el.style.setProperty('--value-color',flow.color);el.dataset.tooltip=flow.label+(unit?` (${unit.trim()})`:'');el.setAttribute('aria-label',`${raw}${unit}: ${el.dataset.tooltip}`);el.tabIndex=0;values.set(numberKey(raw),flow)}return el};
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
              if(m.index<at)continue;
              fragment.append(mathText(segment.slice(at,m.index)));
              const value=numberKey(m[0]),known=values.get(value);
              const simpleResult=index>0 && numbers(segment).length===1 && !/[+−*/]/u.test(segment.replace(m[0],''));
              // A new intermediate result gets its own identity. A unit conversion
              // keeps the identity of the quantity being converted.
              const conversion=!variable&&/(?:k?W|k?VA|k?var|m?A|k?Wh|%)/u.test(eq[0]);
              if(simpleResult&&!known&&!outputFlow){
                const first=numbers(eq[0])[0];
                outputFlow=conversion&&first?values.get(numberKey(first[0])):null;
                outputFlow ||= flowFor('',currentStep);
              }
              let flow=suppliedFlow || known || (simpleResult?outputFlow:null);
              const tail=segment.slice(m.index+m[0].length);
              const unit=tail.match(/^\s*(?:kWh|Wh|kW|W|kVA|VA|kvar|var|kV|V|mA|A|Ω|mm²|m²|Hz|Ft|%)(?![\p{L}])/u)?.[0]||'';
              fragment.append(token(m[0],unit,flow));seen.add(value);at=m.index+m[0].length+unit.length;
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
          const rawMeaning=meanings[symbolKey]||legend.get(symbolKey)||(/^[UI][12]n?$/u.test(symbolKey)?`${symbolKey[0]==='U'?'Feszültség':'Áramerősség'} a ${symbolKey[1]==='1'?'primer':'szekunder'} oldalon`:/^R[12]$/u.test(symbolKey)?'A két ellenállás azonos értéke':/^A[ln]$/u.test(symbolKey)?'A fázis- és nullavezető keresztmetszete':symbol);
          const row=make('div','worked-input-row');
          const name=make('span','worked-input-symbol');name.append(mathText(symbol.length>12?'':symbol+' ='));const val=make('strong','worked-input-value');val.append(expression(value,flowFor(primary,rawMeaning)));
          const meaning=make('span','worked-input-meaning',rawMeaning);
          row.append(name,val,meaning);list.append(row);
        }
        return list;
      }
      example.replaceChildren();example.classList.add('calculation-board');
      const head=make('div','board-heading');head.append(make('strong','',title),make('span','board-mode','Lépésenként'));
      const paper=make('div','board-paper');paper.setAttribute('aria-label',`${title} – megoldási lap`);
      const lines=original.map((step,index)=>{
        currentStep=step.title;
        const line=make('section','board-line');line.dataset.step=String(index+1);
        const writing=make('div','board-writing'),note=make('div','board-note');
        note.append(make('strong','',step.title),make('p','',step.note));
        if(index===0 && /^adat|^írd ki az adat/iu.test(step.title)){writing.append(inputs(step.math));line.classList.add('board-data-line')}
        else {
          const math=make('div','board-equation');math.setAttribute('role','math');math.setAttribute('aria-label',step.math);
          const match=step.math.match(/^(.*)([=≈])\s*([^=≈]+)$/u);
          const split=match&&numbers(match[1]).length&&numbers(match[3]).length;
          const prefix=make('span','board-math-prefix');prefix.append(expression(split?match[1]:step.math));math.append(prefix);
          if(split){const result=make('span','board-math-result');result.append(document.createTextNode(` ${match[2]} `),expression(match[3]));math.append(result);line.classList.add('has-result-phase')}
          writing.append(math);
        }
        line.append(make('span','board-line-number',String(index+1).padStart(2,'0')),note,writing);paper.append(line);return line;
      });
      currentStep='';
      lines.at(-1).classList.add('board-result');
      const toolbar=make('div','worked-stepper-controls'),previous=make('button','button outline','← Előző'),next=make('button','button primary','Következő lépés →');
      const status=make('div','worked-stepper-status'),label=make('strong'),meter=make('span','worked-stepper-meter');status.setAttribute('aria-live','polite');status.append(label,meter);toolbar.append(previous,status,next);
      previous.type=next.type='button';example.append(head);if(source)example.append(source);example.append(toolbar,paper);
      const stages=lines.flatMap((line,index)=>[
        {index,phase:'instruction'}, {index,phase:'writing'},
        ...(line.classList.contains('has-result-phase')?[{index,phase:'result'}]:[])
      ]);
      let active=0,busy=false;const flights=new Set(),ghosts=new Set();
      const cancelFlights=()=>{for(const flight of flights)flight.cancel();flights.clear();for(const ghost of ghosts)ghost.remove();ghosts.clear();paper.querySelectorAll('.is-arriving').forEach(t=>t.classList.remove('is-arriving'))};
      function flyInto(targetPart,index) {
        if(reduced() || !Element.prototype.animate)return;
        const earlier=[...paper.querySelectorAll('[data-flow]')].filter(item=>{
          const row=item.closest('.board-line');
          return row&&lines.indexOf(row)<=index&&row.classList.contains('is-revealed')&&getComputedStyle(item).visibility==='visible'&&!targetPart.contains(item);
        });
        let delay=0;
        targetPart.querySelectorAll('[data-flow]').forEach(target=>{
          const source=earlier.findLast(item=>item.dataset.flow===target.dataset.flow&&item.dataset.value===target.dataset.value);
          if(!source)return;
          const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
          if(!a.width || !b.width)return;
          const style=getComputedStyle(target),ghost=make('span','board-ghost',target.textContent);
          ghost.setAttribute('aria-hidden','true');
          Object.assign(ghost.style,{left:`${b.left}px`,top:`${b.top}px`,width:`${b.width}px`,height:`${b.height}px`,font:style.font,letterSpacing:style.letterSpacing,lineHeight:style.lineHeight,color:style.color,borderBottom:style.borderBottom});
          document.body.append(ghost);ghosts.add(ghost);target.classList.add('is-arriving');
          const dx=a.left-b.left,dy=a.top-b.top,sx=a.width/b.width,sy=a.height/b.height;
          const animation=ghost.animate([
            {transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`,opacity:.96},
            {transform:`translate(${dx*.38}px,${dy*.38-9}px) scale(${1+(sx-1)*.38},${1+(sy-1)*.38})`,opacity:1,offset:.62},
            {transform:'translate(0,0) scale(1,1)',opacity:1}
          ],{duration:720,delay,easing:'cubic-bezier(.22,.72,.19,1)',fill:'both'});
          delay+=48;flights.add(animation);
          animation.finished.catch(()=>{}).finally(()=>{ghost.remove();ghosts.delete(ghost);target.classList.remove('is-arriving');flights.delete(animation)});
        });
      }
      function show(stageIndex,animate=false) {
        cancelFlights();active=stageIndex;
        const stage=stages[active];
        lines.forEach((line,i)=>{
          const revealed=i<stage.index||i===stage.index;
          line.classList.toggle('is-revealed',revealed);
          line.classList.toggle('is-current',i===stage.index);
          line.classList.toggle('is-writing-visible',i<stage.index||i===stage.index&&stage.phase!=='instruction');
          line.classList.toggle('is-result-visible',i<stage.index||i===stage.index&&stage.phase==='result');
          line.classList.remove('board-new-line');
        });
        label.textContent=`${stage.index+1} / ${lines.length} lépés · ${stage.phase==='instruction'?'instrukció':stage.phase==='result'?'eredmény':'felírás'}`;
        meter.style.setProperty('--step-progress',`${(active+1)/stages.length*100}%`);
        previous.disabled=active===0;
        const upcoming=stages[active+1];
        next.textContent=!upcoming?'Újrakezdés ↺':upcoming.phase==='instruction'?'Következő instrukció →':upcoming.phase==='result'?'Eredmény felírása →':'Képlet és számok →';
        example.classList.toggle('is-complete',!upcoming);
        if(animate){
          const line=lines[stage.index];line.classList.add('board-new-line');
          line.scrollIntoView({block:'nearest',behavior:'instant'});
          void line.offsetWidth;
          if(stage.phase==='writing')flyInto(line.querySelector('.board-math-prefix')||line.querySelector('.board-writing'),stage.index);
          if(stage.phase==='result')flyInto(line.querySelector('.board-math-result'),stage.index);
        }
      }
      previous.addEventListener('click',()=>{if(active>0)show(active-1)});
      next.addEventListener('click',()=>{if(busy)return;busy=true;show(active===stages.length-1?0:active+1,true);setTimeout(()=>busy=false,reduced()?0:160)});
      details?.addEventListener('toggle',()=>{if(!details.open)cancelFlights()});
      show(0);
    });
  }
  window.VV_WORKED={setup};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setup(),{once:true});else setup();
})();
