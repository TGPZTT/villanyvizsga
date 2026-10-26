(function () {
  'use strict';

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function setupTooltips() {
    if (document.body.dataset.guideTooltipsReady) return;
    document.body.dataset.guideTooltipsReady = 'true';
    const tip = make('div', 'guide-floating-tooltip');
    tip.id = 'guideFloatingTooltip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.append(tip);
    let current = null;
    const show = element => {
      if (!element?.dataset.tooltip) return;
      current = element;
      tip.textContent = element.dataset.tooltip;
      tip.hidden = false;
      const box = element.getBoundingClientRect();
      const width = tip.offsetWidth, height = tip.offsetHeight;
      tip.style.left = `${Math.max(12, Math.min(innerWidth - width - 12, box.left + box.width / 2 - width / 2))}px`;
      tip.style.top = `${box.top >= height + 14 ? box.top - height - 8 : Math.min(innerHeight - height - 12, box.bottom + 8)}px`;
    };
    const hide = () => { current = null; tip.hidden = true; };
    document.addEventListener('pointerover', event => {
      const target = event.target.closest?.('.calculation-board [data-tooltip], .formula-symbol[data-tooltip], .formula-legend .unit-chip[data-tooltip]');
      if (target && target !== current) show(target);
    });
    document.addEventListener('pointerout', event => {
      if (current && current.contains(event.target) && !current.contains(event.relatedTarget)) hide();
    });
    document.addEventListener('focusin', event => {
      const target = event.target.closest?.('.calculation-board [data-tooltip], .formula-symbol[data-tooltip], .formula-legend .unit-chip[data-tooltip]');
      if (target) show(target);
    });
    document.addEventListener('focusout', event => { if (current === event.target) hide(); });
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
  }

  function prepareFormula(card) {
    if (card.dataset.guideFormulaReady) return;
    window.VVFormula?.guide(card.parentElement || card);
    const figures = [...card.querySelectorAll('.fm-diagram')];
    if (!figures.length) return;
    const legend = make('details', 'guide-legend');
    const summary = make('summary', '', 'Jelölések és mértékegységek');
    const definitions = make('dl', 'guide-legend-list');
    const seen = new Set();
    for (const figure of figures) {
      figure.dataset.fmPresentation = 'compact';
      for (const callout of figure.querySelectorAll('.fm-callout')) {
        const symbol = callout.dataset.fmFor;
        if (!seen.has(symbol)) {
          seen.add(symbol);
          const row = make('div', 'guide-legend-row');
          row.dataset.guideSymbol = symbol;
          row.style.setProperty('--fm-color', callout.style.getPropertyValue('--fm-color'));
          const name = make('dt', 'guide-legend-symbol');
          name.append(callout.querySelector('.fm-callout-symbol').cloneNode(true));
          row.classList.toggle('has-long-symbol', name.textContent.trim().length > 8);
          const meaning = make('dd', 'guide-legend-meaning', callout.querySelector('.fm-callout-meaning').textContent);
          const originalUnit = callout.querySelector('.fm-unit');
          const unit = make('dd', 'guide-legend-unit', originalUnit?.textContent || 'Mértékegység nélkül');
          unit.classList.toggle('is-unitless', originalUnit?.classList.contains('is-unitless'));
          row.classList.toggle('has-long-unit', /\s/.test(unit.textContent.trim()) || unit.textContent.trim().length > 7);
          row.append(name, meaning, unit);
          definitions.append(row);
        }
        callout.remove();
      }
    }
    legend.append(summary, definitions);
    card.append(legend);
    card.dataset.guideFormulaReady = 'true';
    const activate = symbol => definitions.querySelectorAll('[data-guide-symbol]').forEach(row => row.classList.toggle('is-active', row.dataset.guideSymbol === symbol));
    card.addEventListener('pointerover', event => activate(event.target.closest?.('[data-fm-symbol]')?.dataset.fmSymbol));
    card.addEventListener('focusin', event => activate(event.target.closest?.('[data-fm-symbol]')?.dataset.fmSymbol));
    card.addEventListener('pointerdown', event => event.target.closest?.('.fm-symbol')?.focus({preventScroll:true}));
    window.VVFormula?.mount(card);
  }

  const subtopics = new WeakMap();
  function prepareSubtopics(lesson) {
    const children = [...lesson.children];
    const starts = children.map((element, index) => element.classList.contains('formula-card') ? index : -1).filter(index => index >= 0);
    if (starts.length < 2) return;
    lesson.classList.add('has-guide-subtopics');
    const sections = starts.map((start, index) => children.slice(start, starts[index + 1] ?? children.length));
    const nav = make('nav', 'guide-subtopic-navigation');
    nav.setAttribute('aria-label', 'Alfejezetek');
    const previous = make('button', 'button outline', '←');
    previous.setAttribute('aria-label', 'Előző képlet');
    const next = make('button', 'button outline', '→');
    next.setAttribute('aria-label', 'Következő képlet');
    const select = make('select', 'guide-subtopic-select');
    select.setAttribute('aria-label', 'Képlet kiválasztása');
    sections.forEach((section, index) => select.append(new Option(`${index + 1}. ${section[0].querySelector('.formula-card__label')?.textContent || 'Képlet'}`, String(index))));
    previous.type = next.type = 'button';
    nav.append(previous, select, next);
    lesson.querySelector('h3')?.after(nav);
    const show = index => {
      index = Math.max(0, Math.min(sections.length - 1, index));
      sections.forEach((section, sectionIndex) => section.forEach(element => {
        if (sectionIndex !== index && element.matches('details[open]')) element.open = false;
        element.hidden = sectionIndex !== index;
      }));
      select.value = String(index);
      previous.disabled = index === 0;
      next.disabled = index === sections.length - 1;
    };
    const choose = index => {
      show(index);
      lesson.dispatchEvent(new CustomEvent('guide-formula-change', {bubbles:true}));
    };
    select.addEventListener('change', () => choose(Number(select.value)));
    previous.addEventListener('click', () => choose(Number(select.value) - 1));
    next.addEventListener('click', () => choose(Number(select.value) + 1));
    subtopics.set(lesson, {show, select});
    show(0);
  }

  function setup(root = document) {
    root.querySelectorAll('.tutorial-layout').forEach(layout => {
      if (layout.dataset.guideNavigationReady) return;
      const content = layout.querySelector('.tutorial-content');
      const toc = layout.querySelector('.tutorial-toc');
      const lessons = [...layout.querySelectorAll('.lesson[id]')];
      const groups = [...layout.querySelectorAll('.tutorial-group')];
      if (!content || !toc || !lessons.length) return;
      layout.dataset.guideNavigationReady = 'true';
      layout.classList.add('tutorial-single-topic');
      setupTooltips();
      layout.querySelectorAll('.formula-card').forEach(prepareFormula);
      lessons.forEach(lesson => {
        const scope = lesson.closest('.tutorial-group')?.dataset.sourceScope;
        const tag = make('span', `guide-source-tag ${scope === 'contest' ? 'is-contest' : 'is-exam'}`, scope === 'contest' ? 'Versenyfeladat' : 'Feladat');
        const heading = lesson.querySelector('h3');
        lesson.dataset.guideTitle = heading?.textContent.trim() || lesson.id;
        heading?.append(tag);
      });
      lessons.forEach(prepareSubtopics);
      const embedded = !!layout.closest('#guideView');
      const details = [...layout.querySelectorAll('.worked-details')];
      let active = null;

      const topicFor = id => lessons.find(lesson => lesson.id === id)
        || groups.find(group => group.id === id)?.querySelector('.lesson');
      const titleFor = lesson => lesson.dataset.guideTitle || lesson.id;
      const hrefFor = id => {
        const index = Number(subtopics.get(topicFor(id))?.select.value || 0);
        return `#${embedded ? 'guide/' : ''}${encodeURIComponent(id)}${index ? '/' + (index + 1) : ''}`;
      };
      const routeTopic = () => {
        let hash;
        try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return null; }
        if (embedded) {
          if (hash === 'guide') return active || lessons[0];
          return hash.startsWith('guide/') ? topicFor(hash.slice(6).split('/')[0]) : null;
        }
        return topicFor(hash.split('/')[0]);
      };
      const links = [...toc.querySelectorAll('a[href]')].map(link => {
        const id = link.getAttribute('href').split('#')[1]?.replace(/^guide\//, '');
        const lesson = topicFor(id);
        if (!lesson) return null;
        link.dataset.guideTarget = id;
        link.href = hrefFor(lesson.id);
        return {link, id, lesson};
      }).filter(Boolean);

      const navigation = make('nav', 'guide-topic-navigation');
      navigation.setAttribute('aria-label', 'Témák közötti léptetés');
      const previous = make('button', 'button outline guide-topic-previous', '←');
      const next = make('button', 'button outline guide-topic-next', '→');
      previous.type = next.type = 'button';
      const position = make('div', 'guide-topic-position');
      position.setAttribute('role', 'status');
      position.setAttribute('aria-live', 'polite');
      const counter = make('span', 'guide-topic-counter');
      const topicSelect = make('select', 'guide-topic-select');
      topicSelect.setAttribute('aria-label', 'Feladattípus kiválasztása');
      for (const group of groups) {
        const optionGroup = make('optgroup', '');
        optionGroup.label = group.dataset.sourceScope === 'contest' ? 'Versenyfeladatok' : 'Feladatok';
        lessons.filter(lesson => lesson.closest('.tutorial-group') === group).forEach(lesson => optionGroup.append(new Option(titleFor(lesson), lesson.id)));
        topicSelect.append(optionGroup);
      }
      lessons.filter(lesson => !lesson.closest('.tutorial-group')).forEach(lesson => topicSelect.append(new Option(titleFor(lesson), lesson.id)));
      counter.classList.add('guide-sr-only');
      position.append(topicSelect, counter);
      navigation.append(previous, position, next);
      content.prepend(navigation);

      function closeExamples(except) {
        details.forEach(example => { if (example !== except && example.open) example.open = false; });
      }

      function updateSolving() {
        layout.classList.toggle('guide-solving', details.some(example => example.open && !example.hidden && example.closest('.lesson') === active));
      }

      function select(lesson, {historyEntry = false, focus = false} = {}) {
        if (!lesson) return;
        const changed = active !== lesson;
        if (changed) closeExamples();
        active = lesson;
        if (!historyEntry && routeTopic() === lesson) {
          const route = location.hash.slice(1).replace(/^guide\//, '').split('/');
          const index = /^\d+$/.test(route[1] || '') ? Number(route[1]) - 1 : 0;
          subtopics.get(lesson)?.show(index);
        }
        const activeGroup = lesson.closest('.tutorial-group');
        lessons.forEach(item => { item.hidden = item !== lesson; });
        groups.forEach(group => { group.hidden = group !== activeGroup; });
        toc.querySelectorAll('.tutorial-toc-group').forEach(group => group.classList.toggle('is-selected-source', group.dataset.sourceScope === activeGroup?.dataset.sourceScope));
        links.forEach(({link, id}) => {
          const selected = id === lesson.id;
          link.classList.toggle('is-selected-topic', selected);
          link.classList.toggle('is-current-source-group', id === activeGroup?.id);
          if (selected) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        });
        const index = lessons.indexOf(lesson);
        counter.textContent = `${index + 1} / ${lessons.length} téma`;
        topicSelect.value = lesson.id;
        previous.disabled = index === 0;
        next.disabled = index === lessons.length - 1;
        previous.setAttribute('aria-label', index ? `Előző téma: ${titleFor(lessons[index - 1])}` : 'Előző téma');
        next.setAttribute('aria-label', index < lessons.length - 1 ? `Következő téma: ${titleFor(lessons[index + 1])}` : 'Következő téma');
        if (historyEntry && location.hash !== hrefFor(lesson.id)) {
          history.pushState(null, '', location.pathname + location.search + hrefFor(lesson.id));
        }
        if (focus) {
          const heading = lesson.querySelector('h3');
          heading?.setAttribute('tabindex', '-1');
          heading?.focus({preventScroll: true});
          navigation.scrollIntoView({block: 'start', behavior: 'instant'});
        }
        updateSolving();
      }

      // Capture avoids legacy anchor scrolling to a now hidden lesson.
      toc.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[data-guide-target]');
        if (!link || !toc.contains(link)) return;
        const lesson = topicFor(link.dataset.guideTarget);
        if (!lesson) return;
        event.preventDefault();
        event.stopPropagation();
        select(lesson, {historyEntry: true, focus: true});
      }, true);
      topicSelect.addEventListener('change', () => select(topicFor(topicSelect.value), {historyEntry: true}));
      layout.addEventListener('guide-formula-change', () => {
        if (active) history.replaceState(null, '', location.pathname + location.search + hrefFor(active.id));
      });
      previous.addEventListener('click', () => select(lessons[lessons.indexOf(active) - 1], {historyEntry: true, focus: true}));
      next.addEventListener('click', () => select(lessons[lessons.indexOf(active) + 1], {historyEntry: true, focus: true}));
      toc.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        const link = event.target.closest('a[data-guide-target]');
        if (!link) return;
        const topicLinks = links.filter(item => item.id === item.lesson.id);
        const at = topicLinks.findIndex(item => item.link === link);
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? topicLinks.length - 1
          : Math.max(0, Math.min(topicLinks.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)));
        event.preventDefault();
        topicLinks[index]?.link.focus();
      });
      details.forEach(example => {
        // Close the previous example before the browser lays out the newly opened one.
        example.querySelector('summary')?.addEventListener('click', event => {
          if (!example.open) {
            // Open and reserve in the final layout before an intermediate
            // paper size can paint. The later toggle remains authoritative.
            event.preventDefault();
            closeExamples(example);
            layout.classList.add('guide-solving');
            example.open = true;
            window.VV_WORKED?.reserve(example);
          }
        });
        example.addEventListener('toggle', () => {
          if (example.open) closeExamples(example);
          updateSolving();
          if (example.open && example.closest('.lesson') === active) requestAnimationFrame(() => layout.scrollIntoView({block: 'start', behavior: 'instant'}));
        });
      });
      window.addEventListener('hashchange', () => {
        if (!layout.isConnected) return;
        const topic = routeTopic();
        if (topic) select(topic);
      });
      select(routeTopic() || lessons[0]);
    });
  }

  window.VV_GUIDE = {setup};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setup(), {once: true});
  else setup();
})();
