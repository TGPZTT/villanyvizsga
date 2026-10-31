(function(root){
  'use strict';
  const aliases=raw=>raw?.questionAliases||root.VV_DATA?.questionAliases||{};
  function resolveId(value,raw){
    let id=String(value??'');const seen=new Set(),map=aliases(raw);
    while(Object.hasOwn(map,id)&&!seen.has(id)){seen.add(id);id=String(map[id]);}
    return id;
  }
  const stamp=row=>Number.isSafeInteger(row?.at)&&row.at>=0?row.at:0;
  function migrateProgress(progress,questions,raw){
    let changed=false;
    for(const q of questions||[]){
      if(q.interaction!=='multipart'||!q.legacyQuestionIds?.length)continue;
      const rows=q.legacyQuestionIds.map(id=>progress[id]);
      const graded=rows.filter(row=>row&&['correct','retry'].includes(row.status));
      const supports=rows.map(row=>row?.support).filter(s=>s&&(s.hintUsed||s.solutionUsed)&&Number.isSafeInteger(s.at));
      if(!graded.length&&!supports.length)continue;
      const previous=progress[q.id],latest=Math.max(0,...graded.map(stamp));
      const support=supports.sort((a,b)=>b.at-a.at)[0];
      const allCorrect=rows.every(row=>row?.status==='correct');
      const derive=!previous||graded.length&&(latest>stamp(previous)||latest===stamp(previous)&&!previous.results?.length);
      const next=derive?{...previous,status:graded.length?(allCorrect?'correct':'retry'):'new',at:graded.length?latest:0}:{...previous};
      // Separate historical parts are preserved, but they are not invented
      // verified attempts at the complete task.
      next.results=Array.isArray(previous?.results)?previous.results:[];
      if(support&&(!next.support||next.support.at<support.at))next.support={...support};
      if(JSON.stringify(previous)!==JSON.stringify(next)){progress[q.id]=next;changed=true;}
    }
    return changed;
  }
  function removeProgress(progress,ids,raw){
    const targets=new Set(ids.map(id=>resolveId(id,raw)));
    for(const id of Object.keys(progress))if(targets.has(resolveId(id,raw)))delete progress[id];
  }
  function canonicalizeHistory(rows,raw){
    return Array.isArray(rows)?rows.map(row=>row&&Array.isArray(row.ids)?{...row,ids:[...new Set(row.ids.map(id=>resolveId(id,raw)))]}:row):rows;
  }
  function canonicalizeExposure(saved,raw){
    if(!saved||typeof saved!=='object'||!saved.byId||typeof saved.byId!=='object')return saved;
    const byId=Object.create(null);
    for(const [oldId,row]of Object.entries(saved.byId)){
      const id=resolveId(oldId,raw);if(!row||!Number.isSafeInteger(row.count)||!Number.isSafeInteger(row.last))continue;
      const old=byId[id];byId[id]={count:Math.max(old?.count||0,row.count),last:Math.max(old?.last||0,row.last)};
    }
    return {...saved,byId};
  }
  root.VV_TASK_GROUPS=Object.freeze({resolveId,migrateProgress,removeProgress,canonicalizeHistory,canonicalizeExposure});
})(typeof window==='undefined'?globalThis:window);
