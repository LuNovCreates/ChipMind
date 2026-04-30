/* ════════════════════════════════════════════════════
   ChipMind — sound.js
   Tout l'audio passe par sound.play(). Pas de new Audio()
   direct dans les modules.
════════════════════════════════════════════════════ */

const BASE = '/assets/sounds/';

const SFX_FILES = {
  correct:     'correct.mp3',
  wrong:       'wrong.mp3',
  levelUp:     'star.mp3',
  achievement: 'achieve.mp3',
  cardFlip:    'flip.mp3',
  chipDrop:    'keypress.mp3',
  tick:        'tick.mp3',
  back:        'back.mp3',
};

const _sfxCache = {};
const _music    = { ambient: null, game: null };
const _timers   = { ambient: null, game: null };
let   _activeCtx = null; // 'ambient' | 'game' | null

/* Volume sources : toujours lire depuis window.ChipMindStorage (0-100) */
function _sfxVol() {
  const s = window.ChipMindStorage?.getSettings?.();
  return Math.max(0, Math.min(1, (s?.soundVolume ?? 50) / 100));
}

function _musicVol() {
  const s = window.ChipMindStorage?.getSettings?.();
  return Math.max(0, Math.min(1, (s?.musicVolume ?? 0) / 100));
}

/* Lazy-init d'une instance Audio musicale */
function _getAudio(key) {
  if (!_music[key]) {
    _music[key]        = new Audio(BASE + key + '.mp3');
    _music[key].loop   = true;
    _music[key].volume = 0;
  }
  return _music[key];
}

function _clearTimer(key) {
  if (_timers[key]) { clearInterval(_timers[key]); _timers[key] = null; }
}

/* Fade indépendant par clé — pas de timer partagé */
function _fade(key, toVol, durationMs, then) {
  _clearTimer(key);
  const audio = _music[key];
  if (!audio) { then?.(); return; }
  const from  = audio.volume;
  const steps = Math.max(1, Math.round(durationMs / 20));
  const delta = (toVol - from) / steps;
  let   s     = 0;
  _timers[key] = setInterval(() => {
    s++;
    audio.volume = Math.max(0, Math.min(1, from + delta * s));
    if (s >= steps) {
      _clearTimer(key);
      if (toVol === 0) { audio.pause(); audio.currentTime = 0; }
      then?.();
    }
  }, durationMs / steps);
}

/* ── SFX ── */
export function play(category) {
  try {
    const file = SFX_FILES[category];
    const vol  = _sfxVol();
    if (!file || vol === 0) return;
    if (!_sfxCache[category]) {
      _sfxCache[category]         = new Audio(BASE + file);
      _sfxCache[category].preload = 'auto';
    }
    const a       = _sfxCache[category];
    a.volume      = vol;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}

/* ── Préchargement + pont vers les sliders ── */
export function preload() {
  /* Empêche l'audio de couper/ducker la musique d'autres apps (Spotify, YT Music…) */
  try {
    if ('audioSession' in navigator) navigator.audioSession.type = 'ambient';
  } catch {}
  try {
    Object.entries(SFX_FILES).forEach(([cat, file]) => {
      if (!_sfxCache[cat]) {
        _sfxCache[cat]         = new Audio(BASE + file);
        _sfxCache[cat].preload = 'auto';
      }
    });
    _getAudio('ambient');
    _getAudio('game');
  } catch {}
  /* Pont global appelé par onSliderInput / toggleMute dans index.html */
  window._cmOnVolumeChange = onVolumeChange;
}

/* ── Bascule de contexte musical avec cross-fade ── */
export function setMusicContext(context) {
  try {
    const vol      = _musicVol();
    const key      = context === 'game' ? 'game' : 'ambient';
    const otherKey = key === 'game' ? 'ambient' : 'game';

    /* Volume nul : tout couper */
    if (vol === 0) { stopMusic(true); return; }

    const audio = _getAudio(key);

    /* Idempotence : même contexte déjà en cours — juste sync le volume */
    if (_activeCtx === context && !audio.paused) {
      audio.volume = vol;
      return;
    }

    _activeCtx = context;

    const _startTrack = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      _fade(key, vol, 1200, null);
    };

    /* Fade-out de l'autre piste puis démarrage */
    const other = _music[otherKey];
    if (other && !other.paused) _fade(otherKey, 0, 600, _startTrack);
    else                         _startTrack();
  } catch {}
}

/* ── Arrêt de la musique ── */
export function stopMusic(immediate = false) {
  try {
    ['ambient', 'game'].forEach(key => {
      const audio = _music[key];
      if (!audio || audio.paused) return;
      if (immediate) { _clearTimer(key); audio.pause(); audio.currentTime = 0; }
      else           _fade(key, 0, 1000, null);
    });
  } catch {}
}

/* ── Appelé quand le slider volume change ── */
export function onVolumeChange() {
  try {
    const vol = _musicVol();
    if (vol === 0) { stopMusic(true); return; }

    /* Met à jour le volume des pistes en lecture */
    ['ambient', 'game'].forEach(key => {
      const audio = _music[key];
      if (audio && !audio.paused) audio.volume = vol;
    });

    /* Si un contexte est défini mais en pause, le redémarrer */
    if (_activeCtx) {
      const key   = _activeCtx === 'game' ? 'game' : 'ambient';
      const audio = _music[key];
      if (audio && audio.paused) {
        audio.play().catch(() => {});
        _fade(key, vol, 1000, null);
      }
    }
  } catch {}
}

export const sound = { play, preload, setMusicContext, stopMusic, onVolumeChange };
export default sound;
