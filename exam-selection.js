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
  function select(pool,count,{areas,areaOf,history=[],random=Math.random}={}){
    const unique=[...new Map(pool.map(q=>[String(q.id),q])).values()],recent=history.slice(-8).reverse();
    const seen=new Map();recent.forEach((test,age)=>new Set(test.ids||[]).forEach(id=>{const value=seen.get(id)||{count:0,age};value.count++;seen.set(id,value);}));
    const descriptors=new Map(unique.map(q=>[q.id,{family:q.examSimilarityGroup||q.generated?.conceptFamily||'',figures:new Set(q.examImageGroups||q.figurePaths||[]),tokens:tokens(q)}]));
    function similar(a,b){
      const x=descriptors.get(a.id),y=descriptors.get(b.id);
      if(x.family&&x.family===y.family)return true;
      if([...x.figures].some(f=>y.figures.has(f)))return true;
      const shared=[...x.tokens].filter(t=>y.tokens.has(t)).length,union=x.tokens.size+y.tokens.size-shared;
      return shared>=4&&union>0&&shared/union>=.66;
    }
    const rank=q=>{const s=seen.get(q.id);return s?[s.age===0?1:0,s.count,-s.age]:[0,0,-999];};
    const compare=(a,b)=>{const x=rank(a),y=rank(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];};
    const target=quotas(count,areas);let best=[];
    const quality=list=>[list.length,-list.filter(q=>seen.get(q.id)?.age===0).length,-list.reduce((sum,q)=>sum+(seen.get(q.id)?.count||0),0)];
    const better=(a,b)=>{const x=quality(a),y=quality(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]>y[i];return false;};
    for(let attempt=0;attempt<8;attempt++){
      const ordered=shuffle(unique,random).sort(compare),chosen=[],used=new Set();
      const fits=q=>!used.has(q.id)&&chosen.every(other=>!similar(q,other));
      const add=q=>{chosen.push(q);used.add(q.id);};
      for(const quota of target){if(!quota.count)continue;let n=0;for(const q of ordered){if(areaOf(q)!==quota.id||!fits(q))continue;add(q);if(++n>=quota.count)break;} }
      for(const q of ordered){if(chosen.length>=count)break;if(fits(q))add(q);}
      if(better(chosen,best))best=chosen;
      if(best.length===count&&quality(best)[1]===0)break;
    }
    return {questions:shuffle(best,random),meta:{available:unique.length,selected:best.length,previousOverlap:best.filter(q=>seen.get(q.id)?.age===0).length,areas:Object.fromEntries(areas.map(a=>[a.id,best.filter(q=>areaOf(q)===a.id).length]))}};
  }
  root.VV_EXAM_PICKER={select};
})(typeof window==='undefined'?globalThis:window);
