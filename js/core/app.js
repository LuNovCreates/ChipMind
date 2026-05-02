/* ════════════════════════════════════════════════════
   ChipMind — app.js (core)
   Bootstrap : enregistrement SW, versioning/migration,
   hydratation state, démarrage du router.
════════════════════════════════════════════════════ */

import { hydrate, snapshot } from './state.js';
import { get as dbGet, set as dbSet } from './storage.js';
import { init as routerInit } from './router.js';
import { runMigrations } from './migrate.js';

export async function init() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err =>
        console.warn('[ChipMind] SW registration failed:', err)
      );
    });
  }

  /* Versioning : migration ou reset si nécessaire.
     En cas de reset incompatible, _doReset() recharge la page
     → cette ligne ne retourne jamais dans ce cas. */
  const migration = await runMigrations();

  try {
    const saved = await dbGet('state');
    if (saved) hydrate(saved);
  } catch (err) {
    console.warn('[ChipMind] State load failed, using defaults:', err);
  }

  routerInit();
  return migration;
}

/* Persiste le state courant dans IndexedDB */
export async function persist() {
  try {
    await dbSet('state', snapshot());
  } catch (err) {
    console.warn('[ChipMind] State persist failed:', err);
  }
}
