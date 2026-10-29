(function(){
  'use strict';
  const paths={home:'m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7',learn:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15',bank:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',practice:'m4 16 11-11 4 4L8 20l-5 1zM13 7l4 4',exam:'M9 2h6M12 2v3M18 6l2-2M12 10v5l3 2M21 14a9 9 0 1 1-18 0 9 9 0 0 1 18 0',guide:'M19 3H5l7 9-7 9h14'};
  const svg=(p,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
  let initialized=false;
  function setup(){
    if(initialized)return;initialized=true;
    const side=document.querySelector('.sidebar'),menu=document.querySelector('#menuToggle');if(!side)return;
    const mq=matchMedia('(max-width:950px)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
    let collapsed=window.VV_STORAGE?.get('villanyvizsga-nav-collapsed')==='true';
    const fold=document.createElement('button');fold.type='button';fold.className='nav-fold';fold.setAttribute('aria-controls',side.id||'mainNav');
    if(!side.id)side.id='mainNav';fold.innerHTML=svg('m14 6-6 6 6 6');side.append(fold);
    side.querySelectorAll('.nav-link').forEach(link=>{
      const view=link.dataset.view||link.getAttribute('href')?.match(/#(learn|bank|practice|exam|guide)/)?.[1]||(/szamolas\.html/.test(link.getAttribute('href')||'')?'guide':'home'),label=link.textContent.replace(/\s+/g,' ').trim().replace(/[⌂◫▦✎◷∑]/g,'').trim();
      link.setAttribute('aria-label',label.replace(/\s+[–\d]+$/,''));link.setAttribute('title',link.getAttribute('aria-label'));
      const icon=link.querySelector('.nav-icon');if(icon)icon.innerHTML=svg(paths[view]||paths.home);
      for(const node of [...link.childNodes])if(node.nodeType===3&&node.textContent.trim()){const text=document.createElement('span');text.className='nav-name';text.textContent=node.textContent.trim();node.replaceWith(text)}
    });
    const brand=side.querySelector('.brand');brand?.lastElementChild?.classList.add('nav-brand-name');
    const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='nav-backdrop';backdrop.setAttribute('aria-label','Menü bezárása');backdrop.hidden=true;document.body.append(backdrop);
    const update=()=>{
      document.body.classList.toggle('nav-collapsed',collapsed&&!mq.matches);
      fold.setAttribute('aria-expanded',String(!collapsed));fold.setAttribute('aria-label',collapsed?'Oldalmenü kinyitása':'Oldalmenü összecsukása');fold.title=fold.getAttribute('aria-label');
      if(!mq.matches)closeMobile();
    };
    const closeMobile=()=>{side.classList.remove('open');backdrop.hidden=true;menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Menü megnyitása');document.querySelector('#main')?.removeAttribute('inert');side.removeAttribute('aria-modal');side.removeAttribute('role');if(mq.matches)side.inert=true;else side.inert=false};
    const openMobile=()=>{side.inert=false;side.classList.add('open');backdrop.hidden=false;menu?.setAttribute('aria-expanded','true');menu?.setAttribute('aria-label','Menü bezárása');document.querySelector('#main')?.setAttribute('inert','');side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');side.querySelector('.nav-link.active,.nav-link')?.focus()};
    fold.addEventListener('click',()=>{collapsed=!collapsed;window.VV_STORAGE?.set('villanyvizsga-nav-collapsed',String(collapsed));update()});
    window.addEventListener('vv-storage-change',event=>{if(event.detail.key==='villanyvizsga-nav-collapsed'&&event.detail.external){collapsed=window.VV_STORAGE?.get(event.detail.key)==='true';update()}});
    if(menu){menu.innerHTML=svg('M4 6h16M4 12h16M4 18h16');menu.setAttribute('aria-label','Menü megnyitása');menu.addEventListener('click',()=>side.classList.contains('open')?closeMobile():openMobile())}
    backdrop.addEventListener('click',()=>{closeMobile();menu?.focus()});
    side.addEventListener('click',e=>{if(e.target.closest('.nav-link,.brand')&&mq.matches)closeMobile()});
    side.addEventListener('keydown',e=>{if(!mq.matches||!side.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();closeMobile();menu?.focus()}if(e.key==='Tab'){const all=[...side.querySelectorAll('a,button')].filter(x=>x.getClientRects().length),first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
    mq.addEventListener('change',()=>{closeMobile();update()});update();if(mq.matches)closeMobile();
    window.addEventListener('hashchange',()=>{if(mq.matches)closeMobile()});
    // Guide pages are standalone and have no app initializer.
    if(motion.matches)document.body.classList.add('nav-reduced-motion');
  }
  window.VV_NAV=Object.freeze({setup,icon:view=>svg(paths[view]||paths.home)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
