(function(root){
  'use strict';
  const norm=text=>String(text||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const stop=new Set('a az egy es vagy hogy mi mit melyik melyek helyes igaz allitas feladat valasz meg megoldas kell van'.split(' '));
  const tokens=q=>new Set(norm(q.prompt).replace(/\d+(?:[.,]\d+)?/g,' # ').match(/[a-z]+|#/g)?.filter(x=>x.length>1&&!stop.has(x))||[]);
  function shuffle(list,random){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function quotas(count,areas){
    const rows=areas.map((a,i)=>({id:a.id,count:Math.floor(count*a.weight/100),remainder:count*a.weight/100%1,index:i}));
    const remaining=count-rows.reduce((sum,a)=>sum+a.count,0);
    [...rows].sort((a,b)=>b.remainder-a.remainder||a.index-b.index).slice(0,remaining).forEach(a=>a.count++);
    return rows;
  }
  const catalogs=new WeakMap();
  function catalogFor(catalog){
    if(catalogs.has(catalog))return catalogs.get(catalog);
    const questions=[...new Map(catalog.map(q=>[String(q.id),q])).values()];
    const descriptors=questions.map(q=>({family:q.examSimilarityGroup||q.generated?.conceptFamily||'',figures:new Set(q.examImageGroups||q.figurePaths||[]),tokens:tokens(q)}));
    const conflicts=new Map(questions.map(q=>[String(q.id),new Set([String(q.id)])]));
    for(let i=0;i<questions.length;i++)for(let j=0;j<i;j++){
      const x=descriptors[i],y=descriptors[j];
      let similar=!!x.family&&x.family===y.family||[...x.figures].some(f=>y.figures.has(f));
      if(!similar){
        const shared=[...x.tokens].filter(t=>y.tokens.has(t)).length,union=x.tokens.size+y.tokens.size-shared;
        similar=shared>=4&&union>0&&shared/union>=.66;
      }
      if(similar){conflicts.get(String(questions[i].id)).add(String(questions[j].id));conflicts.get(String(questions[j].id)).add(String(questions[i].id));}
    }
    const result={conflicts};catalogs.set(catalog,result);return result;
  }
  function select(pool,count,{areas,areaOf,history=[],catalog=pool,exposure=null,random=Math.random}={}){
    const unique=[...new Map(pool.map(q=>[String(q.id),q])).values()];
    const index=catalogFor(catalog),missing=unique.some(q=>!index.conflicts.has(String(q.id)));
    const {conflicts}=missing?catalogFor([...catalog,...unique]):index;
    const recent=history.filter(test=>test&&Array.isArray(test.ids)).slice().reverse();
    const seen=new Map(),similarSeen=new Map();
    recent.forEach((test,age)=>{
      const ids=new Set(test.ids.map(String)),related=new Set();
      ids.forEach(id=>{
        const value=seen.get(id)||{count:0,age};value.count++;seen.set(id,value);
        for(const other of conflicts.get(id)||[id])related.add(other);
      });
      related.forEach(id=>{const value=similarSeen.get(id)||{count:0,age};value.count++;similarSeen.set(id,value);});
    });
    const target=quotas(count,areas),targetById=new Map(target.map(a=>[a.id,a.count]));
    const questionAreas=new Map(unique.map(q=>[String(q.id),areaOf(q)])),area=q=>questionAreas.get(String(q.id));
    const requiredAreas=areas.filter(a=>[...questionAreas.values()].includes(a.id));
    const exposureFor=q=>{
      const row=exposure?.byId?.[String(q.id)];
      return row&&Number.isFinite(row.count)&&row.count>=0?{count:row.count,last:Number.isFinite(row.last)&&row.last>=0?row.last:0}:{count:exposure?0:seen.get(String(q.id))?.count||0,last:0};
    };
    const exposures=new Map(unique.map(q=>[String(q.id),exposureFor(q)]));
    const tiers=[...new Set([...exposures.values()].map(row=>row.count))].sort((a,b)=>a-b);
    const rank=q=>{
      const id=String(q.id),s=seen.get(id),related=similarSeen.get(id),usage=exposures.get(id);
      return [usage.count,related?.age===0?1:0,s?.age===0?1:0,usage.last,related?.count||0,-(related?.age??999)];
    };
    const compareRanks=(x,y)=>{for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;};
    const ranks=new Map(unique.map(q=>[String(q.id),rank(q)]));
    const compare=(a,b)=>compareRanks(ranks.get(String(a.id)),ranks.get(String(b.id)));
    const areaCounts=list=>new Map(areas.map(a=>[a.id,list.filter(q=>area(q)===a.id).length]));
    const quality=list=>{
      const actual=areaCounts(list),totals=[0,0,0,0,0,0],usageCounts=new Map(tiers.map(tier=>[tier,0]));
      for(const q of list){const row=ranks.get(String(q.id));row.forEach((value,i)=>totals[i]+=value);}
      for(const q of list){const tier=exposures.get(String(q.id)).count;usageCounts.set(tier,usageCounts.get(tier)+1);}
      const deviation=areas.reduce((sum,a)=>sum+Math.abs((actual.get(a.id)||0)-targetById.get(a.id)),0);
      // Question counts may vary. Every available scoring area stays represented,
      // then rare IDs and recent variety take priority over the old count targets.
      return [requiredAreas.filter(a=>!actual.get(a.id)).length,-list.length,...tiers.map(tier=>-usageCounts.get(tier)),...totals.slice(1),deviation];
    };
    let best=[],bestQuality=quality(best);
    for(let attempt=0;attempt<24;attempt++){
      const ordered=shuffle(unique,random).sort(compare),areaOrder=shuffle(target,random),chosen=[],blocked=new Set(),actual=new Map(areas.map(a=>[a.id,0]));
      const byArea=new Map(areas.map(a=>[a.id,ordered.filter(q=>area(q)===a.id)]));
      const available=new Map(areas.map(a=>[a.id,byArea.get(a.id).length])),cursor=new Map(areas.map(a=>[a.id,0]));
      const fits=q=>!blocked.has(String(q.id));
      const add=q=>{
        chosen.push(q);actual.set(area(q),(actual.get(area(q))||0)+1);
        for(const id of conflicts.get(String(q.id))){
          if(!blocked.has(id)&&questionAreas.has(id)){const areaId=questionAreas.get(id);available.set(areaId,available.get(areaId)-1);}
          blocked.add(id);
        }
      };
      // Also try starting with a rare ID from a less scarce area. Otherwise a
      // cross-area family can always be consumed before that variant is reached.
      if(attempt>0&&ordered.length)add(ordered[0]);
      // Reserve one question for each area before filling globally by exposure.
      while(chosen.length<count){
        const pending=areaOrder.filter(quota=>!actual.get(quota.id)&&available.get(quota.id)>0);
        if(!pending.length)break;
        pending.sort((a,b)=>available.get(a.id)-available.get(b.id));
        const next=pending[0],candidates=byArea.get(next.id);let position=cursor.get(next.id);
        while(!fits(candidates[position]))position++;
        cursor.set(next.id,position+1);add(candidates[position]);
      }
      for(const q of ordered){if(chosen.length>=count)break;if(fits(q))add(q);}
      const candidateQuality=quality(chosen);
      if(compareRanks(candidateQuality,bestQuality)<0){best=chosen;bestQuality=candidateQuality;}
    }
    if(bestQuality[0]>0)best=[];
    return {questions:shuffle(best,random),meta:{available:unique.length,selected:best.length,previousOverlap:best.filter(q=>seen.get(String(q.id))?.age===0).length,previousSimilarOverlap:best.filter(q=>similarSeen.get(String(q.id))?.age===0).length,areas:Object.fromEntries(areas.map(a=>[a.id,best.filter(q=>area(q)===a.id).length]))}};
  }
  root.VV_EXAM_PICKER={select};
})(typeof window==='undefined'?globalThis:window);
