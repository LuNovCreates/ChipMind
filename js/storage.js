/* ════════════════════════════════════════════════════
   ChipMind — storage.js (legacy compat layer)
   API synchrone conservée ; données stockées dans
   IndexedDB (clé "legacy_state") avec cache mémoire.
   localStorage est en lecture de secours uniquement.
════════════════════════════════════════════════════ */

const Storage = (() => {

  /* ── Modes par module (source de vérité pour la jauge) ── */
  const MODULE_MODES = {
    1:  ['flashcard', 'qcm', 'libre'],
    2:  ['normal'],
    3:  ['montee', 'descente', 'allerretour'],
    4:  ['grille1', 'grille2'],
    5:  ['beginner', 'intermediate', 'expert'],
    6:  ['multi'],
    7:  ['chrono'],
    8:  ['suite'],
    9:  ['memo'],
    10: ['cascade'],
  };

  function makeEmptyLevelScores(moduleId) {
    const modes   = MODULE_MODES[moduleId] || ['default'];
    const modeObj = {};
    modes.forEach(m => { modeObj[m] = 0; });
    return { beginner: { ...modeObj }, intermediate: { ...modeObj }, expert: { ...modeObj } };
  }

  const DEFAULT_SETTINGS = {
    level: 'beginner', soundVolume: 50, musicVolume: 0, haptic: true, animations: true,
  };

  function makeDefaultProgress() {
    const p = {};
    for (let i = 1; i <= 10; i++) {
      p[i] = {
        stars: 0, bestTime: null, sessions: 0,
        unlocked: i <= 5,
        levelScores:   makeEmptyLevelScores(i),
        starsPerLevel: { beginner: 0, intermediate: 0, expert: 0 },
      };
    }
    return p;
  }

  function mergeStarsPerLevel(saved) {
    const def = { beginner: 0, intermediate: 0, expert: 0 };
    if (!saved || typeof saved !== 'object') return def;
    return {
      beginner:     Math.max(0, Math.min(3, saved.beginner     || 0)),
      intermediate: Math.max(0, Math.min(3, saved.intermediate || 0)),
      expert:       Math.max(0, Math.min(3, saved.expert       || 0)),
    };
  }

  function mergeLevelScores(defaultLS, savedLS) {
    if (!savedLS) return { ...defaultLS };
    const result = {};
    ['beginner', 'intermediate', 'expert'].forEach(lvl => {
      result[lvl] = { ...defaultLS[lvl], ...(savedLS[lvl] || {}) };
    });
    return result;
  }

  /* ── Cache mémoire ── */
  let _data = { settings: null, progress: null, history: null, achievements: null };

  /* ── IndexedDB (partage la même DB que js/core/storage.js) ── */
  let _db = null;

  function _openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('ChipMindDB', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  function _idbGet(key) {
    return _openDB().then(db => new Promise((res, rej) => {
      const r = db.transaction('kv', 'readonly').objectStore('kv').get(key);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror   = e => rej(e.target.error);
    }));
  }

  function _idbSet(key, value) {
    return _openDB().then(db => new Promise((res, rej) => {
      const r = db.transaction('kv', 'readwrite').objectStore('kv').put(value, key);
      r.onsuccess = () => res();
      r.onerror   = e => rej(e.target.error);
    }));
  }

  /* Persiste le cache → IDB (fire-and-forget) */
  function _persist() {
    _idbSet('legacy_state', {
      settings:     _data.settings,
      progress:     _data.progress,
      history:      _data.history,
      achievements: _data.achievements,
    }).catch(err => console.warn('[Storage] persist failed:', err));
  }

  /* ──────────────────────────────────────────────────────────
     initAsync() — à appeler une seule fois avant tout accès.
     Charge depuis IDB ; repli sur localStorage si IDB vide.
  ────────────────────────────────────────────────────────── */
  async function initAsync() {
    try {
      const saved = await _idbGet('legacy_state');
      if (saved) {
        _data.settings     = saved.settings     ?? null;
        _data.progress     = saved.progress     ?? null;
        _data.history      = saved.history      ?? null;
        _data.achievements = saved.achievements ?? null;
        return;
      }
    } catch {}

    /* Repli localStorage (données pré-migration) */
    function _p(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
    _data.settings     = _p('chipmind_settings');
    _data.progress     = _p('chipmind_progress');
    _data.history      = _p('chipmind_history');
    _data.achievements = _p('chipmind_achievements');
  }

  /* ── Paramètres ── */

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...(_data.settings || {}) };
  }

  function saveSettings(settings) {
    _data.settings = { ...settings };
    _persist();
  }

  function updateSetting(key, value) {
    const s = getSettings();
    s[key]  = value;
    _data.settings = s;
    _persist();
    return s;
  }

  /* ── Progression ── */

  function getProgress() {
    try {
      const defaults = makeDefaultProgress();
      if (!_data.progress) return defaults;
      const saved  = _data.progress;
      const merged = { ...defaults };
      for (let i = 1; i <= 10; i++) {
        if (saved[i]) {
          merged[i] = {
            ...defaults[i], ...saved[i],
            levelScores:   mergeLevelScores(defaults[i].levelScores, saved[i].levelScores),
            starsPerLevel: mergeStarsPerLevel(saved[i].starsPerLevel),
          };
        }
      }
      return merged;
    } catch { return makeDefaultProgress(); }
  }

  function saveProgress(progress) {
    _data.progress = { ...progress };
    _persist();
  }

  function updateModuleProgress(moduleId, result) {
    const prog  = getProgress();
    const mod   = prog[moduleId] || {};
    const level = getSettings().level || 'beginner';

    mod.sessions = (mod.sessions || 0) + 1;
    mod.stars    = Math.max(mod.stars || 0, result.stars || 0);

    if (result.time !== undefined && result.time !== null) {
      mod.bestTime = (mod.bestTime == null)
        ? result.time
        : Math.min(mod.bestTime, result.time);
    }

    if (!mod.levelScores)   mod.levelScores   = makeEmptyLevelScores(moduleId);
    if (!mod.starsPerLevel) mod.starsPerLevel  = { beginner: 0, intermediate: 0, expert: 0 };
    mod.starsPerLevel[level] = Math.max(mod.starsPerLevel[level] || 0, result.stars || 0);

    prog[moduleId] = mod;

    if ((result.stars || 0) >= 1 && moduleId < 10) {
      if (prog[moduleId + 1]) prog[moduleId + 1].unlocked = true;
    }

    saveProgress(prog);
    return prog;
  }

  function updateModuleScore(moduleId, level, mode, rate) {
    const prog = getProgress();
    const mod  = prog[moduleId] || {};

    if (!mod.levelScores)        mod.levelScores = makeEmptyLevelScores(moduleId);
    if (!mod.levelScores[level]) mod.levelScores[level] = {};

    const current = mod.levelScores[level][mode] || 0;
    mod.levelScores[level][mode] = Math.max(current, Math.round(rate));

    prog[moduleId] = mod;
    saveProgress(prog);
    return mod.levelScores[level];
  }

  function getModuleBarPct(moduleId, level) {
    const prog  = getProgress();
    const mod   = prog[moduleId];
    const modes = MODULE_MODES[moduleId] || ['default'];
    if (!mod || !mod.levelScores || !mod.levelScores[level]) return 0;
    const levelData = mod.levelScores[level];
    const total     = modes.reduce((sum, m) => sum + (levelData[m] || 0), 0);
    return Math.round(total / modes.length);
  }

  /* ── Historique ── */

  function getHistory() {
    return Array.isArray(_data.history) ? [..._data.history] : [];
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift({ ...entry, date: entry.date || new Date().toISOString() });
    if (history.length > 100) history.splice(100);
    _data.history = history;
    _persist();
    return history;
  }

  /* ── Succès ── */

  function getAchievements() {
    return { ...(_data.achievements || {}) };
  }

  function unlockAchievement(id) {
    const ach = getAchievements();
    if (ach[id]) return false;
    ach[id] = { unlockedAt: new Date().toISOString() };
    _data.achievements = ach;
    _persist();
    return true;
  }

  /* ── Stats globales ── */

  const MAX_STARS = 90; // 10 modules × 3 difficultés × 3 étoiles

  function getCompletedModsForLevel(level) {
    const prog = getProgress();
    return Object.values(prog).filter(m => {
      const spl = m.starsPerLevel;
      if (spl) return (spl[level] || 0) >= 3;
      return (m.stars || 0) >= 3; // rétrocompat
    }).length;
  }

  function getGlobalStats() {
    const prog     = getProgress();
    const ach      = getAchievements();
    const settings = getSettings();
    const modules  = Object.values(prog);

    const totalStars = modules.reduce((s, m) => {
      const spl = m.starsPerLevel;
      if (spl) return s + (spl.beginner || 0) + (spl.intermediate || 0) + (spl.expert || 0);
      return s + (m.stars || 0); // rétrocompat sans starsPerLevel
    }, 0);

    const totalSessions = modules.reduce((s, m) => s + (m.sessions || 0), 0);
    const completedMods = getCompletedModsForLevel(settings.level);

    return {
      totalStars, maxStars: MAX_STARS, completedMods,
      totalModules: modules.length, totalSessions,
      progressPct: Math.round((totalStars / MAX_STARS) * 100),
      unlockedAchievements: Object.keys(ach).length,
    };
  }

  /* ── Réinitialisation complète ── */

  function resetAll() {
    _data = { settings: null, progress: null, history: null, achievements: null };
    _db   = null;
    indexedDB.deleteDatabase('ChipMindDB');
    localStorage.clear();
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
  }

  /* ── API publique ── */
  return {
    initAsync,
    getSettings, saveSettings, updateSetting,
    getProgress, updateModuleProgress, updateModuleScore,
    getModuleBarPct, getCompletedModsForLevel,
    getHistory, addHistoryEntry,
    getAchievements, unlockAchievement,
    getGlobalStats,
    MODULE_MODES,
    resetAll,
  };

})();

window.ChipMindStorage = Storage;
