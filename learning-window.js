(function () {
  'use strict';
  const VERSION = '20261026r1';
  const esc = value => String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  let dialog, frame, notice, returnTo, generation = 0;

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
    const styles = ['style.css','experience.css','learning.css','learning-visuals.css','learning-networks.css','learning-sort.css'];
    const scripts = ['readable-text.js','question-labels.js','learning-visuals.js','learning-networks.js','learning-sort.js','learning.js'];
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
          await child.VV_LEARN.setup({root:doc.querySelector('#learnView'),data:window.VV_LEARNING,questions:window.VV_DATA.questions});
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
            if (event.key !== 'Escape' || doc.querySelector('.learning-image-dialog[open]')) return;
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
    const link = event.target.closest('a[data-learning-window]');
    if (!link) return;
    event.preventDefault(); event.stopPropagation();
    open(link.href,link);
  },true);
  window.VV_LEARNING_WINDOW = Object.freeze({open,close});
})();
