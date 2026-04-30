/* ════════════════════════════════════════════════════
   ChipMind — router.js
   Hash-based SPA router.
   window.location.href est interdit pour la navigation —
   raison : History API nécessite une config serveur qui
   casse le mode offline de la PWA.
════════════════════════════════════════════════════ */

const _routes = new Map();
let   _active = null;

/* Enregistre un handler pour un hash donné */
export function onRoute(hash, fn) {
  _routes.set(hash, fn);
}

/* Navigue vers un hash — toute la navigation passe ici */
export function navigate(hash) {
  window.location.hash = hash;
}

/* Hash actif */
export function current() {
  return _active;
}

function _dispatch() {
  const hash = window.location.hash || '#/';
  const fn   = _routes.get(hash) ?? _routes.get('#/');
  if (fn) {
    _active = hash;
    fn(hash);
  }
}

/* À appeler une seule fois au démarrage */
export function init() {
  window.addEventListener('hashchange', _dispatch);
  if (!window.location.hash) history.replaceState(null, '', '#/');
  _dispatch();
}
