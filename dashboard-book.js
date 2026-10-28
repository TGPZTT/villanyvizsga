(function(root){
 'use strict';
 // One object in one orthographic camera. The binding is x=0, not a painted
 // second band. A rigid cover has separately projected top and thickness faces.
 const W=80,L=112,T=15,C=2.2,MAX=38*Math.PI/180,controllers=new WeakMap();
 const project=([x,y,z])=>({x:33+.82*x+.86*y,y:111-.47*x+.50*y-.95*z});
 const r=n=>Number(n.toFixed(6));
 const path=points=>'M'+points.map(v=>{const p=project(v);return r(p.x)+' '+r(p.y)}).join('L')+'Z';
 const line=points=>'M'+points.map(v=>{const p=project(v);return r(p.x)+' '+r(p.y)}).join('L');
 const rotate=([x,y,z],theta)=>project([x*Math.cos(theta)-z*Math.sin(theta),y,T+x*Math.sin(theta)+z*Math.cos(theta)]);
 const planes={top:[[0,0,C],[W,0,C],[0,L,C]],spine:[[0,0,0],[0,L,0],[0,0,C]],front:[[0,L,0],[W,L,0],[0,L,C]],leaf:[[0,3,0],[W-3,3,0],[0,L-3,0]]};
 function matrix(plane,progress){
  const triangle=planes[plane],angle=plane==='leaf'?0:MAX*progress;
  const base=triangle.map(([x,y,z])=>project([x,y,T+z]));
  const dest=triangle.map(p=>rotate(p,angle));
  const u={x:base[1].x-base[0].x,y:base[1].y-base[0].y},v={x:base[2].x-base[0].x,y:base[2].y-base[0].y};
  const a={x:dest[1].x-dest[0].x,y:dest[1].y-dest[0].y},b={x:dest[2].x-dest[0].x,y:dest[2].y-dest[0].y};
  const det=u.x*v.y-v.x*u.y;
  const m={a:(a.x*v.y-b.x*u.y)/det,c:(b.x*u.x-a.x*v.x)/det,b:(a.y*v.y-b.y*u.y)/det,d:(b.y*u.x-a.y*v.x)/det};
  m.e=dest[0].x-m.a*base[0].x-m.c*base[0].y;m.f=dest[0].y-m.b*base[0].x-m.d*base[0].y;
  return m;
 }
 function render(id='dash-book-r12'){
  const at=(x,y,z=T)=>[x,y,z];
  const rect=(x1,y1,x2,y2,z)=>path([at(x1,y1,z),at(x2,y1,z),at(x2,y2,z),at(x1,y2,z)]);
  const face=(points,attributes)=>`<path d="${path(points)}" ${attributes}/>`;
  const pageLines=Array.from({length:6},(_,i)=>`<path d="${line([at(2,L-2,2+i*2),at(W-2,L-2,2+i*2)])}"/>`).join('');
  const printLines=Array.from({length:8},(_,i)=>`<path d="${line([at(12,16+i*10),at(i===6?48:66,16+i*10)])}"/>`).join('');
  const o=project(at(0,0,T+C));
  // The ribbon lies between the last visible leaf and the paper block. Its
  // free tail exits only the lower cut (y=L), folds, then hangs down in z.
  const ribbon=[[47,110,T-.15],[54.4,110,T-.15],[54.4,112,T-.15],[54.4,115,T-1],[54.4,118,5],[54.4,121,-2],[50.7,120,.3],[47,121,-2],[47,118,5],[47,115,T-1],[47,112,T-.15]];
  return `<svg class="vv-dash-object vv-dash-object--learn r12-book-svg" viewBox="0 0 220 190" fill="none" aria-hidden="true"><defs>
   <linearGradient id="${id}-cover" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#6a80ac"/><stop offset=".42" stop-color="#3b5689"/><stop offset="1" stop-color="#263d67"/></linearGradient>
   <linearGradient id="${id}-spine" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="#263b61"/><stop offset=".45" stop-color="#304b78"/><stop offset="1" stop-color="#1e3355"/></linearGradient>
   <linearGradient id="${id}-paper" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fffdf3"/><stop offset="1" stop-color="#e3ded0"/></linearGradient>
   <linearGradient id="${id}-foil" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe4a5"/><stop offset=".48" stop-color="#d5a35e"/><stop offset=".65" stop-color="#f4ce89"/><stop offset="1" stop-color="#a66b35"/></linearGradient>
   <linearGradient id="${id}-ribbon" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#dda048"/><stop offset=".5" stop-color="#edc36e"/><stop offset="1" stop-color="#a66b2b"/></linearGradient>
   <radialGradient id="${id}-shadow"><stop stop-color="#363246" stop-opacity=".25"/><stop offset="1" stop-color="#363246" stop-opacity="0"/></radialGradient>
   <pattern id="${id}-grain" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".5" r=".2" fill="#fff" opacity=".18"/><path d="M0 2h1" stroke="#fff" opacity=".06" stroke-width=".5"/></pattern>
  </defs>
  <ellipse cx="121" cy="168" rx="91" ry="15" fill="url(#${id}-shadow)"/>
  <g data-book-part="back-board">
   ${face([at(-1,0,-2),at(W+1,0,-2),at(W+1,L+2,-2),at(-1,L+2,-2)],`fill="#263c62"`)}
   ${face([at(-1,L+2,-2),at(W+1,L+2,-2),at(W+1,L+2,0),at(-1,L+2,0)],`fill="#1f3357"`)}
   <path d="${rect(-1,0,W+1,L+2,0)}" fill="#354c74"/>
  </g>
  <g data-book-part="paper-block">
   ${face([at(2,L-2,1),at(W-2,L-2,1),at(W-2,L-2,T),at(2,L-2,T)],`fill="url(#${id}-paper)" stroke="#c8c1b2" stroke-width=".45"`)}
   <g stroke="#b7af9f" stroke-width=".45" opacity=".72">${pageLines}</g>
   <path d="${rect(1,2,W-2,L-2,T)}" fill="#f5f0e4" stroke="#d7d0bf" stroke-width=".5"/>
  </g>
  <g data-book-part="single-bound-spine">
   ${face([at(0,0,-2),at(0,L+2,-2),at(0,L+2,T),at(0,0,T)],`fill="url(#${id}-spine)" stroke="#263a5b" stroke-width=".5"`)}
   <path d="${rect(0,1,2,L,T)}" fill="#293d60"/>
   <g fill="url(#${id}-foil)" opacity=".85">
    ${face([at(-.05,12,1),at(-.05,14,1),at(-.05,14,T-2),at(-.05,12,T-2)],'')}
    ${face([at(-.05,L-14,1),at(-.05,L-12,1),at(-.05,L-12,T-2),at(-.05,L-14,T-2)],'')}
   </g>
  </g>
  <path data-book-part="ribbon-between-pages" d="${path(ribbon)}" fill="url(#${id}-ribbon)" stroke="#ad7732" stroke-width=".25"/>
  <path d="${line([[48.1,110,T-.15],[48.1,115,T-1],[48.1,118,5],[48.1,120,-.1]])}" stroke="#fbe3aa" stroke-width=".6" opacity=".8"/>
  <g class="r12-book-page" data-book-plane="leaf" data-book-part="fixed-first-page">
   <path d="${rect(0,3,W-3,L-3,T)}" fill="url(#${id}-paper)" stroke="#c7c0af" stroke-width=".45"/>
   <path d="${rect(0,3,5,L-3,T)}" fill="#384e70" opacity=".12"/>
   <g stroke="#969b9b" stroke-width=".65" opacity=".64">${printLines}</g>
   <path d="${rect(12,12,35,16,T)}" fill="#6d86a0" opacity=".5"/>
  </g>
  <g class="r12-book-face" data-book-plane="front" data-book-part="front-cover-thickness">
   ${face([at(0,L,T),at(W,L,T),at(W,L,T+C),at(0,L,T+C)],'fill="#263d66" stroke="#22375c" stroke-width=".4"')}
  </g>
  <g class="r12-book-face" data-book-plane="spine" data-book-part="cover-bound-edge">
   ${face([at(0,0,T),at(0,L,T),at(0,L,T+C),at(0,0,T+C)],'fill="#2d466e" stroke="#2d466e" stroke-width=".4"')}
  </g>
  <g class="r12-book-face" data-book-plane="top" data-book-part="front-cover">
   <path d="${rect(0,0,W,L,T+C)}" fill="url(#${id}-cover)" stroke="#6d82a5" stroke-width=".65"/>
   <path d="${rect(0,0,W,L,T+C)}" fill="url(#${id}-grain)"/>
   <path d="${rect(5,5,W-5,L-5,T+C)}" stroke="#b7c2d8" stroke-opacity=".6" stroke-width=".65"/>
   <g transform="matrix(.82,-.47,.86,.5,${r(o.x)},${r(o.y)})" fill="url(#${id}-foil)" stroke="none">
    <text x="40" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="29">Ω</text>
    <path d="M24 68h32v1H24zM31 72h18v.65H31z"/>
   </g>
  </g>
  </svg>`;
 }
 function setup(card){
  if(controllers.has(card))return controllers.get(card);
  const svg=card.querySelector('.r12-book-svg');if(!svg)return null;
  const clockNode=document.createElementNS('http://www.w3.org/2000/svg','g');clockNode.setAttribute('visibility','hidden');clockNode.dataset.bookClock='';svg.append(clockNode);
  const clock=clockNode.animate([{opacity:0},{opacity:1}],{duration:1550,fill:'both',easing:'cubic-bezier(.22,.7,.2,1)'});
  clock.pause();clock.currentTime=0;
  const parts=[...svg.querySelectorAll('[data-book-plane]:not([data-book-plane="leaf"])')];let raf=0;
  const renderPose=()=>{
   const progress=clock.effect.getComputedTiming().progress??0;
   for(const part of parts){const m=matrix(part.dataset.bookPlane,progress);part.style.transform=`matrix(${[m.a,m.b,m.c,m.d,m.e,m.f].map(n=>Number(n.toFixed(9))).join(',')})`;}
  };
  const tick=()=>{raf=0;renderPose();if(clock.playState==='running')raf=requestAnimationFrame(tick)};
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(tick)};
  clock.addEventListener('finish',()=>{cancelAnimationFrame(raf);raf=0;renderPose()});
  renderPose();
  // The standard motion-controller interface keeps interruption, reverse,
  // keyboard focus and reduced-motion handling identical to other cards.
  const controller={get currentTime(){return clock.currentTime},set currentTime(value){clock.currentTime=value;renderPose()},get playbackRate(){return clock.playbackRate},set playbackRate(value){clock.playbackRate=value},get playState(){return clock.playState},get effect(){return clock.effect},play(){clock.play();schedule()},pause(){clock.pause();cancelAnimationFrame(raf);raf=0;renderPose()},finish(){clock.finish();renderPose()},cancel(){clock.cancel();cancelAnimationFrame(raf);raf=0;renderPose()}};
  controllers.set(card,controller);return controller;
 }
 root.VV_DASH_BOOK=Object.freeze({render,setup,model:Object.freeze({project,matrix,planes,dimensions:Object.freeze({W,L,T,C,maxDegrees:38})})});
})(window);
