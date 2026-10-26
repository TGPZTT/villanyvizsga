(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const palette = ['#087985','#a65b08','#7551a5','#26764e','#b34666','#365bc0','#855a32'];
  const key = text => String(text).replace(/[\s_]/gu,'').replace(/[₀-₉]/gu,c=>String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)));
  const textMath = text => esc(text).replace(/([\p{L}]+)_([\p{L}\d,–]+)/gu,'$1<sub>$2</sub>');
  const noUnit = value => !value || /nincs|nélkül|dimenzió/u.test(value);
  const unit = value => noUnit(value) ? 'Mértékegység nélkül' : value;
  let serial = 0;
  function domMathText(element) {
    const clone=element.cloneNode(true);
    clone.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));
    clone.querySelectorAll('sub').forEach(el=>el.replaceWith('_'+el.textContent));
    clone.querySelectorAll('sup').forEach(el=>el.replaceWith(el.textContent.replace(/\d/gu,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)])));
    return clone.textContent;
  }

  // This parser changes notation only. It does not evaluate, simplify or reorder
  // an expression. A fraction groups its numerator and denominator explicitly.
  function typeset(source, symbols = [], opaque = []) {
    // A conditional rule keeps both complete clauses on a narrow screen.
    if(source.includes('→'))return `<span class="fm-implication">${source.split('→').map(part=>`<span class="fm-clause">${typeset(part.trim(),symbols,opaque)}</span>`).join('<span class="fm-implies" aria-hidden="true">→</span>')}</span>`;
    const terms = [...symbols].sort((a,b)=>b.symbol.length-a.symbol.length);
    const renderSymbol=(term,content=textMath(term.symbol))=>{
      const angle=/^(?:sin|cos) φ$/u.test(term.symbol)&&terms.find(t=>t.symbol==='φ');
      if(angle)content=content.replace(/ φ$/u,` <span class="fm-symbol" data-fm-symbol="φ" style="--fm-color:${angle.color}" tabindex="0" data-tooltip="${esc(angle.meaning+'. '+unit(angle.unit))}">φ</span>`);
      return `<span class="fm-symbol" data-fm-symbol="${esc(term.symbol)}" style="--fm-color:${term.color}" tabindex="0" data-tooltip="${esc(term.meaning+'. '+unit(term.unit))}">${content}</span>`;
    };
    const tokens=[]; let at=0;
    while(at<source.length) {
      if (/\s/u.test(source[at])) { at++; continue; }
      const marker=source.slice(at).match(/^\uE000(\d+)\uE001/u);
      if(marker){tokens.push({html:opaque[Number(marker[1])]||''});at+=marker[0].length;continue;}
      const poweredTrig=source.slice(at).match(/^(sin|cos)([²³⁴⁵⁶⁷⁸⁹⁰¹]+)\s*φ/u);
      const trigTerm=poweredTrig&&terms.find(t=>t.symbol===poweredTrig[1]+' φ');
      if(trigTerm){
        const exponent=poweredTrig[2].replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/gu,c=>String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)));
        tokens.push({html:renderSymbol(trigTerm,`${poweredTrig[1]}<sup>${exponent}</sup> φ`)});
        at+=poweredTrig[0].length;continue;
      }
      const term=terms.find(t=>source.startsWith(t.symbol,at) && !(/[\p{L}]/u.test(source[at-1]||'')&&/[\p{L}]/u.test(t.symbol[0])) && !(/[\p{L}]/u.test(source[at+t.symbol.length]||'')&&/[\p{L}]/u.test(t.symbol.at(-1))));
      if(term){tokens.push({html:renderSymbol(term)});at+=term.symbol.length;continue;}
      const areaUnit=source.slice(at).match(/^(mm|cm|m)([²³])/u);
      if(areaUnit){tokens.push({html:`<span class="fm-atom">${areaUnit[1]}<sup>${areaUnit[2]==='²'?'2':'3'}</sup></span>`});at+=areaUnit[0].length;continue;}
      const ch=source[at];
      if('()/+−-=≈≤≥<>·×⋅*;:√'.includes(ch) || ch==='x' && /\s/u.test(source[at-1]||'') && /\s/u.test(source[at+1]||'')) {tokens.push({op:'×⋅*x'.includes(ch)?'·':ch==='-'?'−':ch});at++;continue;}
      const power=source.slice(at).match(/^[²³⁴⁵⁶⁷⁸⁹⁰¹]+/u);
      if(power){tokens.push({html:`<sup>${esc(power[0].replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/gu,c=>String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))))}</sup>`,power:true});at+=power[0].length;continue;}
      const raw=source.slice(at).match(/^(?:\d+(?:[.,]\d+)?|[\p{L}\p{M}₀-₉ᵦₑₕΔφ]+(?:_[\p{L}\d,–]+)?|[%°]|…|.)/u)[0];
      tokens.push({html:`<span class="fm-atom">${textMath(raw)}</span>`});at+=raw.length;
    }
    let pos=0;
    const row=parts=>`<span class="fm-row">${parts.join('')}</span>`;
    const factor=()=>{
      const token=tokens[pos++]; if(!token)return '';
      if(token.op==='('){const inner=expression(0);if(tokens[pos]?.op===')')pos++;return {group:inner,html:row(['<span class="fm-bracket">(</span>',inner,'<span class="fm-bracket">)</span>'])};}
      if(token.op==='√'){
        const inner=factor();
        let radicand=typeof inner==='string'?inner:inner?.group||inner?.html||'';
        if(!radicand)return {html:'<span class="fm-atom">√</span>'};
        // A postfix power belongs under an unparenthesised radical. A power
        // after an explicit closing parenthesis stays outside that radical.
        if(!inner?.group)while(tokens[pos]?.power)radicand=row([radicand,tokens[pos++].html]);
        return {html:`<span class="fm-root"><span class="fm-root-symbol">√</span><span class="fm-root-glyph" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="M1 52 L19 44 L39 91 L83 0 H102" vector-effect="non-scaling-stroke"/></svg></span><span class="fm-radicand">${radicand}</span></span>`};
      }
      if(token.op==='−'||token.op==='+'){const inner=factor();return {html:row([esc(token.op),inner?.html||inner||''])};}
      return {html:token.html||esc(token.op)};
    };
    const html=node=>typeof node==='string'?node:node?.html||'';
    const ungroup=node=>typeof node==='string'?node:node?.group||node?.html||'';
    function expression(min) {
      let left=factor();
      while(pos<tokens.length && tokens[pos].op!==')') {
        const t=tokens[pos];
        const precedence=t.op==='·'||t.op==='/'?3:t.op==='+'||t.op==='−'?2:t.op&&'=≈≤≥<>:;'.includes(t.op)?1:4;
        if(precedence<min)break;
        if(!t.op){pos++;left={html:row([html(left),t.power?t.html:`<span class="fm-space">${t.html}</span>`])};continue;}
        pos++;
        const right=expression(precedence+1);
        left=t.op==='/'?{html:`<span class="fm-frac"><span class="fm-numerator">${ungroup(left)}</span><span class="fm-denominator">${ungroup(right)}</span></span>`}:{html:row([html(left),`<span class="fm-operator">${esc(t.op)}</span>`,html(right)])};
      }
      return html(left);
    }
    return expression(0);
  }

  function expandTerms(symbols) {
    const expanded=symbols.flatMap((term,index)=>{
      // A comma can belong to a subscript (I_n,1f), so split only on comma-space.
      let names=String(term.symbol||'').split(/,\s+/u);
      const range=names.length===1 && / … /u.test(names[0]);
      if(range)names=names[0].split(/ … /u);
      return names.map((name,i)=>{
        name=name.trim();let meaning=String(term.meaning||'').replace(/primer és szekunder /u,i===0?'primer ':'szekunder ');
        if(/^sin φ$|^cos φ$/u.test(name)&&/szinusza és koszinusza|fázisszög tényezői/u.test(meaning))meaning=name.startsWith('sin')?'a fázisszög szinusza':'a fázisszög koszinusza';
        if(/az oda- és visszavezető keresztmetszete/u.test(meaning))meaning=i===0?'az odavezető keresztmetszete':'a visszavezető keresztmetszete';
        if(/fázis- és nullavezető keresztmetszete/u.test(meaning))meaning=i===0?'a fázisvezető keresztmetszete':'a nullavezető keresztmetszete';
        if(/érkeresztmetszet és számított minimuma/u.test(meaning))meaning=/min/u.test(name)?'számított legkisebb érkeresztmetszet':'érkeresztmetszet';
        const grouped=range||names.length>2;
        return {...term,symbol:name,displaySymbol:grouped?term.symbol:name,omitCallout:grouped&&i>0,meaning,color:palette[index%palette.length],explicitTerm:names.length===1&&!range};
      });
    }).filter(t=>t.symbol);
    const unique=new Map();
    // Specific definitions override a shared pair. Never draw duplicate labels.
    for(const term of expanded)if(!unique.has(term.symbol)||term.explicitTerm&&!unique.get(term.symbol).explicitTerm)unique.set(term.symbol,term);
    return [...unique.values()];
  }

  function diagram(expression,symbols,title='',seen=new Set()) {
    const lines=String(expression).split(';').map(s=>s.trim()).filter(Boolean);
    if(lines.length>1)return `<div class="fm-multiple">${lines.map(line=>diagram(line,symbols,title,seen)).join('')}</div>`;
    const id='formula-'+(++serial),terms=expandTerms(symbols);
    for(const range of symbols.filter(t=>/ … /u.test(t.symbol))){
      const stem=range.symbol.match(/^([\p{L}]+)_/u)?.[1],first=range.symbol.split(/\s*…\s*/u)[0],base=terms.find(t=>t.symbol===first);
      if(stem&&base)for(const match of String(expression).matchAll(new RegExp(stem+'_\\d+','gu')))if(!terms.some(t=>t.symbol===match[0]))terms.push({...base,symbol:match[0],omitCallout:true});
    }
    const math=String(expression).split(';').map(line=>`<div class="fm-equation-line">${typeset(line.trim().replace(/^\s*(?:Csillag|Delta):\s*/u,''),terms)}</div>`).join('');
    const used=terms.filter(t=>!t.omitCallout&&math.includes(`data-fm-symbol="${esc(t.symbol)}"`)&&!seen.has(t.symbol));
    used.forEach(t=>seen.add(t.symbol));
    return `<figure class="fm-diagram" data-fm-diagram="${id}" data-fm-definitions="${esc(JSON.stringify(symbols.map((term,index)=>({...term,color:palette[index%palette.length]}))))}" aria-label="${esc(title||expression)}"><div class="fm-stage"><svg class="fm-leaders" aria-hidden="true" focusable="false"><defs><marker id="${id}-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 8 4 0 8" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs></svg><div class="fm-expression" role="math" aria-label="${esc(expression.replace(/[×*]/gu,'·'))}">${math}</div>${used.map((term,i)=>`<div class="fm-callout" data-fm-for="${esc(term.symbol)}" style="--fm-color:${term.color};--fm-order:${i}"><span class="fm-callout-symbol">${textMath(term.displaySymbol||term.symbol)}</span><span class="fm-callout-meaning">${esc(term.meaning)}</span><span class="fm-unit${noUnit(term.unit)?' is-unitless':''}">${esc(unit(term.unit))}</span></div>`).join('')}</div></figure>`;
  }

  // Wide formula plates use the space beside the equation. Only the outer
  // symbols receive side labels, so their leaders never pass through a term.
  function sideLayout(figure,assignments,initial,width) {
    if(assignments.length<2||width<740)return false;
    const sideWidth=Math.min(178,(width-initial.width)/2-30);
    if(sideWidth<138)return false;
    const stage=figure.querySelector('.fm-stage'),equation=figure.querySelector('.fm-expression'),svg=figure.querySelector('.fm-leaders');
    const ordered=[...assignments].sort((a,b)=>a.x-b.x),left=ordered.shift(),right=ordered.pop();
    const middle=ordered,centerLeft=sideWidth+22,centerWidth=width-2*centerLeft;
    const banks=[middle.filter(a=>a.above),middle.filter(a=>!a.above)];
    const rows=banks.map(items=>{
      for(const a of items)Object.assign(a.label.style,{position:'absolute',width:Math.min(195,centerWidth/Math.max(1,items.length)-14)+'px',maxWidth:'none',left:'0',top:'0'});
      return {items,height:items.length?Math.max(...items.map(a=>a.label.getBoundingClientRect().height)):0};
    });
    for(const a of [left,right])Object.assign(a.label.style,{position:'absolute',width:sideWidth+'px',maxWidth:'none',top:'0'});
    const sideHeight=Math.max(left.label.getBoundingClientRect().height,right.label.getBoundingClientRect().height);
    const equationTop=Math.max(rows[0].height?rows[0].height+30:8,(sideHeight-initial.height)/2+8);
    equation.style.top=equationTop+'px';
    const equationBox=equation.getBoundingClientRect();
    const sideTop=equationTop+(equationBox.height-sideHeight)/2;
    left.label.style.left='0';right.label.style.left=(width-sideWidth)+'px';
    for(const a of [left,right])a.label.style.top=(sideTop+(sideHeight-a.label.getBoundingClientRect().height)/2)+'px';
    rows.forEach((row,bank)=>row.items.forEach((a,i)=>{
      const cell=centerWidth/row.items.length,box=a.label.getBoundingClientRect();
      a.label.style.left=(centerLeft+cell*(i+.5)-box.width/2)+'px';
      a.label.style.top=(bank?equationTop+equationBox.height+32:rows[0].height-box.height)+'px';
    }));
    const height=Math.max(equationTop+equationBox.height+(rows[1].height?32+rows[1].height:18),sideTop+sideHeight+8);
    stage.style.height=Math.ceil(height)+'px';figure.dataset.fmLayout='sides';
    const origin=stage.getBoundingClientRect(),local=el=>{const r=el.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,width:r.width,height:r.height};};
    const eq=local(equation),pathFor=(a,kind)=>{
      const label=local(a.label),target=local(a.target),x=target.left+target.width/2;
      let d;
      if(kind==='left'){
        const y=target.top+target.height/2,lane=eq.left-13;
        d=`M${label.right+4} ${label.top+label.height/2}H${lane}V${y}H${target.left-5}`;
      }else if(kind==='right'){
        const above=!!a.target.closest('.fm-numerator'),lane=eq.right+13,y=above?eq.top-9:eq.bottom+9;
        d=`M${label.left-4} ${label.top+label.height/2}H${lane}V${y}H${x}V${above?target.top-5:target.bottom+5}`;
      }else{
        const above=a.above,y=above?eq.top-12:eq.bottom+16;
        d=`M${label.left+label.width/2} ${above?label.bottom+3:label.top-3}V${y}H${x}V${above?target.top-5:target.bottom+5}`;
      }
      return `<path d="${d}" fill="none" stroke="${getComputedStyle(a.label).getPropertyValue('--fm-color').trim()}" stroke-width="1.3" marker-end="url(#${figure.dataset.fmDiagram}-arrow)"/>`;
    };
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.querySelectorAll(':scope > path').forEach(path=>path.remove());
    svg.insertAdjacentHTML('beforeend',pathFor(left,'left')+pathFor(right,'right')+middle.map(a=>pathFor(a,'middle')).join(''));
    return true;
  }

  function layout(figure) {
    const stage=figure.querySelector('.fm-stage'),equation=figure.querySelector('.fm-expression'),svg=figure.querySelector('.fm-leaders');
    if(stage&&equation&&figure.dataset.fmPresentation==='compact'){
      // The card owns the compact legend. Its equation stays in normal flow
      // and needs no measured callout positions or ResizeObserver feedback.
      if(figure.dataset.fmLayout!=='compact'){
        figure.dataset.fmLayout='compact';figure.classList.remove('is-compact');
        equation.style.cssText='position:static;left:auto;top:auto;transform:none;margin:0;width:auto;max-width:100%;';
        stage.style.height='auto';
        if(svg){svg.style.display='none';svg.querySelectorAll(':scope > path').forEach(path=>path.remove());}
      }
      return;
    }
    if(!stage || !stage.getClientRects().length || !stage.clientWidth)return;
    if(figure.dataset.fmLayout==='compact')svg?.style.removeProperty('display');
    const labels=[...stage.querySelectorAll('.fm-callout')],width=stage.clientWidth;
    figure.classList.remove('is-compact');
    equation.style.cssText='position:absolute;left:50%;top:0;transform:translateX(-50%);margin:0;width:max-content;max-width:100%;';
    const initial=equation.getBoundingClientRect();
    const assignments=labels.map((label,index)=>{
      const target=[...equation.querySelectorAll('[data-fm-symbol]')].find(el=>el.dataset.fmSymbol===label.dataset.fmFor);
      if(!target)return null;
      const b=target.getBoundingClientRect();
      // Numerators are labelled from above, denominators from below. Symbols
      // on the baseline alternate banks. Within each bank their x-order is kept.
      const inDenominator=!!target.closest('.fm-denominator');
      const inNumerator=!!target.closest('.fm-numerator');
      const inRadicand=!!target.closest('.fm-radicand');
      return {label,target,x:b.left+b.width/2-initial.left,above:!inRadicand&&(inNumerator||(!inDenominator&&index%2===0))};
    }).filter(Boolean);
    if(sideLayout(figure,assignments,initial,width))return;
    figure.dataset.fmLayout='vertical';
    const banks=[assignments.filter(a=>a.above).sort((a,b)=>a.x-b.x),assignments.filter(a=>!a.above).sort((a,b)=>a.x-b.x)];
    const bankLayouts=banks.map(bank=>{
      const columns=Math.max(1,Math.min(width<480?2:4,bank.length));
      const rows=[];
      for(let at=0;at<bank.length;at+=columns){
        const items=bank.slice(at,at+columns),labelWidth=Math.min(205,width/items.length-(width<480?24:12));
        for(const a of items)Object.assign(a.label.style,{position:'absolute',width:labelWidth+'px',maxWidth:labelWidth+'px',left:'0',top:'0'});
        rows.push({items,height:Math.max(...items.map(a=>a.label.getBoundingClientRect().height))});
      }
      return {columns,rows,height:rows.reduce((sum,row)=>sum+row.height,0)+Math.max(0,rows.length-1)*16};
    });
    const bankHeights=bankLayouts.map(bank=>bank.height),leaderGap=labels.length?38:0;
    const equationTop=bankHeights[0]+(banks[0].length?leaderGap:6);
    equation.style.top=equationTop+'px';
    const equationBox=equation.getBoundingClientRect(),height=equationTop+equationBox.height+(banks[1].length?leaderGap+bankHeights[1]:6);
    stage.style.height=Math.ceil(height)+'px';
    const stageBox=stage.getBoundingClientRect();
    bankLayouts.forEach((bank,side)=>{
      let rowTop=side?equationTop+equationBox.height+leaderGap:0;
      bank.rows.forEach((row,rowIndex)=>{
        const cell=width/row.items.length;
        row.items.forEach((a,i)=>{
          const w=a.label.getBoundingClientRect().width,h=a.label.getBoundingClientRect().height;
          a.label.style.left=(cell*(i+.5)-w/2)+'px';
          a.label.style.top=(rowTop+(side?0:row.height-h))+'px';
          a.outerRoute=side?rowIndex>0:rowIndex<bank.rows.length-1;
          const target=a.target.getBoundingClientRect();
          a.routeLeft=row.items.length===1?target.left+target.width/2-stageBox.left<width/2:i<row.items.length/2;
        });
        rowTop+=row.height+16;
      });
    });
    const paths=assignments.map(({label,target,above,outerRoute,routeLeft},index)=>{
      const a=label.getBoundingClientRect(),b=target.getBoundingClientRect();
      const x1=(outerRoute?(routeLeft?a.left-3:a.right+3):a.left+a.width/2)-stageBox.left;
      const y1=(outerRoute?a.top+a.height/2:above?a.bottom+3:a.top-3)-stageBox.top;
      const x2=b.left+b.width/2-stageBox.left,y2=(above?b.top-4:b.bottom+4)-stageBox.top;
      const lane=routeLeft?4:width-4;
      const bend=above?equationTop-12-(index%3)*4:equationTop+equationBox.height+12+(index%3)*4;
      const start=outerRoute?`M${x1} ${y1}H${lane}V${bend}`:`M${x1} ${y1}V${bend}`;
      return `<path d="${start}H${x2}V${y2}" fill="none" stroke="${getComputedStyle(label).getPropertyValue('--fm-color').trim()}" stroke-width="1.3" marker-end="url(#${figure.dataset.fmDiagram}-arrow)"/>`;
    }).join('');
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.querySelectorAll(':scope > path').forEach(path=>path.remove());svg.insertAdjacentHTML('beforeend',paths);
  }

  const watched=new WeakSet();
  const resize=new ResizeObserver(entries=>entries.forEach(entry=>layout(entry.target)));
  let tooltip,tooltipTarget;
  const formulaSelection=new Map();
  // Definitions come from the complete, existing source list, not only the
  // callouts used by one clause. Keep the hidden guide source for worked data.
  function compact(card){
    if(!card||card.dataset.fmCompact==='true')return card;
    const figures=[...card.querySelectorAll('.fm-diagram')];
    if(!figures.length)return card;
    const make=(tag,classes,text)=>{const node=document.createElement(tag);node.className=classes;if(text!==undefined)node.textContent=text;return node;};
    const isGuide=card.matches('.formula-card'),alias=part=>isGuide?' guide-legend'+part:'';
    const legend=make('details','fm-legend'+alias(''));
    const summary=make('summary','','Jelölések és mértékegységek');
    const definitions=make('dl','fm-legend-list'+alias('-list'));
    const records=[],seen=new Set();
    // Collect all clauses before deduplication: a symbol in a later equation
    // must remain available even when the first clause already used its name.
    for(const figure of figures){
      let supplied=[];
      try{supplied=JSON.parse(figure.dataset.fmDefinitions||'[]');}catch{}
      if(!supplied.length)supplied=[...figure.querySelectorAll('.fm-callout')].map(node=>({symbol:node.dataset.fmFor,meaning:node.querySelector('.fm-callout-meaning')?.textContent||'',unit:node.querySelector('.fm-unit')?.textContent||'',color:node.style.getPropertyValue('--fm-color')}));
      records.push(...supplied);
      figure.dataset.fmPresentation='compact';
    }
    for(const term of records){
      if(!term.symbol)continue;
      const identity=JSON.stringify([term.symbol,term.meaning||'',term.unit||'']);
      if(seen.has(identity))continue;seen.add(identity);
      const row=make('div','fm-legend-row'+alias('-row'));
      row.dataset.fmFor=term.symbol;
      if(isGuide)row.dataset.guideSymbol=term.symbol;
      row.dataset.fmKeys=JSON.stringify(expandTerms([term]).map(value=>key(value.symbol)));
      row.style.setProperty('--fm-color',term.color||palette[0]);
      const name=make('dt','fm-legend-symbol'+alias('-symbol'));
      name.innerHTML=textMath(term.symbol);
      row.classList.toggle('has-long-symbol',String(term.symbol).length>=7||/,\s|…/u.test(term.symbol));
      const meaning=make('dd','fm-legend-meaning'+alias('-meaning'),term.meaning||'');
      const units=make('dd','fm-legend-unit'+alias('-unit'),unit(term.unit));
      units.classList.toggle('is-unitless',noUnit(term.unit));
      row.classList.toggle('has-long-unit',/\s/u.test(units.textContent.trim())||units.textContent.trim().length>6);
      row.append(name,meaning,units);definitions.append(row);
    }
    legend.append(summary,definitions);card.append(legend);
    figures.forEach(figure=>{figure.querySelectorAll('.fm-callout').forEach(node=>node.remove());layout(figure);});
    const activate=symbol=>definitions.querySelectorAll('.fm-legend-row').forEach(row=>row.classList.toggle('is-active',!!symbol&&JSON.parse(row.dataset.fmKeys).includes(key(symbol))));
    card.addEventListener('pointerover',event=>activate(event.target.closest?.('[data-fm-symbol]')?.dataset.fmSymbol));
    card.addEventListener('pointerleave',()=>activate(null));
    card.addEventListener('focusin',event=>activate(event.target.closest?.('[data-fm-symbol]')?.dataset.fmSymbol));
    card.addEventListener('focusout',event=>{if(!card.contains(event.relatedTarget))activate(null);});
    card.addEventListener('pointerdown',event=>event.target.closest?.('.fm-symbol')?.focus({preventScroll:true}));
    card.dataset.fmCompact='true';
    if(isGuide)card.dataset.guideFormulaReady='true';
    bindTooltips();
    return card;
  }

  function prepareNavigator(grid){
    if(grid.dataset.fmNavigator)return;
    const cards=[...grid.children].filter(el=>el.matches('.learn-formula'));
    if(cards.length<2)return;
    const id=grid.closest('[data-learn-section-root]')?.dataset.learnSectionRoot||'formulas';
    if(cards.length>2){
      const nav=document.createElement('nav');nav.className='fm-navigation fm-select-navigation';nav.setAttribute('aria-label','Számítási összefüggések');
      const select=document.createElement('select');select.setAttribute('aria-label','Összefüggés kiválasztása');
      cards.forEach((card,index)=>{if(!card.id)card.id=`fm-card-${id}-${index+1}`;select.add(new Option(card.querySelector('h3')?.textContent||`${index+1}. képlet`,String(index)));});
      select.setAttribute('aria-controls',cards.map(card=>card.id).join(' '));
      const show=index=>{cards.forEach((card,i)=>{card.hidden=i!==index;});select.value=String(index);formulaSelection.set(id,index);cards[index].querySelectorAll('[data-fm-diagram]').forEach(layout);};
      select.addEventListener('change',()=>show(Number(select.value)));nav.append(select);grid.before(nav);grid.dataset.fmNavigator='select';show(Math.min(formulaSelection.get(id)||0,cards.length-1));return;
    }
    const nav=document.createElement('nav');nav.className='fm-navigation fm-chip-navigation';nav.setAttribute('aria-label','Számítási összefüggések');
    const buttons=cards.map((card,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.fmIndex=String(index);
      if(!card.id)card.id=`fm-card-${id}-${index+1}`;
      button.setAttribute('aria-controls',card.id);
      button.textContent=card.querySelector('h3')?.textContent||`${index+1}. képlet`;
      button.setAttribute('aria-pressed','false');nav.append(button);return button;
    });
    const show=index=>{
      cards.forEach((card,i)=>{card.hidden=i!==index;buttons[i].setAttribute('aria-pressed',String(i===index));});
      formulaSelection.set(id,index);cards[index].querySelectorAll('[data-fm-diagram]').forEach(layout);
    };
    buttons.forEach((button,index)=>button.addEventListener('click',()=>show(index)));
    nav.addEventListener('keydown',event=>{
      const index=buttons.indexOf(event.target);if(index<0)return;
      const target=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:null;
      if(target===null)return;event.preventDefault();show(target);buttons[target].focus();
    });
    grid.before(nav);grid.dataset.fmNavigator='chips';show(Math.min(formulaSelection.get(id)||0,cards.length-1));
  }
  function bindTooltips(){
    if(tooltip)return;
    tooltip=document.createElement('div');tooltip.className='fm-tooltip';tooltip.id='formulaTooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;document.body.append(tooltip);
    const hide=()=>{tooltip.hidden=true;tooltipTarget?.removeAttribute('aria-describedby');tooltipTarget=null;};
    const show=target=>{
      if(!target?.matches('.fm-symbol[data-tooltip]'))return;
      hide();tooltipTarget=target;tooltip.textContent=target.dataset.tooltip;tooltip.hidden=false;target.setAttribute('aria-describedby',tooltip.id);
      const box=target.getBoundingClientRect(),w=tooltip.offsetWidth,h=tooltip.offsetHeight;
      tooltip.style.left=Math.max(8,Math.min(innerWidth-w-8,box.left+box.width/2-w/2))+'px';
      tooltip.style.top=(box.top>h+12?box.top-h-8:Math.min(innerHeight-h-8,box.bottom+8))+'px';
    };
    document.addEventListener('pointerover',e=>{const target=e.target.closest?.('.fm-symbol');if(target)show(target);});
    document.addEventListener('pointerout',e=>{if(tooltipTarget?.contains(e.target)&&!tooltipTarget.contains(e.relatedTarget))hide();});
    document.addEventListener('focusin',e=>requestAnimationFrame(()=>{if(document.activeElement===e.target)show(e.target)}));
    document.addEventListener('focusout',e=>{if(e.target===tooltipTarget)hide();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
    window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
  }
  function mount(root=document) {
    bindTooltips();
    root.querySelectorAll('.learn-formula').forEach(compact);
    root.querySelectorAll('.learn-formula-grid').forEach(prepareNavigator);
    root.querySelectorAll('[data-fm-diagram]').forEach(figure=>{if(!watched.has(figure)){watched.add(figure);resize.observe(figure);}layout(figure);});
    document.fonts?.ready.then(()=>root.querySelectorAll('[data-fm-diagram]').forEach(layout));
  }
  function guide(root=document) {
    root.querySelectorAll('.formula-card').forEach(card=>{
      if(card.dataset.formulaDiagram)return;
      const equation=card.querySelector('.formula-card__expression'),legend=card.querySelector('.formula-legend');
      if(!equation||!legend)return;
      const symbols=[...legend.querySelectorAll(':scope > div')].map(row=>{
        const dd=row.querySelector('dd').cloneNode(true),unitText=dd.querySelector('.unit-chip')?.textContent||'';
        dd.querySelectorAll('.unit-chip').forEach(node=>node.remove());
        return {symbol:domMathText(row.querySelector('dt')).trim(),meaning:dd.textContent.trim(),unit:unitText};
      });
      // Keep this machine-readable source for worked-board input meanings.
      legend.hidden=true;equation.hidden=true;
      const expressions=domMathText(equation);
      const container=document.createElement('div');container.className='fm-guide-diagrams';
      container.innerHTML=diagram(expressions.split(/;|\n/u).map(s=>s.trim()).filter(Boolean).join('; '),symbols,card.querySelector('.formula-card__label')?.textContent);
      equation.after(container);card.dataset.formulaDiagram='true';
    });
    mount(root);
  }
  // Existing coloured number tokens stay intact when a worked line gains a
  // fraction. Animation sources, tooltips and data-flow identities survive.
  function formatDOM(element) {
    if(element.dataset.fmTypeset)return;
    const values=[];
    let source='';
    for(const node of [...element.childNodes]){
      if(node.nodeType===Node.TEXT_NODE)source+=node.textContent;
      else if(node.nodeName==='SUB')source+='_'+node.textContent;
      else if(node.nodeName==='SUP')source+=node.textContent.replace(/\d/gu,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]);
      else {const i=values.push(node.outerHTML)-1;source+=`\uE000${i}\uE001`;}
    }
    const statements=source.split(';').map(text=>text.trim()).filter(Boolean);
    element.innerHTML=statements.map(statement=>{
      let depth=0,start=0,operator='',parts=[];
      for(let at=0;at<statement.length;at++){
        const ch=statement[at];if(ch==='(')depth++;if(ch===')')depth--;
        if(!depth&&'=≈'.includes(ch)){
          if(statement.slice(start,at).trim())parts.push({operator,text:statement.slice(start,at).trim()});
          operator=ch;start=at+1;
        }
      }
      if(statement.slice(start).trim())parts.push({operator,text:statement.slice(start).trim()});
      return `<span class="fm-chain">${parts.map(part=>`<span class="fm-chain-part">${part.operator?`<span class="fm-operator">${esc(part.operator)}</span>`:''}${typeset(part.text,[],values)}</span>`).join('')}</span>`;
    }).join('<br>');
    element.dataset.fmTypeset='true';
  }
  window.VVFormula={diagram,typeset,mount,guide,compact,formatDOM,key};
  document.addEventListener('DOMContentLoaded',()=>guide());
})();
