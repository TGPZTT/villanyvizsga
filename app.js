(function(){
  'use strict';
  const raw=window.VV_DATA||{questions:[],sources:[]};
  const TYPE={single:'Egy jó válasz',multi:'Több jó válasz',number:'Számolás',open:'Kifejtés'};
  const KEY='villanyvizsga-progress-v1';
  const norm=s=>String(s??'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const CATEGORY={foundations:'Villanyszerelési alapok, készülékek és kapcsolások',calculation:'Számítás és méretezés',safety:'Biztonság, védelem és mérések',wiring:'Vezetékek és szereléstechnológia'};
  const TOPIC_GROUPS={
    [CATEGORY.calculation]:['szamitas','szamitasok','szazalekos feszultsegeses','feszultsegeses','haromfazisu motor arama','haromfazisu transzformator','haromfazisu teljesitmeny es energia','aszinkronmotor szlipje','fazis nulla zarlati aram','egyfazisu hatasos teljesitmeny','meddo teljesitmeny','teljesitmenytenyezo','terhelo aram es kismegszakito','vezetekkeresztmetszet feszultsegesesre','villamos energia','aramvalto','soros napelemek','vezetek es energia','ellenallas','parhuzamos ellenallas','zarlati aram'],
    [CATEGORY.safety]:['villamos biztonsag','erintesvedelem','vedelmi keszulekek','ip vedettseg','avk','halozati rendszerek','vedo vezeto','olvadobiztosito','kismegszakito','tularamvedelem','tulfeszultseg vedelem','villamvedelem','tuzeseti kapcsolas','meres','meresek es szabvanyok','szabvanyismeret','hurokimpedancia','avk es hurokimpedancia'],
    [CATEGORY.wiring]:['vezetekek es kabelek','vezetektipusok','vezetek szinek','technologia','szerelestechnologia'],
    [CATEGORY.foundations]:['villanyszerelesi alapismeretek','villamos alapismeretek','aramkori alapok','alkatresz es anyag','rajzolvasas','villamos gepek','hibakereses','kapcsolok','keszulekismeret','motorok','szerelvenyek es kapcsolasok']
  };
  function questionCategory(topic,prompt,type){
    const key=norm(topic).replace(/[-–—]/g,' '),text=norm(prompt);
    if(key==='ismeret'){
      if(/keresztmetszet|mertekegysege|energia alap/.test(text))return CATEGORY.calculation;
      if(/szimmetrikus|haromfazisu|csillagkapcsolas|vonali feszultseg/.test(text))return CATEGORY.foundations;
      if(/vezetek|kabel|zold|sarga|szinjeloles/.test(text))return CATEGORY.wiring;
      if(/kapcsolo|lampatest|ket helyrol|ket aramkor/.test(text))return CATEGORY.foundations;
      if(/szetvalaszt|ujraegyesit|ved|aramutes|mentes|kisfeszultseg|szabvany|foldel|feszultsegmentes|tuzeseti|talaj|ip\d|(?:^|\s)pe(?:\s|$)/.test(text))return CATEGORY.safety;
      return CATEGORY.foundations;
    }
    for(const [category,topics] of Object.entries(TOPIC_GROUPS))if(category!==CATEGORY.foundations&&topics.includes(key))return category;
    if(/szamits|szamolja|szamitsa|hat[aá]rozza meg.*(aram|feszultseg|ellenallas|energia|teljesitmeny|keresztmetszet)|mennyi.*(aram|energia|teljesitmeny)/.test(text)||type==='number')return CATEGORY.calculation;
    if(/aramvedo|erintesved|tularam|foldel|zarlat|vedovezeto|vedettseg|vedelmi|aramutes|feszultsegmentes|hurokimpedancia|szabvany|tuzeseti|kisfeszultseg/.test(text))return CATEGORY.safety;
    if(/kapcsolo|kismegszakito|motor|biztosito|rele|keszulek|rajz|aramkor/.test(text))return CATEGORY.foundations;
    if(/vezetek|kabel|szigeteles|vezeto|szereles|csatorna|szerszam|munkafolyamat|bekotes/.test(text))return CATEGORY.wiring;
    return CATEGORY.foundations;
  }
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
    const sourceTopic=q.topic||q.category||'Egyéb',prompt=q.prompt||q.question||'';
    return {...q,id:String(q.id||`q-${i+1}`),sourceId:q.sourceId||src?.id||file,sourceTitle:q.sourceTitle||src?.title||file,sourceFile:file,sourcePath:q.sourcePath||src?.path||'',year,page,number:q.number||q.taskNumber||`${i+1}`,section:q.section||'',sourceTopic,topic:questionCategory(sourceTopic,prompt,type),type,options,answer,explanation:q.explanation||q.solution||'',points:Number(q.points)||2,review:low||answer===null||answer==='',requiresFigure:!!q.requiresFigure,figurePath:figurePaths[0]||'',figurePaths,figureCaptions:Array.isArray(q.figureCaptions)?q.figureCaptions:[],prompt};
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
  const isExamPaper=q=>q.sourceId==='online_2022.04.11.pdf'||/^Villanyszerelő_írásbeli_/u.test(q.sourceId);
  const isContest=q=>q.sourceId==='szkt_írásbeli.pdf'||q.sourceId.startsWith('szakmasztar_forrasok/')||q.id.startsWith('szs-');
  const inSourceScope=(q,scope)=>isExamPaper(q)||(scope==='papers-plus-star'&&isContest(q));
  const answerLabel=q=>{
    if(answerFields(q).length)return answerFields(q).map(field=>`${field.label}: ${field.answer}${field.unit?` ${field.unit}`:''}`).join('\n');
    if(q.options.length){
      const keys=getCorrectKeys(q);
      if(keys.length)return keys.map(key=>{const option=q.options.find(o=>o.key===key);return `${key}. ${option?.text||''}`.trim()}).join('\n');
    }
    if(Array.isArray(q.answer))return q.answer.join(', ');
    if(q.answer===null||q.answer==='')return 'A megoldás felülvizsgálat alatt.';
    return q.answerDisplay||String(q.answer);
  };
  const answerForReview=(q,response)=>{
    if(response===undefined||response===null||response===''||Array.isArray(response)&&!response.length)return 'Nem jelöltél választ.';
    if(answerFields(q).length){const values=Array.isArray(response)?response:[response];return answerFields(q).map((field,i)=>`${field.label}: ${values[i]||'—'}${field.unit?` ${field.unit}`:''}`).join('\n')}
    if(!q.options.length)return Array.isArray(response)?response.join(', '):String(response);
    return (Array.isArray(response)?response:[response]).map(value=>{
      const option=q.options.find(item=>item.key===value)||q.options.find(item=>item.text===value);
      return option?`${option.key}. ${option.text}`:String(value);
    }).join('\n');
  };
  const attemptStatus=q=>progress[q.id]?.status||'new';
  let view='home',bankPage=0,practice=null,exam=null,timerId=null,questionState=null;

  function routeTo(route,replace=false){
    const next=route?`#${route}`:'';
    if(location.hash===next)return;
    if(replace)history.replaceState(null,'',location.pathname+location.search+next);
    else location.hash=next;
  }

  function navigate(target,{updateHash=true,replaceHash=false,scroll=true}={}){
    if(exam&&!exam.submitted&&target!=='exam'){
      routeTo('exam',true);
      const root=$('#examSession');
      if(root&&!$('#examNavigationNotice',root))root.insertAdjacentHTML('afterbegin','<div id="examNavigationNotice" class="feedback review" role="status">A folyamatban lévő próbából a „Próba megszakítása” gombbal léphetsz ki.</div>');
      return;
    }
    view=target;
    $$('.view').forEach(e=>e.classList.toggle('active',e.id===`${target}View`));
    $$('.nav-link[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===target));
    document.body.classList.toggle('question-open',target==='question');
    $('.sidebar').classList.remove('open');$('#menuToggle')?.setAttribute('aria-expanded','false');
    if(updateHash)routeTo(target==='home'?'':target,replaceHash);
    if(scroll)window.scrollTo({top:0,behavior:'instant'});
    if(target==='bank')renderBank();
    if(target==='home')renderHome();
    if(target==='practice')renderWrongTasks();
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
  function renderWrongTasks(){
    const root=$('#wrongTaskList');if(!root)return;
    const wrong=qlist.filter(q=>attemptStatus(q)==='retry');
    setText('#wrongTaskCount',wrong.length);setText('#wrongTaskDescription',wrong.length?`${wrong.length} feladat van az újragyakorlási listán.`:'Most nincs elrontottként megjelölt feladat.');
    root.innerHTML=wrong.map(q=>`<button class="wrong-task-item" type="button" data-wrong-task="${esc(q.id)}"><strong>${esc(q.prompt)}</strong><small>${esc(q.topic)} · ${esc(sourceLabel(q))} · ${esc(q.number)}. feladat</small></button>`).join('');
    $$('#wrongTaskList [data-wrong-task]').forEach(button=>button.addEventListener('click',()=>openQuestion(byId.get(button.dataset.wrongTask))));
    const clear=$('#clearWrongTasks');if(clear)clear.disabled=!wrong.length;
  }
  function clearWrongTasks(){
    const wrong=qlist.filter(q=>attemptStatus(q)==='retry');if(!wrong.length)return;
    if(!window.confirm(`Törlöd az újragyakorlási jelölést ${wrong.length} feladatnál? A többi mentett eredmény megmarad.`))return;
    wrong.forEach(q=>delete progress[q.id]);save();renderWrongTasks();renderHome();renderBank();
  }
  function setupProgressReset(){
    const button=$('#reset-progress-btn'),confirm=$('#reset-progress-confirm');
    if(!button||!confirm)return;
    const close=()=>{confirm.hidden=true;button.setAttribute('aria-expanded','false')};
    $('#clearWrongTasks')?.addEventListener('click',clearWrongTasks);
    button.addEventListener('click',()=>{const open=confirm.hidden;confirm.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)$('#reset-progress-cancel')?.focus()});
    $('#reset-progress-cancel')?.addEventListener('click',()=>{close();button.focus()});
    $('#reset-progress-yes')?.addEventListener('click',()=>{
      Object.keys(progress).forEach(id=>delete progress[id]);
      try{localStorage.removeItem(KEY)}catch{}
      questionState=null;practice=null;renderWrongTasks();
      if(exam?.submitted)resetExam();
      const practiceSession=$('#practiceSession'),practiceSetup=$('#practiceSetup');
      practiceSession?.classList.add('hidden');practiceSetup?.classList.remove('hidden');$('#practiceView')?.classList.remove('practice-running');
      close();renderHome();renderBank();button.focus();
    });
  }
  let figureReturnFocus=null,figurePreviousOverflow='',figureRequest=0;
  function ensureFigureLightbox(){
    let dialog=$('#figureLightbox');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='figureLightbox';dialog.className='figure-lightbox';
    dialog.setAttribute('aria-label','Ábra nagyítása');
    dialog.innerHTML='<div class="figure-lightbox-toolbar"><button class="figure-lightbox-close" type="button">← Bezárás</button></div><img class="figure-lightbox-image" alt=""><p class="figure-lightbox-caption"></p>';
    document.body.append(dialog);
    $('.figure-lightbox-close',dialog).addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dialog.close()}});
    dialog.addEventListener('close',()=>{
      figureRequest++;
      document.body.style.overflow=figurePreviousOverflow;
      $('.figure-lightbox-image',dialog).removeAttribute('src');
      if(figureReturnFocus?.isConnected)figureReturnFocus.focus({preventScroll:true});
      figureReturnFocus=null;
    });
    return dialog;
  }
  async function openFigureLightbox(trigger){
    const dialog=ensureFigureLightbox(),image=$('.figure-lightbox-image',dialog);
    const caption=trigger.dataset.zoomCaption||'Ábra';
    figureReturnFocus=trigger;
    figurePreviousOverflow=document.body.style.overflow;
    $('.figure-lightbox-caption',dialog).textContent=caption;
    image.alt=caption;
    image.removeAttribute('src');
    dialog.showModal();document.body.style.overflow='hidden';
    $('.figure-lightbox-close',dialog).focus();
    const request=++figureRequest;
    try{
      const preview=trigger.closest('figure')?.querySelector('img[data-asset-src]');
      const url=preview?.src?.startsWith('blob:')?preview.src:await window.VV_ASSETS.getURL(trigger.dataset.zoomAsset);
      if(request===figureRequest&&dialog.open)image.src=url;
    }catch{
      if(request===figureRequest&&dialog.open)$('.figure-lightbox-caption',dialog).textContent='Az ábra nem tölthető be. Frissítsd az oldalt, majd próbáld újra.';
    }
  }
  function setupFilters(){
    const group=[...new Map(qlist.map(q=>[q.sourceId,sourceLabel(q)])).entries()];
    $('#sourceFilter').innerHTML='<option value="">Minden feladatsor</option>'+group.sort((a,b)=>b[1].localeCompare(a[1],'hu')).map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
    fillSelect($('#topicFilter'),topicNames(),'Minden téma');
    updatePracticeFilters();
    $('#practiceScope')?.addEventListener('change',updatePracticeFilters);
    $('#practiceSource')?.addEventListener('change',updatePracticeTopicChoices);
    $('#practiceTopicList')?.addEventListener('change',updatePracticeTopicSummary);
    $('#practiceTopicsAll')?.addEventListener('click',()=>{$$('#practiceTopicList input').forEach(input=>input.checked=true);updatePracticeTopicSummary()});
    $('#practiceTopicsClear')?.addEventListener('click',()=>{$$('#practiceTopicList input').forEach(input=>input.checked=false);updatePracticeTopicSummary()});
    ['#searchInput','#sourceFilter','#topicFilter','#typeFilter','#statusFilter'].forEach(s=>$(s).addEventListener(s==='#searchInput'?'input':'change',()=>{bankPage=0;renderBank()}));
    $('#clearFilters').addEventListener('click',()=>{['#searchInput','#sourceFilter','#topicFilter','#typeFilter','#statusFilter'].forEach(s=>$(s).value='');bankPage=0;renderBank()});
  }
  function updatePracticeTopicSummary(){
    const selected=$$('#practiceTopicList input:checked').length,total=$$('#practiceTopicList input').length,summary=$('#practiceTopicSummary');
    if(summary)summary.textContent=selected===0?'Minden téma':selected===total?`Mind a ${total} téma`:`${selected} téma kijelölve`;
  }
  function updatePracticeTopicChoices(){
    const scope=$('#practiceScope')?.value||'papers',source=$('#practiceSource')?.value||'';
    const selected=new Set($$('#practiceTopicList input:checked').map(input=>input.value));
    const pool=qlist.filter(q=>inSourceScope(q,scope)&&(!source||q.sourceId===source));
    const topics=[...new Set(pool.map(q=>q.topic))].sort((a,b)=>a.localeCompare(b,'hu'));
    const root=$('#practiceTopicList');
    root.innerHTML=topics.map(topic=>{const count=pool.filter(q=>q.topic===topic).length;return `<label class="practice-topic-option"><input type="checkbox" value="${esc(topic)}" ${selected.has(topic)?'checked':''}><span>${esc(topic)}</span><small>${count}</small></label>`}).join('');
    updatePracticeTopicSummary();
  }
  function updatePracticeFilters(){
    const scope=$('#practiceScope')?.value||'papers',list=qlist.filter(q=>inSourceScope(q,scope)),sourceSelect=$('#practiceSource'),oldSource=sourceSelect.value;
    const groups=[...new Map(list.map(q=>[q.sourceId,sourceLabel(q)])).entries()].sort((a,b)=>b[1].localeCompare(a[1],'hu'));
    sourceSelect.innerHTML='<option value="">Minden feladatsor</option>'+groups.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
    if(groups.some(([id])=>id===oldSource))sourceSelect.value=oldSource;
    updatePracticeTopicChoices();$('#practicePoolNotice')?.remove();
  }
  function filteredBankQuestions(){
    const query=norm($('#searchInput').value),source=$('#sourceFilter').value,topic=$('#topicFilter').value,type=$('#typeFilter').value,status=$('#statusFilter').value;
    const list=qlist.filter(q=>(!query||norm(`${q.prompt} ${sourceLabel(q)} ${q.topic} ${answerLabel(q)}`).includes(query))&&(!source||q.sourceId===source)&&(!topic||q.topic===topic)&&(!type||q.type===type)&&(!status||attemptStatus(q)===status));
    list.sort((a,b)=>b.year-a.year||sourceLabel(a).localeCompare(sourceLabel(b),'hu')||String(a.number).localeCompare(String(b.number),'hu',{numeric:true}));
    return list;
  }
  function renderBank(){
    const list=filteredBankQuestions();
    setText('#resultCount',`${list.length} feladat található`);
    const size=40,pages=Math.max(1,Math.ceil(list.length/size));bankPage=Math.min(bankPage,pages-1);
    const slice=list.slice(bankPage*size,(bankPage+1)*size);
    if(!slice.length){$('#bankList').innerHTML='<div class="empty">Nincs találat. Próbáld meg más szűrőkkel.</div>';$('#bankPager').innerHTML='';return}
    let last='';$('#bankList').innerHTML=slice.map(q=>{
      const group=q.sourceId;let head='';if(group!==last){head=`<div class="section-head"><div><div class="kicker">${esc(q.year||'')}</div><h2>${esc(sourceLabel(q))}</h2></div></div>`;last=group}
      const status=attemptStatus(q);
      const preview=q.prompt.replace(/\s+/g,' ').slice(0,150);
      return head+`<button class="bank-item" data-id="${esc(q.id)}"><span class="bank-index">${esc(q.number)}</span><span class="bank-main"><strong>${esc(preview)}${q.prompt.length>150?'…':''}</strong><small>${esc(q.topic)} · ${esc(typeLabel(q))} · ${q.points} pont · ${q.page}. oldal</small></span><span class="bank-meta">${q.requiresFigure?'<span class="chip">Ábrás</span>':''}${q.review?'<span class="chip review">Ellenőrzendő megoldás</span>':''}${status!=='new'?`<span class="chip ${status}">${status==='correct'?'Sikerült':'Újra'}</span>`:''}<span aria-hidden="true">↗</span></span></button>`
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
  function answerFields(q){return q.answerFields||q.numericFields||[]}
  function typeLabel(q){const fields=answerFields(q);if(q.type==='number'&&fields.length&&fields.every(field=>field.kind==='choice'))return 'Párosítás';if(q.type==='number'&&fields.some(field=>field.kind==='choice'))return 'Számolás és választás';return TYPE[q.type]||'Feladat'}
  function numericTolerance(field,q,expected){
    if(field&&Object.hasOwn(field,'tolerance'))return Math.max(0,Number(field.tolerance)||0);
    if(q&&Object.hasOwn(q,'tolerance'))return Math.max(0,Number(q.tolerance)||0);
    return Math.max(.01,Math.abs(expected)*.015)
  }
  function fieldCorrect(field,value,q){if(field.kind==='choice')return norm(value)===norm(field.answer);const expected=Number(field.answer),got=parseEnteredNumber(value),tol=numericTolerance(field,q,expected);return Number.isFinite(got)&&Math.abs(got-expected)<=tol}
  function isAuto(q){const nums=String(q.answer??'').match(/[-+]?\d+(?:[.,]\d+)?/g)||[],fields=answerFields(q);return !q.review&&((q.type==='single'||q.type==='multi')&&getCorrectKeys(q).length>0||q.type==='number'&&(fields.length?fields.every(field=>field.kind==='choice'?field.answer!=null:Number.isFinite(Number(field.answer))):nums.length===1&&Number.isFinite(parseNumeric(q.answer))))}
  function parseNumeric(v){if(typeof v==='number')return v;const m=String(v??'').replace(/\s/g,'').replace(',','.').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
  function parseEnteredNumber(v){const value=String(v??'').trim().replace(/\s/g,'').replace(',','.');return /^[-+]?\d+(?:\.\d+)?$/.test(value)?Number(value):NaN}
  function grade(q,response){
    if(!isAuto(q))return null;
    if(q.type==='number'){
      const fields=answerFields(q);
      if(fields.length){const entered=Array.isArray(response)?response:[response];return fields.every((field,index)=>fieldCorrect(field,entered[index],q))}
      const expected=parseNumeric(q.answer),got=parseEnteredNumber(response),tol=numericTolerance(null,q,expected);return Number.isFinite(got)&&Math.abs(got-expected)<=tol;
    }
    const right=getCorrectKeys(q).sort(),given=(Array.isArray(response)?response:[response]).filter(Boolean).sort();return right.length===given.length&&right.every((k,i)=>k===given[i]);
  }
  function earnedPoints(q,response){
    if(!isAuto(q))return 0;
    if(q.type==='number'&&answerFields(q).length){const values=Array.isArray(response)?response:[response],fields=answerFields(q),passed=fields.filter((field,index)=>fieldCorrect(field,values[index],q)).length;return q.points*passed/fields.length}
    if(q.type!=='multi')return grade(q,response)?q.points:0;
    const right=getCorrectKeys(q),given=(Array.isArray(response)?response:[response]).filter(Boolean);
    const good=given.filter(x=>right.includes(x)).length;
    const wrong=given.filter(x=>!right.includes(x)).length;
    return Math.max(0,Math.min(q.points,(good-wrong)*q.points/right.length));
  }
  function mark(q,result,refresh=true){if(result===null)return;progress[q.id]={status:result?'correct':'retry',at:Date.now()};save();if(refresh)renderWrongTasks()}
  function explanationMarkup(q){
    const text=String(q.explanation||'').trim();
    if(!text)return '';
    const equation=/[=≈≤≥]/.test(text)&&/\d|[Δ√Ωφρη]/u.test(text);
    const base=equation?`<div class="calculation-note"><span class="calculation-note-label">A számítás indoklása</span><p>${esc(text)}</p></div>`:`<p class="specific-explanation">${esc(text)}</p>`;
    const rule=text.length<185?learningRule(q):'';
    return base+(rule?`<div class="concept-note"><strong>A feladatban erre figyelj</strong><p>${esc(rule)}</p></div>`:'');
  }
  function questionHint(q){
    if(String(q.hint||'').trim())return q.hint.trim();
    const text=norm(`${q.prompt} ${q.topic}`),topic=norm(q.topic),prompt=q.prompt;
    if(/szerelvenydoboz/.test(text)&&/rajz|terv/.test(text))return 'A rajzjelmagyarázatból azonosítsd a dugaljakat és a kapcsolókat, majd helyiségenként számold meg a szerelvényhelyeket. A lámpatest és az elosztó jelét ne kezeld külön szerelvénydobozként.';
    if(/(?:vezetek|vezeto)szam|hany vezetek/.test(text)&&q.requiresFigure)return 'A jelölt szakasz két oldalán kövesd végig az ereket egyenként. A vonal egy kábelnyomvonalat mutat; a válasz a benne továbbhaladó külön vezetők száma.';
    if(/(?:lampatest|szerelvenydoboz|fuggetlen .*? aramkor|fogyasztoi aramkor)/.test(text)&&q.requiresFigure)return 'A kérdésben felsorolt mennyiségeket külön oszlopban vedd számba. Előbb a terv jelmagyarázatával azonosítsd a jeleket, utána helyiségenként ellenőrizd, melyik áramkörhöz tartoznak.';
    if(/kapocstabl/.test(text)&&/csillag|delta|bekot/.test(text))return 'Nézd meg a kapocstáblán a tekercsek hat kezdő- és végpontját, majd keresd meg, mely kapcsokat kell közösíteni. A hálózati feszültséget is vesd össze a motor adattábláján szereplő Δ/Y értékekkel.';
    if(/akkumul|telep/.test(text)&&/kapcsok|feszultseg|tolt/.test(text))return 'A kapocsfeszültség nem ugyanaz töltés, nyugalmi állapot és kisütés közben. Hasonlítsd össze, melyik állapotban van a telepben a legnagyobb elektromotoros erő, és vedd figyelembe, hogy a töltőáram a kapocsfeszültségre ráadódik.';
    if(/hosszabbito/.test(text)&&/epitesi|terulet/.test(text))return 'Építési területen a vezeték mechanikai igénybevétele és mozgatása is számít. Olyan hajlékony, kültéri/nehéz üzemi kábelt keress, amelynek köpenye bírja a helyszíni igénybevételt; a sima falba szerelhető vezetéket zárd ki.';
    if(/belogas|tavvezetek|vezetek.*feszul/.test(text))return 'A belógást a vezető súlya és feszessége, a két tartópont távolsága, valamint a hőmérséklet miatti hosszváltozás befolyásolja. A válaszok közül azokat válaszd, amelyek ténylegesen megváltoztatják ezeket.';
    if(/villamos energia|energiafogyaszt|fogyasztas/.test(text)||/villamos energia/.test(topic)){
      if(/haromfaz/.test(text))return 'Ha az energiafeladat előbb teljesítményt kér, háromfázisú esetben P=√3·U·I·cosφ-t használd; utána szorozd meg az üzemidővel. A kW és az óra szorzata kWh.';
      if(/cos.?φ|cosphi|teljesitmenytenyezo/.test(text))return 'Előbb számítsd ki a hatásos teljesítményt a cosφ figyelembevételével, majd az üzemidővel szorozz. A kW·h eredménye kWh; percben megadott időt előbb alakíts órára.';
      return 'Ellenállásos vízmelegítőnél előbb P=U·I alapján kapod meg a wattot, majd E=P·t szerint számold az energiát. Az időt órában használd, az eredményt kWh-ban add meg.';
    }
    if(/egyfazisu hatasos teljesitmeny|teljesitmenytenyezo/.test(topic)||/mekkora a hatasos teljesitmeny/.test(text))return 'Egyfázisú váltakozó áramnál a hatásos teljesítményhez a feszültséget, az áramot és a cosφ-t szorozd össze: P=U·I·cosφ. A cosφ nélküli U·I csak a látszólagos teljesítmény.';
    if(/haromfazisu transzformator/.test(topic)||/transzformator/.test(text))return 'A névleges teljesítményből az áramot a feszültséggel osztva kapod meg. Háromfázisú oldalon a √3·U vonali teljesítményképlet szerepel; az elsődleges és szekunder oldalt a saját feszültségével számold.';
    if(/hurokimpedancia|zarlati aram/.test(text)||/hurokimpedancia/.test(topic))return 'A kioldási áramot a kismegszakító névleges áramából és a megadott α tényezőből határozd meg. A megengedett Zs-hez a fázisfeszültséget oszd ezzel az árammal; ne a 400 V vonali feszültséget használd.';
    if(/vezetekkeresztmetszet feszultsegesesre|feszultsegeses/.test(topic)||/feszultsegeses/.test(text))return 'Előbb a százalékos határt váltsd át voltokra. Egyfázisú oda-vissza vezetéknél a teljes út kétszeres hossz; háromfázisú képletnél √3 és vonali feszültség szerepel. A végén ellenőrizd, hogy a választott keresztmetszetnél az esés a határ alatt marad-e.';
    if(/aramvalto/.test(text)||/aramvalto/.test(topic))return 'Az áttételt a névleges primer és szekunder áram hányadosa adja. Ezt szorozd meg a tényleges szekunder árammal; a VA-adat terhelhetőségi adat, nem az áramáttétel része.';
    if(/soros napelem/.test(topic)||/napelem/.test(text))return 'Soros kapcsolásnál a feszültségek adódnak össze, az áramot viszont a sorba kötött panelek közül a legkisebb korlátozza. A kérdésben azt az adatot válaszd, amelyiket keresik: Uoc, Isc vagy teljesítmény.';
    if(/terhelo aram es kismegszakito/.test(topic)||/kismegszakito/.test(text)&&/fogyaszto|aramkore/.test(text))return 'Számítsd ki előbb a fogyasztó üzemi áramát a teljesítményből és a feszültségből. A kismegszakító névleges árama legyen az üzemi áram fölött, de a vezeték megengedett terhelhetőségét se lépje túl.';
    if(/villamos gep|motor/.test(topic)&&/aram|nevleges/.test(text))return 'Motor esetén a felvett villamos teljesítményt használd, ne a tengelyen leadottat: a hatásfokkal is számolni kell. Háromfázisú áramnál √3·U·cosφ kerül a nevezőbe.';
    if(/szerszam|meromuszer/.test(text)&&/szereles|vedocso|fal/.test(text))return 'A műveletekhez rendelj szerszámcsoportot: kijelöléshez mérő- és jelölőeszköz, dobozhelyhez fúró/maró, horonyhoz vésőeszköz, bekötéshez szerelőszerszám, ellenőrzéshez mérőműszer. A felsorolásból csak az adott munkafázishoz tartozókat vedd.';
    if(/rajzjel|jelkepek|jelmagyarazat/.test(text))return 'Az ábrán a jel alakját és a környező bekötéseket együtt vizsgáld. Hasonlítsd össze a rajzjelet a jelmagyarázatban szereplő kapcsoló-, tekercs- és védelmi készülékjelekkel; ne csak a forma alapján találgass.';
    if(/tuzeseti kapcsolo|tuzeseti/.test(text))return 'A feladat a tűzoltás biztonságát szolgáló lekapcsolási funkciót kérdezi. Vedd figyelembe, hogy egyes tűzvédelmi vagy életvédelmi rendszereknek tűz közben is működniük kell.';
    if(/csillarkapcsol|ket aramkort|ket fen(y|yforras)|ket helyrol|valtokapcsol/.test(text))return 'Különítsd el a két helyről vezérelt egy fénykört a két külön fénykörtől: előbbinél a kapcsolási helyek, utóbbinál az egymástól független kapcsolt kimenetek száma dönt.';
    if(/hamis allitas|valassza ki.*(hamis|nem igaz)/.test(text))return 'Itt a hamis állítást kell megjelölni. Minden lehetőségnél keresd meg a feltételt vagy kivételt; a „mindig”, „csak” és „minden” szavak különösen fontosak.';
    if(/kep|fenykep|rajzon|abra|metszet/.test(text))return 'Olvasd le az ábrán látható szerkezeti részletet: keresd a kapcsok, feliratok, vezetőszínek vagy védővezető-jelölés helyét. Ezután válaszd azt az elnevezést, amelyet az ábra ténylegesen alátámaszt.';
    if(/alapterhelhetoseg|terhelhetosegi tenyezo|terhelesi tenyezo/.test(text))return 'Az alapterhelhetőség táblázati kiinduló érték. A tényleges terhelhetőséget csökkenti például a környezeti hőmérséklet, a hőszigetelésben vezetés és az együtt terhelt kábelek csoportosítása; válaszd ki, melyik tényező szerepel a feladat feltételei között.';
    if(/tulajdonsag.*vezet|vezetek.*(keresztmetszet|belogas)/.test(text)&&/feszultseg aszimmetria/.test(text))return 'A három fázis feszültsége akkor marad közel azonos, ha a fázisterhelés kiegyenlített és a nulla-/PEN-vezető ép. A válaszok között azt keresd, amely ezt az egyensúlyt bontja meg.';
    if(/feszultseg aszimmetria/.test(text))return 'A három fázis eltérő feszültsége gyakran az egyfázisú terhelések egyenlőtlen elosztásával vagy a nulla/PEN vezető hibájával függ össze. Válaszd szét az okot és az aszimmetria következményét.';
    if(/vedelmi mod|t apalas onmukodo lekapcsolasa|tapalas onmukodo lekapcsolasa/.test(text))return 'Az önműködő lekapcsolás a hibavédelmi mód; a PE-vezetőn kialakuló hibaáramnak kell működtetnie a védelmi készüléket. Keresd azokat a megoldásokat, amelyek a testet a földelt rendszerponthoz kötik és lekapcsolást biztosítanak.';
    if(/pe folytonossag|vedovezeto.*folytonossag/.test(text))return 'Hiba esetén a PE-nek kis ellenállású, folytonos utat kell adnia a hibaáramnak. Gondold végig, milyen veszély maradna, ha egy készülék fémháza és a védelmi lekapcsolást indító vezető között megszakadás lenne.';
    if(/hibafeszultseg/.test(text))return 'Hibafeszültségnél nem a táplálás névleges feszültségét keresed, hanem a hiba miatt feszültség alá kerülő test és a földpotenciálú referencia közötti értéket.';
    if(/alapvedelem/.test(text))return 'Az alapvédelem normál üzemben akadályozza meg az aktív részek közvetlen megérintését. Válaszd külön a burkolat/szigetelés feladatát a testzárlat utáni hibavédelemtől.';
    if(/villamos keszulek teste|villamos szerkezet teste|keszulek testet/.test(text))return 'A „test” a készülék megérinthető, vezetőképes részeire vonatkozik, amelyek normál üzemben nem aktívak, de szigetelési hiba miatt feszültség alá kerülhetnek. Ne keverd össze az aktív részekkel vagy a burkolat szigetelő anyagával.';
    if(/kisfeszultseg|nagyfeszultseg/.test(text))return 'A feszültségszint besorolásánál a feladatlap határértékét használd: váltakozó és egyenfeszültségre eltérő kisfeszültségi határ szerepel. Előbb olvasd le a feszültség fajtáját, csak utána hasonlítsd a számot a határhoz.';
    if(/homokagy|foldkabel/.test(text))return 'A földkábel homokágyának szerepét a kábel mechanikai védelmével és a környező talaj egyenletes felfekvésével kapcsold össze. A homok kiszűri az éles köveket és csökkenti a köpeny sérülésének esélyét.';
    if(/lepes.?feszultseg/.test(text))return 'A lépésfeszültség a talaj két, egymástól lépéstávolságra lévő pontja közötti potenciálkülönbség. Olyan megoldást keress, amely csökkenti a talajfelszín potenciálkülönbségeit vagy a két láb közötti távolságot.';
    if(/tulfeszultseg forras|tulfeszultseg.*ered/.test(text))return 'A túlfeszültség eredhet légköri villámhatásból és kapcsolási eseményből is. A lehetőségeket aszerint vizsgáld, hogy hirtelen energiát juttathatnak-e a hálózatba.';
    if(/meddo.*mertekegyseg|meddo teljesitmeny/.test(text))return 'A teljesítményháromszögben P a hatásos, Q a meddő, S a látszólagos teljesítmény. A Q mértékegysége var; a W a hatásos teljesítményé, a VA az S-é.';
    if(/szelektiv/.test(text)&&/olvadobiztosito|tularam/.test(text))return 'Szelektivitásnál a hibához legközelebbi, kisebb leágazási védelem oldjon le először, a fővédelem pedig maradjon bekapcsolva. Biztosítóknál az áramarány mellett a gyártói idő–áram görbéket is össze kell vetni.';
    if(/pancelozat/.test(text))return 'A páncélzat a kábel külső mechanikai igénybevétellel szembeni védelmét szolgálja. Különítsd el ezt az érszigetelés és a köpeny villamos/környezeti védelmi feladatától.';
    if(/kabel.*fektetese elott|fektetes elott/.test(text))return 'Fektetés előtt a nyomvonal járhatóságát és alkalmasságát, a dob és a kábel sértetlenségét, valamint a szükséges hajlítási sugár betarthatóságát ellenőrizd. A kábel behúzása után ezek már nehezen javíthatók.';
    if(/kabelalagut/.test(text))return 'A kábelalagút zárt, járható vagy ellenőrizhető építmény, amelyben több kábel rendezett nyomvonalon vezethető. Gondold végig, miben különbözik a falba süllyesztett csőtől vagy a nyitott kábeltálcától.';
    if(/foldelo elektr|talajba helyezett foldelo/.test(text))return 'A földelő elektródának tartósan korrózióállónak kell lennie, és közvetlen talajkapcsolatra alkalmas anyagból kell készülnie. A válaszoknál a korrózióállóságot és az előírt anyaghasználatot ellenőrizd.';
    if(/a.?m jelleg|olvadobiztosito/.test(text)&&/motor/.test(text))return 'Az aM biztosító motoráramkörhöz való, de a motor nagy indítóárama miatt az alapvető feladata a zárlatvédelem. A túlterhelés elleni védelemről külön készülék gondoskodik.';
    if(/vastag falu/.test(text))return 'A védőcső helyét a falvastagság, a mechanikai igénybevétel és a gyártói rendeltetés dönti el. A vastag falú cső nagyobb mechanikai védelme miatt elsősorban a felületen vezetett szerelés felé mutat.';
    if(/vedocso.*falon kivul|falon kivul.*vedocso/.test(text))return 'Falon kívüli szerelésnél a csőnek a helyiség környezeti és mechanikai igénybevételét kell viselnie. A lehetőségeknél különítsd el a vakolat alá szánt vékony falú csövet a merev, felületi vezetésre való típustól.';
    if(/szabvany/.test(text))return 'A feladat egy konkrét, a feladatlapon megnevezett szabványt kér. Válaszd el a létesítési szabványokat a közcélú hálózatra csatlakozás műszaki feltételeit rögzítő dokumentumtól.';
    if(/hibakereses|nem vilagit|halvany/.test(text))return 'A tünetek alapján először a két kapcsolt áramkör közös bekötési pontját vizsgáld. Ha egy izzó csak bizonyos kapcsolóállásban halvány, mérd végig, nem került-e sorba olyan fogyasztó, amelynek párhuzamosan kellene működnie.';
    if(/villamvedelmi felfogo/.test(text))return 'A felfogó a villámvédelmi rendszer tetején álló rész: feladata a becsapási pont kijelölése és az áram továbbvezetése a levezető felé, nem a földelés helyettesítése.';
    if(/surge|tulfeszultseg-levezeto|finom.*tulfeszultseg/.test(text))return 'A finom, 3. fokozatú túlfeszültség-védelem a védendő végberendezés közelébe kerül. A levezető bekötésénél a rövid, kis impedanciájú PE-út a fontos.';
    if(/rajzon lathato rendszer|pen szetvalasztas/.test(text))return 'A rendszer betűjelét a táplálás földelési pontja és a fogyasztói testek védővezetős kapcsolata alapján olvasd le. A PEN szétválasztása után figyeld meg, hogy az N és PE külön vezetőként fut-e tovább.';
    if(/forg asirany|forgasirany|motorindito|motor indito/.test(text))return 'A vezérlőrajzban azonosítsd külön a túlterhelés-védelmet, a leállító/indító nyomógombokat és a mágneskapcsoló tekercsét. Forgásirányváltásnál a két mágneskapcsoló feladata a fázissorrend felcserélése; motorindításnál az öntartó érintkező a nyomógombbal párhuzamos.';
    if(/hany kismegszakito|tartalek.*aramkor|tartalek.*kismegszakito/.test(text))return 'Számold meg először a tervben ténylegesen kialakítandó fogyasztói áramköröket. A kérdésben kért tartalékot ezután add hozzá; a főkapcsolót és az ÁVK-t ne számold kismegszakítóként.';
    if(/0,5 mm|4,69|pe vezeto.*keresztmetszet|csatlakozo pe/.test(text))return 'A feladat kifejezetten a mellékelt terhelhetőségi táblázatra hivatkozik: hasonlítsd össze a 4,69 A motoráramot az egyes keresztmetszetek megengedett értékével, és a még elegendő legkisebbet keresd. Ez a feladatlapi táblázat eredménye; valós PE-méretezést ne vezess le pusztán az üzemi áramból.';
    if(/i\. osztaly|erintesvedelmi osztaly.*i\b|i osztaly/.test(text))return 'Az I. érintésvédelmi osztály jellegzetessége a védőkapoccsal ellátott, megérinthető vezetőképes test. A hiba elleni védelemhez a PE-folytonosság és az önműködő lekapcsolás együtt szükséges.';
    if(/emberi testen|kez es kez|kozvetlen erintes/.test(text))return 'Az áram nagysága az emberi test ellenállásától és a test két pontja közötti feszültségtől is függ. A válaszok közül olyan megoldást keress, amely csökkenti az érintési feszültséget, az áram útját vagy az áramütés időtartamát.';
    if(/szelektiv/.test(text))return 'Szelektív működésnél a hibahelyhez legközelebbi védelem old le, a fölérendelt védelem pedig lehetőleg bekapcsolva marad. Biztosítóknál vagy kismegszakítóknál a névleges értékek mellett a kioldási görbéket is össze kell vetni.';
    if(/sorba|munkafazis|technologiai sorrend/.test(text))return 'A sorrendet a fizikai kivitelezés korlátozza: előbb kijelölés és falmegmunkálás, utána dobozok/csövek rögzítése, majd vezetékbehúzás, bekötés és ellenőrzés. Ne rendezd előre a vakolás után elvégzendő munkát.';
    if(/eszköz|szerszam|meromuszer/.test(text)&&/szereles|vedocso|vezetekazonositas/.test(text))return 'A szerszámokat a műveletekhez rendeld: jelöléshez mérő/jelölő eszköz, dobozhelyhez fúró vagy maró, horonyhoz vésőgép, bekötéshez szerelőszerszám, ellenőrzéshez villamos mérőműszer.';
    if(/kismegszakito|c10|4500/.test(text)&&/jelzes|jeloles|230 v/.test(text))return 'A feliratot elemenként olvasd: a C betű a kioldási karakterisztika, az utána álló szám a névleges áram, a 4500 a megszakítóképesség. A 230 V~ a névleges váltakozó feszültségre utal.';
    if(/nullazott|hiba.*aram|hiba.*vedelmi/.test(text))return 'Nullázott rendszerben a testzárlati hibaáram a fázis és a PEN/PE-visszavezetési út között záródik. A védelmi mód megnevezésénél azt kövesd, hogy a test hogyan kapcsolódik a táplálás földelt pontjához.';
    if(/uzemi kondenzatoros motor|nem indul.*meglok|kezi.*meglok/.test(text))return 'Ha a motor kézi meglökés után bármelyik irányba tovább forog, a főtekercs létrehozza a forgó működéshez szükséges mezőt, de az indító nyomaték hiányzik. Ellenőrizd az üzemi/segédfázis és a kondenzátor áramkörét.';
    if(/csatlakozo vezetek|feszultsegeses/.test(text)&&q.type==='number')return 'A feladat megadja az áramot és a vezeték ellenállását, ezért a feszültségeséshez az Ohm-törvényt használd: ΔU=I·R. Ellenőrizd, hogy az ellenállás már az oda-vissza vezetékre vonatkozik-e.';
    if(q.type==='number'||/szamitsa|mennyi|mekkora az aram|fogyasztasat|eredo ellenallas/.test(text)){
      if(/haromfazis|3×400|3x400/.test(text))return 'Írd ki külön az adatokat, váltsd a kW-ot W-ra, majd használd a háromfázisú összefüggést. A vonali feszültséghez tartozó √3-at és a megadott cos φ-t is vedd figyelembe.';
      if(/energia|fogyasztas|perc|uzemido/.test(text))return 'Először az üzemidőt alakítsd órára. Az energiához a teljesítményt és az időt kell összeszorozni; ha több fogyasztó szerepel, a részfogyasztásokat csak ezután add össze.';
      if(/feszultsegeses|ellenallas|keresztmetszet|hurokimpedancia|zarlati aram/.test(text))return 'Írd fel a keresett mennyiséget és a hozzá tartozó mértékegységet. A vezeték hosszánál ellenőrizd, hogy a feladat oda-vissza hosszt kér-e; csak azután helyettesíts a képletbe.';
      return `Emeld ki a kérdésben kért mennyiséget (${prompt.split(/[?.!]/u)[0].slice(-85).trim()}). A megadott számok mellé írd oda a jelüket és egységüket, majd csak az ehhez tartozó képletbe helyettesíts.`;
    }
    if(/jeloles|adattabla|felirat/.test(text))return 'Haladj végig a jelölésen balról jobbra: különítsd el a gyártót, a névleges értéket, a karakterisztikát és a védettségi vagy megszakítóképességi adatot. Ne következtess olyan tulajdonságra, amit a felirat nem tartalmaz.';
    if(/\bip\d|ipxx/u.test(text))return 'Az IP-jelölés két számjegyét külön olvasd: az első a szilárd testek és az érintés, a második a víz elleni védelmi fokozat. Az X azt jelenti, hogy arra a helyre nincs megadott fokozat.';
    if(/h07|h05|nyy|nay|mcu|h07v/u.test(text))return 'A vezeték vagy kábel kódját részekre bontva értelmezd: a névleges feszültség és a szigetelőanyag után nézd meg a hajlékonyságot, az éranyagát, majd az erek számát és keresztmetszetét.';
    if(/aram-vedokapcsolo|avk|kulonbozeti kioldo|iδn|idelta/u.test(text))return 'Az ÁVK az oda- és visszafolyó áram különbségét figyeli. A névleges áram a terhelhetőségi adat, az IΔn a kioldási érzékenység; egyik sem helyettesíti a másikat.';
    if(/vedovezeto|pe keresztmetszet|pen vezeto|zold-sarga/u.test(text))return 'A PE/PEN jelölésnél különítsd el a védővezető funkcióját a fázisvezetőétől. Ha keresztmetszetet kér a feladat, a feladatlapon megadott táblázat/tartomány szerint válassz, ne csak a vezetékszín alapján.';
    if(/tn-c-s|tn-c|tn-s|it rendszer|tt rendszer/u.test(text))return 'A hálózati rendszer betűiből indulj ki: az első betű a táplálás földelését, a második a testek védővezetőhöz való kapcsolását jelzi. A C közös PEN-vezetőt, az S külön PE- és N-vezetőt jelent.';
    if(/szereloi ellenorzes|szigetelesi ellenallas|vedovezeto folytonossag/u.test(text))return 'Az ellenőrzés célját kösd a munka állapotához: a szerelés után, feszültség alá helyezés előtt a vezetők folytonosságát és a szigetelés állapotát kell igazolni.';
    if(/csillagkapcsolas|vonali feszultseg|haromfazisu szimmetrikus/u.test(text))return 'Háromfázisú csillagkapcsolásnál a vonali feszültség két fázis között mérhető, a fázisfeszültség pedig egy fázis és a csillagpont között. A két érték aránya √3.';
    if(/szlip|aszinkronmotor/u.test(text))return 'A szlip a forgó mágneses tér szinkronfordulata és a forgórész fordulata közti különbség aránya. A százalékhoz a különbséget a szinkronfordulattal oszd, ne a motor tényleges fordulatával.';
    if(/feszultsegmentesites|aramutes|mentes/u.test(text))return 'Biztonsági kérdésnél először azt határozd meg, hogy a berendezés feszültség alatt van-e. A mentést csak az áramütés veszélyének megszüntetése után lehet biztonságosan megkezdeni.';
    if(/hany.*(?:rajz|szakasz)|abra alapjan|rajz alapjan/.test(text))return 'Először keresd meg az ábrán a kérdésben megnevezett jelölést vagy szakaszt. Kövesd a kapcsolatokat a közvetlen szomszédos elemekig, és csak az ábrán ténylegesen szereplő jeleket számold.';
    if(/milyen kapcsolo|hany helyrol/.test(text))return 'A kapcsoló típusát az dönti el, hány helyről kell vezérelni ugyanazt a világítási kört, illetve hány kört kell külön kapcsolni. A megfogalmazásban ezt a működési igényt keresd.';
    if(/sorrend|munkafazis|technologiai/.test(text))return 'A munkamenetet a kész szerelés felől gondold vissza: a vezeték csak rögzített csőbe/csatornába húzható, a nyomvonalat és a dobozhelyeket pedig a fal megmunkálása előtt kell kijelölni.';
    if(/meres|merni/.test(text))return 'Vedd észre, hogy a feladat feszültség alatti működéspróbáról vagy üzembe helyezés előtti ellenőrzésről kérdez. Az utóbbi esetben a vezetékek és a szigetelés biztonságos állapotát igazoló mérésre gondolj.';
    if(/melyik allitas|igaz|helyes/.test(text))return 'A válaszlehetőségeket a feladatban szereplő konkrét feltételhez mérd. Az olyan szavakat, mint „csak”, „mindig” és „nem kell”, külön ellenőrizd: egyetlen ellenpélda is cáfolhatja az állítást.';
    return `A kérdés kulcsszava: „${prompt.split(/\s+/u).slice(0,9).join(' ')}”. Fogalmazd meg, pontosan mit kér, majd a megadott ábrát, jelölést vagy feltételt használd bizonyítékként; ne csak a témakör általános szabályát idézd.`;
  }
  function learningRule(q){
    const text=norm(`${q.prompt} ${q.topic} ${q.explanation}`);
    if(/szerelvenydoboz/.test(text))return 'A dobozszámot a falba kerülő kapcsoló- és dugaljhelyekből vezesd le; a lámpatest és az elosztó külön tétel.';
    if(/(?:vezetek|vezeto)szam|hany vezetek/.test(text)&&q.requiresFigure)return 'A keresztmetszeten áthaladó külön ereket számold, ne a nyomvonalak vagy leágazások számát.';
    if(/\bip\d|ipxx/.test(text))return 'Az IP első számjegye a szilárd testek/érintés, a második a víz elleni védelmi fokozatot jelöli; X esetén arra a tulajdonságra nincs megadott szám.';
    if(/aram-vedokapcsolo|avk|iδn|idelta/.test(text))return 'Az ÁVK a fázison ki- és a nullán visszafolyó áram eltérésére old le; túlterhelés és zárlat ellen önmagában nem helyettesíti a kismegszakítót.';
    if(/h07|h05|nyy|nay|mcu/.test(text))return 'A kábeljelölésben a betűk az ér/szigetelés jellemzőit, a számok az erek számát és keresztmetszetét adják meg; a J jel zöld-sárga eret jelent.';
    if(/tn-c-s|tn-c|tn-s|pen/.test(text))return 'A TN-C szakaszon a PE és N közös PEN, a szétválasztás után pedig PE és N külön vezető marad; a két vezetőt a szétválasztás után nem egyesítjük újra.';
    if(/vedoosztaly|erintesvedelmi osztaly|ii\. osztaly|iii\. osztaly/.test(text))return 'I. osztály: PE-hez kötött test; II. osztály: kettős/megerősített szigetelés; III. osztály: biztonsági törpefeszültségű táplálás.';
    if(/kapcsolo|kapcsolas/.test(text)&&/ket helyrol|ket hely|ket aramkor|ket fenyo|ket fenyforras/.test(text))return 'Két helyről ugyanazt a fénykört váltókapcsolókkal vezérlik; két külön fénykör egy helyről kétáramkörös (csillár-) kapcsolóval választható.';
    if(/szereloi ellenorzes|ellenorzes szuksegessege/.test(text))return 'A szerelés vagy javítás utáni ellenőrzés a megváltozott villamos állapotot vizsgálja; az időszakos felülvizsgálat ettől külön feladat.';
    if(/olvadobiztosito|kismegszakito|kioldasi karakterisztika/.test(text))return 'A névleges áramot és a kioldási karakterisztikát külön olvasd le: az amperérték a terhelést, a betűjel az idő-áram jelleggörbét írja le.';
    if(/feszultsegeses|vezetekkere sztmetszet|keresztmetszet/.test(text))return 'A feszültségesésnél a teljes áramköri vezetékhosszal dolgozz; az oda-vissza út kétszeres hossz, hacsak a feladat már hurokhosszt nem ad meg.';
    if(/milyen kapcsolo|kapcsolot hasznal|lampatestet ket helyrol/.test(text))return 'A vezérlési helyek száma dönti el a kapcsolást: két helyről váltókapcsolás, több helyről közbenső kapcsolókkal kiegészített váltókapcsolás kell.';
    return '';
  }
  function wrongAnswerMarkup(q,response){
    if(response===undefined||response===null||response===''||Array.isArray(response)&&!response.length)return '';
    const choice=q.type==='single'||q.type==='multi';
    if(choice){
      const selected=Array.isArray(response)?response:[response],correct=getCorrectKeys(q),wrong=selected.filter(key=>!correct.includes(key));
      const missed=correct.filter(key=>!selected.includes(key));
      if(!wrong.length&&!missed.length)return '';
      const correctText=correct.map(key=>{const option=q.options.find(item=>item.key===key);return option?`${option.key}. ${option.text}`:key}).join('; ');
      const reasons=wrong.map(key=>{const option=q.options.find(item=>item.key===key),reason=q.optionReasons?.[key]||`A helyes állítás: ${correctText}. ${q.explanation||learningRule(q)||questionHint(q)}`;return `<li><b>${esc(option?`${option.key}. ${option.text}`:key)}</b><span>${esc(reason)}</span></li>`}).join('');
      const missedHtml=missed.length?`<p>A több jó válaszos feladatból ezeket is jelölni kellett volna: ${esc(missed.map(key=>{const option=q.options.find(item=>item.key===key);return option?`${option.key}. ${option.text}`:key}).join('; '))}.</p>`:'';
      return `<div class="answer-rationale"><strong>A választásodról</strong>${reasons?`<p>Ezt jelölted, de ezek az állítások nem helyesek:</p><ul>${reasons}</ul>`:''}${missedHtml}</div>`;
    }
    if(q.type==='number'&&isAuto(q)){
      const expected=answerFields(q).length?answerFields(q):[{label:'Eredmény',answer:parseNumeric(q.answer),unit:'',tolerance:q.tolerance}],values=Array.isArray(response)?response:[response];
      const missed=expected.map((field,index)=>!fieldCorrect(field,values[index],q)?field:null).filter(Boolean);
      if(!missed.length)return '';
      const expectedFor=field=>field.kind==='choice'?`ezt kellett választani: ${field.answer}`:`az elfogadott érték ${field.answer}${field.unit?` ${field.unit}`:''}`;
      return `<div class="answer-rationale"><strong>A válaszod javítása</strong><p>${missed.map(field=>`${esc(field.label)}: ${field.kind==='choice'?'a kiválasztott válasz nem megfelelő; '+expectedFor(field):'a beírt szám nem megfelelő; '+expectedFor(field)}.`).join(' ')}</p><p>${esc(q.explanation||'Ellenőrizd az adatokat, a képletbe helyettesítést és a mértékegységek átváltását.')}</p></div>`;
    }
    return '';
  }
  function questionBody(q,mode,response,show){
    const auto=isAuto(q),multi=q.type==='multi',choice=q.type==='single'||q.type==='multi';
    const values=Array.isArray(response)?response:[response];
    const right=show&&choice?getCorrectKeys(q):[];
    const opts=q.options.length?(choice?`<div class="options">${q.options.map(o=>`<label class="option ${values.includes(o.key)?'selected':''} ${right.includes(o.key)?'correct-option':''} ${show&&values.includes(o.key)&&!right.includes(o.key)?'incorrect-option':''}"><input type="${multi?'checkbox':'radio'}" name="answer" value="${esc(o.key)}" ${values.includes(o.key)?'checked':''} ${show&&['exam','review'].includes(mode)?'disabled':''}><span><b>${esc(o.key)}.</b> ${esc(o.text)}</span>${right.includes(o.key)?'<span class="option-result" aria-label="Helyes válasz">✓</span>':''}${show&&values.includes(o.key)&&!right.includes(o.key)?'<span class="option-result" aria-label="Nem helyes válasz">×</span>':''}</label>`).join('')}</div>`:`<div class="options">${q.options.map(o=>`<div class="option"><span><b>${esc(o.key)}.</b> ${esc(o.text)}</span></div>`).join('')}</div>`):'';
    const input=!choice?(mode==='review'||(!auto&&mode!=='exam')?'':q.type==='number'?answerFields(q).length?`<div class="numeric-answer-list">${answerFields(q).map((field,i)=>`<label class="numeric-answer-row"><span><b>${esc(field.label)}</b><small>${esc(field.unit|| (field.kind==='choice'?'Válassz egy értéket':'Számérték, mértékegység nélkül'))}</small></span>${field.kind==='choice'?`<select class="answer-input answer-field-select" data-numeric-index="${i}" aria-label="${esc(field.label)}" ${show&&['exam','review'].includes(mode)?'disabled':''}><option value="">Válassz…</option>${field.options.map(option=>`<option value="${esc(option)}">${esc(option)}</option>`).join('')}</select>`:`<input class="answer-input numeric-answer" data-numeric-index="${i}" inputmode="decimal" type="text" aria-label="${esc(field.label)} számértéke" placeholder="Számérték" ${show&&['exam','review'].includes(mode)?'disabled':''}>`}</label>`).join('')}</div>`:`<label class="numeric-answer-row numeric-answer-single"><span><b>Válasz</b><small>Számérték, mértékegység nélkül</small></span><input class="answer-input" id="freeAnswer" inputmode="decimal" type="text" placeholder="Írd be a számot" ${show&&['exam','review'].includes(mode)?'disabled':''}></label>`:`<textarea class="answer-input long" id="freeAnswer" rows="4" placeholder="Írd ide a megoldásod" ${show&&['exam','review'].includes(mode)?'disabled':''}>${esc(response||'')}</textarea>`):'';
    const figure=q.figurePaths.length?`<div class="question-figures">${q.figurePaths.map((src,i)=>{const caption=q.figureCaptions[i]||`A feladathoz tartozó ábra${q.figurePaths.length>1?` ${i+1}`:''}`;return `<figure class="question-figure"><a class="figure-open" href="#" data-zoom-asset="${esc(src)}" data-zoom-caption="${esc(caption)}" aria-haspopup="dialog" aria-label="${esc(caption)} nagyítása"><img data-asset-src="${esc(src)}" alt="${esc(sourceLabel(q))}: ${esc(caption)}" loading="lazy" decoding="async"></a><figcaption>${esc(caption)} <a href="#" data-zoom-asset="${esc(src)}" data-zoom-caption="${esc(caption)}" aria-haspopup="dialog">Nagyítás</a></figcaption></figure>`}).join('')}</div>`:'';
    const sourceFigureLink=['bank','practice'].includes(mode)?sourceLink(q):'';
    const hintOpen=mode==='bank'?!!questionState?.hints[q.id]:mode==='practice'?!!practice?.hints?.[q.id]:false;
    const hintText=['bank','practice'].includes(mode)?questionHint(q):'';
    const hint=hintText?`<div class="question-inline-hint"><button id="questionHintToggle" class="question-hint-toggle" type="button" aria-expanded="${hintOpen}" aria-controls="questionHint"><span aria-hidden="true">?</span> ${hintOpen?'Támpont elrejtése':'Támpont kérése'} <span aria-hidden="true">${hintOpen?'−':'+'}</span></button><div id="questionHint" class="question-hint-body" ${hintOpen?'':'hidden'}><strong>Támpont</strong><p>${esc(hintText)}</p></div></div>`:'';
    const title=mode==='bank'?`<div class="question-meta" aria-label="Forrás és feladatszám">${esc(sourceLabel(q))} · ${esc(q.number)}. feladat</div>`:`<div class="question-meta">${esc(sourceLabel(q))} · ${esc(q.number)}. feladat</div>`;
    const prompt=mode==='bank'?`<h1 id="questionTitle" class="question-title question-prompt" tabindex="-1">${esc(q.prompt)}</h1>`:`<h2 class="question-title question-prompt">${esc(q.prompt)}</h2>`;
    const mobileActions=mode==='bank'?`<div class="question-mobile-actions">${isAuto(q)?'<button id="questionCheckMobile" class="button primary" type="button">Válasz ellenőrzése</button>':''}${!show?`<button id="questionShowMobile" class="button ${isAuto(q)?'outline':'primary'}" type="button">Megoldás és magyarázat</button>`:''}</div><div id="questionFeedbackMobile" role="status" aria-live="polite"></div>`:'';
    const rationale=show&&mode!=='review'?wrongAnswerMarkup(q,response):'';
    return `<div class="question-top"><div class="tags"><span class="chip">${esc(q.topic)}</span><span class="chip">${esc(typeLabel(q))}</span>${q.requiresFigure?'<span class="chip">Ábrás feladat</span>':''}${q.review?'<span class="chip review">Megoldás ellenőrzendő</span>':''}</div><span>${q.points} pont</span></div>${title}${prompt}${figure}${sourceFigureLink}${hint}${opts}${input}${mobileActions}${!auto&&mode==='exam'?'<div class="feedback review">Ezt a feladatot a vizsga végén önellenőrzéssel lehet értékelni.</div>':''}${show&&mode!=='review'?`<div class="explanation"><strong>Megoldás</strong><p>${esc(answerLabel(q))}</p>${rationale}${q.explanation?`<strong style="margin-top:14px">Miért?</strong>${explanationMarkup(q)}`:''}${q.review?'<p>A forrás vagy a válaszkulcs ellenőrzése szükséges; biztonsági szempontból kétes állítást ne tanulj meg tényként.</p>':''}${sourceLink(q)}</div>`:''}`;
  }
  function selectedFrom(root,q){if(q.type==='single'||q.type==='multi'){const checked=$$('input[name="answer"]:checked',root).map(x=>x.value);return q.type==='multi'?checked:checked[0]||''}if(q.type==='number'&&answerFields(q).length)return $$('.numeric-answer, .answer-field-select',root).map(input=>input.value);return $('#freeAnswer',root)?.value||''}
  function restoreNumericResponse(root,q,response){if(q.type!=='number')return;if(answerFields(q).length){const values=Array.isArray(response)?response:[response];$$('.numeric-answer, .answer-field-select',root).forEach((input,index)=>input.value=values[index]||'')}else if($('#freeAnswer',root))$('#freeAnswer',root).value=response||''}
  function isEmptyResponse(q,response){return Array.isArray(response)?!response.some(value=>String(value??'').trim()):!String(response??'').trim()}
  function bindOptions(root){$$('.option input',root).forEach(input=>input.addEventListener('change',()=>$$('.option',root).forEach(label=>label.classList.toggle('selected',!!$('input:checked',label)))))}
  function openQuestion(q,{fromRoute=false,origin=view}={}){
    if(!q||exam&&!exam.submitted)return;
    if(!questionState||view!=='question'||!questionState.ids.includes(q.id)){
      const homeView=origin==='exam'?'exam':'bank';
      const list=homeView==='exam'&&exam?.list?exam.list:filteredBankQuestions();
      const ids=list.map(item=>item.id);
      if(!ids.includes(q.id))ids.unshift(q.id);
      questionState={ids,index:ids.indexOf(q.id),origin:homeView,originId:q.id,returnScroll:fromRoute?0:window.scrollY,returnPage:bankPage,responses:{},shown:{},hints:{},feedback:{}};
      if(fromRoute&&homeView==='bank')bankPage=Math.floor(questionState.index/40);
    }else questionState.index=Math.max(0,questionState.ids.indexOf(q.id));
    renderQuestionPage(fromRoute?'none':view==='question'?'replace':'push',true);
  }
  function captureQuestionResponse(){
    if(!questionState)return;
    const q=byId.get(questionState.ids[questionState.index]),root=$('#questionContent');
    if(q&&root&&$('#questionTitle',root))questionState.responses[q.id]=selectedFrom(root,q);
  }
  function questionStep(delta){
    if(!questionState)return;
    const next=questionState.index+delta;
    if(next<0||next>=questionState.ids.length)return;
    captureQuestionResponse();questionState.index=next;renderQuestionPage('replace',true);
  }
  function returnFromQuestion(){
    if(!questionState)return navigate('bank',{replaceHash:true});
    captureQuestionResponse();
    const {origin,originId:stateReturnId,returnScroll,returnPage}=questionState;
    if(origin==='bank')bankPage=returnPage;
    navigate(origin,{replaceHash:true,scroll:false});
    requestAnimationFrame(()=>{
      window.scrollTo({top:returnScroll,behavior:'instant'});
      if(origin==='bank')$(`#bankList .bank-item[data-id="${CSS.escape(stateReturnId)}"]`)?.focus({preventScroll:true});
    });
  }
  function renderQuestionPage(routeMode='none',resetScroll=false){
    if(!questionState)return;
    const state=questionState,q=byId.get(state.ids[state.index]);
    if(!q)return;
    const root=$('#questionContent');
    if(!root)return;
    const total=state.ids.length,ordinal=state.index+1,hasPrev=state.index>0,hasNext=state.index<total-1;
    const response=state.responses[q.id]??'',shown=!!state.shown[q.id],feedback=state.feedback[q.id];
    const feedbackHtml=feedback?`<div class="feedback ${feedback.kind}">${esc(feedback.text)}</div>`:'';
    const prev=`<button type="button" class="question-nav-button" data-question-step="-1" ${hasPrev?'':'disabled'} aria-label="Előző találat">← Előző</button>`;
    const next=`<button type="button" class="question-nav-button next" data-question-step="1" ${hasNext?'':'disabled'} aria-label="Következő találat">Következő →</button>`;
    const jumpOptions=state.ids.map((id,i)=>{const item=byId.get(id);return `<option value="${i}" ${i===state.index?'selected':''}>${i+1}. ${esc(sourceLabel(item))} · ${esc(item.number)}. feladat</option>`}).join('');
    const status=attemptStatus(q)==='correct'?'Sikerült':attemptStatus(q)==='retry'?'Újra gyakorlom':'Még nem gyakorolt';
    root.innerHTML=`<div class="question-workspace"><header class="question-workspace-nav"><button id="questionBack" class="question-back" type="button">← ${state.origin==='exam'?'Vizsga áttekintése':'Feladatbank'}</button><span class="question-workspace-counter">${ordinal}. találat a szűrt ${total} feladatból</span></header><div class="question-workspace-layout"><article class="question-workspace-main">${questionBody(q,'bank',response,shown)}</article><aside class="question-workspace-side" aria-label="Feladat adatai és vezérlés"><div class="question-side-card"><span class="question-side-kicker">FELADAT ADATAI</span><div class="question-side-detail"><span>Téma</span><b>${esc(q.topic)}</b></div><div class="question-side-detail"><span>Feladatsor</span><b>${esc(sourceLabel(q))} · ${esc(q.number)}. feladat</b></div><div class="question-side-detail"><span>Típus · pont</span><b>${esc(typeLabel(q))} · ${q.points} pont</b></div><div class="question-side-detail"><span>Gyakorlási állapot</span><b>${status}</b></div></div><div class="question-side-nav"><label for="questionJump">Ugrás a szűrt találatok között</label><select id="questionJump" aria-label="Ugrás egy másik találatra">${jumpOptions}</select><div class="question-side-nav-buttons">${prev}${next}</div></div><div class="question-side-actions">${isAuto(q)?'<button id="questionCheck" class="button primary" type="button">Válasz ellenőrzése</button>':''}${!shown?`<button id="questionShow" class="button ${isAuto(q)?'outline':'primary'}" type="button">Megoldás és magyarázat</button>`:''}${!isAuto(q)&&shown?'<button id="questionGotIt" class="button outline" type="button">Megértettem</button>':''}<button id="questionRetry" class="button outline" type="button">Újra gyakorlom</button></div><div id="questionFeedback" role="status" aria-live="polite">${feedbackHtml}</div></aside></div></div>`;
    $('#questionFeedbackMobile',root).innerHTML=feedbackHtml;
    restoreNumericResponse(root,q,response);
    bindOptions(root);
    view='question';
    $$('.view').forEach(e=>e.classList.toggle('active',e.id==='questionView'));
    $$('.nav-link[data-view]').forEach(e=>e.classList.remove('active'));
    document.body.classList.add('question-open');
    $('.sidebar').classList.remove('open');$('#menuToggle')?.setAttribute('aria-expanded','false');
    if(routeMode!=='none')routeTo(`question/${encodeURIComponent(q.id)}`,routeMode==='replace');
    if(resetScroll){window.scrollTo({top:0,behavior:'instant'});$('#questionTitle',root).focus({preventScroll:true})}
    $('#questionBack',root).addEventListener('click',returnFromQuestion);
    $$('[data-question-step]',root).forEach(button=>button.addEventListener('click',()=>questionStep(Number(button.dataset.questionStep))));
    $('#questionJump',root).addEventListener('change',event=>{const index=Number(event.target.value);if(!Number.isInteger(index)||index<0||index>=state.ids.length)return;captureQuestionResponse();state.index=index;renderQuestionPage('replace',true)});
    $('#questionHintToggle',root)?.addEventListener('click',()=>{
      state.hints[q.id]=!state.hints[q.id];
      const open=state.hints[q.id],button=$('#questionHintToggle',root);
      button.setAttribute('aria-expanded',String(open));
      button.innerHTML=`<span aria-hidden="true">?</span> ${open?'Támpont elrejtése':'Támpont kérése'} <span aria-hidden="true">${open?'−':'+'}</span>`;
      $('#questionHint',root).hidden=!open;
    });
    $('#questionCheck',root)?.addEventListener('click',()=>{
      captureQuestionResponse();
      const answer=state.responses[q.id],empty=isEmptyResponse(q,answer);
      if(empty){state.feedback[q.id]={kind:'review',text:'Előbb add meg a válaszodat. Támpontot is kérhetsz.'};const notice='<div class="feedback review">Előbb add meg a válaszodat. Támpontot is kérhetsz.</div>';$('#questionFeedback',root).innerHTML=notice;$('#questionFeedbackMobile',root).innerHTML=notice;return}
      const result=grade(q,answer);mark(q,result);state.shown[q.id]=true;
      state.feedback[q.id]=result===null?{kind:'review',text:'Hasonlítsd össze a válaszodat a megoldással, majd jelöld a feladatot.'}:result?{kind:'',text:'Helyes válasz.'}:{kind:'wrong',text:'Még nem ez a megoldás. Nézd át a magyarázatot, majd próbáld újra.'};
      renderQuestionPage();
      requestAnimationFrame(()=>$('#questionFeedback')?.focus({preventScroll:true}));
    });
    $('#questionShow',root)?.addEventListener('click',()=>{captureQuestionResponse();state.shown[q.id]=true;renderQuestionPage();requestAnimationFrame(()=>$('.explanation',$('#questionContent'))?.scrollIntoView({behavior:'smooth',block:'center'}))});
    $('#questionCheckMobile',root)?.addEventListener('click',()=>$('#questionCheck',root).click());
    $('#questionShowMobile',root)?.addEventListener('click',()=>$('#questionShow',root)?.click());
    $('#questionGotIt',root)?.addEventListener('click',()=>{progress[q.id]={status:'correct',at:Date.now()};save();renderWrongTasks();state.feedback[q.id]={kind:'',text:'Önellenőrzés szerint sikerült.'};renderQuestionPage()});
    $('#questionRetry',root).addEventListener('click',()=>{captureQuestionResponse();progress[q.id]={status:'retry',at:Date.now()};save();renderWrongTasks();state.feedback[q.id]={kind:'review',text:'Felvéve az újragyakorláshoz.'};renderQuestionPage()});
    hydrateAssets(root);
  }
  function exitPractice(){
    practice=null;
    $('#practiceSession').classList.add('hidden');
    $('#practiceSetup').classList.remove('hidden');
    $('#practiceView').classList.remove('practice-running');
    window.scrollTo({top:0,behavior:'instant'});
  }
  function renderPractice(){
    if(!practice)return;
    const q=practice.list[practice.index],root=$('#practiceSession'),r=practice.responses[q.id]??'',shown=!!practice.shown[q.id],auto=isAuto(q);
    const position=practice.index+1,total=practice.list.length,status=attemptStatus(q)==='correct'?'Sikerült':attemptStatus(q)==='retry'?'Újra gyakorlom':'Még nem értékelt';
    const feedback=practice.feedback?.[q.id];
    const actions=`${auto?'<button id="practiceCheck" class="button primary" type="button">Válasz ellenőrzése</button>':''}${!shown?`<button id="practiceShow" class="button ${auto?'outline':'primary'}" type="button">Megoldás és magyarázat</button>`:''}${!auto&&shown?'<button id="practiceGotIt" class="button outline" type="button">Megértettem</button>':''}<button id="practiceHard" class="button outline" type="button">Ezt újra gyakorlom</button>`;
    root.innerHTML=`<div class="practice-layout"><article class="practice-main"><div class="practice-mobile-head"><span>${position} / ${total} feladat</span><button id="practiceExitMobile" type="button">Kilépés</button></div>${questionBody(q,'practice',r,shown)}<div class="practice-mobile-actions">${auto?'<button id="practiceCheckMobile" class="button primary" type="button">Válasz ellenőrzése</button>':''}${!shown?`<button id="practiceShowMobile" class="button ${auto?'outline':'primary'}" type="button">Megoldás és magyarázat</button>`:''}${!auto&&shown?'<button id="practiceGotItMobile" class="button outline" type="button">Megértettem</button>':''}<button id="practiceHardMobile" class="button outline" type="button">Újra gyakorlom</button><div class="practice-mobile-nav"><button id="practicePrevMobile" class="button outline" type="button" ${position===1?'disabled':''}>← Előző</button><button id="practiceNextMobile" class="button dark" type="button">${position===total?'Befejezés':'Következő →'}</button></div></div></article><aside class="practice-rail" aria-label="Gyakorlás vezérlése"><div class="practice-rail-head"><strong>Gyakorlás</strong><button id="practiceExit" type="button">Kilépés</button></div><div class="practice-rail-count">${position} <span>/ ${total} feladat</span></div><div class="progress-track"><div class="progress-fill" style="width:${position/total*100}%"></div></div><div class="question-side-detail"><span>Téma</span><b>${esc(q.topic)}</b></div><div class="question-side-detail"><span>Feladatsor</span><b>${esc(sourceLabel(q))} · ${esc(q.number)}. feladat</b></div><div class="question-side-detail"><span>Állapot</span><b>${status}</b></div><div class="practice-rail-actions">${actions}</div><div id="practiceFeedback" role="status" aria-live="polite">${feedback?`<div class="feedback ${feedback.kind}">${esc(feedback.text)}</div>`:''}</div><div class="practice-rail-nav"><button id="practicePrev" class="button outline" type="button" ${position===1?'disabled':''}>← Előző</button><button id="practiceNext" class="button dark" type="button">${position===total?'Befejezés':'Következő →'}</button></div></aside></div>`;
    restoreNumericResponse(root,q,r);
    bindOptions(root);
    const preserve=()=>{practice.responses[q.id]=selectedFrom(root,q)};
    const setFeedback=(kind,text)=>{practice.feedback??={};practice.feedback[q.id]={kind,text};renderPractice()};
    $('#practiceCheck',root)?.addEventListener('click',()=>{
      preserve();const answer=practice.responses[q.id],empty=isEmptyResponse(q,answer);
      if(empty){setFeedback('review','Előbb válassz vagy adj meg egy választ.');return}
      practice.shown[q.id]=true;const result=grade(q,answer);mark(q,result);
      setFeedback(result?'':'wrong',result?'Helyes válasz.':'A beírt válasz eltér a megoldástól. A részletes indoklás most megjelenik a feladat alatt.');
    });
    $('#practiceShow',root)?.addEventListener('click',()=>{preserve();practice.shown[q.id]=true;renderPractice()});
    $('#questionHintToggle',root)?.addEventListener('click',()=>{practice.hints[q.id]=!practice.hints[q.id];renderPractice()});
    $('#practiceGotIt',root)?.addEventListener('click',()=>{progress[q.id]={status:'correct',at:Date.now()};save();renderWrongTasks();setFeedback('','Önellenőrzés szerint sikerült.')});
    $('#practiceHard',root).addEventListener('click',()=>{progress[q.id]={status:'retry',at:Date.now()};save();renderWrongTasks();setFeedback('review','Felvéve az újragyakorláshoz.')});
    $('#practicePrev',root).addEventListener('click',()=>{preserve();practice.index--;renderPractice();window.scrollTo({top:0,behavior:'instant'})});
    $('#practiceNext',root).addEventListener('click',()=>{preserve();if(position<total){practice.index++;renderPractice();window.scrollTo({top:0,behavior:'instant'})}else{root.innerHTML=`<div class="exam-summary"><strong>Kész</strong><p>${total} feladaton mentél végig. A megjelölteket a feladatbank „Újra gyakorlom” szűrőjével találod meg.</p></div><button id="practiceAgain" class="button primary" type="button">Új gyakorlás</button>`;$('#practiceAgain').addEventListener('click',exitPractice)}});
    $('#practiceExit',root).addEventListener('click',exitPractice);
    for(const id of ['Check','Show','GotIt','Hard','Prev','Next','Exit'])$('#practice'+id+'Mobile',root)?.addEventListener('click',()=>$('#practice'+id,root)?.click());
    hydrateAssets(root);
  }
  function startPractice(){
    const scope=$('#practiceScope')?.value||'papers',topics=new Set($$('#practiceTopicList input:checked').map(input=>input.value)),source=$('#practiceSource').value,retryOnly=$('#retryOnly').checked,count=Number($('#practiceCount').value);
    const pool=qlist.filter(q=>inSourceScope(q,scope)&&(!topics.size||topics.has(q.topic))&&(!source||q.sourceId===source)&&(!retryOnly||attemptStatus(q)==='retry'));
    if(!pool.length){
      const setup=$('#practiceSetup');let notice=$('#practicePoolNotice',setup);
      if(!notice){setup.insertAdjacentHTML('beforeend','<p id="practicePoolNotice" class="feedback review" role="alert"></p>');notice=$('#practicePoolNotice',setup)}
      notice.textContent='Ezzel a témával, feladatsorral és gyakorlási állapottal nincs elérhető feladat. Válassz más feltételeket.';
      return;
    }
    $('#practicePoolNotice')?.remove();
    practice={list:shuffle(pool).slice(0,count),index:0,responses:{},shown:{},hints:{},feedback:{}};$('#practiceSetup').classList.add('hidden');$('#practiceSession').classList.remove('hidden');$('#practiceView').classList.add('practice-running');renderPractice();window.scrollTo({top:0,behavior:'instant'});
  }
  const EXAM_AREAS=[
    {id:'material',label:'Alkatrészek és anyagok',weight:20},
    {id:'technology',label:'Technológia',weight:20},
    {id:'calculation',label:'Számítás',weight:20},
    {id:'safety',label:'Villamos biztonság',weight:40}
  ];
  function examArea(q){
    const topic=norm(`${q.sourceTopic||q.topic} ${q.section}`),prompt=norm(q.prompt);
    if(/szamitas|szamolas|teljesitmeny|feszultsegeses|hurokimpedancia|zarlati aram|szlip|aramvalto|haromfazisu motor arama|villamos energia|vezetekkeresztmetszet feszultsegesesre|soros napelemek/.test(topic)||/szamitsa ki|szamolja ki|szamitsd ki/.test(prompt))return 'calculation';
    if(/villamos biztonsag|erintesvedelem|vedelmi keszulekek|avk|meresek es szabvanyok/.test(topic)||/erintesvedelem|vedovezeto|foldeles|tularamvedelem|feszultsegmentesites|aramvedo kapcsolo|fi rele|hibaaram/.test(prompt))return 'safety';
    if(/technologia|szerelvenyek es kapcsolasok/.test(topic)||/szereles menete|bekotes sorrendje|munkafolyamat|milyen sorrendben/.test(prompt))return 'technology';
    return 'material';
  }
  function examPool(scope){
    const all=qlist.filter(q=>!q.review&&['single','multi'].includes(q.type)&&q.options.length>=2&&isAuto(q)&&(!q.requiresFigure||q.figurePaths.length));
    return all.filter(q=>inSourceScope(q,scope));
  }
  function selectExam(pool,count){
    const quotas=EXAM_AREAS.map(area=>({id:area.id,count:Math.floor(count*area.weight/100),remainder:count*area.weight/100%1}));
    for(let remaining=count-quotas.reduce((n,x)=>n+x.count,0);remaining>0;remaining--)quotas.sort((a,b)=>b.remainder-a.remainder)[0].count++,quotas[0].remainder=-1;
    const chosen=[],used=new Set();
    for(const quota of quotas){
      const candidates=shuffle(pool.filter(q=>examArea(q)===quota.id&&!used.has(q.id)));
      candidates.slice(0,quota.count).forEach(q=>{chosen.push(q);used.add(q.id)});
    }
    const rest=shuffle(pool.filter(q=>!used.has(q.id)));
    return shuffle(chosen.concat(rest.slice(0,Math.max(0,count-chosen.length)))).slice(0,count);
  }
  function startExam(){
    const pool=examPool($('#examScope').value),count=Number($('#examCount').value);
    if(pool.length<count){
      const setup=$('#examSetup');let notice=$('#examPoolNotice',setup);
      if(!notice){setup.insertAdjacentHTML('beforeend','<p id="examPoolNotice" class="feedback review" role="alert"></p>');notice=$('#examPoolNotice',setup)}
      notice.textContent=`Ebben a forráscsoportban ${pool.length} ellenőrizhető választós feladat van. Válassz kevesebb kérdést, vagy kapcsold be a Szakma Sztár feladatokat.`;
      notice.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    $('#examPoolNotice')?.remove();
    const list=selectExam(pool,count);
    exam={list,index:0,phase:'main',responses:{},drafts:{},skipped:[],remaining:90*60,deadline:Date.now()+90*60*1000,submitted:false,revealed:false,endReason:''};
    $('#examSetup').classList.add('hidden');$('#examSession').classList.remove('hidden');$('#examView').classList.add('exam-running');document.body.classList.add('exam-running');
    renderExam();clearInterval(timerId);timerId=setInterval(tickExam,250);
  }
  function tickExam(){
    if(!exam||exam.submitted)return;
    exam.remaining=Math.max(0,Math.ceil((exam.deadline-Date.now())/1000));
    ['#examTimer','#examTimerMobile'].forEach(selector=>{const el=$(selector);if(el){el.textContent=formatTime(exam.remaining);el.classList.toggle('low',exam.remaining<600)}});
    if(exam.remaining<=0)submitExam('time');
  }
  function formatTime(seconds){const m=Math.floor(Math.max(0,seconds)/60),s=Math.max(0,seconds)%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function examCurrent(){
    if(!exam||!['main','skipped'].includes(exam.phase))return null;
    return exam.phase==='main'?exam.list[exam.index]:byId.get(exam.skipped[exam.index]);
  }
  function examRail(interactive=false){
    const second=exam.phase==='skipped';
    const position=second?exam.index+1:exam.phase==='main'?exam.index+1:exam.list.length;
    const positionTotal=second?exam.skipped.length:exam.list.length;
    const pending=exam.phase==='ready'?0:second?exam.skipped.length-exam.index:exam.skipped.length;
    const current=interactive?examCurrent():null;
    const topic=current?`<div class="exam-szev-rail-card topic"><span>Téma</span><strong>${esc(current.topic)}</strong><small>Gyakorló besorolás: ${esc(EXAM_AREAS.find(area=>area.id===examArea(current))?.label||'—')}</small></div>`:'';
    const actions=interactive?`<div class="exam-szev-actions">${second?'':`<button id="examSkip" class="button outline" type="button">Átlépem a feladatot</button>`}<button id="examNext" class="button primary" type="button">${exam.index===positionTotal-1?'Tovább a lezáráshoz':'Következő feladat'} <span aria-hidden="true">→</span></button></div><div id="examWarning" class="exam-szev-warning" role="alert" hidden><strong>Nincs megadott válasz.</strong><p>Ha így lépsz tovább, ez a feladat véglegesen 0 pontot ér. Visszalépni később nem lehet. ${second?'Ebben a körben már nem lehet újra átlépni.':'Az „Átlépem a feladatot” gombbal egyszer még visszatérhetsz rá.'}</p><div><button id="examEmptyCancel" class="button outline" type="button">Vissza a feladathoz</button><button id="examEmptyConfirm" class="button dark" type="button">Igen, továbblépek</button></div></div>`:'';
    return `<aside class="exam-szev-rail" aria-label="Vizsga állapota és vezérlés"><div class="exam-szev-rail-card time"><span>Hátralévő idő</span><strong id="examTimer" class="timer ${exam.remaining<600?'low':''}" aria-live="off">${formatTime(exam.remaining)}</strong><small>A próba közben az idő nem áll meg.</small></div><div class="exam-szev-rail-card"><span>${second?'Visszatérő feladat':'Aktuális feladat'}</span><strong>${position} <em>/ ${positionTotal}</em></strong><small>${second?'Átlépett feladatok köre':'Első kör · nincs visszalépés'}</small></div><div class="exam-szev-rail-card"><span>Átlépett feladat</span><strong>${pending}</strong><small>${second?'Ezeket már nem lehet újra átlépni.':'Az első kör után még egyszer visszatérnek.'}</small></div>${topic}${actions}</aside>`;
  }
  function renderExam(){
    if(!exam||exam.submitted)return;
    if(exam.phase==='skippedIntro'||exam.phase==='ready'){renderExamCheckpoint();return}
    const q=examCurrent(),root=$('#examSession'),r=exam.drafts[q.id]??'';
    const second=exam.phase==='skipped',position=exam.index+1,total=second?exam.skipped.length:exam.list.length;
    root.innerHTML=`<div class="exam-szev-layout"><article class="exam-szev-main"><div class="exam-szev-top"><span class="kicker">${second?'ÁTLÉPETT FELADATOK · MÁSODIK KÖR':'MINTAVIZSGA · ELSŐ KÖR'}</span><span class="exam-szev-count">${position} / ${total}</span></div><div class="exam-szev-mobile-summary"><span>Hátralévő idő <b id="examTimerMobile">${formatTime(exam.remaining)}</b></span><span>Átlépett: ${second?exam.skipped.length-exam.index:exam.skipped.length}</span></div>${questionBody(q,'exam',r,false)}<div class="exam-szev-actions-mobile">${second?'':`<button id="examSkipMobile" class="button outline" type="button">Átlépem</button>`}<button id="examNextMobile" class="button primary" type="button">Következő →</button></div><p class="exam-szev-rule">A beadott válasz után nincs visszalépés. A megoldások a próba lezárása után érhetők el. Az oldal frissítése megszakítja ezt a próbát.</p></article>${examRail(true)}</div>`;
    bindOptions(root);if(q.type==='number')$('#freeAnswer',root).value=r;
    const preserve=()=>{exam.drafts[q.id]=selectedFrom(root,q)};
    $$('input[name="answer"]',root).forEach(el=>el.addEventListener('change',preserve));$('#freeAnswer',root)?.addEventListener('input',preserve);
    $('#examSkip',root)?.addEventListener('click',()=>{delete exam.drafts[q.id];if(!exam.skipped.includes(q.id))exam.skipped.push(q.id);advanceExam()});
    $('#examSkipMobile',root)?.addEventListener('click',()=>$('#examSkip',root)?.click());
    $('#examNextMobile',root)?.addEventListener('click',()=>$('#examNext',root).click());
    $('#examNext',root).addEventListener('click',()=>{
      preserve();const response=exam.drafts[q.id];
      const empty=Array.isArray(response)?!response.length:!String(response??'').trim();
      if(empty){$('#examWarning',root).hidden=false;$('#examWarning',root).scrollIntoView({behavior:'smooth',block:'center'});return}
      commitExam(q,response);
    });
    $('#examEmptyCancel',root).addEventListener('click',()=>{$('#examWarning',root).hidden=true;$('#examNext',root).focus()});
    $('#examEmptyConfirm',root).addEventListener('click',()=>commitExam(q,''));
    bindExamAbort(root);
    hydrateAssets(root);
  }
  function commitExam(q,response){exam.responses[q.id]=response;delete exam.drafts[q.id];advanceExam()}
  function advanceExam(){
    exam.index++;
    if(exam.phase==='main'&&exam.index>=exam.list.length){exam.phase=exam.skipped.length?'skippedIntro':'ready';exam.index=0}
    else if(exam.phase==='skipped'&&exam.index>=exam.skipped.length){exam.phase='ready';exam.index=0}
    renderExam();window.scrollTo({top:0,behavior:'instant'});
  }
  function renderExamCheckpoint(){
    const hasSkipped=exam.phase==='skippedIntro',root=$('#examSession');
    root.innerHTML=`<div class="exam-szev-layout"><article class="exam-szev-main exam-szev-checkpoint"><div class="exam-szev-top"><span class="kicker">${hasSkipped?'ELSŐ KÖR BEFEJEZVE':'MINDEN FELADAT BEADVA'}</span><button id="examAbort" class="text-button" type="button">Próba megszakítása</button></div><h2>${hasSkipped?`${exam.skipped.length} átlépett feladat vár`:'A próba lezárható'}</h2><p>${hasSkipped?'Az átlépett feladatokat most még egyszer megkapod. Ebben a körben már nem lépheted át őket újra. Dönthetsz úgy is, hogy a próbát most zárod le; a kihagyott kérdések akkor 0 pontot érnek.':'A beadott válaszokon már nem módosíthatsz. A próba lezárásakor még nem látszik az eredmény; azt külön tanulási nézetben nyithatod meg.'}</p><div class="exam-szev-checkpoint-choice"><button id="examContinue" class="button primary" type="button">${hasSkipped?'Átlépett feladatok megnyitása':'Teszt befejezése'} →</button>${hasSkipped?'<button id="examFinishEarly" class="button outline" type="button">Teszt befejezése az átlépettek nélkül</button>':''}</div>${hasSkipped?'<div id="examFinishConfirm" class="exam-szev-confirm" hidden><strong>Az átlépett feladatok megválaszolatlanok maradnak.</strong><label><input id="examAbandonConfirm" type="checkbox"> Megértettem, hogy ezekre 0 pontot kapok.</label><button id="examFinishConfirmed" class="button dark" type="button" disabled>Próba lezárása</button></div>':''}<div id="examAbortConfirm" class="exam-szev-warning" hidden><strong>Megszakítod a próbát?</strong><p>Az eddigi válaszok elvesznek, tanulási kiértékelés nem készül.</p><div><button id="examAbortCancel" class="button outline" type="button">Folytatom</button><button id="examAbortYes" class="button dark" type="button">Megszakítom</button></div></div></article>${examRail()}</div>`;
    $('#examContinue',root).addEventListener('click',()=>{if(hasSkipped){exam.phase='skipped';exam.index=0;renderExam();window.scrollTo({top:0,behavior:'instant'})}else submitExam('manual')});
    if(hasSkipped){
      $('#examFinishEarly',root).addEventListener('click',()=>{$('#examFinishConfirm',root).hidden=false;$('#examFinishConfirm',root).scrollIntoView({behavior:'smooth',block:'center'})});
      $('#examAbandonConfirm',root).addEventListener('change',event=>{$('#examFinishConfirmed',root).disabled=!event.target.checked});
      $('#examFinishConfirmed',root).addEventListener('click',()=>{if($('#examAbandonConfirm',root).checked)submitExam('manual')});
    }
    bindExamAbort(root);
  }
  function bindExamAbort(root){
    if(!$('#examAbort',root))$('.exam-szev-top',root).insertAdjacentHTML('beforeend','<button id="examAbort" class="text-button" type="button">Próba megszakítása</button>');
    if(!$('#examAbortConfirm',root))$('.exam-szev-main',root).insertAdjacentHTML('beforeend','<div id="examAbortConfirm" class="exam-szev-warning" hidden><strong>Megszakítod a próbát?</strong><p>Az eddigi válaszok elvesznek, tanulási kiértékelés nem készül.</p><div><button id="examAbortCancel" class="button outline" type="button">Folytatom</button><button id="examAbortYes" class="button dark" type="button">Megszakítom</button></div></div>');
    $('#examAbort',root).addEventListener('click',()=>{$('#examAbortConfirm',root).hidden=false;$('#examAbortConfirm',root).scrollIntoView({behavior:'smooth',block:'center'})});
    $('#examAbortCancel',root).addEventListener('click',()=>{$('#examAbortConfirm',root).hidden=true;$('#examAbort',root).focus()});
    $('#examAbortYes',root).addEventListener('click',resetExam);
  }
  function evaluateExam(){
    const breakdown=EXAM_AREAS.map(area=>{
      const list=exam.list.filter(q=>examArea(q)===area.id);
      const possible=list.reduce((sum,q)=>sum+q.points,0);
      const earned=list.reduce((sum,q)=>sum+earnedPoints(q,exam.responses[q.id]??''),0);
      return {...area,count:list.length,points:possible?area.weight*earned/possible:0};
    });
    const score=Math.round(breakdown.reduce((sum,area)=>sum+area.points,0));
    const correct=exam.list.filter(q=>earnedPoints(q,exam.responses[q.id]??'')===q.points).length;
    return {score,correct,breakdown};
  }
  function submitExam(reason='manual'){
    if(!exam||exam.submitted)return;
    if(reason==='time'){
      const q=examCurrent(),root=$('#examSession');
      if(q&&$('#freeAnswer',root)||q&&$('input[name="answer"]',root)){
        const response=selectedFrom(root,q);
        if(Array.isArray(response)?response.length:String(response).trim())exam.responses[q.id]=response;
      }
    }
    clearInterval(timerId);exam.submitted=true;exam.endReason=reason;exam.remaining=Math.max(0,Math.ceil((exam.deadline-Date.now())/1000));exam.evaluation=evaluateExam();
    $('#examView').classList.remove('exam-running');document.body.classList.remove('exam-running');
    const root=$('#examSession');
    root.innerHTML=`<div class="exam-szev-finished"><div class="kicker">MINTAVIZSGA LEZÁRVA</div><h2>${reason==='time'?'Lejárt a rendelkezésre álló idő':'A próba véget ért'}</h2><p>A válaszok rögzítve. Ha tanulási célból szeretnéd látni a pontszámot és a megoldásokat, nyisd meg a külön kiértékelést.</p><div class="question-actions"><button id="examLearning" class="button primary" type="button">Tanulási kiértékelés megnyitása ↗</button><button id="newExam" class="button outline" type="button">Új mintavizsga</button></div></div>`;
    $('#examLearning',root).addEventListener('click',renderExamLearning);
    $('#newExam',root).addEventListener('click',resetExam);
  }
  function resetExam(){
    clearInterval(timerId);exam=null;$('#examView').classList.remove('exam-running');document.body.classList.remove('exam-running');
    $('#examSession').classList.add('hidden');$('#examSetup').classList.remove('hidden');
    window.scrollTo({top:0,behavior:'instant'});
  }
  function renderExamLearning(){
    if(!exam||!exam.submitted)return;
    exam.revealed=true;
    exam.list.forEach(q=>{const points=earnedPoints(q,exam.responses[q.id]??'');mark(q,points===q.points,false)});renderWrongTasks();
    const {score,correct,breakdown}=exam.evaluation,root=$('#examSession');
    const reviewMarkup=()=>exam.list.map((q,i)=>{
      const points=earnedPoints(q,exam.responses[q.id]??''),answer=exam.responses[q.id],status=points===q.points?'Jó válasz':points>0?'Részpont':'Nem sikerült';
      const explanation=q.explanation?`<div class="review-explanation">${wrongAnswerMarkup(q,answer)}<strong>Miért ez a megoldás?</strong>${explanationMarkup(q)}</div>`:'<p class="review-explanation-missing">Ehhez a feladathoz nem tartozik külön magyarázat.</p>';
      return `<article class="review-row"><div class="review-heading"><strong>${i+1}. feladat</strong><span class="review-status ${points===q.points?'is-correct':points>0?'is-partial':'is-wrong'}">${status}</span><small class="review-points">${Number(points.toFixed(1))} / ${q.points} pont</small></div><div class="review-question">${questionBody(q,'review',answer,true)}</div><div class="review-answer-grid"><div class="${points===q.points?'is-correct':'is-wrong'}"><span>Válaszod</span><p>${esc(answerForReview(q,answer))}</p></div><div class="is-correct"><span>Helyes válasz</span><p>${esc(answerLabel(q))}</p></div></div>${explanation}</article>`;
    }).join('');
    root.innerHTML=`<div class="exam-szev-results"><div class="kicker">TANULÁSI KIÉRTÉKELÉS</div><h2 class="question-title">A mintavizsga eredménye</h2><div class="exam-summary"><strong>${score} / 100 pont</strong><p>${correct} teljes pontszámú feladat ${exam.list.length} közül. A 40%-os KKK-küszöböt ez a gyakorló eredmény ${score>=40?'eléri':'nem éri el'}. Ez nem hivatalos vizsgaeredmény.</p></div><div class="exam-area-breakdown">${breakdown.map(area=>`<div><span>${esc(area.label)}</span><strong>${Math.round(area.points*10)/10} / ${area.weight} pont</strong><small>${area.count} mintafeladat</small></div>`).join('')}</div><p class="exam-score-note">A négy KKK-témakör pontjait 20 / 20 / 20 / 40 arányra súlyoztuk. A kérdések száma és válogatása saját gyakorló összeállítás.</p><div class="question-actions"><button id="newExam" class="button outline" type="button">Új mintavizsga</button></div><section id="examReview" class="exam-review"><h3>Válaszaid és a helyes megoldások</h3>${reviewMarkup()}</section></div>`;
    $('#newExam',root).addEventListener('click',resetExam);hydrateAssets(root);
  }
  function setupWorkedAnimations(root){
    if(!root)return;
    const meaningMap={pn:'Névleges teljesítmény',u:'Feszültség',i:'Áram',eta:'Hatásfok',cosphi:'Teljesítménytényező',n:'Fordulatszám',f:'Frekvencia',rho:'Fajlagos ellenállás',l:'Vezeték hossza',lh:'Oda-vissza vezetékhossz',a:'Vezető-keresztmetszet',e:'Villamos energia',t:'Üzemidő',c:'Egységár',r:'Ellenállás',re:'Eredő ellenállás',s:'Látszólagos teljesítmény',p:'Hatásos teljesítmény',q:'Meddő teljesítmény',uoc:'Üresjárási feszültség',isc:'Rövidzárási áram',in:'Névleges áram',iw:'Terhelőáram',u0:'Fázisfeszültség',z:'Impedancia',zs:'Hurokimpedancia',epsilon:'Relatív feszültségesés'};
    const symbolKey=value=>{
      const raw=String(value).trim().toLocaleLowerCase('hu').replace(/[₀₁₂₃₄₅₆₇₈₉]/gu,'').replace(/ₙ/gu,'n');
      if(/^p\s*n?$/u.test(raw))return raw.includes('n')?'pn':'p';
      if(/^i\s*n?$/u.test(raw))return raw.includes('n')?'in':'i';
      return norm(raw).replace(/ρ/gu,'rho').replace(/η/gu,'eta').replace(/ε/gu,'epsilon').replace(/φ/gu,'phi').replace(/[^a-z0-9]/gu,'');
    };
    const unitMatch=value=>value.match(/\s*(Ω\s*[·.]?\s*mm²\s*\/\s*m|A\s*\/\s*mm²|Ft\s*\/\s*kWh|kWh|Wh|kVA|kW|W|kvar|var|mA|A|V|Ω|mm²|mm|m²|m|h|min|Hz|1\/min|Ft|%|VA)\s*$/u);
    const escapeHtml=value=>String(value).replace(/[&<>"']/gu,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const decorateNumbers=element=>{const value=element.textContent||'';element.innerHTML=escapeHtml(value).replace(/(\d+(?:[.,]\d+)?)/gu,'<span class="calc-number-token" data-value="$1">$1</span>')};
    const splitInputRows=example=>{
      const first=$('.worked-steps__panel',example),math=$('.worked-step-math',first),heading=$('.worked-steps__body > strong',first);
      if(!first||!math||!heading||!/^adat/u.test(norm(heading.textContent)))return;
      const entries=math.textContent.split(/\s*;\s*/u).map(value=>value.trim()).filter(Boolean).map(value=>value.match(/^(.+?)\s*=\s*(.+)$/u)).filter(Boolean);
      if(entries.length<2)return;
      const lesson=example.closest('.lesson'),legend=[...(lesson?.querySelectorAll('.formula-legend div')||[])].map(row=>({symbol:row.querySelector('dt')?.textContent||'',meaning:row.querySelector('dd')?.textContent||''}));
      const list=document.createElement('div');list.className='worked-input-list';list.setAttribute('aria-label','A feladat megadott adatai');
      for(const [,rawSymbol,rawValue] of entries){
        const symbol=rawSymbol.trim(),value=rawValue.trim(),key=symbolKey(symbol),unit=unitMatch(value),unitText=unit?.[1]||'',valueOnly=unit?value.slice(0,unit.index).trim():value;
        const legendItem=legend.find(item=>symbolKey(item.symbol)===key),meaning=meaningMap[key]||legendItem?.meaning?.split(/[·;]/u)[0]?.trim()||'A feladatban megadott érték';
        const row=document.createElement('div');row.className='worked-input-row';
        const symbolNode=document.createElement('span');symbolNode.className='worked-input-symbol';symbolNode.textContent=symbol;
        const valueNode=document.createElement('strong');valueNode.className='worked-input-value';valueNode.textContent=valueOnly;decorateNumbers(valueNode);
        const meaningNode=document.createElement('small');meaningNode.textContent=`${meaning}${unitText?` · mértékegység: ${unitText}`:' · mértékegység nélküli arányszám'}`;
        row.append(symbolNode,valueNode,meaningNode);list.append(row);
      }
      math.replaceWith(list);
    };
    const tokenValue=token=>String(token.dataset.value||token.textContent||'').replace(/\s/g,'').replace(',','.');
    const flyValues=(from,to)=>{
      const sources=$$('.calc-number-token',from),targets=$$('.calc-number-token',to),available=new Map();
      for(const token of sources){const value=tokenValue(token);if(!available.has(value))available.set(value,[]);available.get(value).push(token)}
      const flights=[];
      for(const target of targets){const value=tokenValue(target),source=available.get(value)?.shift();if(!source)continue;flights.push({from:source.getBoundingClientRect(),to:target.getBoundingClientRect(),text:source.textContent,target})}
      for(const item of flights){
        item.target.classList.add('calc-number-carried');
        if(matchMedia('(prefers-reduced-motion: reduce)').matches||!Element.prototype.animate)continue;
        const chip=document.createElement('span');chip.className='calc-fly-token';chip.textContent=item.text;chip.setAttribute('aria-hidden','true');chip.style.left=`${item.from.left}px`;chip.style.top=`${item.from.top}px`;document.body.append(chip);
        const animation=chip.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${item.to.left-item.from.left}px,${item.to.top-item.from.top}px) scale(.92)`,opacity:.2}],{duration:620,easing:'cubic-bezier(.22,.75,.23,1)'});
        animation.finished.catch(()=>{}).finally(()=>chip.remove());
      }
    };
    $$('.worked-steps',root).forEach(example=>{
      if(example.dataset.stepperReady)return;
      const panels=$$('.worked-steps__panels .worked-steps__panel',example);
      if(!panels.length)return;
      example.dataset.stepperReady='true';
      panels.forEach((panel,index)=>{const math=$('.worked-step-math',panel);if(math)decorateNumbers(math);panel.hidden=index!==0;panel.classList.toggle('is-current',index===0)});
      splitInputRows(example);
      const controls=document.createElement('div');controls.className='worked-stepper-controls';
      const previous=document.createElement('button');previous.type='button';previous.className='button outline';previous.textContent='← Előző';
      const status=document.createElement('div');status.className='worked-stepper-status';status.setAttribute('aria-live','polite');
      const meter=document.createElement('span');meter.className='worked-stepper-meter';
      const label=document.createElement('strong');
      status.append(label,meter);
      const next=document.createElement('button');next.type='button';next.className='button primary';
      controls.append(previous,status,next);example.append(controls);
      let active=0;
      const update=(targetIndex,animate=true)=>{
        const old=panels[active],target=panels[targetIndex];
        const oldWasHidden=old.hidden;target.hidden=false;
        if(animate&&!oldWasHidden)flyValues(old,target);
        old.hidden=targetIndex===active?false:true;old.classList.remove('is-current');active=targetIndex;target.hidden=false;target.classList.add('is-current');
        label.textContent=`${active+1}. lépés / ${panels.length}`;meter.style.setProperty('--step-progress',`${(active+1)/panels.length*100}%`);
        previous.disabled=active===0;next.textContent=active===panels.length-1?'Példa újrakezdése':'Folytatás →';
        if(animate){target.classList.remove('step-arrive');void target.offsetWidth;target.classList.add('step-arrive')}
      };
      previous.addEventListener('click',()=>{if(active>0)update(active-1)});
      next.addEventListener('click',()=>update(active===panels.length-1?0:active+1));
      update(0,false);
    });
  }
  function init(){
    setupFilters();renderHome();setupProgressReset();renderWrongTasks();setupWorkedAnimations($('#guideView'));
    $('#startPractice').addEventListener('click',startPractice);$('#startExam').addEventListener('click',startExam);
    $$('[data-view]').forEach(e=>e.addEventListener('click',()=>navigate(e.dataset.view)));
    $$('[data-go]').forEach(e=>e.addEventListener('click',event=>{if(e.tagName==='A')event.preventDefault();navigate(e.dataset.go)}));
    $('#menuToggle').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open))});
    document.addEventListener('keydown',event=>{
      if(view==='question'&&event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();returnFromQuestion()}
    });
    document.addEventListener('click',async event=>{
      const zoom=event.target.closest('[data-zoom-asset]');
      if(zoom){event.preventDefault();openFigureLightbox(zoom);return}
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
    hydrateAssets(document);
    const followHash=()=>{
      const route=location.hash.slice(1);
      if(exam&&!exam.submitted&&route!=='exam'){routeTo('exam',true);return}
      if(route.startsWith('question/')){
        let id='';try{id=decodeURIComponent(route.slice(9))}catch{}
        const q=byId.get(id);
        if(q){if(view!=='question'||questionState?.ids[questionState.index]!==id)openQuestion(q,{fromRoute:true,origin:questionState?.origin||'bank'});return}
      }
      const target=['home','bank','practice','exam','guide'].includes(route)?route:'home';
      if(view!==target)navigate(target,{updateHash:false});
    };
    window.addEventListener('hashchange',followHash);
    window.addEventListener('beforeunload',event=>{if(exam&&!exam.submitted){event.preventDefault();event.returnValue=''}});
    followHash();
    if(!qlist.length){$('#homeMetrics').innerHTML='<div class="loading">A feladatbank adatai még nem töltődtek be.</div>'}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
