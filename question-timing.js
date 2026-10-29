(function () {
  'use strict';
  const MAX_MS=1200000,IDLE_MS=60000;
  const answerSelector='input[name="answer"],[data-numeric-index],#freeAnswer';
  const sessions=new WeakMap();
  const clock=()=>Math.max(0,globalThis.performance?.now?.()??Date.now());
  let current=null;
  function entry(session,id,create=true) {
    if(!session||typeof session!=='object'||!id)return null;
    let rows=sessions.get(session);if(!rows&&create){rows=new Map();sessions.set(session,rows);}
    if(rows&&!rows.has(id)&&create)rows.set(id,{activeMs:0,firstMs:undefined,hintUsed:false,solutionUsed:false,lastTick:clock(),lastAction:clock(),running:false,frozen:null});
    return rows?.get(id)||null;
  }
  function shown(root) {
    const modal=document.querySelector('dialog[open]');
    return !!root?.isConnected&&!!root.getClientRects().length&&document.visibilityState!=='hidden'&&(!document.hasFocus||document.hasFocus())&&(!modal||modal===root||modal.contains(root)||root.contains(modal));
  }
  function flush(row,at=clock()) {
    if(row.running&&!row.frozen)row.activeMs=Math.min(MAX_MS,row.activeMs+Math.max(0,Math.min(at,row.lastAction+IDLE_MS)-row.lastTick));
    row.lastTick=at;
  }
  function synchronize() {
    if(!current)return;
    const at=clock(),row=current.row,wasRunning=row.running;flush(row,at);row.running=!row.frozen&&shown(current.root);if(!wasRunning&&row.running)row.lastAction=at;
  }
  function pause() {if(current){flush(current.row);current.row.running=false;current=null;}}
  function bind(root,q,session,mode='practice') {
    const id=typeof q==='string'?q:q?.id,row=entry(session,id);if(!row)return;
    const same=current?.row===row;
    if(current)flush(current.row);
    if(current&&!same)current.row.running=false;
    current={root,row,session,id,mode};
    const at=clock();row.lastTick=at;
    if(!same)row.lastAction=at;
    row.running=!row.frozen&&shown(root);
  }
  function activity(event) {
    if(!current)return;
    if(!current.root?.contains(event.target)){if(['pointerdown','keydown','click'].includes(event.type))queueMicrotask(synchronize);return;}
    const row=current.row;if(row.frozen)return;
    const at=clock();flush(row,at);
    row.lastAction=at;row.running=shown(current.root);
    if(row.firstMs===undefined&&(event.type==='input'||event.type==='change')&&event.target.matches?.(answerSelector))row.firstMs=Math.round(row.activeMs);
  }
  function help(session,id,kind) {
    const row=entry(session,id);if(!row||row.frozen)return false;
    if(current?.row===row)flush(row);
    row[kind]=true;return true;
  }
  function finish(session,id) {
    const row=entry(session,id);if(!row)return Object.freeze({activeMs:0,firstMs:0,hintUsed:false,solutionUsed:false});
    if(row.frozen)return row.frozen;
    if(current?.row===row)flush(row);
    row.running=false;
    const activeMs=Math.round(Math.min(MAX_MS,Math.max(0,row.activeMs)));
    return row.frozen=Object.freeze({activeMs,firstMs:Math.min(activeMs,Math.round(row.firstMs??activeMs)),hintUsed:row.hintUsed,solutionUsed:row.solutionUsed});
  }
  function reset(session,id) {const row=entry(session,id,false);if(current?.row===row)pause();sessions.get(session)?.delete(id);}
  for(const type of ['pointerdown','keydown','click','input','change','wheel','scroll'])document.addEventListener(type,activity,{capture:true,passive:true});
  document.addEventListener('close',synchronize,true);
  document.addEventListener('visibilitychange',synchronize);
  window.addEventListener('blur',synchronize);window.addEventListener('focus',synchronize);
  window.addEventListener('hashchange',synchronize);
  window.addEventListener('pagehide',pause);window.addEventListener('vv-storage-restored',pause);window.addEventListener('vv-storage-clear',pause);
  window.VV_TIMING=Object.freeze({bind,hint:(session,id)=>help(session,id,'hintUsed'),solution:(session,id)=>help(session,id,'solutionUsed'),finish,reset,pause,isFinished:(session,id)=>!!entry(session,id,false)?.frozen});
})();
