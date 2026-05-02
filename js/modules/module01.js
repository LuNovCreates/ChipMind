/* ════════════════════════════════════════════════════
   ChipMind — module01.js
   Tables Croupier — SPA module
════════════════════════════════════════════════════ */

import { navigate }                                       from '../core/router.js';
import { get }                                            from '../core/state.js';
import { play as soundPlay, setMusicContext }             from '../core/sound.js';
import { shuffleArray, formatTime }  from '../core/gameHelpers.js';
import { calculateSessionScore, TABLE_CONFIG_FACTORS }   from '../core/scoring.js';

/* ── Data ── */
const TABLES = [
  { mult: 5,  label: '×5',  range: 20 },
  { mult: 8,  label: '×8',  range: 20 },
  { mult: 11, label: '×11', range: 20 },
  { mult: 17, label: '×17', range: 20 },
  { mult: 35, label: '×35', range: 20 },
];

const ALL_QUESTIONS = [];
TABLES.forEach(t => {
  for (let i = 1; i <= t.range; i++) {
    ALL_QUESTIONS.push({ multiplicand: i, multiplier: t.mult, answer: i * t.mult, tableLabel: t.label });
  }
});

/* ── Persisted config (survives re-renders) ── */
const cfg = {
  selectedTables: [5],
  mode: 'flashcard',
  qty:  20,
};

/* ── Session state (reset each game) ── */
const state = {
  questions: [], current: 0, correct: 0, wrong: 0, errors: [],
  startTime: null, timerInterval: null, timerSeconds: 0,
  isAnswered: false, currentInput: '', isFlipped: false,
  sessionQuestions: [], questionStartTime: null,
};

let _container       = null;
let _keydownHandler  = null;

/* ════════════════════════════════════════════════════
   CSS spécifique module01
════════════════════════════════════════════════════ */
const _CSS = `
.bg-felt::after {
  content: '♠'; position: absolute; bottom: -20px; right: -20px;
  font-size: 18rem; color: var(--gold); opacity: 0.025; line-height: 1; pointer-events: none;
}

.config-section { margin-bottom: 26px; }

.tables-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.table-btn {
  aspect-ratio: 1; border-radius: var(--radius-sm);
  background: var(--ivory-faint); border: 1px solid var(--gold-border);
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; cursor: pointer; transition: all 0.2s var(--ease-spring);
  position: relative; overflow: hidden;
}
.table-btn .tb-mult {
  font-family: var(--font-serif); font-size: 1.1rem; font-weight: 700;
  color: var(--ivory); line-height: 1;
}
.table-btn .tb-label {
  font-family: var(--font-mono); font-size: 0.42rem;
  color: var(--ivory-dim); letter-spacing: 0.08em; margin-top: 2px;
}
.table-btn.selected {
  background: linear-gradient(145deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1));
  border-color: var(--gold); box-shadow: 0 0 14px var(--gold-glow);
}
.table-btn.selected .tb-mult { color: var(--gold-light); }
.table-btn:hover { transform: scale(1.06); }
.table-btn .check-mark {
  position: absolute; top: 4px; right: 5px;
  font-size: 0.5rem; color: var(--gold); opacity: 0; transition: opacity 0.2s;
}
.table-btn.selected .check-mark { opacity: 1; }

.modes-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.mode-btn {
  border-radius: var(--radius-sm); padding: 14px 8px;
  background: var(--ivory-faint); border: 1px solid var(--gold-border);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; transition: all 0.2s var(--ease-spring);
}
.mode-btn .mode-icon { font-size: 1.6rem; }
.mode-btn .mode-name {
  font-family: var(--font-mono); font-size: 0.55rem; color: var(--ivory);
  text-transform: uppercase; letter-spacing: 0.08em; text-align: center; line-height: 1.3;
}
.mode-btn .mode-desc {
  font-family: var(--font-mono); font-size: 0.45rem;
  color: var(--ivory-dim); text-align: center; line-height: 1.4;
}
.mode-btn.selected {
  background: linear-gradient(145deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08));
  border-color: var(--gold); box-shadow: 0 0 12px var(--gold-glow);
}
.mode-btn.selected .mode-name { color: var(--gold-light); }
.mode-btn:hover { transform: translateY(-3px); }

.qty-row {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--ivory-faint); border: 1px solid var(--gold-border);
  border-radius: var(--radius-sm); padding: 10px 14px;
}
.qty-label { font-family: var(--font-mono); font-size: 0.58rem; color: var(--ivory-dim); letter-spacing: 0.06em; }
.qty-controls { display: flex; align-items: center; gap: 12px; }
.qty-btn {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--gold-subtle); border: 1px solid var(--gold-border);
  color: var(--gold); font-size: 1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.qty-btn:hover { background: rgba(201,168,76,0.25); }
.qty-value {
  font-family: var(--font-serif); font-size: 1.2rem; font-weight: 700;
  color: var(--gold-light); min-width: 28px; text-align: center;
}


.game-progress-text {
  font-family: var(--font-mono); font-size: 0.58rem;
  color: var(--gold); letter-spacing: 0.12em; text-transform: uppercase;
}
.game-score-display { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.08em; }
.score-correct { color: var(--green-light); }
.score-sep { color: var(--ivory-dim); margin: 0 2px; }
.score-wrong { color: var(--red-light); }

.question-zone {
  flex: 1;
  min-height: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 6px 20px 10px; gap: 6px;
  overflow: hidden;
}
.question-table-label {
  font-family: var(--font-mono); font-size: 0.55rem;
  color: var(--gold); letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.7;
}
.question-card {
  width: 100%; background: linear-gradient(145deg, var(--felt-card), var(--felt-mid));
  border: 1px solid var(--gold-border); border-radius: var(--radius-lg);
  padding: 22px 20px; text-align: center; box-shadow: var(--shadow-card);
  position: relative; overflow: hidden; transition: transform 0.15s var(--ease-spring);
}
.question-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 45%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.04), transparent);
}
.card-corner {
  position: absolute; font-family: var(--font-serif); font-size: 0.7rem;
  color: var(--gold); opacity: 0.35; line-height: 1;
}
.card-corner.tl { top: 10px; left: 12px; }
.card-corner.br { bottom: 10px; right: 12px; transform: rotate(180deg); }
.question-text {
  font-family: var(--font-serif); font-size: 2.3rem; font-weight: 900;
  color: var(--ivory); letter-spacing: -0.02em; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
}
.question-text .op-mult { color: var(--gold); }
.question-mark {
  font-family: var(--font-serif); font-size: 2.4rem; font-weight: 900;
  color: var(--gold-light); letter-spacing: -0.02em;
  filter: drop-shadow(0 0 10px var(--gold-glow));
  animation: pulseQ 1.8s ease-in-out infinite;
}
@keyframes pulseQ {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.65; transform: scale(0.95); }
}

.flashcard-container { width: 100%; perspective: 1000px; }
.flashcard-inner {
  position: relative; transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.22,1,0.36,1); cursor: pointer;
}
.flashcard-inner.flipped { transform: rotateY(180deg); }
.flashcard-face {
  width: 100%; border-radius: var(--radius-lg);
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.flashcard-back { position: absolute; top: 0; left: 0; transform: rotateY(180deg); }
.flash-hint {
  font-family: var(--font-mono); font-size: 0.52rem; color: var(--ivory-dim);
  letter-spacing: 0.12em; text-transform: uppercase;
  margin-top: 6px; text-align: center; opacity: 0.7;
  animation: blink 2s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:0.7} 50%{opacity:0.3} }
.answer-revealed {
  font-family: var(--font-serif); font-size: 2.8rem; font-weight: 900;
  color: var(--green-light); filter: drop-shadow(0 0 12px var(--green-glow));
}
.self-eval-btns { display: flex; gap: 8px; width: 100%; margin-top: 8px; }
.self-eval-btns.hidden { visibility: hidden; }
.btn-knew, .btn-didnt {
  flex: 1; padding: 10px; border-radius: var(--radius);
  border: none; cursor: pointer; font-family: var(--font-mono);
  font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em;
  font-weight: 600; transition: all 0.2s var(--ease-spring);
}
.btn-knew {
  background: linear-gradient(135deg, rgba(39,174,96,0.25), rgba(39,174,96,0.12));
  border: 1px solid rgba(39,174,96,0.4); color: var(--green-light);
}
.btn-knew:hover { background: rgba(39,174,96,0.3); transform: translateY(-2px); }
.btn-didnt {
  background: linear-gradient(135deg, rgba(192,57,43,0.22), rgba(192,57,43,0.1));
  border: 1px solid rgba(192,57,43,0.35); color: var(--red-light);
}
.btn-didnt:hover { background: rgba(192,57,43,0.28); transform: translateY(-2px); }

.qcm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.qcm-btn {
  padding: 13px 10px; border-radius: var(--radius);
  background: linear-gradient(145deg, var(--felt-card), var(--felt-mid));
  border: 1px solid var(--gold-border); cursor: pointer;
  font-family: var(--font-serif); font-size: 1.3rem; font-weight: 700;
  color: var(--ivory); text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: all 0.18s var(--ease-spring);
  position: relative; overflow: hidden;
}
.qcm-btn:hover { transform: translateY(-3px) scale(1.03); border-color: rgba(201,168,76,0.45); }
.qcm-btn:active { transform: scale(0.96); }
.qcm-btn.correct {
  background: linear-gradient(145deg, rgba(39,174,96,0.3), rgba(39,174,96,0.15));
  border-color: var(--green-light); color: var(--green-light);
  box-shadow: 0 0 20px var(--green-glow); transform: scale(1.04);
}
.qcm-btn.wrong {
  background: linear-gradient(145deg, rgba(192,57,43,0.28), rgba(192,57,43,0.12));
  border-color: var(--red-light); color: var(--red-light);
  box-shadow: 0 0 16px var(--red-glow);
}
.qcm-btn.disabled { pointer-events: none; opacity: 0.45; }
.qcm-btn.reveal-correct { border-color: rgba(39,174,96,0.5); color: rgba(39,174,96,0.7); }
.correct-hint {
  font-family: var(--font-mono); font-size: 0.58rem; color: var(--green-light);
  text-align: center; letter-spacing: 0.08em; opacity: 0; height: 0;
  transition: opacity 0.3s, height 0.2s;
}
.correct-hint.show { opacity: 1; height: auto; margin-top: 6px; }

@keyframes condSlide {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
.cond-animate { animation: condSlide 0.35s var(--ease-out) both; }
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
    <button class="btn-back" onclick="window._m01?.goBack()">←</button>
    <div>
      <div class="header-title">Tables Croupier</div>
      <div class="header-sub">Module 01 · ×5 ×8 ×11 ×17 ×35</div>
    </div>
    <span style="font-size:1.5rem;filter:drop-shadow(0 0 6px var(--gold-glow))">✖️</span>
  </div>

  <div class="config-body">

    <div class="config-section">
      <div class="config-label">Choisir les tables</div>
      <div class="tables-grid" id="tablesGrid"></div>
    </div>

    <div class="config-section">
      <div class="config-label">Mode de jeu</div>
      <div class="modes-grid">
        <div class="mode-btn" data-mode="flashcard" onclick="window._m01?.selectMode('flashcard',this)">
          <span class="mode-icon">🃏</span>
          <span class="mode-name">Flash Card</span>
          <span class="mode-desc">Révèle, auto-évalue</span>
        </div>
        <div class="mode-btn" data-mode="qcm" onclick="window._m01?.selectMode('qcm',this)">
          <span class="mode-icon">🔘</span>
          <span class="mode-name">QCM</span>
          <span class="mode-desc">4 choix proposés</span>
        </div>
        <div class="mode-btn" data-mode="libre" onclick="window._m01?.selectMode('libre',this)">
          <span class="mode-icon">⌨️</span>
          <span class="mode-name">Saisie Libre</span>
          <span class="mode-desc">Tape la réponse</span>
        </div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Nombre de questions</div>
      <div class="qty-row">
        <span class="qty-label">Questions par session</span>
        <div class="qty-controls">
          <button class="qty-btn" onclick="window._m01?.changeQty(-5)">−</button>
          <span class="qty-value" id="qtyValue">20</span>
          <button class="qty-btn" onclick="window._m01?.changeQty(5)">+</button>
        </div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Niveau actif</div>
      <div class="level-info" id="levelInfo">
        <div class="level-badge" id="levelBadge"></div>
        <div class="level-info-text" id="levelInfoText"></div>
      </div>
    </div>

    <div class="config-section">
      <div class="config-label">Conditions pour les étoiles</div>
      <div class="star-conditions">
        <div class="star-cond-title">Étoiles selon le mode de jeu · 30 questions minimum</div>
        <div class="cond-row">
          <div class="cond-dot unmet">★</div>
          <span class="cond-text">Flash Card · 30 questions</span>
        </div>
        <div class="cond-row">
          <div class="cond-dot unmet">★★</div>
          <span class="cond-text">QCM · 30 questions · ≤ 2 fautes</span>
        </div>
        <div class="cond-row">
          <div class="cond-dot unmet">★★★</div>
          <span class="cond-text">Saisie Libre · 30 questions · ≤ 2 fautes</span>
        </div>
        <div class="star-cond-reward" id="condTimingNote">Chrono : —</div>
      </div>
    </div>

  </div>

</div>

<div class="screen" id="screenGame">

  <div class="game-status">
    <button class="btn-back" onclick="window._m01?.confirmAbort()">✕</button>
    <span class="game-progress-text" id="gameProgressText">1/20</span>
    <div class="game-progress-bar">
      <div class="game-progress-fill" id="gameProgressFill" style="width:0%"></div>
    </div>
    <div class="game-score-display">
      <span class="score-correct" id="scoreCorrect">0</span>
      <span class="score-sep">/</span>
      <span class="score-wrong" id="scoreWrong">0</span>
    </div>
  </div>

  <div class="timer-wrap" id="timerWrap">
    <div class="timer-fill" id="timerFill"></div>
  </div>
  <div class="timer-text" id="timerText">—</div>

  <div class="question-zone">
    <div class="question-table-label" id="questionTableLabel">Table ×17</div>

    <div id="modeFlash" style="width:100%">
      <div class="flashcard-container">
        <div class="flashcard-inner" id="flashInner" onclick="window._m01?.flipCard()">
          <div class="flashcard-face question-card">
            <div class="card-corner tl" id="fcCornerTL">♠</div>
            <div class="card-corner br" id="fcCornerBR">♠</div>
            <div id="flashQuestion" class="question-text"></div>
            <div class="question-mark" id="flashMark">?</div>
          </div>
          <div class="flashcard-face flashcard-back question-card">
            <div class="card-corner tl">♦</div>
            <div class="card-corner br">♦</div>
            <div style="font-family:var(--font-mono);font-size:0.5rem;color:var(--ivory-dim);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px">Réponse</div>
            <div class="answer-revealed" id="flashAnswer"></div>
          </div>
        </div>
      </div>
      <div class="flash-hint" id="flashHint">Tape pour retourner la carte</div>
      <div class="self-eval-btns hidden" id="selfEvalBtns">
        <button class="btn-didnt" onclick="window._m01?.selfEval(false)">✗ Je ne savais pas</button>
        <button class="btn-knew"  onclick="window._m01?.selfEval(true)">✓ Je savais</button>
      </div>
    </div>

    <div id="modeQCM" style="width:100%;display:none">
      <div class="question-card">
        <div class="card-corner tl" id="qcmCornerTL">♥</div>
        <div class="card-corner br" id="qcmCornerBR">♥</div>
        <div id="qcmQuestion" class="question-text"></div>
        <div class="question-mark">?</div>
      </div>
    </div>

    <div id="modeLibre" style="width:100%;display:none">
      <div class="question-card">
        <div class="card-corner tl" id="libreCornerTL">♣</div>
        <div class="card-corner br" id="libreCornerBR">♣</div>
        <div id="libreQuestion" class="question-text"></div>
        <div class="question-mark">?</div>
      </div>
    </div>

  </div>

  <div class="answer-zone">
    <div id="answerQCM" style="display:none">
      <div class="qcm-grid" id="qcmGrid"></div>
      <div class="correct-hint" id="correctHint"></div>
    </div>
    <div id="answerLibre" class="input-zone" style="display:none">
      <div class="input-display" id="inputDisplay">
        <span class="input-placeholder">———</span>
      </div>
      <div class="numpad" id="numpad"></div>
    </div>
  </div>

</div>

<div class="screen" id="screenResults">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m01?.goBack()">←</button>
    <div>
      <div class="header-title">Résultats</div>
      <div class="header-sub">Tables Croupier · Module 01</div>
    </div>
  </div>

  <div class="results-body">

    <div class="result-stars" id="resultStars">
      <span class="result-star">★</span>
      <span class="result-star">★</span>
      <span class="result-star">★</span>
    </div>

    <div style="text-align:center">
      <div class="result-title"  id="resultTitle">Résultats</div>
      <div class="result-subtitle" id="resultSubtitle"></div>
    </div>

    <div class="result-stats">
      <div class="rstat">
        <div class="rstat-value" id="rstatScore">—</div>
        <div class="rstat-label">Réussite</div>
      </div>
      <div class="rstat">
        <div class="rstat-value" id="rstatTime">—</div>
        <div class="rstat-label">Temps</div>
      </div>
      <div class="rstat">
        <div class="rstat-value" id="rstatQuestions">—</div>
        <div class="rstat-label">Questions</div>
      </div>
    </div>

    <div class="score-highlight-row" id="rstatPointsRow" style="display:none">
      <span id="rstatPoints">—</span><span class="new-record-badge" id="rstatNewRecord" style="display:none"> ✦ Nouveau record !</span>
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
function calcStarsModule1(mode, errors, totalQuestions) {
  if (totalQuestions < 30)               return 0;
  if (mode === 'flashcard')              return 1;
  if (mode === 'qcm'   && errors <= 2)  return 2;
  if (mode === 'libre' && errors <= 2)  return 3;
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
  delete window._m01;
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
   QUESTION POOL — pool exhaustif avec réinitialisation auto
════════════════════════════════════════════════════ */
class QuestionPool {
  constructor() { this._all = []; this._remaining = []; }
  reset(questions) {
    this._all       = [...questions];
    this._remaining = shuffleArray([...this._all]);
  }
  next() {
    if (this._remaining.length === 0)
      this._remaining = shuffleArray([...this._all]);
    return this._remaining.pop();
  }
}
const _pool = new QuestionPool();

/* ════════════════════════════════════════════════════
   CONFIG UI
════════════════════════════════════════════════════ */
function buildTablesGrid() {
  const grid = document.getElementById('tablesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  TABLES.forEach(t => {
    const btn = document.createElement('div');
    btn.className = 'table-btn' + (cfg.selectedTables.includes(t.mult) ? ' selected' : '');
    btn.setAttribute('data-mult', t.mult);
    btn.innerHTML = `
      <span class="check-mark">✓</span>
      <span class="tb-mult">${t.label}</span>
      <span class="tb-label">jusqu'à ×20</span>`;
    btn.addEventListener('click', () => { toggleTable(t.mult, btn); });
    grid.appendChild(btn);
  });
}

function toggleTable(mult, btn) {
  const idx = cfg.selectedTables.indexOf(mult);
  if (idx === -1) {
    cfg.selectedTables.push(mult);
    btn.classList.add('selected');
  } else {
    if (cfg.selectedTables.length === 1) return;
    cfg.selectedTables.splice(idx, 1);
    btn.classList.remove('selected');
  }
}

function selectMode(mode, el) {
  cfg.mode = mode;
  (_container?.querySelectorAll('.mode-btn') ?? []).forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function changeQty(delta) {
  cfg.qty = Math.min(100, Math.max(5, cfg.qty + delta));
  const el = document.getElementById('qtyValue');
  if (el) el.textContent = cfg.qty;
}


function renderLevelInfo() {
  const settings = window.ChipMindStorage?.getSettings?.() ?? {};
  const lvl = settings.level ?? 'beginner';
  const infos = {
    beginner:     { color: 'var(--color-beginner)',     label: 'Débutant',      desc: 'Pas de chrono',     timing: 'Pas de limite de temps' },
    intermediate: { color: 'var(--color-intermediate)', label: 'Intermédiaire', desc: '30 s par question', timing: 'Chrono actif : 30 s par question' },
    expert:       { color: 'var(--color-expert)',       label: 'Expert',        desc: '10 s par question', timing: 'Chrono actif : 10 s par question · non répondu = erreur' },
  };
  const info   = infos[lvl] ?? infos.beginner;
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
  const settings   = window.ChipMindStorage?.getSettings?.() ?? {};
  const filteredQ  = ALL_QUESTIONS.filter(q => cfg.selectedTables.includes(q.multiplier));
  _pool.reset(filteredQ);
  state.questions       = Array.from({ length: cfg.qty }, () => _pool.next());
  state.phase           = 'main';
  state.mainTarget      = cfg.qty;
  state.current         = 0;
  state.correct         = 0;
  state.wrong           = 0;
  state.errors          = [];
  state.startTime       = Date.now();
  state.isAnswered      = false;
  state.currentInput    = '';
  state.isFlipped       = false;
  state.sessionQuestions  = [];
  state.questionStartTime = null;

  const timerMap   = { beginner: 0, intermediate: 30, expert: 10 };
  state.timerSeconds = timerMap[settings.level ?? 'beginner'] ?? 0;

  window._bottomBar?.hide();
  showScreen('screenGame');
  setMusicContext('game');
  renderQuestion();
}

/* ════════════════════════════════════════════════════
   GAME — RENDER QUESTION
════════════════════════════════════════════════════ */
function renderQuestion() {
  state.isAnswered        = false;
  state.isFlipped         = false;
  state.currentInput      = '';
  state.questionStartTime = Date.now();

  const q     = state.questions[state.current];
  const idx   = state.current;
  const total = state.questions.length;

  document.getElementById('gameProgressText').textContent =
    state.phase === 'retry' ? `Rattrapage ${idx + 1}/${total}` : `${idx + 1}/${total}`;
  document.getElementById('gameProgressFill').style.width = Math.round((idx / total) * 100) + '%';
  document.getElementById('scoreCorrect').textContent = state.correct;
  document.getElementById('scoreWrong').textContent   = state.wrong;

  const suitMap = { 5: '♠', 8: '♥', 11: '♦', 17: '♣', 35: '♠' };
  const suit = suitMap[q.multiplier] ?? '♠';
  (_container?.querySelectorAll('[id^="fcCorner"],[id^="qcmCorner"],[id^="libreCorner"]') ?? [])
    .forEach(el => el.textContent = suit);
  document.getElementById('questionTableLabel').textContent = `Table ×${q.multiplier}`;

  const qText = `<span>${q.multiplicand}</span> <span class="op-mult">×</span> <span>${q.multiplier}</span>`;

  hideAllModes();
  startTimer();

  if (cfg.mode === 'flashcard') renderFlashCard(q, qText);
  else if (cfg.mode === 'qcm') renderQCM(q, qText);
  else                         renderLibre(q, qText);
}

/* ════════════════════════════════════════════════════
   FLASH CARD
════════════════════════════════════════════════════ */
function renderFlashCard(q, qText) {
  document.getElementById('modeFlash').style.display = 'block';
  document.getElementById('flashQuestion').innerHTML  = qText;
  document.getElementById('flashAnswer').textContent  = q.answer;
  document.getElementById('flashInner').classList.remove('flipped');
  document.getElementById('flashHint').style.display  = 'block';
  document.getElementById('selfEvalBtns').classList.add('hidden');
}

function flipCard() {
  if (state.isAnswered) return;
  state.isFlipped = !state.isFlipped;
  document.getElementById('flashInner').classList.toggle('flipped', state.isFlipped);
  document.getElementById('flashHint').style.display = state.isFlipped ? 'none' : 'block';
  if (state.isFlipped) {
    soundPlay('cardFlip');
    stopTimer();
    document.getElementById('selfEvalBtns').classList.remove('hidden');
  } else {
    document.getElementById('selfEvalBtns').classList.add('hidden');
  }
}

function selfEval(knew) {
  if (state.isAnswered) return;
  state.isAnswered = true;
  if (knew) {
    state.correct++;
    showFeedback(true);
    _feedbackCorrect();
  } else {
    state.wrong++;
    state.errors.push({ q: state.questions[state.current], userAnswer: '—', correct: state.questions[state.current].answer });
    showFeedback(false);
    _feedbackError();
  }
  setTimeout(nextQuestion, 700);
}

/* ════════════════════════════════════════════════════
   QCM
════════════════════════════════════════════════════ */
function renderQCM(q, qText) {
  document.getElementById('modeQCM').style.display    = 'block';
  document.getElementById('answerQCM').style.display  = 'block';
  document.getElementById('qcmQuestion').innerHTML = qText;
  document.getElementById('correctHint').classList.remove('show');
  const grid = document.getElementById('qcmGrid');
  grid.innerHTML = '';
  generateChoices(q.answer, q.multiplier).forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'qcm-btn';
    btn.textContent = val;
    btn.addEventListener('click', () => handleQCM(val, q, btn));
    grid.appendChild(btn);
  });
}

function handleQCM(chosen, q, btn) {
  if (state.isAnswered) return;
  state.isAnswered = true;
  stopTimer();
  state.sessionQuestions.push({ correct: chosen === q.answer, timeout: false, timeMs: Date.now() - (state.questionStartTime ?? Date.now()) });
  const allBtns = _container?.querySelectorAll('.qcm-btn') ?? [];
  if (chosen === q.answer) {
    btn.classList.add('correct');
    state.correct++;
    showFeedback(true);
    _feedbackCorrect();
    setTimeout(nextQuestion, 900);
  } else {
    btn.classList.add('wrong');
    state.wrong++;
    state.errors.push({ q, userAnswer: chosen, correct: q.answer });
    showFeedback(false);
    _feedbackError();
    allBtns.forEach(b => {
      if (parseInt(b.textContent) === q.answer) b.classList.add('reveal-correct');
      else if (b !== btn) b.classList.add('disabled');
    });
    const hint = document.getElementById('correctHint');
    hint.textContent = `Réponse correcte : ${q.answer}`;
    hint.classList.add('show');
    setTimeout(nextQuestion, 1600);
  }
}

function generateChoices(correct, multiplier) {
  const choices = new Set([correct]);
  for (const delta of shuffleArray([1, -1, 2, -2, 3, -3, 5, -5])) {
    if (choices.size >= 4) break;
    const c = correct + delta * multiplier;
    if (c > 0 && c !== correct) choices.add(c);
  }
  while (choices.size < 4) {
    const o = (Math.floor(Math.random() * 8) + 1) * multiplier;
    choices.add(correct + (Math.random() < 0.5 ? o : -o));
  }
  return shuffleArray([...choices]).slice(0, 4);
}

/* ════════════════════════════════════════════════════
   SAISIE LIBRE
════════════════════════════════════════════════════ */
function renderLibre(q, qText) {
  document.getElementById('modeLibre').style.display   = 'block';
  document.getElementById('answerLibre').style.display = 'flex';
  document.getElementById('libreQuestion').innerHTML  = qText;
  updateInputDisplay();
  buildNumpad();
}

function buildNumpad() {
  const numpad = document.getElementById('numpad');
  numpad.innerHTML = '';
  ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', ''].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn' + (k === '⌫' ? ' del' : '') + (k === '' ? ' disabled' : '');
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
  val.id = 'validateBtn';
  val.textContent = 'Valider ↵';
  val.addEventListener('click', validateLibre);
  numpad.appendChild(val);
}

function updateInputDisplay() {
  const disp = document.getElementById('inputDisplay');
  if (!disp) return;
  disp.className = 'input-display';
  disp.innerHTML = state.currentInput === '' ? '<span class="input-placeholder">———</span>' : state.currentInput;
}

function validateLibre() {
  if (state.isAnswered || state.currentInput === '') return;
  state.isAnswered = true;
  stopTimer();
  const q = state.questions[state.current];
  const entered = parseInt(state.currentInput, 10);
  state.sessionQuestions.push({ correct: entered === q.answer, timeout: false, timeMs: Date.now() - (state.questionStartTime ?? Date.now()) });
  const disp = document.getElementById('inputDisplay');
  if (entered === q.answer) {
    disp.classList.add('correct');
    state.correct++;
    showFeedback(true);
    _feedbackCorrect();
    setTimeout(nextQuestion, 850);
  } else {
    disp.classList.add('wrong');
    disp.textContent = entered + ' → ' + q.answer;
    state.wrong++;
    state.errors.push({ q, userAnswer: entered, correct: q.answer });
    showFeedback(false);
    _feedbackError();
    disp.classList.add('shake');
    disp.addEventListener('animationend', () => disp.classList.remove('shake'), { once: true });
    setTimeout(nextQuestion, 1400);
  }
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
    if (remaining <= 0) { clearInterval(state.timerInterval); timeOut(); }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function timeOut() {
  if (state.isAnswered) return;
  state.isAnswered = true;
  const q = state.questions[state.current];
  state.sessionQuestions.push({ correct: false, timeout: true, timeMs: state.timerSeconds * 1000 });
  state.wrong++;
  state.errors.push({ q, userAnswer: '⏱', correct: q.answer });
  _feedbackError();
  showFeedback(false, '⏱');
  setTimeout(nextQuestion, 700);
}

/* ════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════ */
function nextQuestion() {
  clearFeedback();
  state.current++;
  if (state.current < state.questions.length) { renderQuestion(); return; }
  if (state.phase === 'main' && state.errors.length > 0) {
    state.phase     = 'retry';
    state.questions = state.errors.map(e => e.q);
    state.current   = 0;
    renderQuestion();
  } else {
    endGame();
  }
}

function hideAllModes() {
  ['modeFlash', 'modeQCM', 'modeLibre', 'answerQCM', 'answerLibre'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
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
        window._bottomBar?.showLaunch(() => window._m01?.launchGame(), 'Lancer la session ✖️');
        showScreen('screenConfig');
      }, 120);
    },
  });
}

/* ════════════════════════════════════════════════════
   FEEDBACK VISUEL
════════════════════════════════════════════════════ */
function showFeedback(correct, override) {
  const overlay = document.getElementById('feedbackOverlay');
  const text    = document.getElementById('feedbackText');
  if (!overlay || !text) return;
  overlay.className = 'feedback-overlay show ' + (correct ? 'correct-fb' : 'wrong-fb');
  text.textContent  = override ?? (correct ? '✓' : '✗');
  text.classList.add('bounce-in');
}

function clearFeedback() {
  const overlay = document.getElementById('feedbackOverlay');
  const text    = document.getElementById('feedbackText');
  if (overlay) overlay.className = 'feedback-overlay';
  if (text)    text.classList.remove('bounce-in');
}

/* ════════════════════════════════════════════════════
   FIN DE SESSION
════════════════════════════════════════════════════ */
function endGame() {
  stopTimer();
  setMusicContext('ambient');
  const totalMs  = Date.now() - state.startTime;
  const total    = state.mainTarget ?? state.questions.length;
  const rate     = Math.round((state.correct / total) * 100);
  const settings = window.ChipMindStorage?.getSettings?.() ?? {};

  const stars = calcStarsModule1(cfg.mode, state.wrong, total);

  window.ChipMindApp?.endSession?.({
    moduleId: 1, stars, successRate: rate, timeMs: totalMs,
    extra: { mode: cfg.mode, totalQuestions: total },
  });

  window.ChipMindStorage?.updateModuleScore?.(1, settings.level ?? 'beginner', cfg.mode, rate);

  /* Scoring ChipMind — flash card exclue */
  const rowEl    = document.getElementById('rstatPointsRow');
  const pointsEl = document.getElementById('rstatPoints');
  const recordEl = document.getElementById('rstatNewRecord');
  if (cfg.mode !== 'flashcard' && state.sessionQuestions.length > 0 && rowEl) {
    const configFactor = TABLE_CONFIG_FACTORS[cfg.selectedTables.length] ?? 1.0;
    const { score, maxCombo } = calculateSessionScore({
      questions: state.sessionQuestions,
      config: { mode: cfg.mode === 'libre' ? 'input' : 'qcm', configFactor, T_ref: 6000 },
    });
    rowEl.style.display  = 'block';
    if (pointsEl) pointsEl.textContent = `Score : ${score} pts`;
    window._cmProfileOps?.saveScore('module01', score, maxCombo)
      .then(result => { if (result?.isNewRecord && recordEl) recordEl.style.display = 'inline'; })
      .catch(() => {});
  } else if (rowEl) {
    rowEl.style.display = 'none';
  }

  showScreen('screenResults');
  window._bottomBar?.showEndGame(() => window._m01?.launchGame(), () => window._m01?.replaySession());

  const titles = {
    0: ['À retravailler', 'Continue l\'entraînement, tu y es presque !'],
    1: ['Bon début !',    'Une étoile gagnée, bien joué.'],
    2: ['Très bien !',    'Deux étoiles ! Tu maîtrises ces tables.'],
    3: ['Parfait !',      'Trois étoiles — tu es prêt pour le tapis.'],
  };
  const [title, sub] = titles[stars] ?? titles[0];
  document.getElementById('resultTitle').textContent    = title;
  document.getElementById('resultSubtitle').textContent = sub;
  document.getElementById('rstatScore').textContent     = rate + '%';
  document.getElementById('rstatTime').textContent      = formatTime(totalMs);
  document.getElementById('rstatQuestions').textContent = total;

  (_container?.querySelectorAll('.result-star') ?? []).forEach((el, i) => {
    el.classList.remove('lit', 'star-pop');
    if (i < stars) setTimeout(() => el.classList.add('lit', 'star-pop'), 300 + i * 250);
  });

  renderResultConditions(total);

  const errSec = document.getElementById('errorsSection');
  if (state.errors.length > 0) {
    errSec.style.display = 'block';
    document.getElementById('errorsList').innerHTML = state.errors.map(e => `
      <div class="error-item">
        <div class="error-q">${e.q.multiplicand} × ${e.q.multiplier}</div>
        <span class="error-your">${e.userAnswer}</span>
        <span class="error-correct">= ${e.correct}</span>
      </div>`).join('');
  } else {
    errSec.style.display = 'none';
  }
}

function renderResultConditions(totalQuestions) {
  const errors = state.wrong;

  const conditions = [
    {
      stars: '★',
      met:   cfg.mode === 'flashcard' && totalQuestions >= 30,
      text:  `Flash Card · ${totalQuestions}/30 questions`,
      icon:  '🃏',
      hint:  'Jouer en Flash Card avec 30+ questions',
    },
    {
      stars: '★★',
      met:   cfg.mode === 'qcm' && totalQuestions >= 30 && errors <= 2,
      text:  `QCM · ${totalQuestions}/30 questions · ${errors} faute${errors !== 1 ? 's' : ''}/2 max`,
      icon:  '🔘',
      hint:  'Jouer en QCM avec 30+ questions et ≤ 2 fautes',
    },
    {
      stars: '★★★',
      met:   cfg.mode === 'libre' && totalQuestions >= 30 && errors <= 2,
      text:  `Saisie Libre · ${totalQuestions}/30 questions · ${errors} faute${errors !== 1 ? 's' : ''}/2 max`,
      icon:  '⌨️',
      hint:  'Jouer en Saisie Libre avec 30+ questions et ≤ 2 fautes',
    },
  ];

  document.getElementById('resultCondList').innerHTML = conditions.map((c, i) => `
    <div class="result-cond-row ${c.met ? 'met' : 'unmet'} cond-animate" style="animation-delay:${0.15 + i * 0.1}s">
      <span class="result-cond-icon">${c.icon}</span>
      <span class="result-cond-text"><strong>${c.stars}</strong> — ${c.text}</span>
      <span class="result-cond-badge">${c.met ? '✓' : '✗ ' + c.hint}</span>
    </div>`).join('');

  const earned = calcStarsModule1(cfg.mode, errors, totalQuestions);
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
  window._bottomBar?.showLaunch(() => window._m01?.launchGame(), 'Lancer la session ✖️');
  showScreen('screenConfig');
}

/* ════════════════════════════════════════════════════
   MODULE EXPORT
════════════════════════════════════════════════════ */
export const module = {
  id:           'module01',
  type:         'training',
  label:        'Tables Croupier',
  icon:         '✖️',
  modes:        ['flashcard', 'qcm', 'libre'],
  difficulties: ['beginner', 'intermediate', 'expert'],

  render(container) {
    _cleanup();
    _container = container;

    if (!document.getElementById('mod01-styles')) {
      const style = document.createElement('style');
      style.id = 'mod01-styles';
      style.textContent = _CSS;
      document.head.appendChild(style);
    }

    container.innerHTML = _HTML;

    /* Sync persisted config to DOM */
    container.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.mode === cfg.mode);
    });
    const qtyEl = document.getElementById('qtyValue');
    if (qtyEl) qtyEl.textContent = cfg.qty;

    buildTablesGrid();
    renderLevelInfo();

    _keydownHandler = (e) => {
      if (!document.getElementById('screenGame')?.classList.contains('active')) return;
      if (cfg.mode === 'libre') {
        if (e.key >= '0' && e.key <= '9' && state.currentInput.length < 4) {
          state.currentInput += e.key;
          updateInputDisplay();
        } else if (e.key === 'Backspace') {
          state.currentInput = state.currentInput.slice(0, -1);
          updateInputDisplay();
        } else if (e.key === 'Enter') {
          validateLibre();
        }
      } else if (cfg.mode === 'flashcard' && e.key === ' ') {
        e.preventDefault();
        flipCard();
      }
    };
    document.addEventListener('keydown', _keydownHandler);

    window._activeModuleCleanup = _cleanup;
    window._m01 = {
      selectMode, changeQty, launchGame, confirmAbort,
      flipCard, selfEval, replaySession, goBack: _goBack,
    };

    window._bottomBar?.showLaunch(() => window._m01?.launchGame(), 'Lancer la session ✖️');
    setMusicContext('ambient');
  },

  start()  {},
  end()    {},

  getProgress() {
    return { stars: 0, bestTime: null, successRate: null };
  },

  getStars(session) {
    return calcStarsModule1(
      session.mode ?? cfg.mode,
      session.wrong ?? 0,
      session.totalQuestions ?? 0
    );
  },

  getAchievements() { return []; },
};

export default module;
