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
    setItem(key, value) { memory.set(key, String(value)); try { sessionStorage.setItem(key, String(value)); return true; } catch { return false; } },
    removeItem(key) { memory.delete(key); try { sessionStorage.removeItem(key); return true; } catch { return false; } }
  };
  const api = {
    get persistent() { return preference?.persistent === true; },
    get chosen() { return preference !== null; },
    session: temporary,
    drafts: {
      getItem(key) {
        if (!DRAFTS.includes(key)) return null;
        if (api.persistent) { try { return localStorage.getItem(key) ?? temporary.getItem('sleech-temp-' + key); } catch { return temporary.getItem('sleech-temp-' + key); } }
        return temporary.getItem('sleech-temp-' + key);
      },
      setItem(key, value) {
        if (!DRAFTS.includes(key)) throw new Error('Unknown draft');
        if (api.persistent) {
          try { localStorage.setItem(key, String(value)); temporary.removeItem('sleech-temp-' + key); }
          catch (err) { temporary.setItem('sleech-temp-' + key, value); throw err; }
        } else if (!temporary.setItem('sleech-temp-' + key, value)) throw new Error('storage');
      },
      removeItem(key) {
        if (!DRAFTS.includes(key)) return;
        let error=null;
        try { localStorage.removeItem(key); } catch (err) { error=err; }
        const removed=temporary.removeItem('sleech-temp-' + key);
        if(error||!removed)throw error||new Error('storage');
      }
    },
    choose(persistent) {
      const wasPersistent=api.persistent;
      // Continue the latest saved draft when moving back to a tab session.
      if (wasPersistent && persistent !== true) for (const key of DRAFTS) {
        try { const draft=localStorage.getItem(key); if(draft!==null)temporary.setItem('sleech-temp-'+key,draft); } catch {}
      }
      preference = { version: 1, persistent: persistent === true, at: Date.now() };
      let saved = true;
      try { localStorage.setItem(CHOICE, JSON.stringify(preference)); } catch { saved = false; }
      if (api.persistent) {
        for (const key of DRAFTS) {
          const draft = temporary.getItem('sleech-temp-' + key);
          if (draft !== null) { try { localStorage.setItem(key, draft); temporary.removeItem('sleech-temp-'+key); } catch { saved = false; } }
        }
      }
      // Existing saved files are deliberately retained when persistence is disabled.
      window.dispatchEvent(new CustomEvent('sleech:privacy', { detail: { persistent: api.persistent, saved } }));
      return saved;
    },
    clearSaved() {
      let ok=true;
      for(const key of DRAFTS){try{api.drafts.removeItem(key);}catch{ok=false;}}
      const keys=new Set([...memory.keys()].filter(k=>k.startsWith('slich-page-v2-')));
      try { for(let i=0;i<sessionStorage.length;i++){const key=sessionStorage.key(i);if(key?.startsWith('slich-page-v2-'))keys.add(key);} } catch { ok=false; }
      for(const key of keys)if(!temporary.removeItem(key))ok=false;
      window.dispatchEvent(new CustomEvent('sleech:cleared'));
      return ok;
    }
  };
  window.SleechData = api;
})();
