/* ═══════════════════════════════════════════════════════════════
   ChipMind — app.js
   État global, navigation, utilitaires partagés entre modules
   ═══════════════════════════════════════════════════════════════ */

const ChipMindApp = (() => {

  /* ─────────────────────────────────────────────────────────
     DÉFINITION DES MODULES
     Source de vérité centrale pour le dashboard et la nav
  ───────────────────────────────────────────────────────── */
  const MODULES = [
    { id:1,  icon:'✖️',  name:'Tables Croupier',      sub:'×5 ×8 ×11 ×17 ×35',        suit:'♠', file:'modules/module1.html', wide:false },
    { id:2,  icon:'🔀',  name:'Tableau Mélangé',       sub:'Multiplicateurs désordre',  suit:'♥', file:'modules/module2.html', wide:false },
    { id:3,  icon:'🃏',  name:'Comptage Cartes',        sub:'As→9 · Cumul 180',         suit:'♦', file:'modules/module3.html', wide:true  },
    // TODO: retirer comingSoon quand le module est prêt
    { id:4,  icon:'⊞',  name:'Grilles de Calcul',      sub:'×2 ÷2 · Lignes / Cols',    suit:'♣', file:'modules/module4.html', wide:false, comingSoon:true },
    { id:5,  icon:'🎡',  name:'Paiements Roulette',     sub:'Plein · Cheval · Carré',   suit:'♠', file:'modules/module5.html', wide:false, comingSoon:true },
    { id:6,  icon:'👥',  name:'Multi-joueurs',          sub:'2–4 joueurs · Même tél.',  suit:'♥', file:'modules/module6.html', wide:false, comingSoon:true },
    { id:7,  icon:'⏱️',  name:'Chrono 90 Secondes',     sub:'Mode entretien Cerus',     suit:'♦', file:'modules/module7.html', wide:true,  comingSoon:true },
    { id:8,  icon:'🔢',  name:'Suites Logiques',        sub:'+17 +35 ×8 …',             suit:'♣', file:'modules/module8.html', wide:false, comingSoon:true },
    { id:9,  icon:'🧠',  name:'Mémoire Séquence',       sub:'Mémoriser · Reproduire',   suit:'♠', file:'modules/module9.html', wide:false, comingSoon:true },
    { id:10, icon:'⚡',  name:'Additions en Cascade',   sub:'Séries chrono',             suit:'♥', file:'modules/module10.html',wide:false, comingSoon:true },
  ];

  /* ─────────────────────────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────────────────────────── */

  function goToModule(moduleId) {
    const mod      = MODULES.find(m => m.id === moduleId);
    const progress = window.ChipMindStorage.getProgress();
    const modProg  = progress[moduleId];

    if (!mod) return;

    if (mod.comingSoon) {
      showToast('🚧 Module à venir — bientôt disponible !');
      return;
    }

    if (!modProg?.unlocked) {
      showToast('🔒 Débloque les modules précédents d\'abord');
      return;
    }

    window.ChipMindSounds?.keypress();
    window.ChipMindSounds?.saveStateBeforeNav();
    /* Petit délai pour laisser le son démarrer avant la navigation */
    setTimeout(() => { window.location.href = mod.file; }, 120);
  }

  function goToDashboard() {
    window.ChipMindSounds?.back();
    window.ChipMindSounds?.saveStateBeforeNav();
    setTimeout(() => { window.location.href = '../index.html'; }, 120);
  }

  /* ─────────────────────────────────────────────────────────
     TOAST GLOBAL
  ───────────────────────────────────────────────────────── */
  let _toastTimer;

  function showToast(msg, duration = 2500) {
    let toast = document.getElementById('cm-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cm-toast';
      toast.style.cssText = `
        position:fixed; top:16px; left:50%; z-index:8000;
        transform:translateX(-50%) translateY(calc(-100% - 24px));
        background:var(--felt-light); border:1px solid var(--gold);
        border-radius:99px; padding:10px 20px;
        font-family:var(--font-mono); font-size:0.7rem;
        color:var(--gold); letter-spacing:0.05em;
        box-shadow:var(--shadow-gold); pointer-events:none;
        white-space:nowrap; transition:transform 0.4s cubic-bezier(0.22,1,0.36,1);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    /* Apparition */
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(_toastTimer);
    /* Disparition : remonte au-delà de son origine pour sortir entièrement */
    _toastTimer = setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(calc(-100% - 24px))';
    }, duration);
  }

  /* ─────────────────────────────────────────────────────────
     FEEDBACK VISUEL & HAPTIQUE
  ───────────────────────────────────────────────────────── */

  function feedbackCorrect() {
    const s = window.ChipMindStorage.getSettings();
    if (s.haptic && navigator.vibrate) navigator.vibrate(40);
    window.ChipMindSounds?.correct();
  }

  function feedbackError() {
    const s = window.ChipMindStorage.getSettings();
    if (s.haptic && navigator.vibrate) navigator.vibrate([60, 30, 60]);
    window.ChipMindSounds?.wrong();
  }

  /* ─────────────────────────────────────────────────────────
     CALCUL DES ÉTOILES (logique commune)
  ───────────────────────────────────────────────────────── */
  function calcStars(successRate, timeMs, level) {
    const thresholds = {
      beginner:     { s1: 60, s2: 80, s3: 95 },
      intermediate: { s1: 70, s2: 85, s3: 95 },
      expert:       { s1: 80, s2: 90, s3:100 },
    };
    const t = thresholds[level] || thresholds.beginner;
    if (successRate >= t.s3) return 3;
    if (successRate >= t.s2) return 2;
    if (successRate >= t.s1) return 1;
    return 0;
  }

  /* ─────────────────────────────────────────────────────────
     FORMATAGE
  ───────────────────────────────────────────────────────── */
  function formatTime(ms) {
    if (ms === null || ms === undefined) return '--:--';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day:'2-digit', month:'short', year:'numeric'
    });
  }

  /* ─────────────────────────────────────────────────────────
     SESSION RUNNER
  ───────────────────────────────────────────────────────── */
  function endSession({ moduleId, stars, successRate, timeMs, extra = {} }) {
    const settings = window.ChipMindStorage.getSettings();

    const updatedProg = window.ChipMindStorage.updateModuleProgress(moduleId, {
      stars, successRate, time: timeMs,
    });

    const mod = MODULES.find(m => m.id === moduleId);
    window.ChipMindStorage.addHistoryEntry({
      moduleId,
      moduleName: mod?.name || `Module ${moduleId}`,
      stars, successRate, timeMs,
      level: settings.level,
      ...extra,
    });

    /* Vérification des succès */
    const newAch = window.ChipMindAchievements.checkAll();
    newAch.forEach((ach, i) => {
      setTimeout(() => window.ChipMindAchievements.showUnlockToast(ach), i * 4000);
      setTimeout(() => window.ChipMindSounds?.achieve(), i * 4000 + 200);
    });

    /* Son étoiles obtenues */
    if (stars > 0) {
      setTimeout(() => window.ChipMindSounds?.star(), 300);
    }

    return { updatedProg, newAchievements: newAch };
  }

  /* ── API publique ── */
  return {
    MODULES,
    goToModule,
    goToDashboard,
    showToast,
    feedbackCorrect,
    feedbackError,
    calcStars,
    formatTime,
    formatDate,
    endSession,
  };

})();

window.ChipMindApp = ChipMindApp;
