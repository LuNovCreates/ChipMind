/* ═══════════════════════════════════════════════════════════════
   ChipMind — achievements.js
   Définition et logique du système de succès
   ═══════════════════════════════════════════════════════════════ */

const Achievements = (() => {

  /* ─────────────────────────────────────────────────────────
     CATALOGUE COMPLET DES SUCCÈS
     Chaque succès :  id, icon, name, desc, check(progress, history, settings)
  ───────────────────────────────────────────────────────── */
  const CATALOGUE = [

    /* ── Premiers pas ── */
    {
      id:    'first_session',
      icon:  '🎰',
      name:  'Premier Jeton',
      desc:  'Complète ta première session d\'entraînement',
      tier:  'bronze',
      check: (p) => Object.values(p).some(m => m.sessions > 0),
    },
    {
      id:    'first_star',
      icon:  '⭐',
      name:  'Étoile Naissante',
      desc:  'Obtiens ta première étoile dans un module',
      tier:  'bronze',
      check: (p) => Object.values(p).some(m => m.stars >= 1),
    },
    {
      id:    'first_perfect',
      icon:  '💎',
      name:  'Sans Faute',
      desc:  'Obtiens 3 étoiles dans un module',
      tier:  'silver',
      check: (p) => Object.values(p).some(m => m.stars === 3),
    },

    /* ── Régularité ── */
    {
      id:    'sessions_10',
      icon:  '🃏',
      name:  'Habitué du Tapis',
      desc:  '10 sessions d\'entraînement',
      tier:  'bronze',
      check: (p) => Object.values(p).reduce((s, m) => s + m.sessions, 0) >= 10,
    },
    {
      id:    'sessions_50',
      icon:  '♠️',
      name:  'Joueur Assidu',
      desc:  '50 sessions d\'entraînement',
      tier:  'silver',
      check: (p) => Object.values(p).reduce((s, m) => s + m.sessions, 0) >= 50,
    },
    {
      id:    'sessions_100',
      icon:  '👑',
      name:  'Maître du Tapis',
      desc:  '100 sessions d\'entraînement',
      tier:  'gold',
      check: (p) => Object.values(p).reduce((s, m) => s + m.sessions, 0) >= 100,
    },

    /* ── Progression modules ── */
    {
      id:    'unlock_3',
      icon:  '🔓',
      name:  'Croupier Novice',
      desc:  'Débloque les modules 4, 5 et 6',
      tier:  'bronze',
      /* Les modules 1-3 sont offerts — on compte seulement ceux gagnés (id > 3) */
      check: (p) => [4,5,6,7,8,9,10].filter(id => p[id]?.unlocked).length >= 3,
    },
    {
      id:    'unlock_all',
      icon:  '🗝️',
      name:  'Toutes les Portes',
      desc:  'Débloque tous les modules',
      tier:  'gold',
      check: (p) => Object.values(p).every(m => m.unlocked),
    },
    {
      id:    'stars_15',
      icon:  '🌟',
      name:  'Bonne Étoile',
      desc:  'Cumule 15 étoiles au total',
      tier:  'silver',
      check: (p) => Object.values(p).reduce((s, m) => s + m.stars, 0) >= 15,
    },
    {
      id:    'royal_flush',
      icon:  '🏆',
      name:  'Royal Flush',
      desc:  '3 étoiles sur tous les modules',
      tier:  'gold',
      check: (p) => Object.values(p).every(m => m.stars === 3),
    },

    /* ── Module 1 : Tables Croupier ── */
    {
      id:    'm1_apprenti',
      icon:  '🎲',
      name:  'Apprenti Calculateur',
      desc:  '100% en QCM · toutes les tables · 10 questions minimum',
      tier:  'bronze',
      module: 1,
      check: (p, hist) => hist.some(e =>
        e.moduleId      === 1    &&
        e.mode          === 'qcm' &&
        e.allTables     === true  &&
        e.successRate   === 100   &&
        (e.totalQuestions || 0) >= 10
      ),
    },
    {
      id:    'm1_formule_verte',
      icon:  '📏',
      name:  'La Formule Verte',
      desc:  'Obtenir 2 étoiles sur Tables Croupier (Intermédiaire · Saisie Libre · toutes tables · 25q · 0 faute)',
      tier:  'silver',
      module: 1,
      check: (p) => (p[1]?.stars || 0) >= 2,
    },
    {
      id:    'm1_reflexe_croupier',
      icon:  '⚡',
      name:  'Le Réflexe du Croupier',
      desc:  'Session parfaite en Saisie Libre · Expert · toutes tables · 25q · moins de 5s par réponse',
      tier:  'gold',
      module: 1,
      check: (p, hist) => hist.some(e =>
        e.moduleId      === 1       &&
        e.mode          === 'libre' &&
        e.allTables     === true    &&
        e.level         === 'expert'&&
        e.successRate   === 100     &&
        (e.totalQuestions || 0) >= 25 &&
        e.timeMs > 0 &&
        (e.timeMs / (e.totalQuestions || 25)) < 5000
      ),
    },

    /* ── Module 2 : Tableau Mélangé ── */
    {
      id:    'm2_brasseur',
      icon:  '🔀',
      name:  'Brasseur de Cartes',
      desc:  '100% en QCM · plage complète 1→20 · 5 lignes minimum',
      tier:  'bronze',
      module: 2,
      check: (p, hist) => hist.some(e =>
        e.moduleId    === 2    &&
        e.mode        === 'qcm' &&
        e.minVal      === 1    &&
        e.maxVal      === 20   &&
        (e.rowsPlayed || 0) >= 5 &&
        e.successRate === 100
      ),
    },
    {
      id:    'm2_marathon',
      icon:  '🏃',
      name:  'Marathon Mélangé',
      desc:  'Saisie Libre · plage complète · 20 lignes · ≥85% de réussite',
      tier:  'silver',
      module: 2,
      check: (p, hist) => hist.some(e =>
        e.moduleId    === 2      &&
        e.mode        === 'libre' &&
        e.minVal      === 1      &&
        e.maxVal      === 20     &&
        (e.rowsPlayed || 0) >= 20 &&
        (e.successRate || 0) >= 85
      ),
    },
    {
      id:    'm2_grand_melange',
      icon:  '🎰',
      name:  'Le Grand Mélange',
      desc:  'Saisie Libre · Expert · plage complète · 20 lignes · 0 faute · <5s par cellule',
      tier:  'gold',
      module: 2,
      check: (p, hist) => hist.some(e =>
        e.moduleId    === 2       &&
        e.mode        === 'libre' &&
        e.level       === 'expert'&&
        e.minVal      === 1       &&
        e.maxVal      === 20      &&
        (e.rowsPlayed || 0) >= 20 &&
        e.successRate === 100      &&
        e.timeMs > 0               &&
        (e.timeMs / ((e.rowsPlayed || 20) * 5)) < 5000
      ),
    },

    /* ── Module 3 : Comptage Cartes ── */
    {
      id:    'm3_demi_jeu',
      icon:  '🎴',
      name:  'Demi-Jeu',
      desc:  'Montrée ou Descente (36 cartes) avec ≥85% de réussite',
      tier:  'bronze',
      module: 3,
      check: (p, hist) => hist.some(e =>
        e.moduleId  === 3 &&
        (e.mode === 'montee' || e.mode === 'descente') &&
        (e.totalCards || 0) >= 36 &&
        (e.successRate || 0) >= 85
      ),
    },
    {
      id:    'm3_tour_complet',
      icon:  '🔄',
      name:  'Tour Complet',
      desc:  'Aller-Retour (72 cartes) avec ≥90% de réussite · tout niveau',
      tier:  'silver',
      module: 3,
      check: (p, hist) => hist.some(e =>
        e.moduleId  === 3          &&
        e.mode      === 'allerretour' &&
        (e.totalCards || 0) >= 72  &&
        (e.successRate || 0) >= 90
      ),
    },
    {
      id:    'm3_memoire_tapis',
      icon:  '⚡',
      name:  'La Mémoire du Tapis',
      desc:  'Aller-Retour parfait · Expert · 0 faute · en moins de 5 minutes',
      tier:  'gold',
      module: 3,
      check: (p, hist) => hist.some(e =>
        e.moduleId    === 3            &&
        e.mode        === 'allerretour'&&
        e.level       === 'expert'     &&
        (e.totalCards || 0) >= 72      &&
        e.successRate === 100           &&
        e.timeMs > 0                   &&
        e.timeMs < 5 * 60 * 1000       // < 5 minutes
      ),
    },

    /* ── Module 7 : Chrono 90s ── */
    {
      id:    'speed_demon',
      icon:  '⚡',
      name:  'Speed Demon',
      desc:  'Complète le module Chrono 90s en mode Expert',
      tier:  'gold',
      check: (p) => p[7]?.stars >= 1,
    },

    /* ── Module 5 : Roulette ── */
    {
      id:    'roulette_pro',
      icon:  '🎡',
      name:  'Croupier Roulette',
      desc:  '3 étoiles sur Paiements Roulette',
      tier:  'silver',
      check: (p) => p[5]?.stars === 3,
    },

    /* ── Succès secret ── */
    {
      id:    'night_owl',
      icon:  '🦉',
      name:  'Hibou de Casino',
      desc:  'Entraîne-toi après minuit',
      tier:  'secret',
      secret: true,
      check: () => {
        const h = new Date().getHours();
        return h >= 0 && h < 5;
      },
    },
    {
      id:    'comeback',
      icon:  '🔄',
      name:  'Le Retour',
      desc:  'Reviens après 7 jours d\'absence',
      tier:  'secret',
      secret: true,
      check: (p, hist) => {
        if (!hist.length) return false;
        const last = new Date(hist[0].date);
        const diff = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 7;
      },
    },
  ];

  /* Niveaux de tier → couleur & libellé */
  const TIERS = {
    bronze: { color: '#cd7f32', label: 'Bronze',  glow: 'rgba(205,127,50,0.4)' },
    silver: { color: '#c0c0c0', label: 'Argent',  glow: 'rgba(192,192,192,0.4)' },
    gold:   { color: '#c9a84c', label: 'Or',      glow: 'rgba(201,168,76,0.5)'  },
    secret: { color: '#9b59b6', label: 'Secret',  glow: 'rgba(155,89,182,0.4)'  },
  };

  /* ─────────────────────────────────────────────────────────
     VÉRIFICATION — appelée après chaque session
     Retourne le tableau des nouveaux succès débloqués
  ───────────────────────────────────────────────────────── */
  function checkAll() {
    const progress = window.ChipMindStorage.getProgress();
    const history  = window.ChipMindStorage.getHistory();
    const newlyUnlocked = [];

    CATALOGUE.forEach(ach => {
      try {
        if (ach.check(progress, history)) {
          const isNew = window.ChipMindStorage.unlockAchievement(ach.id);
          if (isNew) newlyUnlocked.push(ach);
        }
      } catch (e) {
        console.warn('[ChipMind] Achievement check error:', ach.id, e);
      }
    });

    return newlyUnlocked;
  }

  /* ─────────────────────────────────────────────────────────
     ENRICHISSEMENT — retourne le catalogue avec état unlocked
  ───────────────────────────────────────────────────────── */
  function getCatalogueWithState() {
    const unlocked = window.ChipMindStorage.getAchievements();

    return CATALOGUE.map(ach => ({
      ...ach,
      unlocked: !!unlocked[ach.id],
      unlockedAt: unlocked[ach.id]?.unlockedAt || null,
      tier: TIERS[ach.tier] ? { key: ach.tier, ...TIERS[ach.tier] } : TIERS.bronze,
    }));
  }

  /* ─────────────────────────────────────────────────────────
     RENDU HTML — badge toast quand succès débloqué
  ───────────────────────────────────────────────────────── */
  function showUnlockToast(ach) {
    const existing = document.getElementById('ach-toast');
    if (existing) existing.remove();

    const tier = TIERS[typeof ach.tier === 'string' ? ach.tier : ach.tier.key] || TIERS.bronze;

    const el = document.createElement('div');
    el.id = 'ach-toast';
    el.style.cssText = `
      position: fixed;
      top: 64px;
      left: 50%;
      transform: translateX(-50%) translateY(-90px);
      background: var(--felt-light);
      border: 1px solid ${tier.color};
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 0 24px ${tier.glow}, 0 8px 32px rgba(0,0,0,0.5);
      z-index: 9999;
      transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
      max-width: 300px;
      pointer-events: none;
    `;
    el.innerHTML = `
      <span style="font-size:1.6rem;filter:drop-shadow(0 0 8px ${tier.glow})">${ach.icon}</span>
      <div>
        <div style="font-family:var(--font-mono);font-size:0.5rem;text-transform:uppercase;letter-spacing:0.2em;color:${tier.color};margin-bottom:2px">
          Succès débloqué · ${tier.label}
        </div>
        <div style="font-family:var(--font-serif);font-size:0.9rem;font-weight:700;color:var(--ivory)">${ach.name}</div>
        <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--ivory-dim);margin-top:2px">${ach.desc}</div>
      </div>
    `;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      el.style.transform = 'translateX(-50%) translateY(-90px)';
      setTimeout(() => el.remove(), 500);
    }, 3500);
  }

  /* ─────────────────────────────────────────────────────────
     RENDU HTML — panneau succès complet (bottom sheet)
  ───────────────────────────────────────────────────────── */
  function renderPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const catalogue = getCatalogueWithState();
    const unlockedCount = catalogue.filter(a => a.unlocked).length;

    const grouped = {
      gold:   catalogue.filter(a => a.tier.key === 'gold'),
      silver: catalogue.filter(a => a.tier.key === 'silver'),
      bronze: catalogue.filter(a => a.tier.key === 'bronze'),
      secret: catalogue.filter(a => a.tier.key === 'secret'),
    };

    function renderGroup(title, list, tierColor) {
      if (!list.length) return '';
      return `
        <div class="ach-group">
          <div class="ach-group-title" style="color:${tierColor}">${title}</div>
          <div class="ach-list">
            ${list.map(a => renderBadge(a)).join('')}
          </div>
        </div>
      `;
    }

    function renderBadge(a) {
      const locked  = !a.unlocked;
      const secret  = a.secret && locked;
      const tierObj = typeof a.tier === 'object' ? a.tier : TIERS[a.tier];
      return `
        <div class="ach-badge ${locked ? 'locked' : 'unlocked'}"
             style="${locked ? '' : `border-color:${tierObj.color};box-shadow:0 0 12px ${tierObj.glow}`}">
          <span class="ach-icon" style="${locked ? 'filter:grayscale(1);opacity:0.3' : `filter:drop-shadow(0 0 6px ${tierObj.glow})`}">
            ${secret ? '🔒' : a.icon}
          </span>
          <div class="ach-info">
            <div class="ach-name">${secret ? '???' : a.name}</div>
            <div class="ach-desc">${secret ? 'Succès secret' : a.desc}</div>
            ${a.unlocked && a.unlockedAt ? `<div class="ach-date">${formatDate(a.unlockedAt)}</div>` : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="ach-header">
        <span class="ach-count">${unlockedCount} / ${catalogue.length}</span>
        <span class="ach-count-label">succès débloqués</span>
      </div>
      <div class="ach-progress-wrap">
        <div class="ach-progress-track">
          <div class="ach-progress-fill" style="width:${Math.round(unlockedCount/catalogue.length*100)}%"></div>
        </div>
      </div>
      ${renderGroup('✦ Or', grouped.gold, TIERS.gold.color)}
      ${renderGroup('◈ Argent', grouped.silver, TIERS.silver.color)}
      ${renderGroup('◉ Bronze', grouped.bronze, TIERS.bronze.color)}
      ${renderGroup('✧ Secrets', grouped.secret, TIERS.secret.color)}
    `;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }

  /* ── API publique ── */
  return {
    CATALOGUE,
    TIERS,
    checkAll,
    getCatalogueWithState,
    showUnlockToast,
    renderPanel,
  };

})();

window.ChipMindAchievements = Achievements;
