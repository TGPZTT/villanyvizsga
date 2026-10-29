(function (root) {
  'use strict';

  // This is presentation formatting. It contains no course facts or answer keys.
  const PROSE = new Set([
    'intro', 'bullets', 'readingBullets', 'recap', 'takeaway', 'commonMistake', 'prompt', 'hint',
    'explanation', 'solution', 'notes', 'note', 'optionReasons', 'feedback',
    'detail', 'meaning', 'caption', 'alt', 'why', 'reason', 'description',
    'summary', 'body', 'structure', 'application', 'limitations'
  ]);
  const OPAQUE = new Set([
    'answer', 'answers', 'correct', 'correctAnswer', 'correctAnswers',
    'math', 'expression', 'unit', 'units', 'id', 'key', 'value', 'type',
    'path', 'url', 'href', 'src', 'source', 'sourceId', 'sourcePath', 'sourceFile',
    'figurePath', 'figurePaths', 'guideTarget', 'questionIds', 'cableTypeIds',
    'relatedLessons', 'left', 'right', 'symbol', 'code', 'target', 'glyph',
    'color', 'label', 'name', 'nominalVoltage', 'conductorMaterial'
  ]);
  const SKIP = [
    'script', 'style', 'code', 'pre', 'math', 'svg', 'samp', 'kbd', 'textarea',
    'input', 'select', 'option', '[contenteditable="true"]', '[data-readable="off"]',
    '[role="math"]', '[data-math]', '.math', '.formula', '.equation',
    '.formula-card__expression', '.worked-step-math',
    '.worked-equation', '.board-equation', '.board-math-prefix',
    '.board-math-result', '.worked-input-symbol', '.worked-input-value',
    '.calc-number-token', '.board-ghost', '.learn-formula-expression',
    '.learn-formula-symbol', '.learn-unit', '.unit-chip', '.formula-legend dt'
  ].join(',');
  const atom = '(?:[\\p{L}][\\p{L}0-9₀-₉]{0,3}(?:_[\\p{L}0-9₀-₉,]+)?|(?:sin|cos|tan|cot|log|ln)\\s*[\\p{L}]|[+−-]?\\d[\\d.,]*(?:[²³])?)';
  const FORMULA = new RegExp('^\\s*' + atom + '\\s*[=≈≠≤≥<>+×*/·−-]', 'u');
  const SHORT_ITEM = /^[\p{L}\p{N}₀-₉_.+−/–-]{1,16}$/u;
  const NUMBER_ITEM = /^[+−-]?\d+(?:[.,]\d+)?(?:\s*[%°\p{L}Ωµμ₀-₉²³/·^−–-]+)?$/u;

  function isFormula(value) {
    return FORMULA.test(value) || /^\s*(?:sin|cos|tan|cot|log|ln)\b/u.test(value);
  }

  function listItem(value) {
    const item = value.trim().replace(/[.!?]$/u, '');
    return SHORT_ITEM.test(item) || NUMBER_ITEM.test(item);
  }

  function capitalize(value) {
    const trimmed = value.trimStart();
    if (isFormula(trimmed) || /^[+−-]?\d/u.test(trimmed) || /^[Α-ω]/u.test(trimmed)) return value;
    // A leading symbol followed by its definition must keep its case as well.
    if (/^[\p{L}](?:_[\p{L}0-9]+)?\s+(?:a|az)\s/iu.test(trimmed)) return value;
    return value.replace(/^(\s*["'„“”«»(\[{*_–-]*)(\p{L})/u,
      (_, prefix, letter) => prefix + letter.toLocaleUpperCase('hu'));
  }

  function text(value) {
    if (typeof value !== 'string' || !value.includes(';')) return value;
    const protectedAt = new Set();
    // Entity terminators, URL path parameters and markup attributes are not prose.
    const protectedParts = /&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);|(?:https?:\/\/|file:\/\/|mailto:)[^\s<>"']+|<\/?[a-z][^>]*>/giu;
    for (const match of value.matchAll(protectedParts)) {
      for (let i = match.index; i < match.index + match[0].length; i++) protectedAt.add(i);
    }
    const terminalLists = /\b[A-Z]\d+(?:[-–][A-Z]\d+)*(?:;\s*[A-Z]\d+(?:[-–][A-Z]\d+)*)+/gu;
    const number = '[+−-]?\\d+(?:[.,]\\d+)?(?:\\s*[%°\\p{L}Ωµμ₀-₉²³/·^−–-]+)?';
    const numberLists = new RegExp('(?:' + number + ')(?:;\\s*' + number + ')+', 'gu');
    for (const pattern of [terminalLists, numberLists]) {
      for (const match of value.matchAll(pattern)) {
        for (let i = match.index; i < match.index + match[0].length; i++) protectedAt.add(i);
      }
    }
    const marks = [...value.matchAll(/;/gu)].map(match => match.index);
    let output = '', cursor = 0;
    marks.forEach((at, index) => {
      if (at < cursor || protectedAt.has(at)) return;
      const left = value.slice(index ? marks[index - 1] + 1 : 0, at).trim();
      const end = index + 1 < marks.length ? marks[index + 1] : value.length;
      const rest = value.slice(at + 1, end);
      const whitespace = rest.match(/^\s+/u)?.[0];
      if (!whitespace || !rest.trim()) return;
      const right = rest.trim();
      // Value/terminal lists and adjacent equations keep their separator.
      if ((listItem(left.replace(/^.*:\s*/u, '')) && listItem(right)) ||
          (isFormula(left) && isFormula(right)) ||
          (/[=≈]/u.test(left) && /^[^.!?]*[=≈]/u.test(right))) return;
      output += value.slice(cursor, at) + '.' + whitespace + capitalize(rest.slice(whitespace.length));
      cursor = end;
    });
    return output + value.slice(cursor);
  }

  function payload(data) {
    const seen = new WeakMap();
    const visit = (node, prose = false, opaque = false, context = '') => {
      if (node === null || typeof node !== 'object') return !opaque && prose ? text(node) : node;
      if (seen.has(node)) return seen.get(node);
      const copy = Array.isArray(node) ? [] : {};
      seen.set(node, copy);
      if (Array.isArray(node)) {
        node.forEach(item => copy.push(visit(item, prose, opaque, context)));
      } else {
        for (const [key, value] of Object.entries(node)) {
          const locked = opaque || OPAQUE.has(key);
          // Raw option identities are preserved. Their feedback still has a prose key.
          const inherited = prose && context !== 'options';
          const asProse = PROSE.has(key) || inherited || (key === 'rows' && context === 'table');
          Object.defineProperty(copy, key, {
            value: visit(value, asProse, locked, key), enumerable: true, writable: true, configurable: true
          });
        }
      }
      return copy;
    };
    return visit(data);
  }

  function element(node) {
    const target = node || root.document?.body;
    const document = target?.nodeType === 9 ? target : target?.ownerDocument;
    if (!document?.createTreeWalker) return 0;
    const walker = document.createTreeWalker(target, 4);
    const changes = [];
    let current;
    while ((current = walker.nextNode())) {
      if (!current.data.includes(';') || current.parentElement?.closest(SKIP)) continue;
      const formatted = text(current.data);
      if (formatted !== current.data) changes.push([current, formatted]);
    }
    for (const [textNode, formatted] of changes) textNode.data = formatted;
    return changes.length;
  }

  // All source prompts were reviewed individually. Only offsets and a text
  // fingerprint are public: the encrypted bank remains the sole text source.
  const PROMPT_BREAKS = {
    "szs-2026-1": ["1f4b95db", 75],
    "szs-2026-2": ["ca369f2d", 75],
    "szs-2026-3": ["a3cc797b", 44],
    "szs-2026-6": ["c03aa797", 110],
    "szs-2026-7": ["98d73e7e", 83],
    "szs-2026-8": ["61c49ee4", 51],
    "szs-2026-9": ["3443bf39", 54],
    "szs-2026-10": ["edc75a77", 84],
    "szs-2026-11": ["1f28f8b1", 112],
    "szs-2026-12": ["b2bd72f3", 91],
    "szs-2026-14": ["dd044be", 85],
    "szs-2026-21": ["213d7388", 115],
    "szs-2026-23": ["9bca84f4", 94],
    "szs-2026-30": ["e13001f0", 140],
    "szs-2026-31": ["8115a793", 157],
    "szs-2026-34": ["10fbf8d9", 78],
    "szs-2026-35": ["f73f8a52", 205],
    "szs-2026-36": ["fe24efee", 77],
    "szs-2026-37": ["779f3e57", 107],
    "szs-2026-38": ["13ad60c5", 191],
    "szs-2026-39": ["8acbfd11", 189],
    "szs-2026-41": ["a254b8c8", 196],
    "szs-2026-42": ["8dab5085", 248],
    "szs-2025-1": ["4d7dd4db", 75],
    "szs-2025-2": ["1cd5c0fe", 75],
    "szs-2025-5": ["41bd4b4e", 75],
    "szs-2025-7": ["b8037db4", 45],
    "szs-2025-14": ["b6a759f5", 54],
    "szs-2025-16": ["87ef6f79", 224],
    "szs-2025-23": ["d5aeb311", 188],
    "szs-2025-24": ["60583b2b", 173],
    "szs-2025-26": ["2b16c505", 86],
    "szs-2025-29": ["38eeae36", 268],
    "szs-2025-30": ["6a08006d", 193],
    "szs-2025-31": ["f16c1c8d", 235],
    "szs-2025-32": ["e513b2d7", 116],
    "szs-2025-33": ["b218df9f", 82],
    "szs-2025-41": ["e1a8a8eb", 82],
    "szs-2024-1": ["4d7dd4db", 75],
    "szs-2024-2": ["1cd5c0fe", 75],
    "szs-2024-10": ["2be01b17", 71],
    "szs-2024-16": ["cc1c12f1", 73],
    "szs-2024-23": ["eddbdb4c", 84],
    "szs-2024-26": ["c81b9b47", 95],
    "szs-2024-29": ["7a2b0326", 266],
    "szs-2024-30": ["27f63569", 236],
    "szs-2024-31": ["67b90903", 236],
    "szs-2024-32": ["76c0dbad", 125],
    "szs-2024-33": ["85dda7e7", 83],
    "szs-2024-39": ["463798c1", 44],
    "local-02-10": ["ad29d3f0", 288],
    "local-02-11": ["b4ecf8b1", 46],
    "local-02-12": ["a66cb7e", 141],
    "local-02-13": ["525e8d8f", 128],
    "local-02-14": ["b0a0456f", 85],
    "local-02-16": ["1bb39df5", 207],
    "local-01-03": ["6b3d851e", 94],
    "local-01-07": ["4a604c77", 160],
    "local-01-08": ["51fd0763", 191],
    "local-01-09": ["8f2defb1", 101],
    "local-01-10": ["7ad374e5", 62],
    "local-13-04": ["a5199639", 71],
    "local-13-05": ["17a75d7a", 90],
    "local-13-07": ["58102db9", 165],
    "local-14-03h": ["169322d4", 86],
    "local-14-05": ["7244783e", 202],
    "local-14-07": ["a1aea2b9", 120],
    "local-14-09": ["14c51047", 307],
    "local-09-01": ["3c18009c", 96],
    "local-09-02": ["a6e8f0b5", 34],
    "local-09-04": ["cbb14bf6", 156, 258],
    "local-11-03h": ["b451eed3", 42],
    "local-11-05": ["7a058c8", 178],
    "local-11-06": ["837400a6", 101],
    "local-11-08": ["e9307ea7", 66],
    "local-12-03": ["686ed86c", 59],
    "local-12-04": ["80fc4f9c", 52],
    "local-12-05": ["2bac42a", 240],
    "local-06-04": ["26aead96", 292],
    "local-06-05": ["eaee316b", 153],
    "local-06-06": ["726aa726", 257],
    "local-06-08": ["db8b8c02", 90],
    "local-06-09": ["2c354a44", 72],
    "local-07-05": ["d8f37e36", 120],
    "local-07-06": ["685d67c6", 196],
    "local-07-09": ["be6269f4", 65],
    "local-07-11": ["12602052", 164],
    "local-07-03-c": ["84001d3e", 76],
    "local-08-03": ["53086d45", 87],
    "local-08-07": ["280e8a8e", 88],
    "local-08-08": ["95ad6319", 55],
    "local-10-02": ["50e0327c", 96],
    "local-10-03": ["55a45fad", 83, 133],
    "local-10-04": ["cb588384", 68],
    "local-10-05": ["cf94776b", 160],
    "local-10-07": ["a90ffcbc", 113],
    "local-10-08": ["f04decc1", 129],
    "local-03-05": ["c73692b1", 124],
    "local-03-06": ["ae3bb259", 112],
    "local-03-08": ["ecbbc33d", 32],
    "local-03-03-d": ["b1c33f1", 170],
    "local-04-05": ["7607153c", 161],
    "local-04-07": ["7c47679b", 178],
    "local-05-02": ["64eb87b8", 172],
    "local-05-03": ["b0d6e1e7", 249],
    "local-05-08": ["5d1833d7", 62],
    "local-05-10": ["1290fd54", 111],
    "gen-exam-r5-004": ["d6b36593", 29],
    "gen-exam-r5-005": ["d3406774", 65],
    "gen-exam-r5-010": ["77eabd0e", 75],
    "gen-exam-r5-014": ["10b6ce66", 23],
    "gen-exam-r5-017": ["38fa752f", 38],
    "gen-exam-r5-021": ["4f4d073c", 73],
    "gen-exam-r5-022": ["4ec55c4b", 55],
    "gen-exam-r5-023": ["29999400", 61],
    "gen-exam-r5-024": ["d87d48b1", 63],
    "gen-exam-r5-025": ["275ed7d3", 67],
    "gen-exam-r5-026": ["4792d7d9", 50],
    "gen-exam-r5-027": ["f1be0469", 50],
    "gen-exam-r5-028": ["955a9946", 86],
    "gen-exam-r5-029": ["8434170d", 60],
    "gen-exam-r5-030": ["f1647efe", 47],
    "gen-exam-r5-032": ["3c65f586", 54],
    "gen-exam-r5-033": ["3459be90", 43],
    "gen-exam-r5-035": ["3535ab0", 91],
    "gen-exam-r5-038": ["e0a7cc45", 53],
    "gen-exam-r5-040": ["27351022", 65],
    "gen-exam-r5-044": ["af05e8d1", 66],
    "gen-exam-r5-045": ["66f2a6fb", 61],
    "gen-exam-r5-046": ["b37d63f8", 56],
    "gen-exam-r5-048": ["9b0dc1d", 69],
    "gen-exam-r5-049": ["6ec09d79", 42],
    "gen-exam-r5-051": ["ee6ce6f3", 70],
    "gen-exam-r5-052": ["72c40fe7", 45],
    "gen-exam-r5-057": ["9f9aa37f", 71],
    "gen-exam-r5-058": ["a6ed2f10", 53],
    "gen-exam-r5-059": ["2ea0ea84", 61],
    "gen-exam-r5-066": ["ff792195", 49],
    "gen-exam-r5-067": ["ada30c34", 55],
    "gen-exam-r5-068": ["d8decc8a", 40],
    "gen-exam-r5-073": ["ec072406", 49],
    "gen-exam-r5-077": ["fd5f4c8e", 52],
    "gen-exam-r5-082": ["5d32705", 50],
    "gen-exam-r5-084": ["952b4997", 88],
    "gen-exam-r5-092": ["44589fd8", 72],
    "gen-exam-r5-093": ["abd39328", 73],
    "gen-exam-r5-096": ["d02aef33", 43],
    "gen-exam-r5-097": ["6a7cf24e", 99],
  };

  function promptFingerprint(value) {
    let hash = 2166136261;
    for (let at = 0; at < value.length; at++) hash = Math.imul(hash ^ value.charCodeAt(at), 16777619) >>> 0;
    return hash.toString(16);
  }

  function promptParts(id, value) {
    const source = String(value ?? ''), plan = PROMPT_BREAKS[id];
    // A later wording change falls back to continuous text, never a stale cut.
    if (!plan || plan[0] !== promptFingerprint(source)) return [source];
    const offsets = [0, ...plan.slice(1), source.length];
    return offsets.slice(1).map((end, at) => source.slice(offsets[at], end));
  }

  const quantityNumber = '[+−-]?(?:\\d{1,3}(?:[ \\u00a0\\u202f]\\d{3})+|\\d+)(?:[.,]\\d+)?';
  const quantityValue = '[~≈]?(?:\\d+[×x])?' + quantityNumber + '(?:[/–]' + quantityNumber + ')*';
  const quantityUnit = '(?:[kMμµm]?[ΩΩ](?:[·⋅]?mm[²2]/m)?|Ft/kWh|Ft|W/m[²2]|1/min|min[⁻−-]¹|mm[²³23]?|cm[²³23]?|m[²³23]?|[kM]?Wh(?:/nap)?|[kM]?VA|[kM]?var|[kM]?W|[kM]?V|[kμµm]?A|[kM]?Hz|[μµm]?s|[nμµm]?F|Ws|[kM]?J|H|S|C|h|lm|lx|cd|K|°C|%|°)';
  const QUANTITY = new RegExp('(?<![\\p{L}\\p{N}_])(' + quantityValue + ')([ \\u00a0\\u202f]*)(' + quantityUnit + ')(?![\\p{L}\\p{N}²³])(?:[ \\u00a0]*(?:AC|DC))?(?:[-‑][\\p{L}]+)?', 'gu');
  const COSINE = /\bcos[ \u00a0]*φ(?:_[\p{L}\p{N}Δ,]+|[₀-₉ₙ]+)?(?:[ \u00a0]*=[ \u00a0]*[+−-]?\d+(?:[.,]\d+)?)?/gu;

  function inlineQuantities(value, format) {
    const source = String(value ?? ''), matches = [];
    for (const match of source.matchAll(QUANTITY)) matches.push({at:match.index, value:match[0], number:match[1]});
    for (const match of source.matchAll(COSINE)) matches.push({at:match.index, value:match[0]});
    matches.sort((a,b) => a.at - b.at || b.value.length - a.value.length);
    let result = '', cursor = 0;
    for (const match of matches) {
      if (match.at < cursor) continue;
      result += format(source.slice(cursor, match.at));
      // Ordinary engineering quantities are one inline atom. An unusually
      // long number can wrap in its prefix, while its tail and unit stay tied.
      if (match.value.length > 24 && match.number?.length > 10) {
        const cut = match.number.length - 6;
        result += `<span class="quantity-prefix">${format(match.value.slice(0,cut))}</span><span class="quantity-token">${format(match.value.slice(cut))}</span>`;
      } else result += `<span class="quantity-token">${format(match.value)}</span>`;
      cursor = match.at + match.value.length;
    }
    return result + format(source.slice(cursor));
  }

  root.VV_READABLE = Object.freeze({text, payload, element, promptParts, inlineQuantities});
})(typeof window !== 'undefined' ? window : globalThis);
