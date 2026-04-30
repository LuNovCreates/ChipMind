/* ════════════════════════════════════════════════════
   ChipMind — state.js
   Source de vérité unique. Ne jamais muter _data directement.
════════════════════════════════════════════════════ */

export const DEFAULT = {
  settings: {
    difficulty:  'beginner',
    soundVolume: 0.8,
    musicVolume: 0.5,
    vibration:   true,
  },
  progress: {
    module01: {}, module02: {}, module03: {}, module04: {}, module05: {},
    module06: {}, module07: {}, module08: {}, module09: {}, module10: {},
    learningTables: {},
  },
  history:      [],
  achievements: [],
  stats: {
    totalStars:    0,
    totalSessions: 0,
  },
};

let _data = structuredClone(DEFAULT);

/* Lecture par chemin pointé : get('settings.difficulty') */
export function get(path) {
  if (!path) return _data;
  return path.split('.').reduce((o, k) => o?.[k], _data);
}

/* Écriture par chemin pointé : set('settings.difficulty', 'expert') */
export function set(path, value) {
  const keys = path.split('.');
  let node = _data;
  for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
  node[keys[keys.length - 1]] = value;
}

/* Restauration depuis IndexedDB — fusion profonde avec les defaults */
export function hydrate(saved) {
  _data = {
    ...DEFAULT,
    ...saved,
    settings: { ...DEFAULT.settings,  ...(saved.settings  || {}) },
    progress: { ...DEFAULT.progress,  ...(saved.progress  || {}) },
    stats:    { ...DEFAULT.stats,     ...(saved.stats     || {}) },
    history:      Array.isArray(saved.history)      ? saved.history      : [],
    achievements: Array.isArray(saved.achievements) ? saved.achievements : [],
  };
}

/* Copie profonde pour persistance */
export function snapshot() {
  return structuredClone(_data);
}

export function reset() {
  _data = structuredClone(DEFAULT);
}
