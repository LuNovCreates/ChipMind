/* ════════════════════════════════════════════════════
   ChipMind — gameHelpers.js
   Utilitaires partagés entre tous les modules de jeu.
   Aucune logique métier ici — uniquement des fonctions pures.
════════════════════════════════════════════════════ */

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function updateInputDisplay(el, value) {
  if (!el) return;
  el.className = 'input-display';
  el.innerHTML = value === '' ? '<span class="input-placeholder">———</span>' : value;
}
