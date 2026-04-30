/* ════════════════════════════════════════════════════
   ChipMind — migrate.js
   Nettoyage one-shot des données localStorage legacy.
   Appelé au démarrage via app.js avant tout accès state.
════════════════════════════════════════════════════ */

import { get as dbGet, set as dbSet } from './storage.js';

const LEGACY_KEYS = [
  'chipmind_progress',
  'chipmind_settings',
  'chipmind_history',
  'chipmind_achievements',
];

export async function cleanLegacyStorage() {
  /* Cas 1 : déjà nettoyé → court-circuit immédiat */
  if (await dbGet('migrated_v1')) return;

  /* Cas 2 : nouvelle installation propre → rien à faire */
  const hasLegacy = LEGACY_KEYS.some(k => localStorage.getItem(k) !== null);
  if (!hasLegacy) return;

  /* Cas 3 : données legacy présentes → supprimer sans lire */
  LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
  await dbSet('migrated_v1', true);
}
