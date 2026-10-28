(function(){
  'use strict';
  // All bodies, panels, feet, sockets and probes use the same orthographic camera.
  const yaw=35*Math.PI/180,pitch=25*Math.PI/180;
  const X=[Math.cos(yaw),Math.sin(yaw)*Math.sin(pitch)],Y=[Math.sin(yaw),-Math.cos(yaw)*Math.sin(pitch)],Z=[0,-Math.cos(pitch)];
  const project=(x,y,z=0)=>[18+x*X[0]+y*Y[0]+z*Z[0],188+x*X[1]+y*Y[1]+z*Z[1]];
  const pt=p=>p.map(n=>n.toFixed(3)).join(',');
  const polygon=(points,fill,extra='')=>`<polygon points="${points.map(p=>pt(project(...p))).join(' ')}" fill="${fill}" ${extra}/>`;
  const line=(points,stroke,width=1.2,extra='')=>`<path d="${points.map((p,i)=>(i?'L':'M')+pt(project(...p))).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const matrix=(x,y,z,plane='front')=>{const p=project(x,y,z),v=plane==='front'?[-Z[0],-Z[1]]:Y;return `matrix(${X[0]} ${X[1]} ${v[0]} ${v[1]} ${p[0]} ${p[1]})`};
  function housing(x,y,w,d,h,id){
    let feet='';for(const u of [9,w-22])feet+=polygon([[x+u,y+4,0],[x+u+13,y+4,0],[x+u+13,y+4,6],[x+u,y+4,6]],'#122e34')+polygon([[x+u+13,y+4,0],[x+u+13,y+17,0],[x+u+13,y+17,6],[x+u+13,y+4,6]],'#0b242d');
    return `${feet}${polygon([[x,y,6],[x+w,y,6],[x+w,y+d,6],[x,y+d,6]],'#283c43')}${polygon([[x+w,y,6],[x+w,y+d,6],[x+w,y+d,h+6],[x+w,y,h+6]],'url(#r12-side)',`data-body-face="${id}-side"`)}${polygon([[x,y,h+6],[x+w,y,h+6],[x+w,y+d,h+6],[x,y+d,h+6]],'url(#r12-top)',`data-body-face="${id}-top"`)}${polygon([[x,y,6],[x+w,y,6],[x+w,y,h+6],[x,y,h+6]],'url(#r12-front)',`data-body-face="${id}-front"`)}${line([[x,y,h+6],[x+w,y,h+6],[x+w,y+d,h+6]],'#dce4da',.8)}${Array.from({length:5},(_,i)=>line([[x+w+.12,y+12,h-15-i*7],[x+w+.12,y+d-12,h-15-i*7]],'#8c9f98',1.4)).join('')}`;
  }
  const screw=(x,y)=>`<g transform="translate(${x} ${y})"><circle r="2.2" fill="#b9c7c1" stroke="#798e88" stroke-width=".65"/><path d="M-1.2 0h2.4" stroke="#5b716c" stroke-width=".8"/></g>`;
  function knob(x,y,r=7){return `<g transform="translate(${x} ${y})"><circle cx=".8" cy="1.1" r="${r+1}" fill="#70837d"/><circle r="${r}" fill="#294850" stroke="#dce5db" stroke-width=".8"/><circle r="${r-2}" fill="#355963"/><path d="M0 -${r-2}v3" stroke="#e4c083" stroke-width="1.4" stroke-linecap="round"/></g>`}
  const socket=(x,y,id,color)=>`<g data-header-socket="${id}" transform="translate(${x} ${y})"><circle r="5" fill="#70847e"/><circle r="3.5" fill="${color}" stroke="#d9ded1" stroke-width=".8"/><circle r="1.7" fill="#172f37"/></g>`;
  function cable(from,tip,direction,color,id){
    const back=[tip[0]+direction[0]*35,tip[1]+direction[1]*35,4],inner=[tip[0]+direction[0]*9,tip[1]+direction[1]*9,4],perp=[-direction[1]*3,direction[0]*3];
    // The right-hand lead approaches from outside the housing, never beneath it.
    const approachX=back[0]+(id==='meter-minus'?5:-35);
    const controls=[from,[from[0]+5,from[1]-40,5],[approachX,back[1]-35,5],back].map(p=>project(...p));
    const path=`M${pt(controls[0])}C${pt(controls[1])} ${pt(controls[2])} ${pt(controls[3])}`;
    return `<path d="${path}" stroke="#0a2630" stroke-width="4.3" stroke-linecap="round"/><path data-header-cable="${id}" d="${path}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>${polygon([[back[0]+perp[0],back[1]+perp[1],4],[inner[0]+perp[0],inner[1]+perp[1],4],[inner[0]-perp[0],inner[1]-perp[1],4],[back[0]-perp[0],back[1]-perp[1],4]],'#33555d','stroke="#829a93" stroke-width=".6"')}${line([inner,tip],'#d6d9c9',1.5,`data-header-probe="${id}"`)}`;
  }
  const wave=(amplitude,phase)=>Array.from({length:273},(_,i)=>{const x=-48+i*.85,y=38.5-amplitude*Math.sin((x+phase)*Math.PI/24);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`}).join('');
  function header(){
    const ticks=Array.from({length:31},(_,i)=>{const a=Math.PI+i*Math.PI/30,r=i%5?38:34;return `<path d="M${66+Math.cos(a)*r} ${62+Math.sin(a)*r}L${66+Math.cos(a)*42} ${62+Math.sin(a)*42}" stroke-width="${i%5?.65:1.3}"/>`}).join('');
    const board=[[0,0,0],[380,0,0],[380,210,0],[0,210,0]];
    const channels=[[[110,35,2],[110,12,2],[245,12,2],[245,25,2],[280,25,2]],[[95,60,2],[85,60,2],[85,18,2],[319,18,2],[319,40,2]]];
    const pads=[[110,35,2],[280,25,2],[319,40,2]];
    const surface=(x,y,z=2)=>`<g transform="${matrix(x,y,z,'board')}"><circle r="5.3" fill="#a47543"/><circle r="3.1" fill="#e6c68a"/><circle r="1.2" fill="#304e56"/></g>`;
    return `<svg class="vv-dash-instrument vv-dash-workbench r12-workbench" viewBox="0 0 520 300" fill="none" aria-hidden="true" focusable="false" data-projection="orthographic-yaw35-pitch25">
      <defs><linearGradient id="r12-top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e2eadd"/><stop offset="1" stop-color="#a8bcb2"/></linearGradient><linearGradient id="r12-front" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ecf0e5"/><stop offset="1" stop-color="#c2cec2"/></linearGradient><linearGradient id="r12-side" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a4b7ad"/><stop offset="1" stop-color="#788f86"/></linearGradient><linearGradient id="r12-board"><stop stop-color="#244e56"/><stop offset="1" stop-color="#142e38"/></linearGradient><radialGradient id="r12-shadow"><stop stop-color="#001d27" stop-opacity=".5"/><stop offset="1" stop-color="#001d27" stop-opacity="0"/></radialGradient><clipPath id="r12-scope-clip"><rect x="12" y="13" width="101" height="51" rx="2"/></clipPath></defs>
      <ellipse cx="270" cy="258" rx="210" ry="35" fill="url(#r12-shadow)"/>
      ${polygon([[0,0,-7],[380,0,-7],[380,0,0],[0,0,0]],'#0c2731')}${polygon([[380,0,-7],[380,210,-7],[380,210,0],[380,0,0]],'#0a222e')}${polygon(board,'url(#r12-board)','stroke="#71958f" stroke-width=".8"')}
      <g>${channels.map(p=>line(p,'#bd8a55',1.8)).join('')}${channels.map((p,i)=>line(p,'#f6d899',2.5,`class="r12-current-trace" data-header-trace="${i}" pathLength="1" stroke-dasharray=".085 .915" opacity="0"`)).join('')}</g>
      ${[[30,17],[360,17],[360,190],[24,190]].map(([x,y])=>surface(x,y,.3)).join('')}${pads.map(p=>surface(...p)).join('')}
      ${housing(35,105,150,70,96,'scope')}
      <g transform="${matrix(35,105,102)}" data-header-panel="scope"><rect x="6" y="6" width="138" height="84" rx="3" fill="#b8c8bd" stroke="#8ba398" stroke-width=".7"/><rect x="9" y="10" width="107" height="57" rx="4" fill="#203b48" stroke="#779d98" stroke-width="1.5"/><g clip-path="url(#r12-scope-clip)"><rect x="12" y="13" width="101" height="51" fill="#0d2938"/><g stroke="#89bfb5" stroke-opacity=".14" stroke-width=".55">${[22,37,52,67,82,97].map(x=>`<path d="M${x} 13v51"/>`).join('')}${[23,33,43,53].map(y=>`<path d="M12 ${y}h101"/>`).join('')}</g><g data-header-wave="primary"><path d="${wave(12,0)}" stroke="#a6dfd1" stroke-opacity=".14" stroke-width="4.5"/><path d="${wave(12,0)}" stroke="#acebda" stroke-width="1.2"/></g><g data-header-wave="secondary"><path d="${wave(6,12)}" stroke="#e2bd81" stroke-width="1" opacity=".85"/></g></g>${knob(129,22,7)}${knob(129,45,7)}${knob(21,81,5)}${knob(47,81,5)}${socket(78,81,'scope','#d1b170')}${socket(104,81,'scope-spare','#a2c7bd')}<circle cx="130" cy="66" r="2.3" fill="#63bca0" data-header-led/>${[[4,4],[146,4],[4,92],[146,92]].map(p=>screw(...p)).join('')}</g>
      ${housing(215,52,132,82,106,'meter')}
      <g transform="${matrix(215,52,112)}" data-header-panel="meter"><rect x="8" y="9" width="116" height="67" rx="4" fill="#5d766e"/><rect x="11" y="12" width="110" height="61" rx="3" fill="#fffbed"/><path d="M24 62a42 42 0 0 1 84 0" stroke="#b5b5a6" stroke-width=".7"/><g stroke="#546e68">${ticks}</g><path d="M100 39a42 42 0 0 1 6 12" stroke="#b78152" stroke-width="2"/><line data-header-needle x1="66" y1="62" x2="80.706" y2="28.995" stroke="#b57c45" stroke-width="1.8" stroke-linecap="round"/><circle cx="66" cy="62" r="3.1" fill="#647c72"/>${knob(31,91,9)}${socket(84,91,'meter-plus','#c18d60')}${socket(110,91,'meter-minus','#536e7a')}${[[4,4],[128,4],[4,102],[128,102]].map(p=>screw(...p)).join('')}<path d="M15 68q32-50 90-46" stroke="#fff" stroke-opacity=".3" stroke-width="2.2"/></g>
      ${cable([113,105,21],[110,35,2],[.8,.6],'#809cac','scope')}${cable([299,52,21],[280,25,2],[.8,.6],'#d49a62','meter-plus')}${cable([325,52,21],[319,40,2],[.96,-.28],'#627e8b','meter-minus')}
    </svg>`;
  }
  function setup(host){
    const hero=host.querySelector('.vv-dash-hero'),svg=hero?.querySelector('.r12-workbench');if(!hero||!svg||hero.dataset.r12MotionReady)return;
    hero.dataset.r12MotionReady='true';const reduced=matchMedia('(prefers-reduced-motion:reduce)');let raf=0,last=0,elapsed=0,inView=false;
    const primary=svg.querySelector('[data-header-wave=primary]'),secondary=svg.querySelector('[data-header-wave=secondary]'),needle=svg.querySelector('[data-header-needle]'),led=svg.querySelector('[data-header-led]'),traces=[...svg.querySelectorAll('[data-header-trace]')];
    const frame=p=>{const phase=p*Math.PI*2,angle=(-66+18*Math.sin(phase)+5*Math.sin(phase*2))*Math.PI/180;primary.setAttribute('transform',`translate(${-48*p} 0)`);secondary.setAttribute('transform',`translate(${-48*p} 0)`);needle.setAttribute('x2',String(66+36*Math.cos(angle)));needle.setAttribute('y2',String(62+36*Math.sin(angle)));led.setAttribute('opacity',String(.6+.4*Math.sin(phase*2)**2));traces.forEach((t,i)=>{t.setAttribute('stroke-dashoffset',String(-p));t.setAttribute('opacity',String(Math.sin(Math.PI*p)**2*(i?.5:.85)))})};
    const canPlay=()=>!reduced.matches&&!document.hidden&&inView&&hero.isConnected&&hero.getClientRects().length;
    const stop=()=>{cancelAnimationFrame(raf);raf=0;last=0};
    // Each part returns to the same pose after 4.8 seconds, so the cycle joins seamlessly.
    const tick=now=>{raf=0;if(!canPlay()){last=0;return}if(last)elapsed+=now-last;last=now;frame((elapsed%4800)/4800);raf=requestAnimationFrame(tick)};
    const sync=()=>{if(canPlay()){if(!raf)raf=requestAnimationFrame(tick)}else stop()};
    const visibility=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;sync()});visibility.observe(hero);
    document.addEventListener('visibilitychange',sync);
    reduced.addEventListener('change',()=>{if(reduced.matches){stop();elapsed=0;frame(0)}else sync()});frame(0);
  }
  window.VV_DASH_ART=Object.freeze({header,setup,projection:()=>({origin:[18,188],x:X,y:Y,z:Z,project})});
})();
