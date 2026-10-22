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
})();
