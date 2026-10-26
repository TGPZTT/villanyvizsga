(function () {
  'use strict';
  const colors = ['#087985', '#a65b08', '#7551a5', '#26764e', '#b34666', '#365bc0', '#855a32'];
  const sub = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₙ':'n','ₕ':'h','ₑ':'e','ₘ':'m','ₗ':'l'};
  const key = text => text.replace(/[₀-₉ₙₕₑₘₗ]/gu, c => sub[c] || c).replace(/[\s_]/g, '');
  const meanings = {P:'Hatásos teljesítmény',Pn:'Névleges leadott teljesítmény',U:'Feszültség',I:'Áramerősség',I1n:'Primer névleges áram',I2n:'Szekunder névleges áram',I1:'Primer oldali áram',I2:'Mért szekunder áram',η:'Hatásfok','cosφ':'Teljesítménytényező','sinφ':'A fázisszög szinusza',ρ:'Fajlagos ellenállás',l:'Egyirányú vezetékhossz',lh:'Hurokhossz',A:'Vezető-keresztmetszet',E:'Villamos energia',t:'Üzemidő',c:'Egységár',C:'Költség',R:'Ellenállás',S:'Látszólagos teljesítmény',Sn:'Névleges látszólagos teljesítmény',f:'Hálózati frekvencia',p:'Póluspárok száma',nn:'Névleges fordulatszám',U0:'Fázisfeszültség',Z:'Hurokimpedancia',In:'Névleges áram',IW:'Hatásos áramösszetevő',ε:'Megengedett feszültségesés',Un:'Névleges feszültség',IΔn:'Névleges különbözeti kioldóáram',Ueleje:'Feszültség a vezeték elején',Uvége:'Feszültség a vezeték végén',Umax:'Méréshatár',N:'A teljes skála osztásainak száma',n:'Leolvasott osztások száma'};
  Object.assign(meanings,{Imotor:'Motor áramfelvétele',Iohmos:'Ohmos fogyasztó áramfelvétele',Zs:'Hurokimpedancia','Zs,max':'A feladatban számított impedanciahatár'});
  const make = (tag, cls, text) => {const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
  const mathText = text => {
    const fragment=document.createDocumentFragment();let at=0;
    for(const match of text.matchAll(/([\p{L}]+)_([\p{L}\d,–]+)/gu)){
      fragment.append(document.createTextNode(text.slice(at,match.index)+match[1]),make('sub','',match[2]));
      at=match.index+match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(at)));return fragment;
  };
  const numberKey = text => String(Number(text.replace(',', '.')));
  const numbers = text => [...text.matchAll(/\d+(?:[.,]\d+)?/gu)].filter(m => !/[\p{L}\d_√]/u.test(text[m.index-1] || '') && !/^\s*\/\s*min/u.test(text.slice(m.index+m[0].length)));
  const unitSource=String.raw`(?:Ω\s*(?:[·⋅*]\s*)?mm²\s*\/\s*m|Ft\s*\/\s*kWh|h\s*\/\s*min|1\s*\/\s*min|kWh|Wh|kW|W|kVA|VA|kvar|var|kV|V|mA|A|kΩ|Ω|mm²|m²|Hz|Ft|min|h|m|s|%)`;
  const leadingUnit=new RegExp(String.raw`^\s*${unitSource}(?![\p{L}])`,'u');
  const numericResult=text=>new RegExp(String.raw`^\s*[+−-]?\d+(?:[.,]\d+)?\s*(?:${unitSource})?\s*$`,'u').test(text);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paperReservations = new WeakMap();
  const convertedSameQuantity = (source,target) => {
    const unit = {kVA:['VA',1000],VA:['VA',1],kW:['W',1000],W:['W',1],kvar:['var',1000],var:['var',1],kWh:['Wh',1000],Wh:['Wh',1],kV:['V',1000],V:['V',1],mA:['A',.001],A:['A',1],kΩ:['Ω',1000],Ω:['Ω',1]};
    const a=unit[source.dataset.unit],b=unit[target.dataset.unit];
    if(!a||!b||a[0]!==b[0]||a[1]===b[1])return false;
    const left=Number(source.dataset.value)*a[1],right=Number(target.dataset.value)*b[1];
    return Math.abs(left-right)<=Math.max(.5,Math.max(Math.abs(left),Math.abs(right))*.001);
  };

  function setup(root=document) {
    window.VV_LABELS?.labelQuestionLinks(root, window.VV_DATA);
    window.VVFormula?.guide(root);
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
      const legend=new Map([...(formula?.querySelectorAll('.formula-legend > div') || [])].flatMap(row=>{const meaning=row.querySelector('dd').cloneNode(true);meaning.querySelectorAll('.unit-chip').forEach(unit=>unit.remove());return row.querySelector('dt').textContent.split(',').map(symbol=>{const name=key(symbol);let label=meaning.textContent.trim();if(/fázisszög tényezői|szinusza és koszinusza/u.test(label))label=name==='sinφ'?'A fázisszög szinusza':name==='cosφ'?'Teljesítménytényező':label;if(/primer és szekunder/u.test(label)&&/^[UI][12]n?$/u.test(name))label=meanings[name]||label.replace('primer és szekunder',name[1]==='1'?'primer':'szekunder');if(/fázis- és nullavezető keresztmetszete/u.test(label))label=name==='AL'?'A fázisvezető keresztmetszete':name==='AN'?'A nullavezető keresztmetszete':label;return [name,label]})}));
      const values=new Map(),symbols=new Map();let flowCount=0,currentStep='';
      const flowFor=(symbol,meaning)=>{const name=key(symbol);if(name&&symbols.has(name))return symbols.get(name);const flow={id:`value-${flowCount}`,color:colors[flowCount++%colors.length],label:meaning||legend.get(name)||meanings[name]||currentStep||'Számított érték'};if(name)symbols.set(name,flow);return flow};
      const token=(raw, unit, flow)=>{const displayUnit=unit.replace(/Ω\s*(?:[·⋅*]\s*)?mm²\s*\/\s*m/u,'Ω·mm²/m').replace(/1\s*\/\s*min/u,'min⁻¹');const el=make('span','calc-number-token',raw+displayUnit);if(displayUnit.includes('Ω·mm²/m')){el.style.maxWidth='100%';el.style.whiteSpace='normal'}el.dataset.value=numberKey(raw);el.dataset.unit=displayUnit.trim();if(flow){el.dataset.flow=flow.id;el.style.setProperty('--value-color',flow.color);el.dataset.tooltip=flow.label+(displayUnit?` (${displayUnit.trim()})`:'');el.setAttribute('aria-label',`${raw}${displayUnit}: ${el.dataset.tooltip}`);el.tabIndex=0;values.set(numberKey(raw),flow)}return el};
      function expression(text, suppliedFlow) {
        const fragment=document.createDocumentFragment();
        const pieces=text.split(/(;\s*)/u);
        for(const piece of pieces){
          const eq=piece.split(/([=≈])/u),seen=new Set();
          const variable=/^\s*([\p{L}₀-₉_Δφ\s,]+)\s*$/u.test(eq[0]) && !/\b(?:W|V|A|VA|kWh)\b/u.test(eq[0]) ? eq[0].trim() : '';
          const directReference=eq[2]&&symbols.get(key(eq[2].trim()));
          if(variable&&directReference){
            const name=key(variable);
            symbols.set(name,{...directReference,label:legend.get(name)||meanings[name]||directReference.label});
          }
          let outputFlow=variable?flowFor(variable):suppliedFlow;
          let symbolicOperands=[];
          eq.forEach((rawSegment,index)=>{
            let segment=rawSegment;
            let at=0,numberAt=0;
            const matches=numbers(segment);
            if(index>0&&!matches.length){
              const refs=[...segment.matchAll(/(?:sin|cos)[²]?\s*φ|[\p{L}\d₀-₉_Δφ]+/gu)].map(m=>symbols.get(key(m[0].replace('²','')))).filter(Boolean);
              if(refs.length)symbolicOperands=refs;
            }
            const aligned=matches.length===symbolicOperands.length?symbolicOperands:[];
            for(const m of matches){
              if(m.index<at)continue;
              fragment.append(mathText(segment.slice(at,m.index)));
              const value=numberKey(m[0]),known=/közös nevezőre/iu.test(currentStep)?null:values.get(value);
              const simpleResult=index>0 && numericResult(segment);
              // A new intermediate result gets its own identity. A unit conversion
              // keeps the identity of the quantity being converted.
              const conversion=!variable&&/(?:k?W|k?VA|k?var|m?A|k?Wh|%)/u.test(eq[0]);
              if(simpleResult&&!known&&!outputFlow){
                const first=numbers(eq[0])[0];
                outputFlow=conversion&&first?values.get(numberKey(first[0])):null;
                outputFlow ||= flowFor('',currentStep);
              }
              let flow=suppliedFlow || (simpleResult?outputFlow:null) || aligned[numberAt] || known;
              const tail=segment.slice(m.index+m[0].length);
              const unit=tail.match(leadingUnit)?.[0]||'';
              fragment.append(token(m[0],unit,flow));seen.add(value);at=m.index+m[0].length+unit.length;numberAt++;
            }
            fragment.append(mathText(segment.slice(at)));
            if(matches.length)symbolicOperands=[];
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
          const jointSymbols=symbol.split('=').map(s=>s.trim()).filter(Boolean);
          const jointCrossSection=jointSymbols.length>1&&jointSymbols.every(s=>/^A_?[LNln]$/u.test(s));
          const jointResistance=jointSymbols.length>1&&jointSymbols.every(s=>/^R[_₀-₉\d]+$/u.test(s));
          const rawMeaning=jointCrossSection?'A fázis- és nullavezető közös keresztmetszete':jointResistance?`${jointSymbols.join(' és ')} közös ellenállása`:legend.get(symbolKey)||meanings[symbolKey]||(/^[UI][12]n?$/u.test(symbolKey)?`${symbolKey[0]==='U'?'Feszültség':'Áramerősség'} a ${symbolKey[1]==='1'?'primer':'szekunder'} oldalon`:/^R[12]$/u.test(symbolKey)?'A két ellenállás azonos értéke':/^A[ln]$/u.test(symbolKey)?'A fázis- és nullavezető keresztmetszete':symbol);
          const row=make('div','worked-input-row');
          const inputFlow=flowFor(primary,rawMeaning);
          if(jointSymbols.length>1)jointSymbols.forEach(name=>symbols.set(key(name),inputFlow));
          const name=make('span','worked-input-symbol');name.append(mathText(symbol.length>12?'':symbol+' ='));const val=make('strong','worked-input-value');val.append(expression(value,inputFlow));
          const meaning=make('span','worked-input-meaning',rawMeaning);
          row.append(name,val,meaning);list.append(row);
        }
        return list;
      }
      example.replaceChildren();example.classList.add('calculation-board');
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
          const split=match&&numbers(match[1]).length&&numericResult(match[3]);
          const prefix=make('span','board-math-prefix');prefix.append(expression(split?match[1]:step.math));math.append(prefix);
          if(split){
            const result=make('span','board-math-result'),statement=step.math.split(';').at(-1);
            const symbol=statement.match(/^\s*([\p{L}_Δφ][\p{L}\d₀-₉_Δφ ,–]*?)\s*[=≈]/u)?.[1]?.trim()||'';
            let resultFlow=symbol?flowFor(symbol):null;
            const firstPart=statement.split(/[=≈]/u)[0],firstNumber=numbers(firstPart)[0];
            if(!resultFlow&&numericResult(firstPart)&&firstNumber)resultFlow=values.get(numberKey(firstNumber[0]));
            if(!resultFlow){
              const resultValue=numberKey(numbers(match[3])[0][0]);
              for(const later of original.slice(index+1)){
                for(const laterStatement of later.math.split(';')){
                  const laterSymbol=laterStatement.match(/^\s*([\p{L}_Δφ][\p{L}\d₀-₉_Δφ ,–]*?)\s*[=≈]/u)?.[1]?.trim(),laterResult=laterStatement.split(/[=≈]/u).at(-1);
                  if(laterSymbol&&numericResult(laterResult)&&numberKey(numbers(laterResult)[0][0])===resultValue){resultFlow=flowFor(laterSymbol);break;}
                }
                if(resultFlow)break;
              }
            }
            resultFlow ||= flowFor('',/nevező/iu.test(step.title)?'A nevező kiszámított értéke':'Számított érték');
            result.append(document.createTextNode(` ${match[2]} `),expression(match[3],resultFlow));math.append(result);line.classList.add('has-result-phase');
          }
          writing.append(math);
        }
        line.append(make('span','board-line-number',String(index+1).padStart(2,'0')),note,writing);paper.append(line);return line;
      });
      paper.querySelectorAll('.board-math-prefix,.board-math-result').forEach(el=>window.VVFormula?.formatDOM(el));
      currentStep='';
      lines.at(-1).classList.add('board-result');
      const toolbar=make('div','worked-stepper-controls'),previous=make('button','button outline','← Előző'),next=make('button','button primary','Következő lépés →');
      const status=make('div','worked-stepper-status'),label=make('strong'),meter=make('span','worked-stepper-meter');status.setAttribute('aria-live','polite');status.append(label,meter);toolbar.append(previous,status,next);
      previous.type=next.type='button';
      const questionId=source?.querySelector('[data-question-ref]')?.dataset.questionRef;
      const question=questionId&&window.VV_DATA?.questions?.find(item=>String(item.id)===questionId);
      const problem=make('div','board-problem');problem.append(make('p','board-problem-text',example.dataset.problem||question?.prompt||`${title}. Az alábbi adatokból vezesd le a keresett értéket.`));
      if(source){source.querySelector('span')?.remove();problem.append(source)}
      example.append(problem,paper,toolbar);
      const stages=lines.flatMap((line,index)=>[
        {index,phase:'instruction'}, {index,phase:'writing'},
        ...(line.classList.contains('has-result-phase')?[{index,phase:'result'}]:[])
      ]);
      let active=0,busy=false;const flights=new Set(),ghosts=new Set();
      const cancelFlights=()=>{for(const flight of flights)flight.cancel();flights.clear();for(const ghost of ghosts)ghost.remove();ghosts.clear();paper.querySelectorAll('.is-arriving').forEach(t=>t.classList.remove('is-arriving'))};
      let measureFrame=0,measureTimer=0,measureEpoch=0;
      function reservePaperHeight() {
        const width=paper.getBoundingClientRect().width;
        if(details&&!details.open || !width)return;
        const current=lines.map(line=>line.classList.contains('is-current'));
        const transition=paper.style.transitionProperty;
        // Font-ready checks must not shrink an already opened work surface.
        // Only a real window resize or closing starts a new reservation.
        const previous=parseFloat(paper.style.minHeight)||0;
        paper.style.transitionProperty='none';
        // Reserve the largest single-current-instruction layout, rather than
        // stacking every explanatory paragraph. Visibility phases and the
        // solution's active stage remain untouched during this measurement.
        paper.style.removeProperty('min-height');
        let height=previous;
        try {
          lines.forEach((_,index)=>{
            lines.forEach((line,i)=>line.classList.toggle('is-current',i===index));
            height=Math.max(height,Math.ceil(paper.getBoundingClientRect().height));
          });
        } finally {
          lines.forEach((line,index)=>line.classList.toggle('is-current',current[index]));
        }
        if(height)paper.style.minHeight=`${height}px`;
        paper.getBoundingClientRect();
        if(transition)paper.style.transitionProperty=transition;
        else paper.style.removeProperty('transition-property');
      }
      function schedulePaperMeasure() {
        if(details&&!details.open)return;
        if(measureFrame)cancelAnimationFrame(measureFrame);
        clearTimeout(measureTimer);
        const epoch=++measureEpoch;
        measureFrame=requestAnimationFrame(()=>{
          measureFrame=0;
          // Layout requests any newly used font before waiting for it.
          paper.getBoundingClientRect();
          Promise.resolve(document.fonts?.ready).then(()=>{
            if(epoch!==measureEpoch)return;
            // Let the guide's open-state geometry finish its first paint.
            measureTimer=setTimeout(()=>{
              measureTimer=0;
              measureFrame=requestAnimationFrame(()=>{
                measureFrame=0;
                if(epoch===measureEpoch)reservePaperHeight();
              });
            },80);
          });
        });
      }
      if(details)paperReservations.set(details,reservePaperHeight);
      window.addEventListener('resize',()=>{
        paper.style.removeProperty('min-height');
        schedulePaperMeasure();
      });
      document.fonts?.addEventListener('loadingdone',schedulePaperMeasure);
      function flyInto(targetPart,index) {
        if(reduced() || !Element.prototype.animate)return;
        const earlier=[...paper.querySelectorAll('[data-flow]')].filter(item=>{
          const row=item.closest('.board-line');
          return row&&lines.indexOf(row)<=index&&row.classList.contains('is-revealed')&&getComputedStyle(item).visibility==='visible'&&!targetPart.contains(item);
        });
        let delay=0;
        targetPart.querySelectorAll('[data-flow]').forEach(target=>{
          const source=earlier.findLast(item=>item.dataset.flow===target.dataset.flow&&item.dataset.value===target.dataset.value)
            || earlier.findLast(item=>item.dataset.flow===target.dataset.flow&&convertedSameQuantity(item,target));
          if(!source)return;
          const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
          if(!a.width || !b.width)return;
          const style=getComputedStyle(target),ghost=make('span','board-ghost',target.textContent);
          ghost.setAttribute('aria-hidden','true');
          Object.assign(ghost.style,{left:`${b.left}px`,top:`${b.top}px`,fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,letterSpacing:style.letterSpacing,lineHeight:style.lineHeight,color:style.color,borderBottom:style.borderBottom});
          document.body.append(ghost);ghosts.add(ghost);target.classList.add('is-arriving');
          const dx=a.left-b.left,dy=a.top-b.top;
          const animation=ghost.animate([
            {transform:`translate(${dx}px,${dy}px)`,opacity:.75},
            {transform:`translate(${dx*.46}px,${dy*.46-14}px)`,opacity:1,offset:.52},
            {transform:'translate(0,0)',opacity:1}
          ],{duration:1250,delay,easing:'cubic-bezier(.2,.76,.2,1)',fill:'both'});
          delay+=85;flights.add(animation);
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
        label.textContent=`${stage.index+1} / ${lines.length} lépés · ${stage.phase==='instruction'?'útmutatás':stage.phase==='result'?'eredmény':'felírás'}`;
        meter.style.setProperty('--step-progress',`${(active+1)/stages.length*100}%`);
        previous.disabled=active===0;
        const upcoming=stages[active+1];
        next.textContent=!upcoming?'Újrakezdés ↺':upcoming.phase==='instruction'?'Következő lépés →':upcoming.phase==='result'?'Eredmény felírása →':lines[upcoming.index].classList.contains('board-data-line')?'Adatok felírása →':'Képlet és számok →';
        example.classList.toggle('is-complete',!upcoming);
        if(animate){
          const line=lines[stage.index];line.classList.add('board-new-line');
          // Reveal only the part just written. Scrolling the entire row can
          // pull an already visible result back towards its older instruction.
          const target=stage.phase==='instruction'?line.querySelector('.board-note'):line.querySelector('.board-writing');
          const toolbarBox=toolbar.getBoundingClientRect(),targetBox=target.getBoundingClientRect();
          const safeBottom=Math.min(innerHeight-12,toolbarBox.top-12);
          if(targetBox.top<12||targetBox.bottom>safeBottom){
            target.style.scrollMarginBottom=`${Math.ceil(toolbarBox.height)+12}px`;
            // Settle before measuring the flying copy's landing coordinates.
            target.scrollIntoView({block:'nearest',behavior:'instant'});
          }
          void line.offsetWidth;
          if(stage.phase==='writing')flyInto(line.querySelector('.board-math-prefix')||line.querySelector('.board-writing'),stage.index);
          if(stage.phase==='result')flyInto(line.querySelector('.board-math-result'),stage.index);
        }
      }
      previous.addEventListener('click',()=>{if(active>0)show(active-1)});
      next.addEventListener('click',()=>{
        if(busy)return;
        busy=true;show(active===stages.length-1?0:active+1,true);
        const pause=reduced()?0:flights.size?1350:180;
        if(flights.size)next.disabled=true;
        setTimeout(()=>{busy=false;next.disabled=false},pause);
      });
      details?.addEventListener('toggle',()=>{
        if(!details.open){
          cancelFlights();measureEpoch++;clearTimeout(measureTimer);measureTimer=0;
          if(measureFrame)cancelAnimationFrame(measureFrame);
          measureFrame=0;paper.style.removeProperty('min-height');
        } else {
          // Guide navigation reserves synchronously after applying its open
          // layout. Also support a details element opened without that guide.
          if(!paper.style.minHeight)reservePaperHeight();
          schedulePaperMeasure();
        }
      });
      show(0);
      if(!details||details.open){reservePaperHeight();schedulePaperMeasure();}
    });
  }
  window.VV_WORKED={setup,reserve:details=>paperReservations.get(details)?.()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setup(),{once:true});else setup();
})();
