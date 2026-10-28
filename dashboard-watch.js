(function(){
  'use strict';
  const radians=value=>value*Math.PI/180;
  const yaw=radians(35),elevation=radians(18),roll=radians(-6);
  const rotate=([x,y])=>[Math.cos(roll)*x-Math.sin(roll)*y,Math.sin(roll)*x+Math.cos(roll)*y];
  const U=rotate([Math.cos(yaw),Math.sin(yaw)*Math.sin(elevation)]);
  const V=rotate([0,Math.cos(elevation)]);
  const N=rotate([Math.sin(yaw),-Math.cos(yaw)*Math.sin(elevation)]);
  const depth=[-Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)];
  const center=[124,106];
  const point=([x,y,z])=>[center[0]+U[0]*x+V[0]*y+N[0]*z,center[1]+U[1]*x+V[1]*y+N[1]*z];
  const pair=p=>p.map(v=>Number(v.toFixed(5))).join(' ');
  const path=points=>points.map((p,i)=>(i?'L':'M')+pair(point(p))).join('')+'Z';
  const circle=(radius,y,z,axis)=>Array.from({length:96},(_,i)=>{const a=i*Math.PI/48;return axis==='y'?[radius*Math.cos(a),y,z+radius*Math.sin(a)]:[radius*Math.cos(a),radius*Math.sin(a),z]});
  const metal=(normal)=>{
    const light=Math.max(0,normal[0]*-.6+normal[1]*-.8+normal[2]*-.5);
    return `rgb(${Math.round(137+light*93)},${Math.round(90+light*94)},${Math.round(48+light*88)})`;
  };
  function sideMesh(axis,radius,from,to,zCenter=0){
    const faces=[];
    for(let i=0;i<96;i++){
      const a=i*Math.PI/48,b=(i+1)*Math.PI/48,m=(a+b)/2;
      const normal=axis==='y'?[Math.cos(m),0,Math.sin(m)]:[Math.cos(m),Math.sin(m),0];
      if(normal.reduce((sum,value,index)=>sum+value*depth[index],0)>=0)continue;
      const at=(angle,t)=>axis==='y'?[radius*Math.cos(angle),t,zCenter+radius*Math.sin(angle)]:[radius*Math.cos(angle),radius*Math.sin(angle),t];
      const vertices=[at(a,from),at(b,from),at(b,to),at(a,to)];
      const distance=vertices.reduce((sum,vertex)=>sum+vertex.reduce((total,value,index)=>total+value*depth[index],0),0)/4;
      faces.push({distance,markup:`<path d="${path(vertices)}" fill="${metal(normal)}"/>`});
    }
    return faces.sort((a,b)=>b.distance-a.distance).map(face=>face.markup).join('');
  }
  const ticks=Array.from({length:60},(_,i)=>{
    const angle=i*Math.PI/30-Math.PI/2,inner=i%5?33.4:29.8,outer=35.2;
    return `<path d="M${pair([Math.cos(angle)*inner,Math.sin(angle)*inner])}L${pair([Math.cos(angle)*outer,Math.sin(angle)*outer])}" stroke-width="${i%5?.65:1.4}"/>`;
  }).join('');
  function render(){
    const matrix=[...U,...V,...center];
    const grooves=Array.from({length:24},(_,i)=>{
      const a=i*Math.PI/12,normal=[Math.cos(a),0,Math.sin(a)];
      if(normal.reduce((sum,value,index)=>sum+value*depth[index],0)>=0)return '';
      return `<path d="M${pair(point([9.7*Math.cos(a),-65.5,6+9.7*Math.sin(a)]))}L${pair(point([9.7*Math.cos(a),-59.5,6+9.7*Math.sin(a)]))}" stroke="#6c4d35" stroke-width=".6"/>`;
    }).join('');
    return `<svg class="vv-dash-object vv-dash-object--exam r12-watch" viewBox="0 0 220 190" fill="none" aria-hidden="true" data-watch-projection="${matrix.join(',')}" data-watch-crown-direction="${V.join(',')}" style="--watch-crown-x:${V[0]*3}px;--watch-crown-y:${V[1]*3}px">
      <defs><radialGradient id="r12-watch-shadow"><stop stop-color="#2f3444" stop-opacity=".24"/><stop offset="1" stop-color="#2f3444" stop-opacity="0"/></radialGradient><linearGradient id="r12-watch-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5d8ac"/><stop offset=".25" stop-color="#b27b46"/><stop offset=".55" stop-color="#e7bf89"/><stop offset="1" stop-color="#966336"/></linearGradient><linearGradient id="r12-watch-face" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffdf7"/><stop offset="1" stop-color="#f2eee2"/></linearGradient></defs>
      <ellipse cx="121" cy="166" rx="91" ry="14" fill="url(#r12-watch-shadow)"/>
      <path d="m33 79 66-18 37 83-65 19Z" fill="#bbb9b1"/><path d="m31 74 66-18 37 83-65 19Z" fill="#f6f1e6" stroke="#c5c8bd"/><g stroke="#a0a9a7" stroke-width="1.7"><path d="m48 91 33-9m-28 21 33-9m-28 21 24-7"/></g>
      <g class="r12-watch-stem" data-watch-stem="fixed">${sideMesh('y',4,-62,-44,6)}<path d="${path(circle(4,-62,6,'y'))}" fill="#b68852"/></g>
      <g class="dash-clock-button" data-dash-motion-part="clock-button" data-clock-crown="cap">
        ${sideMesh('y',10,-66,-59,6)}<path d="${path(circle(10,-66,6,'y'))}" fill="#ebd0a4" stroke="#ad8555" stroke-width=".6"/>${grooves}
      </g>
      <path d="${path(circle(49,0,12,'z'))}" fill="#8b613d"/>
      ${sideMesh('z',49,0,12)}
      <g class="r12-watch-face-projection" data-clock-face-projection="true" transform="matrix(${matrix.join(' ')})">
        <circle r="49" fill="url(#r12-watch-metal)" stroke="#9f774d" stroke-width=".7"/>
        <circle r="43.5" fill="#7d7565" stroke="#ead0a3" stroke-width=".8"/>
        <circle r="40.3" fill="url(#r12-watch-face)" stroke="#b3aa96" stroke-width=".8"/>
        <circle r="37.6" stroke="#d8d0bd" stroke-width=".55"/>
        <g class="r12-watch-ticks" stroke="#5e6670">${ticks}</g>
        <svg class="r12-watch-hand-plane" x="-50" y="-50" width="100" height="100" viewBox="0 0 100 100" overflow="visible">
          <g class="dash-clock-minute" data-dash-motion-part="clock-minute" data-watch-pivot="50,50"><path d="M50 50V30" stroke="#3a577d" stroke-width="2.8" stroke-linecap="round"/></g>
          <g class="dash-clock-second" data-dash-motion-part="clock-second" data-watch-pivot="50,50"><path d="M50 58V18" stroke="#b86737" stroke-width="1.25" stroke-linecap="round"/><circle cx="50" cy="56" r="2.1" fill="#b88650"/></g>
        </svg>
        <circle r="3.8" fill="url(#r12-watch-metal)" stroke="#8f6e45" stroke-width=".6"/><circle cx="-.8" cy="-.9" r="1.35" fill="#fae7be"/>
        <path d="M-25-27a37 37 0 0 0-7 41" stroke="#fff" stroke-width="2.8" stroke-opacity=".55" stroke-linecap="round"/>
      </g>
    </svg>`;
  }
  window.VV_DASH_WATCH=Object.freeze({render,projection:{U,V,N,depth,center}});
})();

(function(root){
  'use strict';
  const controllers=new WeakMap();
  function setup(card){
    if(controllers.has(card))return controllers.get(card);
    const svg=card.querySelector('.r12-watch');if(!svg)return null;
    const seconds=svg.querySelector('.dash-clock-second'),minutes=svg.querySelector('.dash-clock-minute');
    if(!seconds||!minutes)return null;
    svg.dataset.watchControlled='true';
    const node=document.createElementNS('http://www.w3.org/2000/svg','g');node.setAttribute('visibility','hidden');node.dataset.watchClock='';svg.append(node);
    const duration=1600;
    const clock=node.animate([{opacity:0},{opacity:1}],{duration,fill:'both',easing:'cubic-bezier(.25,.6,.2,1)'});
    clock.pause();clock.currentTime=0;
    let base=0,angle=0,started=false,active=false,raf=0;
    const render=()=>{
      const progress=started?(clock.effect.getComputedTiming().progress??0):0;
      angle=base+235*progress;
      seconds.style.transform=`rotate(${angle}deg)`;
      minutes.style.transform=`rotate(${-55+angle/60}deg)`;
      svg.style.setProperty('--watch-seconds-angle',`${angle}deg`);
      svg.style.setProperty('--watch-minutes-angle',`${-55+angle/60}deg`);
      svg.dataset.watchSecondsAngle=String(angle);
      svg.dataset.watchMinutesAngle=String(-55+angle/60);
    };
    const tick=()=>{raf=0;render();if(clock.playState==='running')raf=requestAnimationFrame(tick)};
    const schedule=()=>{if(!raf)raf=requestAnimationFrame(tick)};
    clock.addEventListener('finish',()=>{cancelAnimationFrame(raf);raf=0;render()});
    const setActive=(next,reduced=false)=>{
      if(reduced){clock.pause();cancelAnimationFrame(raf);raf=0;render();active=false;return}
      if(next&&!active){
        if(!started||Number(clock.currentTime)>=duration){
          render();base=angle;clock.pause();clock.currentTime=0;started=true;render();
        }
        clock.playbackRate=1;clock.play();schedule();
      }
      // Leaving only releases the crown. A running finite cycle finishes forward.
      active=next;
    };
    render();
    const controller=Object.freeze({setActive,state:()=>({angle,base,target:base+235,started,active,currentTime:clock.currentTime,playState:clock.playState})});
    controllers.set(card,controller);return controller;
  }
  root.VV_DASH_WATCH=Object.freeze({...root.VV_DASH_WATCH,setup});
})(window);
