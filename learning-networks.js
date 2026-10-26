(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const supported = new Set(['tn-split','earthing-systems','fault-loop','bonding','star-point','source-neutral','neutral-grounding']);
  const text = (x,y,value,cls='',anchor='middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
  const path = (d,cls='',attrs='') => `<path d="${d}" class="${cls}" ${attrs}/>`;
  const node = (x,y,title='',cls='') => `<g class="ln-junction ${cls}">${title?`<title>${esc(title)}</title>`:''}<circle cx="${x}" cy="${y}" r="4.5"/></g>`;
  const earth = (x,y) => path(`M${x} ${y-20}V${y}M${x-18} ${y}h36M${x-12} ${y+8}h24M${x-5} ${y+16}h10`,'ln-earth');
  const protective = (d,kind='pe',active=false) => path(d,`ln-protective ln-${kind} ${active?'ln-active':''}`)+path(d,`ln-protective-stripe ${active?'ln-active':''}`);
  const coil = y => path(`M90 ${y}h25c0-17 20-17 20 0 0-17 20-17 20 0 0-17 20-17 20 0h25`,'ln-winding');
  const caption = (spec,key,x,y,cls='',anchor='middle') => spec.labels?.[key]?text(x,y,spec.labels[key],cls,anchor):'';
  function scheme(spec,index) {
    const item=spec.items?.[index]||{}, fallback=spec.variant==='earthing-systems'?(index?'IT':'TT'):'TN-C-S';
    return {item,type:item.networkType||spec.networkType||fallback,mode:item.currentPath||'none',focus:item.selectedPath||item.target||''};
  }
  function topology(spec,index) {
    if(['star-point','source-neutral','neutral-grounding'].includes(spec.variant)){
      const item=spec.items?.[index]||{},connection=item.groundConnection||(spec.variant==='neutral-grounding'?['direct','impedance','isolated'][index]:item.grounded===true?'direct':'isolated');
      const edges=[{a:'S',b:'W1',kind:'winding'},{a:'S',b:'W2',kind:'winding'},{a:'S',b:'W3',kind:'winding'}];
      if(item.showNeutral!==false&&spec.variant!=='neutral-grounding')edges.push({a:'S',b:'N',kind:'neutral'});
      if(connection==='direct')edges.push({a:'S',b:'SourceEarth',kind:'earth'});
      if(connection==='impedance')edges.push({a:'S',b:'Z',kind:'impedance'},{a:'Z',b:'SourceEarth',kind:'earth'});
      return {type:'star',edges,notes:{sourceWindings:3,groundConnection:connection}};
    }
    if(spec.variant==='bonding')return {type:'bonding',edges:[{a:'MET',b:'Case',kind:'pe'},{a:'MET',b:'MetalPipe',kind:'bonding'},{a:'MET',b:'InstallationEarth',kind:'earth'}],notes:{normalNeutralCurrentPath:false}};
    const {type,mode}=scheme(spec,index);
    const edges=[['S','W1','winding'],['S','W2','winding'],['S','W3','winding'],['W1','L1','phase'],['W2','L2','phase'],['W3','L3','phase'],['L1','R','phase'],['R','Nload','load']];
    if(type==='TN-C')edges.push(['S','PENterminal','pen'],['PENterminal','Case','pen'],['PENterminal','Nload','neutral-jumper'],['S','SourceEarth','earth']);
    else if(type==='TN-C-S')edges.push(['S','Split','pen'],['Split','Nload','neutral'],['Split','Case','pe'],['S','SourceEarth','earth']);
    else if(type==='TN-S')edges.push(['S','Nload','neutral'],['S','Case','pe'],['S','SourceEarth','earth']);
    else if(type==='TT')edges.push(['S','Nload','neutral'],['S','SourceEarth','earth'],['Case','InstallationEarth','pe']);
    else if(type==='IT'||type==='IT-Z') {edges.push(['L2','Nload','phase-return'],['Case','InstallationEarth','pe']);if(type==='IT-Z')edges.push(['S','Z','impedance'],['Z','SourceEarth','earth']);}
    if(mode==='fault')edges.push(['L1','Case','fault']);
    return {type,mode,edges:edges.map(([a,b,kind])=>({a,b,kind})),notes:{singleConsumerBranch:true,sourceWindings:3,penSplit:type==='TN-C-S',peCarriesNormalLoadCurrent:false}};
  }
  function network(spec,index) {
    const {item,type,mode,focus}=scheme(spec,index),fault=mode==='fault';
    let draw='<rect x="710" y="37" width="145" height="233" rx="4" class="ln-case"/><path d="M840 134V190M838 134h4M838 190h4" class="ln-enclosure-detail"/><g class="ln-enclosure-detail"><circle cx="719" cy="46" r="2.5"/><circle cx="846" cy="46" r="2.5"/><circle cx="719" cy="260" r="2.5"/><circle cx="846" cy="260" r="2.5"/></g>';
    draw+=path('M90 70V220','ln-source-bus')+coil(70)+coil(120)+coil(170);
    draw+=path('M200 70H765V105','ln-phase ln-l1')+path('M200 120H400','ln-phase ln-l2')+path('M200 170H400','ln-phase ln-l3');
    draw+='<rect x="751" y="105" width="28" height="65" class="ln-load"/>'+path('M765 170V220',type==='IT'||type==='IT-Z'?'ln-phase ln-l2':'ln-n');
    draw+=text(245,54,'L1','ln-label-phase')+text(245,105,'L2','ln-label-phase')+text(245,155,'L3','ln-label-phase');
    draw+=node(90,70)+node(90,120)+node(90,170)+node(90,220,spec.labels?.starPoint||'');
    draw+=node(765,220)+caption(spec,'source',100,27)+caption(spec,'consumer',782,25)+caption(spec,'unusedPhases',404,174,'ln-small','start');
    const blueEnd=(x,y,dx)=>path(`M${x} ${y}h${dx}`,'ln-n ln-pen-end');
    if(type==='TN-C'){
      draw+=protective('M90 220H650V290H815V270','pen',focus==='pen')+blueEnd(90,220,20)+path('M815 290V270','ln-n ln-pen-end');
      draw+=path('M815 270V220H765','ln-n')+node(815,270)+text(420,205,'PEN','ln-label-pen');
      draw+=path('M90 220V305','ln-earth')+earth(90,325);
    }else if(type==='TN-C-S'){
      draw+=protective('M90 220H450','pen',focus==='pen')+blueEnd(90,220,20)+blueEnd(430,220,20);
      draw+=path('M450 220H765',`ln-n ${focus==='neutral'?'ln-active':''}`)+protective('M450 220V290H815V270','pe',focus==='pe');
      draw+=node(450,220,spec.labels?.split||'',focus==='split'?'ln-focus-node':'')+node(815,270);
      draw+=text(310,205,'PEN','ln-label-pen')+text(595,205,'N','ln-label-n')+text(595,280,'PE','ln-label-pe');
      draw+=caption(spec,'split',450,333,'ln-small');
      draw+=path('M90 220V305','ln-earth')+earth(90,325);
    }else if(type==='TN-S'){
      draw+=path('M90 220H765',`ln-n ${focus==='neutral'?'ln-active':''}`)+protective('M90 220V290H815V270','pe',focus==='pe');
      draw+=text(480,205,'N','ln-label-n')+text(480,280,'PE','ln-label-pe')+node(815,270)+path('M90 290V305','ln-earth')+earth(90,325);
    }else{
      if(type==='TT')draw+=path('M90 220H765',`ln-n ${focus==='neutral'?'ln-active':''}`)+text(480,205,'N','ln-label-n');
      else draw+=path('M400 120H600V220H765','ln-phase ln-l2')+text(675,205,'L2','ln-label-phase');
      draw+=protective('M815 270V290H650V305','pe',focus==='pe')+text(700,280,'PE','ln-label-pe')+earth(650,325)+node(815,270);
      if(type==='TT')draw+=path('M90 220V305','ln-earth')+earth(90,325);
      if(type==='IT-Z')draw+=path('M90 220V248M90 284V305','ln-earth')+'<rect x="78" y="248" width="24" height="36" class="ln-impedance"/>'+text(122,274,'Z')+earth(90,325);
    }
    if(focus==='star-point')draw+='<circle cx="90" cy="220" r="12" class="ln-focus-ring"/>';
    if(fault){
      draw+=path('M765 91H855','ln-fault-link')+node(855,91,spec.labels?.fault||'');
      // The fault overlay begins at the phase terminal after its winding; a separate return reaches the source star point.
      let trace='M200 70H765V91H855V270H815';
      if(type==='TN-C-S')trace+='V290H450V220H90';
      else if(type==='TN-S')trace+='V290H90V220';
      else if(type==='TN-C')trace+='V290H650V220H90';
      else trace+='V290H650V305';
      draw+=path(trace,'ln-fault-trace ln-trace');
      if(type==='TT')draw+=path('M650 348H90V325','ln-soil-path')+caption(spec,'earthPath',370,341,'ln-small');
      draw+=caption(spec,'fault',815,320,'ln-small','end');
    }else if(mode==='normal'){
      let trace='M200 70H765V105';
      draw+=path(trace,'ln-current-trace ln-trace')+path('M765 170V220','ln-current-trace ln-trace');
      const ret=type==='TN-C'?'M765 220H815V270V290H650V220H90':type==='IT'||type==='IT-Z'?'M765 220H600V120H200':'M765 220H90';
      draw+=path(ret,'ln-current-trace ln-trace');
    }
    if(spec.labels?.detail)draw+=caption(spec,'detail',458,377,'ln-caption');
    return `<div class="ln-diagram" tabindex="0" role="region" aria-label="${esc(spec.title)}" data-ln-type="${esc(type)}" data-ln-mode="${esc(mode)}"><svg viewBox="0 0 920 390" role="img" aria-label="${esc(spec.title)}"><g>${draw}</g></svg></div>`;
  }
  function star(spec,index){
    const item=spec.items[index]||{},connection=item.groundConnection||(spec.variant==='neutral-grounding'?['direct','impedance','isolated'][index]:item.grounded===true?'direct':'isolated'),grounded=connection==='direct',focus=item.selectedPath||'star-point',showNeutral=item.showNeutral!==false&&spec.variant!=='neutral-grounding';
    let d=path('M390 190V40M390 190 220 300M390 190 560 300','ln-winding');
    const winding=(x,y,a)=>`<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-32" y="-15" width="64" height="30" class="ln-winding-mask"/>${path('M-32 0h5c0-12 18-12 18 0 0-12 18-12 18 0 0-12 18-12 18 0h5','ln-winding')}</g>`;
    d+=winding(390,108,90)+winding(301,248,147)+winding(479,248,33);
    if(showNeutral)d+=path('M390 190H760',`ln-n ${focus==='neutral'?'ln-active':''}`)+text(785,198,'N','ln-label-n');
    if(grounded||connection==='impedance'){
      if(!showNeutral)d+=path('M390 190H650','ln-earth');
      d+=node(650,190);
      if(grounded)d+=path('M650 190V285','ln-earth')+earth(650,305);
      else d+=path('M650 190V224M650 272V285','ln-earth')+'<rect x="638" y="224" width="24" height="48" class="ln-impedance"/>'+text(683,255,'Z')+earth(650,305);
    }
    d+=text(390,27,'L1')+text(191,324,'L2')+text(590,324,'L3')+node(390,190,spec.labels?.starPoint||'');
    if(focus==='star-point')d+='<circle cx="390" cy="190" r="16" class="ln-focus-ring"/>';
    d+=caption(spec,'detail',460,368,'ln-caption');
    return `<div class="ln-diagram ln-star-diagram" tabindex="0" role="region" aria-label="${esc(spec.title)}"><svg viewBox="0 0 920 390" role="img" aria-label="${esc(spec.title)}"><g>${d}</g></svg></div>`;
  }
  function bonding(spec,index){
    const item=spec.items[index]||{},selected=item.selectedPath||['pe','extraneous','bond'][index];
    let d='<rect x="346" y="224" width="220" height="16" rx="3" class="ln-earth-bar"/>';
    d+=text(456,207,'MET')+caption(spec,'bar',426,282,'ln-small','end');
    d+='<rect x="85" y="70" width="160" height="110" rx="4" class="ln-case"/><path d="M125 98h80v55h-80z" class="ln-load"/>';
    d+='<path d="M690 65h45v110h-45zM678 90h70M678 150h70" class="ln-metal-pipe"/>';
    d+=protective('M165 180V232H346','pe',selected==='pe')+protective('M713 175V232H566','pe',selected==='extraneous'||selected==='bond');
    d+=node(165,180)+node(713,175)+node(346,232)+node(566,232)+path('M456 240V323','ln-earth')+earth(456,343);
    d+=caption(spec,'case',165,45)+caption(spec,'pipe',712,45)+text(251,216,'PE','ln-label-pe');
    return `<div class="ln-diagram ln-bonding-diagram" tabindex="0" role="region" aria-label="${esc(spec.title)}"><svg viewBox="0 0 920 390" role="img" aria-label="${esc(spec.title)}"><g>${d}</g></svg></div>`;
  }
  function render(spec,index){
    if(!supported.has(spec?.variant)||!spec.items?.length)return '';
    if(spec.variant==='star-point'||spec.variant==='source-neutral'||spec.variant==='neutral-grounding')return star(spec,index);
    if(spec.variant==='bonding')return bonding(spec,index);
    const requested=scheme(spec,index);
    // IT first-fault current needs the distributed capacitances/insulation monitor, which this simplified model does not calculate.
    if((requested.type==='IT'||requested.type==='IT-Z')&&requested.mode==='fault')return '';
    return network(spec,index);
  }
  window.VVLearningNetworks={render,topology};
})();
