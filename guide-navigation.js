(function () {
  'use strict';

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

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
      const embedded = !!layout.closest('#guideView');
      const details = [...layout.querySelectorAll('.worked-details')];
      let active = null;

      const topicFor = id => lessons.find(lesson => lesson.id === id)
        || groups.find(group => group.id === id)?.querySelector('.lesson');
      const titleFor = lesson => lesson.querySelector('h3')?.textContent.trim() || lesson.id;
      const hrefFor = id => `#${embedded ? 'guide/' : ''}${encodeURIComponent(id)}`;
      const routeTopic = () => {
        let hash;
        try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return null; }
        if (embedded) {
          if (hash === 'guide') return active || lessons[0];
          return hash.startsWith('guide/') ? topicFor(hash.slice(6)) : null;
        }
        return topicFor(hash);
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
      const previous = make('button', 'button outline guide-topic-previous', '← Előző téma');
      const next = make('button', 'button outline guide-topic-next', 'Következő téma →');
      previous.type = next.type = 'button';
      const position = make('div', 'guide-topic-position');
      position.setAttribute('role', 'status');
      position.setAttribute('aria-live', 'polite');
      const counter = make('span', 'guide-topic-counter');
      const title = make('strong', 'guide-topic-title');
      position.append(counter, title);
      navigation.append(previous, position, next);
      content.prepend(navigation);

      function closeExamples(except) {
        details.forEach(example => { if (example !== except && example.open) example.open = false; });
      }

      function select(lesson, {historyEntry = false, focus = false} = {}) {
        if (!lesson) return;
        const changed = active !== lesson;
        if (changed) closeExamples();
        active = lesson;
        const activeGroup = lesson.closest('.tutorial-group');
        lessons.forEach(item => { item.hidden = item !== lesson; });
        groups.forEach(group => { group.hidden = group !== activeGroup; });
        links.forEach(({link, id}) => {
          const selected = id === lesson.id;
          link.classList.toggle('is-selected-topic', selected);
          link.classList.toggle('is-current-source-group', id === activeGroup?.id);
          if (selected) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        });
        const index = lessons.indexOf(lesson);
        counter.textContent = `${index + 1} / ${lessons.length} téma`;
        title.textContent = titleFor(lesson);
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
        example.querySelector('summary')?.addEventListener('click', () => {
          if (!example.open) closeExamples(example);
        });
        example.addEventListener('toggle', () => {
          if (example.open) closeExamples(example);
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
