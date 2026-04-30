/* ════════════════════════════════════════════════════
   ChipMind — app.js (core)
   Bootstrap : enregistrement SW, hydratation state,
   démarrage du router.
════════════════════════════════════════════════════ */

import { hydrate, snapshot } from './state.js';
import { get as dbGet, set as dbSet } from './storage.js';
import { init as routerInit } from './router.js';
import { cleanLegacyStorage } from './migrate.js';

export async function init() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err =>
        console.warn('[ChipMind] SW registration failed:', err)
      );
    });
  }

  await cleanLegacyStorage();

  try {
    const saved = await dbGet('state');
    if (saved) hydrate(saved);
  } catch (err) {
    console.warn('[ChipMind] State load failed, using defaults:', err);
  }

  routerInit();
}

/* Persiste le state courant dans IndexedDB */
export async function persist() {
  try {
    await dbSet('state', snapshot());
  } catch (err) {
    console.warn('[ChipMind] State persist failed:', err);
  }
}
