(function () {
  'use strict';

  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const form = document.getElementById('unlockForm');
  const input = document.getElementById('unlockPassword');
  const button = document.getElementById('unlockButton');
  const error = document.getElementById('unlockError');
  const screen = document.getElementById('unlockScreen');
  let busy = false;

  function base64Bytes(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  async function fetchBytes(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('fetch');
    return new Uint8Array(await response.arrayBuffer());
  }

  async function decryptBytes(key, bytes, context) {
    if (bytes.byteLength < 29) throw new Error('format');
    const iv = bytes.subarray(0, 12);
    const ciphertext = bytes.subarray(12);
    const plain = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(context),
      tagLength: 128
    }, key, ciphertext);
    return new Uint8Array(plain);
  }

  function assetLookup(map, originalPath) {
    const withoutFragment = String(originalPath || '').split('#')[0].split('?')[0].replace(/^\.\//, '');
    return map[withoutFragment] || map[decodeURI(withoutFragment)] || null;
  }

  function assetAccess(key, map) {
    const cache = new Map();
    return Object.freeze({
      has(path) { return !!assetLookup(map, path); },
      async getURL(path) {
        const info = assetLookup(map, path);
        if (!info || !/^[A-Za-z0-9_-]{8,128}$/.test(String(info.id || ''))) throw new Error('asset');
        if (cache.has(info.id)) return cache.get(info.id);
        const pending = (async () => {
          const bytes = await fetchBytes(`protected/assets/${info.id}.vve`);
          const plain = await decryptBytes(key, bytes, `vv1:${info.id}`);
          const blob = new Blob([plain], { type: info.type || 'application/octet-stream' });
          return URL.createObjectURL(blob);
        })();
        cache.set(info.id, pending);
        try { return await pending; }
        catch (cause) { cache.delete(info.id); throw cause; }
      }
    });
  }

  function prepareGuide(html) {
    const guide = document.getElementById('guideView');
    guide.innerHTML = html;
    guide.querySelectorAll('a[href^="index.html#"]').forEach(anchor => {
      const target = anchor.getAttribute('href').split('#')[1];
      if (['home', 'bank', 'practice', 'exam', 'guide'].includes(target)) {
        anchor.setAttribute('href', `#${target}`);
        anchor.dataset.go = target;
      }
    });
    window.VV_GUIDE?.setup(guide);
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    input.focus();
  }

  async function unlock(password) {
    const manifestResponse = await fetch('protected/manifest.json', { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('fetch');
    const manifest = await manifestResponse.json();
    const salt = base64Bytes(manifest.salt);
    const iterations = Number(manifest.iterations);
    if (manifest.version !== 1 || salt.length < 16 || !Number.isInteger(iterations) || iterations < 100000 || iterations > 10000000) throw new Error('format');

    const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations
    }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const contentPath = manifest.content || 'content.vve';
    if (!/^[A-Za-z0-9_.-]+\.vve$/.test(contentPath)) throw new Error('format');
    const ciphertext = await fetchBytes(`protected/${contentPath}`);
    const plain = await decryptBytes(key, ciphertext, 'vv1:content');
    let payload;
    try { payload = JSON.parse(decoder.decode(plain)); }
    catch { throw new Error('format'); }
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.data?.questions) || !Array.isArray(payload.data?.sources) || !payload.assetMap || typeof payload.assetMap !== 'object' || typeof payload.tutorialHtml !== 'string') throw new Error('format');

    window.VV_DATA = payload.data;
    window.VV_ASSETS = assetAccess(key, payload.assetMap);
    prepareGuide(payload.tutorialHtml);
    input.value = '';
    screen.hidden = true;
    document.querySelector('.shell').hidden = false;
    document.querySelector('.skip').hidden = false;
    const script = document.createElement('script');
    script.src = 'app.js?v=20260929b';
    script.onerror = () => {
      document.querySelector('.shell').hidden = true;
      screen.hidden = false;
      showError('Az oldal működéséhez szükséges fájl nem töltődött be. Frissítsd az oldalt.');
    };
    document.head.appendChild(script);
  }

  document.getElementById('showPassword').addEventListener('click', event => {
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    event.currentTarget.textContent = reveal ? 'Elrejtés' : 'Megjelenítés';
    event.currentTarget.setAttribute('aria-label', reveal ? 'Jelszó elrejtése' : 'Jelszó megjelenítése');
    input.focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const password = input.value;
    if (!password) { showError('Írd be a jelszót.'); return; }
    if (!window.crypto?.subtle) { showError('A böngésző biztonságos kapcsolatot igényel a feloldáshoz.'); return; }
    busy = true;
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Feloldás…';
    try { await unlock(password); }
    catch (cause) {
      if (cause?.name === 'OperationError') showError('Hibás jelszó, vagy sérült a védett fájl. Próbáld újra.');
      else if (cause?.message === 'fetch') showError('A védett fájl nem érhető el. Ellenőrizd a kapcsolatot, majd próbáld újra.');
      else showError('A védett adatok nem nyithatók meg. Frissítsd az oldalt, majd próbáld újra.');
    }
    finally {
      busy = false;
      button.disabled = false;
      button.innerHTML = 'Feladatbank megnyitása <span aria-hidden="true">↗</span>';
    }
  });
})();
