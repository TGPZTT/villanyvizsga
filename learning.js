(function () {
  'use strict';
  const KEY = 'villanyvizsga-learning-v1';
  const VERSION = '20261026-r1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = value => String(value ?? '').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const shuffle = values => { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; };
  const readProgress = () => { try { const value = JSON.parse(localStorage.getItem(KEY)); return value && typeof value === 'object' ? {read: value.read || {}, checks: value.checks || {}, lastLesson: value.lastLesson || ''} : {read:{}, checks:{}, lastLesson:''}; } catch { return {read:{}, checks:{}, lastLesson:''}; } };
  let progress = readProgress();
  let host, data, chapters = [], lessons = [], lessonMap = new Map(), questionMap = new Map(), reverseMap = new Map(), figureMeta = new Map(), commonFigureFirstUse = new Map(), loading;
  let current = null, lastRoute = 'learn', day = 0, query = '', tab = 'read', figureIndex = 0, scope = 'papers', questionPage = 0, resetOpen = false;
  const sessions = new Map(), models = new Map(), cableSelections = new Map();
  const definitionOpenings = new Map([["energy-feszultseg",["fundamentals-mennyisegek","bullets",0]],["energy-csillag-delta",["energy-csillag-delta","bullets",0]],["energy-ho-atom",["energy-ho-atom","bullets",0]],["energy-napelem",["energy-napelem","bullets",0]],["wires-tipusok",["wires-tipusok","bullets",0]],["wires-szinek",["protection-tn","bullets",0]],["switchgear-kapcsolok",["switchgear-kapcsolok","bullets",0]],["switchgear-tularam",["switchgear-tularam","bullets",0]],["switchgear-biztosito",["switchgear-biztosito","bullets",0]],["switchgear-szelektiv",["switchgear-szelektiv","bullets",0]],["switchgear-ontartas",["switchgear-ontartas","bullets",2]],["switchgear-motorvedelem",["switchgear-motorvedelem","bullets",0]],["switchgear-relek",["switchgear-relek","bullets",0]],["connection-vezerelt-fovezetek",["connection-vezerelt-fovezetek","bullets",1]],["protection-basic",["protection-basic","bullets",0]],["protection-tn",["protection-tn","bullets",0]],["protection-tt-it",["protection-tt-it","bullets",0]],["protection-rcd-label",["protection-rcd-label","bullets",0]],["protection-eph",["protection-eph","bullets",0]],["protection-measurements",["protection-measurements","bullets",0]],["auxiliary-bus",["auxiliary-bus","bullets",0]],["lighting-quantities",["lighting-quantities","bullets",0]],["lighting-distance",["lighting-distance","bullets",2]],["lighting-emergency",["lighting-emergency","bullets",1]],["lightning-aramut",["lightning-aramut","bullets",0]],["lightning-spd",["lightning-eszkozok","intro",0]],["lightning-spd-adatok",["lightning-eszkozok","intro",0]],["lightning-eszkozok",["lightning-eszkozok","bullets",0]],["machines-motor-types",["machines-motor-types","bullets",0]],["machines-slip",["machines-slip","bullets",2]],["machines-contactor",["switchgear-magneskapcsolo","intro",0]],["machines-reversing",["switchgear-ontartas","bullets",4]],["fundamentals-mennyisegek",["fundamentals-mennyisegek","bullets",0]],["fundamentals-hatasfok",["fundamentals-hatasfok","bullets",0]],["fundamentals-valtakozo",["fundamentals-valtakozo","bullets",0]],["fundamentals-meter",["fundamentals-meter","bullets",0]]]);
  let searchTimer;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch {} };
  const lessonRoute = lesson => `learn/${encodeURIComponent(lesson.chapter.id)}/${encodeURIComponent(lesson.id)}`;
  const href = lesson => `#${lessonRoute(lesson)}`;
  const countRead = list => list.filter(lesson => !!progress.read[lesson.id]).length;
  const isPaper = q => q.sourceId === 'online_2022.04.11.pdf' || /^Villanyszerelő_írásbeli_/u.test(q.sourceId || '');
  const physicalUnit = value => /^(?:mertekegyseg nelkul|nincs mertekegysege|nincs mertekegyseguk)$/u.test(norm(value)) ? '' : String(value || '');
  const unit = value => physicalUnit(value) ? `<span class="learn-unit">${esc(physicalUnit(value))}</span>` : '';
  const lineText = value => typeof value === 'object' && value !== null ? value.text || value.label || '' : String(value ?? '');
  const mathText = value => esc(value).replace(/([A-Za-zΑ-ω])_([A-Za-zÀ-ž0-9]+)/gu,'$1<sub>$2</sub>');
  const checkId = lesson => lesson.check?.id || `${lesson.id}-check`;
  const validColor = (value,fallback) => /^#[a-f0-9]{6}$/i.test(String(value)) ? value : fallback;
  const accentStyle = chapter => `--learn-chapter-accent:${validColor(chapter?.accent?.color,'#a9541b')};--learn-chapter-soft:${validColor(chapter?.accent?.soft,'#fff0d8')}`;
  const groupId = lesson => lesson.group?.id || lesson.id;
  const groupTitle = lesson => lesson.group?.title || lesson.title;
  const sectionTitle = lesson => ({
    'wires-harmonizalt':'Harmonizált jelölés',
    'wires-jelolesrendszerek':'Magyar és VDE-jelölés',
    'wires-tipusok':'Épületvezetékek',
    'wires-hajlekony':'Hajlékony vezetékek',
    'wires-energiakabelek':'Erőátviteli kábelek',
    'wires-vezerlokabelek':'Vezérlőkábelek'
  }[lesson.id] || lesson.title);
  const groupFor = lesson => lessons.filter(item => item.chapter.id === lesson.chapter.id && groupId(item) === groupId(lesson));
  const groupsFor = chapter => [...new Map(chapter.lessons.map(item => { const lesson = lessonMap.get(item.id); return [groupId(lesson), groupFor(lesson)]; })).values()];
  const allGroups = () => chapters.flatMap(groupsFor);
  const markedGroup = lesson => groupFor(lesson).every(item => progress.read[item.id]);
  const richText = value => {
    const text = esc(value);
    if (text.includes('**')) return text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
    return text.replace(/^([^:]{3,72}:)(\s)/u,'<strong>$1</strong>$2');
  };

  // Individually reviewed closing-note repetitions. The exact fingerprint also
  // covers the supporting prose/table: author changes restore the note until
  // reviewed again. This is an explicit policy, not a similarity classifier.
  const repeatedReadingNotes = Object.freeze({
    "energy-ut":[4115245108,null],
    "energy-feszultseg":[2781782780,null],
    "energy-alakzatok":[3271334338,613116946],
    "energy-allomasok":[2000574113,null],
    "energy-csillag-delta":[709368519,1438327801],
    "energy-ho-atom":[1218790562,3688578289],
    "energy-megujulok":[null,2321434494],
    "energy-napelem":[2050355853,2674978205],
    "wires-anyag-ellenallas":[1904483961,null],
    "wires-meretezes":[213183812,1572232642],
    "wires-feszultsegeses":[2625720462,null],
    "wires-harmonizalt":[1880144675,null],
    "wires-szinek":[1486663815,null],
    "wires-adat":[2257968083,null],
    "wires-kotes":[3645268962,2892151928],
    "wires-szerszamok":[615693975,4034600601],
    "wires-kabelfektetes":[2260713286,1029838453],
    "wires-oszlop":[2622334818,null],
    "switchgear-erintkezo-iv":[1567739996,2153555257],
    "switchgear-kapcsolok":[2558922200,3314124610],
    "switchgear-tularam":[865035957,4221267884],
    "switchgear-kismegszakito":[2944354258,2074119324],
    "switchgear-szelektiv":[957129982,3786202407],
    "switchgear-magneskapcsolo":[1556002481,1004657661],
    "switchgear-ontartas":[4149520065,null],
    "switchgear-relek":[null,3821462647],
    "connection-fogalmak":[2989294224,1977829130],
    "connection-foldeles":[904383247,2440052932],
    "connection-csatlakozasi-mod":[703662534,3511527532],
    "connection-energia-meres":[968719829,2279506961],
    "connection-merohely":[2944373704,null],
    "connection-vezerelt-fovezetek":[null,2461841048],
    "protection-basic":[3515560750,1965902850],
    "protection-ip-solid":[1319612848,null],
    "protection-tn":[3034658421,null],
    "protection-pe-sizing":[3620428691,766585270],
    "protection-tt-it":[482834341,null],
    "protection-rcd":[2145276666,23259171],
    "protection-classes":[2413935939,null],
    "protection-elv":[1100643388,null],
    "protection-eph":[437136454,1316760506],
    "protection-inspection":[770132175,null],
    "protection-insulation":[4105919413,null],
    "protection-measurements":[null,1312565175],
    "installation-circuits":[null,3121468351],
    "installation-switches":[68012866,1323136836],
    "installation-alternate":[2520377036,683470287],
    "installation-boxes":[2002596566,null],
    "installation-conduits":[265100490,3493679740],
    "installation-concealed":[null,1084758380],
    "installation-surface":[2123015921,932456721],
    "installation-sealed":[3668008756,3700715835],
    "installation-bath":[1947661501,4058488545],
    "installation-special":[4210187215,null],
    "auxiliary-bell":[3256627656,1646035194],
    "auxiliary-alarm":[135557553,null],
    "auxiliary-bus":[2727115611,1359275887],
    "lighting-quantities":[3788003180,2942254445],
    "lighting-distance":[2397303005,null],
    "lighting-color":[1630981011,null],
    "lighting-sources":[1669794269,null],
    "lighting-tube":[152067593,1261926901],
    "lighting-luminaire":[3144680612,3322662598],
    "lighting-emergency":[1908482693,2717227223],
    "lightning-hatas":[1538628911,333942302],
    "lightning-aramut":[null,275192751],
    "lightning-vedett-ter":[3426112897,null],
    "lightning-csatolas":[3666262230,523360404],
    "lightning-zonak":[4142812999,3397746840],
    "lightning-spd":[3475846636,2341141021],
    "lightning-spd-adatok":[155811373,null],
    "lightning-eszkozok":[1273697694,null],
    "lightning-passive":[319861302,1952930078],
    "lightning-withstand":[null,1101992114],
    "documentation-rajztipus":[3032618113,1432677369],
    "documentation-alaprajz":[1045958848,459433362],
    "documentation-terv":[143200306,null],
    "documentation-bemutatas":[null,923082733],
    "work-safety-ot-lepes":[1083112336,null],
    "work-safety-ellenorzes":[160607792,null],
    "work-safety-fam":[2349644057,null],
    "work-safety-vedoeszkoz":[2406239969,1014341648],
    "work-safety-magasban":[3586802541,360002989],
    "work-safety-baleset":[591489338,499091158],
    "work-safety-hulladek":[2248763972,1467595740],
    "work-safety-fire":[3568830510,1598217912],
    "work-safety-workshop":[4059558143,null],
    "machines-transformer":[3821672214,1179979086],
    "machines-vector-group":[3784914028,3180256871],
    "machines-motor-types":[984546951,3433803038],
    "machines-slip":[3071928960,null],
    "machines-star-delta":[97963870,null],
    "machines-contactor":[243201890,2316798998],
    "machines-reversing":[2558298708,527101165],
    "machines-starting":[3976512185,3327004459],
    "machines-capacitor":[null,4252907234],
    "fundamentals-mennyisegek":[4205477521,3369898343],
    "fundamentals-ohm":[396253151,null],
    "fundamentals-soros":[2708505040,1960345009],
    "fundamentals-parhuzamos":[3376282136,3828530864],
    "fundamentals-energia":[1679719329,3439561530],
    "fundamentals-hatasfok":[null,4276861779],
    "fundamentals-valtakozo":[1352769678,null],
    "fundamentals-meter":[3263883374,3140751438],
    "fundamentals-conductance":[1080740966,null],
    "fundamentals-battery":[3599255095,2641664337],
    "fundamentals-current-transformer":[1097426436,null]
  });
  function reviewedRepeatedNote(lesson, field) {
    const expected = repeatedReadingNotes[lesson.id]?.[field === 'takeaway' ? 0 : 1];
    if (expected === undefined || expected === null) return false;
    const text = JSON.stringify([lesson.intro || '',lesson.readingBullets || lesson.bullets || [],
      lesson.table?.headers || lesson.table?.columns || [],lesson.table?.rows || [],lesson[field] || '']);
    let hash = 2166136261;
    for (let index=0; index<text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index),16777619);
    return (hash >>> 0) === expected;
  }

  // Emphasis follows the first occurrence of a few taught terms, rather than
  // turning every number, heading and repeated mention into another highlight.
  function readingText(lesson) {
    const prose = [lesson.intro, ...(lesson.bullets || []), lesson.takeaway,
      lesson.commonMistake, ...(lesson.table?.rows || []).flat()].join(' ').toLocaleLowerCase('hu');
    const taughtTerms = lesson.id === 'wires-energiakabelek' ? ['érszigetelés','páncélzat','árnyékolás','FE180']
      : lesson.id === 'wires-tipusok' ? ['Vezető','Ér','Köpeny'] : [];
    const candidates = [...new Map([...taughtTerms, ...(lesson.emphasis || []), ...(lesson.keywords || [])]
      .map(String).map(text => text.trim()).filter(text => text.length > 1 && text.length < 55)
      .map(text => [text.toLocaleLowerCase('hu'),text])).values()];
    const terms = candidates.filter(text => prose.includes(text.toLocaleLowerCase('hu'))).slice(0,4)
      .sort((a,b) => b.length - a.length);
    const used = new Set();
    return value => {
      const text = String(value ?? '');
      if (text.includes('**')) return richText(text);
      const lower = text.toLocaleLowerCase('hu');
      let marked = '', position = 0;
      const word = char => !!char && /[\p{L}\p{N}_]/u.test(char);
      while (position < text.length) {
        const term = terms.find(term => !used.has(term) && lower.startsWith(term.toLocaleLowerCase('hu'),position)
          && !(word(text[position - 1]) && word(term[0]))
          && (!(word(text[position + term.length]) && word(term.at(-1)))
            || term.length >= 4 && /^[\p{L}]+$/u.test(term)));
        if (term) {
          // Hungarian inflection belongs to the word: highlight "ellenálláson"
          // as a whole, never a bold stem followed by an unstyled suffix.
          let end = position + term.length;
          if (/^[\p{L}]+$/u.test(term)) while (word(text[end])) end++;
          marked += `**${text.slice(position,end)}**`;
          used.add(term); position = end;
        } else { marked += text[position]; position++; }
      }
      return richText(marked);
    };
  }

  function ingest(source) {
    source = window.VV_READABLE?.payload(source) || source;
    if (!source || !Array.isArray(source.chapters)) throw new Error('Invalid learning chapters');
    data = source;
    figureMeta = new Map();
    const rememberFigures = entries => {
      const list = Array.isArray(entries) ? entries : entries && typeof entries === 'object' ? Object.entries(entries).map(([path,value]) => ({path,...value})) : [];
      for (const entry of list) {
        const path = entry?.path || entry?.figurePath;
        if (path) figureMeta.set(path,{...figureMeta.get(path),...entry});
      }
    };
    rememberFigures(source.assets);
    rememberFigures(source.visualAssets?.assets);
    rememberFigures(source.figureLegends);
    rememberFigures(source.figureLegendPatches?.patches);
    chapters = source.chapters.map((chapter, index) => ({...chapter, index, lessons: chapter.lessons || []}));
    lessons = chapters.flatMap(chapter => chapter.lessons.map((lesson, index) => ({...lesson, chapter, index})));
    lessonMap = new Map(lessons.map(lesson => [lesson.id, lesson]));
    commonFigureFirstUse = new Map();
    for (const lesson of lessons) for (const figure of lessonFigures(lesson)) {
      for (const term of figure.legend || figure.parts || []) {
        const key = commonLegendKey(term);
        if (key && !commonFigureFirstUse.has(key)) commonFigureFirstUse.set(key,`${lesson.id}::${figure.path}`);
      }
    }
    reverseMap = new Map();
    for (const lesson of lessons) for (const id of lesson.questionIds || []) {
      if (!reverseMap.has(String(id))) reverseMap.set(String(id), []);
      reverseMap.get(String(id)).push(lesson);
    }
    for (const [id, ids] of Object.entries(source.questionLinks || {})) for (const lessonId of Array.isArray(ids) ? ids : [ids]) {
      const lesson = lessonMap.get(lessonId);
      if (lesson && !reverseMap.get(id)?.includes(lesson)) { if (!reverseMap.has(id)) reverseMap.set(id, []); reverseMap.get(id).push(lesson); }
    }
  }

  function hydrate() {
    if (!host || !window.VV_ASSETS) return;
    $$('img[data-asset-src]:not([data-asset-requested])', host).forEach(img => {
      img.dataset.assetRequested = 'true';
      window.VV_ASSETS.getURL(img.dataset.assetSrc).then(url => { if (img.isConnected) img.src = url; }).catch(() => {
        if (!img.isConnected) return;
        const note = document.createElement('p'); note.className = 'learn-asset-error'; note.textContent = 'Az ábra most nem tölthető be. Frissítsd az oldalt.'; img.replaceWith(note);
      });
    });
  }

  const collectSearchText = value => {
    if (typeof value === 'string' || typeof value === 'number') return [String(value)];
    if (Array.isArray(value)) return value.flatMap(collectSearchText);
    if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => !['id','type','path','figurePath','icon','glyph','color','target','guideTarget','source','attribution','author','license','licenseUrl','url','originalUrl','localPath','sourceSvg','reviewPng','evidenceId','evidenceIds'].includes(key)).flatMap(([,item]) => collectSearchText(item));
    return [];
  };
  const searchable = lesson => {
    const types = cableTypesForLesson(lesson);
    return collectSearchText(types.length ? [lesson.chapter.title,groupTitle(lesson),lesson.title,lesson.intro,cableLessonNote(lesson),cableFireNotes(lesson),types.map(cableVisibleData)] : [lesson.chapter.title,groupTitle(lesson),lesson.title,lesson.intro,lesson.bullets,lesson.facts,lesson.table,lesson.formulas,lesson.recap,lesson.takeaway,lesson.commonMistake,lesson.keywords,lesson.interaction,lesson.visualSpec,lesson.secondaryVisual]);
  };
  const cableRoute = (lesson,id) => `${lessonRoute(lesson)}/cable/${encodeURIComponent(id)}`;
  const searchHref = lesson => {
    const needle = norm(query);
    const fireType = cableTypesForLesson(lesson).find(type => type.id === 'nhxh');
    if (fireType && cableFireNotes(lesson).some(text => norm(text).includes(needle))) return `#${cableRoute(lesson,fireType.id)}`;
    const matches = cableTypesForLesson(lesson).map(type => ({type,score:(norm(type.name).includes(needle)?3:0)+((type.aliases || []).some(alias=>norm(alias).includes(needle))?2:0)+(collectSearchText(cableVisibleData(type)).some(text=>norm(text).includes(needle))?1:0)})).filter(item=>item.score).sort((a,b)=>b.score-a.score);
    return matches[0] ? `#${cableRoute(lesson,matches[0].type.id)}` : href(lesson);
  };
  const searchMatches = lesson => norm(query).length >= 2 && searchable(lesson).some(text => norm(text).includes(norm(query)));
  function highlighted(value) {
    const text = String(value || ''), needle = norm(query);
    if (needle.length < 2) return esc(text);
    let folded = '', positions = [], offset = 0;
    for (const char of text) { const simple = char.toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,''); for (let i=0;i<simple.length;i++) positions.push(offset); folded += simple; offset += char.length; }
    let out = '', cursor = 0, at = folded.indexOf(needle);
    while (at >= 0) { const start = positions[at], end = positions[at + needle.length] ?? text.length; out += esc(text.slice(cursor,start)) + `<mark>${esc(text.slice(start,end))}</mark>`; cursor = end; at = folded.indexOf(needle,at+needle.length); }
    return out + esc(text.slice(cursor));
  }
  function searchSnippet(lesson) {
    const fields = searchable(lesson).filter(text => text.length > 35), match = fields.find(text => norm(text).includes(norm(query))) || lesson.intro || '';
    const normalizedAt = norm(match).indexOf(norm(query)), start = Math.max(0,normalizedAt - 55), end = Math.min(match.length,start + 230);
    return `${start ? '…' : ''}${highlighted(match.slice(start,end))}${end < match.length ? '…' : ''}`;
  }
  function searchResultsMarkup() {
    if (norm(query).length < 2) return '<p class="learn-search-guidance" role="status">Írj be legalább 2 karaktert. Fogalomra, képletre és a részletes adatok szövegére is kereshetsz.</p>';
    const results = lessons.filter(lesson => (!day || Number(lesson.chapter.day) === day) && searchMatches(lesson)).map(lesson => ({lesson,score:(norm(lesson.title).includes(norm(query))?5:0)+(norm(groupTitle(lesson)).includes(norm(query))?3:0)+((lesson.keywords||[]).some(word=>norm(word).includes(norm(query)))?2:0)})).sort((a,b)=>b.score-a.score);
    return `<section class="learn-search-results-panel" aria-label="Tananyag keresési találatai"><p class="learn-search-count" role="status">${results.length} találat${day ? ` a ${day}. nap anyagában` : ''}</p><ol>${results.map(({lesson}) => `<li><a class="learn-search-result" href="${searchHref(lesson)}"><small>${esc(lesson.chapter.title)}${groupTitle(lesson)!==lesson.title ? ` / ${esc(groupTitle(lesson))}` : ''}</small><h2>${highlighted(lesson.title)}</h2><p>${searchSnippet(lesson)}</p><span>Részlet megnyitása <span aria-hidden="true">→</span></span></a></li>`).join('')}</ol>${!results.length ? '<p class="learn-empty">Erre a kifejezésre nincs találat. Próbáld a fogalom rövidebb alakját, vagy válaszd az összes napot.</p>' : ''}</section>`;
  }

  function chapterArtwork(chapter) {
    const illustrations = {
      energy:'<path d="M64 10 42 78M64 10l22 68M46 61h36M51 43h26M56 25h16M40 43h48M34 61h60M43 78l34-35M85 78 51 43"/><path class="learn-art-fine" d="M8 43h30m52 0h30M9 61h23m64 0h24"/>',
      wires:'<path d="M18 26h65c28 0 28 42 0 42H18M18 26a21 21 0 0 1 0 42"/><ellipse cx="20" cy="47" rx="14" ry="21" class="learn-art-fill"/><path d="M19 36h64m-64 11h64M19 58h64"/><path class="learn-art-fine" d="M82 36h25m-25 11h31M82 58h25"/>',
      switchgear:'<rect x="37" y="11" width="54" height="69" rx="6" class="learn-art-fill"/><rect x="49" y="25" width="30" height="27" rx="3"/><path d="M54 46 73 31M50 64h28M50 70h28M48 11V5m30 6V5M48 80v5m30-5v5"/>',
      connection:'<path d="M13 39 41 15l28 24M21 34v43h40V34"/><rect x="75" y="22" width="37" height="53" rx="4" class="learn-art-fill"/><rect x="82" y="31" width="23" height="18" rx="2"/><path d="M61 61h14M87 75v9m14-9v9M31 77V57h20v20M83 60h21"/>',
      protection:'<path d="M64 8 94 21v22c0 18-14 31-30 39C48 74 34 61 34 43V21L64 8Z" class="learn-art-fill"/><path d="M51 34a18 18 0 1 0 26 0M64 25v22M53 62h22M57 68h14M61 74h6"/>',
      installation:'<path d="M17 11h94v69H17V11M17 27h94" class="learn-art-fine"/><rect x="29" y="39" width="28" height="29" rx="4" class="learn-art-fill"/><rect x="72" y="39" width="28" height="29" rx="4"/><path d="M35 60 49 47M81 49v5m10-5v5M85 61h3M43 27v12m43-12v12"/>',
      auxiliary:'<path d="M43 61h42L78 45V34a14 14 0 0 0-28 0v11l-7 16Z" class="learn-art-fill"/><path d="M57 69a7 7 0 0 0 14 0M64 12v8M27 29c-8 8-8 24 0 32m8-24c-4 5-4 12 0 17M101 29c8 8 8 24 0 32m-8-24c4 5 4 12 0 17"/>',
      lighting:'<path d="M43 12h42l-9 17H52l-9-17Z" class="learn-art-fill"/><path d="M53 29 23 76h82L75 29M64 35v32M8 78h112"/><path class="learn-art-fine" d="M47 42 37 63m44-21 10 21"/>',
      lightning:'<path d="M17 55 54 26l38 29M26 48v30h58V48M54 26V8M44 8h20"/><path d="M99 8 85 29h15L87 51M84 78h17V40M90 79h22m-18 5h14"/>',
      documentation:'<path d="M26 8h58l18 18v56H26V8M84 8v20h18" class="learn-art-fill"/><path d="M39 61V41h24v20H39M63 50h21M73 42v16M39 71h45M39 28h29"/>',
      'work-safety':'<path d="M32 55c0-46 64-46 64 0M25 55h78v10H25V55M52 17v26m24-26v26M43 65v13h42V65" class="learn-art-fill"/><path class="learn-art-fine" d="M14 35 8 31m106 4 6-4M20 17l-6-7m94 7 6-7"/>',
      machines:'<circle cx="60" cy="44" r="28" class="learn-art-fill"/><path d="M47 57V30l13 18 13-18v27M88 44h25M35 73l-8 8m56-8 8 8M20 44h12"/><path class="learn-art-fine" d="M19 21a48 48 0 0 1 84 3m-1-11 1 11-11-1"/>',
      fundamentals:'<path d="M15 43h19m0-14h56v28H34V29m56 14h23"/><path class="learn-art-fine" d="M24 17h76m-10-6 10 6-10 6M24 69h76"/><circle cx="62" cy="71" r="5" class="learn-art-fill"/>'
    };
    return `<svg viewBox="0 0 128 90" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round">${illustrations[chapter.id] || illustrations.documentation}</g></svg>`;
  }

  function overviewOutputMarkup() {
    if (query.trim()) return searchResultsMarkup();
    const filtered = chapters.filter(chapter => !day || Number(chapter.day) === day).map(chapter => ({chapter, groups:groupsFor(chapter)}));
    return `<div class="learn-chapter-grid">${filtered.map(({chapter,groups:chapterGroups}) => {
      const available = chapter.lessons.map(lesson => lessonMap.get(lesson.id)), next = available.find(lesson => !progress.read[lesson.id]) || available[0], done = countRead(available);
      const percent = Math.round(done / Math.max(1,available.length) * 100);
      return `<article class="learn-chapter-card" data-learn-chapter="${esc(chapter.id)}" style="${accentStyle(chapter)}"><div class="learn-chapter-art">${chapterArtwork(chapter)}</div><div class="learn-chapter-content"><div class="learn-chapter-top"><span class="learn-chapter-number">${String(chapter.index + 1).padStart(2,'0')}</span><span>${chapter.day}. nap</span></div><h2><a href="${href(next)}">${esc(chapter.title)}</a></h2><div class="learn-chapter-meta"><span>${chapterGroups.length} téma</span><span>${done} / ${available.length} átolvasva</span></div></div><span class="learn-chapter-open" aria-hidden="true">↗</span><div class="learn-chapter-meter"><progress value="${done}" max="${available.length || 1}" aria-label="${esc(chapter.title)} haladása: ${percent}%"></progress></div></article>`;
    }).join('') || '<p class="learn-empty">Ehhez a naphoz most nincs megjeleníthető témakör.</p>'}</div>`;
  }

  function overview() {
    current = null;
    const last = lessonMap.get(progress.lastLesson), learned = countRead(lessons), groups = allGroups();
    host.innerHTML = `<div class="learn-overview"><header class="learn-overview-head"><div><h1 id="learnTitle">Tananyag</h1><p>${chapters.length} témakör · ${groups.length} összefüggő téma</p></div><div class="learn-progress-summary"><strong>${Math.round(learned / Math.max(1, lessons.length) * 100)}<span>%</span></strong><span>átolvasva</span><progress value="${learned}" max="${lessons.length || 1}" aria-label="Tanulási haladás"></progress></div></header>${last ? `<a class="learn-continue" href="${href(last)}"><span><small>FOLYTATÁS</small><strong>${esc(groupTitle(last))}</strong></span><span aria-hidden="true">→</span></a>` : ''}<div class="learn-tools"><div class="learn-day-filter" role="group" aria-label="Tanulási nap"><button type="button" data-learn-day="0" aria-pressed="${day === 0}">Összes</button>${[1,2,3,4].map(n => `<button type="button" data-learn-day="${n}" aria-pressed="${day === n}">${n}. nap</button>`).join('')}</div><label class="learn-search"><span class="sr-only">Keresés a tananyagban</span><input id="learnSearch" name="learning-search" type="search" placeholder="Fogalom, képlet vagy részlet…" value="${esc(query)}" autocomplete="off"></label></div><div id="learnSearchOutput">${overviewOutputMarkup()}</div><div class="learn-reset"><p>A jelölések és a mini feladatok eredménye ezen az eszközön marad meg.</p><button type="button" class="text-button" data-learn-action="reset-toggle" aria-expanded="${resetOpen}">Tanulási haladás törlése</button>${resetOpen ? '<div class="learn-reset-confirm"><p>Minden tanultként jelölt részlet és mini feladateredmény törlődjön? A feladatbank gyakorlási eredményei megmaradnak.</p><button class="button outline" data-learn-action="reset-cancel" type="button">Mégse</button><button class="button dark" data-learn-action="reset-confirm" type="button">Igen, törlöm</button></div>' : ''}</div></div>`;
  }

  function formulaMarkup(formula) {
    const legendTerms=(formula.symbols || []).filter(term=>term.symbol);
    const terms=legendTerms.flatMap(term=>String(term.symbol).split(',').map((symbol,index)=>({...term,symbol:symbol.trim(),meaning:String(term.meaning||'').replace(/^primer és szekunder /u,index===0?'primer ':'szekunder ')}))).filter(term=>term.symbol).sort((a,b)=>b.symbol.length-a.symbol.length);
    const equationMarkup = expression => {
      let math = '', pos = 0;
      while (pos < expression.length) {
        const term = terms.find(term => expression.startsWith(term.symbol, pos) && !(pos > 0 && /[A-Za-zÀ-ž]/u.test(expression[pos - 1]) && /[A-Za-zÀ-ž]/u.test(term.symbol[0])) && !(/[A-Za-zÀ-ž]/u.test(expression[pos + term.symbol.length] || '') && /[A-Za-zÀ-ž]/u.test(term.symbol.at(-1))));
        if (term) { math += `<span tabindex="0" class="learn-formula-symbol" data-learn-symbol="${esc(term.symbol)}" data-learn-tooltip="${esc(`${String(term.meaning || '').replace(/[.;:\s]+$/u,'')}${physicalUnit(term.unit) ? `. Mértékegysége: ${physicalUnit(term.unit)}.` : '. Mértékegység nélkül.'}`)}">${mathText(term.symbol)}</span>`; pos += term.symbol.length; }
        else { math += esc(expression[pos]); pos++; }
      }
      return `<div class="learn-formula-expression">${math}</div>`;
    };
    const equations = String(formula.expression || '').split(';').map(expression => expression.trim()).filter(Boolean);
    return `<div class="learn-formula"><div class="learn-formula-equations">${equations.map(equationMarkup).join('')}</div>${formula.note ? `<p>${esc(formula.note)}</p>` : ''}<div class="learn-formula-legend"><h4>Jelölések és mértékegységek</h4><dl>${legendTerms.map(term => `<div><dt>${mathText(term.symbol)}</dt><dd>${esc(term.meaning)} ${unit(term.unit) || '<span class="learn-unitless">mértékegység nélkül</span>'}</dd></div>`).join('')}</dl></div></div>`;
  }

  function cableTypesForLesson(lesson) {
    if (!['wires-tipusok','wires-hajlekony','wires-energiakabelek','wires-vezerlokabelek'].includes(lesson.id)) return [];
    const catalog = data?.cableTypes || {};
    const seen = new Set();
    return (lesson.cableTypeIds || []).map(id => {
      const type = Array.isArray(catalog) ? catalog.find(type => String(type.id) === String(id)) : catalog[id];
      return type ? {id:String(id),...type} : null;
    })
      .filter(type => {
        if (!type || seen.has(type.id || type.name)) return false;
        seen.add(type.id || type.name); return true;
      });
  }

  function selectedCableType(lesson) {
    const types = cableTypesForLesson(lesson);
    return types.find(type => type.id === cableSelections.get(lesson.id)) || types[0];
  }

  function figureData(figure) {
    if (typeof figure === 'string') figure = {path:figure};
    return figure?.path ? {...figureMeta.get(figure.path),...figure} : null;
  }

  function legendMarkup(terms, className = 'learn-figure-legend') {
    if (!Array.isArray(terms) || !terms.length) return '';
    return `<dl class="${className}">${terms.map(term => {
      const label = term.symbol || term.label || term.code || '';
      const meaning = term.meaning || term.description || term.detail || '';
      return label && meaning ? `<div><dt>${mathText(label)}</dt><dd>${richText(meaning)}${physicalUnit(term.unit) ? ` ${unit(term.unit)}` : ''}</dd></div>` : '';
    }).join('')}</dl>`;
  }

  function attributionMarkup(figure) {
    const info = figure.attribution;
    if (!info || typeof info !== 'object' || !(info.author || info.license)) return '';
    const link = (url,label) => /^https?:\/\//i.test(String(url || '')) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
    return `<p class="learn-figure-credit">${info.author ? link(info.sourceUrl || figure.url,info.author) : ''}${info.author && info.license ? ' — ' : ''}${info.license ? link(info.licenseUrl,info.license) : ''}${info.changes ? `<span>${esc(info.changes)}</span>` : ''}</p>`;
  }

  function singleFigureMarkup(source, extraClass = '', {showLegend = true, lesson = null} = {}) {
    const figure = figureData(source);
    if (!figure) return '';
    const caption = figure.caption || figure.alt || '';
    const alt = figure.alt || caption;
    const dimensions = Number(figure.width) > 0 && Number(figure.height) > 0 ? `width="${Number(figure.width)}" height="${Number(figure.height)}"` : '';
    const terms = (figure.legend || figure.parts || []).filter(term => !lesson || !commonLegendKey(term) || commonFigureFirstUse.get(commonLegendKey(term)) === `${lesson.id}::${figure.path}`);
    const legend = showLegend ? legendMarkup(terms) : '';
    return `<figure class="learn-figure ${extraClass}"><a href="#" data-zoom-asset="${esc(figure.path)}" data-zoom-caption="${esc(caption)}" aria-label="${esc(alt)} nagyítása" aria-haspopup="dialog"><img data-asset-src="${esc(figure.path)}" alt="${esc(alt)}" ${dimensions} loading="lazy" decoding="async"></a><figcaption><div class="learn-figure-caption"><span>${richText(caption)}</span><button type="button" data-zoom-asset="${esc(figure.path)}" data-zoom-caption="${esc(caption)}" aria-haspopup="dialog">Nagyítás ↗</button></div>${legend ? `<div class="learn-figure-notes"><h4>Jelmagyarázat</h4>${legend}</div>` : ''}${attributionMarkup(figure)}</figcaption></figure>`;
  }

  function firstCableValue(value) {
    return lineText(Array.isArray(value) ? value.find(item => lineText(item).trim()) : value);
  }

  function cableLessonNote(lesson) {
    return lesson.catalogNote || (lesson.id === 'wires-tipusok' ? firstCableValue(lesson.bullets)
      : lesson.id === 'wires-energiakabelek' ? lesson.bullets?.[6] || '' : '');
  }

  function cableFireNotes(lesson) {
    return lesson.id === 'wires-energiakabelek' ? [lesson.bullets?.[4],lesson.bullets?.[5]].filter(Boolean) : [];
  }

  function cableLegendTerms(type) {
    const figure = figureData(type.figure);
    const terms = [...(type.codeParts || []),...(figure?.legend || figure?.parts || [])];
    const merged = new Map();
    const plain = value => norm(value).replace(/[.;,:]/g,'').trim();
    for (const term of terms) {
      const label = term.code || term.symbol || term.label || '';
      const meaning = term.meaning || term.description || term.detail || '';
      if (!label || !meaning) continue;
      const key = norm(label), previous = merged.get(key);
      if (!previous) { merged.set(key,{label,meaning,unit:term.unit}); continue; }
      const before = plain(previous.meaning), next = plain(meaning);
      if (before.includes(next)) continue;
      if (next.includes(before)) previous.meaning = meaning;
      else if (!previous.meaning.includes(meaning)) previous.meaning += ` ${meaning}`;
    }
    return [...merged.values()];
  }

  function cableVisibleData(type) {
    const figure = figureData(type.figure);
    return {name:type.name,aliases:type.aliases,conductorMaterial:type.conductorMaterial,nominalVoltage:type.nominalVoltage,
      structure:type.structure,application:firstCableValue(type.application),limitations:firstCableValue(type.limitations),
      legend:cableLegendTerms(type),caption:figure?.caption};
  }

  function commonLegendKey(term) {
    const label = String(term.symbol || term.label || term.code || '').trim();
    const meaning = norm(term.meaning || term.description || term.detail || '');
    if (label === 'G' && /^(?:villamos )?generator[.]?$/.test(meaning)) return 'generator-G';
    if (label === '3~' && /haromfazisu.*valtakozo/.test(meaning)) return 'three-phase-AC';
    if (label === 'N' && /nullavezeto/.test(meaning) && !/kapocs|keszulek|helyi|meresi/.test(meaning)) return 'neutral-N';
    if (label === 'PE' && /vedovezeto/.test(meaning) && !/helyi|kapocs|szonda/.test(meaning)) return 'protective-PE';
    if (label === 'PEN' && /vedo.*nullavezeto/.test(meaning)) return 'combined-PEN';
    return '';
  }

  function lessonFigures(lesson, excluded = new Set()) {
    // The interactive network already shows these complete topologies. The IT
    // capacitance diagram and loop-measurement diagram remain complementary.
    const replaced = {
      'protection-tn':['abrak/tananyag/b-tn-c.webp','abrak/tananyag/b-tn-c-s.webp'],
      'protection-tt-it':['abrak/tananyag/b-tt.webp'],
      'protection-eph':['abrak/tananyag/b-eph.webp']
    };
    const tableReplaced = {
      'protection-ip-solid':['abrak/tananyag/b-ip.webp'],
      'protection-ip-water':['abrak/tananyag/b-ip.webp'],
      'protection-insulation':['abrak/tananyag/b-insulation.webp']
    };
    const taughtElsewhere = {
      'connection-vezerelt-fovezetek':['abrak/tananyag/a-fogyasztasmero.webp'],
      'machines-transformer':['abrak/szs-2024-28_1.png']
    };
    const networkReady = !!window.VVLearningNetworks;
    const candidates = lesson.figures?.length ? lesson.figures : lesson.interaction?.figurePath ? [{path:lesson.interaction.figurePath,alt:lesson.interaction.title || lesson.title,caption:lesson.interaction.caption || ''}] : [];
    const seen = new Set(excluded);
    return candidates.map(figureData).filter(figure => {
      if (!figure || seen.has(figure.path) || networkReady && replaced[lesson.id]?.includes(figure.path) || lesson.table?.rows?.length && tableReplaced[lesson.id]?.includes(figure.path) || taughtElsewhere[lesson.id]?.includes(figure.path)) return false;
      seen.add(figure.path); return true;
    });
  }

  function figureMarkup(lesson, excluded = new Set()) {
    const figures = lessonFigures(lesson,excluded);
    if (!figures.length) return '';
    return `<div class="learn-media${lesson.id === 'energy-ho-atom' && figures.length === 2 ? ' is-plant-pair' : ''}" data-figure-count="${figures.length}">${figures.map(figure => singleFigureMarkup(figure,'',{lesson})).join('')}</div>`;
  }

  function cableTypesMarkup(lesson) {
    const types = cableTypesForLesson(lesson);
    if (!types.length) return '';
    const selected = selectedCableType(lesson);
    const picker = `<nav class="learn-cable-picker" aria-label="Vezeték- és kábeltípus kiválasztása"><p>Válassz típust</p><ul>${types.map(type => `<li><a href="#${cableRoute(lesson,type.id)}" data-learn-cable-select="${esc(type.id)}" ${type.id === selected.id ? 'aria-current="true"' : ''}>${esc(type.name)}</a></li>`).join('')}</ul></nav>`;
    return `<section class="learn-cable-catalog" aria-label="Vezeték- és kábeltípusok" data-learn-cable-selected="${esc(selected.id)}">${picker}${[selected].map(type => {
      const figure = figureData(type.figure);
      const widePicture = figure && Number(figure.width) >= 900 && Number(figure.width) / Number(figure.height) > 1.7;
      const picture = singleFigureMarkup(figure,`learn-cable-figure${widePicture ? ' is-wide' : ''}`,{showLegend:false});
      const aliases = Array.isArray(type.aliases) ? type.aliases.filter(Boolean) : [];
      const fields = [['Felépítés',type.structure],['Alkalmazás',firstCableValue(type.application)],['Korlát',firstCableValue(type.limitations)]];
      const terms = cableLegendTerms(type);
      return `<article class="learn-cable-card is-compact" data-learn-cable-type="${esc(type.id || type.name)}"><header><div><h3>${esc(type.name)}</h3>${aliases.length ? `<p class="learn-cable-aliases">${aliases.map(esc).join(', ')}</p>` : ''}</div><dl class="learn-cable-rating">${type.conductorMaterial ? `<div><dt>Vezetőanyag</dt><dd>${esc(type.conductorMaterial)}</dd></div>` : ''}${type.nominalVoltage ? `<div><dt>Névleges feszültség${/\d/.test(type.nominalVoltage) ? ' (U₀/U)' : ''}</dt><dd>${esc(type.nominalVoltage)}</dd></div>` : ''}</dl></header><div class="learn-cable-body ${picture ? 'has-picture' : ''}${widePicture ? ' has-wide-picture' : ''}">${picture}<dl class="learn-cable-description">${fields.filter(([,value])=>value).map(([label,value])=>`<div${label === 'Korlát' ? ' class="learn-cable-limits"' : ''}><dt>${label}</dt><dd>${richText(value)}</dd></div>`).join('')}</dl></div>${terms.length ? `<section class="learn-cable-codes"><h4>Jelölések</h4>${legendMarkup(terms,'learn-cable-code-list')}</section>` : ''}</article>`;
    }).join('')}</section>`;
  }

  function relatedLessonsMarkup(lesson) {
    const seen = new Set([lesson.id]);
    const related = (lesson.relatedLessons || []).map(id => lessonMap.get(typeof id === 'object' ? id.id : id)).filter(item => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id); return true;
    });
    return related.length ? `<nav class="learn-related-lessons" aria-label="Kapcsolódó tananyag"><h3>Kapcsolódó részek</h3><ul>${related.map(item => `<li><a href="${href(item)}">${esc(item.title)} <span aria-hidden="true">→</span></a></li>`).join('')}</ul></nav>` : '';
  }

  function definitionOpening(lesson) {
    if (lesson.definitionIntro) return null;
    const reference = definitionOpenings.get(lesson.id);
    if (!reference) return null;
    const [sourceId,field,index] = reference, source = lessonMap.get(sourceId);
    if (sourceId !== lesson.id && source && lessons.indexOf(source) < lessons.indexOf(lesson)) return null;
    const text = field === 'bullets' ? source?.bullets?.[index] : source?.intro;
    return text ? {text:lineText(text),sourceId,field,index} : null;
  }

  function readMarkup(lesson) {
    const text = readingText(lesson);
    const cableTypes = cableTypesForLesson(lesson);
    if (cableTypes.length) {
      const note = cableLessonNote(lesson);
      const selected = selectedCableType(lesson);
      const fireNotes = selected?.id === 'nhxh' ? cableFireNotes(lesson) : [];
      const intro = lesson.id === 'wires-tipusok' && note ? `${note} ${lesson.intro || ''}` : lesson.intro || '';
      return `<div class="learn-reading-layout learn-catalog-reading"><p class="learn-intro">${text(intro)}</p>${note && lesson.id !== 'wires-tipusok' ? `<p class="learn-catalog-note">${text(note)}</p>` : ''}${cableTypesMarkup(lesson)}${fireNotes.length ? `<div class="learn-text learn-cable-fire-notes">${fireNotes.map(note => `<p>${text(note)}</p>`).join('')}</div>` : ''}${relatedLessonsMarkup(lesson)}</div>`;
    }
    const opening = definitionOpening(lesson);
    const intro = opening && norm(opening.text) !== norm(lesson.intro)
      ? `${opening.text} ${lesson.intro || ''}` : lesson.intro || '';
    const introMarkup = `<p class="learn-intro">${text(intro)}</p>`;
    // The table carries these exact values once. Keep the unique AC/DC,
    // medium-voltage and real N/PE qualifications in the explanatory prose.
    const compactVoltage = lesson.id === 'energy-feszultseg';
    let bullets = (lesson.bullets || []).filter((_,index) =>
      !(opening?.sourceId === lesson.id && opening.field === 'bullets' && opening.index === index)
      && !(compactVoltage && [0,1,2].includes(index)));
    const basicProtection = lesson.id === 'protection-basic' && lesson.definitionIntro;
    if (basicProtection) {
      // The opening already defines both protective functions. Keep their
      // concrete examples and the actual fault condition, not a second glossary.
      bullets = lesson.readingBullets || bullets;
    }
    // Lists are reserved for actual parallel device types, classifications
    // and procedures. Cause and effect read as connected, short paragraphs.
    const listed = new Set(['energy-alakzatok','energy-megujulok','switchgear-kapcsolok',
      'switchgear-relek','protection-classes','installation-concealed',
      'documentation-rajztipus','work-safety-ot-lepes','work-safety-workshop']);
    const bodyMarkup = () => listed.has(lesson.id)
      ? `<ul class="learn-points">${bullets.map(value => `<li>${text(value)}</li>`).join('')}</ul>`
      : bullets.map(value => `<p>${text(value)}</p>`).join('');
    const bodyBeforeTable = compactVoltage ? '' : bodyMarkup();
    const headers = lesson.table?.headers || lesson.table?.columns || [];
    const formulas = (lesson.formulas || []).map(formulaMarkup).join('');
    const table = headers.length ? `<div class="learn-table-wrap"><table><thead><tr>${headers.map(header => `<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${(lesson.table.rows || []).map(row => `<tr>${row.map((cell,index) => `<${index === 0 ? 'th scope="row"' : 'td'}>${text(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    const body = compactVoltage ? bodyMarkup() : bodyBeforeTable;
    const tableMarkup = table;
    if (lesson.id === 'wires-jelolesrendszerek') {
      const examples = (lesson.bullets || []).filter((_,index) => [2,3,5].includes(index));
      return `<div class="learn-reading-layout learn-code-guide">${introMarkup}${lesson.bullets?.[0] ? `<p class="learn-catalog-note">${text(lesson.bullets[0])}</p>` : ''}${tableMarkup}${examples.length ? `<section class="learn-code-examples"><h3>Jelölési példák</h3><ul class="learn-points">${examples.map(value=>`<li>${text(value)}</li>`).join('')}</ul></section>` : ''}${relatedLessonsMarkup(lesson)}</div>`;
    }
    const facts = !compactVoltage && lesson.facts?.length
      ? `<dl class="learn-facts">${lesson.facts.map(fact => `<div><dt>${text(fact.label)}</dt><dd>${esc(fact.value)} ${unit(fact.unit)}</dd></div>`).join('')}</dl>` : '';
    const explanation = `<div class="learn-text">${compactVoltage ? tableMarkup + body : body + facts + tableMarkup}</div>`;
    const alreadySaid = norm([intro,...bullets,...(lesson.table?.rows || []).flat()].join(' '));
    const repeats = value => !value || alreadySaid.includes(norm(value));
    const takeaway = !compactVoltage && !basicProtection && !reviewedRepeatedNote(lesson,'takeaway') && !repeats(lesson.takeaway)
      ? `<p class="learn-key-rule"><strong>${richText(lesson.takeaway)}</strong></p>` : '';
    const pitfall = !compactVoltage && !basicProtection && !reviewedRepeatedNote(lesson,'commonMistake') && !repeats(lesson.commonMistake)
      && norm(lesson.commonMistake) !== norm(lesson.takeaway)
      ? `<p class="learn-pitfall">${text(lesson.commonMistake)}</p>` : '';
    const workbench = window.VVLearningVisuals?.render(lesson) || '';
    return `<div class="learn-reading-layout">${introMarkup}${explanation}${formulas ? `<section class="learn-formulas-inline">${formulas}</section>` : ''}${takeaway}${pitfall}${workbench}${!workbench && lesson.interaction ? interactionMarkup(lesson) : ''}${figureMarkup(lesson)}${lesson.guideTarget ? `<a class="learn-guide-link" href="#guide/${encodeURIComponent(lesson.guideTarget)}">Kidolgozott számítás az útmutatóban →</a>` : ''}${relatedLessonsMarkup(lesson)}</div>`;
  }

  function sessionFor(lesson) {
    const id = checkId(lesson), check = lesson.check;
    if (!sessions.has(id)) {
      let order = shuffle((check.items || []).map((_,index) => index));
      if (order.length > 1 && order.every((value,index) => value === index)) order.push(order.shift());
      sessions.set(id, {values: [], number: '', optionOrder:shuffle((check.options || []).map((_,index) => index)), pairs: (check.pairs || []).map(() => ''), rightOrder: shuffle((check.pairs || []).map((_,index) => index)), order, submitted: false, correct: false, hint: false, notice: ''});
    }
    return sessions.get(id);
  }

  function checkMarkup(lesson) {
    const check = lesson.check;
    if (!check) return '<p class="learn-empty">Ehhez a laphoz a kapcsolódó vizsga- és versenyfeladatok között találsz gyakorlást.</p>';
    const state = sessionFor(lesson), correct = Array.isArray(check.correct) ? check.correct.map(String) : [String(check.correct ?? '')];
    let input = '';
    if (['choice','multi'].includes(check.type)) input = `<div class="learn-options">${state.optionOrder.map((optionIndex,index) => { const option=check.options[optionIndex];
      const id = String(option.id), selected = state.values.includes(id), right = correct.includes(id);
      return `<label class="learn-option ${state.submitted && right ? 'is-right' : ''} ${state.submitted && selected && !right ? 'is-wrong' : ''}"><span class="learn-option-top"><input type="${check.type === 'multi' ? 'checkbox' : 'radio'}" name="learning-answer" data-learn-option="${esc(id)}" ${selected ? 'checked' : ''} ${state.submitted ? 'disabled' : ''}><span class="learn-option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option.text)}</span>${state.submitted && (right || selected) ? `<b class="learn-result-icon" aria-label="${right ? 'Helyes lehetőség' : 'Téves választás'}">${right ? '✓' : '×'}</b>` : ''}</span>${state.submitted ? `<span class="learn-option-note">${selected ? '<strong>Ezt jelölted. </strong>' : ''}${right ? '<strong>Helyes lehetőség. </strong>' : ''}${esc(option.feedback || option.reason || '')}</span>` : ''}</label>`;
    }).join('')}</div>`;
    if (check.type === 'match') input = `<div class="learn-match">${(check.pairs || []).map((pair,index) => {
      const right = Number(state.pairs[index]) === index && state.pairs[index] !== '';
      const chosen = state.pairs[index] !== '' ? check.pairs[Number(state.pairs[index])] : null;
      return `<div class="learn-match-row ${state.submitted ? right ? 'is-right' : 'is-wrong' : ''}"><label><span>${esc(pair.left)}</span><select data-learn-match="${index}" name="learning-match-${index}" ${state.submitted ? 'disabled' : ''}><option value="">Válassz párt…</option>${state.rightOrder.map(i => `<option value="${i}" ${String(i) === String(state.pairs[index]) ? 'selected' : ''}>${esc(check.pairs[i].right)}</option>`).join('')}</select></label>${state.submitted ? `<p>${!right && chosen ? `A választott „${esc(chosen.right)}” párja: ${esc(chosen.left)}. ` : ''}<strong>${esc(pair.left)} → ${esc(pair.right)}.</strong> ${esc(pair.why || pair.reason || '')}</p>` : ''}</div>`;
    }).join('')}</div>`;
    if (check.type === 'order') input = `<ol class="learn-order" aria-disabled="${state.submitted}">${state.order.map((index,position) => `<li data-order-id="${index}" class="${state.submitted ? index === position ? 'is-right' : 'is-wrong' : ''}"><span class="learn-order-leading"><button type="button" class="learn-sort-handle" data-sort-handle tabindex="-1" aria-hidden="true" title="Fogd meg és húzd a megfelelő helyre" ${state.submitted ? 'disabled' : ''}><svg viewBox="0 0 18 24"><circle cx="5" cy="5" r="2"/><circle cx="13" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="13" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="13" cy="19" r="2"/></svg></button><span class="learn-order-number">${position + 1}</span></span><span>${esc(lineText(check.items[index]))}</span><span class="learn-order-controls"><button type="button" data-learn-order="${position}" data-direction="-1" aria-label="${esc(lineText(check.items[index]))}: egy hellyel feljebb" ${position === 0 || state.submitted ? 'disabled' : ''}>↑</button><button type="button" data-learn-order="${position}" data-direction="1" aria-label="${esc(lineText(check.items[index]))}: egy hellyel lejjebb" ${position === state.order.length - 1 || state.submitted ? 'disabled' : ''}>↓</button></span></li>`).join('')}</ol>${state.submitted && !state.correct ? `<div class="learn-correct-order"><strong>A helyes sorrend</strong><ol>${check.items.map(item => `<li>${esc(lineText(item))}${typeof item === 'object' && item.reason ? ` <small>${esc(item.reason)}</small>` : ''}</li>`).join('')}</ol></div>` : ''}`;
    if (check.type === 'number') input = `<label class="learn-number-label">Számérték <span class="learn-number-field"><input data-learn-number name="learning-number" type="text" inputmode="decimal" autocomplete="off" placeholder="Írd be a számot" value="${esc(state.number)}" ${state.submitted ? 'disabled' : ''}>${unit(check.unit)}</span><small>A mértékegységet nem kell beírnod. Tizedesvessző is használható.</small></label>${state.submitted ? `<div class="learn-number-result ${state.correct ? 'is-right' : 'is-wrong'}"><span>Válaszod: <strong>${esc(state.number)} ${esc(check.unit || '')}</strong></span><span>Helyes eredmény: <strong>${esc(String(check.correct).replace('.',','))} ${esc(check.unit || '')}</strong></span>${!state.correct ? `<p>${esc((check.wrongReasons || []).find(item => Math.abs(Number(state.number.replace(',','.')) - item.value) <= (item.tolerance || 0.01))?.feedback || '')}</p>` : ''}</div>` : ''}`;
    return `<section class="learn-check" aria-labelledby="learnCheckTitle"><div class="learn-check-heading"><span class="learn-eyebrow">Rövid ellenőrzés</span>${progress.checks[lesson.id]?.correct ? '<span class="learn-check-saved">Korábban sikerült ✓</span>' : ''}</div><h2 id="learnCheckTitle">${esc(check.prompt)}</h2>${check.type === 'multi' ? '<p class="learn-check-instruction">Több helyes válasz is lehet.</p>' : check.type === 'order' ? '<p class="learn-check-instruction">A fogantyúnál húzva vagy a nyilakkal állítsd sorrendbe a lépéseket.</p>' : ''}${check.hint ? `<button class="learn-hint-toggle" type="button" data-learn-action="hint" aria-expanded="${state.hint}" aria-controls="learnHint">? ${state.hint ? 'Támpont elrejtése' : 'Támpont kérése'}</button>${state.hint ? `<p id="learnHint" class="learn-hint">${esc(check.hint)}</p>` : ''}` : ''}${input}<div class="learn-check-actions"><button type="button" class="button ${state.submitted ? 'outline' : 'primary'}" data-learn-action="${state.submitted ? 'retry' : 'check'}">${state.submitted ? 'Újrapróbálom' : 'Ellenőrzés'}</button><p class="learn-check-notice" role="status">${esc(state.notice)}</p></div>${state.submitted ? `<div tabindex="-1" class="learn-check-explanation ${state.correct ? 'is-right' : 'is-wrong'}" role="status"><strong>${state.correct ? 'Helyes megoldás.' : 'Nézd meg a válaszod indoklását.'}</strong><p>${esc(check.explanation || '')}</p></div>` : ''}</section>`;
  }

  function interactionMarkup(lesson) {
    const model = lesson.interaction;
    if (!model || !Array.isArray(model.states) || !model.states.length) return '';
    if (!models.has(lesson.id)) models.set(lesson.id, {positions:(model.switches || []).map(() => 0), index:0});
    const saved = models.get(lesson.id);
    const modelHeading = model.title && ![lesson.title,groupTitle(lesson)].some(title => norm(title) === norm(model.title)) ? `<div class="learn-model-heading"><h3>${esc(model.title)}</h3></div>` : '';
    if (model.type === 'switch' && model.switches?.length) {
      const state = model.states.find(item => item.positions?.every((value,index) => Number(value) === saved.positions[index])) || model.states[0];
      return `<section class="learn-model ${state.lamp ? 'is-live' : ''}" aria-label="${esc(model.title || 'Működésmodell')}">${modelHeading}<div class="learn-switch-model"><div class="learn-switches">${model.switches.map((item,index) => `<button type="button" class="learn-switch" data-learn-switch="${index}" aria-pressed="${!!saved.positions[index]}"><span class="learn-switch-symbol" aria-hidden="true">${window.VVLearningVisuals?.symbol(item.id?.includes('107') ? 'intermediate-switch' : 'changeover-switch') || ''}</span><strong>${esc(item.label)}</strong><span>${saved.positions[index] ? 'II.' : 'I.'} állás</span></button>`).join('')}</div><div class="learn-model-flow" aria-hidden="true"></div><div class="learn-lamp"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="learn-lamp-halo" cx="50" cy="43" r="38"/><path d="M34 60c-8-6-12-14-12-23a28 28 0 0 1 56 0c0 9-4 17-12 23l-5 12H39l-5-12ZM39 79h22M43 86h14M40 34l10 12 10-12M50 46v25"/></svg><strong>${state.lamp ? 'Világít' : 'Nem világít'}</strong></div></div><p class="learn-model-reason" role="status">${esc(state.reason || state.text || '')}</p>${model.caption ? `<p class="learn-model-caption">${esc(model.caption)}</p>` : ''}</section>`;
    }
    const state = model.states[Math.min(saved.index, model.states.length - 1)];
    const channelNumber=value=>Number(String(value??'').replace(',','.'));
    const channelMax = label => Math.max(1, ...model.states.flatMap(item => (item.channels || []).filter(channel => channel.label === label).map(channel => channelNumber(channel.value) || 0)));
    const numericChannel = channel => channel.value !== undefined && channel.value !== null && String(channel.value).trim() !== '' && Number.isFinite(channelNumber(channel.value));
    const percent = channel => Math.max(0,Math.min(100,channelNumber(channel.value) / channelMax(channel.label) * 100));
    const channelMarkup = channel => {
      if (channel.value === undefined || channel.value === null) return `<div class="learn-state-segment ${channel.active ? 'is-active' : ''}"><span>${esc(channel.label)}</span><b aria-label="${channel.active ? 'Aktív szerep' : 'További szerep'}">${channel.active ? '●' : '○'}</b></div>`;
      if (!numericChannel(channel)) return `<div class="learn-channel-state ${channel.active ? 'is-active' : ''}"><span>${esc(channel.label)}</span><strong>${esc(channel.value)} ${unit(channel.unit)}</strong></div>`;
      const baseline = model.states[0].channels?.find(item => item.label === channel.label && numericChannel(item));
      return `<div class="learn-numeric-channel ${channel.active ? 'is-active' : ''}"><span>${esc(channel.label)}</span><div class="learn-channel-track">${baseline ? `<i class="learn-channel-baseline" data-learn-baseline="${esc(channel.label)}" style="width:${percent(baseline)}%" aria-hidden="true"></i>` : ''}<i class="learn-channel-current" data-learn-channel="${esc(channel.label)}" style="width:${percent(channel)}%" aria-hidden="true"></i></div><strong class="learn-channel-values"><span>${esc(channel.value)} ${unit(channel.unit)}</span>${baseline ? `<small>Alapérték: ${esc(baseline.value)} ${unit(baseline.unit)}</small>` : ''}</strong></div>`;
    };
    const hasNumericChannels = state.channels?.some(numericChannel);
    return `<section class="learn-model" aria-label="${esc(model.title || 'Működésmodell')}">${modelHeading}<div class="learn-model-states" role="group" aria-label="Állapotválasztó">${model.states.map((item,index) => `<button type="button" data-learn-state="${index}" aria-pressed="${saved.index === index}">${esc(item.title || `${index + 1}. állapot`)}</button>`).join('')}</div>${state.channels?.length ? `<div class="learn-model-channels ${state.channels.every(channel => channel.value === undefined || channel.value === null) ? 'is-sequence' : ''}">${state.channels.map(channelMarkup).join('')}</div>${hasNumericChannels ? '<p class="learn-channel-legend">A vékony szürke sáv az első állapot alapértékét, a vastag színes sáv az aktuális értéket mutatja. Egy soron belül azonos a lépték.</p>' : ''}` : ''}<p class="learn-model-reason" role="status">${esc(state.text || state.reason || '')}</p>${model.caption ? `<p class="learn-model-caption">${esc(model.caption)}</p>` : ''}</section>`;
  }

  function relatedQuestions(lesson) {
    const group = groupFor(lesson), ids = new Set(group.flatMap(item => item.questionIds || []));
    for (const [id, linked] of reverseMap) if (linked.some(item => group.includes(item))) ids.add(id);
    return [...ids].map(id => questionMap.get(String(id))).filter(Boolean);
  }

  function questionMarkup(lesson) {
    const all = relatedQuestions(lesson), papers = all.filter(isPaper), contest = all.filter(q => !isPaper(q)), list = scope === 'papers' ? papers : contest, size = 6;
    questionPage = Math.max(0, Math.min(questionPage, Math.ceil(list.length / size) - 1));
    return `<section class="learn-linked"><div class="learn-linked-filter" role="group" aria-label="Kapcsolódó feladatcsoportok"><button type="button" data-learn-scope="papers" aria-pressed="${scope === 'papers'}">Feladatok <span>${papers.length}</span></button><button type="button" data-learn-scope="contest" aria-pressed="${scope === 'contest'}">Versenyfeladatok <span>${contest.length}</span></button></div><div class="learn-question-list">${list.slice(questionPage * size, (questionPage + 1) * size).map(q => `<a href="#question/${encodeURIComponent(q.id)}" class="learn-question"><small>${esc(window.VV_LABELS.questionLabel(q))}</small><strong>${esc(q.prompt)}</strong><span>Feladat megnyitása →</span></a>`).join('') || `<p class="learn-empty">Ehhez a laphoz ${scope === 'papers' ? 'a feladatsorokból' : 'a versenyfeladatsorokból'} nincs külön hozzárendelt feladat.</p>`}</div>${list.length > size ? `<div class="learn-question-pager"><button type="button" class="button outline" data-learn-page="-1" ${questionPage === 0 ? 'disabled' : ''}>← Előző</button><span>${questionPage + 1} / ${Math.ceil(list.length / size)}</span><button type="button" class="button outline" data-learn-page="1" ${questionPage >= Math.ceil(list.length / size) - 1 ? 'disabled' : ''}>Következő →</button></div>` : ''}</section>`;
  }

  function renderLesson(lesson, {focus = false} = {}) {
    const group = groupFor(lesson);
    if (tab === 'model' && !lesson.interaction) lesson = group.find(item => item.interaction) || lesson;
    current = lesson;
    const selectedCable = selectedCableType(lesson);
    lastRoute = selectedCable ? cableRoute(lesson,selectedCable.id) : lessonRoute(lesson);
    if (/^#learn(?:\/|$)/.test(location.hash) && location.hash !== `#${lastRoute}`) history.replaceState(null,'',`#${lastRoute}`);
    progress.lastLesson = lesson.id; save();
    host.style.setProperty('--learn-chapter-accent',validColor(lesson.chapter.accent?.color,'#a9541b'));
    host.style.setProperty('--learn-chapter-soft',validColor(lesson.chapter.accent?.soft,'#fff0d8'));
    const chapterGroups = groupsFor(lesson.chapter), globalIndex = lessons.indexOf(lesson), previous = lessons[globalIndex - 1], next = lessons[globalIndex + 1], related = relatedQuestions(lesson), groupIndex = chapterGroups.findIndex(items => items.includes(lesson));
    const detailSelect = group.length > 1 && ['check','model'].includes(tab) ? `<label class="learn-detail-select">${tab === 'check' ? 'Olyan részletet ellenőrizz, amelyet már átolvastál' : 'Működésmodell'}<select id="learnDetailSelect" name="learning-detail">${group.filter(item => tab !== 'model' || item.interaction).map(item => `<option value="${esc(item.id)}" ${item.id === lesson.id ? 'selected' : ''}>${esc(item.title)} ${tab === 'check' && progress.checks[item.id]?.correct ? '✓' : ''}</option>`).join('')}</select></label>` : '';
    host.innerHTML = `<div class="learn-workspace"><aside class="learn-rail" aria-label="Tananyag navigáció"><div class="learn-rail-inner"><label class="learn-chapter-select">Témakör<select id="learnChapterSelect" name="learning-chapter">${chapters.map(chapter => `<option value="${esc(chapter.id)}" ${chapter.id === lesson.chapter.id ? 'selected' : ''}>${chapter.index + 1}. ${esc(chapter.title)}</option>`).join('')}</select></label><label class="learn-chapter-select learn-topic-select">Téma<select id="learnGroupSelect" name="learning-topic">${chapterGroups.map((items,index)=>`<option value="${href(items[0])}" ${items.includes(lesson) ? 'selected' : ''}>${index+1}. ${esc(groupTitle(items[0]))}</option>`).join('')}</select></label><div class="learn-rail-progress"><span>${chapterGroups.filter(items => items.every(item => progress.read[item.id])).length} / ${chapterGroups.length} átolvasott téma</span><progress value="${chapterGroups.filter(items => items.every(item => progress.read[item.id])).length}" max="${chapterGroups.length || 1}" aria-label="Fejezet haladása"></progress></div><nav aria-label="Tananyag témái"><ol>${chapterGroups.map((items,index) => `<li><a href="${href(items[0])}" ${items.includes(lesson) ? 'aria-current="page"' : ''}><span class="learn-rail-index">${items.every(item => progress.read[item.id]) ? '✓' : String(index + 1).padStart(2,'0')}</span><span>${esc(groupTitle(items[0]))}</span>${items.every(item => progress.checks[item.id]?.correct) ? '<span class="learn-rail-check" aria-label="Minden mini feladat sikerült">●</span>' : ''}</a></li>`).join('')}</ol></nav></div></aside><article class="learn-lesson${cableTypesForLesson(lesson).length ? ' has-cable-catalog' : ''}"><header class="learn-lesson-head"><div class="learn-lesson-breadcrumb"><a href="#learn">Tananyag</a><span aria-hidden="true">/</span><span>${esc(lesson.chapter.title)}</span><span class="learn-lesson-position">${groupIndex + 1} / ${chapterGroups.length} téma</span><button type="button" class="learn-header-search" data-learn-action="search-open"><span aria-hidden="true">⌕</span> Keresés</button></div><div class="learn-title-row"><h1 id="learnLessonTitle" tabindex="-1">${esc(groupTitle(lesson))}</h1></div>${group.length > 1 ? `<nav class="learn-section-nav" aria-label="A téma részletei">${group.map((item,index) => `<a href="${href(item)}" ${item.id === lesson.id ? 'aria-current="page"' : ''}><span>${index + 1}</span><strong>${esc(sectionTitle(item))}</strong></a>`).join('')}</nav>` : ''}<div class="learn-tabs" role="tablist" aria-label="A tananyag részei"><button type="button" id="learnTab-read" role="tab" aria-selected="${tab === 'read'}" aria-controls="learnPanel" tabindex="${tab === 'read' ? '0' : '-1'}" data-learn-tab="read">Lényeg</button>${group.some(item => item.interaction) ? `<button type="button" id="learnTab-model" role="tab" aria-selected="${tab === 'model'}" aria-controls="learnPanel" tabindex="${tab === 'model' ? '0' : '-1'}" data-learn-tab="model">Működésmodell</button>` : ''}${group.some(item => item.check) ? `<button type="button" id="learnTab-check" role="tab" aria-selected="${tab === 'check'}" aria-controls="learnPanel" tabindex="${tab === 'check' ? '0' : '-1'}" data-learn-tab="check">Ellenőrzöm <span>${group.filter(item => progress.checks[item.id]?.correct).length}/${group.filter(item => item.check).length}</span></button>` : ''}<button type="button" id="learnTab-questions" role="tab" aria-selected="${tab === 'questions'}" aria-controls="learnPanel" tabindex="${tab === 'questions' ? '0' : '-1'}" data-learn-tab="questions">Feladatok <span>${related.length}</span></button></div></header><div id="learnPanel" class="learn-panel" role="tabpanel" aria-labelledby="learnTab-${tab}">${detailSelect}${tab === 'read' ? [lesson].map((item) => `<section class="learn-topic-section" id="learn-section-${esc(item.id)}" data-learn-section-root="${esc(item.id)}">${group.length > 1 && norm(item.title) !== norm(groupTitle(lesson)) ? `<header class="learn-section-heading"><span>${String(group.indexOf(item) + 1).padStart(2,'0')}</span><h2>${esc(item.title)}</h2></header>` : ''}${readMarkup(item)}${item.check ? `<button type="button" class="learn-inline-check" data-learn-open-check="${esc(item.id)}">${progress.checks[item.id]?.correct ? '✓ Ellenőrző feladat újra' : 'Ellenőrző feladat'} <span aria-hidden="true">→</span></button>` : ''}</section>`).join('') : tab === 'model' ? interactionMarkup(lesson) : tab === 'check' ? checkMarkup(lesson) : questionMarkup(lesson)}</div><footer class="learn-lesson-footer">${previous ? `<a class="button outline" href="${href(previous)}" aria-label="Előző rész: ${esc(previous.title)}">← ${previous.chapter.id === lesson.chapter.id && groupId(previous) === groupId(lesson) ? 'Előző rész' : 'Előző téma'}</a>` : '<span></span>'}<button type="button" class="learn-mark ${progress.read[lesson.id] ? 'is-marked' : ''}" data-learn-action="mark" aria-pressed="${!!progress.read[lesson.id]}">${progress.read[lesson.id] ? '✓ Átolvasva' : 'Átolvastam ezt a részt'}</button>${next ? `<a class="button dark" href="${href(next)}" aria-label="Következő rész: ${esc(next.title)}">${next.chapter.id === lesson.chapter.id && groupId(next) === groupId(lesson) ? 'Következő rész' : 'Következő téma'} →</a>` : '<a class="button dark" href="#learn">Áttekintés →</a>'}</footer></article></div>`;
    const sectionNav = $('.learn-section-nav',host), activeSection = $('[aria-current="page"]',sectionNav || host);
    if (sectionNav && activeSection && sectionNav.scrollWidth > sectionNav.clientWidth) {
      sectionNav.scrollLeft = activeSection.getBoundingClientRect().left - sectionNav.getBoundingClientRect().left
        + sectionNav.scrollLeft - (sectionNav.clientWidth - activeSection.offsetWidth) / 2;
    }
    hydrate();
    if (tab === 'read') window.VVLearningVisuals?.mount($(`[data-learn-section-root="${lesson.id}"]`,host),lesson);
    if (tab === 'check' && lesson.check?.type === 'order' && !sessionFor(lesson).submitted) {
      window.VVLearningSort?.mount($('.learn-order',host),(order,movedId)=>{
        if (current?.id !== lesson.id || tab !== 'check') return;
        sessionFor(lesson).order=order;
        renderLesson(lesson);
        const row=$(`[data-order-id="${movedId}"]`,host),position=order.indexOf(movedId)+1;
        const status=$('.learn-order-status',host);
        if(status)status.textContent=`${lineText(lesson.check.items[movedId])} Új helye: ${position}.`;
        row?.querySelector('[data-learn-order]:not(:disabled)')?.focus({preventScroll:true});
      });
    }
    if (focus) $('#learnLessonTitle', host)?.focus({preventScroll:true});
  }

  function renderRoute(hash = location.hash, options = {}) {
    if (!host) return;
    const route = String(hash || '').replace(/^#/, '');
    if (!/^learn(?:\/|$)/.test(route)) return;
    if (!data) { host.innerHTML = '<div class="learn-loading" role="status">A tananyag betöltése…</div>'; return; }
    const parts = route.split('/').map(part => { try { return decodeURIComponent(part); } catch { return ''; } });
    let lesson = parts[2] ? lessonMap.get(parts[2]) : parts[1] ? chapters.find(chapter => chapter.id === parts[1])?.lessons[0] : null;
    if (lesson && !lesson.chapter) lesson = lessonMap.get(lesson.id);
    if (lesson) {
      if (current?.id !== lesson.id) { tab = 'read'; figureIndex = 0; scope = 'papers'; questionPage = 0; }
      if (parts[3] === 'cable' && cableTypesForLesson(lesson).some(type => type.id === parts[4])) { cableSelections.set(lesson.id,parts[4]); tab = 'read'; }
      renderLesson(lesson, options);
    }
    else { lastRoute = 'learn'; overview(); }
  }

  function evaluateCheck() {
    if (!current?.check) return;
    const check = current.check, state = sessionFor(current);
    captureInputs();
    if (['choice','multi'].includes(check.type) && !state.values.length || check.type === 'match' && state.pairs.some(value => value === '') || check.type === 'number' && !/^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(state.number.trim())) {
      state.notice = check.type === 'number' ? 'Csak egy számot írj be, mértékegység nélkül.' : 'Előbb töltsd ki a választ.'; renderLesson(current); return;
    }
    const expected = (Array.isArray(check.correct) ? check.correct : [check.correct]).map(String).sort();
    if (['choice','multi'].includes(check.type)) state.correct = JSON.stringify([...state.values].sort()) === JSON.stringify(expected);
    if (check.type === 'match') state.correct = state.pairs.every((value,index) => Number(value) === index);
    if (check.type === 'order') state.correct = state.order.every((value,index) => value === index);
    if (check.type === 'number') state.correct = Math.abs(Number(state.number.replace(',','.')) - Number(check.correct)) <= Number(check.tolerance ?? 0.01) + Number.EPSILON;
    state.submitted = true; state.notice = '';
    progress.checks[current.id] = {correct:state.correct, at:Date.now()}; save(); renderLesson(current); $('.learn-check-explanation',host)?.focus({preventScroll:true});
  }

  function captureInputs() {
    if (!current?.check || tab !== 'check') return;
    const state = sessionFor(current);
    if (state.submitted) return;
    state.values = $$('[data-learn-option]:checked', host).map(input => input.dataset.learnOption);
    $$('[data-learn-match]', host).forEach(input => state.pairs[Number(input.dataset.learnMatch)] = input.value);
    if ($('[data-learn-number]', host)) state.number = $('[data-learn-number]', host).value;
  }

  function setupEvents() {
    const updateSearch = (input, composing = false) => {
      query = input.value;
      clearTimeout(searchTimer);
      if (composing) return;
      searchTimer = setTimeout(() => {
        if (current || !input.isConnected || $('#learnSearch', host) !== input) return;
        const output = $('#learnSearchOutput', host);
        if (output) output.innerHTML = overviewOutputMarkup();
      }, 180);
    };
    host.addEventListener('input', event => {
      if (event.target.id === 'learnSearch') {
        updateSearch(event.target, event.isComposing);
      } else captureInputs();
    });
    host.addEventListener('compositionstart', event => { if (event.target.id === 'learnSearch') clearTimeout(searchTimer); });
    host.addEventListener('compositionend', event => { if (event.target.id === 'learnSearch') updateSearch(event.target); });
    host.addEventListener('change', event => {
      if (event.target.id === 'learnChapterSelect') { const chapter = chapters.find(item => item.id === event.target.value); if (chapter?.lessons[0]) location.hash = href(lessonMap.get(chapter.lessons[0].id)); }
      else if (event.target.id === 'learnGroupSelect') { location.hash = event.target.value; }
      else if (event.target.id === 'learnDetailSelect') { const selected = lessonMap.get(event.target.value); if (selected) renderLesson(selected); }
      else captureInputs();
    });
    host.addEventListener('keydown', event => {
      if (event.target.matches('[data-learn-tab]') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        event.preventDefault(); const tabs = $$('[data-learn-tab]', host), at = tabs.indexOf(event.target), next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].click(); $(`[data-learn-tab="${tabs[next].dataset.learnTab}"]`, host)?.focus();
      }
      if (event.key === 'Enter' && event.target.matches('[data-learn-number]')) { event.preventDefault(); evaluateCheck(); }
    });
    host.addEventListener('click', event => {
      const cableLink = event.target.closest('a[data-learn-cable-select]');
      if (cableLink && current && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        const typeId = cableLink.dataset.learnCableSelect;
        if (cableTypesForLesson(current).some(type => type.id === typeId)) {
          event.preventDefault();
          cableSelections.set(current.id,typeId); tab = 'read';
          const route = `#${cableRoute(current,typeId)}`;
          if (location.hash !== route) history.pushState(null,'',route);
          renderLesson(current);
          $$('[data-learn-cable-select]',host).find(link => link.dataset.learnCableSelect === typeId)?.focus({preventScroll:true});
          return;
        }
      }
      const target = event.target.closest('button'); if (!target) return;
      if (target.dataset.learnAction !== 'search-open') clearTimeout(searchTimer);
      captureInputs();
      if (target.dataset.learnSection) { const selected = lessonMap.get(target.dataset.learnSection); if (selected) { tab = 'read'; renderLesson(selected); $(`[data-learn-section-root="${selected.id}"]`,host)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}); } return; }
      if (target.dataset.learnOpenCheck) { const selected = lessonMap.get(target.dataset.learnOpenCheck); if (selected) { tab = 'check'; renderLesson(selected); $('#learnCheckTitle',host)?.scrollIntoView({block:'start'}); } return; }
      if (target.hasAttribute('data-learn-day')) { day = Number(target.dataset.learnDay); overview(); return; }
      if (target.dataset.learnTab) { tab = target.dataset.learnTab; renderLesson(current); $(`[data-learn-tab="${tab}"]`, host)?.focus({preventScroll:true}); return; }
      if (target.hasAttribute('data-learn-figure')) { figureIndex = Number(target.dataset.learnFigure); renderLesson(current); $(`[data-learn-figure="${figureIndex}"]`, host)?.focus({preventScroll:true}); return; }
      if (target.dataset.learnScope) { scope = target.dataset.learnScope; questionPage = 0; renderLesson(current); $(`[data-learn-scope="${scope}"]`, host)?.focus({preventScroll:true}); return; }
      if (target.hasAttribute('data-learn-page')) { questionPage += Number(target.dataset.learnPage); renderLesson(current); return; }
      if (target.hasAttribute('data-learn-order')) { const state = sessionFor(current), index = Number(target.dataset.learnOrder), next = index + Number(target.dataset.direction); if (next >= 0 && next < state.order.length) { [state.order[index],state.order[next]] = [state.order[next],state.order[index]]; renderLesson(current); const preferred=$(`[data-learn-order="${next}"][data-direction="${target.dataset.direction}"]`,host);(preferred&&!preferred.disabled?preferred:$(`[data-learn-order="${next}"]:not(:disabled)`,host))?.focus({preventScroll:true}); } return; }
      if (target.hasAttribute('data-learn-switch')) { const saved = models.get(current.id), index = Number(target.dataset.learnSwitch), before=saved.positions[index], halo=getComputedStyle($('.learn-lamp-halo',host)).opacity; saved.positions[index] = before ? 0 : 1; renderLesson(current); const control=$(`[data-learn-switch="${index}"]`,host);control?.focus({preventScroll:true});if(!matchMedia('(prefers-reduced-motion:reduce)').matches){$('i',control)?.animate([{transform:`translateY(${before?23:0}px)`},{transform:`translateY(${before?0:23}px)`}],{duration:450,easing:'cubic-bezier(.2,.7,.2,1)'});const circle=$('.learn-lamp-halo',host);circle?.animate([{opacity:halo},{opacity:getComputedStyle(circle).opacity}],{duration:550,easing:'ease'});} return; }
      if (target.hasAttribute('data-learn-state')) { const widths=new Map($$('[data-learn-channel]',host).map(element=>[element.dataset.learnChannel,element.style.width]));models.get(current.id).index = Number(target.dataset.learnState); renderLesson(current); $(`[data-learn-state="${target.dataset.learnState}"]`, host)?.focus({preventScroll:true});if(!matchMedia('(prefers-reduced-motion:reduce)').matches)$$('[data-learn-channel]',host).forEach(element=>{const old=widths.get(element.dataset.learnChannel);if(old)element.animate([{width:old},{width:element.style.width}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});}); return; }
      switch (target.dataset.learnAction) {
        case 'mark': if (progress.read[current.id]) delete progress.read[current.id]; else progress.read[current.id] = Date.now(); save(); renderLesson(current); $('[data-learn-action="mark"]', host)?.focus({preventScroll:true}); break;
        case 'hint': { const state = sessionFor(current); state.hint = !state.hint; renderLesson(current); $('[data-learn-action="hint"]', host)?.focus({preventScroll:true}); break; }
        case 'check': evaluateCheck(); break;
        case 'retry': sessions.delete(checkId(current)); renderLesson(current); break;
        case 'search-open': history.replaceState(null,'','#learn'); lastRoute = 'learn'; overview(); $('#learnSearch',host)?.focus({preventScroll:true}); $('#learnSearch',host)?.scrollIntoView({block:'center'}); break;
        case 'reset-toggle': resetOpen = !resetOpen; overview(); break;
        case 'reset-cancel': resetOpen = false; overview(); break;
        case 'reset-confirm': progress = {read:{},checks:{},lastLesson:''}; sessions.clear(); save(); resetOpen = false; overview(); $('#learnSearch', host)?.focus({preventScroll:true}); break;
      }
    });
    setupTooltips();
  }

  function setupTooltips() {
    if ($('#learnFloatingTooltip')) return;
    const tip = document.createElement('div'); tip.id = 'learnFloatingTooltip'; tip.className = 'learn-floating-tooltip'; tip.role = 'tooltip'; tip.hidden = true; document.body.append(tip);
    let active;
    const hide = () => { if (active) active.removeAttribute('aria-describedby'); active = null; tip.hidden = true; };
    const show = element => { hide(); active = element; tip.textContent = element.dataset.learnTooltip; tip.hidden = false; element.setAttribute('aria-describedby', tip.id); const box = element.getBoundingClientRect(); tip.style.left = `${Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, box.left + box.width / 2 - tip.offsetWidth / 2))}px`; tip.style.top = `${box.top > tip.offsetHeight + 12 ? box.top - tip.offsetHeight - 8 : Math.min(innerHeight - tip.offsetHeight - 8, box.bottom + 8)}px`; };
    host.addEventListener('pointerover', event => { const element = event.target.closest('[data-learn-tooltip]'); if (element) show(element); });
    host.addEventListener('pointerout', event => { if (active && !active.contains(event.relatedTarget)) hide(); });
    host.addEventListener('focusin', event => { const element = event.target.closest('[data-learn-tooltip]'); if (element) show(element); });
    host.addEventListener('focusout', hide); window.addEventListener('scroll', hide, true); window.addEventListener('resize', hide);
    host.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  }

  function setup({root, data:source, questions = []} = {}) {
    if (!root) return Promise.resolve();
    if (host !== root) { host = root; setupEvents(); }
    questionMap = new Map(questions.map(question => [String(question.id), question]));
    if (source) { ingest(source); renderRoute(location.hash); return Promise.resolve(); }
    if (data) return Promise.resolve();
    if (!loading) loading = fetch(`learning-data.json?v=${VERSION}`, {cache:'no-store'}).then(response => { if (!response.ok) throw new Error('Learning unavailable'); return response.json(); }).then(source => { window.VV_LEARNING = source; ingest(source); renderRoute(location.hash); document.dispatchEvent(new CustomEvent('vv-learning-ready')); }).catch(() => { if (/^#learn(?:\/|$)/.test(location.hash)) host.innerHTML = '<p class="learn-asset-error">A tananyag nem tölthető be. Frissítsd az oldalt.</p>'; });
    return loading;
  }

  window.addEventListener('storage',event=>{if(event.key===KEY){progress=readProgress();if(host?.getClientRects().length)renderRoute(location.hash);}});

  window.VV_LEARN = Object.freeze({setup, renderRoute, capture: captureInputs, currentRoute: () => lastRoute, linksForQuestion: id => (reverseMap.get(String(id)) || []).slice(0,3).map(lesson => ({id:lesson.id,title:lesson.title,chapterTitle:lesson.chapter.title,href:href(lesson)})), questionIds: () => current ? relatedQuestions(current).map(q => q.id) : [], stats: () => ({chapters:chapters.length,lessons:lessons.length,topics:allGroups().length,linkedQuestions:reverseMap.size,read:countRead(lessons)})});
})();
