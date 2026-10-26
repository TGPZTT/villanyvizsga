(function () {
 'use strict';
 const esc=s=>String(s).replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
 const math=s=>window.VVFormula?.typeset(s)||esc(s);
 const controls=(spec,index)=>{
   const photometry=['light-beam','light-distribution'].includes(spec.variant);
   const terms=[['Φ','lm'],['I','cd'],['E','lx']];
   const items=spec.variant==='light-distance'?spec.items.slice(0,2):spec.items;
   return `<div class="lv-state-controls lab-controls${photometry?' lab-symbol-controls':''}">${items.map((item,i)=>`<button type="button" data-lv-index="${i}" aria-pressed="${index===i}">${photometry?`<b>${terms[i][0]}</b><span>${esc(item.label)}</span><em>${terms[i][1]}</em>`:esc(item.label)}</button>`).join('')}</div>`;
 };
 const field=(symbol,name,unit,selected)=>`<span class="lab-quantity${selected?' is-active':''}"><b>${symbol}</b><span>${name}</span><em>${unit}</em></span>`;
 const panel=(spec,index,svg,readout,fields='')=>`<div class="lab-scene"><div class="lv-technical lab-drawing" data-lv-diagram tabindex="0" role="region" aria-label="${esc(spec.title)}"><svg viewBox="0 0 580 250" role="img" aria-label="${esc(spec.title)}"><g class="lab-engineering">${svg}</g></svg></div><div class="lab-readout" aria-live="polite">${readout}</div></div>${fields?`<div class="lab-quantities">${fields}</div>`:''}${controls(spec,index)}`;
 function beam(spec,index){
   const rays=[[75,150],[75,55],[215,25],[250,75],[250,145],[210,220],[75,220]].map(([x,y])=>`<path d="M150 125L${x} ${y}" class="lab-ray ${index===0?'is-active':''}"/>`).join('');
   const svg=`<defs><linearGradient id="beam-light" x1="0" x2="1"><stop stop-color="#edba43" stop-opacity=".35"/><stop offset="1" stop-color="#edba43" stop-opacity=".05"/></linearGradient></defs>
   <path d="M150 125 485 58V192Z" fill="url(#beam-light)"/>
   <path d="M150 125 485 92V158Z" class="lab-solid-angle ${index===1?'is-active':''}"/>
   ${rays}<path d="M150 125H485" class="lab-direction ${index===1?'is-active':''}"/>
   <path d="M315 119l14 6-14 6" class="lab-direction ${index===1?'is-active':''}"/>
   <path d="M450 60 500 42V205L450 188Z" class="lab-plane ${index===2?'is-active':''}"/>
   <path d="M450 102 500 84M450 145 500 127M475 51V197" class="lab-plane-grid"/>
   <ellipse cx="475" cy="124" rx="22" ry="50" class="lab-light-patch ${index===2?'is-active':''}"/>
   <circle cx="150" cy="125" r="26" class="lab-lamp ${index===0?'is-active':''}"/>
   <path d="M140 143 145 119l6 11 6-20M139 151h22m-20 6h18" class="lab-filament"/>
   ${text(150,202,'Φ','lab-phi')}${text(324,102,'I','lab-intensity')}${text(530,132,'E','lab-illuminance')}`;
   const descriptions=[['Φ','Fényáram','lm'],['I','Fényerősség','cd'],['E','Megvilágítás','lx']];
   const [symbol,name,unit]=descriptions[index];
   const observation=['A fényáram a forrás kibocsátott fényét jellemzi.','A fényerősség a kiválasztott irányhoz tartozik.','A megvilágítás a felületet érő fényáram területegységre jutó értéke.'][index];
   return panel(spec,index,svg,`<span class="lab-selected-symbol">${symbol}<small>${unit}</small></span><strong>${name}</strong><p>${observation}</p>`);
 }
 function distance(spec,index){
   if(index===2){
     const svg=`<path d="M45 126H212" class="lab-power-line"/><path d="M196 118l16 8-16 8" class="lab-power-line"/>
     <circle cx="290" cy="126" r="48" class="lab-lamp is-active"/><path d="M274 148 282 107l12 27 12-35M274 164h32m-28 7h24" class="lab-filament"/>
     ${[[373,58],[410,91],[428,126],[410,162],[373,196]].map(([x,y])=>`<path d="M350 126L${x} ${y}" class="lab-ray is-active"/>`).join('')}
     ${text(117,95,'P [W]','lab-power')}${text(481,126,'Φ [lm]','lab-phi')}`;
     return panel(spec,index,svg,`<div class="lab-math" role="math" aria-label="Fényhasznosítás: fényáram osztva a felvett teljesítménnyel">${math('η_f = Φ / P')}</div><strong>Fényhasznosítás</strong><span class="lab-result-unit">lm/W</span>`);
   }
   const far=index===1,cx=far?420:240,ry=far?76:38,rx=far?16:8;
   const svg=`<defs><linearGradient id="distance-beam" x1="0" x2="1"><stop stop-color="#e6b548" stop-opacity=".3"/><stop offset="1" stop-color="#e6b548" stop-opacity=".04"/></linearGradient></defs>
   <path d="M60 115 420 39V191Z" fill="url(#distance-beam)"/>
   <path d="M60 115 420 39M60 115 420 191" class="lab-cone-edge"/>
   <ellipse cx="240" cy="115" rx="8" ry="38" class="lab-reference-plane"/>
   <ellipse cx="420" cy="115" rx="16" ry="76" class="lab-reference-plane"/>
   <ellipse data-motion-key="light-measuring-plane" cx="${cx}" cy="115" rx="${rx}" ry="${ry}" class="lab-measuring-plane"/>
   <circle cx="60" cy="115" r="14" class="lab-lamp is-active"/>
   <path d="M54 109l12 12m0-12-12 12" class="lab-filament"/>
   ${text(80,43,'I = 1 cd','lab-intensity')}
   <path d="M60 205H240M60 200v10M240 200v10M60 225H420M60 220v10M420 220v10" class="lab-dimension"/>
   ${text(150,195,'1 m')}${text(330,245,'2 m')}
   ${text(295,83,'1 lx','lab-near-label')}${text(492,180,'0,25 lx','lab-far-label')}`;
   return panel(spec,index,svg,`<span class="lab-distance-label">${far?'2 m':'1 m'}</span><output class="lab-selected-symbol">${far?'0,25':'1'}<small>lx</small></output><div class="lab-area-grid${far?' is-far':''}" aria-label="${far?'Négyszeres megvilágított terület':'Kiindulási megvilágított terület'}">${'<i></i>'.repeat(4)}</div><p>${far?'A kétszeres távolságban a megvilágítás a negyedére csökken.':'Ez a kiindulási mérési hely.'}</p><small>A két sík külön mérési helyet jelöl.</small>`);
 }
 function triangle(spec,index){
   const names=['P','Q','S'],units=['W','var','VA'];
   const svg=`<path d="M95 199H455V49Z" fill="#edf2f9"/>
   <path d="M95 199H455" class="lab-vector lab-vector-p ${index===0?'is-active':''}"/>
   <path d="M455 199V49" class="lab-vector lab-vector-q ${index===1?'is-active':''}"/>
   <path d="M95 199 455 49" class="lab-vector lab-vector-s ${index===2?'is-active':''}"/>
   <path d="M438 199v-17h17" class="lab-right-angle"/>
   <path d="M155 199a60 60 0 0 0-5-23" class="lab-dimension"/>
   ${text(174,187,'φ')}${text(275,235,'P [W]','lab-power')}${text(510,132,'Q [var]','lab-reactive')}${text(262,105,'S [VA]','lab-apparent')}`;
   return panel(spec,index,svg,`<span class="lab-selected-symbol">${names[index]}<small>${units[index]}</small></span><strong>${['Hatásos teljesítmény','Meddő teljesítmény','Látszólagos teljesítmény'][index]}</strong><div class="lab-math" role="math" aria-label="A látszólagos teljesítmény négyzete a hatásos és meddő teljesítmény négyzetösszege">${math('S² = P² + Q²')}</div>`);
 }
 function render(spec,index){
   if(spec.variant==='light-beam'||spec.variant==='light-distribution')return beam(spec,index);
   if(spec.variant==='light-distance')return distance(spec,index);
   if(spec.variant==='power-triangle')return triangle(spec,index);
   return null;
 }
 window.VVLearningLabs={render};
})();
