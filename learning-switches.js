(function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states=new Map(),mounted=new WeakSet();
  const names={'101':'Egysarkú kapcsoló','101N':'Nyomógomb','102':'Kétsarkú kapcsoló','103':'Háromsarkú kapcsoló','104':'Csoportkapcsoló','105':'Csillárkapcsoló','106':'Váltókapcsoló','107':'Keresztkapcsoló'};
  const number=value=>Number(Number(value).toFixed(5));
  const path=points=>points.map((p,i)=>(i?'L':'M')+p.map(number).join(' ')).join(' ');
  const normalize=code=>String(code).toUpperCase().match(/101N|101|102|103|104|105|106|107/)?.[0]||'101';
  const controlCount=kind=>kind==='105'||kind==='106'?2:kind==='107'?3:1;
  const defaults=kind=>Array(controlCount(kind)).fill(kind==='104'?1:0);
  function getState(key){
    if(!states.has(key))states.set(key,{key,kind:key==='installation-alternate'?'106':'101',variants:new Map(),roots:new Set(),frame:0});
    const state=states.get(key);
    if(!state.variants.has(state.kind)){const positions=defaults(state.kind);state.variants.set(state.kind,{positions,pose:[...positions],moving:new Map(),held:false,releaseTimer:0});}
    return state;
  }
  const current=state=>{getState(state.key);return state.variants.get(state.kind)};
  function graph(){
    const nodes={},edges=[],switches=[],lamps=[];
    return {nodes,edges,switches,lamps,
      node(id,x,y){nodes[id]=[x,y];return id},
      wire(id,a,b,points,role='phase'){edges.push({id,a,b,points,role,closed:true});return id},
      contact(id,a,b,closed,role='phase'){edges.push({id,a,b,points:[nodes[a],nodes[b]],role,closed,contact:true});return id}
    };
  }
  function route(model,start,end){
    const queue=[[start,[]]],seen=new Set([start]);
    while(queue.length){const [node,steps]=queue.shift();if(node===end)return steps;for(const edge of model.edges){if(!edge.closed)continue;const next=edge.a===node?edge.b:edge.b===node?edge.a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([next,[...steps,edge.id]])}}}
    return null;
  }
  function solve(model){
    const active=new Set(),routes=[];
    const lamps=model.lamps.map(lamp=>{const supply=route(model,'source-L',lamp.a),back=route(model,lamp.b,'source-N'),on=supply!==null&&back!==null;
      if(on){[...supply,...back].forEach(id=>active.add(id));routes.push({lamp:lamp.id,supply,return:back})}return {...lamp,on};});
    return {lamps,active,routes};
  }
  function addSource(model,compact,kind){
    const alternate=kind==='106'||kind==='107';
    const x=compact?24:44,r=compact?18:25,y=compact?(kind==='107'?220:kind==='106'?190:140):(alternate?150:130);
    model.source={x,y,r};model.node('source-L',x,y-r);model.node('source-N',x,y+r);
  }
  function blade(model,{id,index,pivot,fixed,length,base=0,angles,role='phase',linked=false,code,reverseFlow=false}){
    const a=model.node(id+'-common',...pivot),contacts=fixed.map((p,i)=>model.node(id+'-fixed'+i,...p));
    model.switches.push({id,index,pivot,fixed,length,base,angles,role,linked,code,a,contacts,reverseFlow});return {a,contacts};
  }
  function build(kind,positions,pending=new Set(),compact=false){
    const model=graph();model.kind=kind;model.compact=compact;addSource(model,compact,kind);
    if(kind==='106'||kind==='107'){buildAlternate(model,positions,pending,compact);return model}
    const dual=kind==='104'||kind==='105';
    const W=compact?320:700,H=dual?(compact?354:280):(compact?270:260);
    const top=compact?58:54,bottom=dual?(compact?304:232):(compact?214:202),px=compact?120:250,len=compact?58:64,loadX=compact?260:615;
    model.width=W;model.height=H;model.neutralY=bottom;model.peY=H-24;
    const inNode=model.node('L-feed',px,top);model.wire('L-feed','source-L',inNode,[[model.source.x,model.source.y-model.source.r],[model.source.x,top],[px,top]]);
    const returnNode=model.node('N-return',compact?24:44,bottom);model.wire('N-source',returnNode,'source-N',[[model.source.x,bottom],[model.source.x,model.source.y+model.source.r]],'neutral');
    if(!dual){
      const sw=blade(model,{id:'S1',index:0,pivot:[px,top],fixed:[[px+len,top]],length:len,angles:[-30,0],code:kind});
      model.wire('L-input',inNode,sw.a,[model.nodes[inNode],model.nodes[sw.a]]);
      model.contact('S1',sw.a,sw.contacts[0],positions[0]===1&&!pending.has(0));
      const ly=compact?136:108,r=compact?22:22,lp=model.node('E1-L',loadX,ly-r),ln=model.node('E1-N',loadX,ly+r);
      model.wire('E1-phase',sw.contacts[0],lp,[[px+len,top],[loadX,top],[loadX,ly-r]],'switched');
      if(kind==='102'){
        const nSwitch=blade(model,{id:'S1-N',index:0,pivot:[px,bottom],fixed:[[px+len,bottom]],length:len,angles:[-30,0],role:'neutral',linked:true,code:kind});
        model.contact('S1-N',nSwitch.a,nSwitch.contacts[0],positions[0]===1&&!pending.has(0),'neutral');
        model.wire('E1-neutral',ln,nSwitch.contacts[0],[[loadX,ly+r],[loadX,bottom],[px+len,bottom]],'neutral');
        model.wire('N-input',nSwitch.a,returnNode,[[px,bottom],model.nodes[returnNode]],'neutral');
        model.mechanical={x:px,length:len,top,bottom};
      }else model.wire('E1-neutral',ln,returnNode,[[loadX,ly+r],[loadX,bottom],model.nodes[returnNode]],'neutral');
      model.lamps.push({id:'E1',a:lp,b:ln,x:loadX,y:ly,r});
      model.controls=[{index:0,x:compact?150:px+len/2,y:compact?130:132,code:kind}];
    }else{
      const firstY=compact?88:78,secondY=compact?218:163;
      const lampX=loadX,neutralBus=compact?292:660;
      const nBus=model.node('N-bus',neutralBus,bottom);model.wire('N-bus',nBus,returnNode,[[neutralBus,bottom],model.nodes[returnNode]],'neutral');
      let outputs=[];
      if(kind==='105'){
        const common=model.node('L-branch',compact?78:170,top);
        model.edges.splice(model.edges.findIndex(e=>e.id==='L-feed'),1);
        model.wire('L-feed','source-L',common,[[model.source.x,model.source.y-model.source.r],[model.source.x,top],[model.nodes[common][0],top]]);
        for(let i=0;i<2;i++){
          const y=i?secondY:firstY,sw=blade(model,{id:'S'+(i+1),index:i,pivot:[px,y],fixed:[[px+len,y]],length:len,angles:[-30,0],code:kind});
          model.wire('L-branch'+i,common,sw.a,[[model.nodes[common][0],top],[model.nodes[common][0],y],[px,y]]);
          model.contact('S'+(i+1),sw.a,sw.contacts[0],positions[i]===1&&!pending.has(i));outputs.push(sw.contacts[0]);
        }
      }else{
        const cy=compact?153:120,angle=30*Math.PI/180,dx=len*Math.cos(angle),dy=len*Math.sin(angle);
        const sw=blade(model,{id:'S1',index:0,pivot:[px,cy],fixed:[[px+dx,cy-dy],[px+dx,cy+dy]],length:len,angles:[-30,0,30],code:kind});
        model.edges.splice(model.edges.findIndex(e=>e.id==='L-feed'),1);model.wire('L-feed','source-L',sw.a,[[model.source.x,model.source.y-model.source.r],[model.source.x,top],[compact?78:170,top],[compact?78:170,cy],[px,cy]]);
        if(positions[0]!==1)model.contact('S1',sw.a,sw.contacts[positions[0]===0?0:1],!pending.has(0));outputs=sw.contacts;
      }
      for(let i=0;i<2;i++){
        const y=i?secondY:firstY,r=20,lp=model.node('E'+(i+1)+'-L',lampX-r,y),ln=model.node('E'+(i+1)+'-N',lampX+r,y),out=model.nodes[outputs[i]],nTap=model.node('N-tap'+i,neutralBus,y);
        model.wire('E'+(i+1)+'-phase',outputs[i],lp,[out,[out[0]+(compact?13:28),out[1]],[out[0]+(compact?13:28),y],[lampX-r,y]],'switched');
        model.wire('E'+(i+1)+'-neutral',ln,nTap,[[lampX+r,y],[neutralBus,y]],'neutral');
        model.lamps.push({id:'E'+(i+1),a:lp,b:ln,x:lampX,y,r,horizontal:true});
      }
      model.wire('N-down0','N-tap0','N-tap1',[[neutralBus,firstY],[neutralBus,secondY]],'neutral');
      model.wire('N-down1','N-tap1',nBus,[[neutralBus,secondY],[neutralBus,bottom]],'neutral');
      model.controls=kind==='105'?[{index:0,x:compact?150:310,y:compact?127:111,code:kind},{index:1,x:compact?150:310,y:compact?259:198,code:kind}]:[{index:0,x:compact?150:310,y:compact?260:195,code:kind}];
    }
    return model;
  }
  function buildAlternate(model,positions,pending,compact){
    const cross=model.kind==='107',len=compact?62:64,d=number(len*Math.sin(Math.PI/6)),run=number(len*Math.cos(Math.PI/6));
    model.width=compact?320:700;model.height=compact?(cross?470:390):280;model.neutralY=compact?(cross?432:352):226;model.peY=model.height-24;
    const p1=compact?[150,50]:[170,110],p2=compact?[150,cross?345:258]:[536,110];
    const fixed1=compact?[[150-d,50+run],[150+d,50+run]]:[[170+run,110-d],[170+run,110+d]];
    const fixed2=compact?[[150-d,p2[1]-run],[150+d,p2[1]-run]]:[[536-run,110-d],[536-run,110+d]];
    const left=blade(model,{id:'S1',index:0,pivot:p1,fixed:fixed1,length:len,base:compact?90:0,angles:compact?[30,-30]:[-30,30],code:'106'});
    const right=blade(model,{id:cross?'S3':'S2',index:cross?2:1,pivot:p2,fixed:fixed2,length:len,base:compact?-90:180,angles:compact?[-30,30]:[30,-30],code:'106',reverseFlow:true});
    model.wire('L-feed','source-L',left.a,[[model.source.x,model.source.y-model.source.r],[model.source.x,p1[1]],p1]);
    model.contact('S1',left.a,left.contacts[positions[0]],!pending.has(0));
    model.contact(cross?'S3':'S2',right.a,right.contacts[positions[cross?2:1]],!pending.has(cross?2:1));
    if(cross){
      const ins=compact?[[150-d,177],[150+d,177]]:[[320,110-d],[320,110+d]],outs=compact?[[150-d,236],[150+d,236]]:[[386,110-d],[386,110+d]];
      model.cross={index:1,ins,outs,x:compact?104:307,y:compact?163:65,w:compact?92:92,h:compact?88:90};
      for(let i=0;i<2;i++){
        const a=model.node('X-in'+i,...ins[i]),b=model.node('X-out'+i,...outs[i]);
        model.wire('traveller-left'+i,left.contacts[i],a,[fixed1[i],ins[i]],'traveller');
        model.wire('traveller-right'+i,b,right.contacts[i],[outs[i],fixed2[i]],'traveller');
      }
      for(let i=0;i<2;i++)model.contact('X'+i,'X-in'+i,'X-out'+(positions[1]?1-i:i),!pending.has(1),'traveller');
    }else for(let i=0;i<2;i++)model.wire('traveller'+i,left.contacts[i],right.contacts[i],[fixed1[i],fixed2[i]],'traveller');
    const lx=compact?260:615,ly=compact?(cross?380:300):153,r=22;
    const lampL=model.node('E1-L',lx,ly-r),lampN=model.node('E1-N',lx,ly+r),ret=model.node('N-return',model.source.x,model.neutralY);
    model.wire('E1-phase',right.a,lampL,[p2,[lx,p2[1]],[lx,ly-r]],'switched');
    model.wire('E1-neutral',lampN,ret,[[lx,ly+r],[lx,model.neutralY],[model.source.x,model.neutralY]],'neutral');
    model.wire('N-source',ret,'source-N',[[model.source.x,model.neutralY],[model.source.x,model.source.y+model.source.r]],'neutral');
    model.lamps.push({id:'E1',a:lampL,b:lampN,x:lx,y:ly,r});
    model.controls=compact?[{index:0,x:252,y:127,code:'106'},...(cross?[{index:1,x:252,y:215,code:'107'}]:[]),{index:cross?2:1,x:252,y:cross?310:233,code:'106'}]:[{index:0,x:197,y:190,code:'106'},...(cross?[{index:1,x:353,y:190,code:'107'}]:[]),{index:cross?2:1,x:508,y:190,code:'106'}];
  }
  function wireMarkup(edge,active){
    return `<g class="ls-wire ls-${edge.role}${active?' is-live':''}" data-ls-edge="${edge.id}" data-current="${active}"><path class="ls-wire-base" d="${path(edge.points)}"/><path class="ls-flow" d="${path(edge.points)}"/></g>`;
  }
  function angleFor(sw,pose){
    if(sw.angles.length===3)return sw.angles[0]+pose*(sw.angles[2]-sw.angles[0])/2;
    return sw.angles[0]+pose*(sw.angles[1]-sw.angles[0]);
  }
  function svgMarkup(model,variant,layout){
    const pending=new Set(variant.moving.keys()),electrical=solve(model),roleId=`ls-${model.kind}-${layout}`;
    const wires=model.edges.filter(edge=>!edge.contact).map(edge=>wireMarkup(edge,electrical.active.has(edge.id))).join('');
    const contacts=model.switches.map(sw=>{
      const end=[sw.pivot[0]+sw.length*Math.cos(sw.base*Math.PI/180),sw.pivot[1]+sw.length*Math.sin(sw.base*Math.PI/180)],angle=angleFor(sw,variant.pose[sw.index]),flowPoints=sw.role==='neutral'||sw.reverseFlow?[end,sw.pivot]:[sw.pivot,end];
      return `<g class="ls-switch-geometry" data-ls-switch="${sw.id}"><g class="ls-blade ls-wire ls-${sw.role}${electrical.active.has(sw.id)?' is-live':''}" data-ls-edge="${sw.id}" data-current="${electrical.active.has(sw.id)}" data-ls-blade="${sw.index}" data-ls-angle-a="${sw.angles[0]}" data-ls-angle-b="${sw.angles.at(-1)}" data-ls-px="${sw.pivot[0]}" data-ls-py="${sw.pivot[1]}" style="transform:rotate(${angle}deg);transform-origin:${sw.pivot[0]}px ${sw.pivot[1]}px"><path class="ls-wire-base" d="${path([sw.pivot,end])}"/><path class="ls-flow" d="${path(flowPoints)}"/></g><circle class="ls-contact ls-${sw.role}" cx="${sw.pivot[0]}" cy="${sw.pivot[1]}" r="3"/>${sw.fixed.map(p=>`<circle class="ls-contact ls-${sw.role}" cx="${p[0]}" cy="${p[1]}" r="3"/>`).join('')}${!sw.linked?`<text class="ls-s-label" x="${sw.pivot[0]}" y="${sw.pivot[1]-(model.compact&&(model.kind==='106'||model.kind==='107')?16:25)}">${sw.id}</text>`:''}${model.kind==='101N'?'<path class="ls-actuator" data-ls-actuator="true"/>':''}</g>`;
    }).join('');
    let cross='';
    if(model.cross){const c=model.cross,selected=variant.positions[1];cross=`<g class="ls-cross" data-ls-cross="1"><rect class="ls-cross-box" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="5"/><text class="ls-s-label" x="${c.x+c.w/2}" y="${c.y-12}">S2</text>${c.ins.concat(c.outs).map(p=>`<circle class="ls-contact ls-traveller" cx="${p[0]}" cy="${p[1]}" r="3"/>`).join('')}${[0,1].map(position=>`<g data-ls-cross-state="${position}" style="display:${position===selected?'':'none'};opacity:${pending.has(1)?0:1}">${[0,1].map(i=>{const pts=[c.ins[i],c.outs[position?1-i:i]];return `<g class="ls-cross-link ls-wire ls-traveller${electrical.active.has('X'+i)?' is-live':''}" data-ls-edge="X${i}" data-current="${electrical.active.has('X'+i)}"><path class="ls-cross-separator" d="${path(pts)}"/><path class="ls-wire-base" d="${path(pts)}"/><path class="ls-flow" d="${path(pts)}"/></g>`}).join('')}</g>`).join('')}</g>`}
    const lamps=electrical.lamps.map(l=>`<g class="ls-load${l.on?' is-on':''}" data-ls-lamp="${l.id}" data-lamp-on="${l.on}"><rect class="ls-housing" x="${l.x-l.r-5}" y="${l.y-l.r-5}" width="${2*l.r+10}" height="${2*l.r+10}" rx="6"/><circle class="ls-lamp-halo" cx="${l.x}" cy="${l.y}" r="${l.r+12}"/><circle class="ls-lamp-glass" cx="${l.x}" cy="${l.y}" r="${l.r}"/><path class="ls-lamp-filament" d="M${l.x-l.r*.64} ${l.y-l.r*.64}l${l.r*1.28} ${l.r*1.28}m0-${l.r*1.28}-${l.r*1.28} ${l.r*1.28}"/><text class="ls-load-label" x="${l.horizontal?l.x:l.x+(model.compact?36:40)}" y="${l.horizontal?l.y-l.r-15:l.y-12}">${l.id}</text></g>`).join('');
    const peX=Math.min(model.width-16,Math.max(...model.lamps.map(l=>l.x+l.r+9))),peEnd=model.lamps[model.lamps.length-1];
    const pePath=[[model.compact?70:110,model.peY],[peX,model.peY],[peX,peEnd.y+peEnd.r-2],[peEnd.x+peEnd.r+5,peEnd.y+peEnd.r-2]];
    const peBranch=model.lamps.length>1?model.lamps.slice(0,-1).map(l=>{const pts=[[peX,peEnd.y+peEnd.r-2],[peX,l.y+l.r-2],[l.x+l.r+5,l.y+l.r-2]];return `<path d="${path(pts)}"/><path class="ls-pe-stripe" d="${path(pts)}"/>`}).join(''):'';
    const source=model.source;
    const phaseLabelY=model.kind==='106'||model.kind==='107'?(model.compact?80:93):(model.compact?91:87),neutralLabelY=model.compact&&model.kind==='104'?model.neutralY+20:model.neutralY-8;
    return `<svg viewBox="0 0 ${model.width} ${model.height}" class="ls-circuit" data-ls-layout="${layout}" role="img" aria-labelledby="${roleId}-title"><title id="${roleId}-title">${esc(names[model.kind])}. A kapcsolókkal nyitható és zárható teljes áramkör.</title><g class="ls-pe" aria-hidden="true"><path d="${path(pePath)}"/><path class="ls-pe-stripe" d="${path(pePath)}"/>${peBranch}<text x="${pePath[0][0]-27}" y="${model.peY+6}">PE</text></g>${wires}${cross}${contacts}${model.mechanical?'<path class="ls-mechanism" data-ls-mechanical="true"/>':''}${lamps}<g class="ls-source"><circle cx="${source.x}" cy="${source.y}" r="${source.r}"/><path d="M${source.x-source.r*.65} ${source.y}c${source.r*.2}-${source.r*.5} ${source.r*.45}-${source.r*.5} ${source.r*.65} 0s${source.r*.45} ${source.r*.5} ${source.r*.65} 0"/></g><text class="ls-conductor-label ls-phase-label" x="${model.compact?53:89}" y="${phaseLabelY}">L</text><text class="ls-conductor-label ls-neutral-label" x="${model.compact?53:89}" y="${neutralLabelY}">N</text></svg>`;
  }
  function controlMarkup(model,variant){
    return model.controls.map(c=>{
      const position=variant.positions[c.index],label=model.kind==='101N'?'Nyomva tartom':model.kind==='105'||model.kind==='106'||model.kind==='107'?`S${c.index+1}`:'Kapcsoló';
      if(model.kind==='104')return `<div class="ls-position-control" style="left:${c.x/model.width*100}%;top:${c.y/model.height*100}%" role="group" aria-label="A csoportkapcsoló állása">${[['I',0],['0',1],['II',2]].map(([text,value])=>`<button type="button" data-ls-control="0" data-ls-position="${value}" aria-pressed="${value===position}">${text}</button>`).join('')}</div>`;
      return `<button type="button" class="ls-switch-button" style="left:${c.x/model.width*100}%;top:${c.y/model.height*100}%" data-ls-control="${c.index}" ${model.kind==='101N'?'data-ls-momentary="true"':''} aria-pressed="${!!position}" aria-label="${esc(model.kind==='101N'?'101N nyomógomb. Tartsd nyomva a záráshoz.':`${label}, ${c.code}. Átkapcsolás.`)}"><span class="ls-rocker" aria-hidden="true"><i></i></span><span><b>${esc(label)}</b><small>${esc(c.code)}</small></span></button>`;
    }).join('');
  }
  function statusMarkup(model,result,pending){
    if(pending.size)return 'A kapcsoló átáll. A mozgó érintkező most megszakítja a saját áramútját.';
    if(result.lamps.length===2)return result.lamps.map(l=>`${l.id}: ${l.on?'világít':'nem világít'}`).join('. ')+'.';
    return result.lamps[0].on?'Zárt áramkör. A lámpa világít.':'Megszakadt az áramút. A lámpa nem világít.';
  }
  function body(state){
    const variant=current(state),pending=new Set(variant.moving.keys()),wide=build(state.kind,variant.positions,pending),compact=build(state.kind,variant.positions,pending,true),result=solve(wide);
    const types=state.key==='installation-alternate'?['106','107']:['101','101N','102','104','105'];
    const tabs=types.map(kind=>{const label=kind==='106'?'Két helyről':kind==='107'?'Három helyről':names[kind];return `<button type="button" data-ls-kind="${kind}" aria-label="${esc(kind+' '+label)}" aria-pressed="${kind===state.kind}"><b>${kind==='107'?'106–107–106':kind==='106'?'106–106':kind}</b><span>${esc(label)}</span></button>`}).join('');
    return `<nav class="ls-types" aria-label="Kapcsolás kiválasztása">${tabs}</nav><p class="ls-kind-caption">${esc(names[state.kind])}</p><div class="ls-drawing ls-wide">${svgMarkup(wide,variant,'wide')}<div class="ls-controls">${controlMarkup(wide,variant)}</div></div><div class="ls-drawing ls-compact">${svgMarkup(compact,variant,'compact')}<div class="ls-controls">${controlMarkup(compact,variant)}</div></div><p class="ls-status" role="status" aria-live="polite">${esc(statusMarkup(wide,result,pending))}</p><p class="ls-notes">${state.kind==='101N'?'A nyomógomb nyomva tartva zár. Elengedve visszanyit. ':''}A mozgás az áramutat szemlélteti. A váltakozó áram iránya periodikusan megfordul. <span>PE: üzemi áramot nem vezet.</span></p>`;
  }
  function render(lesson){
    if(!['installation-switches','installation-alternate'].includes(lesson?.id))return '';
    const state=getState(lesson.id);if(state.kind==='101N'){const v=current(state);v.held=false;v.positions[0]=0;v.pose[0]=0;v.moving.clear();clearTimeout(v.releaseTimer)}return `<section class="ls-bench" data-switch-bench data-ls-key="${esc(lesson.id)}" data-kind="${state.kind}" aria-label="Kapcsolható világítási áramkör">${body(state)}</section>`;
  }
  function roots(state){for(const node of state.roots)if(!node.isConnected)state.roots.delete(node);return [...state.roots]}
  function paintGeometry(root,state){
    const variant=current(state);
    root.querySelectorAll('[data-ls-blade]').forEach(g=>{const index=Number(g.dataset.lsBlade),a=Number(g.dataset.lsAngleA),b=Number(g.dataset.lsAngleB),pose=variant.pose[index],angle=a+pose*(b-a)/(state.kind==='104'?2:1);g.style.transform=`rotate(${angle}deg)`});
    root.querySelectorAll('[data-ls-layout]').forEach(svg=>{const model=build(state.kind,variant.positions,new Set(variant.moving.keys()),svg.dataset.lsLayout==='compact');if(model.mechanical){const sw=model.switches[0],theta=angleFor(sw,variant.pose[0])*Math.PI/180,dx=sw.length/2*Math.cos(theta),dy=sw.length/2*Math.sin(theta);svg.querySelector('[data-ls-mechanical]').setAttribute('d',path([[sw.pivot[0]+dx,model.mechanical.top+dy],[sw.pivot[0]+dx,model.mechanical.bottom+dy]]))}if(state.kind==='101N'){const sw=model.switches[0],x=sw.pivot[0]+sw.length/2,y=sw.pivot[1]+Math.tan(angleFor(sw,variant.pose[0])*Math.PI/180)*sw.length/2;svg.querySelector('[data-ls-actuator]').setAttribute('d',`M${number(x)} ${number(y)}v-16m-10 0h20`)}});
  }
  function paintElectrical(root,state){
    const variant=current(state),pending=new Set(variant.moving.keys()),model=build(state.kind,variant.positions,pending),result=solve(model);
    root.dataset.kind=state.kind;root.dataset.state=variant.positions.join(',');root.dataset.transitioning=String(!!pending.size);
    root.querySelectorAll('[data-ls-edge]').forEach(g=>{const cross=g.closest('[data-ls-cross-state]'),active=result.active.has(g.dataset.lsEdge)&&(!cross||Number(cross.dataset.lsCrossState)===variant.positions[1]);g.classList.toggle('is-live',active);g.dataset.current=String(active)});
    root.querySelectorAll('[data-ls-lamp]').forEach(g=>{const on=result.lamps.find(l=>l.id===g.dataset.lsLamp)?.on||false;g.classList.toggle('is-on',on);g.dataset.lampOn=String(on)});
    root.querySelectorAll('[data-ls-cross-state]').forEach(g=>{g.style.display=Number(g.dataset.lsCrossState)===variant.positions[1]?'':'none';g.style.opacity=pending.has(1)?'0':'1'});
    root.querySelectorAll('[data-ls-control]').forEach(button=>{const pos=variant.positions[Number(button.dataset.lsControl)];button.setAttribute('aria-pressed',String(button.hasAttribute('data-ls-position')?pos===Number(button.dataset.lsPosition):!!pos))});
    root.querySelector('.ls-status').textContent=statusMarkup(model,result,pending);
  }
  const ease=t=>t*t*(3-2*t);
  function animate(state){
    state.frame=0;const variant=current(state),now=performance.now();
    for(const [index,motion] of variant.moving){const progress=Math.min(1,(now-motion.start)/motion.duration);variant.pose[index]=motion.from+(motion.to-motion.from)*ease(progress);if(progress===1){variant.pose[index]=motion.to;variant.moving.delete(index)}}
    for(const root of roots(state)){paintGeometry(root,state);paintElectrical(root,state)}
    if(variant.moving.size)state.frame=requestAnimationFrame(()=>animate(state));
  }
  function setPosition(state,index,position){
    const variant=current(state);if(variant.positions[index]===position&&!variant.moving.has(index))return;
    variant.positions[index]=position;
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){variant.pose[index]=position;variant.moving.delete(index)}
    else variant.moving.set(index,{from:variant.pose[index],to:position,start:performance.now(),duration:Math.max(90,230*Math.abs(position-variant.pose[index])/(state.kind==='104'?2:1))});
    roots(state).forEach(root=>{paintGeometry(root,state);paintElectrical(root,state)});
    if(!state.frame&&variant.moving.size)state.frame=requestAnimationFrame(()=>animate(state));
  }
  function select(root,kind){
    const state=getState(root.dataset.lsKey),next=normalize(kind),allowed=state.key==='installation-alternate'?['106','107']:['101','101N','102','104','105'];
    if(!allowed.includes(next))return;
    if(state.frame)cancelAnimationFrame(state.frame);state.frame=0;
    const old=current(state);old.held=false;clearTimeout(old.releaseTimer);old.moving.clear();if(state.kind==='101N')old.positions[0]=0;old.pose=[...old.positions];
    state.kind=next;getState(state.key);roots(state).forEach(node=>{node.innerHTML=body(state);paintGeometry(node,state);paintElectrical(node,state)});
  }
  function releaseMomentary(){for(const state of states.values()){if(state.kind!=='101N')continue;const v=current(state);if(v.held){v.held=false;setPosition(state,0,0)}}}
  function setup(host=document){
    const benches=[...(host.matches?.('[data-switch-bench]')?[host]:[]),...host.querySelectorAll('[data-switch-bench]')];
    benches.forEach(root=>{const state=getState(root.dataset.lsKey);state.roots.add(root);paintGeometry(root,state);paintElectrical(root,state)});
    host=document;if(mounted.has(host))return;mounted.add(host);
    host.addEventListener('click',event=>{
      const root=event.target.closest('[data-switch-bench]');if(!root)return;
      const type=event.target.closest('[data-ls-kind]');if(type){select(root,type.dataset.lsKind);root.querySelector(`[data-ls-kind="${type.dataset.lsKind}"]`)?.focus({preventScroll:true});return}
      const control=event.target.closest('[data-ls-control]');if(!control)return;
      const state=getState(root.dataset.lsKey),variant=current(state),index=Number(control.dataset.lsControl);
      if(control.hasAttribute('data-ls-momentary')){if(event.detail===0&&!variant.held){variant.held=true;setPosition(state,0,1);clearTimeout(variant.releaseTimer);variant.releaseTimer=setTimeout(releaseMomentary,650)}return}
      setPosition(state,index,control.hasAttribute('data-ls-position')?Number(control.dataset.lsPosition):variant.positions[index]?0:1);
    });
    host.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-ls-momentary]');if(!button||event.button!==0)return;event.preventDefault();button.focus({preventScroll:true});const state=getState(button.closest('[data-switch-bench]').dataset.lsKey),v=current(state);clearTimeout(v.releaseTimer);v.held=true;setPosition(state,0,1)});
    host.addEventListener('keydown',event=>{const button=event.target.closest('[data-ls-momentary]');if(!button||![' ','Enter'].includes(event.key)||event.repeat)return;event.preventDefault();const state=getState(button.closest('[data-switch-bench]').dataset.lsKey),v=current(state);v.held=true;setPosition(state,0,1)});
    host.addEventListener('focusout',event=>{if(event.target.closest('[data-ls-momentary]'))releaseMomentary()});
  }
  window.addEventListener('pointerup',releaseMomentary);window.addEventListener('pointercancel',releaseMomentary);window.addEventListener('blur',releaseMomentary);
  window.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key))releaseMomentary()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseMomentary()});
  matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',event=>{if(!event.matches)return;for(const state of states.values()){if(state.frame)cancelAnimationFrame(state.frame);state.frame=0;const v=current(state);v.moving.clear();v.pose=[...v.positions];roots(state).forEach(root=>{paintGeometry(root,state);paintElectrical(root,state)})}});
  function symbol(code){
    const kind=normalize(code),pole=(y,open=true)=>`<path d="M8 ${y}h15m0 0 31-${open?17:0}M57 ${y}h15"/><circle cx="23" cy="${y}" r="2"/><circle cx="57" cy="${y}" r="2"/>`;
    let content='';
    if(kind==='101'||kind==='101N')content=pole(35)+(kind==='101N'?'<path d="M40 23V8m-10 0h20"/>':'');
    if(kind==='102'||kind==='103'){const ys=kind==='103'?[19,38,57]:[23,49];content=ys.map(y=>pole(y)).join('')+`<path d="M39 ${ys[0]-8}V${ys.at(-1)-8}" stroke-dasharray="3 3"/>`}
    if(kind==='105')content='<path d="M8 35h14V20m0 15v15M22 20l31-16M57 20h15M22 50l31-16M57 50h15"/><circle cx="22" cy="35" r="2"/>';
    if(kind==='106'||kind==='104')content='<path d="M8 35h15m0 0 34-18M57 17h15M57 53h15"/><circle cx="23" cy="35" r="2"/><circle cx="57" cy="17" r="2"/><circle cx="57" cy="53" r="2"/>'+(kind==='104'?'<path d="M23 35h31" stroke-dasharray="3 3"/><text x="37" y="65" fill="currentColor" stroke="none" text-anchor="middle" font-size="11">I · 0 · II</text>':'');
    if(kind==='107')content='<rect x="19" y="9" width="42" height="50" rx="3"/><path d="M8 21h15l34 26h15M8 47h15l34-26h15"/>';
    return `<svg viewBox="0 0 80 72" width="80" height="72" class="ls-table-symbol" role="img" aria-label="${esc(names[kind])} érintkezőinek működési vázlata"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`;
  }
  window.VV_SWITCHES=Object.freeze({render,setup,symbol,select:(host,kind)=>{const root=host.matches?.('[data-switch-bench]')?host:host.querySelector('[data-switch-bench]');if(root)select(root,kind)},evaluate:(kind,positions)=>{const model=build(normalize(kind),positions);const result=solve(model);return {lamps:result.lamps.map(l=>({id:l.id,on:l.on})),routes:result.routes,activeEdges:[...result.active],edges:model.edges.map(({id,a,b,closed})=>({id,a,b,closed}))}},inspect:root=>{const state=getState(root.dataset.lsKey),v=current(state),model=build(state.kind,v.positions,new Set(v.moving.keys())),result=solve(model);return {kind:state.kind,positions:[...v.positions],poses:[...v.pose],moving:[...v.moving.keys()],lamps:result.lamps.map(l=>({id:l.id,on:l.on})),activeEdges:[...result.active],routes:result.routes,edges:model.edges.map(({id,a,b,closed})=>({id,a,b,closed}))}}});
})();
