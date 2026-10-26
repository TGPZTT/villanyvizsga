(function () {
  'use strict';

  // This is a deliberately narrow presentation policy. It never restores a
  // presentationPolicy-hidden spec or changes a genuinely interactive model.
  const definitions = [
    ['energy-ut', 0, 'flow', 'energy-chain'],
    ['energy-allomasok', 0, 'selector', 'transformer'],
    ['wires-harmonizalt', 0, 'selector', 'cable-code'],
    ['wires-harmonizalt', 1, 'selector', 'cable-cores'],
    ['wires-kotes', 0, 'timeline', ''],
    ['switchgear-erintkezo-iv', 0, 'timeline', 'arc'],
    ['switchgear-motorvedelem', 0, 'flow', 'motor-protection'],
    ['connection-csatlakozasi-mod', 0, 'compare', ''],
    ['connection-merohely', 0, 'compare', ''],
    ['connection-vezerelt-fovezetek', 0, 'compare', ''],
    ['protection-classes', 0, 'symbols', ''],
    ['protection-elv', 0, 'compare', ''],
    ['protection-inspection', 0, 'timeline', ''],
    ['installation-concealed', 0, 'timeline', ''],
    ['installation-special', 0, 'selector', ''],
    ['lighting-sources', 0, 'selector', ''],
    ['lighting-emergency', 0, 'compare', ''],
    ['lightning-hatas', 0, 'selector', ''],
    ['lightning-hatas', 1, 'compare', 'lightning-protection'],
    ['lightning-eszkozok', 0, 'selector', ''],
    ['documentation-alaprajz', 0, 'symbols', ''],
    ['documentation-terv', 1, 'timeline', 'drawing-change'],
    ['documentation-bemutatas', 0, 'timeline', ''],
    ['work-safety-ot-lepes', 0, 'safety', 'isolation'],
    ['work-safety-ot-lepes', 1, 'compare', 'isolation-sources'],
    ['work-safety-fam', 0, 'compare', 'work-zones'],
    ['work-safety-fam', 1, 'flow', 'work-permission'],
    ['work-safety-vedoeszkoz', 0, 'compare', ''],
    ['work-safety-magasban', 0, 'selector', ''],
    ['work-safety-baleset', 0, 'flow', ''],
    ['work-safety-hulladek', 0, 'selector', 'waste'],
    ['work-safety-workshop', 0, 'selector', ''],
    ['fundamentals-energia', 0, 'timeline', ''],
    ['fundamentals-conductance', 0, 'compare', '']
  ];
  const targets = Object.freeze(definitions.map(([lessonId, part, type, variant]) =>
    Object.freeze({lessonId, part, type, variant})));
  const policy = new Map(targets.map(target => [target.lessonId + ':' + target.part, target]));
  const palette = ['#b85c1a', '#596bac', '#9a3e51', '#397862', '#8a6e29'];
  const sequenceTypes = new Set(['flow', 'timeline', 'route', 'safety']);
  const symbolLessons = new Set(['protection-classes', 'documentation-alaprajz', 'lighting-sources', 'lightning-eszkozok']);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const safeColor = (value, index) => /^#[\da-f]{3,8}$/iu.test(value || '') ? value : palette[index % palette.length];

  function matches(spec, lessonId, part) {
    const target = policy.get(lessonId + ':' + Number(part));
    return Boolean(target && spec?.items?.length && spec.type === target.type &&
      String(spec.variant || '') === target.variant);
  }

  function formatDetail(value) {
    return window.VVLearningVisuals?.formatDetail?.(value) || esc(value);
  }

  function symbol(item, lessonId, index) {
    if (!symbolLessons.has(lessonId) || !window.VVLearningVisuals?.symbol) return '';
    // The plan symbols are not interchangeable with circuit contact symbols.
    const name = lessonId === 'documentation-alaprajz' ?
      ({'Lámpatest':'installation-lamp', 'Kapcsoló':'installation-switch', 'Dugalj':'socket'}[item.label] || '') : item.glyph;
    if (!name) return '';
    return `<span class="lc-symbol">${window.VVLearningVisuals.symbol(name, safeColor(item.color, index), item.stripe)}</span>`;
  }

  function render(spec, lessonId, part) {
    if (!matches(spec, lessonId, part)) return '';
    const sequence = sequenceTypes.has(spec.type);
    const tag = sequence ? 'ol' : 'ul';
    const key = lessonId + ':' + Number(part);
    const headingId = 'lc-' + lessonId + '-' + Number(part);
    const safety = spec.type === 'safety';
    const rows = spec.items.map((item, index) => {
      const drawing = symbol(item, lessonId, index);
      const value = item.value === undefined ? '' :
        `<span class="lc-value">${esc(item.value)}${item.unit ? ` <span class="lc-unit">${esc(item.unit)}</span>` : ''}</span>`;
      return `<li class="lc-item${drawing ? ' lc-has-symbol' : ''}" style="--lc-item-color:${safeColor(item.color, index)}">` +
        `${sequence ? `<span class="lc-order" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>` : ''}` +
        `<div class="lc-term">${drawing}<h4>${esc(item.label)}</h4>${value}</div>` +
        `<p class="lc-detail">${formatDetail(item.detail || '')}</p></li>`;
    }).join('');
    return `<section class="lc-comparison${sequence ? ' lc-sequence' : ''}${safety ? ' lc-safety' : ''}" data-lc-key="${esc(key)}" aria-labelledby="${headingId}">` +
      `<h3 id="${headingId}" class="lc-heading">${esc(spec.title || '')}</h3>` +
      `<${tag} class="lc-items">${rows}</${tag}></section>`;
  }

  window.VVLearningComparisons = Object.freeze({targets, matches, render});
})();
