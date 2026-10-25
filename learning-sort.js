(function () {
  'use strict';
  const mounted = new WeakSet();
  function mount(list, onReorder) {
    if (!list || mounted.has(list) || list.getAttribute('aria-disabled') === 'true') return;
    mounted.add(list);
    list.addEventListener('pointerdown', start);
    function start(event) {
      const handle = event.target.closest('[data-sort-handle]');
      if (!handle || !list.contains(handle) || handle.disabled || event.button !== 0 || document.documentElement.classList.contains('learning-sort-active')) return;
      event.preventDefault();
      const row = handle.closest('[data-order-id]'), original = [...list.children];
      if (!row) return;
      const box = row.getBoundingClientRect(), originY = event.clientY;
      const placeholder=document.createElement('li');placeholder.className='learn-sort-placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.style.height=box.height+'px';
      row.after(placeholder);row.style.width=box.width+'px';row.style.top=(box.top-list.getBoundingClientRect().top)+'px';row.classList.add('learn-sort-source');
      const ghost = document.createElement('ol'); ghost.className = 'learn-order learn-sort-ghost'; ghost.setAttribute('aria-hidden','true');
      const clone = row.cloneNode(true); clone.querySelectorAll('button').forEach(button => {button.tabIndex=-1; button.disabled=true;}); ghost.append(clone);
      ghost.style.cssText = `width:${box.width}px;left:${box.left}px;top:${box.top}px`;
      list.parentElement.append(ghost);
      let lastY = originY, moved = false, frame = 0, finished = false;
      row.classList.add('is-dragging'); document.documentElement.classList.add('learning-sort-active');
      handle.setPointerCapture(event.pointerId);
      const numberRows = () => [...list.children].filter(item=>item!==row).forEach((item,index) => {const number=item.querySelector('.learn-order-number');if(number)number.textContent=String(index+1);});
      const position = () => {
        if (!list.isConnected) { finish(true); return; }
        ghost.style.transform = `translateY(${lastY-originY}px)`;
        const others = [...list.children].filter(item=>item!==row&&item!==placeholder), target=others.find(item=>{const r=item.getBoundingClientRect();return lastY<r.top+r.height/2;}) || null;
        if (placeholder.nextElementSibling !== target) {list.insertBefore(placeholder,target);numberRows();}
      };
      const autoScroll = () => {
        if (finished) return;
        const listBox=list.getBoundingClientRect(), inside=lastY>=Math.max(0,listBox.top-60)&&lastY<=Math.min(innerHeight,listBox.bottom+60);
        if (moved&&inside) {const amount=lastY<70?-Math.ceil((70-lastY)/5):lastY>innerHeight-70?Math.ceil((lastY-innerHeight+70)/5):0;if(amount){scrollBy(0,amount);position();}}
        frame=requestAnimationFrame(autoScroll);
      };
      const move = e => {if(e.pointerId!==event.pointerId)return;e.preventDefault();lastY=e.clientY;moved=moved||Math.abs(lastY-originY)>5;if(moved)position();};
      const up = e => {if(e.pointerId===event.pointerId)finish(false);};
      const cancel = () => finish(true);
      const key = e => {if(e.key==='Escape'){e.preventDefault();finish(true);}};
      const hidden = () => {if(document.hidden)finish(true);};
      function finish(cancelled) {
        if(finished)return;finished=true;cancelAnimationFrame(frame);
        document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);
        if(handle.hasPointerCapture?.(event.pointerId))handle.releasePointerCapture(event.pointerId);
        const ids=[...list.children].filter(item=>item!==row).map(item=>Number(item===placeholder?row.dataset.orderId:item.dataset.orderId));
        ghost.remove();placeholder.remove();row.classList.remove('is-dragging','learn-sort-source');row.style.width='';row.style.top='';document.documentElement.classList.remove('learning-sort-active');
        if(cancelled){original.forEach(item=>list.append(item));[...list.children].forEach((item,index)=>{const n=item.querySelector('.learn-order-number');if(n)n.textContent=String(index+1);});return;}
        if(moved&&list.isConnected)onReorder(ids,Number(row.dataset.orderId));
      }
      document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',key);document.addEventListener('visibilitychange',hidden);frame=requestAnimationFrame(autoScroll);
    }
  }
  window.VVLearningSort={mount};
})();
