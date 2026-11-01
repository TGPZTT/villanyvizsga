(function(root){
  'use strict';

  const text=value=>String(value??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
  const gradingProperties=['kind','type','questionType','interaction','answer','correctAnswer','unit','tolerance','scoringBasis','wrongAnswerPenaltyFactor','requiresAnsweredFields','requiresCorrectFields'];
  function gradingModel(question){
    const model={};
    for(const key of gradingProperties)if(Object.hasOwn(question,key))model[key]=question[key];
    model.prompt=text(question.prompt??question.label);
    model.options=(question.options||[]).map((option,index)=>typeof option==='string'
      ?{key:String.fromCharCode(65+index),text:text(option)}
      :{key:String(option.key??option.id??String.fromCharCode(65+index)),text:text(option.text??option.label??option.value)});
    model.figures=(question.figurePaths?.length?question.figurePaths:question.figurePath?[question.figurePath]:[]).map(String);
    const fields=question.answerFields||question.numericFields;
    if(fields)model.fields=fields.map(field=>({model:gradingModel(field),points:field.points??null}));
    return model;
  }

  function create(raw={},questions=[]){
    const originals=Array.isArray(questions)?questions:[];
    const sources=new Map((raw.sources||[]).map(source=>typeof source==='string'?[source,{id:source}]:[String(source.id),source]));
    const originalById=new Map(originals.map(question=>[String(question.id),question]));
    const entries=[...originals],entryById=new Map(originalById);
    const parent=new Map([...originalById.keys()].map(id=>[id,id]));
    const explicitNames=[];
    const find=id=>{
      let current=id;
      while(parent.has(current)&&parent.get(current)!==current)current=parent.get(current);
      return current;
    };
    const join=(left,right)=>{
      const a=find(left),b=find(right);
      if(a!==b)parent.set(a<b?b:a,a<b?a:b);
    };
    const canonicalId=value=>{
      if(value&&typeof value==='object')return String(value.progressQuestionId??value.questionId??value.id??'');
      const id=String(value??'');
      return String(entryById.get(id)?.progressQuestionId??id);
    };

    // An occurrence is a source-specific view. Its ID is never a progress key.
    for(const occurrence of raw.questionOccurrences||[]){
      const id=String(occurrence?.id??''),questionId=String(occurrence?.questionId??'');
      const original=originalById.get(questionId);
      if(!id||!original||entryById.has(id))continue;
      const sourceId=String(occurrence.sourceId??original.sourceId??''),source=sources.get(sourceId)||{};
      const item={...original,id,progressQuestionId:questionId,isSourceOccurrence:true,sourceId,
        sourceFile:source.file||sourceId,
        sourceTitle:occurrence.sourceTitle??source.title??original.sourceTitle,
        sourcePath:source.path||'',
        number:occurrence.number??original.number,
        year:occurrence.year??source.year??source.createdYear??original.year,
        page:occurrence.page??original.page,
        points:Number.isFinite(occurrence.points)&&occurrence.points>0?occurrence.points:original.points};
      entries.push(item);entryById.set(id,item);
    }

    const groups=Array.isArray(raw.exactDuplicateGroups)?raw.exactDuplicateGroups
      :Object.entries(raw.exactDuplicateGroups||{}).map(([id,questionIds])=>({id,questionIds}));
    for(const [index,group]of groups.entries()){
      const members=Array.isArray(group)?group:group.questionIds||group.members||group.ids||[];
      const ids=[...new Set(members.map(canonicalId).filter(id=>originalById.has(id)))];
      if(ids.length<2)continue;
      for(const id of ids.slice(1))join(ids[0],id);
      if(!Array.isArray(group)&&group.id)explicitNames.push({id:String(group.id),member:ids[0]});
    }

    // This is deliberately strict. Similar lessons, new numbers, subsets,
    // different figures and reordered options do not establish equivalence.
    const bySignature=new Map();
    for(const question of originals){
      if(question.review||question.drawing||!text(question.prompt))continue;
      if(question.requiresFigure&&!question.figurePath&&!question.figurePaths?.length)continue;
      const signature=JSON.stringify(gradingModel(question)),id=String(question.id);
      if(bySignature.has(signature))join(id,bySignature.get(signature));else bySignature.set(signature,id);
    }
    const names=new Map();
    for(const item of explicitNames){
      const key=find(item.member),old=names.get(key);
      if(!old||item.id<old)names.set(key,item.id);
    }
    const groupId=value=>{
      const id=canonicalId(value),key=find(id);
      return names.get(key)||key;
    };
    const membersByGroup=new Map();
    for(const id of originalById.keys()){
      const key=groupId(id);
      if(!membersByGroup.has(key))membersByGroup.set(key,[]);
      membersByGroup.get(key).push(id);
    }
    const record=(value,progress={})=>{
      const ids=membersByGroup.get(groupId(value))||[canonicalId(value)];
      const priority={new:0,correct:1,retry:2};
      let latest,latestTime=-1;
      for(const id of ids){
        const row=progress?.[id];
        if(!row||!Object.hasOwn(priority,row.status))continue;
        const at=Number.isSafeInteger(row.at)&&row.at>=0?row.at:0;
        // Conflicting simultaneous records are treated as needing practice.
        if(!latest||at>latestTime||at===latestTime&&priority[row.status]>priority[latest.status]){
          latest=row;latestTime=at;
        }
      }
      return latest;
    };
    const projection=(progress={})=>{
      const result={...progress};
      for(const id of originalById.keys()){
        const row=record(id,progress);
        if(row)result[id]=row;
      }
      return result;
    };
    const unique=list=>{
      const seen=new Set();
      return (Array.isArray(list)?list:[]).filter(value=>{
        const key=groupId(value);if(seen.has(key))return false;seen.add(key);return true;
      });
    };
    const summary=list=>({total:Array.isArray(list)?list.length:0,unique:unique(list).length});
    return Object.freeze({entries,questionId:canonicalId,groupId,unique,summary,record,projection});
  }

  root.VV_OCCURRENCES=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
