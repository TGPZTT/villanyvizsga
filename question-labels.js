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
    'aa9e8c7896e85162', '95cc3ff336b34389', '29f1f982c5d6dfb4',
    '2af1fb15c6d6e147', '2bf1fca8bbd6cff6', '2cf1fe3bbcd6d189',
    '2df1ffceb9d6ccd0', '2ef20161bad6ce63', '2ff202f4bfd6d642',
    '30f20487c0d6d7d5', '31f2061abdd6d31c', 'aceef62438d3c326',
    'a4e426febacac71c', 'fbfbbd92d2adb268', '69534dd9f3feb83b',
    '8cc84f53c67ec351', 'ca85a02c24417dae', '69458877897a7be5',
    '8fe9f19bcfadf049',
    '3459ca5106b201df', 'd52bd3712233c91f',
    '9e5a6a6395bc2be9', 'c56cbd404c2649a6', '10ddf862e6e1af58', '7704cae03abc6576', 'bb97630919ccb73f', 'd0bdde89a252b19b', '6c2f21f62ca3689c', '0ba90fb1bc9059e7', '60273a48937c678a', '1acdde159b6ed32b', '15a612ada09b21fb',
    '8d066c957af08727'
  ];
  let catalog = new Map(), questions = new Map(), communitySources = new Set(), sourceYears = new Map();

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

  function validYear(value) {
    const text = String(value ?? '').trim();
    return /^(?:19|20)\d{2}$/u.test(text) ? Number(text) : null;
  }

  function setup(data = {}) {
    const list = Array.isArray(data.questions) ? data.questions : [];
    questions = new Map(list.map(question => [String(question.id), question]));
    sourceYears = new Map();
    // Use the catalogue metadata, not dates embedded in filenames. Some source
    // filenames describe their release date rather than the actual exam year.
    for (const source of data.sources || []) {
      const year = validYear(source?.year) || validYear(source?.createdYear);
      if (year) sourceYears.set(identity(source), year);
    }
    const questionYears = new Map();
    for (const question of list) {
      const id = identity(question), year = validYear(question.year);
      if (!year) continue;
      if (!questionYears.has(id)) questionYears.set(id, new Set());
      questionYears.get(id).add(year);
    }
    for (const [id, years] of questionYears) if (!sourceYears.has(id) && years.size === 1) sourceYears.set(id, [...years][0]);
    communitySources = new Set([...list, ...(data.sources || [])]
      .filter(item => item?.originVerification?.kind === 'community-adaptation')
      .map(identity));
    for (const [alias, target] of Object.entries(data.questionAliases || {})) if (questions.has(String(target))) questions.set(alias, questions.get(String(target)));
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
  function sourceYear(value) { return sourceYears.get(identity(value)) || validYear(value?.year) || validYear(value?.createdYear); }
  function sourceBaseLabel(value) {
    const number = sourceNumber(value);
    if(communitySources.has(identity(value)))return number ? `${number}. közösségi gyakorlósor` : 'Közösségi gyakorlósor';
    if(identity(value).startsWith('generated-exam-'))return number ? `${number}. géppel generált kérdéssor` : 'Géppel generált kérdéssor';
    return number ? `${number}. feladatsor` : 'Feladatsor';
  }
  function sourceLabel(value) {
    const year = sourceYear(value);
    return sourceBaseLabel(value) + (year ? ` (${year})` : '');
  }
  function sourceKind(value, plural = false) {
    return contest(value) ? (plural ? 'Versenyfeladatok' : 'Versenyfeladat') : (plural ? 'Feladatok' : 'Feladat');
  }
  function sourceOptionLabel(value) {
    const details = [sourceYear(value), contest(value) ? 'versenyfeladatok' : null].filter(Boolean);
    return sourceBaseLabel(value) + (details.length ? ` (${details.join(', ')})` : '');
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
    setup, payload, sourceNumber, sourceYear, sourceLabel, sourceKind, sourceOptionLabel,
    questionLabel, compareSources, sourceRows, labelQuestionLinks
  });
})(typeof window !== 'undefined' ? window : globalThis);
