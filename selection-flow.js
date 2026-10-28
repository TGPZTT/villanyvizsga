(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const TOPICS=[
    ['basics','Elektrotechnikai alapok','Mennyiségek, anyagok és alapösszefüggések.'],
    ['power','Teljesítmény és energia','Fogyasztás, teljesítmény és hatásfok.'],
    ['machines','Motorok és transzformátorok','Adattáblák, kapcsolások és működés.'],
    ['wires','Vezetékek és kábelek','Típusok, jelölések és vezetőanyagok.'],
    ['sizing','Számítás és méretezés','Ellenállás, feszültségesés és keresztmetszet.'],
    ['installation','Szerelés és szerszámok','Szerelési módok, kötések és munkafázisok.'],
    ['circuits','Kapcsolások, rajzok és világítás','Szerelvények, áramkörök és rajzjelek.'],
    ['shock','Áramütés elleni védelem','Védővezetők, hálózati rendszerek és védelem.'],
    ['devices','Védelmi készülékek','Biztosítók, megszakítók és túlfeszültség-védelem.'],
    ['inspection','Mérés és biztonság','Ellenőrzés, mérés és biztonságos munkavégzés.']
  ];
  const paths={basics:'M5 12h4l2-7 4 14 2-7h3',power:'m13 3-7 10h6l-1 8 7-11h-6z',machines:'M4 8h4m8 0h4M8 4v16m8-16v16M8 7c6-4-6 10 0 6m8-6c-6-4 6 10 0 6',wires:'M4 7h11a5 5 0 0 1 0 10H4m3-10v10m4-10v10',sizing:'M4 4h16v16H4zM7 8h10M8 12h2m4 0h2m-8 4h2m4 0h2',installation:'m5 19 8-8a5 5 0 0 0 6-6l-4 4-3-3 4-4a5 5 0 0 0-7 6l-8 8z',circuits:'M3 6h6m6 0h6M9 6l6-3M3 18h18M5 6v12m14-12v12',shock:'m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6zM8 12l3 3 5-6',devices:'M7 3h10v18H7zM10 7h4v6h-4zM12 16v2',inspection:'M12 3a9 9 0 1 0 9 9M12 12l6-6M8 17h8'};
  const icon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]||paths.basics}"/></svg>`;
  const topicFor=(()=>{
    // Reviewed against every current question, including the actual subject of generic prompts.
    // These are navigation topics only. The four examination scoring areas remain unchanged.
    const reviewed=new Map(Object.entries({
      basics:'gen-exam-r5-043 gen-exam-r5-045 local-01-16 local-06-08 local-07-10 local-11-03a local-11-03b local-14-03d szs-2024-35 szs-2025-25 szs-2025-35 szs-2025-36 szs-2026-13',
      power:'gen-exam-r5-022 gen-exam-r5-024 gen-exam-r5-026 gen-exam-r5-027 gen-exam-r5-031 gen-exam-r5-036 gen-exam-r5-037 gen-exam-r5-039 gen-exam-r5-044 gen-exam-r5-057 gen-exam-r5-069 local-01-10 local-02-12 local-02-14 local-02-22 local-03-06 local-04-05 local-05-02 local-05-08 local-06-05 local-07-05 local-08-07 local-10-03 local-11-06 local-12-05 local-13-05 local-14-03a local-14-07 local-14-09 szs-2024-33 szs-2024-36 szs-2025-14 szs-2025-33 szs-2026-30 szs-2026-32 szs-2026-34 szs-2026-36',
      machines:'gen-exam-r5-025 gen-exam-r5-032 gen-exam-r5-033 gen-exam-r5-049 gen-exam-r5-088 gen-exam-r5-097 gen-exam-r5-100 local-01-04 local-01-07 local-01-08 local-02-08 local-02-09 local-03-03-a local-05-10 local-07-06 local-07-11 local-13-07 local-14-05 szs-2024-15 szs-2024-18 szs-2024-28 szs-2024-29 szs-2024-30 szs-2024-32 szs-2024-39 szs-2025-15 szs-2025-18 szs-2025-28 szs-2025-29 szs-2025-30 szs-2025-32 szs-2025-39 szs-2026-12 szs-2026-29 szs-2026-31 szs-2026-35 szs-2026-39',
      wires:'gen-exam-r5-016 gen-exam-r5-017 gen-exam-r5-018 gen-exam-r5-019 gen-exam-r5-074 gen-exam-r5-075 gen-exam-r5-090 local-01-02 local-02-01 local-02-02 local-03-03-g local-04-03-b local-14-03c szs-2024-3 szs-2024-6 szs-2025-3 szs-2025-6 szs-2026-15 szs-2026-21 szs-2026-8 szs-2026-9',
      sizing:'gen-exam-r5-021 gen-exam-r5-023 gen-exam-r5-028 gen-exam-r5-029 gen-exam-r5-030 gen-exam-r5-034 gen-exam-r5-035 gen-exam-r5-038 gen-exam-r5-041 gen-exam-r5-042 gen-exam-r5-058 gen-exam-r5-059 local-01-09 local-02-11 local-02-13 local-03-05 local-04-03-g local-04-07 local-05-03 local-06-02 local-06-06 local-07-03-c local-08-03 local-09-04 local-10-05 local-10-08 local-11-03h local-11-05 local-11-09 local-12-03 local-12-04 local-13-04 local-14-03h szs-2024-12 szs-2024-16 szs-2024-23 szs-2024-26 szs-2024-31 szs-2025-12 szs-2025-16 szs-2025-23 szs-2025-26 szs-2025-31 szs-2025-41 szs-2025-5 szs-2026-18 szs-2026-37 szs-2026-38 szs-2026-41 szs-2026-42',
      installation:'gen-exam-r5-014 gen-exam-r5-015 gen-exam-r5-047 gen-exam-r5-079 gen-exam-r5-093 gen-exam-r5-094 gen-exam-r5-098 gen-exam-r5-099 local-01-06 local-02-04 local-02-05 local-02-06 local-02-07 local-02-10 local-03-03-e local-03-07 local-03-08 local-04-08 local-05-09 local-06-09 local-07-08 local-08-04 local-09-08 local-10-02 local-12-06 local-13-08 szs-2024-5 szs-2026-22',
      circuits:'gen-exam-r5-011 gen-exam-r5-012 gen-exam-r5-013 gen-exam-r5-048 gen-exam-r5-050 gen-exam-r5-065 gen-exam-r5-066 gen-exam-r5-067 gen-exam-r5-068 gen-exam-r5-072 gen-exam-r5-073 gen-exam-r5-077 gen-exam-r5-078 gen-exam-r5-086 gen-exam-r5-087 gen-exam-r5-089 gen-exam-r5-091 gen-exam-r5-092 gen-exam-r5-095 gen-exam-r5-096 local-01-01 local-01-03 local-01-05 local-02-03a local-02-03b local-02-03c local-03-02 local-04-03-d local-05-06 local-06-01 local-06-04 local-07-12 local-08-01 local-08-05 local-09-01 local-10-01 local-11-03c local-11-07 local-11-10 local-12-01 local-13-02 local-13-03 local-14-03f local-14-06 local-14-10 szs-2024-1 szs-2024-13 szs-2024-14 szs-2024-2 szs-2024-21 szs-2024-4 szs-2025-1 szs-2025-2 szs-2025-21 szs-2025-7 szs-2026-1 szs-2026-10 szs-2026-16 szs-2026-2 szs-2026-27 szs-2026-3 szs-2026-40',
      shock:'gen-exam-r5-002 gen-exam-r5-005 gen-exam-r5-006 gen-exam-r5-046 gen-exam-r5-053 gen-exam-r5-054 gen-exam-r5-055 gen-exam-r5-076 local-01-12 local-01-13 local-02-18 local-02-19 local-03-03-c local-03-03-f local-04-03-c local-04-03-e local-04-03-f local-07-03-b local-07-03-e local-07-03-g local-07-03-h local-08-08 local-09-02 local-10-06 local-11-03d local-11-03f local-11-04b local-11-08 local-14-03b local-14-03e local-14-03g local-14-04b szs-2024-11 szs-2024-17 szs-2024-20 szs-2024-24 szs-2024-9 szs-2025-11 szs-2025-17 szs-2025-20 szs-2025-34 szs-2025-37 szs-2025-40 szs-2025-9 szs-2026-11 szs-2026-20 szs-2026-24 szs-2026-25 szs-2026-28 szs-2026-5',
      devices:'gen-exam-r5-001 gen-exam-r5-003 gen-exam-r5-007 gen-exam-r5-009 gen-exam-r5-020 gen-exam-r5-040 gen-exam-r5-060 gen-exam-r5-061 gen-exam-r5-062 gen-exam-r5-063 gen-exam-r5-064 gen-exam-r5-070 gen-exam-r5-071 gen-exam-r5-085 local-01-15 local-02-17 local-02-20 local-02-21 local-03-03-b local-03-03-d local-03-09 local-04-03-a local-04-06 local-05-04 local-05-05 local-05-07 local-07-03-d local-07-03-j local-07-07 local-08-09 local-09-05 local-09-07 local-10-04 local-10-07 local-12-02 local-12-07 local-13-06 local-14-08 szs-2024-22 szs-2024-25 szs-2024-27 szs-2024-37 szs-2024-38 szs-2024-40 szs-2024-7 szs-2024-8 szs-2025-22 szs-2025-27 szs-2025-38 szs-2025-4 szs-2025-8 szs-2026-17 szs-2026-19 szs-2026-26 szs-2026-33 szs-2026-4 szs-2026-6',
      inspection:'gen-exam-r5-004 gen-exam-r5-008 gen-exam-r5-010 gen-exam-r5-051 gen-exam-r5-052 gen-exam-r5-056 gen-exam-r5-080 gen-exam-r5-081 gen-exam-r5-082 gen-exam-r5-083 gen-exam-r5-084 local-01-11 local-01-14 local-02-15 local-02-16 local-07-03-a local-07-03-f local-07-03-i local-07-04 local-07-09 local-11-03e local-11-03g local-11-03i local-11-03j local-13-09 szs-2024-10 szs-2024-19 szs-2024-34 szs-2025-10 szs-2025-13 szs-2025-19 szs-2025-24 szs-2026-14 szs-2026-23 szs-2026-7',
    }).flatMap(([topic,ids])=>ids.split(' ').map(id=>[id,topic])));
    return function(q){
      if(reviewed.has(q.id))return reviewed.get(q.id);
      const s=norm(q.sourceTopic||q.topic),p=norm(q.prompt),t=p+' '+s;
      if(/feszultsegment|szigetelesi ellenallas.*(mer|vizsg)|folytonossag.*(mer|vizsg)|uzembe helyez|szereloi ellenorz|hurokimpedanciat.*mer|elsosegely|munkaved|baleset|eletment|ujraeleszt/.test(p))return 'inspection';
      if(/feszultsegeses|terhelhetoseg|keresztmetszet|zarlati aram|hurokimpedancia.*(hatar|mekkora)|eredo ellenallas/.test(p))return 'sizing';
      if(/aram-?vedo|avk|olvadobiztos|kismegszakito|tulfeszultseg|villamved|szelektiv|\bspd\b/.test(p))return 'devices';
      if(/vedoelvalaszt|erintesved|aramutes|vedelmi osztaly|\bpen\b|\bpe\b.*\bn\b|\btn[- ]?[cs]|\btt[- ]?rendszer|\bit[- ]?rendszer|\bip(?:x|[0-6])|vedettseg|egyenpotencial|\beph\b|foldel/.test(p))return 'shock';
      if(/energia|fogyasztas|hatasfok|leadott teljesitmeny|felvett.*teljesitmeny|meddo|napelem/.test(p))return 'power';
      if(/motor|transzformator|aramvalto|szlip|fordulatszam|forgomezo/.test(p))return 'machines';
      if(/munkafazis|munkasorrend|szereles|szerszam|csupasz|blankol|kot[oe]s|rogzit|vedocso|csatorna|horony|forraszt|sajtol|kabel.*fektet/.test(p))return 'installation';
      if(/kabel|h07|h05|mmfal|mtcu|vezetek.*jel|szinjeloles|elemi szal/.test(p)||s==='vezetekek es kabelek'||s==='vezetektipusok')return 'wires';
      if(/kapcsol|rajz|lampatest|feny|megvilagitas|dugalj|doboz|aramkor|szerelveny|vilagitas|rele|kontaktor/.test(p))return 'circuits';
      const fields=q.answerFields||q.numericFields||[];
      if(/ellenallas|szamits|meretezes/.test(t)||q.type==='number'&&(!fields.length||fields.some(f=>f.kind!=='choice')))return 'sizing';
      return 'basics';
    };
  })();
  const kind=q=>q.generated?.machineGenerated||q.sourceId?.startsWith('generated-exam-')?'generated':window.VV_LABELS.sourceKind(q)==='Versenyfeladat'?'competition':'papers';
  const sourceTitle=id=>window.VV_LABELS.sourceOptionLabel(id);
  let questions=[],status=()=> 'new',onBankChange=()=>{},searchMatch=()=>true,step=0,ready=false;
  const bank={topics:new Set(),sources:new Set(),kinds:new Set(),type:'',status:''};
  const practice={topics:new Set(),sources:new Set(),kinds:new Set(['papers']),retry:false,count:10};
  const topicCounts=pool=>new Map(TOPICS.map(([id])=>[id,pool.filter(q=>topicFor(q)===id).length]));
  const match=(q,f,{ignoreTopics=false,ignoreSources=false}={})=>(!f.kinds.size||f.kinds.has(kind(q)))&&(ignoreTopics||!f.topics.size||f.topics.has(topicFor(q)))&&(ignoreSources||!f.sources.size||f.sources.has(q.sourceId))&&(!f.retry||status(q)==='retry');
  const pool=()=>practice.kinds.size?questions.filter(q=>match(q,practice)):[];
  function choices(f,context){
    if(context==='practice'&&!f.kinds.size)return '<p class="sf-empty">Előbb válassz legalább egy feladatcsoportot.</p>';
    const counts=topicCounts(questions.filter(q=>match(q,f,{ignoreTopics:true})&&(context!=='bank'||bankOtherMatches(q))));
    return TOPICS.filter(([id])=>questions.some(q=>topicFor(q)===id)).map(([id,title,description])=>`<label class="sf-topic ${f.topics.has(id)?'is-picked':''}"><input type="checkbox" name="${context}Topic" value="${id}" ${f.topics.has(id)?'checked':''}><span class="sf-topic-icon">${icon(id)}</span><span><strong>${title}</strong><small>${description}</small></span><b>${counts.get(id)}</b></label>`).join('');
  }
  function sourceChoices(f,context,query=''){
    if(context==='practice'&&!f.kinds.size)return '<p class="sf-empty">Előbb válassz legalább egy feladatcsoportot.</p>';
    const list=questions.filter(q=>match(q,f,{ignoreSources:true})&&(context!=='bank'||bankOtherMatches(q))),groups=[...new Set(questions.map(q=>q.sourceId))].filter(id=>questions.some(q=>q.sourceId===id&&(!f.kinds.size||f.kinds.has(kind(q))))).sort(window.VV_LABELS.compareSources);
    return groups.filter(id=>norm(sourceTitle(id)).includes(norm(query))).map(id=>{const n=list.filter(q=>q.sourceId===id).length;return `<label class="sf-source"><input type="checkbox" name="${context}Source" value="${esc(id)}" ${f.sources.has(id)?'checked':''}><span>${esc(sourceTitle(id))}</span><b>${n}</b></label>`}).join('')||'<p class="sf-empty">Nincs ilyen feladatsor.</p>';
  }
  function sourceKinds(f,context){return [['papers','Feladatok','A meglévő feladatsorok kérdései.','circuits'],['generated','Géppel generált','További kérdések ugyanazokból a témákból.','basics'],['competition','Versenyfeladatok','A versenyfeladatsorok kérdései.','devices']].map(([id,title,description,ico])=>`<label class="sf-kind ${f.kinds.has(id)?'is-picked':''}"><input type="checkbox" name="${context}Kind" value="${id}" ${f.kinds.has(id)?'checked':''}><span class="sf-kind-art">${icon(ico)}</span><strong>${title}</strong><span>${description}</span><b>${questions.filter(q=>kind(q)===id).length} feladat</b></label>`).join('')}
  function toggle(set,value,checked){checked?set.add(value):set.delete(value)}
  function showBankDialog(which){
    let d=$('#bankSelectionDialog');if(!d){d=document.createElement('dialog');d.id='bankSelectionDialog';d.className='sf-dialog';document.body.append(d);d.addEventListener('click',e=>{if(e.target===d)d.close()});d.addEventListener('close',()=>{$(`[data-bank-picker="${d.dataset.picker}"]`)?.focus()})}
    d.dataset.picker=which;
    const topics=which==='topics';
    d.innerHTML=`<header><h2>${topics?'Témák kiválasztása':'Feladatsorok kiválasztása'}</h2><button class="sf-icon-button" type="button" data-close aria-label="Bezárás">×</button></header><p>Többet is kijelölhetsz. Üres kijelöléssel minden ${topics?'téma':'feladatsor'} szerepel.</p>${!topics?'<label class="sf-dialog-search">Keresés a feladatsorok között<input type="search" id="bankSourceSearch" autocomplete="off" placeholder="Például: 10. feladatsor…"></label>':''}<div class="sf-dialog-list ${topics?'sf-topic-grid':''}">${topics?choices(bank,'bank'):sourceChoices(bank,'bank')}</div><footer><button type="button" class="text-button" data-empty>Kijelölés törlése</button><span class="sf-dialog-total" role="status" aria-live="polite"></span><button type="button" class="button dark" data-close>Kész</button></footer>`;
    const total=()=>{$('.sf-dialog-total',d).textContent=`${bankCount()} feladat`};total();
    $$('[data-close]',d).forEach(b=>b.addEventListener('click',()=>d.close()));
    $('[data-empty]',d).addEventListener('click',()=>{bank[which].clear();$$('input[type=checkbox]',d).forEach(i=>i.checked=false);$$('.is-picked',d).forEach(x=>x.classList.remove('is-picked'));updateBank();total()});
    d.addEventListener('change',bankDialogChange);$('#bankSourceSearch',d)?.addEventListener('input',e=>{$('.sf-dialog-list',d).innerHTML=sourceChoices(bank,'bank',e.target.value)});
    d.showModal();$('[data-close]',d).focus();
  }
  function bankCount(){return parseInt($('#resultCount')?.textContent,10)||0}
  function bankDialogChange(e){const i=e.target;if(!/^(bankTopic|bankSource)$/.test(i.name))return;toggle(i.name==='bankTopic'?bank.topics:bank.sources,i.value,i.checked);i.closest('label').classList.toggle('is-picked',i.checked);updateBank();$('.sf-dialog-total',e.currentTarget).textContent=`${bankCount()} feladat`}
  function matchesBank(q){return match(q,bank)&&(!bank.type||q.type===bank.type)&&(!bank.status||status(q)===bank.status)}
  function bankOtherMatches(q){return searchMatch(q)&&(!bank.type||q.type===bank.type)&&(!bank.status||status(q)===bank.status)}
  function updateBank(){
    const root=$('#bankModernFilters');if(!root)return;
    $('[data-bank-picker=topics] span',root).textContent=bank.topics.size?`${bank.topics.size} téma`:'Minden téma';
    $('[data-bank-picker=sources] span',root).textContent=bank.sources.size?`${bank.sources.size} feladatsor`:'Minden feladatsor';
    const tags=$('.sf-active-filters',root);tags.innerHTML=[...bank.topics].map(id=>`<button type="button" data-remove-topic="${id}" aria-label="${esc(TOPICS.find(t=>t[0]===id)?.[1])} szűrő törlése">${TOPICS.find(t=>t[0]===id)?.[1]} <span aria-hidden="true">×</span></button>`).join('')+[...bank.sources].map(id=>`<button type="button" data-remove-source="${esc(id)}" aria-label="${esc(sourceTitle(id))} szűrő törlése">${esc(sourceTitle(id))} <span aria-hidden="true">×</span></button>`).join('');
    tags.hidden=!tags.children.length;onBankChange();
  }
  function setupBank(){
    const legacy=$('#bankCatalog .filters');legacy.hidden=true;legacy.classList.add('sf-legacy');
    const root=document.createElement('div');root.id='bankModernFilters';root.className='sf-bank';
    root.innerHTML=`<div class="sf-bank-main"><div class="sf-search-slot"></div><button type="button" class="sf-picker" data-bank-picker="topics">${icon('basics')}<span>Minden téma</span><b>+</b></button><button type="button" class="sf-picker" data-bank-picker="sources">${icon('circuits')}<span>Minden feladatsor</span><b>+</b></button></div><div class="sf-bank-secondary"><label>Típus<select id="modernBankType"><option value="">Összes</option><option value="single">Egy jó válasz</option><option value="multi">Több jó válasz</option><option value="number">Számolás</option></select></label><label>Haladás<select id="modernBankStatus"><option value="">Összes</option><option value="new">Még nem gyakorolt</option><option value="correct">Sikerült</option><option value="retry">Újragyakorlás</option></select></label><fieldset><legend>Feladatcsoport</legend>${[['papers','Feladatok'],['generated','Géppel generált'],['competition','Versenyfeladatok']].map(([id,label])=>`<label><input type="checkbox" name="bankKind" value="${id}">${label}</label>`).join('')}</fieldset></div><div class="sf-active-filters" hidden></div>`;
    legacy.after(root);$('.sf-search-slot',root).append($('#searchInput').closest('label'));
    $('.sf-search-slot .search-wrap>span',root).innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6" stroke-linecap="round"/></svg>';
    root.addEventListener('click',e=>{const picker=e.target.closest('[data-bank-picker]');if(picker)showBankDialog(picker.dataset.bankPicker);const t=e.target.closest('[data-remove-topic]'),s=e.target.closest('[data-remove-source]');if(t){bank.topics.delete(t.dataset.removeTopic);updateBank()}if(s){bank.sources.delete(s.dataset.removeSource);updateBank()}});
    root.addEventListener('change',e=>{if(e.target.name==='bankKind'){toggle(bank.kinds,e.target.value,e.target.checked);bank.sources.forEach(id=>{if(bank.kinds.size&&!questions.some(q=>q.sourceId===id&&bank.kinds.has(kind(q))))bank.sources.delete(id)})}if(e.target.id==='modernBankType')bank.type=e.target.value;if(e.target.id==='modernBankStatus')bank.status=e.target.value;updateBank()});
    $('#clearFilters').addEventListener('click',()=>{bank.topics.clear();bank.sources.clear();bank.kinds.clear();bank.type='';bank.status='';$$('input[type=checkbox]',root).forEach(i=>i.checked=false);$$('select',root).forEach(s=>s.value='');updateBank()});
  }
  function practiceRender(){
    const root=$('#practiceFlow');if(!root)return;
    // The launch control has existing application listeners. Move, never recreate it.
    const launch=$('#startPractice');if(launch)$('#practiceSetup .sf-legacy').append(launch);
    const titles=['Feladatok','Témák','Feladatsorok','Indítás'],available=pool().length;
    root.innerHTML=`<nav class="sf-steps" aria-label="Gyakorlás összeállítása">${titles.map((t,i)=>`<button type="button" data-step="${i}" ${i===step?'aria-current="step"':''}><span>${i+1}</span><span class="sf-step-name">${i===2?'Feladat<wbr>sorok':t}</span></button>`).join('')}</nav><div class="sf-step-content" data-current-step="${step}"><h2 tabindex="-1">${['Miből szeretnél gyakorolni?','Melyik témákból kérsz feladatot?','Melyik feladatsorokból válogassunk?','A gyakorlás beállításai'][step]}</h2>${step===0?`<div class="sf-kind-grid">${sourceKinds(practice,'practice')}</div><p class="sf-help">Legalább egy feladatcsoportot válassz.</p>`:step===1?`<p class="sf-help">Több témát is választhatsz. Üres kijelöléssel minden téma szerepel.</p><div class="sf-topic-grid">${choices(practice,'practice')}</div>`:step===2?`<p class="sf-help">Több feladatsort is választhatsz. Üres kijelöléssel az összes elérhető feladatsorból válogatunk.</p><label class="sf-dialog-search">Keresés a feladatsorok között<input id="practiceSourceSearch" type="search" autocomplete="off" placeholder="Például: 10. feladatsor…"></label><div class="sf-source-grid">${sourceChoices(practice,'practice')}</div>`:`<div class="sf-finish"><div><h3>Feladatok száma</h3><div class="sf-counts" role="group" aria-label="Feladatok száma">${[10,20,30].map(n=>`<button type="button" data-count="${n}" aria-pressed="${practice.count===n}">${n}</button>`).join('')}</div><label class="sf-retry"><input type="checkbox" name="practiceRetry" ${practice.retry?'checked':''}>Csak a korábban elrontott feladatok</label></div><div class="sf-recap"><strong>Az összeállításod</strong><p>${[...practice.kinds].map(k=>({papers:'Feladatok',generated:'Géppel generált',competition:'Versenyfeladatok'}[k])).join(', ')}</p><p>${practice.topics.size?`${practice.topics.size} kiválasztott téma`:'Minden téma'}. ${practice.sources.size?`${practice.sources.size} kiválasztott feladatsor`:'Minden elérhető feladatsor'}.</p><b>${Math.min(practice.count,available)} feladat kerül a gyakorlásba.</b></div></div>`}</div><footer class="sf-flow-footer"><button type="button" class="button outline" data-back ${step===0?'disabled':''}>Előző</button><span class="sf-pool" role="status" aria-live="polite"><strong>${available}</strong> elérhető feladat</span><div class="sf-start-slot"></div>${step<3?`<button type="button" class="button dark" data-next ${!practice.kinds.size?'disabled':''}>Tovább <span aria-hidden="true">→</span></button>`:''}</footer>`;
    if(step===3){$('.sf-start-slot',root).append($('#startPractice'));$('#startPractice').hidden=false;$('#startPractice').disabled=!available;$('#startPractice').textContent='Gyakorlás indítása';}else{$('#startPractice').hidden=true;$('#practiceSetup').append($('#startPractice'))}
    $('#practiceSourceSearch',root)?.addEventListener('input',e=>{$('.sf-source-grid',root).innerHTML=sourceChoices(practice,'practice',e.target.value)});
    $('#practiceCount').value=String(practice.count);$('#retryOnly').checked=practice.retry;
    if(!available&&step===3)$('.sf-finish',root).insertAdjacentHTML('afterend','<p class="sf-no-results" role="status">Ezekkel a feltételekkel nincs feladat. Lépj vissza, vagy kapcsold ki az elrontottakra szűrést.</p>');
  }
  function updatePracticeCounts(){
    const n=pool().length;$('.sf-pool strong',$('#practiceFlow')).textContent=n;
    $$('[data-next]',$('#practiceFlow')).forEach(b=>b.disabled=!practice.kinds.size);
  }
  function setupPractice(){
    const setup=$('#practiceSetup');setup.classList.add('sf-practice-setup');
    const legacy=document.createElement('div');legacy.className='sf-legacy';legacy.hidden=true;
    while(setup.firstChild)legacy.append(setup.firstChild);setup.append(legacy);
    const root=document.createElement('div');root.id='practiceFlow';setup.prepend(root);
    // Keep the existing results manager reachable without making it another setup step.
    const manager=document.createElement('div');manager.className='sf-manager-link';manager.innerHTML='<span>A megjelölt feladatokat a feladatbankban szerkesztheted.</span>';manager.append($('#clearWrongTasks'));setup.append(manager);
    $('#clearWrongTasks').textContent='Eredmények kezelése';
    root.addEventListener('click',e=>{const s=e.target.closest('[data-step]'),back=e.target.closest('[data-back]'),next=e.target.closest('[data-next]'),count=e.target.closest('[data-count]');if(s||back||next){if(next&&!practice.kinds.size)return;step=s?Number(s.dataset.step):step+(next?1:-1);practiceRender();$('.sf-step-content h2',root).focus({preventScroll:true})}if(count){practice.count=Number(count.dataset.count);practiceRender();root.querySelector('[data-count="'+practice.count+'"]')?.focus({preventScroll:true})}});
    root.addEventListener('change',e=>{
      const i=e.target;if(i.name==='practiceKind'){toggle(practice.kinds,i.value,i.checked);practice.sources.forEach(id=>{if(!questions.some(q=>q.sourceId===id&&practice.kinds.has(kind(q))))practice.sources.delete(id)});i.closest('label').classList.toggle('is-picked',i.checked)}
      if(i.name==='practiceTopic'){toggle(practice.topics,i.value,i.checked);i.closest('label').classList.toggle('is-picked',i.checked)}
      if(i.name==='practiceSource')toggle(practice.sources,i.value,i.checked);
      if(i.name==='practiceRetry'){practice.retry=i.checked;practiceRender();root.querySelector('[name=practiceRetry]')?.focus({preventScroll:true})}
      updatePracticeCounts();
    });practiceRender();
  }
  function setup(opts){if(ready)return;ready=true;questions=opts.questions;status=opts.status;onBankChange=opts.onBankChange;searchMatch=opts.searchMatch||searchMatch;setupBank();setupPractice()}
  window.VV_SELECTION=Object.freeze({setup,matchesBank,practicePool:pool,practiceCount:()=>practice.count,topicFor,topicLabel:q=>TOPICS.find(t=>t[0]===topicFor(q))?.[1]||q.topic,topics:()=>TOPICS.map(([id,title])=>({id,title,count:questions.filter(q=>topicFor(q)===id).length})),refresh:()=>{if(ready){updateBank();practiceRender()}}});
})();
