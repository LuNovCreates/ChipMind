/* ═══════════════════════════════════════════════════════════════
   ChipMind — sounds.js
   Effets sonores + musique d'ambiance / jeu
   Volumes pilotés par soundVolume et musicVolume (0-100) dans storage
═══════════════════════════════════════════════════════════════ */

const ChipMindSounds = (() => {

  const isInModules = window.location.pathname.includes('/modules/');
  const BASE = isInModules ? '../assets/sounds/' : 'assets/sounds/';

  const cache = {};
  const SFX   = ['correct','wrong','flip','star','achieve','tick','keypress','back'];

  /* ─── État musique ─── */
  let _ambient   = null;
  let _game      = null;
  let _current   = null;
  let _fadeTimer = null;

  /* ─── SessionStorage keys ─── */
  const SK_CTX  = 'cm_music_ctx';
  const SK_TIME = 'cm_music_time';
  const SK_TS   = 'cm_music_ts';

  /* ════════════════════════════════════════
     LECTURE DES VOLUMES
     soundVolume 0-100  →  SFX volume 0.0–1.0
     musicVolume 0-100  →  Music volume 0.0–1.0 × 1.25 (25% plus fort)
  ════════════════════════════════════════ */
  function getSfxVol() {
    const v = window.ChipMindStorage?.getSettings()?.soundVolume ?? 50;
    return Math.max(0, Math.min(1, v / 100));
  }

  function getMusicVol() {
    const v = window.ChipMindStorage?.getSettings()?.musicVolume ?? 0;
    /* Musique 25% plus forte que SFX au même niveau de curseur, plafonnée à 1.0 */
    return Math.max(0, Math.min(1, (v / 100) * 1.25));
  }

  function sfxEnabled()   { return getSfxVol()   > 0; }
  function musicEnabled() { return getMusicVol()  > 0; }

  /* ════════════════════════════════════════
     PRÉCHARGEMENT
  ════════════════════════════════════════ */
  function preload() {
    SFX.forEach(name => {
      if (!cache[name]) {
        const a = new Audio(BASE + name + '.mp3');
        a.preload = 'auto';
        cache[name] = a;
      }
    });
  }

  /* ════════════════════════════════════════
     EFFETS SONORES
     weight : multiplicateur relatif (0.0–1.0)
     volume final = getSfxVol() × weight
  ════════════════════════════════════════ */
  function play(name, weight = 1) {
    const vol = getSfxVol() * weight;
    if (vol === 0) return;
    try {
      if (!cache[name]) cache[name] = new Audio(BASE + name + '.mp3');
      const a = cache[name];
      a.volume = Math.min(1, vol);
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }

  const correct  = () => play('correct',  0.8);
  const wrong    = () => play('wrong',    0.7);
  const flip     = () => play('flip',     0.6);
  const star     = () => play('star',     0.9);
  const achieve  = () => play('achieve',  1.0);
  const tick     = () => play('tick',     0.5);
  const keypress = () => play('keypress', 0.4);
  const back     = () => play('back',     0.6);

  /* ════════════════════════════════════════
     MUSIQUE — utilitaires internes
  ════════════════════════════════════════ */
  function _fadeIn(audio, targetVol, duration = 1800) {
    if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
    audio.volume = 0;
    audio.loop   = true;
    audio.play().catch(() => {});
    const steps = 36, stepMs = duration / steps, step = targetVol / steps;
    let s = 0;
    _fadeTimer = setInterval(() => {
      s++;
      audio.volume = Math.min(targetVol, s * step);
      if (s >= steps) { clearInterval(_fadeTimer); _fadeTimer = null; }
    }, stepMs);
  }

  function _fadeOut(audio, duration = 1200, then = null) {
    if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
    const startVol = audio.volume;
    const steps = 24, stepMs = duration / steps, step = startVol / steps;
    let s = 0;
    _fadeTimer = setInterval(() => {
      s++;
      audio.volume = Math.max(0, startVol - s * step);
      if (s >= steps) {
        clearInterval(_fadeTimer); _fadeTimer = null;
        audio.pause();
        audio.currentTime = 0;
        if (then) then();
      }
    }, stepMs);
  }

  function _createTrack(filename) {
    const a = new Audio(BASE + filename);
    a.loop    = true;
    a.volume  = 0;
    a.preload = 'auto';
    a.addEventListener('ended', () => {
      if (a.loop) { a.currentTime = 0; a.play().catch(() => {}); }
    });
    return a;
  }

  function _getOrCreateTrack(context) {
    const filename = context === 'game' ? 'game.mp3' : 'ambient.mp3';
    if (context === 'ambient') {
      if (!_ambient) { _ambient = _createTrack(filename); _ambient._name = 'ambient'; }
      return _ambient;
    } else {
      if (!_game) { _game = _createTrack(filename); _game._name = 'game'; }
      return _game;
    }
  }

  /* ════════════════════════════════════════
     SAUVEGARDE POSITION (avant navigation)
  ════════════════════════════════════════ */
  function saveStateBeforeNav() {
    if (_current && !_current.paused) {
      sessionStorage.setItem(SK_CTX,  _current._name);
      sessionStorage.setItem(SK_TIME, String(_current.currentTime));
      sessionStorage.setItem(SK_TS,   String(Date.now()));
    } else {
      sessionStorage.removeItem(SK_CTX);
      sessionStorage.removeItem(SK_TIME);
      sessionStorage.removeItem(SK_TS);
    }
  }

  /* ════════════════════════════════════════
     REPRISE OU DÉMARRAGE
  ════════════════════════════════════════ */
  function _resumeOrStart(context, vol) {
    const track = _getOrCreateTrack(context);
    _current    = track;
    _current.loop   = true;
    _current.volume = vol;

    const savedCtx  = sessionStorage.getItem(SK_CTX);
    const savedTime = parseFloat(sessionStorage.getItem(SK_TIME) || '0');
    const savedTs   = parseInt(sessionStorage.getItem(SK_TS)   || '0');

    if (savedCtx === context && savedTime > 0 && savedTs > 0) {
      const elapsedSec = (Date.now() - savedTs) / 1000;
      try { _current.currentTime = savedTime + elapsedSec; } catch {}
    }

    sessionStorage.removeItem(SK_CTX);
    sessionStorage.removeItem(SK_TIME);
    sessionStorage.removeItem(SK_TS);

    _current.play().catch(() => {});
  }

  /* ════════════════════════════════════════
     API MUSIQUE
  ════════════════════════════════════════ */
  function switchContext(context) {
    if (!musicEnabled()) return;
    const vol = getMusicVol();

    if (_current && !_current.paused && _current._name === context) return;

    if (_current && !_current.paused) {
      _fadeOut(_current, 1000, () => _resumeOrStart(context, vol));
    } else {
      _resumeOrStart(context, vol);
    }
  }

  function stopMusic(immediate = false) {
    if (!_current || _current.paused) return;
    if (immediate) { _current.pause(); _current.currentTime = 0; }
    else           { _fadeOut(_current, 1500); }
  }

  /**
   * Appelé quand le slider change.
   * type : 'sfx' | 'music'
   */
  function onVolumeChange(type) {
    if (type === 'music') {
      const vol = getMusicVol();
      if (vol === 0) {
        stopMusic();
      } else if (_current && !_current.paused) {
        /* Mettre à jour le volume en live */
        _current.volume = vol;
      } else {
        /* Musique était coupée et on remonte le volume → relancer */
        const inGame = !!document.getElementById('screenGame')
                                 ?.classList.contains('active');
        switchContext(inGame ? 'game' : 'ambient');
      }
    }
    /* Pour SFX : rien à faire, le prochain play() lira le nouveau volume */
  }

  /* ════════════════════════════════════════
     SONS GLOBAUX — keypress délégué
  ════════════════════════════════════════ */
  function initGlobalSounds() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest(
        'button, .mode-btn, .mode-card, .level-btn, .choice-btn, .module-card, .table-btn, [onclick]'
      );
      if (!target) return;

      const gameScreen = document.getElementById('screenGame');
      if (gameScreen?.classList.contains('active') && gameScreen.contains(target)) return;

      if (target.classList.contains('btn-back')  ||
          target.classList.contains('btn-home')   ||
          target.classList.contains('btn-abort')  ||
          target.getAttribute('data-snd') === 'back') return;

      /* Ne pas jouer keypress sur les boutons de volume / mute */
      if (target.classList.contains('vol-mute-btn') ||
          target.closest('.vol-row')) return;

      keypress();
    }, { capture: true });
  }

  /* ── API publique ── */
  return {
    preload,
    play,
    correct, wrong, flip, star, achieve, tick, keypress, back,
    switchContext, stopMusic, onVolumeChange,
    saveStateBeforeNav,
    initGlobalSounds,
  };

})();

window.ChipMindSounds = ChipMindSounds;
