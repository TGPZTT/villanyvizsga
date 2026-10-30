(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PHASES=['A','B','C'], LOWER=['a','b','c'];
  const normal=n=>((n%360)+360)%360;
  const point=(deg,r=1,cx=0,cy=0)=>({x:cx+r*Math.sin(deg*Math.PI/180),y:cy-r*Math.cos(deg*Math.PI/180)});
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}), sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}), scale=(a,k)=>({x:a.x*k,y:a.y*k});
  const angleOf=v=>normal(Math.atan2(v.x,-v.y)*180/Math.PI), length=v=>Math.hypot(v.x,v.y);
  const rotate=(v,ccw)=>{const t=ccw*Math.PI/180;return {x:v.x*Math.cos(t)+v.y*Math.sin(t),y:-v.x*Math.sin(t)+v.y*Math.cos(t)};};
  const groups={
    Yy0:{hv:'Y',lv:'Y',reverse:false,neutral:false,hour:0},
    Yy6:{hv:'Y',lv:'Y',reverse:true,neutral:false,hour:6},
    Dd0:{hv:'Df',lv:'Df',reverse:false,neutral:false,hour:0},
    Dy1:{hv:'Dr',lv:'Y',reverse:false,neutral:false,hour:1},
    Dy11:{hv:'Df',lv:'Y',reverse:false,neutral:false,hour:11},
    Yd11:{hv:'Y',lv:'Dr',reverse:false,neutral:false,hour:11},
    Dyn11:{hv:'Df',lv:'Y',reverse:false,neutral:true,hour:11},
    Yzn5:{hv:'Y',lv:'Z',reverse:false,neutral:true,hour:5}
  };
  const hours={0:'Yy0',1:'Dy1',5:'Yzn5',6:'Yy6',11:'Dyn11'};


  // A wire identifies equal-potential nodes. Each coil constrains
  // V(dot)-V(undotted)=emf. No clock number participates in this solver.
  function conventionalNet(kind,letters,reverse=false) {
    const p=[...letters], wires=[], center=letters==='ABC'?'O':'o';
    const common=reverse?'1':'2', lineEnd=reverse?'2':'1';
    p.forEach((a,i)=>{
      wires.push([a+lineEnd,a]);
      wires.push([a+common,kind==='Y'?center:p[(i+(kind==='Dr'?2:1))%3]+lineEnd]);
    });
    return wires;
  }
  function solveNet(coils,wires,reference) {
    const parents=new Map(), find=a=>{if(!parents.has(a))parents.set(a,a);if(parents.get(a)!==a)parents.set(a,find(parents.get(a)));return parents.get(a);};
    wires.forEach(([a,b])=>parents.set(find(a),find(b)));
    const graph=new Map();
    const edge=(a,b,v)=>{if(!graph.has(a))graph.set(a,[]);graph.get(a).push([b,v]);};
    coils.forEach(c=>{const a=find(c.dot),b=find(c.undotted);edge(a,b,scale(c.emf,-1));edge(b,a,c.emf);});
    const root=find(reference), potentials=new Map([[root,{x:0,y:0}]]), queue=[root];let residual=0;
    while(queue.length){const a=queue.shift();for(const [b,diff] of graph.get(a)||[]){const value=add(potentials.get(a),diff);if(potentials.has(b)){residual=Math.max(residual,length(sub(value,potentials.get(b))));}else{potentials.set(b,value);queue.push(b);}}}
    if(residual>1e-8||potentials.size!==graph.size)throw Error('Inconsistent transformer netlist');
    return {potential:node=>potentials.get(find(node)),residual};
  }
  function netlist(groupName='Yy6',rotation=0) {
    const name=groups[groupName]?groupName:'Yy6', spec=groups[name];
    const hvPhase=PHASES.map((_,i)=>point(30+120*i-rotation));
    const hvLine=hvPhase.map((p,i)=>sub(p,hvPhase[(i+1)%3]));
    const hvCoil=spec.hv==='Y'?hvPhase:hvPhase.map((p,i)=>sub(p,hvPhase[(i+(spec.hv==='Dr'?2:1))%3]));
    const makeCoil=(id,core,emf,turns=1)=>({id,core,dot:id+'1',undotted:id+'2',emf,relativeTurns:turns});
    const hvCoils=PHASES.map((p,i)=>makeCoil(p,p,hvCoil[i]));
    const hvWires=conventionalNet(spec.hv,'ABC'), lvCoils=[],lvWires=[];
    if(spec.lv==='Z')PHASES.forEach((p,i)=>{
      ['α','β'].forEach(half=>lvCoils.push(makeCoil(p+half,p,scale(hvCoil[i],.5),.5)));
      lvWires.push([p+'α2',LOWER[i]],[p+'α1',PHASES[(i+1)%3]+'β1'],[p+'β2','n']);
    });
    else {
      LOWER.forEach((p,i)=>lvCoils.push(makeCoil(p,PHASES[i],hvCoil[i])));
      lvWires.push(...conventionalNet(spec.lv,'abc',spec.reverse));if(spec.neutral)lvWires.push(['o','n']);
    }
    const hvSolution=solveNet(hvCoils,hvWires,spec.hv==='Y'?'O':'A');
    const lvSolution=solveNet(lvCoils,lvWires,spec.neutral?'n':spec.lv==='Y'?'o':'a');
    const lvTerm=LOWER.map(p=>lvSolution.potential(p)), mean=scale(lvTerm.reduce(add,{x:0,y:0}),1/3);
    const lvPhase=lvTerm.map(v=>sub(v,mean)),lvLine=lvTerm.map((v,i)=>sub(v,lvTerm[(i+1)%3]));
    const displacement=normal(angleOf(lvLine[0])-angleOf(hvLine[0]));
    const clock=Math.round(displacement/30)%12;
    return {group:name,spec,rotation,hvPhase,hvLine,hvCoil,lvPhase,lvLine,clock,hour:clock,hvCoils,lvCoils,hvWires,lvWires,maxResidual:Math.max(hvSolution.residual,lvSolution.residual)};
  }
  const model=netlist;
  const t=(s,key,values={})=>String(s.copy?.[key]??'').replace(/\{(\w+)\}/g,(_,k)=>esc(values[k]??''));
  const title=s=>s.copy?.titles?.[s.step]||'Transzformátorok';
  const shortTitles=['Alapok','Y · csillag','D · delta','Z · zegzug','400 / 230 V','Nyíl és hullám','Rajz → vektor','Órajel','Teljes jel'];
  const stateByKey=new Map(),mounted=new WeakSet(),playing=new WeakMap();let serial=0;
  const defaults=()=>({step:0,flux:false,y:false,d:false,z:0,measure:false,phase:0,merged:false,pair:0,hour:11,group:'Dyn11',part:'hv',answers:{}});
  const label=(x,y,s,cls='',anchor='middle')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s).replace(/U_([A-Za-z][A-Za-z0-9]*)/g,'U<tspan baseline-shift="sub" font-size="75%">$1</tspan>')}</text>`;
  const dot=(x,y,cls='')=>`<circle cx="${x}" cy="${y}" r="3.5" class="tf-terminal ${cls}"/>`;
  const wire=(d,from='',to='',cls='')=>`<path d="${d}" class="tf-wire ${cls}" ${from?`data-tf-wire data-from="${from}" data-to="${to}"`:''}/>`;
  const svg=(body,w,h,aria,cls='')=>`<svg class="tf-drawing ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${body}</svg>`;
  function coil(x,y,size=40,attrs='',cls='') {
    const r=size/8;return `<path d="M${x} ${y} ${Array.from({length:4},()=>`a${r} ${r} 0 0 1 0 ${size/4}`).join(' ')}" class="tf-coil ${cls}" ${attrs}/>`;
  }
  function segmentCoil(a,b,cls='') {
    const len=length(sub(b,a)),deg=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90;
    return `<g transform="translate(${a.x} ${a.y}) rotate(${deg})">${wire(`M0 0V${len*.3}M0 ${len*.7}V${len}`)}${coil(0,len*.3,len*.4,'',cls)}</g>`;
  }
  const btn=(text,action,value='',pressed=null,cls='')=>`<button type="button" data-tf-action="${action}" data-value="${value}" ${pressed===null?'':`aria-pressed="${pressed}"`} class="${cls}">${text}</button>`;
  const formula=source=>`<span class="tf-formula" role="math" aria-label="${esc(source)}">${window.VVFormula?window.VVFormula.typeset(source):esc(source)}</span>`;
  const note=text=>`<p class="tf-note">${text}</p>`;
  function simpleTransformer(s) {
    const active=s.flux?'tf-emphasized':'';
    let body=`<path d="M142 65H298V245H142ZM160 84H280V226H160Z" class="tf-iron ${active}"/>`;
    body+=`<g>${wire('M65 90H134M65 210H134')}${coil(134,90,120)}${label(66,68,'Váltakozó feszültség','tf-small')}${label(110,262,'Egyik tekercs','tf-caption')}</g>`;
    body+=`<g>${wire('M298 110H373M298 190H373')}${coil(298,110,80)}${label(372,85,'Más feszültségszint','tf-small')}${label(327,262,'Másik tekercs','tf-caption')}</g>`;
    if(s.flux)body+=`<path d="M151 75H288V235H151Z" class="tf-flux"/>${label(220,155,'Változó mágneses','tf-small')}${label(220,176,'tér a vasmagban','tf-small')}`;
    else body+=label(220,160,'Vasmag','tf-caption');
    return svg(body,440,290,'Két különálló tekercs közös zárt vasmagon. A két oldal közt nincs vezetői összeköttetés.','tf-basics')+`<div class="tf-mobile-transformer-labels"><span>Egyik tekercs</span><span>Vasmag</span><span>Másik tekercs</span></div>`;
  }
  function shape(kind,connected=true,lower=false,measure=null) {
    const letters=lower?LOWER:PHASES,cx=185,cy=150;
    let body='';
    const outer=[{x:185,y:35},{x:65,y:240},{x:305,y:240}];
    if(!connected){
      [80,185,290].forEach((x,i)=>{body+=wire(`M${x} 65V95M${x} 155V190`)+coil(x,95,60)+dot(x,65)+dot(x,190)+label(x,49,letters[i],'tf-terminal-name')+label(x+14,87,letters[i]+'1','tf-small','start')+label(x+14,185,letters[i]+'2','tf-small','start');});
    }else if(kind==='Y'){
      outer.forEach((p,i)=>{body+=segmentCoil(p,{x:cx,y:cy})+dot(p.x,p.y)+label(p.x+(i===1?-14:i===2?14:0),p.y+(i===0?-13:23),letters[i],'tf-terminal-name');});
      body+=dot(cx,cy,'tf-junction')+label(cx+15,cy+18,lower?'o':'O','tf-terminal-name','start')+label(cx,285,'Közös csillagpont','tf-caption');
    }else{
      outer.forEach((p,i)=>{body+=segmentCoil(p,outer[(i+1)%3])+dot(p.x,p.y)+label(p.x+(i===1?-14:i===2?14:0),p.y+(i===0?-13:23),letters[i],'tf-terminal-name');});
      body+=label(cx,285,'Zárt hurok, közös pont nélkül','tf-caption');
    }
    if(measure!==null){
      const a=outer[0],b=measure&&kind==='Y'?{x:cx,y:cy}:outer[1];
      body+=`<path d="M${a.x} ${a.y}H25V${b.y}H${b.x}" class="tf-measure"/>${dot(a.x,a.y,'tf-probe')}${dot(b.x,b.y,'tf-probe')}<rect x="1" y="117" width="102" height="42" rx="5" class="tf-meter"/>${label(52,145,measure&&kind==='Y'?'≈230 V':'400 V','tf-meter-text')}`;
      if(measure&&kind==='D')body+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="tf-selected-branch"/>`;
    }
    return svg(body,370,305,`${kind==='Y'?'Csillag':'Delta'}kapcsolás. ${connected?'Összekötve.':'Három különálló tekercs.'}${measure===null?'':measure?'A mérő a tekercs két vége között van.':'A mérő két fázisvezető között van.'}`);
  }
  function zigzag(s,compact=false) {
    const selected=Number(s.z), xs=[65,205,345];let b='';
    xs.forEach((x,i)=>{
      b+=`<path d="M${x+15} 43V262" class="tf-limb"/>`+label(x,28,PHASES[i]+' oszlop','tf-caption');
      ['α','β'].forEach((h,j)=>{
        const id=PHASES[i]+h,y=j?200:70,active=j?(i===(selected+1)%3):i===selected;
        b+=`<g class="${active?'tf-z-active':'tf-z-inactive'}" data-tf-coil="${id}" data-core="${PHASES[i]}" data-dot-end="${id}1" data-undotted-end="${id}2">${coil(x,y,50)}${dot(x,y)}${dot(x,y+50)}<circle cx="${x-9}" cy="${y+4}" r="3" class="tf-polarity"/>${label(x+14,y-10,id+'1','tf-end','start')}${label(x+14,y+50,id+'2','tf-end','start')}</g>`;
      });
      const a=PHASES[i]+'α',next=PHASES[(i+1)%3]+'β',route=i===2?`M345 70V35H17V174H65V200`:`M${x} 70H${x+57}V174H${xs[(i+1)%3]}V200`;
      b+=wire(route,a+'1',next+'1',i===selected?'tf-path-focus':'tf-path-muted');
      b+=wire(`M${x} 120V146`,a+'2',LOWER[i],i===selected?'tf-path-focus':'tf-path-muted')+dot(x,146)+label(x,165,LOWER[i],'tf-terminal-name');
      b+=wire(`M${x} 250V286H409`,PHASES[i]+'β2','n',i===(selected+1)%3?'tf-path-focus':'tf-path-muted');
    });
    if(compact)b+=wire('M345 286H409','n-common','n','tf-neutral-lead');
    b+=dot(65,286,'tf-junction')+dot(205,286,'tf-junction')+dot(345,286,'tf-junction')+dot(409,286,compact?'tf-neutral-point':'')+label(410,310,'n','tf-terminal-name'+(compact?' tf-neutral-label':''));
    return svg(b,438,324,'Zegzugkapcsolás: három oszlopon összesen hat féltekercs, tizenkét vég. Kiemelt út: '+LOWER[selected]+' és n között, két külön oszlopon.',compact?'tf-z-compact':'');
  }
  function arrow(cx,cy,v,r,side='hv',cls='') {
    const u=scale(v,1/length(v)),end=add({x:cx,y:cy},scale(u,r)),base=sub(end,scale(u,8)),p={x:-u.y*4,y:u.x*4};
    return `<g class="tf-vector tf-${side} ${cls}" data-side="${side}"><path data-tf-arrow-shaft data-side="${side}" d="M${cx} ${cy}L${end.x} ${end.y}"/><path d="M${base.x+p.x} ${base.y+p.y}L${end.x} ${end.y}L${base.x-p.x} ${base.y-p.y}"/></g>`;
  }
  function clock(group,pair=0,rotation=0,labels=true,phasePair=false) {
    const m=model(group,rotation),cx=145,cy=145;let b=`<circle cx="145" cy="145" r="111" class="tf-clock-rim"/>`;
    for(let i=0;i<12;i++){const a=point(i*30,104,cx,cy),e=point(i*30,110,cx,cy),t=point(i*30,128,cx,cy);b+=wire(`M${a.x} ${a.y}L${e.x} ${e.y}`);b+=label(t.x,t.y+5,i||12,'tf-hour');}
    const upper=phasePair?m.hvPhase:m.hvLine,lower=phasePair?m.lvPhase:m.lvLine;
    const align=angleOf(upper[pair]),h=rotate(upper[pair],align),l=rotate(lower[pair],align);
    b+='<g class="tf-clock-pair">';b+=arrow(cx,cy,h,88,'hv')+arrow(cx,cy,l,76,'lv')+dot(cx,cy,'tf-junction');
    if(labels){b+=label(159,69,'U_'+PHASES[pair]+(phasePair?'':PHASES[(pair+1)%3]),'tf-vector-label','start');const p=add({x:cx,y:cy},scale(l,86/length(l))),same=m.clock===0;b+=label(same?130:p.x+(p.x<cx?-8:10),same?84:p.y+5,'U_'+LOWER[pair]+(phasePair?'':LOWER[(pair+1)%3]),'tf-vector-label',same||p.x<cx?'end':'start');}
    b+='</g>';return svg(b,290,290,`${group}. A nagyobb oldal ${phasePair?'fázis':'vonali'}feszültsége 12-n; a kisebb oldal megfelelő feszültsége ${m.clock} óránál. Normalizált nyílhosszak.`,'tf-clock');
  }
  function waveform(s) {
    const phase=normal(s.phase),theta=phase*Math.PI/180,cx=103,cy=135,r=65;
    const v={x:Math.cos(theta),y:-Math.sin(theta)}, tip=add({x:cx,y:cy},scale(v,r)),wx=234+phase/360*300,wy=cy-r*Math.sin(theta);
    let curve='';for(let i=0;i<=360;i+=3)curve+=(i?'L':'M')+(234+i/360*300)+' '+(cy-r*Math.sin(i*Math.PI/180));
    const b=`<circle cx="103" cy="135" r="65" class="tf-clock-rim"/>${wire('M25 135H183M103 55V215M225 135H548M234 50V220')}<path d="${curve}" class="tf-wave"/>${arrow(cx,cy,v,r,'hv')}<path d="M${tip.x} ${tip.y}H${wx}" class="tf-projection"/>${dot(wx,wy,'tf-wave-point')}${label(cx,246,'Feszültségnyíl','tf-caption')}${label(390,246,'Ugyanaz a feszültség időben','tf-caption')}${label(234,158,'0','tf-small')}${label(384,158,'fél periódus','tf-small')}${label(534,158,'1 periódus','tf-small')}${label(18,64,'+','tf-small')}${label(18,217,'−','tf-small')}`;
    const mobileCy=94,mobileTip={x:150+r*Math.cos(theta),y:mobileCy-r*Math.sin(theta)};
    const mobileArrow=`<circle cx="150" cy="94" r="65" class="tf-clock-rim"/>${wire('M65 94H237M150 15V174M260 25V163')}${arrow(150,mobileCy,v,r,'hv')}<path d="M${mobileTip.x} ${mobileTip.y}H260" class="tf-projection"/>${dot(260,mobileTip.y,'tf-wave-point')}${label(150,198,'Feszültségnyíl','tf-caption')}`;
    let mobileCurve='';for(let i=0;i<=360;i+=3)mobileCurve+=(i?'L':'M')+(25+i/360*260)+' '+(90-55*Math.sin(i*Math.PI/180));
    const mobileWave=`${wire('M17 90H292M25 18V160')}<path d="${mobileCurve}" class="tf-wave"/>${dot(25+phase/360*260,90-55*Math.sin(theta),'tf-wave-point')}${label(25,119,'0','tf-small')}${label(155,119,'½','tf-small')}${label(285,119,'1','tf-small')}${label(155,177,'Feszültség időben','tf-caption')}`;
    return `<div class="tf-wave-desktop">${svg(b,570,275,'A feszültség a CCW forgó nyíl függőleges vetülete, u=sin(theta). Jelenlegi fázis '+Math.round(phase)+' fok.','tf-waveform')}</div><div class="tf-wave-mobile">${svg(mobileArrow,310,210,'Feszültségnyíl és függőleges vetülete. '+Math.round(phase)+' fok.')}${svg(mobileWave,310,190,'Ugyanazon időpillanat a szinuszos feszültségen. '+Math.round(phase)+' fok.')}</div>`;
  }
  function pairedMeasurement(s) {
    const group=s.bridgeGroup||'Dyn11';
    if(s.merged)return `<div class="tf-pair-clock">${clock(group,s.pair)}<div class="tf-key"><span class="tf-key-hv">Nagyobb oldal: U_${PHASES[s.pair]+PHASES[(s.pair+1)%3]}</span><span class="tf-key-lv">Kisebb oldal: U_${LOWER[s.pair]+LOWER[(s.pair+1)%3]}</span><small>${t(s,'normalizedNote')}</small></div></div>`;
    const m=bridgeModel(group),i=s.pair,upper=PHASES[i]+PHASES[(i+1)%3],lower=LOWER[i]+LOWER[(i+1)%3];
    const mini=(y,letters,side,v)=>`${label(20,y+23,side==='hv'?'Nagyobb oldal':'Kisebb oldal','tf-caption','start')}${wire(`M38 ${y+56}H137M38 ${y+118}H137`)}${dot(38,y+56)}${dot(38,y+118)}${label(19,y+62,letters[0],'tf-terminal-name')}${label(19,y+124,letters[1],'tf-terminal-name')}<path d="M85 ${y+56}V${y+118}" class="tf-measure"/><circle cx="85" cy="${y+87}" r="17" class="tf-meter"/>${label(85,y+93,'V','tf-meter-text')}${label(143,y+92,'U_'+letters,'tf-vector-label','start')}${arrow(250,y+87,v,48,side)}`;
    return svg(mini(0,upper,'hv',m.hvLine[i])+mini(165,lower,'lv',m.lvLine[i]),320,325,'Azonos sorrendű vonali feszültségpár mérőpontjai. A megfelelő feszültségnyilak külön kezdőpontban.','tf-measure-pairs');
  }
  function conventionalDrawing(m,side) {
    const hv=side==='hv',spec=m.spec,kind=hv?spec.hv:spec.lv,letters=hv?PHASES:LOWER,reverse=!hv&&spec.reverse,neutral=!hv&&spec.neutral;
    if(kind==='Z')return zigzag({z:0},true);
    const xs=[65,180,295],ends={};let b='';
    letters.forEach((p,i)=>{
      const x=xs[i];ends[p+'1']={x,y:65};ends[p+'2']={x,y:153};
      b+=`<g data-tf-coil="${p}" data-core="${PHASES[i]}" data-dot-end="${p}1" data-undotted-end="${p}2">${wire(`M${x} 65V85M${x} 133V153`)}${coil(x,85,48)}${dot(x,65)}${dot(x,153)}<circle cx="${x-9}" cy="87" r="3" class="tf-polarity"/>${label(x+13,78,p+'1','tf-end','start')}${label(x+13,151,p+'2','tf-end','start')}</g>`;
      const y=reverse?153:65,extY=reverse?182:34;ends[p]={x,y:extY};
      b+=wire(`M${x} ${y}V${extY}`,p+(reverse?'2':'1'),p)+dot(x,extY)+label(x,reverse?205:25,p,'tf-terminal-name');
    });
    const wires=hv?m.hvWires:m.lvWires;
    if(kind==='Y'){
      const commonY=reverse?45:179,end=reverse?'1':'2',center=hv?'O':'o';
      ends[center]={x:180,y:commonY};
      letters.forEach((p,i)=>{b+=wire(`M${xs[i]} ${ends[p+end].y}V${commonY}H180`,p+end,center);});
      b+=dot(65,commonY,'tf-junction')+dot(180,commonY,'tf-junction')+dot(295,commonY,'tf-junction')+label(314,commonY+5,center,'tf-terminal-name','start');
      if(neutral)b+=wire(`M180 ${commonY}V216H337`,'o','n','tf-neutral-lead')+dot(337,216,'tf-neutral-point')+label(337,238,'n','tf-terminal-name tf-neutral-label');
    }else {
      wires.filter(([from,to])=>/\d$/.test(from)&&/\d$/.test(to)).forEach(([from,to],i)=>{
        const a=ends[from],z=ends[to];let d;
        if(Math.abs(a.x-z.x)>150)d=`M${a.x} ${a.y}V190H${a.x<z.x?333:23}V${z.y}H${z.x}`;
        else d=`M${a.x} ${a.y}H${a.x+16}L${z.x-16} ${z.y}H${z.x}`;
        b+=wire(d,from,to);
      });
    }
    b+=label(180,264,kind==='Y'?(reverse?'Fordított tekercsvégek a vonalon':'Három tekercsvég közös pontban'):'Három tekercs zárt hurokban','tf-small');
    return svg(b,365,280,(hv?'Nagyobb':'Kisebb')+' feszültségű oldal. '+kind+' netlista, minden tekercs 1-es vége pontozott.','tf-netlist');
  }
  function bridgeModel(group){return model(group,angleOf(model(group).hvCoil[0]));}
  function bridgePhase(m,side){
    const hv=side==='hv',phase=hv?m.hvPhase:m.lvPhase,letters=hv?PHASES:LOWER,c={x:150,y:140},r=70/length(phase[0]),tips=phase.map(v=>add(c,scale(v,r)));
    let b='';
    if(hv&&m.spec.hv!=='Y')tips.forEach((p,i)=>{const end=tips[(i+1)%3];b+=wire(`M${p.x} ${p.y}L${end.x} ${end.y}`);});
    phase.forEach((v,i)=>{b+=arrow(c.x,c.y,v,70,side,'tf-bridge-phase');const p=add(c,scale(v,94/length(v)));b+=label(p.x,p.y+5,letters[i],'tf-terminal-name');});
    const start=tips[1],end=tips[0],d=sub(end,start);b+=arrow(start.x,start.y,d,length(d),side,'tf-bridge-line');
    const mid=scale(add(start,end),.5);b+=label(mid.x+14,mid.y+5,'U_'+letters[0]+letters[1],'tf-vector-label','start');
    b+=dot(c.x,c.y)+label(c.x-10,c.y+24,hv&&m.spec.hv!=='Y'?'segédpont':hv?'O':'o','tf-small','end');
    return svg(b,300,265,(hv?'Primer':'Szekunder')+' kapocspontok és az első két kapocs közötti vonali feszültség.','tf-bridge-phasors');
  }
  function bridgeCoil(side){
    const cap=side==='hv'?'A':'a';let b=wire('M65 55V80M65 128V160')+coil(65,80,48)+dot(65,55)+dot(65,160)+label(65,37,cap+'1','tf-terminal-name')+label(65,187,cap+'2','tf-terminal-name')+`<circle cx="55" cy="83" r="3" class="tf-polarity"/>`;
    b+=arrow(108,160,{x:0,y:-1},100,side)+`<g class="tf-bridge-float">${arrow(228,160,{x:0,y:-1},100,side)}</g>`+label(228,192,'U_'+cap+'1'+cap+'2','tf-vector-label');
    return svg(b,300,220,'Az 1-es és 2-es tekercsvég közötti feszültség nyila megjelenik fázorként.','tf-bridge-coil');
  }
  function windingToClock(s){
    const group=s.bridgeGroup||'Dy11',m=bridgeModel(group),stage=s.bridgeStage||0;
    const captions=s.copy?.bridgeCaptions||[];
    let body='',explanation='';
    if(stage===0){
      const highlight=side=>conventionalDrawing(m,side).replace('</svg>','<rect x="47" y="53" width="65" height="108" rx="6" class="tf-bridge-highlight"/></svg>');
      body=`<div class="tf-bridge-grid"><figure><figcaption>Primer: A1–A2</figcaption>${highlight('hv')}</figure><figure><figcaption>Szekunder: a1–a2</figcaption>${highlight('lv')}</figure></div>`;
      explanation=t(s,'bridgePairNote');
    }else if(stage===1){
      body=`<div class="tf-bridge-grid"><figure><figcaption>Primer tekercsfeszültség</figcaption>${bridgeCoil('hv')}</figure><figure><figcaption>Szekunder tekercsfeszültség</figcaption>${bridgeCoil('lv')}</figure></div>`;
      explanation=t(s,'bridgeCoilNote');
    }else if(stage===2){
      body=`<div class="tf-bridge-grid"><figure><figcaption>U_AB: B-től A-ig</figcaption>${bridgePhase(m,'hv')}</figure><figure><figcaption>U_ab: b-től a-ig</figcaption>${bridgePhase(m,'lv')}</figure></div>`;
      explanation=[t(s,group==='Dy11'?'bridgeDeltaNote':'bridgeStarNote'),t(s,'bridgeDifference'),t(s,group==='Dy11'?'bridgeDeltaCenter':'bridgeStarCenter')].join(' ');
    }else if(stage===3){body=pairedMeasurement({...s,bridgeGroup:group,pair:0,merged:false});explanation=t(s,'bridgeMeasureNote');}
    else {
      const vectors=s.bridgePhases?m.hvPhase:m.hvLine,start=((angleOf(vectors[0])+180)%360)-180;
      body=`<div class="tf-bridge-clock" style="--tf-bridge-angle:${start}deg">${clock(group,0,0,true,!!s.bridgePhases)}<p class="tf-bridge-result">${m.clock} · 30° = ${m.clock*30}° → ${group}</p></div><div class="tf-action-row">${btn(s.bridgePhases?'Vissza a vonali nyilakhoz':'U_A és U_a: így olvasd a feladat ábráját','bridge-phases','',!!s.bridgePhases)}</div>`;
      explanation=t(s,s.bridgePhases?(group==='Dy11'?'bridgePhaseNote':'bridgePhaseStarNote'):'bridgeClockNote');
    }
    return `<div class="tf-action-row">${['Dy11','Yy6'].map(g=>btn(g,'bridge-group',g,group===g)).join('')}</div><h4 class="tf-bridge-caption">${captions[stage]}</h4><div class="tf-bridge-board" data-bridge-stage="${stage}">${body}</div>${note(explanation)}<div class="tf-action-row tf-bridge-controls">${btn('Vissza','bridge-prev')}<output>${stage+1} / 5</output>${btn(stage===4?'Újra':'Tovább','bridge-next')}</div>`;
  }
  function recognition(s,id,prompt,options,correct,feedback) {
    const chosen=s.answers[id];return `<div class="tf-quiz"><p class="tf-question">${prompt}</p><div class="tf-choice-row">${options.map((t,i)=>btn(t,'answer',id+':'+i,chosen===i)).join('')}</div><p class="tf-feedback ${chosen===undefined?'':chosen===correct?'tf-correct':'tf-rethink'}" aria-live="polite">${chosen===undefined?'Válassz, majd nézd meg az indoklást.':feedback[chosen]}</p></div>`;
  }
  function groupParts(s) {
    const m=model(s.group),spec=m.spec,first=spec.hv==='Y'?'Y':'D',second=spec.lv==='Y'?'y':spec.lv==='Z'?'z':'d';
    const names={hv:'Nagyobb feszültségű oldal',lv:'Kisebb feszültségű oldal',n:'Kivezetett nullapont',hour:'Feszültséghelyzet'};
    const meanings={hv:t(s,'meaning-hv-'+first),lv:t(s,'meaning-lv-'+second),n:t(s,'meaning-n'),hour:t(s,'meaning-hour',{hour:m.clock,meaning:s.copy?.hourText?.[m.clock]||''})};
    const part=s.part==='n'&&!spec.neutral?'lv':s.part;
    const bits=[['hv',first],['lv',second],...(spec.neutral?[['n','n']]:[]),['hour',String(m.clock)]];
    const selectedSide=part==='hv'?'hv':'lv';
    return `<div class="tf-symbol" role="group" aria-label="A csoportjel részei">${bits.map(([key,t])=>btn(t,'part',key,part===key)).join('')}</div><p class="tf-part-meaning">${meanings[part]}</p><div class="tf-final-board"><figure><figcaption>${names[part==='hour'?'lv':part]}${part==='n'?' (kisebb oldal)':''}</figcaption>${conventionalDrawing(m,selectedSide)}<p class="tf-caption-note">${t(s,'polarityNote')}</p></figure><figure><figcaption>U_AB és U_ab</figcaption>${clock(s.group)}<p class="tf-caption-note">${t(s,'arrowNote')}</p></figure></div>`;
  }
  function slide(s) {
    const lead=()=>`<p class="tf-lead">${t(s,'lead'+s.step)}</p>`;
    switch(s.step){
      case 0:return `${lead()}<div class="tf-main-illustration">${simpleTransformer(s)}</div><div class="tf-action-row">${btn(s.flux?'Vissza a két tekercshez':'Mutasd a mágneses kapcsolatot','flux','',s.flux)}</div>${note(t(s,s.flux?'note0on':'note0off'))}<p class="tf-preview">${t(s,'preview0')}</p>`;
      case 1:return `${lead()}<div class="tf-main-illustration tf-shape">${shape('Y',s.y)}</div><div class="tf-action-row">${btn(s.y?'Válaszd szét a végeket':'Kösd össze a három véget','y','',s.y)}</div>${note(t(s,s.y?'note1on':'note1off'))}`;
      case 2:return `${lead()}<div class="tf-main-illustration tf-shape">${shape('D',s.d)}</div><div class="tf-action-row">${btn(s.d?'Bontsd fel a hurkot':'Zárd háromszöggé a tekercseket','d','',s.d)}</div>${note(t(s,s.d?'note2on':'note2off'))}`;
      case 3:return `${lead()}<div class="tf-z-layout"><div>${zigzag(s)}</div><div class="tf-z-controls"><p>Melyik fázis útját követed?</p><div class="tf-choice-row">${LOWER.map((p,i)=>btn(p+'–n út','z',i,s.z===i)).join('')}</div><p class="tf-note">${t(s,'zpath',{phase:LOWER[s.z],core1:PHASES[s.z],core2:PHASES[(s.z+1)%3]})}</p><p class="tf-small-copy">${t(s,'znote')}</p></div></div>`;
      case 4:return `${lead()}<div class="tf-voltage-board"><figure><figcaption>Csillag · Y</figcaption>${shape('Y',true,false,s.measure)}<p>${formula("U_v = √3 · U_t")}</p></figure><figure><figcaption>Delta · D</figcaption>${shape('D',true,false,s.measure)}<p>${formula("U_v = U_t")}</p></figure></div><div class="tf-action-row">${btn(s.measure?'Mérj két fázisvezető között':'Mérj a tekercs két végén','measure','',s.measure)}</div>${recognition(s,'voltage',t(s,'voltagePrompt'),['230 V','400 V','690 V'],1,s.copy?.voltageFeedback||[])}<p class="tf-small-copy">${t(s,'voltageNote')}</p>`;
      case 5:return `${lead()}<div data-tf-wave>${waveform(s)}</div><div class="tf-action-row">${btn('Lépés egy nyolcad körrel','phase')}${btn('Egy teljes kör lejátszása','play')}${btn('Vissza a kezdőállapotba','phase-reset')}</div>${note(t(s,'note5'))}<p class="tf-small-copy">${t(s,'waveNote')}</p>`;
      case 6:return windingToClock(s);
      case 7:return `${lead()}<div class="tf-hour-layout"><div>${clock(hours[s.hour])}</div><div class="tf-hour-controls"><div class="tf-choice-row" role="group" aria-label="Óraállás">${[0,1,5,6,11].map(h=>btn(h+' óra','hour',h,s.hour===h)).join('')}</div><p class="tf-hour-reading"><b>${s.hour===0?'0°':s.hour*30+'° az óramutató szerint'}</b><span>${s.copy?.hourText?.[s.hour]||''}</span></p>${note(t(s,s.hour===11?'hour11':s.hour===0?'hour0':'hourOther'))}<p class="tf-small-copy">${t(s,'arrowNote')}</p></div></div>${recognition(s,'clock',t(s,'clockPrompt'),['1','11'],1,s.copy?.clockFeedback||[])}`;
      case 8:return `${lead()}<div class="tf-group-controls" role="group" aria-label="Kapcsolási csoportpéldák">${Object.keys(groups).map(g=>btn(g,'group',g,s.group===g)).join('')}</div>${groupParts(s)}${recognition(s,'symbol',t(s,'symbolPrompt'),s.copy?.symbolOptions||[],1,s.copy?.symbolFeedback||[])}<p class="tf-small-copy tf-parallel-note">${t(s,'parallelNote')}</p>`;
      default:return '';
    }
  }
  function render(lessonOrSpec,key='machines-vector-group') {
    const k=String(key),s=stateByKey.get(k)||defaults();if(lessonOrSpec?.transformerLesson)s.copy=lessonOrSpec.transformerLesson;stateByKey.set(k,s);const id='tf-'+(++serial);
    return `<section class="tf-workbench" data-tf-key="${esc(k)}" aria-label="Transzformátorok kilenc ábrán"><div class="tf-slide" id="${id}-slide" aria-labelledby="${id}-title"><h3 id="${id}-title" data-tf-title>${title(s)}</h3><div class="tf-slide-content" data-tf-content>${slide(s)}</div></div><nav class="tf-navigation" aria-label="Tanítólapok"><div class="tf-nav-row">${btn('Előző','prev')}<output data-tf-count aria-live="polite">${s.step+1} / 9</output>${btn(s.step===8?'Vissza az elejére':'Következő','next')}</div><div class="tf-jumps">${shortTitles.map((t,i)=>`<button type="button" data-tf-action="step" data-value="${i}" aria-label="${i+1}. ${esc(t)}" ${s.step===i?'aria-current="step"':''}><span>${i+1}</span> ${t}</button>`).join('')}</div></nav></section>`;
  }
  function notation(root) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())if(!walker.currentNode.parentElement?.closest('svg,sub,script,style')&&/U_[A-Za-z][A-Za-z0-9]*/.test(walker.currentNode.textContent))nodes.push(walker.currentNode);
    nodes.forEach(node=>{const fragment=document.createDocumentFragment();let start=0;for(const m of node.textContent.matchAll(/U_([A-Za-z][A-Za-z0-9]*)/g)){fragment.append(document.createTextNode(node.textContent.slice(start,m.index)+'U'));const subscript=document.createElement('sub');subscript.textContent=m[1];fragment.append(subscript);start=m.index+m[0].length;}fragment.append(document.createTextNode(node.textContent.slice(start)));node.replaceWith(fragment);});
  }
  function update(panel,s,focus=null) {
    panel.querySelector('[data-tf-title]').textContent=title(s);panel.querySelector('[data-tf-content]').innerHTML=slide(s);
    panel.querySelector('[data-tf-count]').textContent=(s.step+1)+' / 9';panel.querySelector('[data-tf-action="prev"]').disabled=s.step===0;
    panel.querySelector('[data-tf-action="next"]').textContent=s.step===8?'Vissza az elejére':'Következő';
    panel.querySelectorAll('[data-tf-action="step"]').forEach(b=>{if(Number(b.dataset.value)===s.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    const bridgeBack=panel.querySelector('[data-tf-action="bridge-prev"]');if(bridgeBack)bridgeBack.disabled=!(s.bridgeStage>0);
    panel.dataset.tfStep=s.step+1;panel.dataset.tfGroup=s.group;notation(panel);
    if(focus){const buttons=[...panel.querySelectorAll('button')],target=buttons.find(b=>b.dataset.tfAction===focus.action&&b.dataset.value===focus.value);target?.focus({preventScroll:true});}
  }
  function stop(panel) {const run=playing.get(panel);if(run){cancelAnimationFrame(run.frame);playing.delete(panel);}const b=panel.querySelector('[data-tf-action="play"]');if(b){b.textContent='Egy teljes kör lejátszása';b.setAttribute('aria-pressed','false');}}
  function play(panel,s) {
    if(playing.has(panel)){stop(panel);return;}
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){s.phase=normal(s.phase+45);update(panel,s,{action:'play',value:''});return;}
    const begun=performance.now(),from=s.phase,run={frame:0};playing.set(panel,run);
    const b=panel.querySelector('[data-tf-action="play"]');b.textContent='Lejátszás megállítása';b.setAttribute('aria-pressed','true');
    const tick=now=>{if(!panel.isConnected||document.hidden||s.step!==5){stop(panel);return;}const t=Math.min(1,(now-begun)/4500);s.phase=normal(from+360*t);panel.querySelector('[data-tf-wave]').innerHTML=waveform(s);if(t<1)run.frame=requestAnimationFrame(tick);else {s.phase=from;stop(panel);}};run.frame=requestAnimationFrame(tick);
  }
  function mount(root) {
    if(!root)return;const panels=[...(root.matches?.('[data-tf-key]')?[root]:[]),...root.querySelectorAll('[data-tf-key]')];
    panels.forEach(panel=>{if(mounted.has(panel))return;mounted.add(panel);const s=stateByKey.get(panel.dataset.tfKey)||defaults();stateByKey.set(panel.dataset.tfKey,s);update(panel,s);
      panel.addEventListener('click',event=>{
        const b=event.target.closest('button[data-tf-action]');if(!b||!panel.contains(b))return;
        const a=b.dataset.tfAction,v=b.dataset.value,oldStep=s.step;if(a==='play'){play(panel,s);return;}stop(panel);
        if(a==='step')s.step=Number(v);else if(a==='prev')s.step=Math.max(0,s.step-1);else if(a==='next')s.step=(s.step+1)%9;
        else if(a==='bridge-group'){s.bridgeGroup=v;s.bridgeStage=0;s.bridgePhases=false;}else if(a==='bridge-next')s.bridgeStage=((s.bridgeStage||0)+1)%5;else if(a==='bridge-prev')s.bridgeStage=Math.max(0,(s.bridgeStage||0)-1);else if(a==='bridge-phases')s.bridgePhases=!s.bridgePhases;
        else if(['flux','y','d','measure'].includes(a))s[a]=!s[a];else if(a==='z')s.z=Number(v);else if(a==='phase')s.phase=normal(s.phase+45);else if(a==='phase-reset')s.phase=0;
        else if(a==='merge')s.merged=!s.merged;else if(a==='pair')s.pair=Number(v);else if(a==='hour')s.hour=Number(v);else if(a==='group'){s.group=v;if(s.part==='n'&&!groups[v].neutral)s.part='lv';}else if(a==='part')s.part=v;
        else if(a==='answer'){const [id,index]=v.split(':');s.answers[id]=Number(index);if(id==='clock')s.hour=Number(index)===1?11:1;if(id==='symbol'){s.group='Yd11';s.part='lv';}}else return;
        update(panel,s,{action:a,value:v});
        if(s.step!==oldStep&&panel.getBoundingClientRect().top<0)panel.scrollIntoView({block:'start',behavior:'auto'});
      });
    });
  }
  const matches=lesson=>lesson?.id==='machines-vector-group'||lesson?.variant==='transformer-vector-group';
  window.VVLearningTransformers={matches,render,mount,model,netlist,angleOf,normal,groups};
})();
