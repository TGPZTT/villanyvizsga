(function(root){
  'use strict';

  function shuffle(list,random){
    const result=[...list];
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }

  function select(pool,count,{history=[],groupOf=value=>String(value?.id??value),areas=[],areaOf,random=Math.random}={}){
    const groups=new Map();
    for(const q of pool){const group=String(groupOf(q));if(!groups.has(group))groups.set(group,q);}
    const unique=[...groups.values()];
    const previous=Array.isArray(history)?history.slice().reverse().find(row=>row&&Array.isArray(row.ids)&&row.ids.length):null;
    const blocked=new Set((previous?.ids||[]).map(id=>String(groupOf(String(id)))));
    const eligible=unique.filter(q=>!blocked.has(String(groupOf(q))));
    const requested=Number.isSafeInteger(count)&&count>0?count:0;
    // Every eligible task has the same chance. Earlier appearances, dates,
    // topic quotas and similarity families do not affect the draw.
    let questions=[];
    if(requested&&unique.length>=requested){
      if(eligible.length>=requested)questions=shuffle(eligible,random).slice(0,requested);
      else{
        const repeated=unique.filter(q=>blocked.has(String(groupOf(q))));
        questions=shuffle([...eligible,...shuffle(repeated,random).slice(0,requested-eligible.length)],random);
      }
    }
    const previousOverlap=questions.filter(q=>blocked.has(String(groupOf(q)))).length;
    return {questions,meta:{
      available:unique.length,
      eligible:eligible.length,
      excludedPrevious:unique.length-eligible.length,
      selected:questions.length,
      previousOverlap,
      areas:Object.fromEntries(areas.map(area=>[area.id,questions.filter(q=>areaOf?.(q)===area.id).length]))
    }};
  }

  root.VV_EXAM_PICKER={select};
})(typeof window==='undefined'?globalThis:window);
