(function(root){
  'use strict';
  const DAY=86400000,MIN_WEIGHT=.4;
  const norm=value=>String(value||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const stop=new Set('a az egy es vagy hogy mi mit melyik melyek helyes igaz allitas feladat valasz meg megoldas kell van'.split(' '));
  const tokens=q=>new Set(norm(q.prompt).replace(/\d+(?:[.,]\d+)?/g,' # ').match(/[a-z]+|#/g)?.filter(t=>t.length>1&&!stop.has(t))||[]);
  const family=q=>q.examSimilarityGroup||q.generated?.conceptFamily||'';
  const figures=q=>new Set(q.examImageGroups||q.figurePaths||[q.figurePath].filter(Boolean));
  const kind=q=>q.numericFields?.length||q.type==='number'||q.type==='numeric'?'number':q.type==='multi'||q.type==='multiple'?'multiple':'single';
  const logs=row=>Array.isArray(row?.results)?row.results.filter(r=>r&&typeof r.correct==='boolean'):[];
  const time=value=>Number.isFinite(value)&&value>=5000&&value<=1200000?value:0;
  function streak(row){let n=0;const results=logs(row);for(let i=results.length-1;i>=0;i--){const r=results[i];if(!r.correct||r.assisted||r.hintUsed||r.solutionUsed)break;n++;}return n;}
  function state(row){if(!logs(row).length&&(!row||!['correct','retry'].includes(row.status)))return 'new';return row.status==='correct'&&streak(row)>=2?'repeated':'repeat';}
  function expected(q){
    const text=String(q.prompt||'').replace(/<[^>]*>/g,' '),options=(q.options||[]).map(o=>typeof o==='string'?o:JSON.stringify(o)).join(' ');
    return ({single:32,multiple:50,number:72}[kind(q)]+Math.min(90,(text.length+options.length)*.035))*1000;
  }
  function baselines(pool,progress){
    const values={single:[],multiple:[],number:[]};
    for(const q of pool){
      const own=logs(progress[String(q.id)]).filter(r=>r.correct&&!r.assisted&&!r.hintUsed&&!r.solutionUsed&&time(r.activeMs)).slice(-3);
      if(own.length){const ratios=own.map(r=>r.activeMs/expected(q)).sort((a,b)=>a-b);values[kind(q)].push(ratios[Math.floor(ratios.length/2)]);}
    }
    return Object.fromEntries(Object.entries(values).map(([key,list])=>{list.sort((a,b)=>a-b);return [key,list.length>=5?Math.max(.25,Math.min(4,list[Math.floor(list.length/2)])):1];}));
  }
  function describe(question,row,{now=Date.now(),baseline=1,conceptError=0}={}){
    const results=logs(row),last=results.at(-1),level=state(row),reasons=[];
    let weight=level==='new'?6.2:row.status==='retry'?8.4:level==='repeated'?1.1:last?4:2.6;
    if(level==='new')reasons.push('Ezt a feladatot még nem oldottad meg.');
    else if(last&&!last.correct)reasons.push('Legutóbb elsőre nem válaszoltál helyesen.');
    else if(row.status==='retry')reasons.push('Ezt a feladatot ismétlendőnek jelölted.');
    else if(level==='repeated')reasons.push('Ezt már többször önállóan megoldottad.');
    else reasons.push('Ezt még érdemes újra megoldanod.');
    if(last&&!last.correct){
      let errors=0;for(let i=results.length-1;i>=0&&!results[i].correct;i--)errors++;
      weight=9.3+Math.min(2,Math.max(0,errors-1)*.5);
    }
    const solvedWithHelp=last?.correct&&(last.assisted||last.hintUsed||last.solutionUsed);
    if(solvedWithHelp){weight=Math.max(weight,6.4);reasons.unshift(last.solutionUsed?'A válasz előtt megnézted a megoldást.':'A megoldáshoz segítséget használtál.');}
    const support=row?.support;
    if(support&&Number.isFinite(support.at)&&support.at>(last?.at||0)&&(support.hintUsed||support.solutionUsed)){
      weight+=support.solutionUsed?2.2:1.8;
      reasons.unshift(support.solutionUsed?'Legutóbb megnézted a megoldást.':'Legutóbb támpontot kértél.');
    }
    if(conceptError>(last?.at||row?.at||0)){weight+=1.6;reasons.unshift('A kapcsolódó lecke ellenőrző kérdésénél még tévesztettél.');}
    const active=time(last?.activeMs),relative=active/(expected(question)*Math.max(.25,Math.min(4,Number(baseline)||1)));
    if(relative>1.8){weight+=Math.min(.75,(relative-1.8)*.3);reasons.push('Ennél több aktív időre volt szükséged.');}
    const stamp=Number(last?.at||row?.at)||0,age=stamp>0?Math.max(0,now-stamp):Infinity;
    if(level==='repeated'&&Number.isFinite(age))weight+=Math.min(1.2,Math.max(0,age/DAY-7)/21);
    if(age<10*60000)weight*=.82;
    const successful=results.filter(r=>r.correct&&!r.assisted&&!r.hintUsed&&!r.solutionUsed).length;
    weight/=1+.04*Math.min(6,successful);
    return {weight:Math.max(MIN_WEIGHT,Math.min(15,weight)),state:level,reasons:[...new Set(reasons)]};
  }
  function related(a,b){
    if(a.family&&a.family===b.family)return true;
    if([...a.figures].some(path=>b.figures.has(path)))return true;
    const shared=[...a.tokens].filter(t=>b.tokens.has(t)).length,union=a.tokens.size+b.tokens.size-shared;
    return shared>=4&&union>0&&shared/union>=.66;
  }
  function draw(rows,weight,random){
    const sum=rows.reduce((n,row)=>n+weight(row),0),sample=Math.min(1-Number.EPSILON,Math.max(0,Number(random())||0));let cursor=sample*sum;
    for(const row of rows){cursor-=weight(row);if(cursor<0)return row;}
    return rows.at(-1);
  }
  function select(pool,count,{progress={},now=Date.now(),random=Math.random,topicOf=q=>q.topic||'',recent=[],lessonErrors={}}={}){
    const unique=[...new Map((Array.isArray(pool)?pool:[]).filter(q=>q&&q.id!==undefined).map(q=>[String(q.id),q])).values()];
    const requested=Math.max(0,Math.min(unique.length,Math.floor(Number(count)||0))),baseline=baselines(unique,progress),reasons={},composition={new:0,repeat:0,repeated:0};
    const rows=unique.map(q=>{const f=family(q),times=recent.filter(r=>r.id===String(q.id)).length,close=f&&recent.some(r=>r.family===f),factor=times?Math.max(.28,Math.pow(.55,times)):close?.65:1;const info=describe(q,progress[String(q.id)],{now,baseline:baseline[kind(q)],conceptError:lessonErrors[String(q.id)]||0});return {q,id:String(q.id),family:f,figures:figures(q),tokens:tokens(q),topic:topicOf(q),...info,weight:info.weight*factor};});
    const chosen=[],topics=new Map();let candidates=[...rows],exploration=false;
    const add=row=>{chosen.push(row);composition[row.state]++;reasons[row.id]=row.reasons[0];topics.set(row.topic,(topics.get(row.topic)||0)+1);candidates=candidates.filter(other=>other.id!==row.id&&!related(row,other));};
    if(requested){const fresh=candidates.filter(row=>row.state==='new');if(fresh.length){add(draw(fresh,row=>row.weight,random));exploration=true;}}
    while(chosen.length<requested&&candidates.length)add(draw(candidates,row=>row.weight/(1+.45*(topics.get(row.topic)||0)),random));
    return {questions:chosen.map(row=>row.q),meta:{available:unique.length,requested,selected:chosen.length,exploration,limitedBySimilarity:chosen.length<requested,reasons,composition}};
  }
  const recentSets=[];
  function remember(questions){recentSets.push(questions.map(q=>({id:String(q.id),family:family(q)})));if(recentSets.length>2)recentSets.shift();}
  function lessonErrors(){
    let checks={};try{checks=JSON.parse(root.VV_STORAGE?.get('villanyvizsga-learning-v1'))?.checks||{}}catch{}
    const source=root.VV_LEARNING,out={};if(!source?.chapters)return out;
    const links=new Map();for(const chapter of source.chapters)for(const lesson of chapter.lessons)links.set(lesson.id,new Set(lesson.questionIds||[]));
    for(const [qid,ids]of Object.entries(source.questionLinks||{}))for(const id of Array.isArray(ids)?ids:[ids])links.get(id)?.add(qid);
    for(const [id,row]of Object.entries(checks))if(row?.correct===false&&Number.isFinite(row.at))for(const qid of links.get(id)||[])out[String(qid)]=Math.max(out[String(qid)]||0,row.at);
    return out;
  }
  function plan(pool,count,options={}){return select(pool,count,{...options,recent:recentSets.flat(),lessonErrors:lessonErrors()});}
  let uiConfig,observer,scheduled=false;
  const quick={count:10,kinds:new Set(['papers'])};
  const sourceKind=q=>q.generated?.machineGenerated||q.sourceId?.startsWith('generated-exam-')?'generated':root.VV_LABELS?.sourceKind(q)==='Versenyfeladat'?'competition':'papers';
  function quickPool(){return (uiConfig?.allPool?.()||[]).filter(q=>quick.kinds.has(sourceKind(q)));}
  function quickStart(parent){
    if(!parent||!uiConfig?.allPool)return;
    let panel=document.querySelector('#practiceView [data-adaptive-quick-panel]');
    if(!panel){
      panel=document.createElement('section');panel.className='ap-quick';panel.dataset.adaptiveQuickPanel='';panel.setAttribute('aria-labelledby','apQuickTitle');
      const art=id=>root.VV_SELECTION?.icon(id)||'';
      const intro=parent.querySelector(':scope > p');if(intro)intro.textContent='Indíts Okos gyakorlást, vagy állítsd össze te a feladatsort.';
      panel.innerHTML='<div class="ap-quick-overview"><span class="ap-quick-art">'+art('smart')+'</span><div class="ap-quick-copy"><h2 id="apQuickTitle" class="ap-quick-title">Okos gyakorlás</h2><p>A korábban elrontott, segítséggel megoldott és még nem próbált feladatok nagyobb eséllyel kerülnek bele. Több témából válogat, ritkítja a hasonló kérdéseket, és az átolvasást nem számítja bele.</p></div></div><div class="ap-quick-controls"><div class="ap-quick-count" role="group" aria-label="Feladatok száma">'+[10,20,30].map(n=>'<button type="button" data-quick-count="'+n+'" aria-pressed="'+(quick.count===n)+'">'+n+'</button>').join('')+'</div><div class="ap-quick-sources" role="group" aria-label="További feladatcsoportok"><label><input type="checkbox" name="quickPracticeGenerated" data-quick-kind="generated"><span>Géppel generált</span></label><label><input type="checkbox" name="quickPracticeCompetition" data-quick-kind="competition"><span>Versenyfeladatok</span></label></div><button type="button" class="ap-quick-start" data-adaptive-quick="practice">'+art('start')+'<span>Indítás</span></button></div>';
      panel.addEventListener('click',event=>{const count=event.target.closest('[data-quick-count]');if(count){quick.count=Number(count.dataset.quickCount);panel.querySelectorAll('[data-quick-count]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.quickCount)===quick.count)));}});
      panel.querySelectorAll('[data-quick-kind]').forEach(input=>{input.checked=quick.kinds.has(input.dataset.quickKind)});
      panel.addEventListener('change',event=>{const input=event.target.closest('[data-quick-kind]');if(input)input.checked?quick.kinds.add(input.dataset.quickKind):quick.kinds.delete(input.dataset.quickKind);panel.querySelector('[data-adaptive-quick]').disabled=!quickPool().length;});
      panel.querySelector('[data-adaptive-quick]').addEventListener('click',()=>{const result=plan(quickPool(),quick.count,{progress:uiConfig.progress(),topicOf:q=>root.VV_SELECTION?.topicFor(q)||q.topic||''});if(result.questions.length)uiConfig.launch(result.questions,result.meta);});
      parent.after(panel);
    }
    panel.querySelector('[data-adaptive-quick]').disabled=!quickPool().length;
  }
  function refreshUI(){
    scheduled=false;
    document.querySelector('[data-adaptive-quick="home"]')?.remove();
    quickStart(document.querySelector('#practiceView .page-intro'));
    const setup=document.querySelector('#practiceSetup'),start=setup?.querySelector('#startPractice'),slot=start?.closest('.sf-start-slot');
    if(!slot||start.hidden||!uiConfig)return;
    let button=slot.querySelector('[data-adaptive-start]');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='button outline ap-start';button.dataset.adaptiveStart='';button.innerHTML=(root.VV_SELECTION?.icon('smart')||'')+'<span>Okos gyakorlás</span>';button.title='A hibákból, a segítségkérésből és a tényleges megoldásokból állít össze gyakorlást.';
      button.addEventListener('click',()=>{
        const result=plan(uiConfig.pool(),uiConfig.count(),{progress:uiConfig.progress(),topicOf:q=>root.VV_SELECTION?.topicFor(q)||q.topic||''});
        if(result.questions.length)uiConfig.launch(result.questions,result.meta);
      });
      slot.append(button);
    }
    button.disabled=!uiConfig.pool().length;
    slot.classList.add('ap-start-slot');
  }
  function scheduleUI(){if(!scheduled){scheduled=true;queueMicrotask(refreshUI);}}
  function mount(config){
    uiConfig=config;
    const setup=document.querySelector('#practiceSetup');if(!setup)return;
    if(!observer){observer=new MutationObserver(scheduleUI);observer.observe(setup,{childList:true,subtree:true});setup.addEventListener('change',scheduleUI);}
    scheduleUI();
  }
  root.VV_ADAPTIVE=Object.freeze({select,describe,plan,remember,mount});
})(typeof window==='undefined'?globalThis:window);
