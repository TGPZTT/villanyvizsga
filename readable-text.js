(function (root) {
  'use strict';

  // This is presentation formatting. It contains no course facts or answer keys.
  const PROSE = new Set([
    'intro', 'bullets', 'recap', 'takeaway', 'commonMistake', 'prompt', 'hint',
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

  root.VV_READABLE = Object.freeze({text, payload, element});
})(typeof window !== 'undefined' ? window : globalThis);
