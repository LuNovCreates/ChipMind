/* ════════════════════════════════════════════════════
   MODULE LEARNING — Academy des Tables
   Type : "learning" — 0 étoile, succès uniquement.
   16 tables × 7 étapes progressives.
════════════════════════════════════════════════════ */

import { navigate }                           from '../core/router.js';
import { play as soundPlay, setMusicContext } from '../core/sound.js';
import { shuffleArray }                       from '../core/gameHelpers.js';

/* ─── Définition des tables ─── */
const SCHOOL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
  key: `school_${n}`, factor: n, rowStart: 1, rowEnd: 10, type: 'school',
  label: `× ${n}`, sublabel: '1 → 10', icon: n <= 5 ? '🔢' : '🔣',
  alsoInCasino: n === 5 || n === 8,
}));

const CASINO_TABLES = [
  { key: 'casino_5',   n: 5,  rowStart: 11, rowEnd: 20, alsoSchool: true,  label: '× 5',        sublabel: '11 → 20' },
  { key: 'casino_8',   n: 8,  rowStart: 11, rowEnd: 20, alsoSchool: true,  label: '× 8',        sublabel: '11 → 20' },
  { key: 'casino_11a', n: 11, rowStart: 1,  rowEnd: 10, alsoSchool: false, label: '× 11',       sublabel: '1 → 10' },
  { key: 'casino_11b', n: 11, rowStart: 11, rowEnd: 20, alsoSchool: false, label: '× 11',       sublabel: '11 → 20' },
  { key: 'casino_17a', n: 17, rowStart: 1,  rowEnd: 10, alsoSchool: false, label: '× 17',       sublabel: '1 → 10' },
  { key: 'casino_17b', n: 17, rowStart: 11, rowEnd: 20, alsoSchool: false, label: '× 17',       sublabel: '11 → 20' },
  { key: 'casino_35a', n: 35, rowStart: 1,  rowEnd: 10, alsoSchool: false, label: '× 35',       sublabel: '1 → 10' },
  { key: 'casino_35b', n: 35, rowStart: 11, rowEnd: 20, alsoSchool: false, label: '× 35',       sublabel: '11 → 20' },
].map(t => ({ ...t, factor: t.n, type: 'casino', icon: '🎰' }));

const ALL_TABLES = [...SCHOOL_TABLES, ...CASINO_TABLES];

const STEPS = [
  { id: 'display',     label: 'Affichage',           icon: '👁',  desc: 'Mémorise la table' },
  { id: 'fill_order',  label: 'Remplissage',          icon: '📝',  desc: 'Résultats dans l\'ordre' },
  { id: 'drag_drop',   label: 'Association',          icon: '🔗',  desc: 'Associe chaque paire' },
  { id: 'fill_random', label: 'Mélangé',              icon: '🔀',  desc: 'Ordre aléatoire' },
  { id: 'qcm',         label: 'QCM',                  icon: '❓',  desc: '4 choix par question' },
  { id: 'input',       label: 'Saisie libre',          icon: '⌨',  desc: '0 erreur requis' },
  { id: 'memory',      label: 'Jeu Mémoire',           icon: '🎴',  desc: 'Retrouve les paires' },
];

/* ─── CSS spécifique learningTables ─── */
const _CSS = `
  .lt-home { flex: 1; overflow-y: auto; padding: 0 16px calc(80px + env(safe-area-inset-bottom, 0px)); }
  .lt-section-title { font-family: var(--font-mono); font-size: 0.52rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--gold); padding: 18px 0 10px; display: flex; align-items: center; gap: 8px; }
  .lt-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, var(--gold-border), transparent); }
  .lt-table-list { display: flex; flex-direction: column; gap: 8px; }
  .lt-table-row { display: flex; align-items: center; gap: 12px; background: var(--ivory-faint); border: 1px solid var(--gold-border); border-radius: var(--radius-sm); padding: 12px 14px; cursor: pointer; transition: all 0.2s var(--ease-spring); -webkit-tap-highlight-color: transparent; }
  .lt-table-row:hover { border-color: var(--gold); background: rgba(201,168,76,0.07); transform: translateX(3px); }
  .lt-table-row.mastered { border-color: var(--green); background: rgba(39,174,96,0.07); }
  .lt-table-icon { font-size: 1.4rem; flex-shrink: 0; width: 36px; text-align: center; }
  .lt-table-info { flex: 1; }
  .lt-table-label { font-family: var(--font-serif); font-size: 1rem; font-weight: 700; color: var(--ivory); }
  .lt-table-sub { font-family: var(--font-mono); font-size: 0.48rem; color: var(--ivory-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px; }
  .lt-step-dots { display: flex; gap: 4px; margin-top: 6px; }
  .lt-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); transition: all 0.2s; }
  .lt-dot.done { background: var(--gold); border-color: var(--gold); box-shadow: 0 0 5px var(--gold-glow); }
  .lt-dot.current { background: transparent; border-color: var(--gold); box-shadow: 0 0 5px var(--gold-glow); }
  .lt-mastered-badge { font-size: 1.2rem; }

  /* Détail table */
  .lt-detail-body { flex: 1; overflow-y: auto; padding: 0 20px calc(80px + env(safe-area-inset-bottom,0px)); }
  .lt-detail-factor { font-family: var(--font-serif); font-size: 3rem; font-weight: 900; color: var(--gold-light); text-align: center; padding: 16px 0 4px; filter: drop-shadow(0 0 12px var(--gold-glow)); }
  .lt-detail-sub { font-family: var(--font-mono); font-size: 0.55rem; color: var(--ivory-dim); text-align: center; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px; }
  .lt-steps-list { display: flex; flex-direction: column; gap: 8px; }
  .lt-step-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--gold-border); background: var(--ivory-faint); cursor: pointer; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
  .lt-step-item.done { border-color: var(--green); background: rgba(39,174,96,0.07); }
  .lt-step-item.locked { opacity: 0.45; cursor: default; }
  .lt-step-item.current { border-color: var(--gold); background: rgba(201,168,76,0.1); box-shadow: 0 0 10px var(--gold-glow); }
  .lt-step-item:not(.locked):hover { transform: translateX(3px); }
  .lt-step-num { font-family: var(--font-mono); font-size: 0.58rem; color: var(--gold); width: 20px; text-align: center; flex-shrink: 0; }
  .lt-step-icon { font-size: 1.2rem; flex-shrink: 0; }
  .lt-step-info { flex: 1; }
  .lt-step-label { font-family: var(--font-serif); font-size: 0.85rem; font-weight: 700; color: var(--ivory); }
  .lt-step-desc { font-family: var(--font-mono); font-size: 0.48rem; color: var(--ivory-dim); letter-spacing: 0.06em; margin-top: 1px; }
  .lt-step-check { font-size: 1rem; flex-shrink: 0; }

  /* Display step */
  .lt-display-wrap { flex: 1; overflow-y: auto; padding: 8px 20px calc(80px + env(safe-area-inset-bottom,0px)); }
  .lt-display-section-label { font-family: var(--font-mono); font-size: 0.48rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--gold); opacity: 0.7; padding: 14px 0 6px; }
  .lt-table-display { width: 100%; border-collapse: collapse; }
  .lt-table-display tr { border-bottom: 1px solid var(--ivory-faint); }
  .lt-table-display tr:last-child { border-bottom: none; }
  .lt-table-display td { padding: 8px 4px; font-family: var(--font-serif); font-size: 0.92rem; color: var(--ivory); text-align: center; }
  .lt-table-display .td-n { color: var(--ivory-dim); font-size: 0.8rem; text-align: right; width: 28px; }
  .lt-table-display .td-op { color: var(--gold); font-size: 0.75rem; width: 20px; }
  .lt-table-display .td-factor { font-weight: 700; color: var(--gold-light); text-align: left; width: 40px; }
  .lt-table-display .td-eq { color: var(--ivory-dim); font-size: 0.75rem; width: 16px; }
  .lt-table-display .td-result { font-weight: 900; font-size: 1.1rem; color: var(--ivory); text-align: left; }
  .lt-trivial { opacity: 0.4; }

  /* Fill / QCM / Input step */
  .lt-q-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 24px; gap: 8px; }
  .lt-q-counter { font-family: var(--font-mono); font-size: 0.52rem; color: var(--gold); letter-spacing: 0.15em; text-transform: uppercase; }
  .lt-q-progress { width: 100%; height: 3px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
  .lt-q-prog-fill { height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); border-radius: 99px; transition: width 0.3s; }
  .lt-question-card { width: 100%; background: linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.04)); border: 1px solid var(--gold-border); border-radius: var(--radius); padding: 20px; text-align: center; }
  .lt-q-text { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 700; color: var(--ivory); letter-spacing: 0.04em; }
  .lt-q-mark { color: var(--gold); }

  /* QCM choices */
  .lt-choices { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lt-choice { padding: 14px 8px; border-radius: var(--radius-sm); border: 1px solid rgba(201,168,76,0.18); background: var(--ivory-faint); cursor: pointer; font-family: var(--font-serif); font-size: 1.1rem; font-weight: 700; color: var(--ivory); text-align: center; transition: all 0.15s; -webkit-tap-highlight-color: transparent; }
  .lt-choice:hover { border-color: var(--gold); background: rgba(201,168,76,0.12); }
  .lt-choice.correct { border-color: var(--green); background: rgba(39,174,96,0.15); color: var(--green-light); }
  .lt-choice.wrong   { border-color: var(--red);   background: rgba(192,57,43,0.12);  color: var(--red-light); }
  .lt-choice.reveal  { border-color: var(--green); background: rgba(39,174,96,0.08); color: var(--green-light); opacity: 0.6; }

  /* Drag-drop / association */
  .lt-assoc-grid { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lt-assoc-col-label { font-family: var(--font-mono); font-size: 0.46rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ivory-dim); text-align: center; padding-bottom: 4px; }
  .lt-assoc-items { display: flex; flex-direction: column; gap: 6px; }
  .lt-assoc-item { padding: 10px 8px; border-radius: var(--radius-sm); border: 1px solid var(--gold-border); background: var(--ivory-faint); font-family: var(--font-serif); font-size: 0.9rem; font-weight: 700; color: var(--ivory); text-align: center; cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent; min-height: 44px; display: flex; align-items: center; justify-content: center; }
  .lt-assoc-item.selected { border-color: var(--gold); background: rgba(201,168,76,0.18); color: var(--gold-light); box-shadow: 0 0 8px var(--gold-glow); }
  .lt-assoc-item.matched  { border-color: var(--green); background: rgba(39,174,96,0.1); color: var(--green-light); cursor: default; opacity: 0.7; }

  /* Memory game */
  .lt-memory-grid { width: 100%; display: grid; gap: 6px; }
  .lt-mem-card { aspect-ratio: 1; border-radius: var(--radius-sm); cursor: pointer; position: relative; -webkit-tap-highlight-color: transparent; }
  .lt-mem-card-inner { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); border-radius: var(--radius-sm); }
  .lt-mem-card.flipped .lt-mem-card-inner { transform: rotateY(180deg); }
  .lt-mem-card-front, .lt-mem-card-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
  .lt-mem-card-back { background: linear-gradient(145deg, #1a1a2e, #0d1117); border: 1px solid rgba(201,168,76,0.2); font-size: 1.2rem; }
  .lt-mem-card-front { background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.05)); border: 1px solid var(--gold-border); transform: rotateY(180deg); font-family: var(--font-serif); font-weight: 700; color: var(--ivory); font-size: 0.85rem; text-align: center; padding: 4px; }
  .lt-mem-card.matched .lt-mem-card-front { background: rgba(39,174,96,0.12); border-color: var(--green); color: var(--green-light); }
  .lt-mem-pairs-left { font-family: var(--font-mono); font-size: 0.52rem; color: var(--gold); letter-spacing: 0.15em; text-align: center; text-transform: uppercase; padding-bottom: 8px; }

  /* Step results */
  .lt-results-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 20px 24px calc(80px + env(safe-area-inset-bottom,0px)); text-align: center; }
  .lt-result-icon { font-size: 4rem; filter: drop-shadow(0 0 20px var(--gold-glow)); }
  .lt-result-title { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; color: var(--gold-light); }
  .lt-result-sub { font-family: var(--font-elegant); font-style: italic; font-size: 0.9rem; color: var(--ivory-dim); }
  .lt-result-stat { font-family: var(--font-mono); font-size: 0.65rem; color: var(--gold); letter-spacing: 0.1em; }

  /* Mastered screen */
  .lt-mastered-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 20px 24px calc(80px + env(safe-area-inset-bottom,0px)); text-align: center; }
  .lt-mastered-stars { display: flex; gap: 8px; justify-content: center; }
  .lt-mastered-star { font-size: 2.5rem; animation: starPop 0.5s var(--ease-spring) both; }
  .lt-mastered-star:nth-child(2) { animation-delay: 0.15s; }
  .lt-mastered-star:nth-child(3) { animation-delay: 0.3s; }
  .lt-mastered-title { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 900; color: var(--gold-light); filter: drop-shadow(0 0 14px var(--gold-glow)); }
  .lt-mastered-label { font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--gold); }
  .lt-mastered-desc { font-family: var(--font-elegant); font-style: italic; font-size: 0.9rem; color: var(--ivory-dim); max-width: 280px; line-height: 1.6; }
`;

/* ─── HTML template ─── */
const _HTML = `
<div class="bg-felt"></div>

<div class="feedback-overlay" id="ltFeedback">
  <div class="feedback-text" id="ltFeedbackText"></div>
</div>

<!-- HOME : liste des tables -->
<div class="screen active" id="ltScreenHome">
  <div class="mod-header">
    <button class="btn-back" onclick="window._mLT?.goBack()">←</button>
    <div>
      <div class="header-title">Academy des Tables</div>
      <div class="header-sub">Module Apprentissage · 16 tables · 7 étapes</div>
    </div>
    <span style="font-size:1.5rem;filter:drop-shadow(0 0 6px var(--gold-glow))">📚</span>
  </div>
  <div class="lt-home" id="ltHomeBody"></div>
</div>

<!-- DETAIL : étapes d'une table -->
<div class="screen" id="ltScreenDetail">
  <div class="mod-header">
    <button class="btn-back" onclick="window._mLT?.backToHome()">←</button>
    <div>
      <div class="header-title" id="ltDetailTitle">Table × N</div>
      <div class="header-sub" id="ltDetailSub">École · 1 → 10</div>
    </div>
    <span id="ltDetailIcon" style="font-size:1.5rem">🔢</span>
  </div>
  <div class="lt-detail-body">
    <div class="lt-detail-factor" id="ltDetailFactor">× N</div>
    <div class="lt-detail-sub" id="ltDetailSubLine">École · 1 → 10</div>
    <div class="lt-steps-list" id="ltStepsList"></div>
  </div>
</div>

<!-- ÉTAPE en cours -->
<div class="screen" id="ltScreenStep">
  <div class="game-status">
    <button class="btn-abort" onclick="window._mLT?.confirmAbortStep()">✕</button>
    <div class="status-center">
      <div class="status-top">
        <span class="status-phase" id="ltStepLabel">Étape 1</span>
        <div class="status-score">
          <span class="sc-ok"  id="ltScoreOk">0</span>
          <span style="color:var(--ivory-dim);margin:0 2px">/</span>
          <span class="sc-err" id="ltScoreErr">0</span>
        </div>
      </div>
      <div class="game-progress-bar">
        <div class="game-progress-fill" id="ltStepProgFill" style="width:0%"></div>
      </div>
    </div>
  </div>
  <div id="ltStepBody" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>
  <div class="answer-zone" id="ltAnswerZone" style="display:none">
    <div class="input-zone">
      <div class="input-display" id="ltInputDisplay"><span class="input-placeholder">———</span></div>
      <div class="numpad" id="ltNumpad"></div>
    </div>
  </div>
</div>

<!-- RÉSULTATS étape -->
<div class="screen" id="ltScreenResults">
  <div class="mod-header">
    <button class="btn-back" onclick="window._mLT?.backToDetail()">←</button>
    <div>
      <div class="header-title">Résultats</div>
      <div class="header-sub" id="ltResultsSub">Étape terminée</div>
    </div>
  </div>
  <div class="lt-results-wrap">
    <div class="lt-result-icon" id="ltResultIcon">🎉</div>
    <div class="lt-result-title" id="ltResultTitle">Bravo !</div>
    <div class="lt-result-sub" id="ltResultSub">—</div>
    <div class="lt-result-stat" id="ltResultStat"></div>
  </div>
</div>

<!-- TABLE MAÎTRISÉE -->
<div class="screen" id="ltScreenMastered">
  <div class="mod-header">
    <button class="btn-back" onclick="window._mLT?.backToHome()">←</button>
    <div>
      <div class="header-title">Table Maîtrisée !</div>
      <div class="header-sub" id="ltMasteredSub">—</div>
    </div>
  </div>
  <div class="lt-mastered-wrap">
    <div class="lt-mastered-stars">
      <span class="lt-mastered-star">⭐</span>
      <span class="lt-mastered-star">⭐</span>
      <span class="lt-mastered-star">⭐</span>
    </div>
    <div class="lt-mastered-label" id="ltMasteredLabel">TABLE MAÎTRISÉE</div>
    <div class="lt-mastered-title" id="ltMasteredFactor">× N</div>
    <div class="lt-mastered-desc" id="ltMasteredDesc">—</div>
  </div>
</div>
`;

/* ─── État ─── */
let _container = null;
let _currentTable = null;
let _currentStepIndex = 0;
let _stepState = {};

/* ─── Helpers ─── */
function _getSettings()  { return window.ChipMindStorage.getSettings(); }
function _getLT()        { return window.ChipMindStorage.getLearningTables(); }

function _pairs(tableKey) {
  const t = ALL_TABLES.find(x => x.key === tableKey);
  if (!t) return [];
  return Array.from({ length: t.rowEnd - t.rowStart + 1 }, (_, i) => {
    const n = t.rowStart + i;
    return { n, factor: t.factor, result: n * t.factor };
  });
}

function _testPairs(tableKey) {
  const t = ALL_TABLES.find(x => x.key === tableKey);
  if (!t) return [];
  let rows = _pairs(tableKey);
  if (t.type === 'school') rows = rows.filter(p => p.n !== 1 && p.n !== 10);
  return rows;
}

function _cleanup() {
  delete window._mLT;
  if (window._activeModuleCleanup === _cleanup) window._activeModuleCleanup = null;
}

function showScreen(id) {
  _container?.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function showFeedback(ok) {
  const ov = document.getElementById('ltFeedback');
  const tx = document.getElementById('ltFeedbackText');
  ov.className = 'feedback-overlay show ' + (ok ? 'ok-fb' : 'bad-fb');
  tx.textContent = ok ? '✓' : '✗';
  tx.classList.add('bounce-in');
  setTimeout(() => {
    ov.className = 'feedback-overlay';
    tx.classList.remove('bounce-in');
  }, 700);
}

function updateScoreDisplay(ok, err) {
  const o = document.getElementById('ltScoreOk');
  const e = document.getElementById('ltScoreErr');
  if (o) o.textContent = ok;
  if (e) e.textContent = err;
}

function updateProgress(done, total) {
  const f = document.getElementById('ltStepProgFill');
  if (f) f.style.width = Math.round((done / total) * 100) + '%';
}

/* ─── HOME screen ─── */
function renderHome() {
  const lt = _getLT();
  const body = document.getElementById('ltHomeBody');
  if (!body) return;

  function tableRow(t) {
    const prog = lt[t.key] || { stepsCompleted: Array(7).fill(false), mastered: false };
    const doneCount = prog.stepsCompleted.filter(Boolean).length;
    const nextStep  = prog.stepsCompleted.findIndex(b => !b);
    const mastered  = prog.mastered;
    const dots = STEPS.map((_, i) => {
      const done    = prog.stepsCompleted[i];
      const current = !done && i === (nextStep === -1 ? 7 : nextStep);
      return `<div class="lt-dot ${done ? 'done' : current ? 'current' : ''}"></div>`;
    }).join('');
    return `
      <div class="lt-table-row ${mastered ? 'mastered' : ''}" onclick="window._mLT?.openTable('${t.key}')">
        <div class="lt-table-icon">${mastered ? '⭐' : t.icon}</div>
        <div class="lt-table-info">
          <div class="lt-table-label">${t.label}</div>
          <div class="lt-table-sub">${t.sublabel}</div>
          <div class="lt-step-dots">${dots}</div>
        </div>
        <div class="lt-mastered-badge">${mastered ? '✅' : doneCount > 0 ? `${doneCount}/7` : '→'}</div>
      </div>`;
  }

  body.innerHTML = `
    <div class="lt-section-title">Tables École</div>
    <div class="lt-table-list">${SCHOOL_TABLES.map(tableRow).join('')}</div>
    <div class="lt-section-title">Tables Casino</div>
    <div class="lt-table-list">${CASINO_TABLES.map(tableRow).join('')}</div>
  `;
}

/* ─── DETAIL screen ─── */
function openTable(tableKey) {
  _currentTable = ALL_TABLES.find(t => t.key === tableKey);
  if (!_currentTable) return;
  soundPlay('chipDrop');

  document.getElementById('ltDetailTitle').textContent = `Table ${_currentTable.label}`;
  document.getElementById('ltDetailSub').textContent   = _currentTable.type === 'school' ? 'École' : 'Casino';
  document.getElementById('ltDetailFactor').textContent = _currentTable.label;
  document.getElementById('ltDetailSubLine').textContent = _currentTable.sublabel;
  document.getElementById('ltDetailIcon').textContent    = _currentTable.icon;

  renderStepsList();
  showScreen('ltScreenDetail');
  window._bottomBar?.showLaunch(() => window._mLT?.startNextStep(), 'Commencer →');
}

function renderStepsList() {
  const lt = _getLT();
  const prog = lt[_currentTable.key] || { stepsCompleted: Array(7).fill(false) };
  const nextStep = prog.stepsCompleted.findIndex(b => !b);
  const list = document.getElementById('ltStepsList');
  if (!list) return;
  list.innerHTML = STEPS.map((step, i) => {
    const done    = prog.stepsCompleted[i];
    const current = i === (nextStep === -1 ? -1 : nextStep);
    const locked  = !done && i > (nextStep === -1 ? 99 : nextStep);
    return `
      <div class="lt-step-item ${done?'done':current?'current':locked?'locked':''}"
           onclick="window._mLT?.startStep(${i})">
        <span class="lt-step-num">${i + 1}</span>
        <span class="lt-step-icon">${step.icon}</span>
        <div class="lt-step-info">
          <div class="lt-step-label">${step.label}</div>
          <div class="lt-step-desc">${step.desc}</div>
        </div>
        <span class="lt-step-check">${done ? '✅' : current ? '▶' : locked ? '🔒' : ''}</span>
      </div>`;
  }).join('');
}

function startNextStep() {
  const lt = _getLT();
  const prog = lt[_currentTable.key] || { stepsCompleted: Array(7).fill(false) };
  const next = prog.stepsCompleted.findIndex(b => !b);
  if (next === -1) { showMastered(); return; }
  startStep(next);
}

/* ─── STEP routing ─── */
function startStep(stepIndex) {
  const lt = _getLT();
  const prog = lt[_currentTable.key] || { stepsCompleted: Array(7).fill(false) };
  const nextUnlocked = prog.stepsCompleted.findIndex(b => !b);
  if (stepIndex > (nextUnlocked === -1 ? 99 : nextUnlocked)) return;

  _currentStepIndex = stepIndex;
  const step = STEPS[stepIndex];
  document.getElementById('ltStepLabel').textContent = `${step.icon} ${step.label}`;
  updateScoreDisplay(0, 0);
  updateProgress(0, 1);

  const body = document.getElementById('ltStepBody');
  const az   = document.getElementById('ltAnswerZone');
  body.innerHTML = '';
  az.style.display = 'none';

  showScreen('ltScreenStep');
  window._bottomBar?.hide();

  if      (step.id === 'display')     renderStepDisplay(body);
  else if (step.id === 'fill_order')  renderStepFill(body, az, false);
  else if (step.id === 'drag_drop')   renderStepAssoc(body);
  else if (step.id === 'fill_random') renderStepFill(body, az, true);
  else if (step.id === 'qcm')         renderStepQCM(body);
  else if (step.id === 'input')       renderStepInput(body, az);
  else if (step.id === 'memory')      renderStepMemory(body);
}

/* ─── STEP 1 : Display ─── */
function renderStepDisplay(body) {
  const t = _currentTable;
  const pairs = _pairs(t.key);
  updateProgress(1, 1);

  const rows1 = pairs.filter(p => p.n <= 10);
  const rows2 = pairs.filter(p => p.n > 10);

  function makeRows(list) {
    return list.map(p => {
      const trivial = t.type === 'school' && (p.n === 1 || p.n === 10);
      return `<tr class="${trivial ? 'lt-trivial' : ''}">
        <td class="td-n">${p.n}</td>
        <td class="td-op">×</td>
        <td class="td-factor">${p.factor}</td>
        <td class="td-eq">=</td>
        <td class="td-result">${p.result}</td>
      </tr>`;
    }).join('');
  }

  let html = '<div class="lt-display-wrap">';
  if (t.alsoSchool && rows1.length && rows2.length) {
    html += `<div class="lt-display-section-label">Rangées 1–10 · Déjà vues en école</div>`;
    html += `<table class="lt-table-display">${makeRows(rows1)}</table>`;
    html += `<div class="lt-display-section-label">Rangées 11–20</div>`;
    html += `<table class="lt-table-display">${makeRows(rows2)}</table>`;
  } else {
    html += `<table class="lt-table-display">${makeRows(pairs)}</table>`;
  }
  html += '</div>';
  body.innerHTML = html;

  window._bottomBar?.showLaunch(() => window._mLT?.completeStep(), 'J\'ai mémorisé →');
}

/* ─── STEP 2 & 4 : Fill (ordre / aléatoire) ─── */
function renderStepFill(body, az, random) {
  const pairs = shuffleArray([..._testPairs(_currentTable.key)]);
  if (!random) pairs.sort((a, b) => a.n - b.n);
  _stepState = { pairs, index: 0, errors: 0, input: '' };
  az.style.display = '';
  body.innerHTML = '<div class="lt-q-zone"><div class="lt-q-counter" id="ltFillCounter">—</div><div class="lt-q-progress"><div class="lt-q-prog-fill" id="ltFillProg" style="width:0%"></div></div><div class="lt-question-card"><div class="lt-q-text" id="ltFillQ">—</div></div></div>';
  buildNumpad(() => _fillSubmit(pairs));
  _renderFillQ(pairs);
}

function _renderFillQ(pairs) {
  const { index } = _stepState;
  const p = pairs[index];
  const el = document.getElementById('ltFillQ');
  if (el) el.innerHTML = `${p.n} × ${p.factor} = <span class="lt-q-mark">?</span>`;
  const cnt = document.getElementById('ltFillCounter');
  if (cnt) cnt.textContent = `Question ${index + 1} / ${pairs.length}`;
  const prog = document.getElementById('ltFillProg');
  if (prog) prog.style.width = Math.round((index / pairs.length) * 100) + '%';
  updateProgress(index, pairs.length);
  updateScoreDisplay(index - _stepState.errors, _stepState.errors);
  _stepState.input = '';
  _updateInputDisplay('');
}

function _fillSubmit(pairs) {
  const { index, errors } = _stepState;
  const p = pairs[index];
  const entered = parseInt(_stepState.input, 10);
  const ok = entered === p.result;
  if (ok) {
    soundPlay('correct');
    showFeedback(true);
  } else {
    _stepState.errors++;
    soundPlay('wrong');
    showFeedback(false);
  }
  _stepState.index++;
  updateScoreDisplay(_stepState.index - _stepState.errors, _stepState.errors);
  setTimeout(() => {
    if (_stepState.index >= pairs.length) {
      _finishFillStep(_stepState.errors === 0);
    } else {
      _renderFillQ(pairs);
    }
  }, 700);
}

function _finishFillStep(passed) {
  if (passed) {
    _completeCurrentStep();
  } else {
    _showStepRetry(`${_stepState.errors} erreur${_stepState.errors > 1 ? 's' : ''} — recommence pour valider`);
  }
}

/* ─── STEP 3 : Association (drag-drop simplifié) ─── */
function renderStepAssoc(body) {
  const pairs = shuffleArray([..._testPairs(_currentTable.key)]);
  const questions = pairs.map(p => ({ id: p.n, text: `${p.n} ×`, result: p.result }));
  const answers   = shuffleArray(pairs.map(p => ({ id: p.n, text: String(p.result) })));
  _stepState = { questions, answers, matched: 0, selectedQ: null, selectedA: null, total: pairs.length };
  updateProgress(0, pairs.length);

  function render() {
    const qHtml = questions.map(q => {
      const done = _stepState.answers.find(a => a.id === q.id)?.matched;
      return `<div class="lt-assoc-item ${done ? 'matched' : ''}" id="ltQ_${q.id}" onclick="window._mLT?._assocTapQ(${q.id})">${q.text} ${_currentTable.factor}</div>`;
    }).join('');
    const aHtml = answers.map(a => {
      return `<div class="lt-assoc-item ${a.matched ? 'matched' : ''}" id="ltA_${a.id}" onclick="window._mLT?._assocTapA(${a.id})">${a.text}</div>`;
    }).join('');

    body.innerHTML = `
      <div style="padding:8px 20px;flex:1;overflow-y:auto">
        <div class="lt-assoc-grid">
          <div>
            <div class="lt-assoc-col-label">Question</div>
            <div class="lt-assoc-items">${qHtml}</div>
          </div>
          <div>
            <div class="lt-assoc-col-label">Résultat</div>
            <div class="lt-assoc-items">${aHtml}</div>
          </div>
        </div>
      </div>`;
  }

  render();
  _stepState.render = render;
}

function _assocTapQ(id) {
  if (_stepState.questions.find(q => q.id === id)?.matched) return;
  _stepState.selectedQ = id;
  _assocTryMatch();
  _refreshAssocHighlight();
}
function _assocTapA(id) {
  if (_stepState.answers.find(a => a.id === id)?.matched) return;
  _stepState.selectedA = id;
  _assocTryMatch();
  _refreshAssocHighlight();
}
function _refreshAssocHighlight() {
  document.querySelectorAll('.lt-assoc-item:not(.matched)').forEach(el => el.classList.remove('selected'));
  if (_stepState.selectedQ != null) document.getElementById(`ltQ_${_stepState.selectedQ}`)?.classList.add('selected');
  if (_stepState.selectedA != null) document.getElementById(`ltA_${_stepState.selectedA}`)?.classList.add('selected');
}
function _assocTryMatch() {
  const { selectedQ, selectedA, questions, answers } = _stepState;
  if (selectedQ == null || selectedA == null) return;
  const q = questions.find(x => x.id === selectedQ);
  const a = answers.find(x => x.id === selectedA);
  if (!q || !a) return;
  if (selectedQ === selectedA) {
    q.matched = true; a.matched = true;
    _stepState.matched++;
    soundPlay('correct');
    showFeedback(true);
  } else {
    soundPlay('wrong');
    showFeedback(false);
  }
  _stepState.selectedQ = null; _stepState.selectedA = null;
  updateProgress(_stepState.matched, _stepState.total);
  updateScoreDisplay(_stepState.matched, 0);
  setTimeout(() => {
    _stepState.render?.();
    if (_stepState.matched >= _stepState.total) setTimeout(_completeCurrentStep, 300);
  }, 400);
}

/* ─── STEP 5 : QCM ─── */
function renderStepQCM(body) {
  const pairs = shuffleArray([..._testPairs(_currentTable.key)]);
  _stepState = { pairs, index: 0, errors: 0 };
  body.innerHTML = '<div class="lt-q-zone"><div class="lt-q-counter" id="ltQcmCounter">—</div><div class="lt-q-progress"><div class="lt-q-prog-fill" id="ltQcmProg" style="width:0%"></div></div><div class="lt-question-card"><div class="lt-q-text" id="ltQcmQ">—</div></div><div class="lt-choices" id="ltQcmChoices"></div></div>';
  _renderQCMQ(pairs);
}

function _renderQCMQ(pairs) {
  const { index } = _stepState;
  const p = pairs[index];
  document.getElementById('ltQcmQ').innerHTML = `${p.n} × ${p.factor} = <span class="lt-q-mark">?</span>`;
  document.getElementById('ltQcmCounter').textContent = `Question ${index + 1} / ${pairs.length}`;
  document.getElementById('ltQcmProg').style.width = Math.round((index / pairs.length) * 100) + '%';
  updateProgress(index, pairs.length);
  updateScoreDisplay(index - _stepState.errors, _stepState.errors);

  const allResults = [...new Set(_testPairs(_currentTable.key).map(x => x.result))];
  const wrong = shuffleArray(allResults.filter(r => r !== p.result)).slice(0, 3);
  const choices = shuffleArray([p.result, ...wrong]);
  const ch = document.getElementById('ltQcmChoices');
  ch.innerHTML = choices.map(c => `<button class="lt-choice" onclick="window._mLT?._qcmAnswer(${c},${p.result})">${c}</button>`).join('');
}

function _qcmAnswer(chosen, correct) {
  const ok = chosen === correct;
  if (!ok) _stepState.errors++;
  document.querySelectorAll('.lt-choice').forEach(btn => {
    const v = parseInt(btn.textContent, 10);
    if (v === correct) btn.classList.add('reveal');
    if (v === chosen && !ok) btn.classList.add('wrong');
    btn.onclick = null;
  });
  if (ok) { soundPlay('correct'); showFeedback(true); }
  else    { soundPlay('wrong');   showFeedback(false); }
  updateScoreDisplay(_stepState.index + 1 - _stepState.errors, _stepState.errors);
  _stepState.index++;
  setTimeout(() => {
    if (_stepState.index >= _stepState.pairs.length) _completeCurrentStep();
    else _renderQCMQ(_stepState.pairs);
  }, 800);
}

/* ─── STEP 6 : Input libre ─── */
function renderStepInput(body, az) {
  const pairs = shuffleArray([..._testPairs(_currentTable.key)]);
  _stepState = { pairs, index: 0, errors: 0, input: '' };
  az.style.display = '';
  body.innerHTML = '<div class="lt-q-zone"><div class="lt-q-counter" id="ltInCounter">—</div><div class="lt-q-progress"><div class="lt-q-prog-fill" id="ltInProg" style="width:0%"></div></div><div class="lt-question-card"><div class="lt-q-text" id="ltInQ">—</div></div></div>';
  buildNumpad(() => _inputSubmit(pairs));
  _renderInputQ(pairs);
}

function _renderInputQ(pairs) {
  const { index } = _stepState;
  const p = pairs[index];
  document.getElementById('ltInQ').innerHTML = `${p.n} × ${p.factor} = <span class="lt-q-mark">?</span>`;
  document.getElementById('ltInCounter').textContent = `Question ${index + 1} / ${pairs.length}`;
  document.getElementById('ltInProg').style.width = Math.round((index / pairs.length) * 100) + '%';
  updateProgress(index, pairs.length);
  updateScoreDisplay(index - _stepState.errors, _stepState.errors);
  _stepState.input = '';
  _updateInputDisplay('');
}

function _inputSubmit(pairs) {
  const { index, errors } = _stepState;
  const p = pairs[index];
  const entered = parseInt(_stepState.input, 10);
  const ok = entered === p.result;
  if (ok) { soundPlay('correct'); showFeedback(true); }
  else    { _stepState.errors++; soundPlay('wrong'); showFeedback(false); }
  _stepState.index++;
  setTimeout(() => {
    if (_stepState.index >= pairs.length) {
      if (_stepState.errors === 0) _completeCurrentStep();
      else _showStepRetry(`${_stepState.errors} erreur${_stepState.errors > 1 ? 's' : ''} — 0 erreur requis`);
    } else {
      _renderInputQ(pairs);
    }
  }, 700);
}

/* ─── STEP 7 : Memory ─── */
function renderStepMemory(body) {
  const all  = shuffleArray([..._testPairs(_currentTable.key)]);
  const count = _currentTable.type === 'school' ? Math.min(8, all.length) : Math.min(10, all.length);
  const chosen = all.slice(0, count);
  const cards = shuffleArray([
    ...chosen.map(p => ({ id: `q_${p.n}`, text: `${p.n} × ${p.factor}`, pairId: p.n, isQ: true })),
    ...chosen.map(p => ({ id: `a_${p.n}`, text: String(p.result), pairId: p.n, isQ: false })),
  ]);
  _stepState = { cards, flipped: [], matched: 0, total: count, busy: false };
  updateProgress(0, count);

  const cols = count <= 8 ? 4 : 4;
  body.innerHTML = `
    <div style="padding:8px 16px;flex:1;overflow-y:auto">
      <div class="lt-mem-pairs-left" id="ltMemLeft">${count} paires à trouver</div>
      <div class="lt-memory-grid" id="ltMemGrid" style="grid-template-columns:repeat(${cols},1fr)"></div>
    </div>`;
  _renderMemoryGrid();
}

function _renderMemoryGrid() {
  const grid = document.getElementById('ltMemGrid');
  if (!grid) return;
  grid.innerHTML = _stepState.cards.map(c => `
    <div class="lt-mem-card ${c.flipped?'flipped':''} ${c.matched?'matched':''}" id="ltMem_${c.id}"
         onclick="window._mLT?._memFlip('${c.id}')">
      <div class="lt-mem-card-inner">
        <div class="lt-mem-card-back">🂠</div>
        <div class="lt-mem-card-front">${c.text}</div>
      </div>
    </div>`).join('');
}

function _memFlip(cardId) {
  const st = _stepState;
  if (st.busy) return;
  const card = st.cards.find(c => c.id === cardId);
  if (!card || card.flipped || card.matched) return;
  card.flipped = true;
  st.flipped.push(card);
  document.getElementById(`ltMem_${cardId}`)?.classList.add('flipped');
  if (st.flipped.length < 2) return;
  st.busy = true;
  const [a, b] = st.flipped;
  if (a.pairId === b.pairId && a.isQ !== b.isQ) {
    a.matched = b.matched = true;
    st.matched++;
    st.flipped = [];
    st.busy = false;
    soundPlay('correct');
    updateProgress(st.matched, st.total);
    document.getElementById(`ltMem_${a.id}`)?.classList.add('matched');
    document.getElementById(`ltMem_${b.id}`)?.classList.add('matched');
    const left = document.getElementById('ltMemLeft');
    if (left) left.textContent = `${st.total - st.matched} paire${st.total - st.matched !== 1 ? 's' : ''} restante${st.total - st.matched !== 1 ? 's' : ''}`;
    if (st.matched >= st.total) setTimeout(_completeCurrentStep, 400);
  } else {
    soundPlay('wrong');
    setTimeout(() => {
      a.flipped = b.flipped = false; st.flipped = []; st.busy = false;
      document.getElementById(`ltMem_${a.id}`)?.classList.remove('flipped');
      document.getElementById(`ltMem_${b.id}`)?.classList.remove('flipped');
    }, 900);
  }
}

/* ─── Numpad partagé ─── */
function buildNumpad(onValidate) {
  const numpad = document.getElementById('ltNumpad');
  if (!numpad) return;
  numpad.innerHTML = '';
  ['7','8','9','4','5','6','1','2','3','⌫','0',''].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn' + (k === '⌫' ? ' del' : '') + (k === '' ? ' dim' : '');
    btn.textContent = k;
    if (k === '⌫')     btn.addEventListener('click', () => { _stepState.input = _stepState.input.slice(0, -1); _updateInputDisplay(_stepState.input); soundPlay('chipDrop'); });
    else if (k !== '') btn.addEventListener('click', () => { if (_stepState.input.length < 5) { _stepState.input += k; _updateInputDisplay(_stepState.input); soundPlay('chipDrop'); } });
    numpad.appendChild(btn);
  });
  const v = document.createElement('button');
  v.className = 'numpad-btn validate'; v.textContent = 'Valider ↵';
  v.addEventListener('click', onValidate);
  numpad.appendChild(v);
}

function _updateInputDisplay(val) {
  const d = document.getElementById('ltInputDisplay');
  if (!d) return;
  d.className = 'input-display';
  d.innerHTML = val === '' ? '<span class="input-placeholder">———</span>' : val;
}

/* ─── Complétion & résultats ─── */
function _completeCurrentStep() {
  const lt = window.ChipMindStorage.updateLearningStep(_currentTable.key, _currentStepIndex);
  soundPlay('levelUp');
  const step = STEPS[_currentStepIndex];
  const nowMastered = lt[_currentTable.key]?.mastered;

  if (nowMastered) {
    showMastered();
    return;
  }

  const nextStep = lt[_currentTable.key].stepsCompleted.findIndex(b => !b);
  const nextLabel = nextStep !== -1 ? STEPS[nextStep].label : null;

  document.getElementById('ltResultIcon').textContent  = '⭐';
  document.getElementById('ltResultTitle').textContent = 'Étape validée !';
  document.getElementById('ltResultSub').textContent   = `${step.icon} ${step.label} — terminée`;
  document.getElementById('ltResultStat').textContent  = nextLabel ? `Prochaine étape : ${nextLabel}` : 'Toutes les étapes complétées !';
  document.getElementById('ltResultsSub').textContent  = _currentTable.label;
  showScreen('ltScreenResults');

  window._bottomBar?.showLaunch(
    () => { renderStepsList(); showScreen('ltScreenDetail'); window._bottomBar?.showLaunch(() => window._mLT?.startNextStep(), 'Continuer →'); },
    'Continuer →'
  );

  window.ChipMindAchievements?.checkAll?.();
}

function _showStepRetry(msg) {
  document.getElementById('ltResultIcon').textContent  = '↻';
  document.getElementById('ltResultTitle').textContent = 'À recommencer';
  document.getElementById('ltResultSub').textContent   = msg;
  document.getElementById('ltResultStat').textContent  = '';
  document.getElementById('ltResultsSub').textContent  = _currentTable.label;
  showScreen('ltScreenResults');
  window._bottomBar?.showLaunch(() => window._mLT?.startStep(_currentStepIndex), 'Réessayer →');
}

function completeStep() {
  _completeCurrentStep();
}

function showMastered() {
  document.getElementById('ltMasteredSub').textContent   = _currentTable.label;
  document.getElementById('ltMasteredFactor').textContent = _currentTable.label;
  document.getElementById('ltMasteredLabel').textContent  = _currentTable.type === 'school' ? 'TABLE ÉCOLE MAÎTRISÉE' : 'TABLE CASINO MAÎTRISÉE';
  document.getElementById('ltMasteredDesc').textContent   = `Tu as complété les 7 étapes de la table ${_currentTable.label}. Prêt pour la suivante !`;
  showScreen('ltScreenMastered');
  soundPlay('achievement');
  window._bottomBar?.showLaunch(() => { renderHome(); showScreen('ltScreenHome'); window._bottomBar?.show(); }, 'Retour aux tables');
  window.ChipMindAchievements?.checkAll?.();
}

function confirmAbortStep() {
  soundPlay('back');
  window._showConfirmModal?.({
    title: 'Quitter l\'étape ?',
    message: 'Ta progression dans cette étape sera perdue.',
    cancelLabel:  'Continuer',
    confirmLabel: 'Quitter',
    onConfirm: () => {
      renderStepsList();
      showScreen('ltScreenDetail');
      window._bottomBar?.showLaunch(() => window._mLT?.startNextStep(), 'Commencer →');
    },
  });
}

function backToHome() {
  soundPlay('back');
  renderHome();
  showScreen('ltScreenHome');
  window._bottomBar?.show();
}

function backToDetail() {
  soundPlay('back');
  renderStepsList();
  showScreen('ltScreenDetail');
  window._bottomBar?.showLaunch(() => window._mLT?.startNextStep(), 'Continuer →');
}

function _goBack() {
  _cleanup();
  soundPlay('back');
  setMusicContext('ambient');
  window._cmRefreshDashboard?.();
  navigate('#/');
}

/* ─── Export ─── */
export const module = {
  id: 'learningTables',
  type: 'learning',
  label: 'Academy des Tables',
  icon: '📚',
  modes: ['display', 'fill_order', 'drag_drop', 'fill_random', 'qcm', 'input', 'memory'],
  difficulties: ['beginner', 'intermediate', 'expert'],

  render(container) {
    _cleanup();
    _container = container;

    if (!document.getElementById('ltStyles')) {
      const el = document.createElement('style');
      el.id = 'ltStyles'; el.textContent = _CSS;
      document.head.appendChild(el);
    }

    container.innerHTML = _HTML;
    renderHome();

    window._activeModuleCleanup = _cleanup;
    window._mLT = {
      goBack:           () => _goBack(),
      backToHome:       () => backToHome(),
      backToDetail:     () => backToDetail(),
      openTable:        (key) => openTable(key),
      startStep:        (i)   => startStep(i),
      startNextStep:    ()    => startNextStep(),
      completeStep:     ()    => completeStep(),
      confirmAbortStep: ()    => confirmAbortStep(),
      _qcmAnswer:       (c, r) => _qcmAnswer(c, r),
      _assocTapQ:       (id)  => _assocTapQ(id),
      _assocTapA:       (id)  => _assocTapA(id),
      _memFlip:         (id)  => _memFlip(id),
    };

    window._bottomBar?.show();
    setMusicContext('ambient');
  },

  start()  {},
  end()    {},

  getProgress()      { return { stars: 0 }; },
  getStars()         { return 0; },
  getAchievements()  { return []; },
};
