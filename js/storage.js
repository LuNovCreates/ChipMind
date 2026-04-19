/* ═══════════════════════════════════════════════════════════════
   ChipMind — storage.js
   Gestion localStorage : progression, paramètres, historique
═══════════════════════════════════════════════════════════════ */

const Storage = (() => {

  const KEYS = {
    PROGRESS:     'chipmind_progress',
    SETTINGS:     'chipmind_settings',
    HISTORY:      'chipmind_history',
    ACHIEVEMENTS: 'chipmind_achievements',
  };

  /* ─────────────────────────────────────────────────────────
     MODES PAR MODULE
     Définit le nombre de modes de chaque module.
     Utilisé pour calculer la moyenne de la jauge dashboard.
     Mis à jour au fur et à mesure que les modules sont créés.
  ───────────────────────────────────────────────────────── */
  const MODULE_MODES = {
    1:  ['flashcard', 'qcm', 'libre'],   // Tables Croupier
    2:  ['normal'],                       // Tableau mélangé
    3:  ['montee', 'descente', 'allerretour'], // Comptage Cartes
    4:  ['grille1', 'grille2'],           // Grilles de Calcul
    5:  ['plein', 'cheval', 'carre'],     // Paiements Roulette
    6:  ['multi'],                        // Multi-joueurs
    7:  ['chrono'],                       // Chrono 90s
    8:  ['suite'],                        // Suites Logiques
    9:  ['memo'],                         // Mémoire Séquence
    10: ['cascade'],                      // Additions en Cascade
  };

  /* ── Helper : génère un objet levelScores vide pour un module ── */
  function makeEmptyLevelScores(moduleId) {
    const modes   = MODULE_MODES[moduleId] || ['default'];
    const modeObj = {};
    modes.forEach(m => { modeObj[m] = 0; });
    return {
      beginner:     { ...modeObj },
      intermediate: { ...modeObj },
      expert:       { ...modeObj },
    };
  }

  /* ── Valeurs par défaut ── */
  const DEFAULT_SETTINGS = {
    level:       'beginner',
    soundVolume: 50,   // 0-100 (0 = muet)
    musicVolume: 0,    // 0-100 (0 = muet / off par défaut)
    haptic:      true,
    animations:  true,
  };

  /* Génère DEFAULT_PROGRESS dynamiquement */
  function makeDefaultProgress() {
    const p = {};
    for (let i = 1; i <= 10; i++) {
      p[i] = {
        stars:       0,
        bestTime:    null,
        sessions:    0,
        unlocked:    i <= 5,    // modules 1-5 débloqués par défaut
        levelScores: makeEmptyLevelScores(i),
      };
    }
    return p;
  }

  /* ─────────────────────────────────────────────────────────
     PARAMÈTRES
  ───────────────────────────────────────────────────────── */

  function getSettings() {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  function updateSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    saveSettings(s);
    return s;
  }

  /* ─────────────────────────────────────────────────────────
     PROGRESSION — lecture avec migration automatique
  ───────────────────────────────────────────────────────── */

  function getProgress() {
    try {
      const raw      = localStorage.getItem(KEYS.PROGRESS);
      const defaults = makeDefaultProgress();
      if (!raw) return defaults;

      const saved = JSON.parse(raw);

      /* Fusion profonde : préserve les levelScores existants,
         ajoute les champs manquants sans écraser les données */
      const merged = { ...defaults };
      for (let i = 1; i <= 10; i++) {
        if (saved[i]) {
          merged[i] = {
            ...defaults[i],
            ...saved[i],
            /* S'assure que levelScores existe et a tous les niveaux */
            levelScores: mergeLevelScores(defaults[i].levelScores, saved[i].levelScores),
          };
        }
      }
      return merged;
    } catch { return makeDefaultProgress(); }
  }

  /* Fusionne levelScores sauvegardé avec la structure par défaut */
  function mergeLevelScores(defaultLS, savedLS) {
    if (!savedLS) return { ...defaultLS };
    const result = {};
    ['beginner', 'intermediate', 'expert'].forEach(lvl => {
      result[lvl] = { ...defaultLS[lvl], ...(savedLS[lvl] || {}) };
    });
    return result;
  }

  function saveProgress(progress) {
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  }

  /* ─────────────────────────────────────────────────────────
     updateModuleProgress — appelé via app.js endSession()
     Sauvegarde étoiles, bestTime, sessions
  ───────────────────────────────────────────────────────── */
  function updateModuleProgress(moduleId, result) {
    const prog = getProgress();
    const mod  = prog[moduleId] || {};

    mod.sessions  = (mod.sessions || 0) + 1;
    mod.stars     = Math.max(mod.stars || 0, result.stars || 0);

    if (result.time !== undefined && result.time !== null) {
      mod.bestTime = (mod.bestTime === null || mod.bestTime === undefined)
        ? result.time
        : Math.min(mod.bestTime, result.time);
    }

    /* S'assure que levelScores est initialisé */
    if (!mod.levelScores) mod.levelScores = makeEmptyLevelScores(moduleId);

    prog[moduleId] = mod;

    /* Débloque le module suivant si ≥1 étoile */
    if ((result.stars || 0) >= 1 && moduleId < 10) {
      if (prog[moduleId + 1]) prog[moduleId + 1].unlocked = true;
    }

    saveProgress(prog);
    return prog;
  }

  /* ─────────────────────────────────────────────────────────
     updateModuleScore — appelé par chaque module en fin de session
     Sauvegarde le meilleur score par mode ET par niveau.

     @param {number} moduleId
     @param {string} level    — 'beginner' | 'intermediate' | 'expert'
     @param {string} mode     — ex. 'flashcard' | 'qcm' | 'libre'
     @param {number} rate     — 0–100 (taux de réussite de la session)
  ───────────────────────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────────────────
     getModuleBarPct — calcule le pourcentage pour la jauge dashboard
     Formule : somme des meilleurs scores par mode / nombre total de modes

     Modes non joués = 0, ce qui tire la moyenne vers le bas
     intentionnellement (encourage à jouer tous les modes).

     @param {number} moduleId
     @param {string} level    — niveau actif dans les paramètres
     @returns {number}        — 0 à 100
  ───────────────────────────────────────────────────────── */
  function getModuleBarPct(moduleId, level) {
    const prog  = getProgress();
    const mod   = prog[moduleId];
    const modes = MODULE_MODES[moduleId] || ['default'];

    if (!mod || !mod.levelScores || !mod.levelScores[level]) return 0;

    const levelData = mod.levelScores[level];
    const total     = modes.reduce((sum, m) => sum + (levelData[m] || 0), 0);
    return Math.round(total / modes.length);
  }

  /* ─────────────────────────────────────────────────────────
     HISTORIQUE
  ───────────────────────────────────────────────────────── */

  function getHistory() {
    try {
      const raw = localStorage.getItem(KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift({ ...entry, date: entry.date || new Date().toISOString() });
    if (history.length > 100) history.splice(100);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    return history;
  }

  /* ─────────────────────────────────────────────────────────
     SUCCÈS
  ───────────────────────────────────────────────────────── */

  function getAchievements() {
    try {
      const raw = localStorage.getItem(KEYS.ACHIEVEMENTS);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function unlockAchievement(id) {
    const ach = getAchievements();
    if (ach[id]) return false;
    ach[id] = { unlockedAt: new Date().toISOString() };
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(ach));
    return true;
  }

  /* ─────────────────────────────────────────────────────────
     STATS GLOBALES
  ───────────────────────────────────────────────────────── */

  /**
   * Nombre d'étoiles minimum pour valider un module selon le niveau.
   * Débutant → 1★  |  Intermédiaire → 2★★  |  Expert → 3★★★
   */
  const STARS_REQUIRED = { beginner: 1, intermediate: 2, expert: 3 };

  /**
   * Retourne le nombre de modules validés pour un niveau donné.
   * @param {string} level — 'beginner' | 'intermediate' | 'expert'
   */
  function getCompletedModsForLevel(level) {
    const prog     = getProgress();
    const required = STARS_REQUIRED[level] || 1;
    return Object.values(prog).filter(m => (m.stars || 0) >= required).length;
  }

  function getGlobalStats() {
    const prog     = getProgress();
    const ach      = getAchievements();
    const settings = getSettings();

    const modules       = Object.values(prog);
    const totalStars    = modules.reduce((s, m) => s + (m.stars || 0), 0);
    const maxStars      = modules.length * 3;
    const totalSessions = modules.reduce((s, m) => s + (m.sessions || 0), 0);
    const unlockedAch   = Object.keys(ach).length;

    /* completedMods dépend du niveau actif */
    const completedMods = getCompletedModsForLevel(settings.level);

    return {
      totalStars,
      maxStars,
      completedMods,
      totalModules: modules.length,
      totalSessions,
      progressPct: Math.round((totalStars / maxStars) * 100),
      unlockedAchievements: unlockedAch,
    };
  }

  /* ─────────────────────────────────────────────────────────
     RESET
  ───────────────────────────────────────────────────────── */

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  /* ── API publique ── */
  return {
    getSettings,
    saveSettings,
    updateSetting,
    getProgress,
    updateModuleProgress,
    updateModuleScore,
    getModuleBarPct,
    getCompletedModsForLevel,  // ← nouveau
    getHistory,
    addHistoryEntry,
    getAchievements,
    unlockAchievement,
    getGlobalStats,
    MODULE_MODES,
    resetAll,
  };

})();

window.ChipMindStorage = Storage;
