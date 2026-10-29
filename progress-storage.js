(function () {
  'use strict';
  const CHOICE_KEY = 'villanyvizsga-storage-choice-v1';
  const PROGRESS_KEYS = Object.freeze(['villanyvizsga-progress-v1', 'villanyvizsga-learning-v1', 'villanyvizsga-exam-history-v1', 'villanyvizsga-exam-exposure-v1']);
  const NAV_KEY = 'villanyvizsga-nav-collapsed';
  const keys = new Set([...PROGRESS_KEYS, NAV_KEY]);
  const memory = new Map(), dirty = new Set();
  let decision = 'pending', available = true, choiceRaw = null, clearing = false;
  let dialog, footer, status, message, confirmBox, returnTo, firstVisit = false, observer;
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, {detail}));
  const read = key => { try { return localStorage.getItem(key); } catch { if (available) failure(); return null; } };
  const parseChoice = value => {
    try { const row = JSON.parse(value); return row?.version === 1 && typeof row.enabled === 'boolean' ? (row.enabled ? 'enabled' : 'disabled') : 'pending'; } catch { return 'pending'; }
  };
  const validProgress = (key, value) => {
    try {
      const row = JSON.parse(value);
      if (!row || typeof row !== 'object') return false;
      if (key === PROGRESS_KEYS[0]) return !Array.isArray(row) && Object.values(row).some(item => item && ['correct', 'retry'].includes(item.status));
      if (key === PROGRESS_KEYS[1]) return !Array.isArray(row) && (Object.keys(row.read || {}).length > 0 || Object.keys(row.checks || {}).length > 0 || typeof row.lastLesson === 'string' && !!row.lastLesson);
      if (key === PROGRESS_KEYS[2]) return Array.isArray(row) && row.some(item => item && Array.isArray(item.ids) && item.ids.length);
      return Number.isSafeInteger(row.runs) && row.runs > 0 && row.byId && typeof row.byId === 'object';
    } catch { return false; }
  };
  choiceRaw = read(CHOICE_KEY);
  decision = parseChoice(choiceRaw);
  for (const key of keys) { const value = read(key); if (value !== null) memory.set(key, value); }
  const hasLegacy = decision === 'pending' && PROGRESS_KEYS.some(key => validProgress(key, memory.get(key)));
  const allowed = () => available && decision === 'enabled';
  function failure() {
    available = false;
    updateUI();
    emit('vv-storage-consent', {decision, allowed:false, reason:'unavailable'});
  }
  function persist(key, value) {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); return true; } catch { failure(); return false; }
  }
  function syncPermission() {
    const raw = read(CHOICE_KEY);
    if (raw !== choiceRaw) applyChoice(raw, true);
  }
  function applyChoice(raw, external) {
    choiceRaw = raw;
    decision = parseChoice(raw);
    updateUI();
    emit('vv-storage-consent', {decision, allowed:allowed(), external, reason:'choice'});
    if (decision !== 'pending' && firstVisit) closeDialog();
  }
  function get(key) { return keys.has(key) ? memory.get(key) ?? null : null; }
  function set(key, value) {
    if (!keys.has(key) || clearing) return false;
    value = String(value);
    memory.set(key, value); dirty.add(key);
    syncPermission();
    const saved = allowed() && persist(key, value);
    if (saved) dirty.delete(key);
    emit('vv-storage-change', {key, value, external:false, reason:'set', persisted:!!saved});
    return !!saved;
  }
  function remove(key) {
    if (!keys.has(key) || clearing) return false;
    memory.delete(key); dirty.add(key);
    syncPermission();
    const saved = allowed() && persist(key, null);
    if (saved) dirty.delete(key);
    emit('vv-storage-change', {key, value:null, external:false, reason:'remove', persisted:!!saved});
    return !!saved;
  }
  function flush() {
    syncPermission();
    if (!allowed()) return;
    for (const key of [...dirty]) {
      syncPermission();
      if (!allowed() || !persist(key, memory.get(key) ?? null)) break;
      dirty.delete(key);
    }
  }
  function choose(enabled) {
    if (typeof enabled !== 'boolean') return false;
    if (enabled) emit('vv-storage-before-enable', {});
    const raw = JSON.stringify({version:1, enabled});
    // Only an explicit choice creates this key. Existing progress is never a consent signal.
    available = true;
    decision = enabled ? 'enabled' : 'disabled';
    choiceRaw = raw;
    const saved = persist(CHOICE_KEY, raw);
    if (enabled && saved) flush();
    updateUI();
    emit('vv-storage-consent', {decision, allowed:allowed(), external:false, reason:'choice'});
    return saved;
  }
  function clearProgress() {
    clearing = true;
    let removed = true;
    for (const key of PROGRESS_KEYS) {
      memory.delete(key); dirty.delete(key);
      if (!persist(key, null)) removed = false;
    }
    // Reset live lesson/quiz drafts while writes are suppressed, so deleted data cannot reappear.
    emit('vv-storage-clear', {external:false, complete:removed});
    clearing = false;
    updateUI();
    return removed;
  }
  window.addEventListener('storage', event => {
    try { if (event.storageArea && event.storageArea !== localStorage) return; } catch { failure(); return; }
    if (event.key === CHOICE_KEY || event.key === null) {
      const wasAllowed = allowed();
      applyChoice(event.key === null ? read(CHOICE_KEY) : event.newValue, true);
      // Preserve changes made in this window while saving was off. Never reload an older snapshot on enabling.
      if (!wasAllowed && allowed()) { emit('vv-storage-before-enable', {}); flush(); }
    }
    if (event.key === null || PROGRESS_KEYS.includes(event.key) && event.newValue === null) {
      clearing = true;
      for (const key of PROGRESS_KEYS) { memory.delete(key); dirty.delete(key); }
      emit('vv-storage-clear', {external:true, complete:true});
      clearing = false;
      if (event.key === null) memory.delete(NAV_KEY);
      return;
    }
    if (!keys.has(event.key) || dirty.has(event.key)) return;
    if (event.newValue === null) memory.delete(event.key); else memory.set(event.key, event.newValue);
    emit('vv-storage-change', {key:event.key, value:event.newValue, external:true, reason:'storage'});
  });

  const savedArt = "<svg class=\"vv-storage-card-art\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 170\" fill=\"none\"><title id=\"saved-title\">A tanulási haladás megmarad ezen a gépen</title><defs><linearGradient id=\"saved-case\" x1=\"42\" y1=\"23\" x2=\"183\" y2=\"128\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#557fb9\"/><stop offset=\"1\" stop-color=\"#294a7c\"/></linearGradient><linearGradient id=\"saved-screen\" x1=\"0\" y1=\"0\" x2=\"115\" y2=\"70\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#ffffff\"/><stop offset=\"1\" stop-color=\"#eaf2ff\"/></linearGradient><linearGradient id=\"saved-paper\" x1=\"34\" y1=\"16\" x2=\"116\" y2=\"64\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#ffffff\"/><stop offset=\"1\" stop-color=\"#f7f9fd\"/></linearGradient><radialGradient id=\"saved-shadow\"><stop stop-color=\"#244571\" stop-opacity=\".2\"/><stop offset=\".7\" stop-color=\"#244571\" stop-opacity=\".07\"/><stop offset=\"1\" stop-color=\"#244571\" stop-opacity=\"0\"/></radialGradient><clipPath id=\"saved-screen-clip\"><rect width=\"126\" height=\"70\" rx=\"1.4\"/></clipPath></defs><ellipse cx=\"128\" cy=\"151\" rx=\"101\" ry=\"14\" fill=\"url(#saved-shadow)\"/><path d=\"m87 143 30-13 37 5.5-30 13Z\" fill=\"#8fb1e4\" stroke=\"#557fb9\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m87 143 37 5.5v4l-37-5.5Z\" fill=\"#557fb9\"/><path d=\"m124 148.5 30-13v4l-30 13Z\" fill=\"#294a7c\"/><path d=\"m92 142.5 32 4.8 24-10.4\" stroke=\"#ffffff\" stroke-opacity=\".45\" stroke-width=\".9\" stroke-linecap=\"round\"/><path d=\"m110 112 15 2v27l-15-2Z\" fill=\"#557fb9\" stroke=\"#294a7c\" stroke-width=\".7\"/><path d=\"m125 114 7-4v27l-7 4Z\" fill=\"#203c66\"/><path d=\"M113 120v14\" stroke=\"#8fb1e4\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"m42 18 10-6 141 21-10 6Z\" fill=\"#8fb1e4\" stroke=\"#557fb9\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m183 39 10-6v88l-10 6Z\" fill=\"#203c66\" stroke=\"#294a7c\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m42 18 141 21v88L42 106Z\" fill=\"url(#saved-case)\" stroke=\"#294a7c\" stroke-width=\"1.1\" stroke-linejoin=\"round\"/><path d=\"m44 20 137 20.4\" stroke=\"#ffffff\" stroke-opacity=\".48\" stroke-width=\".9\" stroke-linecap=\"round\"/><g transform=\"matrix(1 .14893617 0 1 50 27)\"><rect x=\"-1\" y=\"-1\" width=\"128\" height=\"72\" rx=\"2\" fill=\"#203c66\"/><g clip-path=\"url(#saved-screen-clip)\"><rect width=\"126\" height=\"70\" fill=\"url(#saved-screen)\"/><path d=\"M0 0h126v10H0Z\" fill=\"#eaf2ff\"/><circle cx=\"5\" cy=\"5\" r=\"1.3\" fill=\"#2569c9\" opacity=\".75\"/><circle cx=\"10\" cy=\"5\" r=\"1.3\" fill=\"#8fb1e4\"/><circle cx=\"15\" cy=\"5\" r=\"1.3\" fill=\"#b8cfee\"/><path d=\"M27 4.7h43\" stroke=\"#b8cfee\" stroke-width=\"2\" stroke-linecap=\"round\"/><path d=\"M0 10h24v60H0Z\" fill=\"#294a7c\"/><path d=\"M5 19q3-2 7 0 4-2 7 0v11q-3-2-7 0-4-2-7 0Z\" fill=\"#ffffff\" fill-opacity=\".94\"/><path d=\"M12 19v11\" stroke=\"#8fb1e4\" stroke-width=\".8\"/><path d=\"M6 38h12M6 43h9M6 53h12\" stroke=\"#8fb1e4\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><rect x=\"4\" y=\"59\" width=\"16\" height=\"4\" rx=\"1\" fill=\"#557fb9\"/><path d=\"M35 16h81v47H35Z\" fill=\"#b8cfee\" opacity=\".6\"/><path d=\"M33 14h75l6 6v41H33Z\" fill=\"url(#saved-paper)\" stroke=\"#b8cfee\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"M108 14v6h6\" fill=\"#eaf2ff\" stroke=\"#b8cfee\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"M97 14h7v15l-3.5-2.6L97 29Z\" fill=\"#2569c9\" opacity=\"1\"/><path d=\"M41 22h44\" stroke=\"#355b92\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><path d=\"M41 26h29\" stroke=\"#b8cfee\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><rect x=\"40\" y=\"32\" width=\"8\" height=\"8\" rx=\"1.5\" fill=\"#eaf2ff\" stroke=\"#b8cfee\" stroke-width=\".9\"/><rect x=\"40\" y=\"45\" width=\"8\" height=\"8\" rx=\"1.5\" fill=\"#eaf2ff\" stroke=\"#b8cfee\" stroke-width=\".9\"/><path d=\"m42 35.6 1.8 1.9 3-4\" stroke=\"#2569c9\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"1\"/><path d=\"m42 48.6 1.8 1.9 3-4\" stroke=\"#2569c9\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"1\"/><path d=\"M55 34h42M55 38h32M55 47h36M55 51h42\" stroke=\"#b7cbe5\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M40 57h7M55 57h24\" stroke=\"#b8cfee\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><g stroke=\"#b8cfee\" stroke-width=\".7\"><rect x=\"40\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#2569c9\" opacity=\"1\"/><rect x=\"53\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#2569c9\" opacity=\"1\"/><rect x=\"66\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ffffff\"/><rect x=\"79\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ffffff\"/><rect x=\"92\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ffffff\"/></g><path d=\"M116 5h6\" stroke=\"#b8cfee\" stroke-width=\"1.2\" stroke-linecap=\"round\"/></g></g><path d=\"m99 110.5 18 2.7\" stroke=\"#8fb1e4\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><circle cx=\"173\" cy=\"119.5\" r=\"1.5\" fill=\"#c9e6ff\"/><path d=\"m187 100 2-1.2m-2 5.2 2-1.2m-2 5.2 2-1.2\" stroke=\"#557fb9\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M146 141c15 5 16-3 30 1\" stroke=\"#5275a3\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"m176 135 9-4 37 7-9 4Z\" fill=\"#eaf2ff\" stroke=\"#8fb1e4\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m176 135 37 7v12l-37-7Z\" fill=\"#557fb9\" stroke=\"#294a7c\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m213 142 9-4v12l-9 4Z\" fill=\"#294a7c\"/><path d=\"m182 142 21 4\" stroke=\"#203c66\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"207\" cy=\"147.2\" r=\"1.3\" fill=\"#ffffff\" fill-opacity=\".9\"/><g aria-hidden=\"true\"><path d=\"M190 68h7\" stroke=\"#294a7c\" stroke-width=\"3\"/><circle cx=\"203\" cy=\"71\" r=\"17.3\" fill=\"white\" stroke=\"#b8cfee\" stroke-width=\"1.2\"/><path d=\"M212.5 68.3a10.2 10.2 0 1 0-3.2 10.8\" fill=\"none\" stroke=\"#2569c9\" stroke-width=\"2.8\" stroke-linecap=\"round\"/><path d=\"m212.5 61.8.6 7.5-7.4-1.7\" fill=\"none\" stroke=\"#2569c9\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g></svg>";
  const temporaryArt = "<svg class=\"vv-storage-card-art\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 170\" fill=\"none\"><title id=\"temporary-title\">A tananyag megmarad, a jelölések csak most láthatók</title><defs><linearGradient id=\"temporary-case\" x1=\"42\" y1=\"23\" x2=\"183\" y2=\"128\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#b68594\"/><stop offset=\"1\" stop-color=\"#865163\"/></linearGradient><linearGradient id=\"temporary-screen\" x1=\"0\" y1=\"0\" x2=\"115\" y2=\"70\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#ffffff\"/><stop offset=\"1\" stop-color=\"#fbf0f2\"/></linearGradient><linearGradient id=\"temporary-paper\" x1=\"34\" y1=\"16\" x2=\"116\" y2=\"64\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#ffffff\"/><stop offset=\"1\" stop-color=\"#f7f9fd\"/></linearGradient><radialGradient id=\"temporary-shadow\"><stop stop-color=\"#7a4e5d\" stop-opacity=\".2\"/><stop offset=\".7\" stop-color=\"#7a4e5d\" stop-opacity=\".07\"/><stop offset=\"1\" stop-color=\"#7a4e5d\" stop-opacity=\"0\"/></radialGradient><clipPath id=\"temporary-screen-clip\"><rect width=\"126\" height=\"70\" rx=\"1.4\"/></clipPath></defs><ellipse cx=\"128\" cy=\"151\" rx=\"101\" ry=\"14\" fill=\"url(#temporary-shadow)\"/><path d=\"m87 143 30-13 37 5.5-30 13Z\" fill=\"#d8b3bd\" stroke=\"#b68594\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m87 143 37 5.5v4l-37-5.5Z\" fill=\"#b68594\"/><path d=\"m124 148.5 30-13v4l-30 13Z\" fill=\"#865163\"/><path d=\"m92 142.5 32 4.8 24-10.4\" stroke=\"#ffffff\" stroke-opacity=\".45\" stroke-width=\".9\" stroke-linecap=\"round\"/><path d=\"m110 112 15 2v27l-15-2Z\" fill=\"#b68594\" stroke=\"#865163\" stroke-width=\".7\"/><path d=\"m125 114 7-4v27l-7 4Z\" fill=\"#694252\"/><path d=\"M113 120v14\" stroke=\"#d8b3bd\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"m42 18 10-6 141 21-10 6Z\" fill=\"#d8b3bd\" stroke=\"#b68594\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m183 39 10-6v88l-10 6Z\" fill=\"#694252\" stroke=\"#865163\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m42 18 141 21v88L42 106Z\" fill=\"url(#temporary-case)\" stroke=\"#865163\" stroke-width=\"1.1\" stroke-linejoin=\"round\"/><path d=\"m44 20 137 20.4\" stroke=\"#ffffff\" stroke-opacity=\".48\" stroke-width=\".9\" stroke-linecap=\"round\"/><g transform=\"matrix(1 .14893617 0 1 50 27)\"><rect x=\"-1\" y=\"-1\" width=\"128\" height=\"72\" rx=\"2\" fill=\"#694252\"/><g clip-path=\"url(#temporary-screen-clip)\"><rect width=\"126\" height=\"70\" fill=\"url(#temporary-screen)\"/><path d=\"M0 0h126v10H0Z\" fill=\"#fbf0f2\"/><circle cx=\"5\" cy=\"5\" r=\"1.3\" fill=\"#ba697a\" opacity=\".75\"/><circle cx=\"10\" cy=\"5\" r=\"1.3\" fill=\"#d8b3bd\"/><circle cx=\"15\" cy=\"5\" r=\"1.3\" fill=\"#e4c9d1\"/><path d=\"M27 4.7h43\" stroke=\"#e4c9d1\" stroke-width=\"2\" stroke-linecap=\"round\"/><path d=\"M0 10h24v60H0Z\" fill=\"#865163\"/><path d=\"M5 19q3-2 7 0 4-2 7 0v11q-3-2-7 0-4-2-7 0Z\" fill=\"#ffffff\" fill-opacity=\".94\"/><path d=\"M12 19v11\" stroke=\"#d8b3bd\" stroke-width=\".8\"/><path d=\"M6 38h12M6 43h9M6 53h12\" stroke=\"#d8b3bd\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><rect x=\"4\" y=\"59\" width=\"16\" height=\"4\" rx=\"1\" fill=\"#b68594\"/><path d=\"M35 16h81v47H35Z\" fill=\"#e4c9d1\" opacity=\".6\"/><path d=\"M33 14h75l6 6v41H33Z\" fill=\"url(#temporary-paper)\" stroke=\"#e4c9d1\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"M108 14v6h6\" fill=\"#fbf0f2\" stroke=\"#e4c9d1\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"M97 14h7v15l-3.5-2.6L97 29Z\" fill=\"#ba697a\" opacity=\".32\"/><path d=\"M41 22h44\" stroke=\"#925f6f\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><path d=\"M41 26h29\" stroke=\"#e4c9d1\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><rect x=\"40\" y=\"32\" width=\"8\" height=\"8\" rx=\"1.5\" fill=\"#fbf0f2\" stroke=\"#e4c9d1\" stroke-width=\".9\"/><rect x=\"40\" y=\"45\" width=\"8\" height=\"8\" rx=\"1.5\" fill=\"#fbf0f2\" stroke=\"#e4c9d1\" stroke-width=\".9\"/><path d=\"m42 35.6 1.8 1.9 3-4\" stroke=\"#ba697a\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".35\"/><path d=\"m42 48.6 1.8 1.9 3-4\" stroke=\"#ba697a\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".16\"/><path d=\"M55 34h42M55 38h32M55 47h36M55 51h42\" stroke=\"#ddc4cc\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M40 57h7M55 57h24\" stroke=\"#e4c9d1\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><g stroke=\"#e4c9d1\" stroke-width=\".7\"><rect x=\"40\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ba697a\" opacity=\".35\"/><rect x=\"53\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ba697a\" opacity=\".16\"/><rect x=\"66\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ffffff\"/><rect x=\"79\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ffffff\"/><rect x=\"92\" y=\"65\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#ffffff\"/></g><path d=\"m117 3 4 4m0-4-4 4\" stroke=\"#925f6f\" stroke-width=\"1.2\" stroke-linecap=\"round\"/></g></g><path d=\"m99 110.5 18 2.7\" stroke=\"#d8b3bd\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><circle cx=\"173\" cy=\"119.5\" r=\"1.5\" fill=\"#f1d9e0\"/><path d=\"m187 100 2-1.2m-2 5.2 2-1.2m-2 5.2 2-1.2\" stroke=\"#b68594\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M146 141c15 5 16-3 30 1\" stroke=\"#a76f81\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"m176 135 9-4 37 7-9 4Z\" fill=\"#fbf0f2\" stroke=\"#d8b3bd\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m176 135 37 7v12l-37-7Z\" fill=\"#b68594\" stroke=\"#865163\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"m213 142 9-4v12l-9 4Z\" fill=\"#865163\"/><path d=\"m182 142 21 4\" stroke=\"#694252\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"207\" cy=\"147.2\" r=\"1.3\" fill=\"#ffffff\" fill-opacity=\".9\"/><g aria-hidden=\"true\"><path d=\"M190 68h6\" stroke=\"#865163\" stroke-width=\"2.6\"/><rect x=\"189\" y=\"56\" width=\"32\" height=\"29\" rx=\"7\" fill=\"#fffafb\" stroke=\"#e4c9d1\" stroke-width=\"1.2\"/><rect x=\"195\" y=\"62\" width=\"20\" height=\"16\" rx=\"1.7\" fill=\"white\" stroke=\"#925f6f\" stroke-width=\"1.1\"/><path d=\"M195 67h20\" stroke=\"#e4c9d1\" stroke-width=\"1.1\"/><path d=\"m208 63.5 3 2.5m0-2.5-3 2.5\" stroke=\"#ba697a\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M199 71h11m-11 3h7\" stroke=\"#ddc4cc\" stroke-width=\"1.1\" stroke-linecap=\"round\"/></g></svg>";
  function stateText() {
    if (!available) return 'A böngésző most nem engedi a mentést. A haladás csak erre a megnyitásra marad meg.';
    if (decision === 'enabled') return 'A mentés be van kapcsolva.';
    if (decision === 'disabled') return 'A mentés ki van kapcsolva.';
    return 'A mentésről még nem döntöttél.';
  }
  function updateUI() {
    if (status) { status.textContent = !available ? 'Mentés nem elérhető' : allowed() ? 'Haladás mentése bekapcsolva' : 'Haladás csak erre a megnyitásra'; status.dataset.saving = String(allowed()); }
    if (message) {
      message.textContent = !available || !firstVisit ? stateText() : hasLegacy ? 'Korábbi mentéseid megmaradnak.' : '';
      message.hidden = !message.textContent || !!dialog && dialog.dataset.screen !== 'main';
      message.dataset.error = String(!available);
    }
    if (dialog) {
      const enable = dialog.querySelector('[data-storage-enable]'), disable = dialog.querySelector('[data-storage-disable]');
      enable.setAttribute('aria-pressed', String(allowed()));
      disable.setAttribute('aria-pressed', String(decision === 'disabled'));
    }
  }
  function closeDialog() {
    if (!dialog?.open) return;
    dialog.close();
    returnTo?.isConnected && returnTo.focus({preventScroll:true});
  }
  function ensureUI() {
    if (dialog || !document.body) return;
    footer = document.createElement('div'); footer.className = 'vv-storage-footer';
    const settings = document.createElement('button'); settings.type = 'button'; settings.className = 'vv-storage-settings'; settings.textContent = 'Mentési beállítások';
    settings.setAttribute('aria-haspopup', 'dialog'); settings.addEventListener('click', () => openSettings());
    status = document.createElement('span'); status.className = 'vv-storage-status'; status.setAttribute('role', 'status');
    footer.append(settings, status);
    const main = document.querySelector('#main, main');
    if (document.querySelector('.main-column')) document.querySelector('.main-column').append(footer);
    else if (main) main.append(footer);
    else document.body.append(footer);
    dialog = document.createElement('dialog'); dialog.className = 'vv-storage-dialog'; dialog.id = 'vvStorageDialog';
    dialog.setAttribute('aria-labelledby', 'vvStorageTitle'); dialog.setAttribute('aria-describedby', 'vvStorageIntro');
    dialog.innerHTML = '<h2 id="vvStorageTitle"></h2><p class="vv-storage-message" id="vvStorageMessage" role="status" hidden></p><div data-storage-view="main"><p id="vvStorageIntro">Mentéskor a leckehaladásodat, feladatjelöléseidet és vizsgaelőzményeidet csak a te gépeden, ebben a böngészőben tároljuk a törlésig.</p><div class="vv-storage-actions"><button type="button" data-storage-enable aria-label="Haladás mentése" aria-describedby="vvStorageEnableDescription">' + savedArt + '<strong>Haladás mentése</strong><span id="vvStorageEnableDescription">Később innen folytatod.</span></button><button type="button" data-storage-disable aria-label="Mentés nélkül" aria-describedby="vvStorageDisableDescription">' + temporaryArt + '<strong>Mentés nélkül</strong><span id="vvStorageDisableDescription">Frissítéskor elvész.</span></button></div><p class="vv-storage-local">A mentést később kikapcsolhatod.</p><div class="vv-storage-links"><button type="button" data-storage-info>Tudnivalók</button><button type="button" data-storage-manage>Adatok kezelése</button></div></div><div data-storage-view="info" hidden><div class="vv-storage-info"><p>A mentés célja, hogy később lásd a leckehaladást, a feladatjelöléseket és a vizsgaelőzményeket.</p><p>Az adatokat a törlésig tároljuk ebben a böngészőben. Itt vagy a böngésző beállításaiban törölheted őket. A böngésző is eltávolíthatja a helyi adatokat.</p><p>A kikapcsolás a további mentést állítja le, a korábbi adatokat megtartja. A mentési döntést és az oldalmenü állapotát külön tároljuk, ezeket a haladás törlése megtartja.</p><p>Az eredményeidet az oldal nem tölti fel, és nem használ analitikát. A GitHub tárhelyszolgáltató biztonsági célból naplózza a látogatók IP-címét.</p></div><button type="button" class="vv-storage-back" data-storage-back="main">Vissza a választáshoz</button></div><div data-storage-view="manage" hidden><p>A mentés kikapcsolása megtartja a korábbi adataidat. Itt külön törölheted őket.</p><button type="button" class="vv-storage-delete" data-storage-delete>Mentett haladás törlése</button><button type="button" class="vv-storage-back" data-storage-back="main">Vissza a választáshoz</button></div><div class="vv-storage-confirm" data-storage-view="confirm" hidden><p>A leckehaladás, a feladatjelölések és a vizsgaelőzmények eltűnnek. A megnyitott gyakorlás és vizsga is újrakezdődik.</p><div class="vv-storage-confirm-actions"><button type="button" data-storage-cancel>Mégsem</button><button type="button" data-storage-confirm>Haladás törlése</button></div></div><button type="button" class="vv-storage-close" aria-label="Mentési beállítások bezárása">×</button>';
    document.body.append(dialog);
    message = dialog.querySelector('#vvStorageMessage'); confirmBox = dialog.querySelector('.vv-storage-confirm');
    dialog.querySelector('[data-storage-enable]').addEventListener('click', () => { const saved = choose(true); if (saved) closeDialog(); else { firstVisit = false; showMode(false); } });
    dialog.querySelector('[data-storage-disable]').addEventListener('click', () => { choose(false); closeDialog(); });
    dialog.querySelector('.vv-storage-close').addEventListener('click', () => { if (firstVisit) choose(false); closeDialog(); });
    dialog.querySelector('[data-storage-info]').addEventListener('click', () => showScreen('info'));
    dialog.querySelector('[data-storage-manage]').addEventListener('click', () => showScreen('manage'));
    dialog.querySelectorAll('[data-storage-back]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.storageBack)));
    dialog.querySelector('[data-storage-delete]').addEventListener('click', () => showScreen('confirm'));
    dialog.querySelector('[data-storage-cancel]').addEventListener('click', () => showScreen('manage'));
    dialog.querySelector('[data-storage-confirm]').addEventListener('click', () => {
      const removed = clearProgress(); showScreen('manage');
      message.hidden = false;
      message.textContent = removed ? 'A haladást töröltük. A mentési beállításod megmaradt.' : 'A megnyitott haladást töröltük, de a böngésző nem engedte a korábbi mentések törlését.';
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); if (firstVisit) choose(false); closeDialog(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') event.stopPropagation();
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, summary')].filter(control => !control.disabled && control.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    updateUI();
  }
  function showMode(initial) {
    firstVisit = initial;
    dialog.dataset.initial = String(initial);
    showScreen('main', false);
    updateUI();
  }
  function showScreen(screen, focus = true) {
    dialog.dataset.screen = screen;
    dialog.querySelectorAll('[data-storage-view]').forEach(view => { view.hidden = view.dataset.storageView !== screen; });
    dialog.querySelector('#vvStorageTitle').textContent = {main:firstVisit ? 'Haladás mentése' : 'Mentési beállítások', info:'Tudnivalók', manage:'Adatok kezelése', confirm:'Haladás törlése?'}[screen];
    dialog.setAttribute('aria-describedby', screen === 'main' ? 'vvStorageIntro' : 'vvStorageMessage');
    message.hidden = screen !== 'main' || !message.textContent;
    dialog.scrollTop = 0;
    if (!focus) return;
    const target = screen === 'main' ? dialog.querySelector('[data-storage-manage]') : screen === 'confirm' ? dialog.querySelector('[data-storage-cancel]') : dialog.querySelector(`[data-storage-view="${screen}"] [data-storage-back]`);
    target?.focus({preventScroll:true});
  }
  function unlocked() { const shell = document.querySelector('.shell'); return !!shell && !shell.hidden && getComputedStyle(shell).display !== 'none' && !!shell.getClientRects().length; }
  function openSettings(initial = false) {
    ensureUI(); if (!dialog || !unlocked()) return;
    returnTo = document.activeElement; showMode(initial);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector(initial ? '[data-storage-disable]' : '.vv-storage-close').focus({preventScroll:true});
  }
  function boot() {
    ensureUI();
    const maybeOpen = () => { if (decision === 'pending' && unlocked() && !dialog.open) { openSettings(true); observer?.disconnect(); } };
    if (decision === 'pending') { observer = new MutationObserver(maybeOpen); observer.observe(document.body, {attributes:true, attributeFilter:['hidden', 'class', 'style'], childList:true, subtree:true}); maybeOpen(); }
  }
  window.VV_STORAGE = Object.freeze({
    ready:Promise.resolve(), get decision() { return decision; }, get allowed() { return allowed(); }, get available() { return available; }, hasLegacy,
    get, set, remove, choose, clearProgress, openSettings, keys:PROGRESS_KEYS, choiceKey:CHOICE_KEY
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
