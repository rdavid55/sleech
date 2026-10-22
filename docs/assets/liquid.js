(() => {
  'use strict';
  const en = document.documentElement.lang === 'en', t = (ru, eng) => en ? eng : ru;
  const panel = document.getElementById('privacy-panel'), privacy = window.SleechData;
  let returnFocus = null;
  const openPrivacy = e => {
    returnFocus = e?.currentTarget || document.activeElement;
    panel.hidden = false;
    panel.querySelector('button').focus({ preventScroll: true });
  };
  document.querySelectorAll('[data-privacy-settings]').forEach(b => b.addEventListener('click', openPrivacy));
  if (panel) {
    panel.hidden = privacy.chosen;
    panel.querySelectorAll('[data-privacy-choice]').forEach(b => b.addEventListener('click', () => {
      const saved = privacy.choose(b.dataset.privacyChoice === 'persistent');
      panel.hidden = true;
      const status = document.getElementById('privacy-status');
      status.textContent = saved ? t('Настройки данных сохранены.', 'Data preferences saved.') : t('Выбор действует сейчас. Память браузера недоступна.', 'Your choice applies now. Browser storage is unavailable.');
      returnFocus?.focus?.({ preventScroll: true });
    }));
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { privacy.choose(false); panel.hidden = true; returnFocus?.focus?.(); }
    });
  }
  document.querySelectorAll('[data-clear-local]').forEach(b => b.addEventListener('click', () => {
    let ok = true;
    for (const key of ['slich-brief-v1', 'slich-case-v2']) { try { privacy.drafts.removeItem(key); } catch { ok = false; } }
    document.getElementById('data-clear-status').textContent = ok ? t('Сохранённые черновик и кейс удалены с устройства. Открытые поля остаются до закрытия страницы.', 'Saved brief and case removed from this device. Open fields remain until this page is closed.') : t('Память браузера недоступна. Удалите данные сайта в настройках браузера.', 'Browser storage is unavailable. Clear site data in your browser settings.');
  }));
  const tabs = [...document.querySelectorAll('[data-lens-step]')];
  const stepCopy = en ? [
    ['One shared method', 'Object, points, conditions and method version.'],
    ['Traceable raw data', 'Keep the original series, units and instruments.'],
    ['A specialist’s review', 'Check the comparison before making a decision.']
  ] : [
    ['Один общий метод', 'Объект, точки, условия и версия метода.'],
    ['Проверяемые данные', 'Исходные серии, единицы и средства измерений.'],
    ['Разбор с метрологом', 'Проверяем сравнение до принятия решения.']
  ];
  const setStep = i => {
    tabs.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    document.getElementById('lens-title').textContent = stepCopy[i][0];
    document.getElementById('lens-description').textContent = stepCopy[i][1];
    document.querySelector('.liquid-scene')?.setAttribute('data-step', String(i));
  };
  tabs.forEach((b, i) => b.addEventListener('click', () => setStep(i)));
  const scene = document.querySelector('.liquid-scene');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (scene && !reduced.matches && matchMedia('(pointer:fine)').matches) {
    let frame = 0, px = 50, py = 50;
    scene.addEventListener('pointermove', e => {
      const r = scene.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width * 100;
      py = (e.clientY - r.top) / r.height * 100;
      if (!frame) frame = requestAnimationFrame(() => {
        scene.style.setProperty('--lx', px + '%'); scene.style.setProperty('--ly', py + '%');
        scene.style.setProperty('--rx', (py - 50) * -.06 + 'deg'); scene.style.setProperty('--ry', (px - 50) * .08 + 'deg');
        frame = 0;
      });
    });
    scene.addEventListener('pointerleave', () => { scene.style.setProperty('--rx', '0deg'); scene.style.setProperty('--ry', '0deg'); });
  }
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('motion-paused', document.hidden));

  // Keep a single, semantic table for desktop, print and compact phone cards.
  // The observer also handles calculator rows and reports created after a CSV import.
  const main = document.querySelector('main');
  const updateScroll = box => {
    const scrolls = box.scrollWidth > box.clientWidth + 2;
    const hint = box.nextElementSibling;
    if (hint?.classList.contains('table-hint')) hint.hidden = !scrolls;
    if (scrolls) {
      box.tabIndex = 0;
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', t('Таблица с горизонтальной прокруткой', 'Horizontally scrollable table'));
    } else {
      box.removeAttribute('tabindex');
      box.removeAttribute('role');
      box.removeAttribute('aria-label');
    }
  };
  const tableResize = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(e => updateScroll(e.target))) : null;
  const decorateTables = () => {
    main?.querySelectorAll('table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')].map(th => {
        th.scope = 'col';
        th.setAttribute('role', 'columnheader');
        return th.textContent.trim();
      });
      if (!headers.length) return;
      const mode = table.closest('#raw-preview') ? 'scroll' : table.closest('.sample-workspace') ? 'compact' : 'cards';
      table.dataset.responsive = mode;
      table.setAttribute('role', 'table');
      table.querySelectorAll('thead,tbody,tfoot').forEach(group => group.setAttribute('role', 'rowgroup'));
      table.querySelectorAll('tr').forEach(row => row.setAttribute('role', 'row'));
      table.querySelectorAll('tbody tr').forEach(row => [...row.cells].forEach((cell, index) => {
        cell.setAttribute('role', 'cell');
        if (mode === 'scroll' || cell.querySelector(':scope > .cell-value')) return;
        const value = document.createElement('span');
        value.className = 'cell-value';
        while (cell.firstChild) value.append(cell.firstChild);
        if (/^[+−-]?[\d\s.,\u00a0]+\s*(?:%|mm|мм|RUB|₽)?$/.test(value.textContent.trim())) value.classList.add('cell-number');
        const label = document.createElement('span');
        label.className = 'cell-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = headers[index] || '';
        cell.append(label, value);
      }));
      const box = table.closest('.table-scroll');
      if (!box) return;
      box.classList.toggle('table-cards', mode === 'cards');
      if (!box.dataset.scrollReady) {
        box.dataset.scrollReady = 'true';
        const hint = document.createElement('p');
        hint.className = 'table-hint small';
        hint.textContent = t('↔ Проведите по таблице, чтобы увидеть остальные столбцы.', '↔ Swipe across the table to see the remaining columns.');
        box.after(hint);
        tableResize?.observe(box);
      }
      updateScroll(box);
    });
  };
  let tablesFrame = 0;
  const scheduleTables = () => {
    if (!tablesFrame) tablesFrame = requestAnimationFrame(() => { tablesFrame = 0; decorateTables(); });
  };
  decorateTables();
  if (main) new MutationObserver(scheduleTables).observe(main, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleTables, { passive: true });
})();
