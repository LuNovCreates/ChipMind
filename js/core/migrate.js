/* ════════════════════════════════════════════════════
   ChipMind — migrate.js
   Système de versioning automatique des données.

   Au boot, runMigrations() compare APP_DATA_VERSION
   (constante en code) avec la version stockée en IDB.

   Stratégies :
   ┌─ null            → première install / ancienne install sans versioning
   │                    → on stamp la version, on garde les données
   ├─ === actuelle    → rien à faire
   ├─ < actuelle      → tenter la chaîne MIGRATIONS
   │    OK  → stamp + retourne { action:'migrated', from, to }
   │    KO  → _doReset() (IDB + localStorage effacés, reload)
   └─ > actuelle      → downgrade impossible → _doReset()

   Pour ajouter une migration compatible (v N → v N+1) :
     1. Incrémenter APP_DATA_VERSION
     2. Pousser une fonction async dans MIGRATIONS
        (MIGRATIONS[0] = v1→v2, MIGRATIONS[1] = v2→v3, …)
   Pour un changement incompatible :
     1. Incrémenter APP_DATA_VERSION
     2. Ne pas ajouter de fonction MIGRATIONS → reset automatique
════════════════════════════════════════════════════ */

import { get, set, resetData } from './storage.js';

export const APP_DATA_VERSION = 3;

const VERSION_KEY = 'appDataVersion';

/* ── Chaîne de migrations ───────────────────────────
   MIGRATIONS[i] gère le passage v(i+1) → v(i+2).
   Actuellement vide : v1/v2 → v3 est un reset incompatible.
   Les nouvelles migrations depuis v3 s'ajouteront ici. */
const MIGRATIONS = [];

/* ── API publique ───────────────────────────────── */

export async function runMigrations() {
  const stored = await get(VERSION_KEY);

  /* Première installation OU ancienne install sans versioning */
  if (stored === null) {
    _cleanLegacyLocalStorage();
    await set(VERSION_KEY, APP_DATA_VERSION);
    return { action: 'none' };
  }

  /* Déjà à jour */
  if (stored === APP_DATA_VERSION) return { action: 'none' };

  /* Downgrade — impossible en pratique, incompatible */
  if (stored > APP_DATA_VERSION) {
    await _doReset();
    return; /* unreachable — _doReset recharge la page */
  }

  /* Upgrade — tenter la chaîne */
  return _runChain(stored);
}

/* ── Interne ────────────────────────────────────── */

async function _runChain(from) {
  try {
    for (let v = from; v < APP_DATA_VERSION; v++) {
      const fn = MIGRATIONS[v - 1]; /* MIGRATIONS[0] = v1→v2 */
      if (typeof fn !== 'function') {
        throw new Error(`Pas de migration définie pour v${v} → v${v + 1}`);
      }
      await fn();
    }
    await set(VERSION_KEY, APP_DATA_VERSION);
    return { action: 'migrated', from, to: APP_DATA_VERSION };
  } catch (err) {
    console.warn('[ChipMind] Migration échouée → reset complet :', err);
    await _doReset();
    /* unreachable */
  }
}

async function _doReset() {
  await resetData();
  /* Flag lu après rechargement pour afficher un toast */
  localStorage.setItem('chipmind_reset_flag', '1');
  window.location.reload();
}

function _cleanLegacyLocalStorage() {
  ['chipmind_progress', 'chipmind_settings', 'chipmind_history', 'chipmind_achievements']
    .forEach(k => localStorage.removeItem(k));
}
