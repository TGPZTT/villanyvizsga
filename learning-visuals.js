(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors = ['#b84d17','#286c9b','#7c579b','#507b36','#b47a13','#a84c59'];
  // Only authored mathematical fragments are typeset. Prose and voltage-class
  // pairs stay prose, so a slash in 450/750 V is not treated as division.
  function formatDetail(value) {
    const fragments = [
      ['nₛ = 60 × 50 / 2 = 1500 1/min','n_s = (60 · 50) / 2 = 1500',' min⁻¹'],
      ['ΔU = I × ρ × l / A','ΔU = (I · ρ · l) / A'],
      ['R_hurok = 2 × ρ × l / A','R_hurok = (2 · ρ · l) / A'],
      ['R = ρ × l / A','R = (ρ · l) / A'],
      ['nₛ = 60 × f / p','n_s = (60 · f) / p'],
      ['46 / 60 × 300 V = 230 V','46 / 60 · 300 V = 230 V'],
      ['46 × 5 V = 230 V','46 · 5 V = 230 V'],
      ['η_f = Φ/P','η_f = Φ / P'],['E = P × t','E = P · t'],
      ['I = G × U','I = G · U'],['I × R_b','I · R_b'],['G = 1/R','G = 1 / R']
    ];
    const rendered=[];
    let text=String(value||'');
    for(const [source,math,suffix=''] of fragments) {
      if(!text.includes(source))continue;
      const marker='\uE100'+rendered.length+'\uE101';
      rendered.push(window.VVFormula ? `<span class="lv-inline-formula" role="math" aria-label="${esc(math+suffix)}">${window.VVFormula.typeset(math)}${esc(suffix)}</span>` : esc(source.replaceAll('×','·')));
      text=text.replaceAll(source,marker);
    }
    return esc(text).replace(/(\p{L})_([\p{L}\p{N}]+(?:[,–][\p{L}\p{N}]+)*)/gu,'$1<sub>$2</sub>').replace(/\uE100(\d+)\uE101/gu,(_,index)=>rendered[Number(index)]);
  }
  const glyphs = {
    generator:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M4 32h8m40 0h8',
    pylon:'M32 5 16 58m16-53 16 53M23 20h18M19 34h26M14 48h36M16 58l29-24M48 58 19 34M10 20h44M9 34h46',
    transformer:'M4 14h16m0 36H4M44 14h16m-16 36h16M28 8v48M36 8v48M20 14c-12 0-12 12 0 12-12 0-12 12 0 12-12 0-12 12 0 12M44 14c12 0 12 12 0 12 12 0 12 12 0 12 12 0 12 12 0 12',
    house:'M6 29 32 7l26 22M13 25v31h38V25M26 56V36h13v20M18 29h7',
    building:'M13 57V9h38v48M6 57h52M22 18h5m10 0h5M22 29h5m10 0h5M22 40h5m10 0h5M29 57V47h8v10',
    wire:'M6 19h39a13 13 0 0 1 0 26H6M7 19a13 13 0 0 1 0 26M6 26h39a6 6 0 0 1 0 12H6',
    cable:'M7 16h39a16 16 0 0 1 0 32H7M7 16a16 16 0 0 1 0 32M7 23a9 9 0 0 1 0 18M7 23h39m-39 18h39',
    switch:'M4 44h14m0 0 26-25M46 44h14',
    lamp:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M18 18l28 28M46 18 18 46M4 32h8m40 0h8',
    led:'M4 36h16m22 0h18M20 23v26l22-13-22-13m22 0v26M41 17 54 4m-7 0h7v7M47 29 60 16m-7 0h7v7',
    resistor:'M3 32h13m0-10h32v20H16V22m32 10h13',
    meter:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M4 32h8m40 0h8M22 41l19-19M34 22h7v7',
    motor:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M23 42V23l9 12 9-12v19M3 32h9m40 0h9',
    ground:'M32 5v28M12 33h40M19 42h26M26 51h12',
    shield:'M32 5 53 14v18c0 13-11 23-21 28C22 55 11 45 11 32V14L32 5M23 31l7 8 14-17',
    rcd:'M15 12h34v40H15V12M4 23h11m34 0h11M4 41h11m34 0h11',
    breaker:'M4 44h14m0 0 26-25M46 44h14M42 40l8 8m-8 0 8-8',
    fuse:'M4 32h13m0-11h30v22H17V21m30 11h13M17 32h30',
    battery:'M4 32h10m0-18v36m8-27v18m0-9h16m0-18v36m8-27v18m0-9h14',
    coil:'M4 38h8c0-25 12-25 12 0 0-25 12-25 12 0 0-25 12-25 12 0h12',
    capacitor:'M3 32h22m0-18v36m14-36v36m0-18h22',
    sun:'M20 32a12 12 0 1 0 24 0 12 12 0 1 0-24 0M32 3v9m0 40v9M3 32h9m40 0h9M11 11l7 7m28 28 7 7M53 11l-7 7M18 46l-7 7',
    wind:'M32 29v31m0-31L25 6c-8 0-6 17 7 23m0 0 23-6c5 7-10 14-23 6m0 0L18 49c-8-3-1-18 14-20',
    water:'M32 5C22 21 12 30 12 40a20 20 0 0 0 40 0C52 30 42 21 32 5M22 40c0 8 5 11 10 11',
    heat:'M15 55c-12-16 13-19 0-36M32 55c-12-16 13-19 0-36M49 55c-12-16 13-19 0-36M32 4v8m-5-5 5-5 5 5',
    box:'M10 15h44v39H10V15M10 15l10-8h24l10 8M25 25h14v14H25V25M10 46h44',
    terminal:'M7 20h50v26H7V20M19 26v14M32 26v14M45 26v14M19 3v17m13-17v17M45 3v17M19 46v15m13-15v15M45 46v15',
    pipe:'M5 16h37c22 0 22 32 0 32H5M5 16a16 16 0 0 1 0 32M5 23h37c12 0 12 18 0 18H5',
    sensor:'M20 50V18h24v32H20V50M27 26h10M8 20a32 32 0 0 1 0 27M56 20a32 32 0 0 0 0 27M14 25a20 20 0 0 1 0 17M50 25a20 20 0 0 0 0 17',
    bell:'M14 44h36L44 33V24a12 12 0 0 0-24 0v9l-6 11M27 50a5 5 0 0 0 10 0M32 7v5',
    tool:'M47 5c-18-4-25 9-20 21L8 45a8 8 0 0 0 11 11l19-19C51 42 63 31 58 17L46 28l-10-9L47 5',
    document:'M16 5h24l12 12v42H16V5M40 5v14h12M24 29h20M24 39h20M24 49h13',
    warning:'M32 5 60 55H4L32 5M32 23v15m0 7v2',
    person:'M23 14a9 9 0 1 0 18 0 9 9 0 1 0-18 0M18 59V39c0-17 28-17 28 0v20M25 46v13m14-13v13',
    fire:'M33 4c5 15 22 21 22 36a23 23 0 0 1-46 0c0-9 6-18 14-23-1 12 2 16 7 18 8-13-2-18 3-31M27 58c-14-11 2-19 5-26 2 10 14 14 8 23',
    network:'M5 6h16v14H5V6M43 6h16v14H43V6M24 44h16v14H24V44M13 20v12h38V20M32 32v12',
    field:'M7 14c15-12 35-12 50 0M7 27c15-12 35-12 50 0M7 40c15-12 35-12 50 0M7 53c15-12 35-12 50 0',
    trash:'M16 15h32l-3 43H19L16 15M10 15h44M24 15V7h16v8M26 24v24m12-24v24',
    'star-point':'M32 5v27M10 45l22-13 22 13M32 32h26',
    'star-connection':'M32 5v27M10 45l22-13 22 13',
    'delta-connection':'M32 7 8 50h48L32 7',
    'earthed-neutral':'M32 3v16M12 7l20 12L52 7M32 19v23M14 42h36M21 49h22M27 56h10',
    'isolated-neutral':'M32 3v16M12 7l20 12L52 7M32 19v12M32 43v6M16 49h32M22 55h20M28 61h8',
    impedance:'M4 32h12m0-12h32v24H16V20m32 12h12',
    voltmeter:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M4 32h8m40 0h8',
    ammeter:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M4 32h8m40 0h8',
    ohmmeter:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M4 32h8m40 0h8',
    'insulation-meter':'M9 32a23 23 0 1 0 46 0 23 23 0 1 0-46 0M3 32h6m46 0h6',
    'energy-meter':'M8 12h48v40H8V12M4 32h4m48 0h4',
    instrument:'M12 32a20 20 0 1 0 40 0 20 20 0 1 0-40 0M4 32h8m40 0h8M22 41l19-19M34 22h7v7',
    'voltage-tester':'M16 12h8v29h-8V12M40 12h8v29h-8V12M20 3v9m24-9v9M20 41v8c0 13 24 13 24 0v-8',
    neutral:'M4 40h56',
    'protective-conductor':'M4 40h56',
    'pen-conductor':'M4 40h56',
    'protective-earth':'M32 10v24M16 34h32M22 42h20M28 50h8',
    'normally-open':'M4 32h20M24 17v30M40 17v30M40 32h20',
    'normally-closed':'M4 32h20M24 17v30M40 17v30M40 32h20M20 45l24-26',
    'pushbutton-no':'M4 40h20M24 25v30M40 25v30M40 40h20M21 7h22M32 7v12',
    'pushbutton-nc':'M4 40h20M24 25v30M40 25v30M40 40h20M20 53l24-26M21 7h22M32 7v12',
    'double-pole-switch':'M4 24h14m0 0 26-15M46 24h14M4 50h14m0 0 26-15M46 50h14',
    'chandelier-switch':'M4 32h14V17m0 15v15M18 17 43 4M46 17h14M18 47l25-13M46 47h14',
    'changeover-switch':'M4 32h14m0 0 28-17M46 15h14M46 49h14',
    'intermediate-switch':'M4 18h12l32 28h12M4 46h12L48 18h12',
    disconnector:'M4 44h14m0 0 26-25M48 44h12',
    diode:'M4 32h16m22 0h18M20 19v26l22-13-22-13m22 0v26',
    varistor:'M4 32h12m0-12h32v24H16V20m32 12h12M12 50 52 14',
    'spark-gap':'M4 32h21m-6-4 6 4-6 4M39 32h21m-15-4-6 4 6 4',
    'suppressor-diode':'M4 32h8M52 32h8M12 19v26l20-13-20-13M52 19v26L32 32l20-13M26 12l6 7v26l6 7',
    'class-ii':'M10 10h44v44H10V10M22 22h20v20H22V22',
    'class-iii':'M32 5 59 32 32 59 5 32 32 5',
    'alternating-current':'M5 32c9-27 18-27 27 0s18 27 27 0',
    clock:'M10 32a22 22 0 1 0 44 0 22 22 0 1 0-44 0M32 15v18l12 7',
    socket:'M14 20a18 18 0 0 0 36 0M32 38v16',
    'socket-protected':'M14 20a18 18 0 0 0 36 0M32 38v16M10 38h44',
    'installation-switch':'M24 36a8 8 0 1 0 16 0 8 8 0 1 0-16 0M37.7 30.3 54 14',
    'installation-lamp':'M14 14l36 36m0-36L14 50',
    'junction-box':'M18 18h28v28H18zM32 4v14m0 28v14M4 32h14m28 0h14',
    'discharge-lamp':'M5 20h54v24H5V20M13 24v16m38-16v16M1 32h4m54 0h4',
    insulation:'M32 5a27 27 0 1 0 0 54 27 27 0 1 0 0-54M32 20a12 12 0 1 0 0 24 12 12 0 1 0 0-24',
    annotation:'M11 12h42v40H11V12M20 24h24M20 33h24M20 42h15',
    'quantity-u':'', 'quantity-i':'', 'quantity-r':'', 'quantity-g':'', 'quantity-p':'', 'quantity-q':'', 'quantity-s':'', 'quantity-e':'', 'quantity-t':'', 'quantity-f':'', 'quantity-eta':'', 'light-efficacy':''
  };
  const glyphLabels = {
    generator:['G',32,39,21], impedance:['Z',32,38,18],voltmeter:['V',32,39,22],ammeter:['A',32,39,22],ohmmeter:['Ω',32,39,22],
    'insulation-meter':['MΩ',32,38,17],'energy-meter':['Wh',32,39,18],neutral:['N',32,28,20],'protective-conductor':['PE',32,28,18],'pen-conductor':['PEN',32,28,18],
    rcd:['IΔ',32,38,18],varistor:['U',12,17,13],'class-iii':['III',32,39,20],
    'quantity-u':['U',32,44,36],'quantity-i':['I',32,44,36],'quantity-r':['R',32,44,36],'quantity-g':['G',32,44,36],
    'quantity-p':['P',32,44,36],'quantity-q':['Q',32,44,36],'quantity-s':['S',32,44,36],'quantity-e':['E',32,44,36],
    'quantity-t':['t',32,44,36],'quantity-f':['f',32,44,36],'quantity-eta':['η',32,44,36],'light-efficacy':['Φ/P',32,42,26]
  };
  const diagramGlyphs=new Set(['generator','switch','lamp','led','resistor','motor','ground','fuse','battery','coil','capacitor','star-point','star-connection','delta-connection','earthed-neutral','isolated-neutral','impedance','voltmeter','ammeter','ohmmeter','energy-meter','insulation-meter','instrument','neutral','protective-conductor','pen-conductor','protective-earth','normally-open','normally-closed','pushbutton-no','pushbutton-nc','double-pole-switch','chandelier-switch','changeover-switch','intermediate-switch','disconnector','breaker','diode','varistor','spark-gap','suppressor-diode','class-ii','class-iii','alternating-current','discharge-lamp']);
  const states = new Map();
  ['socket','socket-protected','installation-switch','installation-lamp','junction-box'].forEach(name=>diagramGlyphs.add(name));
  const bound = new WeakSet();
  const wavePlayback = new WeakMap();
  const illustrationStates = new Map();
  const illustrationBound = new WeakSet();
  const ohmStates = new Map();
  const panPositions = new Map();
  const drawingMotion = new WeakMap();
  let illustrationSerial = 0;
  function glyph(name, color, stripe) {
    if(['protective-conductor','pen-conductor'].includes(name)){color='#287849';stripe=stripe||'#edcd38';}
    if(name==='neutral')color='#2878b2';
    const known=Object.hasOwn(glyphs,name),path=known?glyphs[name]:'',label=glyphLabels[name],ink=esc(color||'currentColor');
    let extra='';
    if(['star-point','star-connection'].includes(name))extra='<circle cx="32" cy="32" r="3.2" fill="currentColor" stroke="none"/>';
    if(['earthed-neutral','isolated-neutral'].includes(name))extra='<circle cx="32" cy="19" r="2.7" fill="currentColor" stroke="none"/>';
    if(name==='protective-earth')extra='<circle cx="32" cy="32" r="29"/>';
    if(name==='spark-gap')extra='<circle cx="32" cy="32" r="20"/>';
    if(['switch','breaker','disconnector','changeover-switch'].includes(name))extra=`<circle cx="18" cy="${name==='changeover-switch'?32:44}" r="1.8" fill="currentColor" stroke="none"/>${name==='disconnector'?'<circle cx="46" cy="44" r="2"/>':''}`;
    if(['pushbutton-no','pushbutton-nc'].includes(name))extra='<path d="M32 19v16" stroke-dasharray="2 3"/>';
    if(name==='double-pole-switch')extra='<path d="M31 17v27" stroke-dasharray="2 3"/>';
    if(name==='chandelier-switch')extra='<circle cx="18" cy="32" r="2" fill="currentColor" stroke="none"/>';
    if(name==='intermediate-switch')extra='<rect x="13" y="9" width="38" height="46" stroke-width="1"/>';
    if(stripe&&['wire','cable'].includes(name))extra+=`<path d="M7 32h39" stroke="${esc(stripe)}" stroke-width="5"/>`;
    if(stripe&&['protective-conductor','pen-conductor'].includes(name))extra+=`<path d="M4 40h56" stroke="${esc(stripe)}" stroke-width="2.4" stroke-dasharray="6 5"/>`;
    if(name==='pen-conductor')extra+='<path d="M51 40h9" stroke="#2878b2" stroke-width="4"/>';
    const text=label?`<text x="${label[1]}" y="${label[2]}" text-anchor="middle" fill="${ink}" stroke="none" style="font:${label[3]}px Arial,sans-serif">${esc(label[0])}</text>`:!known?`<text x="32" y="43" text-anchor="middle" fill="${ink}" stroke="none" style="font:30px Arial,sans-serif">?</text>`:'';
    return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-glyph="${esc(name||'unknown')}" data-glyph-kind="${diagramGlyphs.has(name)?'diagram-symbol':label?'quantity':'pictogram'}"><g fill="none" stroke="${ink}" color="${ink}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${path?`<path d="${path}"/>`:''}${extra}${text}</g></svg>`;
  }
  function nodes(spec, index, key) {
    const items = spec.items || [], sequence = ['flow','route','timeline','safety'].includes(spec.type);
    const planGlyph=item=>spec.variant==='boxes'?(item.glyph==='switch'?'installation-switch':item.glyph==='box'?'junction-box':item.glyph):key==='documentation-alaprajz:0'?({'Lámpatest':'installation-lamp','Kapcsoló':'installation-switch','Dugalj':'socket'}[item.label]||item.glyph):item.glyph;
    const technical=item=>diagramGlyphs.has(planGlyph(item))||Object.hasOwn(glyphLabels,planGlyph(item))||['socket','socket-protected','installation-switch','installation-lamp','junction-box'].includes(planGlyph(item));
    const withSymbols=spec.variant!=='ohm-relations'&&items.length>0&&items.every(technical);
    return `<div class="lv-diagram lv-${esc(spec.type)} ${sequence?'lv-sequence':''} ${withSymbols?'':'lv-text-only'}" data-lv-diagram>${items.map((item,i) => `<button type="button" class="lv-node ${withSymbols?'':'lv-text-node'} ${i===index?'is-active':''} ${sequence&&i<index?'is-traced':''}" data-lv-index="${i}" aria-pressed="${i===index}" style="--lv-node:${esc(item.color || colors[i%colors.length])}" aria-label="${esc(item.label)}">${withSymbols?`<span class="lv-component">${glyph(planGlyph(item),item.color,item.stripe)}</span>`:''}<strong>${esc(item.label)}</strong>${item.value!==undefined?`<span class="lv-node-value">${esc(item.value)} <small>${esc(item.unit||'')}</small></span>`:''}</button>`).join('')}</div>`;
  }
  function circuit(spec,index) {
    const type=spec.circuit||'series';
    if(type==='motor'||type==='rcd')return nodes({...spec,type:'compare'},index);
    let drawing='';
    if(type==='parallel'){
      const xs=index===2?[300,480,650]:[300,650];
      drawing='<path d="M100 165V80H650M650 290H100V183"/><path class="lv-source" d="M80 165h40m-32 18h24"/>';
      drawing+=xs.map((x,i)=>`<path d="M${x} 80V157M${x} 212V290"/><path class="lv-load" d="M${x-25} 157h50v55h-50z"/><circle cx="${x}" cy="80" r="4" fill="currentColor"/><circle cx="${x}" cy="290" r="4" fill="currentColor"/><text x="${x+49}" y="192">R<tspan baseline-shift="sub" font-size="65%">${i+1}</tspan></text>`).join('');
      drawing+='<text x="160" y="55">U</text>'+(index===1?'<path d="M280 100V140M280 230V270M630 100V140M630 230V270" class="lv-measure"/>':'');
    }
    else if(type==='transformer') drawing='<path d="M80 80H250M250 290H80M520 80H690M520 290H690M372.5 75v220m25-220v220"/><path class="lv-load" d="M250 80c70 0 70 42 0 42 70 0 70 42 0 42 70 0 70 42 0 42 70 0 70 42 0 42 70 0 70 42 0 42M520 80c-70 0-70 42 0 42-70 0-70 42 0 42-70 0-70 42 0 42-70 0-70 42 0 42-70 0-70 42 0 42"/>';
    else if(type==='motor') drawing='<path d="M80 100h195m-195 70h195M80 240h195"/><circle class="lv-load" cx="390" cy="170" r="118"/><path d="M340 215V120l50 65 50-65v95M510 170h160"/><path class="lv-rotor" d="M565 95a80 80 0 0 1 0 150m-5-14 5 14 15-3"/>';
    else if(type==='measurement') drawing='<path d="M80 165V80h180m80 0h160m100 0h100v210H80V183M450 80v95h62m76 0h62V80"/><circle class="lv-load" cx="300" cy="80" r="40"/><path class="lv-load" d="M500 55h100v50H500z"/><circle class="lv-source" cx="550" cy="175" r="38"/><path class="lv-source" d="M60 165h40m-32 18h24"/><text x="300" y="90">A</text><text x="550" y="185">V</text>';
    else if(type==='rcd') drawing='<path class="lv-source" d="M80 100H650V250H80"/><ellipse class="lv-load" cx="340" cy="175" rx="60" ry="120"/><path d="M320 60v230m40-230v230"/><path class="lv-load" d="M625 145h50v60h-50z"/><path class="lv-signal" d="M410 165h100v-90h80"/>';
    else if(type==='switch') drawing='<path d="M100 165V80h180m110 0h260v65m0 80v65H100V183"/><path class="lv-lever" d="M280 80l95-47"/><circle class="lv-load" cx="650" cy="185" r="40"/><path d="M623 158l54 54m0-54-54 54"/><path class="lv-source" d="M80 165h40m-32 18h24"/>';
    else drawing='<path d="M100 165V80h100m90 0h100m90 0h100m90 0h30v210H100V183"/><path class="lv-load" d="M200 55h90v50h-90zM390 55h90v50h-90zM580 55h90v50h-90z"/><path class="lv-source" d="M80 165h40m-32 18h24"/>';
    return `<div class="lv-circuit lv-circuit-${esc(type)}" tabindex="0" role="region" aria-label="${esc(spec.title)}" data-lv-diagram data-lv-active="${esc(spec.items[index]?.target||'')}" style="--lv-selected:${index};--lv-active:${esc(spec.items[index]?.color||colors[index%colors.length])}"><svg viewBox="0 0 780 350" role="img" aria-label="${esc(spec.title)}"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg></div><div class="lv-state-controls">${(spec.items||[]).map((item,i)=>`<button type="button" data-lv-index="${i}" aria-pressed="${index===i}">${glyph(item.glyph||'resistor',item.color)}<span>${esc(item.label)}</span></button>`).join('')}</div>`;
  }
  function graph(spec,index) {
    if(spec.items.some(item=>item.value===undefined||item.value===null||String(item.value).trim()===''))return nodes(spec,index);
    const values=(spec.items||[]).map(item=>Number(String(item.value??'').replace(',','.')));
    if(!values.every(Number.isFinite))return nodes(spec,index);
    const max=Math.max(1,...values);
    return `<div class="lv-graph lv-value-bars" data-lv-diagram role="group" aria-label="${esc(spec.title)}">${values.map((v,i)=>{const item=spec.items[i],label=String(item.label||'').split(':')[0];return `<div class="lv-value-bar ${i===index?'is-active':''}" style="--lv-bar-color:${esc(item.color||colors[i%colors.length])}"><div class="lv-value-bar-label"><span>${esc(label)}</span><strong>${esc(item.value)} <span>${esc(item.unit||'')}</span></strong></div><div class="lv-value-bar-track"><span style="width:${Math.max(0,v/max*100)}%"></span></div></div>`;}).join('')}</div>${controls(spec,index)}`;
  }
  function spectrum(spec,index) {
    return `<div class="lv-spectrum" data-lv-diagram>${(spec.items||[]).map((item,i)=>`<button type="button" class="${i===index?'is-active':''}" data-lv-index="${i}" aria-pressed="${index===i}" style="--lv-band:${esc(item.color||colors[i%colors.length])}"><span class="lv-band"></span>${glyph(item.glyph||'lamp',item.color)}<strong>${esc(item.label)}</strong>${item.value!==undefined?`<small>${esc(item.value)} ${esc(item.unit||'')}</small>`:''}</button>`).join('')}</div>`;
  }
  function controls(spec,index){return `<div class="lv-state-controls">${spec.items.map((item,i)=>`<button type="button" data-lv-index="${i}" aria-pressed="${index===i}">${esc(item.label)}</button>`).join('')}${spec.variant==='wave'?'<button type="button" class="lv-play" data-lv-play aria-pressed="false">Egy periódus lejátszása</button>':''}</div>`;}
  const ohmNumber=value=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:3}).format(value);
  const ohmRelation=value=>Math.abs(value-Number(value.toFixed(3)))>1e-10?'≈':'=';
  function ohmDiagram(spec,key){
    if(!ohmStates.has(key)){
      const valid=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>=1&&Number(value)<=24?Number(value):fallback;
      const initial={u:valid(spec.ohmDefaults?.u,12),r:valid(spec.ohmDefaults?.r,6)};
      ohmStates.set(key,{...initial,initial});
    }
    const state=ohmStates.get(key),current=state.u/state.r,id='lv-ohm-'+key.replace(/[^a-zA-Z0-9_-]/g,'-');
    const symbol=(letter,meaning,unit)=>{
      const explanation=`Az ${letter} ${meaning==='feszültség'?'a':'az'} ${meaning} jele. Mértékegysége ${unit==='V'?'a volt':unit==='Ω'?'az ohm':'az amper'} (${unit}).`;
      return `<span class="lv-ohm-symbol" tabindex="0" data-learn-tooltip="${esc(explanation)}">${letter}</span>`;
    };
    const control=(field,letter,name,unit,value)=>`<div class="lv-ohm-control"><label for="${id}-${field}">${symbol(letter,name.toLocaleLowerCase('hu'),unit)} ${name}</label><div class="lv-ohm-control-row"><input id="${id}-${field}" type="range" min="1" max="24" step="1" value="${value}" data-lv-ohm="${field}" aria-label="${name}, ${unit}"><input type="number" min="1" max="24" step="1" value="${value}" inputmode="numeric" data-lv-ohm="${field}" aria-label="${name} számmal, ${unit}"><span class="lv-ohm-unit">${unit}</span></div></div>`;
    const circuit=narrow=>{
      const sx=narrow?60:120,rx=narrow?260:475,arrow=narrow?115:250;
      return `<svg class="${narrow?'lv-ohm-narrow':'lv-ohm-wide'}" viewBox="0 0 ${narrow?330:650} ${narrow?295:260}" role="img" aria-label="A feszültségforrás és az ellenállás zárt áramköre"><g fill="none" stroke="#79624f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M${sx} 106V65H${rx}V110M${rx} 190V240H${sx}V174"/><circle cx="${sx}" cy="140" r="34" fill="#fff"/><path d="M${sx-8} 127h16m-8-8v16m-8 20h16"/><rect x="${rx-25}" y="110" width="50" height="80" class="lv-load"/><path d="M${arrow} 65h95m-10-8 10 8-10 8" class="lv-current-arrow" data-lv-ohm-indicator style="stroke-width:${Math.min(8,2+current)}"/><text x="${sx+85}" y="205"><tspan>U = </tspan><tspan data-lv-ohm-value="u">${ohmNumber(state.u)}</tspan><tspan> V</tspan></text><text x="${narrow?rx:555}" y="${narrow?273:155}"><tspan>R = </tspan><tspan data-lv-ohm-value="r">${ohmNumber(state.r)}</tspan><tspan> Ω</tspan></text><text x="${narrow?160:300}" y="42"><tspan data-lv-ohm-relation>I ${ohmRelation(current)} </tspan><tspan data-lv-ohm-value="i">${ohmNumber(current)}</tspan><tspan> A</tspan></text></g></svg>`;
    };
    return `<div class="lv-ohm"><div class="lv-ohm-controls">${control('u','U','Feszültség','V',state.u)}${control('r','R','Ellenállás','Ω',state.r)}</div><div class="lv-technical lv-ohm-circuit" tabindex="0" role="region" aria-label="Zárt egyenáramú forrás–ellenállás kör" data-lv-diagram>${circuit(false)}${circuit(true)}</div><div class="lv-ohm-answer"><div class="lv-ohm-equation">${symbol('I','áramerősség','A')} = <span class="fm-frac"><span class="fm-numerator">${symbol('U','feszültség','V')}</span><span class="fm-denominator">${symbol('R','ellenállás','Ω')}</span></span> = <span class="fm-frac"><span class="fm-numerator"><b data-lv-ohm-value="u">${ohmNumber(state.u)}</b> <span class="lv-ohm-unit">V</span></span><span class="fm-denominator"><b data-lv-ohm-value="r">${ohmNumber(state.r)}</b> <span class="lv-ohm-unit">Ω</span></span></span> <span data-lv-ohm-equals>${ohmRelation(current)}</span> <output data-lv-ohm-current aria-live="polite">${ohmNumber(current)} A</output></div><p data-lv-ohm-held>Az egyik értéket változtasd. A másik változatlan marad.</p><button type="button" data-lv-ohm-reset>Alaphelyzet</button><p class="lv-ohm-baseline" data-lv-ohm-baseline aria-label="Kiindulási értékek az összehasonlításhoz"><span>Kiindulás:</span><b>U = ${ohmNumber(state.initial.u)} V</b><b>R = ${ohmNumber(state.initial.r)} Ω</b><b>I ${ohmRelation(state.initial.u/state.initial.r)} ${ohmNumber(state.initial.u/state.initial.r)} A</b></p></div></div>`;
  }
  function updateOhm(panel,field,raw,commit=false){
    const state=ohmStates.get(panel.dataset.lvKey);if(!state||!['u','r','reset'].includes(field))return;
    if(field==='reset'){state.u=state.initial.u;state.r=state.initial.r;}
    else{
      let value=raw===''?NaN:Number(raw);
      if(!Number.isFinite(value)||value<1||value>24||!Number.isInteger(value)){if(!commit)return;value=Number.isFinite(value)?Math.max(1,Math.min(24,Math.round(value))):state[field];}
      state[field]=value;
    }
    const current=state.u/state.r;
    panel.querySelectorAll('[data-lv-ohm]').forEach(input=>{const value=String(state[input.dataset.lvOhm]);if(input.value!==value)input.value=value;});
    panel.querySelectorAll('[data-lv-ohm-value]').forEach(node=>{node.textContent=ohmNumber(node.dataset.lvOhmValue==='i'?current:state[node.dataset.lvOhmValue]);});
    panel.querySelector('[data-lv-ohm-current]').textContent=ohmNumber(current)+' A';
    panel.querySelectorAll('[data-lv-ohm-relation]').forEach(node=>node.textContent='I '+ohmRelation(current)+' ');
    panel.querySelector('[data-lv-ohm-equals]').textContent=ohmRelation(current);
    panel.querySelectorAll('[data-lv-ohm-indicator]').forEach(arrow=>arrow.style.strokeWidth=Math.min(8,2+current));
    panel.querySelector('[data-lv-ohm-held]').textContent=field==='reset'?'Az egyik értéket változtasd. A másik változatlan marad.':field==='u'?`R = ${ohmNumber(state.r)} Ω változatlan.`:`U = ${ohmNumber(state.u)} V változatlan.`;
  }
  function materialComparison(spec,index){
    const max=Math.max(...spec.items.map(item=>Number(item.resistivity)||0));
    return `<div class="lv-materials" data-lv-diagram>${spec.items.map((item,i)=>{const metal=item.material==='Al'?'#b5bbc0':'#bf7a43',rho=Number(item.resistivity)||0;return `<button type="button" data-lv-index="${i}" aria-pressed="${i===index}" class="${i===index?'is-active':''}" style="--lv-metal:${metal}"><svg viewBox="0 0 120 100" aria-hidden="true"><circle cx="60" cy="45" r="33" fill="${metal}" stroke="#786b5d" stroke-width="1.5"/><path d="M39 22 84 67M31 34 72 75M47 14 91 58" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="M24 88h72m-72-5v10m72-10v10" stroke="#8b7969" stroke-width="1.5"/></svg><strong>${esc(item.label)} (${esc(item.material)})</strong><span class="lv-material-value">ρ ≈ <b>${esc(item.value)}</b> <small>${esc(item.unit)}</small></span><span class="lv-material-bar" aria-hidden="true"><i style="width:${max?rho/max*100:0}%"></i></span></button>`;}).join('')}</div><p class="lv-material-condition">${esc(spec.condition||'')}</p>`;
  }
  function conductorComparison(spec,index){
    const baseLength=230,baseDiameter=34;
    const cylinder=(length,diameter,color,reference=false)=>{
      const x=22,y=30,cap=9*diameter/baseDiameter;
      return `<g class="${reference?'lv-reference-cylinder':''}" stroke="#9a6a45" stroke-width="2"><path ${reference?'':'data-motion-key="conductor-body"'} d="M${x} ${y-diameter/2}H${x+length}V${y+diameter/2}H${x}Z" fill="${color}"/><ellipse ${reference?'':'data-motion-key="conductor-far-end"'} cx="${x+length}" cy="${y}" rx="${cap}" ry="${diameter/2}" fill="${color}"/><ellipse ${reference?'':'data-motion-key="conductor-near-end" data-lv-semantic-target="conductor-end-face"'} cx="${x}" cy="${y}" rx="${cap}" ry="${diameter/2}" fill="${color}"/></g>`;
    };
    const row=(changed)=>{
      const length=changed&&index===1?2*baseLength:baseLength,diameter=changed&&index===2?baseDiameter*Math.SQRT2:baseDiameter;
      const heading=!changed?'Kiindulás: réz':index===0?'Alumínium, azonos méretek':index===1?'Kétszeres hossz':'Kétszeres keresztmetszet';
      const area=changed&&index===2?'2A':'A',lengthLabel=changed&&index===1?'2l':'l';
      const shape=cylinder(length,diameter,changed&&index===0?'#c8cdd1':'#c88b51')+(changed&&index>0?cylinder(baseLength,baseDiameter,'none',true):'');
      return `<div class="lv-conductor-row ${changed?'lv-changed':'lv-baseline'}"><strong>${heading}</strong><div class="lv-conductor-shape"><span class="lv-conductor-area" data-lv-semantic-target="conductor-area-label" tabindex="0" data-learn-tooltip="A a vezető keresztmetszetének jele. Mértékegysége mm².">${area}</span><div><svg viewBox="0 0 510 72" role="img" aria-label="${esc(heading)}. Keresztmetszet: ${area}. Hossz: ${lengthLabel}.">${shape}<path ${changed?'data-motion-key="conductor-length-line"':''} d="M22 62H${22+length}M22 57v10M${22+length} 57v10" fill="none" stroke="#9a3e51" stroke-width="2"/></svg><span class="lv-conductor-length" tabindex="0" data-learn-tooltip="l a vezető hossza. Mértékegysége méter (m)." style="width:${length/510*100}%;margin-left:${22/510*100}%">${lengthLabel}</span></div></div></div>`;
    };
    const result=index===0?'Azonos l és A mellett R<sub>Al</sub> ≈ 1,59 · R<sub>Cu</sub>.':index===1?'Azonos anyag és A mellett R = 2R<sub>0</sub>.':'Azonos anyag és l mellett R = R<sub>0</sub> / 2.';
    return `<div class="lv-conductor-comparison" data-lv-diagram>${row(false)}${row(true)}<div class="lv-conductor-formula" data-lv-semantic-target="conductor-formula"><span>R<sub>0</sub> = ρ<sub>Cu</sub> · l / A</span><strong>${result}</strong></div></div>${controls(spec,index)}`;
  }
  function branchDiagram(spec,index){
    const selective=spec.variant==='selectivity',count=selective?2:Math.max(2,Math.min(3,spec.items.length-1)),ys=Array.from({length:count},(_,i)=>70+i*170/(count-1));
    let d='<path d="M55 35H145M190 35H260V240" class="lv-branch-phase"/><path d="M55 290H685" class="lv-branch-neutral"/><rect x="145" y="20" width="45" height="30" class="lv-branch-fuse"/><path d="M145 35h45"/><text x="40" y="43">L</text><text x="40" y="298">N</text>';
    ys.forEach((y,i)=>{const fault=selective&&i===1&&index>0,active=selective?(index===1?i===1:index===2?i===0:false):index===i+1;
      d+=`<g class="${active?'lv-branch-focus':''}"><path d="M260 ${y}H360M405 ${y}H560" class="lv-branch-phase"/><path d="M600 ${y}H685V290" class="lv-branch-neutral"/><rect x="360" y="${y-15}" width="45" height="30" class="lv-branch-fuse"/>${fault?`<path d="M369 ${y-8}l27 16m0-16-27 16" class="lv-branch-open"/>`:`<path d="M360 ${y}h45"/>`}<rect x="560" y="${y-20}" width="40" height="40" class="lv-branch-load"/><circle cx="260" cy="${y}" r="4" fill="#805033"/><circle cx="685" cy="${y}" r="4" fill="#2878b2"/><text x="540" y="${y-30}" text-anchor="end">${esc(selective?spec.items[i===0?2:1]?.label:spec.items[i+1]?.label)}</text></g>`;
    });
    return `<div class="lv-technical lv-branches" tabindex="0" role="region" aria-label="${esc(spec.title)}" data-lv-diagram><svg viewBox="0 0 780 330" role="img" aria-label="${esc(spec.title)}"><g fill="none" stroke="#79624f" stroke-width="2.5">${d}</g></svg></div>${controls(spec,index)}`;
  }
  function contactorDiagram(spec,index){
    const focus=spec.items[index].selectedPart||'',part=(kind,body)=>`<g class="${focus===kind?'lv-part-focus':''}">${body}</g>`;
    const operated=['start','hold'].includes(spec.items[index].controlState),contact=kind=>kind==='nc'?(operated?glyphs['normally-open']:glyphs['normally-closed']):(operated?'M4 32h56M24 17v30M40 17v30':glyphs['normally-open']);
    let d=part('coil','<path d="M45 160H95M205 160H250"/><rect x="95" y="138" width="110" height="44"/><text x="70" y="125">A1</text><text x="230" y="125">A2</text>');
    d+='<path d="M150 138V100H690M290 100V260H690" class="lv-mechanical"/>';
    d+=part('main-contact',[330,460,590].map((x,i)=>`<g transform="translate(${x} 65) scale(1.3)"><path d="${contact('no')}"/></g><text x="${x+42}" y="52">${i*2+1}–${i*2+2}</text>`).join(''));
    d+=part('aux-no',`<g transform="translate(440 225) scale(1.3)"><path d="${contact('no')}"/></g><text x="480" y="220">13–14</text>`);
    d+=part('aux-nc',`<g transform="translate(590 225) scale(1.3)"><path d="${contact('nc')}"/></g><text x="630" y="220">21–22</text>`);
    if(operated)d+='<text x="150" y="215">Táplált tekercs</text><text x="490" y="155">Zárt főérintkezők</text>';
    return `<div class="lv-technical lv-contactor-parts" tabindex="0" role="region" aria-label="${esc(spec.title)}" data-lv-diagram><svg viewBox="0 0 780 340" role="img" aria-label="${esc(spec.title)}"><g fill="none" stroke="#79624f" stroke-width="2.5">${d}</g></svg></div>${controls(spec,index)}`;
  }
  function selfHoldDiagram(spec,index){
    const item=spec.items[index];
    if(item.selectedPart==='main-contact')return contactorDiagram(spec,index);
    const state=item.controlState||'idle',on=['start','hold'].includes(state),stopped=state==='stop',locked=state==='interlock';
    const blade=(key,x,y,closed,kind,label)=>`<g class="${item.selectedPart===kind?'lv-part-focus':''}"><path d="M${x-20} ${y}h20M${x+50} ${y}h20"/><circle cx="${x}" cy="${y}" r="3" fill="#fff"/><circle cx="${x+50}" cy="${y}" r="3" fill="#fff"/><path data-motion-key="${key}" d="M${x} ${y}h50" transform="rotate(${closed?0:-27} ${x} ${y})" class="lv-contact"/><text x="${x+25}" y="${y-40}">${label}</text></g>`;
    let drawing='<path d="M55 40V240M725 40V240"/><text x="55" y="27">L</text><text x="725" y="27">N</text>';
    drawing+='<path d="M55 95H125M215 95H290M380 95H480M550 95H580M665 95H725M270 95V195H290M380 195H440V95"/>';
    drawing+=blade('stop-blade',145,95,!stopped,'stop-button','STOP');
    drawing+=blade('start-blade',310,95,state==='start'||locked,'start-button','START');
    drawing+=blade('holding-blade',310,195,on,'holding-contact','K: 13–14');
    drawing+='<path d="M170 70V85M155 70h30M335 70V85M320 70h30" stroke-dasharray="3 4"/>';
    if(locked)drawing+=blade('interlock-blade',480,95,false,'interlock-contact','K2')+'<text x="505" y="128" class="lv-process-note">21–22</text>';
    else drawing+='<path d="M480 95h70"/>';
    drawing+=`<rect x="580" y="74" width="85" height="42" style="fill:${on?'#f7d8a5':'#fff'}" data-coil-energized="${on}" class="lv-load"/><text x="622.5" y="103">K</text><text x="569" y="66">A1</text><text x="680" y="66">A2</text><text x="622.5" y="157" class="lv-process-note">${on?'Gerjesztett tekercs':'Elengedett tekercs'}</text>`;
    if(on)drawing+=`<path d="${state==='start'?'M55 95H580':'M55 95H270V195H440V95H580'}M665 95H725" class="lv-current-trace" fill="none"/>`;
    drawing+='<circle cx="270" cy="95" r="4" fill="#79624f"/><circle cx="440" cy="95" r="4" fill="#79624f"/>';
    return `<div class="lv-technical lv-self-hold" tabindex="0" role="region" aria-label="Öntartó mágneskapcsoló vezérlőköre" data-lv-diagram><svg viewBox="0 0 780 260" role="img" aria-label="${esc(spec.title)}"><g fill="none" stroke="#79624f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg></div>${controls(spec,index)}`;
  }
  function waveSketch(spec,item,index){
    const mode=spec.waveMode||spec.phaseMode||'rlc',label=String(item.label||'').toLocaleLowerCase('hu'),dual=mode==='rlc';
    const shift=Number.isFinite(item.phaseShiftDegrees)?item.phaseShiftDegrees*Math.PI/180:Number.isFinite(item.phaseRadians)?item.phaseRadians:(/tekercs|induktív/.test(label)||item.glyph==='coil')?-Math.PI/2:(/kondenz|kapacitív/.test(label)||item.glyph==='capacitor')?Math.PI/2:0;
    const curve=phase=>Array.from({length:161},(_,i)=>`${i?'L':'M'}${80+i*620/160} ${175-95*Math.sin(i/160*Math.PI*2+phase)}`).join('');
    let d='<path d="M50 175H740M80 35V305" class="lv-axis" fill="none"/>'+`<path d="${curve(0)}" class="lv-voltage-wave" fill="none"/>`;
    if(dual)d+=`<path d="${curve(shift)}" class="lv-current-wave" fill="none"/><text x="145" y="35" class="lv-p">u/Umax</text><text x="285" y="35" class="lv-q">i/Imax</text>`;
    else d+='<text x="110" y="35" class="lv-p">U</text>';
    if(mode==='period'){
      const angle=/negatív/.test(label)?Math.PI*1.5:/nulla/.test(label)?Math.PI:Math.PI*.5;
      d+=`<circle cx="${80+620*angle/(Math.PI*2)}" cy="${175-95*Math.sin(angle)}" r="8" class="lv-wave-point"/><text x="390" y="320">T</text>`;
    }
    const f=Number(item.frequencyHz??item.frequency??spec.frequencyHz??spec.frequency??(mode==='frequency'?item.value:NaN));
    if(mode==='frequency'&&f>0)d+=`<text x="530" y="35">f = ${esc(f)} Hz</text><text x="390" y="320">T = ${esc(Number((1000/f).toFixed(3)))} ms</text>`;
    d+='<text x="740" y="200">t</text><g data-wave-cursor opacity="0"><line data-wave-scan x1="80" x2="80" y1="42" y2="300"/><circle data-wave-u cx="80" cy="175" r="7"/>'+(dual?'<circle data-wave-i cx="80" cy="175" r="4.5"/>':'')+'</g>';
    return `<g data-lv-wave data-wave-phase="${shift}" data-wave-dual="${dual}">${d}</g>`;
  }
  function playWave(panel,button){
    const active=wavePlayback.get(panel);if(active){active.cancel();return;}
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const wave=panel.querySelector('[data-lv-wave]'),cursor=wave?.querySelector('[data-wave-cursor]');if(!cursor)return;
    const scan=wave.querySelector('[data-wave-scan]'),u=wave.querySelector('[data-wave-u]'),i=wave.querySelector('[data-wave-i]'),phase=Number(wave.dataset.wavePhase)||0;
    let frame=0,started=performance.now(),done=false;
    const cancel=()=>{if(done)return;done=true;cancelAnimationFrame(frame);cursor.setAttribute('opacity','0');button.setAttribute('aria-pressed','false');button.textContent='Egy periódus lejátszása';wavePlayback.delete(panel);};
    wavePlayback.set(panel,{cancel});button.setAttribute('aria-pressed','true');button.textContent='Lejátszás megállítása';cursor.setAttribute('opacity','1');
    const tick=now=>{if(!panel.isConnected||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){cancel();return;}const p=Math.min(1,(now-started)/2800),x=80+620*p,angle=p*2*Math.PI;scan.setAttribute('x1',x);scan.setAttribute('x2',x);u.setAttribute('cx',x);u.setAttribute('cy',175-95*Math.sin(angle));if(i){i.setAttribute('cx',x);i.setAttribute('cy',175-95*Math.sin(angle+phase));}if(p<1)frame=requestAnimationFrame(tick);else cancel();};
    frame=requestAnimationFrame(tick);
  }
  function technical(spec,index,key='ohm'){
    const lab=window.VVLearningLabs?.render(spec,index);if(lab)return lab;
    const v=spec.variant,item=spec.items[index],label=String(item.label||'').toLocaleLowerCase('hu'),n=spec.items.length;
    let drawing='',kind=v;
    const line=(path,cls='')=>`<path class="${cls}" d="${path}" fill="none"/>`;
    const text=(x,y,s,cls='')=>`<text class="${cls}" x="${x}" y="${y}">${esc(s).replace(/([A-Za-zΑ-ω])_([A-Za-zÀ-ž0-9]+(?:[,–][A-Za-zÀ-ž0-9]+)*)/gu,'$1<tspan baseline-shift="sub" font-size="68%">$2</tspan>')}</text>`;
    if(v==='material-resistivity')return materialComparison(spec,index);
    if(v==='voltage-drop-model'){
      const model=item.model;
      if(model==='three-phase'){
        drawing='<rect x="55" y="60" width="100" height="220" fill="#fff"/><rect x="590" y="60" width="125" height="220" fill="#fff"/>';
        [90,170,250].forEach((y,i)=>{drawing+=line(`M155 ${y}H315M365 ${y}H590`,'lv-supply')+`<rect x="315" y="${y-12}" width="50" height="24" fill="#fff"/>`+text(105,y+8,`L${i+1}`);});
        drawing+=text(650,180,'3~')+text(390,43,'l');
      }else{
        drawing='<rect x="65" y="110" width="90" height="110" fill="#fff"/><rect x="590" y="120" width="65" height="90" class="lv-load"/>'+text(110,173,'U');
        drawing+=line('M155 135H315M365 135H590','lv-supply')+'<rect x="315" y="123" width="50" height="24" fill="#fff"/>'+text(390,90,'l')+text(340,175,'R₁');
        if(model==='loop')drawing+=line('M655 190H690V265H365M315 265H110V220')+'<rect x="315" y="253" width="50" height="24" fill="#fff"/>'+text(390,306,'l')+text(340,243,'R₂');
        else drawing+=line('M655 190H690V265H110V220')+text(390,315,'ΔU = I · R₁');
        drawing+=text(625,105,'Fogyasztó');
      }
    }else if(v==='contact-protection'){
      const state=item.protectionState||'';
      if(['fault-protection','insulation-fault'].includes(state)){
        const example={...spec,variant:'fault-loop',networkType:'TN-S',labels:{source:'Forrás',consumer:'Készülék fémteste',fault:'L–test hiba',detail:''},items:spec.items.map(it=>({...it,networkType:'TN-S',currentPath:'fault',selectedPath:'pe'}))};
        return window.VVLearningNetworks.render(example,index).replace('<svg ','<svg data-lv-semantic-focus="exposed-case" ')+'<p class="lv-diagram-note" data-lv-semantic-target="fault-return-explanation">TN-S példa: a hibaáram a PE-n, fémes úton tér vissza a forráshoz.</p>'+controls(spec,index);
      }
      drawing='<rect x="295" y="70" width="220" height="220" rx="6" fill="#e5e9ed" stroke="#61717f"/><path d="M305 80H505V280H305Z" fill="#fff" stroke="#8b99a3"/><rect x="331" y="100" width="99" height="28" rx="3" fill="#dfebee" stroke="#8b99a3"/><circle cx="461" cy="114" r="7" fill="#a9b6bf"/><circle cx="404" cy="203" r="51" fill="#eff3f5" stroke="#8b99a3"/><circle cx="404" cy="203" r="40" fill="#fdfdfc" stroke="#b2bec6"/><path d="M486 163V220" fill="none" stroke="#8b99a3"/>'+text(405,320,'Szigetelés / burkolat');
      drawing+='<path d="M80 175h180v35H80" fill="#e9bd90" stroke="#9a653b"/>'+line('M270 130v120','lv-barrier');
    }
    else if(v==='selectivity'||v==='circuit-branches')return branchDiagram(spec,index);
    else if(v==='contactor')return contactorDiagram(spec,index);
    else if(v==='efficiency-split'){
      drawing=line('M90 170H330M330 170 590 85M330 170 590 265','lv-supply')+'<circle cx="330" cy="170" r="7" fill="#71513b"/>';
      drawing+=spec.items.slice(0,3).map((it,i)=>text([155,600,600][i],[145,60,305][i],it.label)).join('');
    }else if(v==='steam-cycle'){
      const focus=(i,body)=>`<g class="${index===i?'lv-process-focus':''}">${body}</g>`;
      drawing=line('M220 125H330M405 170V225','lv-steam-pipe')+line('M335 254H222M178 254H145V170','lv-water-pipe')+line('M480 122H620M480 128H620','lv-shaft');
      drawing+=line('M270 118l9 7-9 7M398 196l7 9 7-9','lv-steam-pipe')+line('M286 247l-9 7 9 7M138 204l7-9 7 9','lv-water-pipe');
      drawing+=focus(0,'<rect x="70" y="80" width="150" height="90" rx="5" fill="#fff0d5"/>'+text(145,113,'Kazán /','lv-process-label')+text(145,142,'gőzfejlesztő','lv-process-label'));
      drawing+=focus(1,'<rect x="330" y="80" width="150" height="90" rx="5" fill="#fff8ed"/>'+text(405,133,'Turbina','lv-process-label'));
      drawing+=focus(2,'<circle cx="655" cy="125" r="35" fill="#fff"/>'+text(655,134,'G')+text(655,65,'Generátor','lv-process-label'));
      drawing+=focus(3,'<rect x="335" y="225" width="140" height="58" rx="5" fill="#edf5fb"/>'+text(405,260,'Kondenzátor','lv-process-label'));
      drawing+='<circle cx="200" cy="254" r="22" fill="#edf5fb"/>'+line('M212 254H188m8-7-8 7 8 7','lv-water-pipe')+text(200,302,'Tápszivattyú','lv-process-label');
      drawing+=text(275,102,'gőz','lv-process-note')+text(275,233,'víz','lv-process-note')+text(550,153,'tengely','lv-process-note');
      drawing+=line('M475 254H555m-9-7 9 7-9 7','lv-cooling')+text(544,283,'hőleadás','lv-process-note');
      drawing+=text(395,335,'A kondenzátor itt a gőzt vízzé alakító hőcserélő.','lv-process-note');
    }else if(v==='battery-load'){
      const open=index===0;
      drawing=line('M110 160V85H250M340 85H440M520 85h140v70M660 225v65H110V182')+line('M90 160h40m-32 22h24','lv-source')+line('M250 65h90v40h-90zM635 155h50v70h-50z','lv-load')+line(open?'M440 85l68-35':'M440 85h80','lv-contact')+text(295,50,'Rb')+text(700,195,'R');
      if(!open)drawing+=`<path d="M145 85H220m-10-8 10 8-10 8" class="lv-current-arrow" fill="none" style="stroke-width:${index===2?6:3}"/>`;
      drawing+=text(175,50,open?'I = 0':index===2?'I ↑':'I');
    }else if(v==='current-transformer'){
      drawing=line('M70 155H680','lv-source')+'<ellipse cx="350" cy="155" rx="85" ry="110" fill="none" stroke="#a48e7a" stroke-width="17"/><path d="M420 90c35 0 35 20 0 20 35 0 35 20 0 20 35 0 35 20 0 20" fill="none" stroke="#765594"/>'+line('M420 90H580V143M580 207V245H480V150H420','lv-secondary')+'<circle cx="580" cy="175" r="32" fill="#fff"/>'+text(580,185,'A');
    }else if(v==='rcd-balance'){
      const leak=index>0,tripped=index===2;
      drawing=line(tripped?'M65 95H170M170 95l30-20M220 95H660V145M660 205V255H220M170 255H65M170 255l30 20':'M65 95H660V145M660 205V255H65','lv-source')+line('M635 145h50v60h-50z','lv-load')+'<ellipse cx="330" cy="175" rx="65" ry="125" fill="none" stroke="#a18b74" stroke-width="12"/>';
      if(leak)drawing+=line('M660 120H730V305','lv-q')+line('M710 305h40m-33 9h26m-19 9h12','lv-q');
      if(!tripped)drawing+=line('M120 95h60m-10-8 10 8-10 8M180 255h-60m10-8-10 8 10 8','lv-current-arrow');
      drawing+=text(90,65,'L')+text(90,290,'N');
    }else if(v==='self-hold'){
      return selfHoldDiagram(spec,index);
    }else if(v==='tube'){
      return nodes({...spec,type:'compare'},index);
    }else if(v==='network-topology'){
      const mode=/sugar/.test(label)?0:/gyűr/.test(label)?1:/íves/.test(label)?2:/hurkol/.test(label)?3:index;
      drawing=line('M90 70H230V160H390V260H550','lv-supply');
      if(mode===1)drawing=line('M90 70H230V160H390V260H550V70H90','lv-supply');
      if(mode===2)drawing=line('M90 70H230V160H390V260H550V70H690','lv-supply');
      if(mode===3)drawing=line('M90 70H230V160H390V260H550V70H90M230 70H550M230 160H550V260H390M90 70V260H390','lv-supply');
      drawing+=[[90,70],[230,160],[390,260],[550,mode===0?260:70]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i?12:20}" fill="${i?'#fff':'#b84d17'}"/>`).join('');
      if(mode===2)drawing+='<circle cx="690" cy="70" r="20" fill="#286c9b"/>';
      drawing+='<circle cx="205" cy="320" r="7" fill="#b84d17"/>'+text(277,327,'Táppont','lv-process-note')+'<circle cx="465" cy="320" r="7" fill="#fff"/>'+text(557,327,'Fogyasztói pont','lv-process-note');
    }else if(v==='conductor-dimensions'){
      return conductorComparison(spec,index);
    }else if(v==='cable-types'){
      if(index===0){const curve=(phase)=>Array.from({length:121},(_,i)=>`${i?'L':'M'}${100+i*4.8} ${175+38*Math.sin(i/120*Math.PI*7+phase)}`).join('');drawing=line(curve(0),'lv-p')+line(curve(Math.PI),'lv-q');}
      else if(index===1)drawing='<circle cx="390" cy="175" r="125" fill="#c5b9a7"/><circle cx="390" cy="175" r="105" fill="#f6f0e6" stroke="#7e8e91" stroke-width="12"/><circle cx="390" cy="175" r="80" fill="#fff"/><circle cx="390" cy="175" r="25" fill="#bc8644"/>';
      else drawing='<path d="M115 146H665V204H115Z" fill="#dce1e8" stroke="#7f8995"/><path d="M115 160H665V190H115Z" fill="#b7dded" stroke="#53859b"/><path d="M115 168H665V182H115Z" fill="#f4fbff" stroke="#72b8d6"/><path d="M132 175h45l24-5 48 10 48-10 48 10 48-10 48 10 48-10 48 10 48-10 24 5h45" fill="none" stroke="#b34f24" stroke-width="2.5"/><path d="M115 146V204M665 146V204" fill="none" stroke="#596c7a"/>';
      if(index===2)return `<div class="lv-technical lv-optical-cutaway" tabindex="0" role="region" aria-label="Az optikai szál hosszmetszete, benne haladó fényjellel" data-lv-diagram><svg viewBox="80 125 620 100" role="img" aria-label="Az optikai jel a belső üvegszálban halad"><g stroke="#79624f" stroke-width="2.5" stroke-linejoin="round">${drawing}</g></svg></div>${controls(spec,index)}`;
    }else if(v==='wire-colors'){
      const color=esc(item.color||colors[index%colors.length]);
      const wireId='lv-wire-'+(technical.wireSerial=(technical.wireSerial||0)+1);
      // A straight, cut length of insulated conductor. The right end is a flat
      // cut, not a rounded capsule. The exposed core is visibly narrower than
      // the insulation, and PE stripes run along the insulation only.
      drawing=`<defs><clipPath id="${wireId}"><path d="M155 77H658V119H155Z"/></clipPath></defs><path d="M155 77H658V119H155Z" fill="${color}" stroke="#5c5c55" stroke-width="1.5"/><g clip-path="url(#${wireId})">${item.stripe?`<path d="M155 88H660M155 109H660" stroke="${esc(item.stripe)}" stroke-width="8"/>`:''}${item.endColor?`<path d="M183 76V121M623 76V121" stroke="${esc(item.endColor)}" stroke-width="55"/>`:''}<path d="M160 80H656" stroke="#fff" stroke-opacity=".25" stroke-width="2"/></g><ellipse cx="155" cy="98" rx="6" ry="21" fill="${color}" stroke="#5c5c55" stroke-width="1.5"/><ellipse cx="155" cy="98" rx="3" ry="10" fill="#c78a4d"/><path d="M100 88H155V108H100Z" fill="#c78a4d"/><path d="M100 88H155M100 108H155" fill="none" stroke="#805c37" stroke-width="1.5"/><ellipse cx="100" cy="98" rx="5" ry="10" fill="#ecc38e" stroke="#805c37" stroke-width="1.5"/><path d="M655 78V118" stroke="#313b40" stroke-width="1.5"/>${text(385,158,item.label)}`;
      return `<div class="lv-technical lv-wire-colors" tabindex="0" role="region" aria-label="${esc(item.label)} szigetelt vezető" data-lv-diagram><svg viewBox="70 60 620 115" role="img" aria-label="${esc(item.label)}. A szigetelés színe és a csupasz vezetővég."><g stroke-linejoin="round">${drawing}</g></svg></div>${controls(spec,index)}`;
    }else if(v==='cable-section'||v==='cable-structure'){
      const peClipId='lv-cable-pe-'+(technical.cableClipSerial=(technical.cableClipSerial||0)+1);
      drawing=`<defs><clipPath id="${peClipId}" clipPathUnits="userSpaceOnUse"><circle cx="325" cy="225" r="40"/></clipPath></defs><circle cx="340" cy="175" r="133" fill="#565451"/><circle cx="340" cy="175" r="119" fill="#e6dfd1"/>`;
      [[300,130,'#805033'],[385,150,'#2878b2'],[325,225,'#287849']].forEach(([x,y,color],i)=>{drawing+=`<circle cx="${x}" cy="${y}" r="40" fill="${color}" stroke="${index===1?'#b84d17':'#fff9ed'}" stroke-width="${index===1?6:2}"/>${i===2?`<g clip-path="url(#${peClipId})">${line(`M${x-45} ${y-44}l88 94m-106-46 80 86`,'lv-pe-stripe')}</g>`:''}<circle cx="${x}" cy="${y}" r="23" fill="#c1884d" stroke="${index===0?'#b84d17':'#e3ba87'}" stroke-width="${index===0?5:2}"/>`;});
      if(index===2)drawing+='<circle cx="340" cy="175" r="133" fill="none" stroke="#b84d17" stroke-width="6"/>';
      const pointerX=index===2?473:index===1?425:408,pointerY=index===2?175:150;
      drawing+=line(`M${pointerX} ${pointerY}H665`,'lv-pointer')+text(590,pointerY-25,item.label);
    }else if(v==='power-triangle'){
      const active=/^p\b|hatásos/.test(label)?'p':/^q\b|meddő/.test(label)?'q':'s';
      drawing=line('M170 260H590','lv-p '+(active==='p'?'is-focus':''))+line('M590 260V70','lv-q '+(active==='q'?'is-focus':''))+line('M170 260 590 70','lv-s '+(active==='s'?'is-focus':''))+line('M568 260v-22h22')+text(380,300,'P','lv-p')+text(630,170,'Q','lv-q')+text(350,135,'S','lv-s');
    }else if(v==='ohm'){
      return ohmDiagram(spec,key);
    }else if(v==='slip'){
      drawing=line('M120 90H650m-20-12 20 12-20 12','lv-p')+line('M120 200H565m-20-12 20 12-20 12','lv-q')+line('M565 270H650M565 260v20M650 260v20','lv-pointer')+text(75,100,'n_s')+text(75,210,'n')+text(607,310,'n_s − n');
      drawing+=text(400,35,'n_s > n');
    }else if(v==='overcurrent'){
      const traces=['M100 245h100v-75h480','M100 245h100V45H300v200h380','M100 245h100C220 70 250 60 280 115S340 245 420 245H680'];
      drawing=line('M100 30v250H700','lv-axis')+line('M100 245H690','lv-rating')+line(traces[Math.min(index,2)],'lv-supply')+text(75,35,'I')+text(715,285,'t');
    }else if(v==='instrument'){
      const angle=Math.PI+46/60*Math.PI;
      drawing='<path d="M165 270a225 225 0 0 1 450 0" fill="#fff"/>'+Array.from({length:61},(_,i)=>{const a=Math.PI+i*Math.PI/60,r=i%10===0?195:207;return line(`M${390+r*Math.cos(a)} ${270+r*Math.sin(a)} ${390+220*Math.cos(a)} ${270+220*Math.sin(a)}`,i===60&&index===0?'lv-supply':'lv-axis')+(i%10===0?text(390+245*Math.cos(a),278+245*Math.sin(a),i):'');}).join('');
      drawing+=line(`M390 270 ${390+195*Math.cos(angle)} ${270+195*Math.sin(angle)}`,'lv-supply')+'<circle cx="390" cy="270" r="8" fill="#71513b"/>'+text(390,310,index===0?'Skálavég: 60':index===1?'Méréshatár: 300 V':'Leolvasott feszültség: 230 V');
    }else if(v==='wave'){
      drawing=waveSketch(spec,item,index);
    }else if(v==='light-distance'){
      if(index<2){
        // The second measuring plane is exactly twice as far from the point
        // source. Its two linear dimensions double. Both references stay put.
        const far=index===1,y=far?260:150,half=far?200:100;
        drawing='<path d="M390 40 190 260M390 40 590 260" fill="none" stroke="#c89d55" stroke-dasharray="6 5"/>';
        drawing+='<ellipse cx="390" cy="150" rx="100" ry="12" class="lv-light-reference"/><ellipse cx="390" cy="260" rx="200" ry="24" class="lv-light-reference"/>';
        drawing+=`<ellipse data-motion-key="light-measuring-plane" cx="390" cy="${y}" rx="${half}" ry="${far?24:12}" fill="#efba55" fill-opacity="${far?.2:.55}" stroke="#a97415" stroke-width="2.5"/>`;
        drawing+='<circle cx="390" cy="40" r="11" fill="#fff"/><path d="M382 32l16 16m0-16-16 16"/>';
        drawing+=text(520,48,'I = 1 cd')+text(130,157,'r = 1 m')+text(130,267,'r = 2 m')+text(665,157,'E = 1 lx')+text(665,267,'E = 0,25 lx')+text(390,320,'Két külön mérési helyzet.','lv-process-note');
      }else drawing=line('M80 175H280M420 175H680','lv-supply')+'<circle cx="350" cy="175" r="70" fill="#fff2cc"/>'+text(350,185,'lm/W')+text(160,140,'P')+text(590,140,'Φ')+text(390,300,'fényhasznosítás = Φ / P');
    }else if(['light-beam','light-distribution'].includes(v)){
      const focused=index%n;
      drawing=`<path d="M315 40h150l-35 25h-80z" fill="#79604a"/><path d="M350 65 155 275H625L430 65Z" fill="#f4b637" fill-opacity=".19" stroke="#d79c32" stroke-dasharray="7 7"/><path d="M130 278H650" class="${focused===2?'is-focus':''}"/><path d="M390 65v210" class="${focused===1?'is-focus lv-supply':'lv-axis'}"/><ellipse cx="390" cy="278" rx="235" ry="24" fill="#efba55" fill-opacity="${focused===2?.55:.18}"/>${line('M367 90 287 230M413 90l80 140','lv-light-ray')}`;
    }else if(['star-delta','three-phase-voltage','star-delta-start'].includes(v)){
      if(v==='three-phase-voltage'&&(item.measurementState==='frequency'||/hz|frekven/.test(label))){return `<div class="lv-technical" tabindex="0" role="region" aria-label="${esc(spec.title)}" data-lv-diagram><svg viewBox="0 0 780 350" role="img" aria-label="${esc(spec.title)}"><g>${waveSketch({...spec,waveMode:'frequency'},{...item,frequencyHz:item.frequencyHz??Number(item.value??label.match(/\d+/)?.[0])},index)}</g></svg></div>${controls(spec,index)}`;}
      const state=item.connectionState||(/delta|háromszög|Δ/.test(label)&&!/csillag/.test(label)?'delta':/átkapcsol|szünet/.test(label)?'open':'star'),delta=state==='delta';
      if(state==='nameplate')return nodes({...spec,type:'compare'},index);
      const winding=(x,y,angle)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-32" y="-15" width="64" height="30" class="lv-winding-mask"/><path d="M-32 0h5c0-12 18-12 18 0 0-12 18-12 18 0 0-12 18-12 18 0h5" class="lv-winding" fill="none"/></g>`;
      if(delta){drawing=line('M390 45 185 290H595L390 45','lv-supply')+winding(287.5,167.5,129.9)+winding(390,290,0)+winding(492.5,167.5,50.1);}
      else if(state==='open')drawing=line('M390 45V130M185 290 310 220M595 290 470 220')+winding(390,102,90)+winding(264,245,150.7)+winding(516,245,29.3)+'<circle cx="390" cy="130" r="5" fill="#fff"/><circle cx="310" cy="220" r="5" fill="#fff"/><circle cx="470" cy="220" r="5" fill="#fff"/>';
      else drawing=line('M390 175V45M390 175 185 290M390 175 595 290','lv-supply')+winding(390,102,90)+winding(301,225,150.7)+winding(479,225,29.3)+'<circle cx="390" cy="175" r="7" fill="#73513c"/>';
      drawing+=text(390,30,'L1')+text(150,310,'L2')+text(630,310,'L3');
      if(v==='three-phase-voltage'){
        if(index===0)drawing+=line('M390 175H690','lv-neutral-reference')+text(715,182,'N')+line('M390 45H665V88M665 132V175','lv-measure')+'<circle cx="665" cy="110" r="22" fill="#fffaf0" stroke="#286c9b"/>'+text(665,118,'V');
        else drawing+=line('M185 290H120V182M120 138V45H390','lv-measure')+'<circle cx="120" cy="160" r="22" fill="#fffaf0" stroke="#286c9b"/>'+text(120,168,'V');
      }
      if(v==='star-delta'&&item.selectedPart==='line-terminal')drawing+=line('M185 290H120V182M120 138V45H390','lv-measure')+'<circle cx="120" cy="160" r="22" fill="#fffaf0" stroke="#286c9b"/>'+text(120,168,'V');
      if(v==='star-delta'&&item.selectedPart==='winding')drawing+=line('M390 45H665V88M665 132V175H390','lv-measure')+'<circle cx="665" cy="110" r="22" fill="#fffaf0" stroke="#286c9b"/>'+text(665,118,'V');
    }else if(v==='clock-group'){
      const match=String(item.label).match(/(\d{1,2})\s*$/),hour=Number(item.hour??(match?Number(match[1]):6)),angle=hour*Math.PI/6;
      const x=390+105*Math.sin(angle),y=175-105*Math.cos(angle);
      drawing='<circle cx="390" cy="175" r="125" fill="#fff"/>'+Array.from({length:12},(_,i)=>{const a=(i+1)*Math.PI/6;return text(390+150*Math.sin(a),183-150*Math.cos(a),i+1)}).join('')+line('M390 175V60','lv-p')+line(`M390 175 ${x} ${y}`,'lv-q')+'<circle cx="390" cy="175" r="6" fill="#73513c"/>';
    }else if(v==='ip-water'){
      drawing='<rect x="295" y="95" width="200" height="170" rx="5" fill="#dfe6eb" stroke="#627584"/><rect x="306" y="106" width="178" height="148" rx="3" fill="#fffdf7" stroke="#91a0aa"/><rect x="329" y="128" width="104" height="64" rx="3" fill="#dbe8ed" stroke="#879ba7"/><path d="M341 141h79m-79 12h79m-79 12h79m-79 12h79" fill="none" stroke="#b3c4ce" stroke-width="2"/><rect x="456" y="151" width="10" height="36" rx="2" fill="#8496a2" stroke="#627584"/><circle cx="318" cy="118" r="2.5" fill="#7e929f"/><circle cx="472" cy="118" r="2.5" fill="#7e929f"/><circle cx="318" cy="242" r="2.5" fill="#7e929f"/><circle cx="472" cy="242" r="2.5" fill="#7e929f"/>';
      if(index===0){
        drawing+=['M320 40v33m-6-8 6 8 6-8','M395 40v33m-6-8 6 8 6-8','M470 40v33m-6-8 6 8 6-8','M230 155l44 17m-5-8 5 8-10 2','M560 175l-43 17m9 2-9-2 5-8'].map(d=>line(d,'lv-water-pipe')).join('');
        drawing+=text(395,308,'Cseppek és fröccsenő víz','lv-process-label');
      }else if(index===1){
        drawing+='<path d="M100 165h70l20 25-20 25h-70z" fill="#d9eaf2"/>';
        drawing+=line('M190 182L283 153M190 190H283M190 198L283 227','lv-water-pipe')+text(395,308,'Irányított vízsugár','lv-process-label');
      }else{
        drawing+='<path d="M210 70H580V280H210Z" fill="#b9dded" fill-opacity=".5" stroke="none"/>'+line('M210 70q23-9 46 0t46 0t46 0t46 0t46 0t46 0t46 0t46 0','lv-water-pipe');
        drawing+=text(395,312,'Bemerítés: IPX7 / IPX8','lv-process-label');
      }
    }else if(v==='ip-barrier'){
      drawing='<rect x="295" y="70" width="220" height="220" rx="14" fill="#eee6d8"/><rect x="330" y="105" width="150" height="150" rx="6" fill="#fff"/>'+line('M350 180h110','lv-load');
      drawing+=v==='ip-water'?'<path d="M200 55c-18 28-35 45-35 65a35 35 0 0 0 70 0c0-20-17-37-35-65" fill="#9dcee1" stroke="#286c9b"/>':'<path d="M80 175h180v35H80" fill="#e9bd90" stroke="#9a653b"/>';
      drawing+=line('M270 130v120','lv-barrier');
    }else if(v==='bath-zones'){
      drawing='<rect x="220" y="65" width="60" height="220" fill="#f7e7c4"/><rect x="500" y="65" width="60" height="220" fill="#f7e7c4"/><rect x="280" y="65" width="220" height="135" fill="#e7d7c2"/><path d="M280 200h220l-20 85H300z" fill="#c6e4ef" stroke="#286c9b" stroke-width="3"/>'+line('M175 285H610M600 65v220M590 65h20M590 285h20M500 45h60M500 35v20M560 35v20','lv-axis')+text(650,175,'2,25 m')+text(530,26,'0,60 m')+text(390,250,'0')+text(390,135,'1')+text(530,180,'2')+text(250,180,'2');
      drawing+=index===0?'<path d="M280 200h220l-20 85H300z" fill="none" stroke="#b84d17" stroke-width="5"/>':index===1?'<rect x="280" y="65" width="220" height="135" fill="none" stroke="#b84d17" stroke-width="5"/>':'<path d="M220 65h60v220h-60zM500 65h60v220h-60z" fill="none" stroke="#b84d17" stroke-width="5"/>';
    }else if(v==='contactor'){
      drawing='<rect x="105" y="120" width="140" height="85" fill="#f2dcc0"/>'+line('M45 162h60m140 0h60M245 162H430','lv-mechanical');
      drawing+=line('M430 65V130M430 205v85M520 65v65M520 205v85M610 65v65M610 205v85');
      const closed=/behúz|gerjeszt|zárt|bekapcsol|tart/.test(label);
      drawing+=line(closed?'M430 130v75M520 130v75M610 130v75':'M430 130l40 55M520 130l40 55M610 130l40 55','lv-contact');
      drawing+=text(175,170,'A1 / A2');
    }else if(v==='energy-meter'){
      return nodes({...spec,type:'compare'},index);
    }else if(['breaker-label','rcd-label','cable-code'].includes(v)){
      return nodes({...spec,type:'compare'},index);
    }else return '';
    return `<div class="lv-technical lv-${esc(kind)}" tabindex="0" role="region" aria-label="${esc(spec.title)}" data-lv-diagram data-lv-active="${esc(item.target||'')}" style="--lv-active:${esc(item.color||colors[index%colors.length])}"><svg viewBox="0 0 780 350" role="img" aria-label="${esc(spec.title)}"><g stroke="#79624f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg></div>${v==='slip'&&index===2?`<div class="lv-typeset-formula" role="math">${window.VVFormula.typeset('s = (n_s − n) / n_s')}</div>`:v==='voltage-drop'&&item.model==='three-phase'?`<div class="lv-typeset-formula" role="math">${window.VVFormula.typeset('ΔU_3f = √3 · ρ · l · I_w / A')}</div>`:v==='instrument'&&index===2?`<div class="lv-typeset-formula" role="math">${window.VVFormula.typeset('46 / 60 · 300 V = 230 V')}</div>`:''}${controls(spec,index)}`;
  }
  function one(spec,lessonId,part,tabbed=false) {
    if(!spec?.items?.length)return '';
    const key=lessonId+':'+part, index=Math.min(states.get(key)||0,spec.items.length-1),item=spec.items[index];
    const network=window.VVLearningNetworks?.render(spec,index)||'';
    const drawing=network?network+controls(spec,index):technical(spec,index,key)||(spec.type==='circuit'?circuit(spec,index):spec.type==='graph'?graph(spec,index):spec.type==='spectrum'?spectrum(spec,index):nodes(spec,index,key));
    const depictionTitle={'steam-cycle':'Víz–gőz kör és a generátor hajtása','conductor-dimensions':'Hossz, keresztmetszet és ellenállás','network-topology':'Táplálási utak és fogyasztói pontok','ip-water':'Cseppek, vízsugár és bemerítés'}[spec.variant];
    const showTitle=!tabbed&&(depictionTitle||spec.showTitle===true||(part===1&&!/^(kövesd|figyeld|válaszd|hasonlítsd|különítsd|keresd|előbb)/iu.test(spec.title)));
    return `<section class="lv-workbench" data-lv-key="${esc(key)}" data-lv-part="${part}" aria-label="${esc(spec.title)}">${showTitle?`<div class="lv-heading"><h3>${esc(depictionTitle||spec.title)}</h3></div>`:''}${drawing}${spec.variant==='ohm'?'':`<div class="lv-observation" role="status" aria-live="polite"><span class="lv-observation-dot" style="background:${esc(item.color||colors[index%colors.length])}"></span><div><strong class="lv-observation-label">${esc(item.label)}</strong><p>${formatDetail(item.detail||'')}</p></div></div>`}${['flow','timeline','route','safety'].includes(spec.type)&&spec.items.length>5?`<div class="lv-step-controls"><button type="button" data-lv-prev ${index===0?'disabled':''} aria-label="Előző részlet">←</button><span>${index+1} / ${spec.items.length}</span><button type="button" data-lv-next ${index===spec.items.length-1?'disabled':''} aria-label="Következő részlet">→</button></div>`:''}</section>`;
  }
  function render(lesson){
    const initial=lesson.interaction?.states?.[0]?.channels||[];
    const visible=[lesson.visualSpec,lesson.secondaryVisual].map((spec,part)=>({spec:spec?.variant==='ohm'?{...spec,ohmDefaults:{u:initial.find(item=>item.unit==='V')?.value,r:initial.find(item=>item.unit==='Ω')?.value}}:spec,part})).filter(({spec,part})=>spec?.items?.length&&!lesson.presentationPolicy?.hideVisuals?.includes(part===0?'visualSpec':'secondaryVisual'));
    const staticParts=visible.filter(({spec,part})=>window.VVLearningComparisons?.matches(spec,lesson.id,part));
    const comparisons=staticParts.map(({spec,part})=>window.VVLearningComparisons.render(spec,lesson.id,part)).join('');
    const specs=visible.filter(item=>!staticParts.includes(item));
    if(!specs.length)return comparisons;
    if(specs.length===1)return comparisons+`<div class="lv-visuals">${one(specs[0].spec,lesson.id,specs[0].part)}</div>`;
    const selected=specs.some(({part})=>part===illustrationStates.get(lesson.id))?illustrationStates.get(lesson.id):specs[0].part;
    const id='lv-illustrations-'+(++illustrationSerial);
    const title=spec=>String(spec.title||'Ábra').trim().replace(/[.!?]+$/u,'');
    return `<div class="lv-visuals lv-tabbed" data-lv-illustrations="${esc(lesson.id)}"><div class="lv-illustration-tabs" role="tablist" aria-label="Szemléltető ábrák">${specs.map(({spec,part})=>`<button type="button" id="${id}-tab-${part}" role="tab" aria-selected="${part===selected}" aria-controls="${id}-panel-${part}" tabindex="${part===selected?0:-1}" data-lv-illustration="${part}">${esc(title(spec))}</button>`).join('')}</div>${specs.map(({spec,part})=>`<div id="${id}-panel-${part}" class="lv-illustration-panel" role="tabpanel" aria-labelledby="${id}-tab-${part}" data-lv-illustration-panel="${part}" ${part===selected?'':'hidden'}>${one(spec,lesson.id,part,true)}</div>`).join('')}</div>`;
  }
  function within(root,selector){return [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];}
  const pannable=panel=>[...panel.querySelectorAll('.lv-technical,.lv-circuit,.ln-diagram')];
  function rememberPans(panel){
    pannable(panel).forEach((diagram,i)=>{
      const automatic=Number(diagram.dataset.lvAutoPan||0);
      if(Math.abs(diagram.scrollLeft-automatic)>1||panPositions.has(panel.dataset.lvKey+':'+i))panPositions.set(panel.dataset.lvKey+':'+i,diagram.scrollLeft);
    });
  }
  function restorePans(panel){
    pannable(panel).forEach((diagram,i)=>{
      const left=panPositions.get(panel.dataset.lvKey+':'+i);
      if(left!==undefined)diagram.scrollLeft=left;
    });
  }
  function motionSnapshot(panel){
    return new Map([...panel.querySelectorAll('.lv-changed [data-motion-key],[data-motion-key]:not(.lv-conductor-comparison [data-motion-key])')].map(node=>[node.dataset.motionKey,{...Object.fromEntries(['d','cx','cy','rx','ry','x','y','width','height','transform','fill-opacity','stroke-width'].filter(a=>node.hasAttribute(a)).map(a=>[a,node.getAttribute(a)]))}]));
  }
  function animateDrawing(previous,panel){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
    const number=/-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi,changes=[];
    panel.querySelectorAll('[data-motion-key]').forEach(node=>{
      if(node.closest('.lv-baseline'))return;
      const old=previous.get(node.dataset.motionKey);if(!old)return;
      for(const [name,start] of Object.entries(old)){
        const end=node.getAttribute(name);if(end===null||start===end||start.replace(number,'#')!==end.replace(number,'#'))continue;
        const from=(start.match(number)||[]).map(Number),to=(end.match(number)||[]).map(Number);
        if(from.length!==to.length||!from.length)continue;
        changes.push({node,name,end,from,to});node.setAttribute(name,start);
      }
    });
    if(!changes.length)return;
    const begun=performance.now();let frame=0;
    const finish=()=>{cancelAnimationFrame(frame);changes.forEach(c=>c.node.setAttribute(c.name,c.end));drawingMotion.delete(panel);};
    const tick=now=>{
      if(!panel.isConnected||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
      const t=Math.min(1,(now-begun)/750),p=t*t*(3-2*t);
      changes.forEach(c=>{let i=0;c.node.setAttribute(c.name,c.end.replace(number,()=>{const value=c.from[i]+(c.to[i]-c.from[i])*p;i++;return String(value);}));});
      if(t<1)frame=requestAnimationFrame(tick);else finish();
    };
    drawingMotion.set(panel,{finish});frame=requestAnimationFrame(tick);
  }
  function fitDrawings(panel){
    panel.querySelectorAll('.lv-technical>svg,.lv-circuit>svg,.lv-graph>svg,.ln-diagram>svg').forEach(svg=>{
      if(!svg.getClientRects().length)return;
      const full=(svg.dataset.lvFullBox||svg.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number);
      if(full.length!==4||!full.every(Number.isFinite))return;
      svg.dataset.lvFullBox=full.join(' ');
      try{
        const box=svg.getBBox();if(!box.width||!box.height)return;
        const top=Math.max(full[1],Math.floor(box.y)-16),bottom=Math.min(full[1]+full[3],Math.ceil(box.y+box.height)+16);
        const left=Math.max(full[0],Math.floor(box.x)-16),right=Math.min(full[0]+full[2],Math.ceil(box.x+box.width)+16);
        if(bottom-top>100&&right>left)svg.setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`);
        const diagram=svg.parentElement;
        if(!diagram.classList.contains('lv-ohm-circuit')){
          const sizes=[...svg.querySelectorAll('text')].map(text=>parseFloat(getComputedStyle(text).fontSize)).filter(size=>Number.isFinite(size)&&size>0);
          const minFont=sizes.length?Math.min(...sizes):23;
          // Fit empty margins first. Preserve a 16 px minimum for diagram text,
          // then reveal the selected component instead of leaving it off-screen.
          svg.style.minWidth=`${Math.ceil((right-left)*16/minFont)}px`;
          svg.style.maxHeight=diagram.clientWidth<=650?'none':'';
          revealDrawing(diagram);
        }
      }catch{ /* An undisplayed SVG is fitted when its illustration is selected. */ }
    });
  }
  function revealDrawing(diagram){
    const overflow=diagram.scrollWidth>diagram.clientWidth+8;
    let hint=diagram.nextElementSibling;
    if(!hint?.classList.contains('lv-pan-controls')){
      hint=document.createElement('div');hint.className='lv-pan-controls';
      hint.innerHTML='<button type="button" data-lv-pan="-1" aria-label="Ábra balra">←</button><span>Az ábra oldalra mozgatható.</span><button type="button" data-lv-pan="1" aria-label="Ábra jobbra">→</button>';
      diagram.after(hint);
    }
    hint.hidden=!overflow;
    if(!overflow){diagram.scrollLeft=Math.max(0,(diagram.scrollWidth-diagram.clientWidth)/2);diagram.dataset.lvAutoPan=String(diagram.scrollLeft);return;}
    const svg=diagram.querySelector('svg');
    const semanticTarget=svg?.dataset.lvSemanticFocus==='exposed-case'?svg.querySelector('.ln-case'):null;
    const target=semanticTarget||svg?.querySelector('.lv-part-focus,.lv-process-focus,.ln-focus-ring,.ln-focus-node,.is-focus')||svg?.querySelector('.ln-active')||svg?.querySelector('.lv-load')||svg;
    if(!target)return;
    const area=diagram.getBoundingClientRect(),focus=target.getBoundingClientRect();
    const center=focus.left+focus.width/2-area.left+diagram.scrollLeft;
    diagram.scrollLeft=Math.max(0,Math.min(diagram.scrollWidth-diagram.clientWidth,center-diagram.clientWidth/2));
    diagram.dataset.lvAutoPan=String(diagram.scrollLeft);
  }
  function selectIllustration(group,part,focus=false){
    const tabs=[...group.querySelectorAll('[data-lv-illustration]')],target=tabs.find(tab=>Number(tab.dataset.lvIllustration)===part);
    if(!target)return;
    illustrationStates.set(group.dataset.lvIllustrations,part);
    tabs.forEach(tab=>{const selected=tab===target;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    group.querySelectorAll('[data-lv-illustration-panel]').forEach(pane=>{
      const selected=Number(pane.dataset.lvIllustrationPanel)===part;
      if(!selected)pane.querySelectorAll('[data-lv-key]').forEach(panel=>{rememberPans(panel);wavePlayback.get(panel)?.cancel();drawingMotion.get(panel)?.finish();panel.getAnimations({subtree:true}).forEach(animation=>animation.cancel());});
      pane.hidden=!selected;
      if(selected)pane.querySelectorAll('[data-lv-key]').forEach(panel=>{fitDrawings(panel);restorePans(panel);});
    });
    if(focus)target.focus({preventScroll:true});
  }
  function mount(root,lesson){
    if(!root)return;
    within(root,'[data-lv-illustrations]').forEach(group=>{
      if(illustrationBound.has(group))return;
      illustrationBound.add(group);
      group.addEventListener('click',event=>{const tab=event.target.closest('[data-lv-illustration]');if(tab&&group.contains(tab))selectIllustration(group,Number(tab.dataset.lvIllustration));});
      group.addEventListener('keydown',event=>{
        const tab=event.target.closest('[data-lv-illustration]');if(!tab||!group.contains(tab))return;
        const tabs=[...group.querySelectorAll('[data-lv-illustration]')],index=tabs.indexOf(tab);
        let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
        event.preventDefault();event.stopPropagation();selectIllustration(group,Number(tabs[next].dataset.lvIllustration),true);
      });
    });
    within(root,'[data-lv-key]').forEach(panel=>{
      if(!panel.closest('[hidden]')){fitDrawings(panel);restorePans(panel);}
      if(bound.has(panel))return;
      bound.add(panel);
      panel.addEventListener('input',event=>{const input=event.target.closest('[data-lv-ohm]');if(input)updateOhm(panel,input.dataset.lvOhm,input.value);});
      panel.addEventListener('change',event=>{const input=event.target.closest('[data-lv-ohm]');if(input)updateOhm(panel,input.dataset.lvOhm,input.value,true);});
      panel.addEventListener('click',event=>{
        const pan=event.target.closest('[data-lv-pan]');
        if(pan){const diagram=pan.closest('.lv-pan-controls')?.previousElementSibling;if(diagram)diagram.scrollBy({left:Number(pan.dataset.lvPan)*diagram.clientWidth*.7,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
        if(event.target.closest('[data-lv-ohm-reset]')){updateOhm(panel,'reset');return;}
        const play=event.target.closest('[data-lv-play]');
        if(play&&panel.contains(play)){
          playWave(panel,play);return;
        }
        const button=event.target.closest('[data-lv-index],[data-lv-prev],[data-lv-next]');
        if(!button||!panel.contains(button))return;
        const key=panel.dataset.lvKey,part=Number(panel.dataset.lvPart),spec=part?lesson.secondaryVisual:lesson.visualSpec;
        if(!spec)return;
        let index=states.get(key)||0;
        index=button.hasAttribute('data-lv-index')?Number(button.dataset.lvIndex):index+(button.hasAttribute('data-lv-prev')?-1:1);
        index=Math.max(0,Math.min(spec.items.length-1,index));if(index===(states.get(key)||0))return;states.set(key,index);
        const focusIndex=button.hasAttribute('data-lv-index')?`[data-lv-index="${index}"]`:button.hasAttribute('data-lv-prev')?'[data-lv-prev]':'[data-lv-next]';
        rememberPans(panel);drawingMotion.get(panel)?.finish();const previous=motionSnapshot(panel);
        wavePlayback.get(panel)?.cancel();panel.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
        const wrapper=document.createElement('div');wrapper.innerHTML=one(spec,lesson.id,part,!!panel.closest('[data-lv-illustration-panel]'));const next=wrapper.firstElementChild;panel.replaceWith(next);mount(next.parentElement,lesson);
        const focus=next.querySelector(focusIndex),fallback=next.querySelector(`[data-lv-index="${index}"]`);(focus&&!focus.disabled?focus:fallback)?.focus({preventScroll:true});
        animateDrawing(previous,next);
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
          // A short, finite emphasis follows the chosen physical part only.
          // Reference geometry and text stay still while the learner reads.
          next.querySelectorAll('.lv-changed [data-motion-key],.lv-part-focus path,.lab-vector.is-active,.ln-trace,.lv-current-trace').forEach(node=>{
            if(node instanceof SVGGeometryElement)node.animate([{opacity:1},{opacity:.55},{opacity:1}],{duration:1100,iterations:2,easing:'ease-in-out'});
          });
          next.querySelectorAll('.lab-ray.is-active,.lab-direction.is-active,.lab-vector.is-active').forEach(path=>{const length=path.getTotalLength?.();if(length)path.animate([{strokeDasharray:`${length} ${length}`,strokeDashoffset:length},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0}],{duration:700,easing:'cubic-bezier(.2,.6,.3,1)'});});
          next.querySelector('.lab-light-patch.is-active')?.animate([{opacity:.25},{opacity:1}],{duration:650,easing:'ease-out'});
        }
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches){next.querySelector('.lv-observation')?.animate([{opacity:.65},{opacity:1}],{duration:220,easing:'ease-out'});next.querySelectorAll('.ln-trace,.lv-current-trace').forEach(path=>{const length=path.getTotalLength?.();if(length)path.animate([{strokeDashoffset:60},{strokeDashoffset:0}],{duration:1500,easing:'linear'});});}
      },{once:false});
    });
  }
  let fitResizeFrame=0;
  window.addEventListener?.('resize',()=>{
    cancelAnimationFrame(fitResizeFrame);
    fitResizeFrame=requestAnimationFrame(()=>document.querySelectorAll('.lv-workbench').forEach(panel=>{
      if(panel.getClientRects().length&&!panel.closest('[hidden]')){rememberPans(panel);fitDrawings(panel);restorePans(panel);}
    }));
  });
  window.VVLearningVisuals={render,mount,symbol:glyph,formatDetail};
})();
