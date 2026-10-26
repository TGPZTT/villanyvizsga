(function () {
  'use strict';
  const VERSION = '20261026r6';
  const esc = value => String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  let dialog, frame, notice, returnTo, generation = 0;
  let referenceDialog, referenceReturnTo;

  function enhanceImageDialog(container, picture) {
    if(picture.dataset.zoomEnhanced)return;
    picture.dataset.zoomEnhanced='true';
    const viewport=document.createElement('div');viewport.className='figure-zoom-viewport';viewport.tabIndex=0;
    viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Nagyítható ábra. Nagyítás után az ábra oldalra és lefelé mozgatható.');
    picture.before(viewport);viewport.append(picture);
    let toolbar=container.querySelector('.figure-lightbox-toolbar');
    if(!toolbar){toolbar=document.createElement('div');toolbar.className='figure-lightbox-toolbar';const closeButton=container.querySelector('button');if(closeButton)toolbar.append(closeButton);container.prepend(toolbar);}
    const controls=document.createElement('div');controls.className='figure-zoom-controls';
    controls.innerHTML='<button type="button" data-image-zoom="out" aria-label="Kicsinyítés">−</button><button type="button" data-image-zoom="fit">Alaphelyzet</button><button type="button" data-image-zoom="in" aria-label="Nagyítás">+</button>';
    toolbar.append(controls);container.classList.add('has-image-zoom');
    let scale=1,fitted=true,drag=null,dragged=false;
    const fit=()=>{if(!picture.naturalWidth)return;fitted=true;viewport.classList.remove('is-zoomed');picture.style.width='';picture.style.height='';viewport.scrollLeft=viewport.scrollTop=0;controls.querySelector('[data-image-zoom=fit]').setAttribute('aria-pressed','true');};
    const zoom=target=>{
      if(!picture.naturalWidth)return;
      const oldWidth=picture.getBoundingClientRect().width,oldHeight=picture.getBoundingClientRect().height;
      const cx=fitted ? .5 : (viewport.scrollLeft+viewport.clientWidth/2)/oldWidth;
      const cy=fitted ? .5 : (viewport.scrollTop+viewport.clientHeight/2)/oldHeight;
      scale=Math.max(.1,Math.min(3,target));fitted=false;viewport.classList.add('is-zoomed');
      picture.style.width=Math.round(picture.naturalWidth*scale)+'px';picture.style.height='auto';
      controls.querySelector('[data-image-zoom=fit]').setAttribute('aria-pressed','false');
      requestAnimationFrame(()=>{viewport.scrollLeft=Math.max(0,cx*picture.getBoundingClientRect().width-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,cy*picture.getBoundingClientRect().height-viewport.clientHeight/2);});
    };
    controls.addEventListener('click',event=>{const mode=event.target.closest('[data-image-zoom]')?.dataset.imageZoom;if(!mode)return;if(mode==='fit')fit();else zoom((fitted?picture.getBoundingClientRect().width/picture.naturalWidth:scale)*(mode==='in'?1.5:1/1.5));});
    picture.addEventListener('load',()=>{fit();const initialWidth=Number(picture.dataset.initialZoomWidth||0);if(container.open&&initialWidth>picture.getBoundingClientRect().width+1)zoom(initialWidth/picture.naturalWidth);});picture.addEventListener('dragstart',event=>event.preventDefault());
    picture.addEventListener('dblclick',()=>fitted?zoom(1):fit());
    viewport.addEventListener('pointerdown',event=>{dragged=false;if(fitted||event.pointerType==='touch'||event.button!==0)return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);event.preventDefault();});
    viewport.addEventListener('pointermove',event=>{if(drag){if(Math.hypot(drag.x-event.clientX,drag.y-event.clientY)>4)dragged=true;viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;}});
    const endDrag=()=>{drag=null;};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
    container.addEventListener('click',event=>{if(dragged){dragged=false;return;}if(event.target===container||event.target===viewport)container.close();});
    container.addEventListener('close',fit);
    if(picture.complete&&picture.naturalWidth)fit();
  }

  function referenceMarkup(reference) {
    return `<p class="learning-reference-intro">${esc(reference.intro || '')}</p>${(reference.sections || []).map(section => `<section class="learning-reference-section"><h3>${esc(section.title)}</h3>${(section.paragraphs || []).map(value=>`<p>${esc(value)}</p>`).join('')}${section.headers?.length ? `<div class="learning-reference-table${section.headers.length>2?' is-multicol':''}" tabindex="0" role="region" aria-label="${esc(section.title)}"><table><thead><tr>${section.headers.map(value=>`<th scope="col">${esc(value)}</th>`).join('')}</tr></thead><tbody>${(section.rows || []).map(row=>`<tr>${row.map((value,index)=>index===0?`<th scope="row"><span class="learn-mobile-column" aria-hidden="true">${esc(section.headers[0]||'')}</span><span class="learn-cell-value">${esc(value)}</span></th>`:`<td><span class="learn-mobile-column" aria-hidden="true">${esc(section.headers[index]||'')}</span><span class="learn-cell-value">${esc(value)}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}${(section.notes || []).map(value=>`<p class="learning-reference-note">${esc(value)}</p>`).join('')}</section>`).join('')}`;
  }

  async function openReference(href, trigger) {
    const route = new URL(href,location.href).hash;
    if (!route.startsWith('#reference/')) return;
    if (!window.VV_LEARNING) await window.VV_LEARN?.setup({root:document.querySelector('#learnView')});
    let id;
    try { id = decodeURIComponent(route.slice('#reference/'.length)); } catch { return; }
    const reference = window.VV_LEARNING?.referenceTables?.[id];
    if (!reference) return;
    if (!referenceDialog) {
      referenceDialog = document.createElement('dialog');
      referenceDialog.className = 'learning-reference-dialog';
      referenceDialog.setAttribute('aria-labelledby','learningReferenceTitle');
      referenceDialog.innerHTML = '<header class="learning-window-header"><h2 id="learningReferenceTitle"></h2><button type="button" class="button outline" autofocus>Bezárás ×</button></header><div class="learning-reference-body"></div>';
      document.body.append(referenceDialog);
      referenceDialog.querySelector('button').addEventListener('click',()=>referenceDialog.close());
      referenceDialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
      referenceDialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();referenceDialog.close();});
      referenceDialog.addEventListener('close',()=>{referenceReturnTo?.isConnected&&referenceReturnTo.focus({preventScroll:true});});
      referenceDialog.addEventListener('click',event=>{
        const box=referenceDialog.getBoundingClientRect();
        if(event.target===referenceDialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))referenceDialog.close();
      });
    }
    referenceReturnTo = trigger || document.activeElement;
    referenceDialog.dataset.referenceId = id;
    referenceDialog.querySelector('h2').textContent = reference.title;
    referenceDialog.querySelector('.learning-reference-body').innerHTML = referenceMarkup(reference);
    if(!referenceDialog.open)referenceDialog.showModal();
    referenceDialog.querySelector('.learning-reference-body').scrollTop=0;
  }

  function close() { dialog?.close(); }
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'learning-dialog';
    dialog.setAttribute('aria-labelledby', 'learningWindowTitle');
    dialog.innerHTML = '<header class="learning-window-header"><h2 id="learningWindowTitle">Tananyag</h2><button type="button" class="button outline" data-learning-close autofocus>Bezárás ×</button></header><p class="learning-window-notice" role="status">Tananyag betöltése…</p><iframe class="learning-window-frame" title="Kapcsolódó tananyag" hidden></iframe>';
    document.body.append(dialog);
    frame = dialog.querySelector('iframe');
    notice = dialog.querySelector('[role=status]');
    dialog.querySelector('[data-learning-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
    });
    dialog.addEventListener('close', () => {
      generation++;
      frame.srcdoc = '';
      frame.hidden = true;
      returnTo?.isConnected && returnTo.focus({preventScroll:true});
    });
  }

  function childDocument() {
    const base = new URL('.', location.href).href;
    const styles = ['style.css','experience.css','learning.css','learning-visuals.css','learning-networks.css','learning-sort.css','formula-diagram.css','learning-labs.css','learning-comparisons.css','learning-spd.css'];
    const scripts = ['readable-text.js','question-labels.js','formula-diagram.js','learning-labs.js','learning-comparisons.js','learning-spd.js','learning-visuals.js','learning-networks.js','learning-sort.js','learning.js','learning-window.js'];
    return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${esc(base)}">${styles.map(file=>`<link rel="stylesheet" href="${esc(file)}?v=${VERSION}">`).join('')}${scripts.map(file=>`<script defer src="${esc(file)}?v=${VERSION}"></script>`).join('')}<style>
      html,body{margin:0;background:#f5f7f8;min-width:0}body{padding:12px}#learnView{display:block}
      .learn-workspace{display:block!important}.learn-rail{display:none!important}.learn-lesson{margin:0!important}
      #learnView .learn-tabs [data-learn-tab=questions],.learn-guide-link,.learn-check-practice{display:none!important}
      .learn-lesson-header{padding-top:15px!important}.learn-lesson-header h1{font-size:27px!important}
      .learning-image-dialog{max-width:96vw;max-height:94dvh;padding:10px;border:1px solid #b7c8c5;border-radius:10px;background:white}
      .learning-image-dialog::backdrop{background:#102a32b3}.learning-image-dialog img{display:block;max-width:90vw;max-height:78dvh;object-fit:contain}
      .learning-image-dialog button{display:block;margin:0 0 8px auto;min-height:40px;padding:7px 12px;font:inherit}
      @media(max-width:600px){body{padding:5px}.learn-lesson-header h1{font-size:25px!important}}
    </style></head><body><section id="learnView" class="view active" aria-label="Tananyag"></section></body></html>`;
  }

  async function open(href, trigger) {
    const route = new URL(href, location.href).hash;
    if (!/^#learn(?:\/|$)/.test(route)) return;
    ensureDialog();
    const request = ++generation;
    returnTo = trigger || document.activeElement;
    notice.hidden = false;
    notice.textContent = 'Tananyag betöltése…';
    frame.hidden = true;
    if (!dialog.open) dialog.showModal();
    try {
      if (!window.VV_LEARNING) await window.VV_LEARN?.setup({root:document.querySelector('#learnView')});
      if (!window.VV_LEARNING) throw new Error('unavailable');
      if (request !== generation || !dialog.open) return;
      frame.onload = async () => {
        if (request !== generation || !dialog.open) return;
        try {
          const child = frame.contentWindow, doc = frame.contentDocument;
          if (!child.VV_LEARN) throw new Error('runtime');
          child.VV_DATA = window.VV_DATA;
          child.VV_LEARNING = window.VV_LEARNING;
          child.VV_ASSETS = window.VV_ASSETS;
          child.VV_LABELS?.setup(window.VV_DATA);
          child.location.hash = route;
          // A srcdoc document may only change its own fragment. Relative URLs
          // otherwise resolve through <base> to the main page, which is forbidden.
          for (const method of ['replaceState','pushState']) {
            const native = child.history[method].bind(child.history);
            child.history[method] = (state,unused,url) => {
              const hash = url == null ? null : new URL(String(url),doc.baseURI).hash;
              const target = hash?.startsWith('#learn') ? child.location.href.split('#')[0] + hash : url;
              return native(state,unused,target);
            };
          }
          await child.VV_LEARN.setup({root:doc.querySelector('#learnView'),data:window.VV_LEARNING,questions:window.VV_DATA.questions.filter(q=>!q.generated?.machineGenerated||q.generated.formRevision==='concise-r5')});
          child.addEventListener('hashchange', () => {
            if (/^#learn(?:\/|$)/.test(child.location.hash)) { child.VV_LEARN.renderRoute(child.location.hash); child.scrollTo(0,0); }
          });
          doc.addEventListener('click', async event => {
            const zoom = event.target.closest('[data-zoom-asset]');
            if (zoom) {
              event.preventDefault();
              const imageDialog = doc.createElement('dialog');
              imageDialog.className = 'learning-image-dialog';
              const button = doc.createElement('button'); button.textContent = 'Bezárás ×'; button.type = 'button';
              const image = doc.createElement('img'); image.alt = zoom.dataset.zoomCaption || 'Ábra nagyítása';
              imageDialog.append(button,image); doc.body.append(imageDialog);
              child.VV_LEARNING_WINDOW.enhanceImageDialog(imageDialog,image);
              button.addEventListener('click',()=>imageDialog.close());
              imageDialog.addEventListener('close',()=>{imageDialog.remove();zoom.focus({preventScroll:true});});
              imageDialog.showModal();
              try { image.src = await child.VV_ASSETS.getURL(zoom.dataset.zoomAsset); }
              catch { image.alt = 'Az ábra nem tölthető be.'; }
              return;
            }
            const anchor = event.target.closest('a');
            const hash = anchor?.getAttribute('href');
            if (hash?.startsWith('#')) {
              event.preventDefault();
              if (/^#learn(?:\/|$)/.test(hash)) {
                if (child.location.hash === hash) child.VV_LEARN.renderRoute(hash);
                else child.location.hash = hash;
              }
            }
          },true);
          doc.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || doc.querySelector('.learning-image-dialog[open],.learning-reference-dialog[open]')) return;
            const tip = doc.querySelector('.learn-floating-tooltip:not([hidden])');
            if (tip) return;
            event.preventDefault(); event.stopPropagation(); close();
          },true);
          if (request !== generation || !dialog.open) return;
          notice.hidden = true;
          frame.hidden = false;
          child.requestAnimationFrame(()=>{
            child.dispatchEvent(new child.Event('resize'));
            const heading = doc.querySelector('h1');
            heading?.setAttribute('tabindex','-1'); heading?.focus({preventScroll:true});
          });
        } catch {
          notice.textContent = 'A tananyag most nem tölthető be. Zárd be az ablakot, majd próbáld újra.';
        }
      };
      frame.srcdoc = childDocument();
    } catch {
      notice.textContent = 'A tananyag most nem tölthető be. Zárd be az ablakot, majd próbáld újra.';
    }
  }

  document.addEventListener('click', event => {
    const reference = event.target.closest('a[data-reference-window]');
    if(reference){event.preventDefault();event.stopPropagation();openReference(reference.href,reference);return;}
    const link = event.target.closest('a[data-learning-window]');
    if (!link) return;
    event.preventDefault(); event.stopPropagation();
    open(link.href,link);
  },true);
  window.VV_LEARNING_WINDOW = Object.freeze({open,close,openReference,enhanceImageDialog});
})();
