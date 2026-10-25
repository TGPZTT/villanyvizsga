(function (root) {
  'use strict';

  // Persistent display numbers. These checksums identify the existing source
  // groups without duplicating their original names in the public runtime.
  // They are an ordering registry, not a security or cryptography mechanism.
  const registry = [
    'e48d9dff68601d99', '81741d75039ebe2f', '4d32ea7e29a57d10',
    'e904cdc2aaa80224', '0f5b17080fd5ab36', '989aea8c55c1995a',
    'ce7b417d2430adc7', '4003151bcbac4909', '50665f921d59521c',
    '61fef3e9ac6d27cf', '72a7e572fe5f34d0', '653c77eda7b7bc1b',
    '3748130d3883e067', '4158d26429d99622', '04c0905dcb380e1f',
    'aa9e8c7896e85162', '95cc3ff336b34389'
  ];
  let catalog = new Map(), questions = new Map();

  function fingerprint(value) {
    const hash = seed => {
      let result = seed;
      for (const char of value) result = Math.imul(result ^ char.codePointAt(0), 16777619) >>> 0;
      return result.toString(16).padStart(8, '0');
    };
    return hash(2166136261) + hash(2246822519);
  }

  function identity(value) {
    if (typeof value === 'string') return questions.get(value)?.sourceId || value;
    return String(value?.sourceId || value?.sourceFile || value?.source || value?.id || value?.file || '');
  }

  function contest(value) {
    const id = identity(value);
    return id === 'szkt_írásbeli.pdf' || id.startsWith('szakmasztar_forrasok/')
      || String(value?.id || '').startsWith('szs-');
  }

  function setup(data = {}) {
    const list = Array.isArray(data.questions) ? data.questions : [];
    questions = new Map(list.map(question => [String(question.id), question]));
    const ids = new Set(list.map(identity).filter(Boolean));
    if (!ids.size) for (const source of data.sources || []) ids.add(identity(source));
    const next = new Map(), used = new Set();
    const pending = [];
    for (const id of ids) {
      const known = registry.indexOf(fingerprint(id)) + 1;
      if (known && !used.has(known)) { next.set(id, known); used.add(known); }
      else pending.push(id);
    }
    // New source groups append after the persistent registry. Input array order
    // never changes existing display numbers or saved question identities.
    pending.sort((a, b) => fingerprint(a).localeCompare(fingerprint(b)) || a.localeCompare(b));
    let number = registry.length;
    for (const id of pending) next.set(id, ++number);
    catalog = next;
    return sourceRows();
  }

  function sourceNumber(value) { return catalog.get(identity(value)) || null; }
  function sourceLabel(value) {
    const number = sourceNumber(value);
    return number ? `${number}. feladatsor` : 'Feladatsor';
  }
  function sourceKind(value, plural = false) {
    return contest(value) ? (plural ? 'Versenyfeladatok' : 'Versenyfeladat') : (plural ? 'Feladatok' : 'Feladat');
  }
  function sourceOptionLabel(value) {
    return sourceLabel(value) + (contest(value) ? ' (versenyfeladatok)' : '');
  }
  function questionLabel(question) {
    const number = String(question?.number ?? question?.taskNumber ?? '').trim().replace(/\.+$/u, '');
    return `${sourceLabel(question)}${number ? ` · ${number}. ${sourceKind(question).toLocaleLowerCase('hu')}` : ''}`;
  }
  function compareSources(a, b) {
    return (sourceNumber(a) || Number.MAX_SAFE_INTEGER) - (sourceNumber(b) || Number.MAX_SAFE_INTEGER)
      || identity(a).localeCompare(identity(b), 'hu');
  }
  function sourceRows() {
    return [...catalog].sort((a, b) => a[1] - b[1]).map(([id, number]) => ({
      id, number, title: sourceLabel(id), optionLabel: sourceOptionLabel(id), kind: sourceKind(id)
    }));
  }
  function payload(data = {}) {
    setup(data);
    return {
      ...data,
      sources: (data.sources || []).map(source => typeof source === 'string'
        ? {id: source, file: source, title: sourceLabel(source), kind: sourceKind(source)}
        : {...source, title: sourceLabel(source), kind: sourceKind(source)}),
      questions: (data.questions || []).map(question => ({...question, sourceTitle: sourceLabel(question)}))
    };
  }
  function labelQuestionLinks(scope, data = root.VV_DATA) {
    if (data) setup(data);
    let changed = 0;
    for (const link of scope?.querySelectorAll?.('[data-question-ref]') || []) {
      const question = questions.get(String(link.dataset.questionRef));
      if (!question) continue;
      const label = questionLabel(question);
      link.textContent = label;
      link.setAttribute('aria-label', label);
      link.title = label;
      changed++;
    }
    return changed;
  }

  root.VV_LABELS = Object.freeze({
    setup, payload, sourceNumber, sourceLabel, sourceKind, sourceOptionLabel,
    questionLabel, compareSources, sourceRows, labelQuestionLinks
  });
})(typeof window !== 'undefined' ? window : globalThis);
