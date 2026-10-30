(function () {
  'use strict';
  const Q='villanyvizsga-progress-v1', L='villanyvizsga-learning-v1', H='villanyvizsga-exam-history-v1', E='villanyvizsga-exam-exposure-v1';
  const FORMAT='villanyvizsga-progress', MAX_BYTES=8*1024*1024, MAX_LOG=32;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const read=key=>{try{return JSON.parse(window.VV_STORAGE?.get(key))}catch{return null}};
  const nowId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  let config, dialog, returnFocus, scope='papers', queued=false, pending=null, fileToken=0;
  const scopeOf=q=>q.generated?.machineGenerated||q.sourceId?.startsWith('generated-exam-')?'generated':window.VV_LABELS?.sourceKind(q)==='Versenyfeladat'?'competition':'papers';
  function telemetryFields(value,strict=false) {
    const out={};
    if(!object(value)){if(strict)throw Error('A fájl hibás próbálkozást tartalmaz.');return out;}
    for(const key of ['activeMs','firstMs'])if(value[key]!==undefined){if(Number.isSafeInteger(value[key])&&value[key]>=0&&value[key]<=1200000)out[key]=value[key];else if(strict)throw Error('A fájl hibás megoldási időt tartalmaz.');}
    if(out.firstMs!==undefined&&out.activeMs!==undefined&&out.firstMs>out.activeMs){if(strict)throw Error('A fájl ellentmondó megoldási időt tartalmaz.');out.firstMs=out.activeMs;}
    for(const key of ['hintUsed','solutionUsed'])if(value[key]!==undefined){if(typeof value[key]==='boolean')out[key]=value[key];else if(strict)throw Error('A fájl hibás segítségadatot tartalmaz.');}
    return out;
  }
  function record(previous,correct,attemptId,assisted=false,at=Date.now(),telemetry={}) {
    const old=object(previous)?previous:{};
    const results=Array.isArray(old.results)?old.results.filter(r=>object(r)&&typeof r.id==='string'&&typeof r.correct==='boolean').slice(-MAX_LOG):[];
    const details=telemetryFields(telemetry);
    if(attemptId&&!results.some(r=>r.id===attemptId))results.push({id:attemptId,at,correct:!!correct,assisted:!!(assisted||details.hintUsed||details.solutionUsed),...details});
    return {...old,status:correct?'correct':'retry',at,results:results.slice(-MAX_LOG)};
  }
  function noteSupport(previous,kind,at=Date.now()) {
    if(!['hint','solution'].includes(kind))return previous;
    const old=object(previous)?previous:{},before=object(old.support)?old.support:null;
    const same=before&&before.at>(old.at||0)&&at-before.at<=1200000;
    const support={hintUsed:!!(same&&before.hintUsed)||kind==='hint',solutionUsed:!!(same&&before.solutionUsed)||kind==='solution',at};
    return {...old,status:['correct','retry'].includes(old.status)?old.status:'new',at:Number.isSafeInteger(old.at)?old.at:0,support};
  }
  function normalizedSupport(value) {
    if(!object(value)||typeof value.hintUsed!=='boolean'||typeof value.solutionUsed!=='boolean'||!value.hintUsed&&!value.solutionUsed)throw Error('A fájl hibás segítségadatot tartalmaz.');
    return {hintUsed:value.hintUsed,solutionUsed:value.solutionUsed,at:stamp(value.at)};
  }
  function mergeSupport(first,second,gradedAt) {
    if(!first)return second;if(!second)return first;
    const latest=first.at>=second.at?first:second;
    if(Math.min(first.at,second.at)>gradedAt&&Math.abs(first.at-second.at)<=1200000)return {hintUsed:first.hintUsed||second.hintUsed,solutionUsed:first.solutionUsed||second.solutionUsed,at:latest.at};
    return latest;
  }
  function outcome(row) {
    if(!row||!['correct','retry'].includes(row.status))return 'new';
    const results=(Array.isArray(row.results)?row.results:[]).filter(result=>object(result)&&typeof result.correct==='boolean').slice(-2);
    return row.status==='correct'&&results.length===2&&results.every(result=>result.correct&&!result.assisted&&!result.hintUsed&&!result.solutionUsed)?'repeated':'repeat';
  }
  function attemptId(session,id) {session.attemptIds??={};return session.attemptIds[id]??=nowId();}
  function catalog() {
    const questions=config?.questions||window.VV_DATA?.questions||[];
    const source=window.VV_LEARNING;
    if(!questions.length||!source?.chapters?.length)throw Error('A feladatok még betöltődnek. Próbáld meg újra.');
    return {questions:new Set(questions.map(q=>String(q.id))),lessons:new Set(source.chapters.flatMap(c=>c.lessons.map(l=>l.id)))};
  }
  const stamp=value=>{if(!Number.isSafeInteger(value)||value<0||value>8640000000000000)throw Error('A fájl hibás időadatot tartalmaz.');return value;};
  const count=value=>{if(!Number.isSafeInteger(value)||value<0||value>1000000000)throw Error('A fájl hibás számlálót tartalmaz.');return value;};
  function safeTree(value) {
    const stack=[[value,0]];let nodes=0;
    while(stack.length){const [v,depth]=stack.pop();if(++nodes>200000||depth>12)throw Error('A fájl szerkezete túl összetett.');if(v&&typeof v==='object')for(const [key,child] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Ez a fájl nem tölthető vissza.');stack.push([child,depth+1]);}}
  }
  function normalize(data,known) {
    if(!object(data)||!object(data.questions)||!object(data.learning)||!Array.isArray(data.examHistory)||!object(data.examExposure))throw Error('A fájl nem teljes haladásmentés.');
    const questions={},learning={read:{},checks:{},lastLesson:''},examHistory=[],byId={};let ignored=0;
    if(Object.keys(data.questions).length>5000||data.examHistory.length>100)throw Error('A fájl túl sok bejegyzést tartalmaz.');
    for(const [id,row] of Object.entries(data.questions)){
      if(!object(row)||!['correct','retry','new'].includes(row.status))throw Error('A fájl hibás feladatállapotot tartalmaz.');
      if(!known.questions.has(id)){ignored++;continue;}
      const support=row.support===undefined?undefined:normalizedSupport(row.support);
      if(row.status==='new'&&(!support||Array.isArray(row.results)&&row.results.length))throw Error('A fájl ellentmondó feladatállapotot tartalmaz.');
      const item={status:row.status,at:stamp(row.at??0)};
      if(row.status==='new'&&item.at!==0)throw Error('A fájl ellentmondó feladatállapotot tartalmaz.');
      if(row.results!==undefined){
        if(!Array.isArray(row.results)||row.results.length>64)throw Error('A fájl hibás próbálkozásokat tartalmaz.');
        const seen=new Map();
        for(const result of row.results){
          if(!object(result)||typeof result.id!=='string'||!/^[a-zA-Z0-9:._-]{1,128}$/.test(result.id)||typeof result.correct!=='boolean'||result.assisted!==undefined&&typeof result.assisted!=='boolean')throw Error('A fájl hibás próbálkozást tartalmaz.');
          const details=telemetryFields(result,true),r={id:result.id,at:stamp(result.at),correct:result.correct,assisted:!!(result.assisted||details.hintUsed||details.solutionUsed),...details};
          if(seen.has(r.id)&&JSON.stringify(seen.get(r.id))!==JSON.stringify(r))throw Error('A fájl ellentmondó próbálkozásokat tartalmaz.');
          seen.set(r.id,r);
        }
        item.results=[...seen.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-MAX_LOG);
      }
      if(support)item.support=support;
      questions[id]=item;
    }
    if(!object(data.learning.read)||!object(data.learning.checks))throw Error('A fájl hibás leckehaladást tartalmaz.');
    for(const [id,value] of Object.entries(data.learning.read)){
      if(!known.lessons.has(id)){ignored++;continue;}
      if(value===true)learning.read[id]=true;else if(value!==false&&value!==null&&value!==0)learning.read[id]=stamp(value);
    }
    for(const [id,row] of Object.entries(data.learning.checks)){
      if(!known.lessons.has(id)){ignored++;continue;}
      if(!object(row)||typeof row.correct!=='boolean')throw Error('A fájl hibás leckeellenőrzést tartalmaz.');
      learning.checks[id]={correct:row.correct,at:stamp(row.at??0)};
    }
    if(data.learning.lastLesson!==undefined&&typeof data.learning.lastLesson!=='string')throw Error('A fájl hibás leckeazonosítót tartalmaz.');
    if(known.lessons.has(data.learning.lastLesson))learning.lastLesson=data.learning.lastLesson;
    for(const row of data.examHistory){
      if(!object(row)||!Array.isArray(row.ids)||row.ids.length>1000||row.ids.some(id=>typeof id!=='string'))throw Error('A fájl hibás vizsgaelőzményt tartalmaz.');
      const ids=[...new Set(row.ids)].filter(id=>known.questions.has(id));
      if(!ids.length)continue;
      const sources=Array.isArray(row.sources)?row.sources.filter(s=>['papers','generated','competition'].includes(s)):[];
      examHistory.push({at:stamp(row.at??0),scope:typeof row.scope==='string'?row.scope.slice(0,80):sources.join('+'),sources,ids});
    }
    const runs=count(data.examExposure.runs??0);
    if(!object(data.examExposure.byId))throw Error('A fájl hibás vizsgaszámlálókat tartalmaz.');
    for(const [id,row] of Object.entries(data.examExposure.byId)){
      if(!known.questions.has(id))continue;
      if(!object(row))throw Error('A fájl hibás vizsgaszámlálót tartalmaz.');
      const n=count(row.count),last=count(row.last);
      if(!n||n>runs||!last||last>runs)throw Error('A fájl ellentmondó vizsgaszámlálót tartalmaz.');
      byId[id]={count:n,last};
    }
    return {data:{questions,learning,examHistory:examHistory.slice(-8),examExposure:{runs,byId}},ignored};
  }
  function currentData(){return {questions:read(Q)||{},learning:read(L)||{read:{},checks:{},lastLesson:''},examHistory:read(H)||[],examExposure:read(E)||{runs:0,byId:{}}};}
  function snapshot() {return {format:FORMAT,version:1,createdAt:new Date().toISOString(),data:normalize(currentData(),catalog()).data};}
  function parseBackup(text) {
    if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Legfeljebb 8 MB méretű mentést válassz.');
    let file;try{file=JSON.parse(text)}catch{throw Error('A fájl nem olvasható JSON-mentésként.');}
    safeTree(file);
    if(!object(file)||file.format!==FORMAT||file.version!==1)throw Error('Ehhez a visszatöltéshez Villanyvizsga-haladásmentés szükséges.');
    const normalized=normalize(file.data,catalog());
    if(normalized.ignored&&!Object.keys(normalized.data.questions).length&&!Object.keys(normalized.data.learning.read).length&&!Object.keys(normalized.data.learning.checks).length&&!normalized.data.examHistory.length&&!Object.keys(normalized.data.examExposure.byId).length)throw Error('A mentésben nem találtunk ehhez a tananyaghoz tartozó haladást.');
    return {...normalized,createdAt:typeof file.createdAt==='string'&&Number.isFinite(Date.parse(file.createdAt))?file.createdAt:''};
  }
  function mergeData(current,incoming) {
    const questions={...current.questions};
    for(const [id,row] of Object.entries(incoming.questions)){
      const old=questions[id];if(!old){questions[id]=row;continue;}
      const newer=old.status==='new'&&row.status!=='new'?row:row.status==='new'&&old.status!=='new'?old:row.at>old.at?row:old,results=new Map();
      for(const r of [...(old.results||[]),...(row.results||[])]){
        if(results.has(r.id)&&JSON.stringify(results.get(r.id))!==JSON.stringify(r))throw Error('A mentés egy próbálkozása eltér az itt tárolttól.');
        results.set(r.id,r);
      }
      questions[id]={...old,...newer,results:[...results.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-MAX_LOG)};
      const support=mergeSupport(old.support,row.support,Math.max(old.at,row.at));if(support)questions[id].support=support;
    }
    const learning={read:{...current.learning.read},checks:{...current.learning.checks},lastLesson:current.learning.lastLesson||incoming.learning.lastLesson||''};
    for(const [id,value] of Object.entries(incoming.learning.read))learning.read[id]=Math.max(Number(learning.read[id])||0,Number(value)||0)||value;
    for(const [id,row] of Object.entries(incoming.learning.checks))if(!learning.checks[id]||row.at>learning.checks[id].at)learning.checks[id]=row;
    const history=new Map();
    for(const row of [...current.examHistory,...incoming.examHistory])history.set(JSON.stringify([row.at,row.scope,row.sources,row.ids]),row);
    const examHistory=[...history.values()].sort((a,b)=>a.at-b.at).slice(-8),runs=Math.max(current.examExposure.runs,incoming.examExposure.runs),byId={};
    for(const source of [current.examExposure,incoming.examExposure])for(const [id,row] of Object.entries(source.byId))byId[id]={count:Math.max(byId[id]?.count||0,row.count),last:Math.max(byId[id]?.last||0,runs-source.runs+row.last)};
    return {questions,learning,examHistory,examExposure:{runs,byId}};
  }
  function restore(parsed) {
    const incoming=normalize(parsed.data,catalog()).data,current=normalize(currentData(),catalog()).data,merged=mergeData(current,incoming);
    const result=window.VV_STORAGE?.replaceProgress({[Q]:JSON.stringify(merged.questions),[L]:JSON.stringify(merged.learning),[H]:JSON.stringify(merged.examHistory),[E]:JSON.stringify(merged.examExposure)});
    if(!result?.ok)throw Error('A visszatöltés nem sikerült. A jelenlegi megnyitás haladása megmaradt.');
    return result;
  }
  function topicRows(selectedScope=scope) {
    const progress=read(Q)||{};
    return (window.VV_SELECTION?.topics()||[]).map(topic=>{
      const list=(config?.questions||[]).filter(q=>scopeOf(q)===selectedScope&&window.VV_SELECTION.topicFor(q)===topic.id),counts={new:0,repeat:0,repeated:0};
      for(const q of list)counts[outcome(progress[q.id])]++;
      return {...topic,list,counts};
    }).filter(topic=>topic.list.length);
  }
  function renderTopics() {
    if(!dialog?.open)return;
    const host=dialog.querySelector('[data-pt-rows]'),rows=topicRows();
    host.innerHTML=rows.map(row=>`<button type="button" class="pt-topic" data-topic="${esc(row.id)}"><span class="pt-topic-title">${esc(row.title)}<span aria-hidden="true">›</span></span><span class="pt-counts"><span>${row.counts.new}<small>Még nem próbáltad</small></span><span>${row.counts.repeat}<small>Ismétlendő</small></span><span>${row.counts.repeated}<small>Többször sikerült</small></span></span><span class="pt-track" aria-hidden="true"><i style="flex:${row.counts.new}" class="is-new"></i><i style="flex:${row.counts.repeat}" class="is-repeat"></i><i style="flex:${row.counts.repeated}" class="is-repeated"></i></span><span class="pt-reading"><span>Gyakorlás ›</span></span></button>`).join('');
    dialog.querySelectorAll('[data-pt-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ptScope===scope)));
  }
  function closeTopics(){if(dialog?.open)dialog.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  function openTopics() {
    if(!config)return;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='pt-dialog';dialog.setAttribute('aria-labelledby','ptTitle');
      dialog.innerHTML='<h2 id="ptTitle">Felkészültség témánként</h2><p class="pt-intro">Két önálló, helyes megoldás után jelenik meg a „Többször sikerült” állapot. A felkészültség kizárólag a feladatmegoldásokból számítódik.</p><div class="pt-scopes" role="group" aria-label="Feladatkör"><button type="button" data-pt-scope="papers">Feladatok</button><button type="button" data-pt-scope="generated">Géppel generált</button><button type="button" data-pt-scope="competition">Versenyfeladatok</button></div><div class="pt-topic-grid" data-pt-rows></div><button type="button" class="pt-close" aria-label="Felkészültség bezárása">×</button>';
      dialog.addEventListener('click',event=>{
        const source=event.target.closest('[data-pt-scope]');if(source){scope=source.dataset.ptScope;renderTopics();dialog.querySelector(`[data-pt-scope="${scope}"]`).focus();return;}
        const topic=event.target.closest('[data-topic]');if(topic){const row=topicRows().find(row=>row.id===topic.dataset.topic);if(row){closeTopics();config.startPractice(row.list.map(q=>q.id));}return;}
        if(event.target.closest('.pt-close'))closeTopics();
      });
      dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();closeTopics();});
      document.body.append(dialog);
    }
    returnFocus=document.activeElement;dialog.showModal();renderTopics();dialog.querySelector('.pt-close').focus({preventScroll:true});
  }
  function setup(value) {
    config=value;
    const heading=document.querySelector('.vv-dash-results-head');
    if(heading&&!heading.querySelector('[data-pt-open]')){const button=document.createElement('button');button.type='button';button.className='pt-open';button.dataset.ptOpen='';button.textContent='Felkészültség témánként';button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',openTopics);heading.append(button);}
    const title=document.querySelector('#practiceTitle');
    if(title&&!document.querySelector('[data-pt-practice]')){
      const row=document.createElement('div');row.className='pt-practice-heading';title.before(row);row.append(title);
      const button=document.createElement('button');button.type='button';button.className='pt-practice-summary';button.dataset.ptPractice='';button.setAttribute('aria-haspopup','dialog');
      button.innerHTML=(window.VV_SELECTION?.icon('readiness')||'')+'<span><strong>Felkészültség</strong><span data-pt-practice-count></span></span>';
      button.addEventListener('click',openTopics);row.append(button);
    }
    schedule();
  }
  function updatePracticeSummary(){
    const button=document.querySelector('[data-pt-practice]');if(!button||!config)return;
    const records=read(Q)||{},questions=config.questions||[],done=questions.filter(q=>['correct','retry'].includes(records[q.id]?.status)),retry=done.filter(q=>outcome(records[q.id])==='repeat').length;
    button.querySelector('[data-pt-practice-count]').textContent=`${done.length} / ${questions.length} megoldott, ${retry} ismétlendő`;
    button.querySelector('[data-pt-ring]')?.setAttribute('stroke-dasharray',`${questions.length?done.length/questions.length*100:0} 100`);
  }
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;renderTopics();updatePracticeSummary();});}
  function mountBackup() {
    const parent=document.querySelector('#vvStorageDialog [data-storage-view="manage"]');if(!parent||parent.querySelector('.pt-backup'))return;
    const section=document.createElement('section');section.className='pt-backup';section.setAttribute('aria-label','Haladás fájlba mentése és visszatöltése');
    section.innerHTML='<div class="pt-backup-actions"><button type="button" data-backup-export>Mentés fájlba</button><button type="button" data-backup-pick>Visszatöltés</button></div><input type="file" accept=".json,application/json" hidden data-backup-file><p class="pt-backup-status" role="status" aria-live="polite" data-backup-status></p><div class="pt-backup-preview" hidden><strong>Beolvasott mentés</strong><p data-backup-summary></p><p>Hozzáadjuk a meglévő haladáshoz. A folyamatban lévő gyakorlás és vizsga bezárul.</p><p data-backup-temporary></p><div class="pt-backup-actions"><button type="button" data-backup-cancel>Mégsem</button><button type="button" data-backup-confirm>Visszatöltöm</button></div></div>';
    parent.insertBefore(section,parent.querySelector('[data-storage-delete]'));
    parent.querySelector('p').textContent='A haladásodat itt fájlba mentheted és visszatöltheted. A törlést külön meg kell erősíteni.';
    const status=section.querySelector('[data-backup-status]'),preview=section.querySelector('.pt-backup-preview'),fileInput=section.querySelector('[data-backup-file]');
    const reset=()=>{pending=null;fileToken++;preview.hidden=true;fileInput.value='';};
    section.querySelector('[data-backup-export]').addEventListener('click',()=>{
      try{const file=snapshot(),blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='villanyvizsga-haladas-'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest'}).format(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='A haladásmentés letöltése elindult.';}catch(error){status.textContent=error.message;}
    });
    section.querySelector('[data-backup-pick]').addEventListener('click',()=>{fileInput.value='';fileInput.click();});
    fileInput.addEventListener('change',async()=>{
      const file=fileInput.files?.[0];if(!file)return;reset();const token=fileToken;status.textContent='A mentés ellenőrzése…';
      try{if(file.size>MAX_BYTES)throw Error('Legfeljebb 8 MB méretű mentést válassz.');const parsed=parseBackup(await file.text());if(token!==fileToken)return;pending=parsed;
        section.querySelector('[data-backup-summary]').textContent=`${Object.keys(parsed.data.questions).length} feladat és ${Object.keys(parsed.data.learning.read).length} átolvasott lecke.${parsed.ignored?' A tananyaghoz nem tartozó bejegyzéseket kihagyjuk.':''}`;
        section.querySelector('[data-backup-temporary]').textContent=window.VV_STORAGE?.allowed?'A visszatöltött haladást ezen a böngészőn mentjük.':'A mentés ki van kapcsolva. A visszatöltés most csak erre a megnyitásra szól.';
        preview.hidden=false;status.textContent='';section.querySelector('[data-backup-cancel]').focus();
      }catch(error){if(token===fileToken)status.textContent=error.message;}
    });
    section.querySelector('[data-backup-cancel]').addEventListener('click',()=>{reset();status.textContent='';section.querySelector('[data-backup-pick]').focus();});
    section.querySelector('[data-backup-confirm]').addEventListener('click',()=>{if(!pending)return;try{const result=restore(pending);reset();status.textContent=result.persisted?'A haladást hozzáadtuk a mentésedhez.':'A haladást betöltöttük erre a megnyitásra. A tartós mentés továbbra is ki van kapcsolva.';}catch(error){status.textContent=error.message;}});
  }
  window.addEventListener('vv-storage-change',schedule);window.addEventListener('vv-storage-restored',schedule);window.addEventListener('vv-storage-clear',()=>{pending=null;fileToken++;const preview=document.querySelector('.pt-backup-preview');if(preview)preview.hidden=true;schedule();});
  document.addEventListener('vv-learning-ready',schedule);document.addEventListener('vv-learning-progress',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBackup,{once:true});else mountBackup();
  window.VV_PROGRESS=Object.freeze({setup,record,noteSupport,outcome,attemptId,topicRows,open:openTopics});
  window.VV_BACKUP=Object.freeze({snapshot,parse:parseBackup,merge:mergeData,restore,maxBytes:MAX_BYTES});
})();
