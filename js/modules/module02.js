/* ════════════════════════════════════════════════════
   ChipMind — module02.js
   Tableau Mélangé — SPA module
════════════════════════════════════════════════════ */

import { navigate }                            from '../core/router.js';
import { get }                                 from '../core/state.js';
import { play as soundPlay, setMusicContext }  from '../core/sound.js';
import { shuffleArray, formatTime }            from '../core/gameHelpers.js';

const MULTIPLIERS = [5, 8, 11, 17, 35];
const SUITS_MAP   = { 5: '♠', 8: '♥', 11: '♦', 17: '♣', 35: '♠' };

/* ── Persisted config ── */
const cfg = { minVal: 1, maxVal: 20, rows: 10, mode: 'libre' };

/* ── Session state ── */
const state = {
  rows: [], currentRow: 0, currentCell: 0,
  totalCorrect: 0, totalWrong: 0, errors: [],
  startTime: null, timerInterval: null, timerSeconds: 0,
  currentInput: '', isAnswered: false,
  phase: null, mainTarget: 0,
};

let _container      = null;
let _keydownHandler = null;

/* ════════════════════════════════════════════════════
   CSS spécifique module02
════════════════════════════════════════════════════ */
const _CSS = `
.bg-felt::after { content: '🔀'; position: absolute; bottom: -10px; right: -10px; font-size: 16rem; opacity: 0.025; line-height: 1; }

.range-wrap { display: flex; align-items: center; gap: 12px; background: var(--ivory-faint); border: 1px solid var(--gold-border); border-radius: var(--radius-sm); padding: 10px 14px; }
.range-label { font-family: var(--font-mono); font-size: 0.58rem; color: var(--ivory-dim); letter-spacing: 0.06em; flex: 1; }
.range-controls { display: flex; align-items: center; gap: 12px; }
.range-btn { width: 28px; height: 28px; border-radius: 50%; background: var(--gold-subtle); border: 1px solid var(--gold-border); color: var(--gold); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.range-btn:hover { background: rgba(201,168,76,0.25); }
.range-value { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 700; color: var(--gold-light); min-width: 28px; text-align: center; }

.modes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mode-btn { border-radius: var(--radius-sm); padding: 14px 10px; background: var(--ivory-faint); border: 1px solid var(--gold-border); display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s var(--ease-spring); }
.mode-btn .mode-icon { font-size: 1.5rem; }
.mode-btn .mode-name { font-family: var(--font-mono); font-size: 0.55rem; color: var(--ivory); text-transform: uppercase; letter-spacing: 0.08em; text-align: center; }
.mode-btn .mode-desc { font-family: var(--font-mono); font-size: 0.44rem; color: var(--ivory-dim); text-align: center; line-height: 1.4; }
.mode-btn.selected { background: linear-gradient(145deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08)); border-color: var(--gold); box-shadow: 0 0 12px var(--gold-glow); }
.mode-btn.selected .mode-name { color: var(--gold-light); }
.mode-btn:hover { transform: translateY(-3px); }

.game-score { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.08em; }
.sc-ok  { color: var(--green-light); }
.sc-sep { color: var(--ivory-dim); margin: 0 2px; }
.sc-err { color: var(--red-light); }

.game-zone { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 6px 20px 10px; gap: 10px; overflow: hidden; }

.multiplicand-banner {
  background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.07));
  border: 1px solid var(--gold-border); border-radius: var(--radius);
  padding: 7px 14px; display: flex; align-items: center; justify-content: space-between;
  position: relative; overflow: hidden;
}
.multiplicand-banner::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to bottom, rgba(255,255,255,0.04), transparent); }
.mult-label { font-family: var(--font-mono); font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--gold); opacity: 0.7; }
.mult-number { font-family: var(--font-serif); font-size: 1.7rem; font-weight: 900; color: var(--gold-light); filter: drop-shadow(0 0 10px var(--gold-glow)); line-height: 1; }
.mult-progress-text { font-family: var(--font-mono); font-size: 0.55rem; color: var(--ivory-dim); letter-spacing: 0.08em; }

.table-grid { display: flex; flex-direction: column; gap: 5px; }
.table-row {
  background: linear-gradient(145deg, var(--felt-card), var(--felt-mid));
  border: 1px solid rgba(201,168,76,0.13); border-radius: var(--radius-sm);
  display: flex; align-items: center; gap: 0; overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s; position: relative;
}
.table-row.active-row  { border-color: var(--gold);  box-shadow: 0 0 16px var(--gold-glow); }
.table-row.correct-row { border-color: var(--green); box-shadow: 0 0 14px var(--green-glow); }
.table-row.wrong-row   { border-color: var(--red);   box-shadow: 0 0 12px var(--red-glow); animation: rowShake 0.3s ease; }
@keyframes rowShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }

.row-mult { min-width: 68px; padding: 10px 10px; background: rgba(0,0,0,0.15); border-right: 1px solid rgba(201,168,76,0.1); display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; }
.row-mult-op  { font-family: var(--font-mono); font-size: 0.44rem; color: var(--gold); opacity: 0.6; letter-spacing: 0.1em; text-transform: uppercase; }
.row-mult-val { font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: var(--gold-light); line-height: 1; }
.row-mult-suit { display: none; }
.row-eq { padding: 0 10px; font-family: var(--font-serif); font-size: 1.05rem; color: var(--ivory-dim); opacity: 0.4; flex-shrink: 0; }
.row-answer { flex: 1; padding: 10px 10px; display: flex; align-items: center; justify-content: flex-end; }

.answer-correct     { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 700; color: var(--green-light); filter: drop-shadow(0 0 8px var(--green-glow)); }
.answer-wrong-val   { font-family: var(--font-serif); font-size: 1.1rem; font-weight: 700; color: var(--red-light); text-decoration: line-through; margin-right: 8px; }
.answer-wrong-correct { font-family: var(--font-serif); font-size: 1.35rem; font-weight: 700; color: var(--green-light); }
.answer-pending { display: flex; gap: 3px; align-items: center; }
.dot-pending { width: 5px; height: 5px; border-radius: 50%; background: rgba(201,168,76,0.25); animation: dotPulse 1.2s ease-in-out infinite; }
.dot-pending:nth-child(2) { animation-delay: 0.2s; }
.dot-pending:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotPulse { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.3)} }

.qcm-choices { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; }
.choice-btn { padding: 12px 8px; border-radius: var(--radius-sm); background: linear-gradient(145deg, var(--felt-card), var(--felt-mid)); border: 1px solid var(--gold-border); cursor: pointer; font-family: var(--font-serif); font-size: 1.4rem; font-weight: 700; color: var(--ivory); text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.3); transition: all 0.18s var(--ease-spring); -webkit-tap-highlight-color: transparent; }
.choice-btn:hover { transform: translateY(-1px) scale(1.02); border-color: rgba(201,168,76,0.45); }
.choice-btn:active { transform: scale(0.96); }
.choice-btn.correct { background: linear-gradient(145deg, rgba(39,174,96,0.3), rgba(39,174,96,0.12)); border-color: var(--green-light); color: var(--green-light); box-shadow: 0 0 18px var(--green-glow); }
.choice-btn.wrong   { background: linear-gradient(145deg, rgba(192,57,43,0.28), rgba(192,57,43,0.1)); border-color: var(--red-light); color: var(--red-light); box-shadow: 0 0 14px var(--red-glow); }
.choice-btn.reveal  { border-color: rgba(39,174,96,0.5); color: rgba(39,174,96,0.75); }
.choice-btn.dim     { opacity: 0.38; pointer-events: none; }

@keyframes rowReveal { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
`;

/* ════════════════════════════════════════════════════
   HTML TEMPLATE
════════════════════════════════════════════════════ */
const _HTML = `
<div class="bg-felt"></div>
<div class="feedback-overlay" id="feedbackOverlay">
  <div class="feedback-text" id="feedbackText"></div>
</div>

<div class="screen active" id="screenConfig">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m02?.goBack()">←</button>
    <div>
      <div class="header-title">Tableau Mélangé</div>
      <div class="header-sub">Module 02 · Multiplicateurs désordre</div>
    </div>
    <span style="font-size:1.5rem;filter:drop-shadow(0 0 6px var(--gold-glow))">🔀</span>
  </div>

  <div class="config-body">

    <div class="config-section">
      <div class="config-label">Plage des multiplicandes</div>
      <div class="range-wrap" style="margin-bottom:8px">
        <span class="range-label">Minimum</span>
        <div class="range-controls">
          <button class="range-btn" onclick="window._m02?.changeMin(-1)">−</button>
          <span class="range-value" id="minVal">1</span>
          <button class="range-btn" onclick="window._m02?.changeMin(1)">+</button>
        </div>
      </div>
      <div class="range-wrap">
        <span class="range-label">Maximum</span>
        <div class="range-controls">
          <button class="range-btn" onclick="window._m02?.changeMax(-1)">−</button>
          <span class="range-value" id="maxVal">20</span>
          <button class="range-btn" onclick="window._m02?.changeMax(1)">+</button>
        </div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Nombre de lignes par session</div>
      <div class="range-wrap">
        <span class="range-label">Lignes (chacune = 5 réponses)</span>
        <div class="range-controls">
          <button class="range-btn" onclick="window._m02?.changeRows(-1)">−</button>
          <span class="range-value" id="rowsVal">10</span>
          <button class="range-btn" onclick="window._m02?.changeRows(1)">+</button>
        </div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Mode de jeu</div>
      <div class="modes-grid">
        <div class="mode-btn" data-mode="libre" onclick="window._m02?.selectMode('libre',this)">
          <span class="mode-icon">⌨️</span>
          <span class="mode-name">Saisie Libre</span>
          <span class="mode-desc">Tape chaque réponse au clavier numérique</span>
        </div>
        <div class="mode-btn" data-mode="qcm" onclick="window._m02?.selectMode('qcm',this)">
          <span class="mode-icon">🔘</span>
          <span class="mode-name">QCM</span>
          <span class="mode-desc">4 choix par cellule à sélectionner</span>
        </div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Niveau actif</div>
      <div class="level-info">
        <div class="level-badge" id="levelBadge"></div>
        <div class="level-info-text" id="levelInfoText"></div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Conditions pour les étoiles</div>
      <div class="star-conditions">
        <div class="star-cond-title">Étoiles selon le mode et le nombre de lignes · 0 faute</div>
        <div class="cond-row">
          <div class="cond-dot unmet">★</div>
          <span class="cond-text">QCM · 20 lignes · 0 faute</span>
        </div>
        <div class="cond-row">
          <div class="cond-dot unmet">★★</div>
          <span class="cond-text">Saisie Libre · 10 lignes · 0 faute</span>
        </div>
        <div class="cond-row">
          <div class="cond-dot unmet">★★★</div>
          <span class="cond-text">Saisie Libre · 20 lignes · 0 faute</span>
        </div>
        <div class="star-cond-reward" id="condTimingNote">Chrono : —</div>
      </div>
    </div>

  </div>

</div>

<div class="screen" id="screenGame">
  <div class="game-status">
    <button class="btn-abort" onclick="window._m02?.confirmAbort()">✕</button>
    <div style="display:flex;flex-direction:column;gap:3px;flex:1">
      <div class="game-progress-bar">
        <div class="game-progress-fill" id="gameProgressFill" style="width:0%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:var(--font-mono);font-size:0.52rem;color:var(--gold);letter-spacing:0.1em" id="rowLabel">Ligne 1/10</span>
        <div class="game-score">
          <span class="sc-ok"  id="scoreOk">0</span>
          <span class="sc-sep">/</span>
          <span class="sc-err" id="scoreErr">0</span>
        </div>
      </div>
    </div>
  </div>

  <div class="timer-wrap" id="timerWrap">
    <div class="timer-fill" id="timerFill"></div>
  </div>
  <div class="timer-text" id="timerText">—</div>

  <div class="game-zone">
    <div class="multiplicand-banner">
      <div>
        <div class="mult-label">Multiplicande</div>
        <div class="mult-number" id="multiplicandNum">7</div>
      </div>
      <div style="text-align:right">
        <div class="mult-progress-text" id="multProgressText">Cellule 1/5</div>
        <div style="font-family:var(--font-mono);font-size:0.45rem;color:var(--ivory-dim);margin-top:2px">Trouve les 5 produits</div>
      </div>
    </div>

    <div class="table-grid" id="tableGrid"></div>
  </div>

  <div class="answer-zone">
    <div id="inputZone" class="input-zone">
      <div class="input-display" id="inputDisplay">
        <span class="input-placeholder">———</span>
      </div>
      <div class="numpad" id="numpad"></div>
    </div>

    <div id="qcmZone" class="qcm-choices" style="display:none"></div>
  </div>
</div>

<div class="screen" id="screenResults">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m02?.goBack()">←</button>
    <div>
      <div class="header-title">Résultats</div>
      <div class="header-sub">Tableau Mélangé · Module 02</div>
    </div>
  </div>
  <div class="results-body">
    <div class="result-stars" id="resultStars">
      <span class="result-star">★</span>
      <span class="result-star">★</span>
      <span class="result-star">★</span>
    </div>
    <div style="text-align:center">
      <div class="result-title" id="resultTitle">—</div>
      <div class="result-subtitle" id="resultSubtitle">—</div>
    </div>
    <div class="result-stats">
      <div class="rstat"><div class="rstat-value" id="rstatScore">—</div><div class="rstat-label">Réussite</div></div>
      <div class="rstat"><div class="rstat-value" id="rstatTime">—</div><div class="rstat-label">Temps</div></div>
      <div class="rstat"><div class="rstat-value" id="rstatRows">—</div><div class="rstat-label">Lignes</div></div>
    </div>
    <div class="result-conditions">
      <div class="result-cond-title">Conditions étoiles</div>
      <div class="result-cond-list" id="resultCondList"></div>
    </div>
    <div class="stars-earned-banner" id="starsEarnedBanner"></div>
    <div class="errors-section" id="errorsSection" style="display:none">
      <div class="errors-title">Erreurs à retravailler</div>
      <div id="errorsList"></div>
    </div>

  </div>
</div>
`;

/* ════════════════════════════════════════════════════
   STAR CALCULATION
════════════════════════════════════════════════════ */
function calcStarsModule2(mode, errors, rows) {
  if (errors > 0)                     return 0;
  if (mode === 'libre' && rows >= 20) return 3;
  if (mode === 'libre' && rows >= 10) return 2;
  if (mode === 'qcm'  && rows >= 20)  return 1;
  return 0;
}

/* ════════════════════════════════════════════════════
   LIFECYCLE
════════════════════════════════════════════════════ */
function _cleanup() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }
  delete window._m02;
  if (window._activeModuleCleanup === _cleanup) window._activeModuleCleanup = null;
}

function _goBack() {
  _cleanup();
  soundPlay('back');
  setMusicContext('ambient');
  window._cmRefreshDashboard?.();
  navigate('#/');
}

/* ════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════ */
function _feedbackCorrect() {
  soundPlay('correct');
  const vibration = get('settings')?.vibration ?? true;
  if (vibration && navigator.vibrate) navigator.vibrate(50);
}

function _feedbackError() {
  soundPlay('wrong');
  const vibration = get('settings')?.vibration ?? true;
  if (vibration && navigator.vibrate) navigator.vibrate([50, 30, 100]);
}

function showScreen(id) {
  _container?.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  window.scrollTo(0, 0);
}

/* ════════════════════════════════════════════════════
   ROW POOL — pool exhaustif de multiplicandes
════════════════════════════════════════════════════ */
class RowPool {
  constructor() { this._all = []; this._remaining = []; }
  reset(min, max) {
    this._all = [];
    for (let i = min; i <= max; i++) this._all.push(i);
    this._remaining = shuffleArray([...this._all]);
  }
  next() {
    if (this._remaining.length === 0)
      this._remaining = shuffleArray([...this._all]);
    return this._remaining.pop();
  }
}
const _rowPool = new RowPool();

/* ════════════════════════════════════════════════════
   CONFIG UI
════════════════════════════════════════════════════ */
function changeMin(d) {
  cfg.minVal = Math.max(1, Math.min(cfg.maxVal - 1, cfg.minVal + d));
  const el = document.getElementById('minVal');
  if (el) el.textContent = cfg.minVal;
}

function changeMax(d) {
  cfg.maxVal = Math.min(20, Math.max(cfg.minVal + 1, cfg.maxVal + d));
  const el = document.getElementById('maxVal');
  if (el) el.textContent = cfg.maxVal;
}

function changeRows(d) {
  cfg.rows = Math.max(1, Math.min(50, cfg.rows + d));
  const el = document.getElementById('rowsVal');
  if (el) el.textContent = cfg.rows;
}

function selectMode(m, el) {
  cfg.mode = m;
  (_container?.querySelectorAll('.mode-btn') ?? []).forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function renderLevelInfo() {
  const s = window.ChipMindStorage?.getSettings?.() ?? {};
  const infos = {
    beginner:     { color: 'var(--color-beginner)',     label: 'Débutant',      desc: 'Pas de chrono',    timing: 'Pas de limite de temps' },
    intermediate: { color: 'var(--color-intermediate)', label: 'Intermédiaire', desc: '30 s par cellule', timing: 'Chrono actif : 30 s par cellule' },
    expert:       { color: 'var(--color-expert)',       label: 'Expert',        desc: '10 s par cellule', timing: 'Chrono actif : 10 s par cellule' },
  };
  const info   = infos[s.level ?? 'beginner'] ?? infos.beginner;
  const badge  = document.getElementById('levelBadge');
  const text   = document.getElementById('levelInfoText');
  const timing = document.getElementById('condTimingNote');
  if (badge)  badge.style.background = info.color;
  if (text)   text.innerHTML = `<span class="level-info-name">${info.label}</span> — ${info.desc}`;
  if (timing) timing.textContent = info.timing;
}


/* ════════════════════════════════════════════════════
   GAME — LAUNCH
════════════════════════════════════════════════════ */
function launchGame() {
  const settings = window.ChipMindStorage?.getSettings?.() ?? {};
  const timerMap = { beginner: 0, intermediate: 30, expert: 10 };
  state.timerSeconds = timerMap[settings.level ?? 'beginner'] ?? 0;

  _rowPool.reset(cfg.minVal, cfg.maxVal);

  state.rows = [];
  for (let r = 0; r < cfg.rows; r++) {
    const multiplicand = _rowPool.next();
    const mults = shuffleArray([...MULTIPLIERS]);
    state.rows.push({
      multiplicand,
      multipliers: mults,
      answers: [null, null, null, null, null],
      correct: [false, false, false, false, false],
      hasError: false,
    });
  }

  state.currentRow   = 0;
  state.currentCell  = 0;
  state.totalCorrect = 0;
  state.totalWrong   = 0;
  state.errors       = [];
  state.phase        = 'main';
  state.mainTarget   = cfg.rows;
  state.startTime    = Date.now();
  state.currentInput = '';
  state.isAnswered   = false;

  window._bottomBar?.hide();
  showScreen('screenGame');
  setMusicContext('game');
  renderGameRow();
}

/* ════════════════════════════════════════════════════
   GAME — RENDER ROW
════════════════════════════════════════════════════ */
function renderGameRow() {
  state.isAnswered   = false;
  state.currentInput = '';

  const rowIdx = state.currentRow;
  const row    = state.rows[rowIdx];
  const total  = state.rows.length;

  document.getElementById('gameProgressFill').style.width = Math.round((rowIdx / total) * 100) + '%';
  document.getElementById('rowLabel').textContent         =
    state.phase === 'retry' ? `Rattrapage ${rowIdx + 1}/${total}` : `Ligne ${rowIdx + 1}/${total}`;
  document.getElementById('scoreOk').textContent          = state.totalCorrect;
  document.getElementById('scoreErr').textContent         = state.totalWrong;
  document.getElementById('multiplicandNum').textContent  = row.multiplicand;
  document.getElementById('multProgressText').textContent = `Cellule ${state.currentCell + 1}/5`;

  buildTableGrid(row);

  if (cfg.mode === 'libre') {
    document.getElementById('inputZone').style.display = 'flex';
    document.getElementById('qcmZone').style.display   = 'none';
    updateInputDisplay();
    buildNumpad();
  } else {
    document.getElementById('inputZone').style.display = 'none';
    document.getElementById('qcmZone').style.display   = 'grid';
    buildQCMChoices(row);
  }

  startTimer();
}

/* ════════════════════════════════════════════════════
   GAME — TABLE GRID
════════════════════════════════════════════════════ */
function buildTableGrid(row) {
  const grid = document.getElementById('tableGrid');
  if (!grid) return;
  grid.innerHTML = '';

  row.multipliers.forEach((mult, i) => {
    const el = document.createElement('div');
    el.className = 'table-row';
    el.id = `tableRow${i}`;
    el.style.animation = `rowReveal 0.3s var(--ease-out) ${i * 0.05}s both`;

    if (i === state.currentCell) el.classList.add('active-row');

    const ans = row.answers[i];
    let ansContent = '';
    if (ans === null) {
      if (i === state.currentCell) {
        ansContent = `<div class="answer-pending"><div class="dot-pending"></div><div class="dot-pending"></div><div class="dot-pending"></div></div>`;
      } else {
        ansContent = `<span style="font-family:var(--font-mono);font-size:0.55rem;color:var(--ivory-dim);opacity:0.4">?</span>`;
      }
    } else if (row.correct[i]) {
      el.classList.add('correct-row');
      ansContent = `<span class="answer-correct">${ans}</span>`;
    } else {
      el.classList.add('wrong-row');
      ansContent = `<span class="answer-wrong-val">${ans}</span><span class="answer-wrong-correct">${mult * row.multiplicand}</span>`;
    }

    el.innerHTML = `
      <div class="row-mult">
        <span class="row-mult-op">×</span>
        <span class="row-mult-val">${mult}</span>
        <span class="row-mult-suit">${SUITS_MAP[mult]}</span>
      </div>
      <span class="row-eq">=</span>
      <div class="row-answer">${ansContent}</div>`;

    grid.appendChild(el);
  });
}

/* ════════════════════════════════════════════════════
   SAISIE LIBRE
════════════════════════════════════════════════════ */
function buildNumpad() {
  const numpad = document.getElementById('numpad');
  if (!numpad) return;
  numpad.innerHTML = '';
  ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', ''].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn' + (k === '⌫' ? ' del' : '') + (k === '' ? ' dim' : '');
    btn.textContent = k;
    if (k === '⌫') {
      btn.addEventListener('click', () => {
        state.currentInput = state.currentInput.slice(0, -1);
        updateInputDisplay();
        soundPlay('chipDrop');
      });
    } else if (k !== '') {
      btn.addEventListener('click', () => {
        if (state.currentInput.length < 4) {
          state.currentInput += k;
          updateInputDisplay();
          soundPlay('chipDrop');
        }
      });
    }
    numpad.appendChild(btn);
  });
  const val = document.createElement('button');
  val.className = 'numpad-btn validate';
  val.textContent = 'Valider ↵';
  val.addEventListener('click', validateLibre);
  numpad.appendChild(val);
}

function updateInputDisplay() {
  const d = document.getElementById('inputDisplay');
  if (!d) return;
  d.className = 'input-display';
  d.innerHTML = state.currentInput === '' ? '<span class="input-placeholder">———</span>' : state.currentInput;
}

function validateLibre() {
  if (state.isAnswered || state.currentInput === '') return;
  state.isAnswered = true;
  stopTimer();
  const row      = state.rows[state.currentRow];
  const mult     = row.multipliers[state.currentCell];
  const expected = mult * row.multiplicand;
  const entered  = parseInt(state.currentInput, 10);
  handleAnswer(entered, expected, mult, row);
}

/* ════════════════════════════════════════════════════
   QCM
════════════════════════════════════════════════════ */
function buildQCMChoices(row) {
  const mult    = row.multipliers[state.currentCell];
  const correct = mult * row.multiplicand;
  const choices = makeChoices(correct, mult);
  const zone    = document.getElementById('qcmZone');
  if (!zone) return;
  zone.innerHTML = '';
  choices.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = val;
    btn.addEventListener('click', () => {
      if (state.isAnswered) return;
      state.isAnswered = true;
      stopTimer();
      handleAnswer(val, correct, mult, row);
      if (val !== correct) {
        zone.querySelectorAll('.choice-btn').forEach(b => {
          if (parseInt(b.textContent) === correct) b.classList.add('reveal');
          else if (b !== btn) b.classList.add('dim');
        });
      }
    });
    zone.appendChild(btn);
  });
}

function makeChoices(correct, multiplier) {
  const set = new Set([correct]);
  for (const d of shuffleArray([1, -1, 2, -2, 3, -3, 5, -5])) {
    if (set.size >= 4) break;
    const c = correct + d * multiplier;
    if (c > 0 && c !== correct) set.add(c);
  }
  while (set.size < 4) {
    const o = (Math.floor(Math.random() * 8) + 1) * multiplier;
    set.add(correct + (Math.random() < 0.5 ? o : -o));
  }
  return shuffleArray([...set]).slice(0, 4);
}

/* ════════════════════════════════════════════════════
   ANSWER HANDLING
════════════════════════════════════════════════════ */
function handleAnswer(entered, expected, mult, row) {
  const cellIdx   = state.currentCell;
  const isCorrect = entered === expected;

  row.answers[cellIdx] = entered;
  row.correct[cellIdx] = isCorrect;

  if (isCorrect) {
    state.totalCorrect++;
    showFeedback(true);
    _feedbackCorrect();
    const rowEl = document.getElementById(`tableRow${cellIdx}`);
    if (rowEl) {
      rowEl.classList.remove('active-row');
      rowEl.classList.add('correct-row');
      const ans = rowEl.querySelector('.row-answer');
      if (ans) ans.innerHTML = `<span class="answer-correct">${entered}</span>`;
    }
  } else {
    row.hasError = true;
    state.totalWrong++;
    state.errors.push({
      mult,
      multiplicand: row.multiplicand,
      userAnswer: entered === null ? '⏱' : entered,
      correct: expected,
    });
    showFeedback(false);
    _feedbackError();
    const rowEl = document.getElementById(`tableRow${cellIdx}`);
    if (rowEl) {
      rowEl.classList.remove('active-row');
      rowEl.classList.add('wrong-row');
      const ans = rowEl.querySelector('.row-answer');
      if (ans) ans.innerHTML = `<span class="answer-wrong-val">${entered}</span><span class="answer-wrong-correct">${expected}</span>`;
    }
    if (cfg.mode === 'qcm') {
      (_container?.querySelectorAll('.choice-btn') ?? []).forEach(b => {
        if (parseInt(b.textContent) === entered) b.classList.add('wrong');
      });
    }
  }

  const delay = isCorrect ? 500 : 1200;
  setTimeout(() => { clearFeedback(); nextCell(row); }, delay);
}

/* ════════════════════════════════════════════════════
   CELL → ROW NAVIGATION
════════════════════════════════════════════════════ */
function nextCell(row) {
  state.currentInput = '';
  state.currentCell++;

  if (state.currentCell >= 5) {
    state.currentCell = 0;
    state.currentRow++;
    if (state.currentRow >= state.rows.length) {
      if (state.phase === 'main' && state.rows.some(r => r.hasError)) {
        _startRetry();
      } else {
        endGame();
      }
    } else {
      renderGameRow();
    }
  } else {
    state.isAnswered = false;
    const progEl = document.getElementById('multProgressText');
    if (progEl) progEl.textContent = `Cellule ${state.currentCell + 1}/5`;
    buildTableGrid(row);
    updateInputDisplay();
    if (cfg.mode === 'qcm') buildQCMChoices(row);
    startTimer();
  }
}

function _startRetry() {
  state.phase = 'retry';
  state.rows  = state.rows.filter(r => r.hasError).map(r => ({
    multiplicand: r.multiplicand,
    multipliers:  shuffleArray([...MULTIPLIERS]),
    answers:      [null, null, null, null, null],
    correct:      [false, false, false, false, false],
    hasError:     false,
  }));
  state.currentRow  = 0;
  state.currentCell = 0;
  renderGameRow();
}

/* ════════════════════════════════════════════════════
   CHRONO
════════════════════════════════════════════════════ */
function startTimer() {
  const totalS = state.timerSeconds;
  const wrap   = document.getElementById('timerWrap');
  const fill   = document.getElementById('timerFill');
  const text   = document.getElementById('timerText');
  clearInterval(state.timerInterval);
  if (totalS === 0) {
    wrap?.classList.add('timer-hidden');
    text?.classList.add('timer-hidden');
    return;
  }
  wrap?.classList.remove('timer-hidden');
  text?.classList.remove('timer-hidden');
  fill?.classList.remove('warning');
  text?.classList.remove('warning');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '100%'; }
  if (text) text.textContent = totalS + 's';
  let remaining = totalS;
  if (fill) void fill.offsetWidth; /* force reflow — valide width:100% avant de lancer la transition */
  requestAnimationFrame(() => {
    if (fill) { fill.style.transition = `width ${totalS}s linear`; fill.style.width = '0%'; }
  });
  state.timerInterval = setInterval(() => {
    remaining--;
    if (text) text.textContent = remaining + 's';
    if (remaining <= Math.ceil(totalS * 0.3)) {
      fill?.classList.add('warning');
      text?.classList.add('warning');
      soundPlay('tick');
    }
    if (remaining <= 0) { clearInterval(state.timerInterval); timeOutCell(); }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function timeOutCell() {
  if (state.isAnswered) return;
  state.isAnswered = true;
  const row  = state.rows[state.currentRow];
  const mult = row.multipliers[state.currentCell];
  handleAnswer(null, mult * row.multiplicand, mult, row);
}

/* ════════════════════════════════════════════════════
   FEEDBACK VISUEL
════════════════════════════════════════════════════ */
function showFeedback(ok, override) {
  const ov = document.getElementById('feedbackOverlay');
  const tx = document.getElementById('feedbackText');
  if (!ov || !tx) return;
  ov.className = 'feedback-overlay show ' + (ok ? 'ok-fb' : 'bad-fb');
  tx.textContent = override ?? (ok ? '✓' : '✗');
  tx.classList.add('bounce-in');
}

function clearFeedback() {
  const ov = document.getElementById('feedbackOverlay');
  const tx = document.getElementById('feedbackText');
  if (ov) ov.className = 'feedback-overlay';
  if (tx) tx.classList.remove('bounce-in');
}

/* ════════════════════════════════════════════════════
   FIN DE SESSION
════════════════════════════════════════════════════ */
function endGame() {
  stopTimer();
  setMusicContext('ambient');
  const totalMs  = Date.now() - state.startTime;
  const mainRows = state.mainTarget ?? state.rows.length;
  const total    = mainRows * 5;
  const rate     = Math.round((state.totalCorrect / total) * 100);
  const settings = window.ChipMindStorage?.getSettings?.() ?? {};

  const stars = calcStarsModule2(cfg.mode, state.totalWrong, mainRows);

  window.ChipMindApp?.endSession?.({
    moduleId: 2, stars, successRate: rate, timeMs: totalMs,
    extra: { mode: cfg.mode, rowsPlayed: mainRows, minVal: cfg.minVal, maxVal: cfg.maxVal },
  });
  window.ChipMindStorage?.updateModuleScore?.(2, settings.level ?? 'beginner', 'normal', rate);

  showScreen('screenResults');
  window._bottomBar?.showEndGame(() => window._m02?.launchGame(), () => window._m02?.replaySession());

  const titles = {
    0: ['À retravailler',  'Continue à pratiquer le tableau mélangé !'],
    1: ['Bien joué !',     'Une étoile méritée — continue ainsi.'],
    2: ['Très bien !',     'Deux étoiles, tu maîtrises le tableau.'],
    3: ['Parfait !',       'Trois étoiles — niveau croupier atteint.'],
  };
  const [title, sub] = titles[stars] ?? titles[0];
  document.getElementById('resultTitle').textContent    = title;
  document.getElementById('resultSubtitle').textContent = sub;
  document.getElementById('rstatScore').textContent     = rate + '%';
  document.getElementById('rstatTime').textContent      = formatTime(totalMs);
  document.getElementById('rstatRows').textContent      = mainRows;

  (_container?.querySelectorAll('.result-star') ?? []).forEach((el, i) => {
    el.classList.remove('lit', 'star-pop');
    if (i < stars) setTimeout(() => el.classList.add('lit', 'star-pop'), 300 + i * 250);
  });

  renderResultConditions(mainRows);

  const errSec = document.getElementById('errorsSection');
  if (state.errors.length > 0) {
    errSec.style.display = 'block';
    const seen = new Set();
    document.getElementById('errorsList').innerHTML = state.errors
      .filter(e => {
        const k = `${e.multiplicand}×${e.mult}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 12)
      .map(e => `
        <div class="error-item">
          <div class="error-q">${e.multiplicand} × ${e.mult}</div>
          <span class="error-your">${e.userAnswer}</span>
          <span class="error-correct">= ${e.correct}</span>
        </div>`).join('');
  } else {
    errSec.style.display = 'none';
  }
}

function renderResultConditions(rows) {
  const errors = state.totalWrong;

  const conds = [
    {
      stars: '★',
      met:   cfg.mode === 'qcm'   && rows >= 20 && errors === 0,
      text:  `QCM · ${rows}/20 lignes · ${errors} faute${errors !== 1 ? 's' : ''}/0 max`,
      icon:  '🔘',
      hint:  'Jouer en QCM avec 20+ lignes sans faute',
    },
    {
      stars: '★★',
      met:   cfg.mode === 'libre' && rows >= 10 && errors === 0,
      text:  `Saisie Libre · ${rows}/10 lignes · ${errors} faute${errors !== 1 ? 's' : ''}/0 max`,
      icon:  '⌨️',
      hint:  'Jouer en Saisie Libre avec 10+ lignes sans faute',
    },
    {
      stars: '★★★',
      met:   cfg.mode === 'libre' && rows >= 20 && errors === 0,
      text:  `Saisie Libre · ${rows}/20 lignes · ${errors} faute${errors !== 1 ? 's' : ''}/0 max`,
      icon:  '⌨️',
      hint:  'Jouer en Saisie Libre avec 20+ lignes sans faute',
    },
  ];

  document.getElementById('resultCondList').innerHTML = conds.map((c, i) => `
    <div class="result-cond-row ${c.met ? 'met' : 'unmet'}" style="animation:rowReveal 0.35s var(--ease-out) ${0.1 + i * 0.08}s both">
      <span class="rcond-icon">${c.icon}</span>
      <span class="rcond-text"><strong>${c.stars}</strong> — ${c.text}</span>
      <span class="rcond-badge">${c.met ? '✓' : '✗ ' + c.hint}</span>
    </div>`).join('');

  const earned = calcStarsModule2(cfg.mode, errors, rows);
  const banner = document.getElementById('starsEarnedBanner');
  if (earned > 0) {
    banner.className = 'stars-earned-banner earned';
    banner.innerHTML = `${'★'.repeat(earned)} gagnée${earned > 1 ? 's' : ''} sur ce niveau de difficulté !`;
  } else {
    banner.className = 'stars-earned-banner not-earned';
    banner.textContent = 'Conditions non remplies — aucune étoile accordée.';
  }
}

function replaySession() {
  window._bottomBar?.showLaunch(() => window._m02?.launchGame(), 'Lancer la session 🔀');
  showScreen('screenConfig');
}

function confirmAbort() {
  soundPlay('back');
  window._showConfirmModal?.({
    title: 'Abandonner ?',
    message: 'Ta progression dans cette session sera perdue.',
    cancelLabel:  'Continuer',
    confirmLabel: 'Abandonner',
    onConfirm: () => {
      stopTimer();
      setTimeout(() => {
        setMusicContext('ambient');
        window._bottomBar?.showLaunch(() => window._m02?.launchGame(), 'Lancer la session 🔀');
        showScreen('screenConfig');
      }, 120);
    },
  });
}

/* ════════════════════════════════════════════════════
   MODULE EXPORT
════════════════════════════════════════════════════ */
export const module = {
  id:           'module02',
  type:         'training',
  label:        'Tableau Mélangé',
  icon:         '🔀',
  modes:        ['libre', 'qcm'],
  difficulties: ['beginner', 'intermediate', 'expert'],

  render(container) {
    _cleanup();
    _container = container;

    if (!document.getElementById('mod02-styles')) {
      const style = document.createElement('style');
      style.id = 'mod02-styles';
      style.textContent = _CSS;
      document.head.appendChild(style);
    }

    container.innerHTML = _HTML;

    /* Sync persisted config to DOM */
    container.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.mode === cfg.mode);
    });
    const minEl  = document.getElementById('minVal');
    const maxEl  = document.getElementById('maxVal');
    const rowsEl = document.getElementById('rowsVal');
    if (minEl)  minEl.textContent  = cfg.minVal;
    if (maxEl)  maxEl.textContent  = cfg.maxVal;
    if (rowsEl) rowsEl.textContent = cfg.rows;

    renderLevelInfo();

    _keydownHandler = (e) => {
      if (!document.getElementById('screenGame')?.classList.contains('active')) return;
      if (cfg.mode !== 'libre') return;
      if (e.key >= '0' && e.key <= '9' && state.currentInput.length < 4) {
        state.currentInput += e.key;
        updateInputDisplay();
      } else if (e.key === 'Backspace') {
        state.currentInput = state.currentInput.slice(0, -1);
        updateInputDisplay();
      } else if (e.key === 'Enter') {
        validateLibre();
      }
    };
    document.addEventListener('keydown', _keydownHandler);

    window._activeModuleCleanup = _cleanup;
    window._m02 = {
      changeMin, changeMax, changeRows, selectMode,
      launchGame, confirmAbort, replaySession, goBack: _goBack,
    };

    window._bottomBar?.showLaunch(() => window._m02?.launchGame(), 'Lancer la session 🔀');
    setMusicContext('ambient');
  },

  start()  {},
  end()    {},

  getProgress() {
    return { stars: 0, bestTime: null, successRate: null };
  },

  getStars(session) {
    return calcStarsModule2(
      session.mode ?? cfg.mode,
      session.wrong ?? 0,
      session.rowsPlayed ?? cfg.rows
    );
  },

  getAchievements() { return []; },
};

export default module;
