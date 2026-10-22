/* Local tools: temporary session state by default; persistent drafts are opt-in. */
(() => {
  'use strict';
  const CHOICE = 'sleech-privacy-v1', LIFE = 180 * 864e5;
  const DRAFTS = ['slich-brief-v1', 'slich-case-v2'];
  const memory = new Map();
  let preference = null;
  try {
    const p = JSON.parse(localStorage.getItem(CHOICE) || 'null');
    if (p?.version === 1 && typeof p.persistent === 'boolean' && Number.isFinite(p.at) && p.at <= Date.now() && Date.now() - p.at < LIFE) preference = p;
  } catch {}
  const temporary = {
    getItem(key) { try { return sessionStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } },
    setItem(key, value) { memory.set(key, String(value)); try { sessionStorage.setItem(key, String(value)); } catch {} },
    removeItem(key) { memory.delete(key); try { sessionStorage.removeItem(key); } catch {} }
  };
  const api = {
    get persistent() { return preference?.persistent === true; },
    get chosen() { return preference !== null; },
    session: temporary,
    drafts: {
      getItem(key) {
        if (!DRAFTS.includes(key)) return null;
        if (api.persistent) return localStorage.getItem(key) ?? temporary.getItem('sleech-temp-' + key);
        return temporary.getItem('sleech-temp-' + key);
      },
      setItem(key, value) {
        if (!DRAFTS.includes(key)) throw new Error('Unknown draft');
        if (api.persistent) localStorage.setItem(key, String(value));
        else temporary.setItem('sleech-temp-' + key, value);
      },
      removeItem(key) {
        if (!DRAFTS.includes(key)) return;
        localStorage.removeItem(key);
        temporary.removeItem('sleech-temp-' + key);
      }
    },
    choose(persistent) {
      preference = { version: 1, persistent: persistent === true, at: Date.now() };
      let saved = true;
      try { localStorage.setItem(CHOICE, JSON.stringify(preference)); } catch { saved = false; }
      if (api.persistent) {
        for (const key of DRAFTS) {
          const draft = temporary.getItem('sleech-temp-' + key);
          if (draft !== null) { try { localStorage.setItem(key, draft); } catch { saved = false; } }
        }
      }
      // Existing saved files are deliberately retained when persistence is disabled.
      window.dispatchEvent(new CustomEvent('sleech:privacy', { detail: { persistent: api.persistent, saved } }));
      return saved;
    }
  };
  window.SleechData = api;
})();
