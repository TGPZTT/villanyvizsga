(function(){
  'use strict';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=d=>((d%360)+360)%360,point=(a,r=1)=>({x:Math.sin(a*Math.PI/180)*r,y:-Math.cos(a*Math.PI/180)*r});
  const angle=v=>norm(Math.atan2(v.x,-v.y)*180/Math.PI);
  const rotate=(v,a)=>{const p=point(angle(v)+a,Math.hypot(v.x,v.y));return{x:p.x,y:p.y}};
  const clock=(hv,lv)=>Math.round(norm(angle(lv)-angle(hv))/30)%12;
  const waveform=(t,phase)=>Math.cos((t-phase)*Math.PI/180);
  const states=new Map(),controllers=new WeakMap();
  const get=key=>{if(!states.has(key))states.set(key,{scene:0,layout:0,rotation:0,time:0,reveal:1,difference:false,task:0,arc:0,pairTurn:0,answer:null,transfer:null,transferTurn:90});return states.get(key)};
  const prose=x=>esc(x).replace(/U_([A-Za-z][A-Za-z0-9]*)/g,'U<sub>$1</sub>');
  const sub=x=>esc(x).replace(/U_([A-Za-z][A-Za-z0-9]*)/g,'U<tspan baseline-shift="sub" font-size="72%">$1</tspan>');
  const text=(x,y,value,cls='',anchor='middle')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${sub(value)}</text>`;
  const line=(d,cls='')=>`<path d="${d}" class="pl-line ${cls}"/>`;
  const node=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" class="pl-node"/>`;
  function arrow(x,y,deg,len,cls='',extra=''){
    const p=point(deg,len),unit=point(deg),cross={x:-unit.y,y:unit.x},a={x:p.x-unit.x*7+cross.x*3,y:p.y-unit.y*7+cross.y*3},b={x:p.x-unit.x*7-cross.x*3,y:p.y-unit.y*7-cross.y*3};
    return `<g class="pl-arrow ${cls}" transform="translate(${x} ${y})" ${extra}><path d="M0 0L${p.x} ${p.y}"/><path d="M${a.x} ${a.y}L${p.x} ${p.y}L${b.x} ${b.y}"/></g>`;
  }
  const svg=(body,w,h,label,cls='')=>`<svg class="pl-svg ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  const button=(label,action,value='',extra='')=>`<button type="button" data-pl-action="${action}" data-value="${value}" ${extra}>${label}</button>`;
  const phaseAngles=[0,120,240],phaseNames=['A','B','C'];
  function winding(a,b){const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),deg=Math.atan2(dy,dx)*180/Math.PI-90;return `<g transform="translate(${a.x} ${a.y}) rotate(${deg})">${line(`M0 0V${length*.3}M0 ${length*.7}V${length}`)}<path class="pl-coil" d="M0 ${length*.3}${Array.from({length:4},()=>`a5 ${length*.05} 0 0 1 0 ${length*.1}`).join('')}"/></g>`;}
  function physical(s){
    const from=[{x:150,y:35},{x:150,y:240},{x:45,y:240}],to=[{x:45,y:140},{x:255,y:140},{x:150,y:240}],p=from.map((v,i)=>({x:v.x+(to[i].x-v.x)*s.layout,y:v.y+(to[i].y-v.y)*s.layout})),o={x:150,y:140};
    return svg(p.map((v,i)=>winding(o,v)+node(v.x,v.y)+text(v.x+(i===0?-14:i===1?14:0),v.y+(v.y<100?-13:v.y>200?24:-15),phaseNames[i],'pl-terminal')).join('')+node(o.x,o.y)+text(166,125,'O','pl-terminal'),300,280,s.copy.physicalAria);
  }
  function phasePlot(s,{rotation=s.rotation,time=0,reveal=3,difference=true}={}){
    const c={x:150,y:140},radius=76;let body=`<circle cx="150" cy="140" r="76" class="pl-circle"/><g data-pl-plot>`;
    for(let i=0;i<3;i++){
      const progress=Math.max(0,Math.min(1,reveal-i)),a=phaseAngles[i]*(s.building?progress:1)-time+rotation,p=point(a,98),alpha=s.building?(progress>0?1:0):progress;
      body+=`<g data-pl-phase="${i}" style="opacity:${alpha}">${arrow(c.x,c.y,a,radius,'pl-phase-'+i)}${text(c.x+p.x,c.y+p.y+6,'U_'+phaseNames[i],'pl-phase-label pl-phase-'+i)}</g>`;
    }
    if(difference&&!s.building){const a=point(-time+rotation,radius),b=point(120-time+rotation,radius),label=rotate({x:58,y:-41},rotation-time),v={x:a.x-b.x,y:a.y-b.y};body+=arrow(c.x+b.x,c.y+b.y,angle(v),Math.hypot(v.x,v.y),'pl-difference')+text(c.x+label.x,c.y+label.y,'U_AB','pl-difference-label');}
    if(reveal>=2){const a=point(-time+rotation,35),b=point(120-time+rotation,35),label=point(60-time+rotation,52);body+=line(`M${c.x+a.x} ${c.y+a.y}A35 35 0 0 1 ${c.x+b.x} ${c.y+b.y}`,'pl-angle-arc')+text(c.x+label.x,c.y+label.y+5,'120°','pl-angle-label');}
    body+='</g>'+node(c.x,c.y)+text(c.x-13,c.y+18,'O','pl-small','end');
    return svg(body,300,280,s.copy.phaseAria);
  }
  function waves(s){
    const x=61,width=282,rows=[50,124,198],amplitude=25;let body='';
    for(let i=0;i<3;i++){
      const y=rows[i];let d='';for(let t=0;t<=360;t+=3)d+=(t?'L':'M')+(x+width*t/360)+' '+(y-amplitude*waveform(t,phaseAngles[i]));
      body+=line(`M${x} ${y}H${x+width}`,'pl-axis')+`<path d="${d}" class="pl-wave pl-phase-${i}"/>`+text(28,y+7,'U_'+phaseNames[i],'pl-wave-label pl-phase-'+i);
      const peak=x+width*phaseAngles[i]/360;body+=`<circle cx="${peak}" cy="${y-amplitude}" r="4" class="pl-peak pl-phase-${i}"/>`;
      const cursor=x+width*s.time/360,cy=y-amplitude*waveform(s.time,phaseAngles[i]);body+=`<circle cx="${cursor}" cy="${cy}" r="5" class="pl-sample pl-sample-original pl-phase-${i}" style="opacity:${s.building?0:1}"/>`;
    }
    if(s.building){const i=Math.min(2,Math.floor(s.reveal)),progress=Math.max(0,Math.min(1,s.reveal-i)),offset=phaseAngles[i]*progress,px=x+width*offset/360,y=rows[i],cy=y-amplitude*waveform(offset,phaseAngles[i]);body+=`<path d="M${x} ${y+31}v5M${x} ${y+34}H${px}m0 -3v6" class="pl-time-span pl-phase-${i}"/><circle cx="${px}" cy="${cy}" r="6" class="pl-sample pl-sample-original pl-phase-${i}" style="opacity:${s.building?0:1}"/>`;}
    body+=`<g style="opacity:${s.building?0:1}">${line(`M${x+width*s.time/360} 12V235`,'pl-cursor')}</g>`+text(x,263,'0','pl-small')+text(x+width/3,263,'T/3','pl-small')+text(x+2*width/3,263,'2T/3','pl-small')+text(x+width,263,'T','pl-small');
    return svg(body,370,280,s.copy.waveAria);
  }
  function scene0(s){return `<div class="pl-compare"><figure><figcaption>${esc(s.copy.physicalTitle)}</figcaption><div data-pl-physical>${physical(s)}</div>${button(s.copy.rearrange,'layout')}<p class="pl-caption">${esc(s.copy.physicalCaption)}</p></figure><figure><figcaption>${esc(s.copy.phaseTitle)}</figcaption><div data-pl-phases>${phasePlot(s)}</div>${button(s.copy.rotateAll,'plot-rotate')}<p class="pl-caption">${esc(s.copy.phaseCaption)}</p></figure></div><p class="pl-key" data-pl-note>${esc(s.copy.spaceNote)}</p>`;}
  function scene1(s){return `<p class="pl-mode-status" data-pl-mode role="status">${esc(s.building?s.copy.buildingNote:s.copy.referenceNote)}</p><div class="pl-timing"><figure><figcaption>${esc(s.copy.waveTitle)}</figcaption><div data-pl-waves>${waves(s)}</div><p class="pl-caption">${esc(s.copy.periodDefinition)}</p></figure><figure><figcaption>${esc(s.copy.timePhaseTitle)}</figcaption><div data-pl-time-phases>${phasePlot(s,{rotation:0,time:s.time,reveal:s.reveal,difference:s.difference})}</div></figure></div><div class="pl-fractions"><span><b>U<sub>A</sub></b> 0 → 0°</span><span><b>U<sub>B</sub></b> T/3 → 120°</span><span><b>U<sub>C</sub></b> 2T/3 → 240°</span></div><p class="pl-key">${prose(s.copy.timeNote)}</p><div class="pl-actions">${button(s.copy.build,'build')}${button(s.copy.period,'period')}${button(s.copy.difference,'difference','',`aria-pressed="${s.difference}"`)}</div>${s.difference?`<p class="pl-caption">${prose(s.copy.differenceNote)}</p>`:''}`;}
  function clockFace(cx,cy,r=107){let b=`<circle cx="${cx}" cy="${cy}" r="${r}" class="pl-clock-rim"/>`;for(let i=0;i<12;i++){const a=point(i*30,r-6),z=point(i*30,r),label=point(i*30,r+20);b+=line(`M${cx+a.x} ${cy+a.y}L${cx+z.x} ${cy+z.y}`,'pl-clock-tick')+text(cx+label.x,cy+label.y+6,i||12,'pl-clock-number');}return b;}
  function arc(cx,cy,deg){if(deg<=.01)return '';const r=94,p=point(Math.min(359.9,deg),r);return `<path d="M${cx} ${cy-r}A${r} ${r} 0 ${deg>180?1:0} 1 ${cx+p.x} ${cy+p.y}" class="pl-clock-arc"/>`;}
  function taskGeometry(s){
    const mobile=s.mobile,cx=mobile?220:650,cy=mobile?490:170,stage=s.task;
    const given=s.copy.diagram;
    const pair=s.copy.given.map((v,i)=>{
      const origin={x:v.x+(cx-v.x)*Math.min(1,Math.max(0,stage-2)),y:v.y+(cy-v.y)*Math.min(1,Math.max(0,stage-2))};
      const moved=stage>=3,turn=moved?s.pairTurn:0,classes=i?'pl-lv':'pl-hv';
      return `<g data-pl-copy="${i}" transform="translate(${origin.x} ${origin.y}) rotate(${turn})" style="opacity:${stage>=2?1:0}">${arrow(0,0,v.angle,v.length,classes)}${text(v.labelX,v.labelY,v.label,'pl-vector-name '+classes,v.anchor||'middle').replace('<text ',`<text transform="rotate(${-turn} ${v.labelX} ${v.labelY})" `)}</g>`;
    }).join('');
    let body=`<g class="pl-task-original" style="opacity:${stage>=2?.52:1}">${given}</g>`;
    if(stage>=.5&&stage<1.5)body+='<rect x="10" y="8" width="200" height="123" rx="7" class="pl-region"/>';
    if(stage>=1.5&&stage<2)body+='<rect x="9" y="172" width="190" height="130" rx="7" class="pl-region"/>';
    body+=clockFace(cx,cy)+`<g class="pl-key-guides">${line(`M${cx} ${cy}V${cy-110}`,'pl-axis')}</g>`+pair+node(cx,cy)+arc(cx,cy,s.arc)+(s.arc>0?text(cx,cy+153,s.task>=4?`${solution(s).hour} · 30° = ${solution(s).delta}°`:`${Math.round(s.arc)}°`,'pl-angle-result'):'');
    if(s.arc>5){for(let h=1;h<=Math.min(11,Math.floor(s.arc/30));h++){const p=point(h*30,107);body+=`<circle cx="${cx+p.x}" cy="${cy+p.y}" r="4" class="pl-count-dot"/>`;}}
    return svg(body,mobile?440:810,mobile?650:330,s.copy.taskAria,'pl-task-svg');
  }
  function taskPrompt(s){const q=window.VV_DATA?.questions?.find(q=>q.id===s.copy.questionId);return q||s.copy.fallbackQuestion;}
  function solution(s){const delta=norm(s.copy.given[1].angle-s.copy.given[0].angle),hour=Math.round(delta/30)%12;return {delta,hour,symbol:s.copy.symbols.join('')+hour};}
  function taskOptions(s){const q=taskPrompt(s),done=s.task>=4,options=q.options||[],correct=(Array.isArray(q.answer)?q.answer:[q.answer]).map(String);return `<div class="pl-task-options" role="group" aria-label="${esc(s.copy.answerChoices)}">${options.map((o,i)=>{const value=typeof o==='string'?o:o.text,right=correct.includes(value);return `<span class="pl-task-option ${done&&right?'is-correct':''}"><b>${String.fromCharCode(65+i)}</b>${esc(value)}${done&&right?'<span aria-label="Helyes megoldás">✓</span>':''}</span>`}).join('')}</div>`;}
  function transfer(s){
    const cx=145,cy=145;let b=clockFace(cx,cy,100);b+=arrow(cx,cy,s.transferTurn,76,'pl-hv')+arrow(cx,cy,s.transferTurn+solution(s).delta,65,'pl-lv');
    const a=point(s.transferTurn,90),z=point(s.transferTurn+solution(s).delta,84);b+=text(cx+a.x+12,cy+a.y+6,'U_A','pl-vector-name pl-hv','start')+text(cx+z.x,cy+z.y-12,'U_a','pl-vector-name pl-lv');
    const chosen=s.transfer!==null;
    return `<section class="pl-transfer"><h4>${esc(s.copy.transferTitle)}</h4><p>${prose(s.copy.transferPrompt)}</p><p class="pl-caption">${prose(s.transferTurn===90?s.copy.transferInitial:s.transferTurn===0?s.copy.transferAligned:s.copy.transferTurning)}</p><div class="pl-transfer-grid">${svg(b,310,290,s.copy.transferAria)}<div><div class="pl-transfer-choices">${s.copy.transferChoices.map(v=>button(String(v),'transfer-answer',v,`aria-pressed="${s.transfer===v}"`)).join('')}</div>${chosen?`<p class="pl-transfer-feedback ${s.transfer===solution(s).hour?'is-correct':'is-wrong'}">${prose(s.copy.transferFeedback[s.transfer])}</p>${button(s.copy.verifyRotation,'transfer-align')}`:''}</div></div></section>`;
  }
  function scene2(s){const q=taskPrompt(s);return `<div class="pl-task-heading"><p>${esc(q.prompt)}</p><a href="#question/${encodeURIComponent(s.copy.questionId)}">${esc(s.copy.openQuestion)}</a><a href="#" data-zoom-asset="${esc(s.copy.originalPath)}" data-zoom-caption="${esc(s.copy.taskAria)}" aria-haspopup="dialog">${esc(s.copy.zoom)}</a></div><p class="pl-task-caution">${prose(s.copy.taskCaution)}</p><div data-pl-task>${taskGeometry(s)}</div><div class="pl-answer-parts" aria-live="polite"><span class="${s.task>=1?'is-filled':''}">${s.task>=1?s.copy.symbols[0]:'—'}</span><span class="${s.task>=2?'is-filled':''}">${s.task>=2?s.copy.symbols[1]:'—'}</span><span class="${s.task>=4?'is-filled':''}">${s.task>=4?solution(s).hour:'—'}</span><strong>${s.task>=4?solution(s).symbol:''}</strong></div><p class="pl-key" data-pl-task-note>${prose(s.copy.taskNotes[Math.min(4,Math.floor(s.task))])}</p>${taskOptions(s)}<div class="pl-actions pl-task-controls">${button(s.solutionTime>0&&s.solutionTime<6000?s.copy.continue:s.copy.solve,'solve')}${button(s.copy.rotatePair,'pair-rotate','',s.task<4?'disabled':'')}${button(s.copy.alignPair,'pair-align','',s.task<4?'disabled':'')}</div>${s.task>=4?transfer(s):''}`;}
  function contents(s){return `<nav class="pl-scenes" aria-label="${esc(s.copy.navigation)}">${s.copy.scenes.map((name,i)=>button(esc(name),'scene',i,`aria-current="${s.scene===i?'step':'false'}"`)).join('')}</nav><div class="pl-scene" data-pl-scene="${s.scene}">${[scene0,scene1,scene2][s.scene](s)}</div>`;}
  function render(copy,key='transformer-phase-lab'){if(!copy?.scenes)return '<p>Az új ábrához frissítsd az oldalt.</p>';const s=get(key);s.copy=copy;return `<section class="phase-lab" data-phase-lab="${esc(key)}" aria-label="${esc(copy.title)}">${contents(s)}</section>`;}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function mount(host){for(const root of host.querySelectorAll('[data-phase-lab]')){
    if(controllers.has(root))continue;const s=get(root.dataset.phaseLab),controller={frame:0,token:0,playing:false};controllers.set(root,controller);
    const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stop=()=>{controller.token++;cancelAnimationFrame(controller.frame);controller.playing=false;root.querySelector('[data-pl-action="solve"]')?.replaceChildren(document.createTextNode(s.copy.solve));};
    const responsive=()=>{s.mobile=root.clientWidth<610;};responsive();
    const repaint=()=>{const focused=document.activeElement,action=focused?.dataset?.plAction;root.innerHTML=contents(s);if(action)root.querySelector(`[data-pl-action="${action}"]`)?.focus({preventScroll:true});};
    const drawPhysical=()=>{root.querySelector('[data-pl-physical]').innerHTML=physical(s);};
    const drawPlot=()=>{root.querySelector('[data-pl-phases]').innerHTML=phasePlot(s);};
    const drawTime=()=>{const mode=root.querySelector('[data-pl-mode]'),caption=s.building?s.copy.buildingNote:s.time?s.copy.playingNote:s.copy.referenceNote;if(mode&&mode.textContent!==caption)mode.textContent=caption;root.querySelector('[data-pl-waves]').innerHTML=waves(s);root.querySelector('[data-pl-time-phases]').innerHTML=phasePlot(s,{rotation:0,time:s.time,reveal:s.reveal,difference:s.difference});};
    const drawTask=()=>{root.querySelector('[data-pl-task]').innerHTML=taskGeometry(s);const note=root.querySelector('[data-pl-task-note]');if(note)note.innerHTML=prose(s.copy.taskNotes[Math.min(4,Math.floor(s.task))]);const parts=root.querySelector('.pl-answer-parts');if(parts&&parts.dataset.milestone!==String(Math.floor(s.task))){parts.dataset.milestone=String(Math.floor(s.task));parts.innerHTML=`<span class="${s.task>=1?'is-filled':''}">${s.task>=1?s.copy.symbols[0]:'—'}</span><span class="${s.task>=2?'is-filled':''}">${s.task>=2?s.copy.symbols[1]:'—'}</span><span class="${s.task>=4?'is-filled':''}">${s.task>=4?solution(s).hour:'—'}</span><strong>${s.task>=4?solution(s).symbol:''}</strong>`;}};
    function tween(duration,update,done=()=>{}){const token=++controller.token,begun=performance.now(),actual=reduce()?1:duration;controller.playing=true;const tick=now=>{if(token!==controller.token||!root.isConnected)return;const t=Math.min(1,(now-begun)/actual);update(ease(t),t);if(t<1)controller.frame=requestAnimationFrame(tick);else{controller.playing=false;done();}};controller.frame=requestAnimationFrame(tick);}
    function solve(){
      if(controller.playing){stop();root.querySelector('[data-pl-action="solve"]').textContent=s.copy.continue;return;}
      if(!s.solutionTime||s.solutionTime>=6000){s.solutionTime=0;s.task=0;s.arc=0;s.pairTurn=0;s.transfer=null;repaint();}
      const board=root.querySelector('[data-pl-task]'),bounds=board.getBoundingClientRect();if(bounds.top<16||bounds.bottom>innerHeight-110)board.scrollIntoView({block:'center',behavior:reduce()?'instant':'smooth'});
      const from=s.solutionTime;
      tween(6000-from,(_,t)=>{
        const elapsed=from+(6000-from)*t;s.solutionTime=elapsed;
        if(elapsed<1100)s.task=ease(elapsed/1100);
        else if(elapsed<2200)s.task=1+ease((elapsed-1100)/1100);
        else if(elapsed<4000)s.task=2+ease((elapsed-2200)/1800);
        else{s.task=3;s.arc=solution(s).delta*ease((elapsed-4000)/2000);}
        drawTask();
      },()=>{s.task=4;s.arc=solution(s).delta;s.solutionTime=6000;repaint();});
      root.querySelector('[data-pl-action="solve"]').textContent=s.copy.stop;
    }
    root.addEventListener('click',event=>{
      const b=event.target.closest('[data-pl-action]');if(!b||!root.contains(b))return;const action=b.dataset.plAction,value=Number(b.dataset.value);
      if(action==='solve'){solve();return;}stop();
      if(action==='scene'){s.scene=value;s.building=false;repaint();return;}
      if(action==='layout'){const from=s.layout,to=from>.5?0:1;tween(1300,t=>{s.layout=from+(to-from)*t;drawPhysical()},()=>{const n=root.querySelector('[data-pl-note]');if(n)n.textContent=s.copy.spaceNoteDone;});}
      else if(action==='plot-rotate'){const from=s.rotation,to=from<0?0:-60;tween(1600,t=>{s.rotation=from+(to-from)*t;drawPlot()},()=>root.querySelector('[data-pl-note]').textContent=s.copy.rotationNote);}
      else if(action==='build'){s.time=0;s.reveal=1;s.building=true;tween(2600,t=>{s.reveal=1+2*t;drawTime();},()=>{s.building=false;s.reveal=3;drawTime()});}
      else if(action==='period'){s.building=false;s.reveal=3;tween(6000,(_,t)=>{s.time=360*t;drawTime()},()=>{s.time=0;drawTime()});}
      else if(action==='difference'){s.building=false;s.reveal=3;s.time=0;s.difference=!s.difference;repaint();}
      else if(action==='pair-rotate'||action==='pair-align'){if(s.task<4)return;s.solutionTime=6000;const from=s.pairTurn,to=action==='pair-align'?0:from+90;s.arc=0;tween(1600,t=>{s.pairTurn=from+(to-from)*t;drawTask()},()=>{root.querySelector('[data-pl-task-note]').innerHTML=prose(s.copy.pairRotateNote);});}
      else if(action==='transfer-answer'){s.transfer=value;repaint();}
      else if(action==='transfer-align'){const from=s.transferTurn;tween(1500,t=>{s.transferTurn=from*(1-t);const el=root.querySelector('.pl-transfer');if(el)el.outerHTML=transfer(s)});}
    });
    const observer=new ResizeObserver(()=>{if(!root.isConnected){observer.disconnect();return;}const mobile=root.clientWidth<610;if(mobile!==s.mobile){stop();s.mobile=mobile;repaint();}});observer.observe(root);repaint();
  }}
  function selectScene(host,scene=0){for(const root of host.querySelectorAll('[data-phase-lab]')){const control=controllers.get(root);if(control){control.token++;cancelAnimationFrame(control.frame);control.playing=false;}const s=get(root.dataset.phaseLab);s.scene=scene;root.innerHTML=contents(s);}}
  window.VVTransformerPhaseLab={render,mount,selectScene,model:{norm,point,angle,rotate,clock,waveform,phaseAngles}};
})();

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
      case 6:return window.VVTransformerPhaseLab.render(s.copy.phaseLab);
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
    window.VVTransformerPhaseLab?.mount(panel);
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
  function openBridge(host,scene=2){for(const panel of host.querySelectorAll('[data-tf-key]')){const s=stateByKey.get(panel.dataset.tfKey);if(s){stop(panel);s.step=6;update(panel,s);window.VVTransformerPhaseLab.selectScene(panel,scene);panel.scrollIntoView({block:'start',behavior:'auto'});}}}
  window.VVLearningTransformers={matches,render,mount,model,netlist,angleOf,normal,groups,openBridge};
})();
