(function(){
  'use strict';
  const raw=window.VV_DATA||{questions:[],sources:[]};
  const TYPE={single:'Egy jó válasz',multi:'Több jó válasz',number:'Számolás',open:'Kifejtés'};
  const KEY='villanyvizsga-progress-v1';
  const norm=s=>String(s??'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seed=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}};
  const progress=seed();
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{}};
  const sources=(raw.sources||[]).map(s=>typeof s==='string'?{id:s,title:s,file:s}:s);
  const qlist=(raw.questions||[]).map((q,i)=>{
    const file=q.sourceFile||q.source||q.sourceId||'';
    const src=sources.find(s=>s.id===q.sourceId||s.file===file||s.originalFile===file);
    let options=q.options||[];
    if(!Array.isArray(options))options=Object.entries(options).map(([key,value])=>({key,text:value}));
    options=options.map((o,j)=>typeof o==='string'?{key:String.fromCharCode(65+j),text:o}:{key:o.key||o.id||String.fromCharCode(65+j),text:o.text||o.label||o.value||''});
    let answer=q.answer??q.correctAnswer??null;
    if(typeof answer==='object'&&answer!==null&&!Array.isArray(answer))answer=answer.text??answer.value??null;
    const type=q.type||q.kind||(options.length?'single':'open');
    const year=Number(q.year||src?.year||String(file).match(/20\d{2}/)?.[0]||0);
    const sourcePages=q.sourcePages||q.pages||[];
    const page=Number(q.page||sourcePages[0]||1);
    const confidence=q.answerConfidence||q.confidence||q.verified||'';
    const low=['low','uncertain','review','unknown','none'].includes(String(confidence).toLowerCase())||q.review===true;
    const figurePaths=(Array.isArray(q.figurePaths)?q.figurePaths:[]).filter(Boolean);
    if(!figurePaths.length&&q.figurePath)figurePaths.push(q.figurePath);
    return {...q,id:String(q.id||`q-${i+1}`),sourceId:q.sourceId||src?.id||file,sourceTitle:q.sourceTitle||src?.title||file,sourceFile:file,sourcePath:q.sourcePath||src?.path||'',year,page,number:q.number||q.taskNumber||`${i+1}`,section:q.section||'',topic:q.topic||q.category||'Egyéb',type,options,answer,explanation:q.explanation||q.solution||'',points:Number(q.points)||2,review:low||answer===null||answer==='',requiresFigure:!!q.requiresFigure,figurePath:figurePaths[0]||'',figurePaths,figureCaptions:Array.isArray(q.figureCaptions)?q.figureCaptions:[],prompt:q.prompt||q.question||''};
  }).filter(q=>!q.drawing&&q.prompt.trim());
  const byId=new Map(qlist.map(q=>[q.id,q]));
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
  const setText=(s,t)=>{const e=$(s);if(e)e.textContent=t};
  const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
  const pageLink=q=>q.sourcePath&&window.VV_ASSETS?.has(q.sourcePath)?q.sourcePath:'';
  const sourceLink=q=>pageLink(q)?`<a class="source-link" target="_blank" rel="noopener" href="#" data-asset="${esc(pageLink(q))}" data-fragment="#page=${q.page}">Eredeti feladatlap · ${q.page}. oldal ↗</a>`:'';
  function hydrateAssets(root){
    if(!window.VV_ASSETS)return;
    $$('img[data-asset-src]:not([data-asset-requested])',root).forEach(img=>{
      img.dataset.assetRequested='true';
      window.VV_ASSETS.getURL(img.dataset.assetSrc).then(url=>{if(img.isConnected)img.src=url}).catch(()=>{
        const figure=img.closest('.question-figure');
        if(figure&&figure.isConnected)figure.insertAdjacentHTML('afterbegin','<div class="asset-error">Az ábra nem nyitható meg. Frissítsd az oldalt, majd próbáld újra.</div>');
      });
    });
    $$('a[data-asset]:not([data-asset-requested])',root).forEach(link=>{
      link.dataset.assetRequested='true';
      window.VV_ASSETS.getURL(link.dataset.asset).then(url=>{
        if(link.isConnected)link.href=url+(link.dataset.fragment||'');
      }).catch(()=>{link.setAttribute('aria-disabled','true')});
    });
  }
  const sourceLabel=q=>q.sourceTitle||q.sourceFile||'Feladatsor';
  const answerLabel=q=>{
    if(q.options.length){
      const keys=getCorrectKeys(q);
      if(keys.length)return keys.map(key=>{const option=q.options.find(o=>o.key===key);return `${key}. ${option?.text||''}`.trim()}).join('\n');
    }
    if(Array.isArray(q.answer))return q.answer.join(', ');
    if(q.answer===null||q.answer==='')return 'A megoldás felülvizsgálat alatt.';
    return String(q.answer);
  };
  const attemptStatus=q=>progress[q.id]?.status||'new';
  let view='home',bankPage=0,practice=null,exam=null,timerId=null;

  function navigate(target){
    view=target;
    $$('.view').forEach(e=>e.classList.toggle('active',e.id===`${target}View`));
    $$('.nav-link[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===target));
    $('.sidebar').classList.remove('open');$('#menuToggle')?.setAttribute('aria-expanded','false');
    location.hash=target==='home'?'':target;
    window.scrollTo({top:0,behavior:'smooth'});
    if(target==='bank')renderBank();
    if(target==='home')renderHome();
  }
  function fillSelect(select,items,label){if(!select)return;select.innerHTML=`<option value="">${esc(label)}</option>`+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
  function sourceNames(){return [...new Set(qlist.map(sourceLabel))].sort((a,b)=>b.localeCompare(a,'hu'))}
  function topicNames(){return [...new Set(qlist.map(q=>q.topic))].sort((a,b)=>a.localeCompare(b,'hu'))}
  function renderHome(){
    const done=qlist.filter(q=>attemptStatus(q)==='correct').length;
    const retry=qlist.filter(q=>attemptStatus(q)==='retry').length;
    const sheets=new Set(qlist.map(q=>q.sourceId)).size;
    $('#homeMetrics').innerHTML=[{n:qlist.length,t:'írásbeli feladat'},{n:sheets,t:'feladatsor'},{n:done,t:'már sikerült'},{n:retry,t:'újra gyakorlandó'}].map(x=>`<div class="metric"><strong>${x.n}</strong><span>${x.t}</span></div>`).join('');
    const groups=new Map();qlist.forEach(q=>{const key=q.sourceId;if(!groups.has(key))groups.set(key,{label:sourceLabel(q),year:q.year,count:0,source:key});groups.get(key).count++});
    $('#sourceOverview').innerHTML=[...groups.values()].sort((a,b)=>b.year-a.year||a.label.localeCompare(b.label,'hu')).slice(0,8).map(g=>`<button class="source-tile" data-source="${esc(g.source)}"><strong>${esc(g.label)}</strong><span>${g.count} feldolgozott feladat · ${g.year||'év nélkül'}</span></button>`).join('');
    $$('.source-tile').forEach(e=>e.addEventListener('click',()=>{const opt=[...$('#sourceFilter').options].find(o=>o.value===e.dataset.source);$('#sourceFilter').value=opt?e.dataset.source:'';navigate('bank')}));
    setText('#navCount',qlist.length);
  }
  function setupFilters(){
    const group=[...new Map(qlist.map(q=>[q.sourceId,sourceLabel(q)])).entries()];
    $('#sourceFilter').innerHTML='<option value="">Minden feladatsor</option>'+group.sort((a,b)=>b[1].localeCompare(a[1],'hu')).map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
    $('#practiceSource').innerHTML='<option value="">Minden feladatsor</option>'+group.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
    fillSelect($('#topicFilter'),topicNames(),'Minden téma');fillSelect($('#practiceTopic'),topicNames(),'Vegyes témák');
    ['#searchInput','#sourceFilter','#topicFilter','#typeFilter','#statusFilter'].forEach(s=>$(s).addEventListener(s==='#searchInput'?'input':'change',()=>{bankPage=0;renderBank()}));
    $('#clearFilters').addEventListener('click',()=>{['#searchInput','#sourceFilter','#topicFilter','#typeFilter','#statusFilter'].forEach(s=>$(s).value='');bankPage=0;renderBank()});
  }
  function renderBank(){
    const query=norm($('#searchInput').value),source=$('#sourceFilter').value,topic=$('#topicFilter').value,type=$('#typeFilter').value,status=$('#statusFilter').value;
    const list=qlist.filter(q=>(!query||norm(`${q.prompt} ${sourceLabel(q)} ${q.topic} ${answerLabel(q)}`).includes(query))&&(!source||q.sourceId===source)&&(!topic||q.topic===topic)&&(!type||q.type===type)&&(!status||attemptStatus(q)===status));
    list.sort((a,b)=>b.year-a.year||sourceLabel(a).localeCompare(sourceLabel(b),'hu')||String(a.number).localeCompare(String(b.number),'hu',{numeric:true}));
    setText('#resultCount',`${list.length} feladat található`);
    const size=40,pages=Math.max(1,Math.ceil(list.length/size));bankPage=Math.min(bankPage,pages-1);
    const slice=list.slice(bankPage*size,(bankPage+1)*size);
    if(!slice.length){$('#bankList').innerHTML='<div class="empty">Nincs találat. Próbáld meg más szűrőkkel.</div>';$('#bankPager').innerHTML='';return}
    let last='';$('#bankList').innerHTML=slice.map(q=>{
      const group=q.sourceId;let head='';if(group!==last){head=`<div class="section-head"><div><div class="kicker">${esc(q.year||'')}</div><h2>${esc(sourceLabel(q))}</h2></div></div>`;last=group}
      const status=attemptStatus(q);
      const preview=q.prompt.replace(/\s+/g,' ').slice(0,150);
      return head+`<button class="bank-item" data-id="${esc(q.id)}"><span class="bank-index">${esc(q.number)}</span><span class="bank-main"><strong>${esc(preview)}${q.prompt.length>150?'…':''}</strong><small>${esc(q.topic)} · ${TYPE[q.type]||'Feladat'} · ${q.points} pont · ${q.page}. oldal</small></span><span class="bank-meta">${q.requiresFigure?'<span class="chip">Ábrás</span>':''}${q.review?'<span class="chip review">Ellenőrzendő megoldás</span>':''}${status!=='new'?`<span class="chip ${status}">${status==='correct'?'Sikerült':'Újra'}</span>`:''}<span aria-hidden="true">↗</span></span></button>`
    }).join('');
    $$('.bank-item').forEach(e=>e.addEventListener('click',()=>openQuestion(byId.get(e.dataset.id))));
    $('#bankPager').innerHTML=pages>1?`<button id="prevPage" ${bankPage===0?'disabled':''}>← Előző</button><span>${bankPage+1} / ${pages}</span><button id="nextPage" ${bankPage===pages-1?'disabled':''}>Következő →</button>`:'';
    $('#prevPage')?.addEventListener('click',()=>{bankPage--;renderBank();window.scrollTo(0,0)});
    $('#nextPage')?.addEventListener('click',()=>{bankPage++;renderBank();window.scrollTo(0,0)});
  }
  function getCorrectKeys(q){
    if(!q.options.length||q.answer==null)return [];
    const ans=Array.isArray(q.answer)?q.answer.map(String):String(q.answer).split(/[;,]/).map(s=>s.trim());
    const keys=[];
    for(const a of ans){const normalized=norm(a).replace(/[.)]/g,'');const idx=q.options.findIndex((o,i)=>norm(o.key)===normalized||norm(o.text)===normalized||String(i+1)===normalized);if(idx>=0)keys.push(q.options[idx].key)}
    return [...new Set(keys)];
  }
  function isAuto(q){const nums=String(q.answer??'').match(/[-+]?\d+(?:[.,]\d+)?/g)||[];return !q.review&&((q.type==='single'||q.type==='multi')&&getCorrectKeys(q).length>0||q.type==='number'&&nums.length===1&&Number.isFinite(parseNumeric(q.answer)))}
  function parseNumeric(v){if(typeof v==='number')return v;const m=String(v??'').replace(/\s/g,'').replace(',','.').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
  function grade(q,response){
    if(!isAuto(q))return null;
    if(q.type==='number'){const expected=parseNumeric(q.answer),got=parseNumeric(response),tol=Number(q.tolerance)||Math.max(.01,Math.abs(expected)*.015);return Number.isFinite(got)&&Math.abs(got-expected)<=tol}
    const right=getCorrectKeys(q).sort(),given=(Array.isArray(response)?response:[response]).filter(Boolean).sort();return right.length===given.length&&right.every((k,i)=>k===given[i]);
  }
  function earnedPoints(q,response){
    if(!isAuto(q))return 0;
    if(q.type!=='multi')return grade(q,response)?q.points:0;
    const right=getCorrectKeys(q),given=(Array.isArray(response)?response:[response]).filter(Boolean);
    const good=given.filter(x=>right.includes(x)).length;
    const wrong=given.filter(x=>!right.includes(x)).length;
    return Math.max(0,Math.min(q.points,(good-wrong)*q.points/right.length));
  }
  function mark(q,result){if(result===null)return;progress[q.id]={status:result?'correct':'retry',at:Date.now()};save()}
  function explanationMarkup(q){
    if(!q.explanation)return '';
    const equation=/[=≈≤≥]/.test(q.explanation)&&/\d|[Δ√Ωφρη]/u.test(q.explanation);
    return equation?`<div class="calculation-note"><span class="calculation-note-label">Levezetés</span><p>${esc(q.explanation)}</p></div>`:`<p>${esc(q.explanation)}</p>`;
  }
  function questionBody(q,mode,response,show){
    const auto=isAuto(q),multi=q.type==='multi',choice=q.type==='single'||q.type==='multi';
    const values=Array.isArray(response)?response:[response];
    const right=show&&choice?getCorrectKeys(q):[];
    const opts=q.options.length?(choice?`<div class="options">${q.options.map(o=>`<label class="option ${values.includes(o.key)?'selected':''} ${right.includes(o.key)?'correct-option':''} ${show&&values.includes(o.key)&&!right.includes(o.key)?'incorrect-option':''}"><input type="${multi?'checkbox':'radio'}" name="answer" value="${esc(o.key)}" ${values.includes(o.key)?'checked':''} ${show&&mode==='exam'?'disabled':''}><span><b>${esc(o.key)}.</b> ${esc(o.text)}</span>${right.includes(o.key)?'<span class="option-result" aria-label="Helyes válasz">✓</span>':''}${show&&values.includes(o.key)&&!right.includes(o.key)?'<span class="option-result" aria-label="Nem helyes válasz">×</span>':''}</label>`).join('')}</div>`:`<div class="options">${q.options.map(o=>`<div class="option"><span><b>${esc(o.key)}.</b> ${esc(o.text)}</span></div>`).join('')}</div>`):'';
    const input=!choice?(q.type==='number'?`<input class="answer-input" id="freeAnswer" inputmode="decimal" type="text" placeholder="Eredmény mértékegységgel" ${show&&mode==='exam'?'disabled':''}>`:`<textarea class="answer-input long" id="freeAnswer" rows="4" placeholder="Írd ide a megoldásod" ${show&&mode==='exam'?'disabled':''}>${esc(response||'')}</textarea>`):'';
    const figure=q.figurePaths.length?`<div class="question-figures">${q.figurePaths.map((src,i)=>{const caption=q.figureCaptions[i]||`A feladathoz tartozó ábra${q.figurePaths.length>1?` ${i+1}`:''}`;return `<figure class="question-figure"><a class="figure-open" href="#" data-asset="${esc(src)}" target="_blank" rel="noopener" aria-label="${esc(caption)} megnyitása nagy méretben"><img data-asset-src="${esc(src)}" alt="${esc(sourceLabel(q))}: ${esc(caption)}" loading="lazy" decoding="async"></a><figcaption>${esc(caption)} <a href="#" data-asset="${esc(src)}" target="_blank" rel="noopener">Nagyítás ↗</a></figcaption></figure>`}).join('')}</div>`:'';
    const sourceFigureLink=mode!=='exam'?sourceLink(q):'';
    return `<div class="question-top"><div class="tags"><span class="chip">${esc(q.topic)}</span><span class="chip">${esc(TYPE[q.type]||'Feladat')}</span>${q.requiresFigure?'<span class="chip">Ábrás feladat</span>':''}${q.review?'<span class="chip review">Megoldás ellenőrzendő</span>':''}</div><span>${q.points} pont</span></div><h2 class="question-title">${esc(sourceLabel(q))} · ${esc(q.number)}. feladat</h2><p class="question-prompt">${esc(q.prompt)}</p>${figure}${sourceFigureLink}${opts}${input}${!auto&&mode==='exam'?'<div class="feedback review">Ezt a feladatot a vizsga végén önellenőrzéssel lehet értékelni.</div>':''}${show?`<div class="explanation"><strong>Megoldás</strong><p>${esc(answerLabel(q))}</p>${q.explanation?`<strong style="margin-top:14px">Miért?</strong>${explanationMarkup(q)}`:''}${q.review?'<p>A forrás vagy a válaszkulcs ellenőrzése szükséges; biztonsági szempontból kétes állítást ne tanulj meg tényként.</p>':''}${sourceLink(q)}</div>`:''}`;
  }
  function selectedFrom(root,q){if(q.type==='single'||q.type==='multi'){const checked=$$('input[name="answer"]:checked',root).map(x=>x.value);return q.type==='multi'?checked:checked[0]||''}return $('#freeAnswer',root)?.value||''}
  function bindOptions(root){$$('.option input',root).forEach(input=>input.addEventListener('change',()=>$$('.option',root).forEach(label=>label.classList.toggle('selected',!!$('input:checked',label)))))}
  function openQuestion(q){
    if(!q)return;const dialog=$('#questionDialog');let shown=false,response='';
    const render=()=>{const body=$('#dialogContent');body.innerHTML=questionBody(q,'bank',response,shown)+`<div class="question-actions"><button id="dialogCheck" class="button primary">${shown?'Újra ellenőrzöm':'Válasz ellenőrzése'}</button><button id="dialogShow" class="button outline">Megoldás megmutatása</button>${!isAuto(q)?'<button id="dialogGotIt" class="button outline">Megértettem</button>':''}<button id="dialogRetry" class="button outline">Megjelölöm gyakorlásra</button></div><div id="dialogFeedback"></div>`;if(q.type==='number')$('#freeAnswer',body).value=response;bindOptions(body);$('#dialogCheck').addEventListener('click',()=>{response=selectedFrom(body,q);shown=true;const result=grade(q,response);mark(q,result);render();const f=$('#dialogFeedback');f.innerHTML=result===null?'<div class="feedback review">Hasonlítsd össze a válaszod a megoldással, majd jelöld a feladatot.</div>':`<div class="feedback ${result?'':'wrong'}">${result?'Helyes válasz.':'Még nem ez a megoldás. Nézd meg a magyarázatot, aztán próbáld újra.'}</div>`});$('#dialogShow').addEventListener('click',()=>{response=selectedFrom(body,q);shown=true;render()});$('#dialogGotIt')?.addEventListener('click',()=>{progress[q.id]={status:'correct',at:Date.now()};save();$('#dialogFeedback').innerHTML='<div class="feedback">Önellenőrzés szerint sikerült.</div>'});$('#dialogRetry').addEventListener('click',()=>{progress[q.id]={status:'retry',at:Date.now()};save();$('#dialogFeedback').innerHTML='<div class="feedback review">Felvéve az újragyakorláshoz.</div>'})};
    render();dialog.showModal();
  }
  function renderPractice(){
    if(!practice)return;const q=practice.list[practice.index],root=$('#practiceSession');const r=practice.responses[q.id]||'';
    root.innerHTML=`<div class="session-header"><span class="session-title">Gyakorlás</span><span class="session-progress">${practice.index+1} / ${practice.list.length} feladat</span></div><div class="progress-track"><div class="progress-fill" style="width:${(practice.index/practice.list.length)*100}%"></div></div>${questionBody(q,'practice',r,!!practice.shown[q.id])}<div class="question-actions"><button id="practiceCheck" class="button primary">Válasz ellenőrzése</button><button id="practiceShow" class="button outline">Megoldás és magyarázat</button>${!isAuto(q)?'<button id="practiceGotIt" class="button outline">Megértettem</button>':''}<button id="practiceHard" class="button outline">Ezt újra gyakorlom</button></div><div id="practiceFeedback"></div><div class="question-foot"><button id="practicePrev" class="button outline" ${practice.index===0?'disabled':''}>← Előző</button><button id="practiceNext" class="button dark">${practice.index===practice.list.length-1?'Befejezés':'Következő →'}</button></div>`;
    if(q.type==='number')$('#freeAnswer',root).value=r;
    bindOptions(root);
    const preserve=()=>{practice.responses[q.id]=selectedFrom(root,q)};
    $('#practiceCheck').addEventListener('click',()=>{preserve();practice.shown[q.id]=true;const result=grade(q,practice.responses[q.id]);mark(q,result);renderPractice();$('#practiceFeedback').innerHTML=result===null?'<div class="feedback review">Hasonlítsd össze a válaszod a megoldással.</div>':`<div class="feedback ${result?'':'wrong'}">${result?'Helyes válasz.':'Most nem sikerült. Olvasd el a rövid magyarázatot.'}</div>`});
    $('#practiceShow').addEventListener('click',()=>{preserve();practice.shown[q.id]=true;renderPractice()});
    $('#practiceGotIt')?.addEventListener('click',()=>{progress[q.id]={status:'correct',at:Date.now()};save();$('#practiceFeedback').innerHTML='<div class="feedback">Önellenőrzés szerint sikerült.</div>'});
    $('#practiceHard').addEventListener('click',()=>{progress[q.id]={status:'retry',at:Date.now()};save();$('#practiceFeedback').innerHTML='<div class="feedback review">Felvéve az újragyakorláshoz.</div>'});
    $('#practicePrev').addEventListener('click',()=>{preserve();practice.index--;renderPractice()});
    $('#practiceNext').addEventListener('click',()=>{preserve();if(practice.index<practice.list.length-1){practice.index++;renderPractice()}else{root.innerHTML=`<div class="exam-summary"><strong>Kész!</strong><p>${practice.list.length} feladaton mentél végig. A nehezebb kérdéseket a feladatbankban az „Újra gyakorlom” szűrővel találod meg.</p></div><button id="practiceAgain" class="button primary">Új gyakorlás</button>`;$('#practiceAgain').addEventListener('click',()=>{practice=null;root.classList.add('hidden');$('#practiceSetup').classList.remove('hidden')})}});
  }
  function startPractice(){const topic=$('#practiceTopic').value,source=$('#practiceSource').value,retryOnly=$('#retryOnly').checked,count=Number($('#practiceCount').value);const pool=qlist.filter(q=>(!topic||q.topic===topic)&&(!source||q.sourceId===source)&&(!retryOnly||attemptStatus(q)==='retry'));if(!pool.length){alert('Ezekkel a feltételekkel nincs feladat. Módosítsd a választást.');return}practice={list:shuffle(pool).slice(0,count),index:0,responses:{},shown:{}};$('#practiceSetup').classList.add('hidden');$('#practiceSession').classList.remove('hidden');renderPractice()}
  function examPool(scope){const all=qlist.filter(q=>!q.review&&isAuto(q)&&(q.options.length||q.type==='number')&&(!q.requiresFigure||q.figurePaths.length));if(scope==='all')return all;return all.filter(q=>q.year>=2022)}
  function selectExam(pool,count){const math=shuffle(pool.filter(q=>q.type==='number'||/szám|teljesítmény|feszültségesés/i.test(q.section+' '+q.topic+' '+q.prompt))).slice(0,Math.min(8,Math.floor(count/4)));const chosen=[...math];const used=new Set(chosen.map(q=>q.id));const recent=shuffle(pool.filter(q=>q.year>=2025&&!used.has(q.id))).slice(0,Math.ceil(count*.5));chosen.push(...recent);recent.forEach(q=>used.add(q.id));const rest=shuffle(pool.filter(q=>!used.has(q.id)));return shuffle(chosen.concat(rest.slice(0,Math.max(0,count-chosen.length)))).slice(0,count)}
  function startExam(){const pool=examPool($('#examScope').value),count=Number($('#examCount').value);if(pool.length<10){alert('A mintavizsgához még nincs elég megbízhatóan ellenőrizhető feladat. A feladatbank már használható.');return}const list=selectExam(pool,Math.min(count,pool.length));exam={list,index:0,responses:{},flags:{},remaining:90*60,submitted:false};$('#examSetup').classList.add('hidden');$('#examSession').classList.remove('hidden');renderExam();clearInterval(timerId);timerId=setInterval(()=>{if(!exam||exam.submitted)return;exam.remaining--;const el=$('#examTimer');if(el)el.textContent=formatTime(exam.remaining);if(exam.remaining<=0)submitExam()},1000)}
  function formatTime(seconds){const m=Math.floor(Math.max(0,seconds)/60),s=Math.max(0,seconds)%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function renderExam(){if(!exam||exam.submitted)return;const q=exam.list[exam.index],root=$('#examSession'),r=exam.responses[q.id]||'';const answered=Object.keys(exam.responses).filter(id=>exam.responses[id]&&(!Array.isArray(exam.responses[id])||exam.responses[id].length)).length;
    root.innerHTML=`<div class="session-header"><span class="session-title">Mintavizsga</span><span id="examTimer" class="timer ${exam.remaining<600?'low':''}" aria-live="off">${formatTime(exam.remaining)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${100*answered/exam.list.length}%"></div></div><div class="session-progress">${answered}/${exam.list.length} megválaszolva · ${exam.index+1}. feladat</div><div class="exam-nav">${exam.list.map((x,i)=>`<button data-index="${i}" class="${i===exam.index?'current':''} ${exam.responses[x.id]?'answered':''} ${exam.flags[x.id]?'flagged':''}" title="${i+1}. feladat">${i+1}</button>`).join('')}</div>${questionBody(q,'exam',r,false)}<div class="question-actions"><button id="examFlag" class="button outline">${exam.flags[q.id]?'Jelölés törlése':'Megjelölöm későbbre'}</button></div><div class="question-foot"><button id="examPrev" class="button outline" ${exam.index===0?'disabled':''}>← Előző</button><button id="examNext" class="button dark">${exam.index===exam.list.length-1?'Áttekintés':'Következő →'}</button></div><div style="text-align:right;margin-top:17px"><button id="examSubmit" class="text-button">Vizsga beadása és értékelése ↗</button></div>`;
    bindOptions(root);if(q.type==='number')$('#freeAnswer',root).value=r;
    const preserve=()=>{exam.responses[q.id]=selectedFrom(root,q)};
    $$('input[name="answer"]',root).forEach(el=>el.addEventListener('change',preserve));$('#freeAnswer',root)?.addEventListener('input',preserve);
    $$('.exam-nav button',root).forEach(el=>el.addEventListener('click',()=>{preserve();exam.index=Number(el.dataset.index);renderExam()}));
    $('#examFlag').addEventListener('click',()=>{exam.flags[q.id]=!exam.flags[q.id];renderExam()});
    $('#examPrev').addEventListener('click',()=>{preserve();exam.index--;renderExam()});
    $('#examNext').addEventListener('click',()=>{preserve();if(exam.index<exam.list.length-1){exam.index++;renderExam()}else renderExamOverview()});
    $('#examSubmit').addEventListener('click',()=>{preserve();submitExam()});
  }
  function renderExamOverview(){const root=$('#examSession');const missing=exam.list.filter(q=>!exam.responses[q.id]||Array.isArray(exam.responses[q.id])&&!exam.responses[q.id].length).length;root.innerHTML=`<h2 class="question-title">Áttekintés beadás előtt</h2><p>${exam.list.length-missing} feladat megválaszolva, ${missing} üresen maradt.</p><div class="exam-nav">${exam.list.map((x,i)=>`<button data-index="${i}" class="${exam.responses[x.id]?'answered':''} ${exam.flags[x.id]?'flagged':''}">${i+1}</button>`).join('')}</div><div class="question-actions"><button id="backExam" class="button outline">Vissza a feladatokhoz</button><button id="submitExamNow" class="button primary">Beadás és értékelés ↗</button></div>`;$$('.exam-nav button',root).forEach(el=>el.addEventListener('click',()=>{exam.index=Number(el.dataset.index);renderExam()}));$('#backExam').addEventListener('click',renderExam);$('#submitExamNow').addEventListener('click',submitExam)}
  function submitExam(){if(!exam||exam.submitted)return;clearInterval(timerId);exam.submitted=true;let earned=0,total=0,correct=0;exam.list.forEach(q=>{const points=earnedPoints(q,exam.responses[q.id]||'');total+=q.points;earned+=points;if(points===q.points)correct++;mark(q,points===q.points)});const score=total?Math.round(earned/total*100):0;const root=$('#examSession');root.innerHTML=`<div class="kicker">Eredmény</div><h2 class="question-title">A mintavizsga kész</h2><div class="exam-summary"><strong>${score} / 100 pont</strong><p>${correct} feladat teljes pontszámmal ${exam.list.length} feladatból. Több helyes válasznál a részpontot a hibás jelölések csökkentik, de egy feladat sem kap negatív pontot. Az összpontszámot 100 pontra arányosítottuk.</p></div><div class="question-actions"><button id="newExam" class="button primary">Új mintavizsga</button><button id="reviewExam" class="button outline">Feladatok áttekintése</button></div><div id="examReview" class="hidden"></div>`;$('#newExam').addEventListener('click',()=>{exam=null;root.classList.add('hidden');$('#examSetup').classList.remove('hidden')});$('#reviewExam').addEventListener('click',()=>{const review=$('#examReview');review.classList.toggle('hidden');review.innerHTML=exam.list.map((q,i)=>{const points=earnedPoints(q,exam.responses[q.id]||'');return `<div class="review-row"><strong>${i+1}. ${esc(q.prompt.replace(/\s+/g,' ').slice(0,150))}</strong><p>Válaszod: ${esc(Array.isArray(exam.responses[q.id])?exam.responses[q.id].join(', '):exam.responses[q.id]||'—')} · ${Number(points.toFixed(1))}/${q.points} pont</p><button class="text-button" data-review="${esc(q.id)}">Megoldás ↗</button></div>`}).join('');$$('[data-review]',review).forEach(el=>el.addEventListener('click',()=>openQuestion(byId.get(el.dataset.review))))})}
  function init(){
    setupFilters();renderHome();
    $('#startPractice').addEventListener('click',startPractice);$('#startExam').addEventListener('click',startExam);
    $('#dialogClose').addEventListener('click',()=>$('#questionDialog').close());
    $('#questionDialog').addEventListener('click',e=>{if(e.target.id==='questionDialog')e.target.close()});
    $$('[data-view]').forEach(e=>e.addEventListener('click',()=>navigate(e.dataset.view)));
    $$('[data-go]').forEach(e=>e.addEventListener('click',event=>{if(e.tagName==='A')event.preventDefault();navigate(e.dataset.go)}));
    $('#menuToggle').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open))});
    document.addEventListener('click',async event=>{
      const link=event.target.closest('a[data-asset]');
      if(!link||link.href.startsWith('blob:'))return;
      event.preventDefault();
      const tab=window.open('about:blank','_blank');
      if(tab)tab.opener=null;
      try{
        const url=await window.VV_ASSETS.getURL(link.dataset.asset);
        link.href=url+(link.dataset.fragment||'');
        if(tab)tab.location.href=link.href;
      }catch{
        if(tab)tab.close();
        alert('A védett ábra nem nyitható meg. Frissítsd az oldalt, majd próbáld újra.');
      }
    });
    const observer=new MutationObserver(()=>hydrateAssets(document));
    observer.observe($('#main'),{childList:true,subtree:true});
    observer.observe($('#questionDialog'),{childList:true,subtree:true});
    hydrateAssets(document);
    const initial=location.hash.slice(1);
    if(['home','bank','practice','exam','guide'].includes(initial))navigate(initial);
    if(!qlist.length){$('#homeMetrics').innerHTML='<div class="loading">A feladatbank adatai még nem töltődtek be.</div>'}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
