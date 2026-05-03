/* ════════════════════════════════════════════════════
   MODULE 03 — Comptage Cartes
   Deck : As(=1) à 9, ×4 couleurs = 36 cartes, somme = 180
   Modes : montée | descente | aller-retour
════════════════════════════════════════════════════ */

import { navigate }                                    from '../core/router.js';
import { play as soundPlay, setMusicContext }          from '../core/sound.js';
import { shuffleArray, formatTime }                    from '../core/gameHelpers.js';
import { calculateSessionScore }                       from '../core/scoring.js';

/* ─── CSS spécifique module03 ─── */
const _CSS = `
.bg-felt::after { content: '🃏'; position: absolute; bottom: -10px; right: -10px; font-size: 16rem; opacity: 0.025; line-height: 1; pointer-events: none; }
  .config-body { padding: 0 20px; flex: 1; overflow-y: auto; }
  .mode-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .mode-card { border-radius: var(--radius-sm); padding: 16px 8px 12px; background: var(--ivory-faint); border: 1px solid var(--gold-border); display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.22s var(--ease-spring); position: relative; }
  .mode-card .mc-icon { font-size: 1.8rem; }
  .mode-card .mc-name { font-family: var(--font-mono); font-size: 0.53rem; color: var(--ivory); text-transform: uppercase; letter-spacing: 0.08em; text-align: center; line-height: 1.3; }
  .mode-card .mc-desc { font-family: var(--font-mono); font-size: 0.43rem; color: var(--ivory-dim); text-align: center; line-height: 1.4; }
  .mode-card .mc-badge { position: absolute; top: 7px; right: 7px; font-family: var(--font-mono); font-size: 0.42rem; background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.25); color: var(--gold); padding: 1px 5px; border-radius: 99px; letter-spacing: 0.06em; }
  .mode-card.selected { background: linear-gradient(145deg, rgba(201,168,76,0.18), rgba(201,168,76,0.07)); border-color: var(--gold); box-shadow: 0 0 14px var(--gold-glow); }
  .mode-card.selected .mc-name { color: var(--gold-light); }
  .mode-card:hover { transform: translateY(-3px); }
  .status-center { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .status-top { display: flex; justify-content: space-between; align-items: center; }
  .status-phase { font-family: var(--font-mono); font-size: 0.52rem; color: var(--gold); letter-spacing: 0.12em; text-transform: uppercase; }
  .status-score { font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.06em; }
  .sc-ok  { color: var(--green-light); }
  .sc-err { color: var(--red-light); }
  .game-zone { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; padding: 4px 20px 8px; gap: 8px; overflow: hidden; }
  .running-total-wrap { width: 100%; background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.05)); border: 1px solid var(--gold-border); border-radius: var(--radius); padding: 9px 16px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; }
  .running-total-wrap::before { content: ''; position: absolute; top:0; left:0; right:0; height:40%; background: linear-gradient(to bottom, rgba(255,255,255,0.04), transparent); }
  .rt-left { display: flex; flex-direction: column; gap: 2px; }
  .rt-label { font-family: var(--font-mono); font-size: 0.48rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--gold); opacity: 0.7; }
  .rt-value { font-family: var(--font-serif); font-size: 2rem; font-weight: 900; color: var(--gold-light); line-height: 1; filter: drop-shadow(0 0 10px var(--gold-glow)); transition: color 0.2s; }
  .rt-value.tick-up   { color: var(--green-light); filter: drop-shadow(0 0 10px var(--green-glow)); }
  .rt-value.tick-down { color: var(--red-light);   filter: drop-shadow(0 0 10px var(--red-glow)); }
  .rt-right { text-align: right; }
  .rt-target-label { font-family: var(--font-mono); font-size: 0.46rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ivory-dim); }
  .rt-target-val { font-family: var(--font-serif); font-size: 1rem; font-weight: 700; color: var(--ivory-dim); opacity: 0.5; }
  .rt-delta { font-family: var(--font-mono); font-size: 0.55rem; font-weight: 600; letter-spacing: 0.06em; margin-top: 4px; transition: opacity 0.5s; }
  .rt-delta.pos { color: var(--green-light); }
  .rt-delta.neg { color: var(--red-light); }
  .card-area { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
  .used-cards-strip { width: 100%; height: 24px; display: flex; gap: 4px; align-items: center; overflow: hidden; position: relative; }
  .used-cards-strip::before { content: ''; position: absolute; left:0; top:0; bottom:0; width:30px; background: linear-gradient(to right, var(--felt), transparent); z-index: 1; pointer-events: none; }
  .used-cards-strip::after  { content: ''; position: absolute; right:0; top:0; bottom:0; width:30px; background: linear-gradient(to left, var(--felt), transparent); z-index: 1; pointer-events: none; }
  .mini-card { flex-shrink: 0; width: 24px; height: 34px; background: white; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.4); animation: miniCardAppear 0.3s var(--ease-spring); }
  .mini-card.red { color: #c0392b; }
  .mini-card.black { color: #1a1a2e; }
  @keyframes miniCardAppear { from{transform:scale(0) rotate(-10deg);opacity:0} to{transform:scale(1) rotate(0);opacity:1} }
  .card-stage { width: 120px; height: 168px; display: block; margin: 0 auto; flex-shrink: 0; perspective: 900px; }
  .playing-card { width: 120px; height: 168px; transform-style: preserve-3d; transition: transform 0.55s cubic-bezier(0.22,1,0.36,1); position: relative; }
  .playing-card.flipped { transform: rotateY(180deg); }
  .card-face { position: absolute; top: 0; left: 0; width: 120px; height: 168px; border-radius: 10px; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .card-back { background: linear-gradient(145deg, #1a1a2e 0%, #0d1117 100%); border: 1px solid rgba(201,168,76,0.3); box-shadow: 0 4px 16px rgba(0,0,0,0.6); overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card-back-pattern { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; }
  .card-back-pattern::before { content: ''; position: absolute; inset: 7px; border: 1px solid rgba(201,168,76,0.2); border-radius: 7px; }
  .card-back-pattern::after { content: '♠  ♥\A♦  ♣'; white-space: pre; font-size: 1.1rem; color: rgba(201,168,76,0.12); line-height: 1.8; text-align: center; }
  .card-back-logo { position: absolute; bottom: 10px; font-family: var(--font-serif); font-size: 0.5rem; font-weight: 700; color: rgba(201,168,76,0.2); letter-spacing: 0.1em; }
  .card-front { transform: rotateY(180deg); background: white; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.6); position: relative; overflow: hidden; }
  .card-corner-tl { position: absolute; top: 6px; left: 7px; display: flex; flex-direction: column; align-items: center; line-height: 1; gap: 0px; }
  .card-corner-br { position: absolute; bottom: 6px; right: 7px; display: flex; flex-direction: column; align-items: center; line-height: 1; gap: 0px; transform: rotate(180deg); }
  .card-val  { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 900; line-height: 1; }
  .card-suit-corner { font-size: 0.72rem; line-height: 1; }
  .card-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2.6rem; line-height: 1; }
  .card-red   { color: #c0392b; }
  .card-black { color: #1a1a2e; }
  .card-phase-label { font-family: var(--font-mono); font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ivory-dim); text-align: center; }
  .card-count-label { font-family: var(--font-mono); font-size: 0.52rem; color: var(--gold); letter-spacing: 0.1em; text-align: center; }
  .card-hint { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 900; text-align: center; line-height: 1; }
  .card-hint.plus  { color: var(--green-light); filter: drop-shadow(0 0 6px var(--green-glow)); }
  .card-hint.minus { color: var(--red-light);   filter: drop-shadow(0 0 6px var(--red-glow)); }
  .input-label { display: none; }
  .phase-transition { position: fixed; inset: 0; z-index: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(10,46,26,0.95); opacity: 0; pointer-events: none; transition: opacity 0.4s; }
  .phase-transition.show { opacity: 1; pointer-events: all; }
  .phase-trans-icon { font-size: 4rem; filter: drop-shadow(0 0 20px var(--gold-glow)); animation: transIcon 1s ease-in-out infinite; }
  @keyframes transIcon { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
  .phase-trans-title { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 900; color: var(--gold-light); text-align: center; }
  .phase-trans-sub { font-family: var(--font-elegant); font-style: italic; font-size: 0.9rem; color: var(--ivory-dim); text-align: center; }
  .phase-trans-total { font-family: var(--font-serif); font-size: 3rem; font-weight: 900; color: var(--gold); filter: drop-shadow(0 0 14px var(--gold-glow)); }
  .btn-continue { padding: 14px 32px; background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light)); border: none; border-radius: var(--radius-pill); font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: var(--felt-deep); cursor: pointer; box-shadow: 0 4px 20px var(--gold-glow); transition: all 0.2s var(--ease-spring); }
  .btn-continue:hover { transform: scale(1.04); }
  @keyframes totalTick { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
  .total-tick { animation: totalTick 0.25s var(--ease-spring); }
`;

/* ─── HTML template ─── */
const _HTML = `
<div class="bg-felt"></div>

<div class="phase-transition" id="phaseTransition">
  <div class="phase-trans-icon">🃏</div>
  <div class="phase-trans-title">Montée terminée !</div>
  <div class="phase-trans-sub">Tu as atteint</div>
  <div class="phase-trans-total" id="phaseTransTotal">180</div>
  <div class="phase-trans-sub">Maintenant, la descente — repart de 180 vers 0</div>
  <button class="btn-continue" onclick="window._m03?.startDescentPhase()">Continuer → Descente</button>
</div>

<div class="feedback-overlay" id="feedbackOverlay">
  <div class="feedback-text" id="feedbackText"></div>
</div>

<div class="screen active" id="screenConfig">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m03?.goBack()">←</button>
    <div>
      <div class="header-title">Comptage Cartes</div>
      <div class="header-sub">Module 03 · As→9 · Cumul 180</div>
    </div>
    <span style="font-size:1.5rem;filter:drop-shadow(0 0 6px var(--gold-glow))">🃏</span>
  </div>
  <div class="config-body">
    <div class="config-section">
      <div class="config-label">Mode de jeu</div>
      <div class="mode-cards">
        <div class="mode-card" data-mode="montee" onclick="window._m03?.selectMode('montee',this)">
          <span class="mc-icon">📈</span>
          <span class="mc-name">Montée</span>
          <span class="mc-desc">0 → 180<br>36 cartes</span>
          <span class="mc-badge">36 cartes</span>
        </div>
        <div class="mode-card" data-mode="descente" onclick="window._m03?.selectMode('descente',this)">
          <span class="mc-icon">📉</span>
          <span class="mc-name">Descente</span>
          <span class="mc-desc">180 → 0<br>36 cartes</span>
          <span class="mc-badge">36 cartes</span>
        </div>
        <div class="mode-card" data-mode="allerretour" onclick="window._m03?.selectMode('allerretour',this)">
          <span class="mc-icon">🔄</span>
          <span class="mc-name">Aller-Retour</span>
          <span class="mc-desc">0→180→0<br>72 actions</span>
          <span class="mc-badge">★★+ requis</span>
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
        <div class="star-cond-title">Étoiles selon le mode choisi · 0 faute</div>
        <div class="cond-row">
          <div class="cond-dot unmet">★</div>
          <span class="cond-text">Montée · 36 cartes · 0 faute</span>
        </div>
        <div class="cond-row">
          <div class="cond-dot unmet">★★</div>
          <span class="cond-text">Descente · 36 cartes · 0 faute</span>
        </div>
        <div class="cond-row">
          <div class="cond-dot unmet">★★★</div>
          <span class="cond-text">Aller-Retour · 72 actions · 0 faute</span>
        </div>
        <div class="star-cond-reward" id="condTimingNote">Chrono : —</div>
      </div>
    </div>
  </div>
</div>

<div class="screen" id="screenGame">
  <div class="game-status">
    <button class="btn-abort" onclick="window._m03?.confirmAbort()">✕</button>
    <div class="status-center">
      <div class="status-top">
        <span class="status-phase" id="statusPhase">Montée · Carte 1/36</span>
        <div class="status-score">
          <span class="sc-ok"  id="scoreOk">0</span>
          <span style="color:var(--ivory-dim);margin:0 2px">/</span>
          <span class="sc-err" id="scoreErr">0</span>
        </div>
      </div>
      <div class="game-progress-bar">
        <div class="game-progress-fill" id="gameProgressFill" style="width:0%"></div>
      </div>
    </div>
  </div>
  <div class="timer-wrap" id="timerWrap">
    <div class="timer-fill" id="timerFill"></div>
  </div>
  <div class="timer-text" id="timerText">—</div>
  <div class="game-zone">
    <div class="running-total-wrap">
      <div class="rt-left">
        <div class="rt-label" id="rtLabel">Cumul actuel</div>
        <div class="rt-value" id="rtValue">0</div>
      </div>
      <div class="rt-right">
        <div class="rt-target-label" id="rtTargetLabel">Objectif</div>
        <div class="rt-target-val" id="rtTargetVal">180</div>
        <div class="rt-delta" id="rtDelta"></div>
      </div>
    </div>
    <div class="card-area">
      <div class="used-cards-strip" id="usedCardsStrip"></div>
      <div class="card-stage">
        <div class="playing-card" id="playingCard">
          <div class="card-face card-back">
            <div class="card-back-pattern">
              <div class="card-back-logo">ChipMind</div>
            </div>
          </div>
          <div class="card-face card-front" id="cardFront">
            <div class="card-corner-tl" id="cardCornerTL">
              <span class="card-val" id="cardValTL">A</span>
              <span class="card-suit-corner" id="cardSuitTL">♠</span>
            </div>
            <div class="card-center" id="cardCenter">♠</div>
            <div class="card-corner-br" id="cardCornerBR">
              <span class="card-val" id="cardValBR">A</span>
              <span class="card-suit-corner" id="cardSuitBR">♠</span>
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div class="card-hint" id="cardHint">+</div>
        <div class="card-count-label" id="cardCountLabel">Carte 1 / 36</div>
        <div class="card-phase-label" id="cardPhaseLabel">Additionne</div>
      </div>
    </div>
  </div>

  <div class="answer-zone">
    <div class="input-zone">
      <div class="input-display" id="inputDisplay">
        <span class="input-placeholder">———</span>
      </div>
      <div class="numpad" id="numpad"></div>
    </div>
  </div>
</div>

<div class="screen" id="screenResults">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m03?.goBack()">←</button>
    <div>
      <div class="header-title">Résultats</div>
      <div class="header-sub">Comptage Cartes · Module 03</div>
    </div>
  </div>
  <div class="results-body">
    <div class="result-stars" id="resultStars">
      <span class="result-star">★</span>
      <span class="result-star">★</span>
      <span class="result-star">★</span>
    </div>
    <div style="text-align:center">
      <div class="result-title"    id="resultTitle">—</div>
      <div class="result-subtitle" id="resultSubtitle">—</div>
    </div>
    <div class="result-stats">
      <div class="rstat"><div class="rstat-value" id="rstatScore">—</div><div class="rstat-label">Réussite</div></div>
      <div class="rstat"><div class="rstat-value" id="rstatTime">—</div><div class="rstat-label">Temps</div></div>
      <div class="rstat"><div class="rstat-value" id="rstatCards">—</div><div class="rstat-label">Cartes</div></div>
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
      <div class="errors-title">Erreurs</div>
      <div id="errorsList"></div>
    </div>
  </div>
</div>
`;

/* ─── Deck ─── */
const SUITS  = ['♠','♥','♦','♣'];
const VALUES = [
  {val:1,label:'A'},{val:2,label:'2'},{val:3,label:'3'},{val:4,label:'4'},
  {val:5,label:'5'},{val:6,label:'6'},{val:7,label:'7'},{val:8,label:'8'},{val:9,label:'9'},
];
function buildDeck() {
  const deck = [];
  VALUES.forEach(v => SUITS.forEach(s => deck.push({ value:v.val, label:v.label, suit:s, red:s==='♥'||s==='♦' })));
  return shuffleArray(deck);
}
const TOTAL_DECK = 180;

/* ─── Config persisted across renders ─── */
const cfg = { mode: 'montee' };

/* ─── Game state ─── */
const state = {
  phase:'up', deck:[], deckDown:[], cardIndex:0, running:0,
  correct:0, wrong:0, errors:[], startTime:null,
  timerInterval:null, timerSeconds:0, currentInput:'', isAnswered:false, isFlipped:false,
  sessionQuestions: [], cardStartTime: null,
};

/* ─── Module locals ─── */
let _container = null;
let _keydownHandler = null;

/* ─── Helpers ─── */
function _getSettings()  { return window.ChipMindStorage.getSettings(); }
function _feedbackCorrect() {
  soundPlay('correct');
  if (_getSettings().haptic !== false) navigator.vibrate?.([30]);
}
function _feedbackError() {
  soundPlay('wrong');
  if (_getSettings().haptic !== false) navigator.vibrate?.([80,30,80]);
}

function _cleanup() {
  clearInterval(state.timerInterval);
  if (_keydownHandler) { document.removeEventListener('keydown', _keydownHandler); _keydownHandler = null; }
  delete window._m03;
  if (window._activeModuleCleanup === _cleanup) window._activeModuleCleanup = null;
}

function _goBack() {
  _cleanup();
  soundPlay('back');
  setMusicContext('ambient');
  window._cmRefreshDashboard?.();
  navigate('#/');
}

function showScreen(id) {
  _container?.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

/* ─── Config UI ─── */
function selectMode(m, el) {
  cfg.mode = m;
  document.querySelectorAll('.mode-card').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function renderLevelInfo() {
  const s = _getSettings();
  const infos = {
    beginner:     { color:'var(--color-beginner,#27ae60)',     label:'Débutant',      desc:'Pas de chrono',  timing:'Pas de limite de temps' },
    intermediate: { color:'var(--color-intermediate,#e67e22)', label:'Intermédiaire', desc:'30s/carte',      timing:'Chrono actif : 30 s par carte' },
    expert:       { color:'var(--color-expert,#c0392b)',       label:'Expert',        desc:'10s/carte',      timing:'Chrono actif : 10 s par carte' },
  };
  const info   = infos[s.level] || infos.beginner;
  const timing = document.getElementById('condTimingNote');
  document.getElementById('levelBadge').style.background = info.color;
  document.getElementById('levelInfoText').innerHTML = `<span class="level-info-name">${info.label}</span> — ${info.desc}`;
  if (timing) timing.textContent = info.timing;
}

/* ─── Stars ─── */
function calcStarsModule3(errors, mode) {
  if (errors > 0)             return 0;
  if (mode === 'montee')      return 1;
  if (mode === 'descente')    return 2;
  if (mode === 'allerretour') return 3;
  return 0;
}

/* ─── Launch ─── */
function launchGame() {
  const settings = _getSettings();
  const timerMap = { beginner:0, intermediate:30, expert:10 };
  state.timerSeconds     = timerMap[settings.level] || 0;
  state.phase            = 'up';
  state.deck             = buildDeck();
  state.deckDown         = cfg.mode === 'allerretour' ? buildDeck() : [];
  state.cardIndex        = 0;
  state.correct          = 0;
  state.wrong            = 0;
  state.errors           = [];
  state.startTime        = Date.now();
  state.currentInput     = '';
  state.isAnswered       = false;
  state.running          = cfg.mode === 'descente' ? TOTAL_DECK : 0;
  state.sessionQuestions = [];
  state.cardStartTime    = null;
  document.getElementById('usedCardsStrip').innerHTML = '';
  window._bottomBar?.hide();
  showScreen('screenGame');
  setMusicContext('game');
  renderCard();
}

/* ─── Card render ─── */
function renderCard() {
  state.isAnswered = false; state.currentInput = ''; state.isFlipped = false;
  const isDown = state.phase === 'down';
  const deck = isDown ? state.deckDown : state.deck;
  const card = deck[state.cardIndex];
  const totalCards = deck.length;

  const totalActions = cfg.mode === 'allerretour' ? 72 : 36;
  const doneActions  = (isDown ? 36 : 0) + state.cardIndex;
  document.getElementById('gameProgressFill').style.width = Math.round((doneActions / totalActions) * 100) + '%';

  const phaseStr = cfg.mode === 'allerretour' ? (isDown ? 'Descente' : 'Montée') : (cfg.mode === 'descente' ? 'Descente' : 'Montée');
  document.getElementById('statusPhase').textContent = `${phaseStr} · Carte ${state.cardIndex+1}/${totalCards}`;
  document.getElementById('scoreOk').textContent  = state.correct;
  document.getElementById('scoreErr').textContent = state.wrong;

  updateRunningDisplay(false);

  const isDescending = isDown || cfg.mode === 'descente';
  const hint = document.getElementById('cardHint');
  hint.textContent = isDescending ? '−' : '+';
  hint.className   = 'card-hint ' + (isDescending ? 'minus' : 'plus');
  document.getElementById('cardCountLabel').textContent  = `Carte ${state.cardIndex+1} / ${totalCards}`;
  document.getElementById('cardPhaseLabel').textContent  = isDescending ? 'Soustrais' : 'Additionne';
  document.getElementById('rtTargetLabel').textContent   = 'Objectif';
  document.getElementById('rtTargetVal').textContent     = isDescending ? '0' : '180';

  document.getElementById('playingCard').classList.remove('flipped');

  setTimeout(() => {
    if (!document.getElementById('screenGame')?.classList.contains('active')) return;
    _flipCard(card);
    soundPlay('cardFlip');
  }, 400);

  updateInputDisplay();
  buildNumpad();
  startTimer();
}

function _flipCard(card) {
  const cc = card.red ? 'card-red' : 'card-black';
  document.getElementById('cardValTL').textContent  = card.label;
  document.getElementById('cardSuitTL').textContent = card.suit;
  document.getElementById('cardValBR').textContent  = card.label;
  document.getElementById('cardSuitBR').textContent = card.suit;
  document.getElementById('cardCenter').textContent = card.suit;
  ['cardValTL','cardSuitTL','cardValBR','cardSuitBR','cardCenter'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('card-red','card-black'); el.classList.add(cc);
  });
  document.getElementById('playingCard').classList.add('flipped');
  state.isFlipped   = true;
  state.cardStartTime = Date.now();
}

/* ─── Running total ─── */
function updateRunningDisplay(animate) {
  const el = document.getElementById('rtValue');
  if (!el) return;
  el.textContent = state.running;
  if (animate) {
    el.classList.remove('total-tick'); void el.offsetWidth; el.classList.add('total-tick');
    const isDown = state.phase === 'down';
    el.classList.add(isDown ? 'tick-down' : 'tick-up');
    setTimeout(() => el.classList.remove('tick-up','tick-down'), 500);
  }
  const target = (state.phase === 'down' || cfg.mode === 'descente') ? 0 : TOTAL_DECK;
  const delta  = target - state.running;
  const dEl    = document.getElementById('rtDelta');
  if (!dEl) return;
  if (delta === 0)      { dEl.textContent = '✓ Terminé';          dEl.className = 'rt-delta pos'; }
  else if (delta > 0)   { dEl.textContent = `−${delta} restants`; dEl.className = 'rt-delta neg'; }
  else                  { dEl.textContent = `+${Math.abs(delta)} restants`; dEl.className = 'rt-delta neg'; }
}

/* ─── Mini card ─── */
function addMiniCard(card) {
  const strip = document.getElementById('usedCardsStrip');
  const el = document.createElement('div');
  el.className = 'mini-card ' + (card.red ? 'red' : 'black');
  el.textContent = card.label;
  strip.appendChild(el);
  strip.scrollLeft = strip.scrollWidth;
}

/* ─── Numpad ─── */
function buildNumpad() {
  const numpad = document.getElementById('numpad');
  numpad.innerHTML = '';
  ['7','8','9','4','5','6','1','2','3','⌫','0',''].forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn' + (k==='⌫'?' del':'') + (k===''?' dim':'');
    btn.textContent = k;
    if (k==='⌫')     btn.addEventListener('click', () => { state.currentInput = state.currentInput.slice(0,-1); updateInputDisplay(); soundPlay('chipDrop'); });
    else if (k!=='') btn.addEventListener('click', () => { if (state.currentInput.length<4) { state.currentInput+=k; updateInputDisplay(); soundPlay('chipDrop'); } });
    numpad.appendChild(btn);
  });
  const v = document.createElement('button');
  v.className = 'numpad-btn validate'; v.textContent = 'Valider ↵';
  v.addEventListener('click', validateAnswer);
  numpad.appendChild(v);
}

function updateInputDisplay() {
  const d = document.getElementById('inputDisplay');
  if (!d) return;
  d.className = 'input-display';
  d.innerHTML = state.currentInput === '' ? '<span class="input-placeholder">———</span>' : state.currentInput;
}

/* ─── Validate ─── */
function validateAnswer() {
  if (state.isAnswered || !state.isFlipped || state.currentInput === '') return;
  state.isAnswered = true;
  stopTimer();

  const isDown   = state.phase === 'down';
  const deck     = isDown ? state.deckDown : state.deck;
  const card     = deck[state.cardIndex];
  const isDescending = isDown || cfg.mode === 'descente';
  const expected = isDescending ? state.running - card.value : state.running + card.value;
  const entered  = parseInt(state.currentInput, 10);
  const isOk     = entered === expected;
  state.sessionQuestions.push({ correct: isOk, timeout: false, timeMs: Date.now() - (state.cardStartTime ?? Date.now()) });

  const disp = document.getElementById('inputDisplay');
  disp.className = 'input-display ' + (isOk ? 'correct' : 'wrong');
  if (!isOk) disp.textContent = entered + ' → ' + expected;

  if (isOk) {
    state.correct++;
    state.running = expected;
    updateRunningDisplay(true);
    addMiniCard(card);
    showFeedback(true);
    _feedbackCorrect();
    setTimeout(() => { clearFeedback(); nextCard(); }, 600);
  } else {
    state.wrong++;
    state.errors.push({ card, entered, expected, isDown: isDescending });
    state.running = expected;
    addMiniCard(card);
    showFeedback(false);
    _feedbackError();
    setTimeout(() => { clearFeedback(); nextCard(); }, 1300);
  }
}

/* ─── Navigation ─── */
function nextCard() {
  state.currentInput = ''; state.cardIndex++;
  const isDown = state.phase === 'down';
  const deck   = isDown ? state.deckDown : state.deck;
  if (state.cardIndex >= deck.length) {
    if (cfg.mode === 'allerretour' && state.phase === 'up') showPhaseTransition();
    else endGame();
  } else { renderCard(); }
}

function showPhaseTransition() {
  stopTimer();
  document.getElementById('phaseTransTotal').textContent = state.running;
  document.getElementById('phaseTransition').classList.add('show');
}

function startDescentPhase() {
  document.getElementById('phaseTransition').classList.remove('show');
  state.phase = 'down'; state.cardIndex = 0;
  document.getElementById('usedCardsStrip').innerHTML = '';
  renderCard();
}

/* ─── Timer ─── */
function startTimer() {
  const totalS = state.timerSeconds;
  const wrap = document.getElementById('timerWrap');
  const fill = document.getElementById('timerFill');
  const text = document.getElementById('timerText');
  clearInterval(state.timerInterval);
  if (totalS === 0) { wrap.classList.add('timer-hidden'); text.classList.add('timer-hidden'); return; }
  wrap.classList.remove('timer-hidden'); text.classList.remove('timer-hidden');
  fill.classList.remove('warning'); text.classList.remove('warning');
  fill.style.transition = 'none'; fill.style.width = '100%';
  text.textContent = totalS + 's';
  let remaining = totalS;
  void fill.offsetWidth; /* force reflow — valide width:100% avant de lancer la transition */
  requestAnimationFrame(() => { fill.style.transition = `width ${totalS}s linear`; fill.style.width = '0%'; });
  state.timerInterval = setInterval(() => {
    remaining--;
    text.textContent = remaining + 's';
    if (remaining <= Math.ceil(totalS * 0.3)) { fill.classList.add('warning'); text.classList.add('warning'); soundPlay('tick'); }
    if (remaining <= 0) { clearInterval(state.timerInterval); timeOut(); }
  }, 1000);
}

function stopTimer() { clearInterval(state.timerInterval); }

function timeOut() {
  if (state.isAnswered) return;
  state.isAnswered = true;
  state.sessionQuestions.push({ correct: false, timeout: true, timeMs: state.timerSeconds * 1000 });
  const isDown   = state.phase === 'down';
  const deck     = isDown ? state.deckDown : state.deck;
  const card     = deck[state.cardIndex];
  const isDescending = isDown || cfg.mode === 'descente';
  const expected = isDescending ? state.running - card.value : state.running + card.value;
  state.wrong++;
  state.errors.push({ card, entered:'⏱', expected, isDown: isDescending });
  state.running = expected;
  addMiniCard(card);
  showFeedback(false, '⏱');
  setTimeout(() => { clearFeedback(); nextCard(); }, 700);
}

/* ─── Feedback ─── */
function showFeedback(ok, override) {
  const ov = document.getElementById('feedbackOverlay');
  const tx = document.getElementById('feedbackText');
  ov.className = 'feedback-overlay show ' + (ok ? 'ok-fb' : 'bad-fb');
  tx.textContent = override || (ok ? '✓' : '✗');
  tx.classList.add('bounce-in');
}
function clearFeedback() {
  document.getElementById('feedbackOverlay').className = 'feedback-overlay';
  document.getElementById('feedbackText')?.classList.remove('bounce-in');
}

/* ─── End game ─── */
function endGame() {
  stopTimer();
  setMusicContext('ambient');
  const totalMs  = Date.now() - state.startTime;
  const total    = cfg.mode === 'allerretour' ? 72 : 36;
  const rate     = Math.round((state.correct / total) * 100);
  const settings = _getSettings();
  const stars    = calcStarsModule3(state.wrong, cfg.mode);

  window.ChipMindApp.endSession({
    moduleId: 3, stars, successRate: rate, timeMs: totalMs,
    extra: { mode: cfg.mode, totalCards: total },
  });
  window.ChipMindStorage.updateModuleScore(3, settings.level, cfg.mode, rate);

  /* Scoring ChipMind */
  const rowEl    = document.getElementById('rstatPointsRow');
  const pointsEl = document.getElementById('rstatPoints');
  const recordEl = document.getElementById('rstatNewRecord');
  if (state.sessionQuestions.length > 0 && rowEl) {
    const { score, maxCombo } = calculateSessionScore({
      questions: state.sessionQuestions,
      config: { mode: 'input', configFactor: 1.0, T_ref: 8000 },
    });
    rowEl.style.display  = 'block';
    if (pointsEl) pointsEl.textContent = `Score : ${score} pts`;
    window._cmProfileOps?.saveScore('module03', score, maxCombo)
      .then(result => { if (result?.isNewRecord && recordEl) recordEl.style.display = 'inline'; })
      .catch(() => {});
  } else if (rowEl) {
    rowEl.style.display = 'none';
  }

  showScreen('screenResults');
  window._bottomBar?.showEndGame(() => window._m03?.launchGame(), () => window._m03?.replaySession());

  const titles = {
    0: ['À retravailler',  "Continue l'entraînement au comptage !"],
    1: ['Bien compté !',   'Une étoile — tu tiens le cumul.'],
    2: ['Très bien !',     'Deux étoiles — aller-retour maîtrisé.'],
    3: ['Parfait !',       'Trois étoiles — niveau croupier confirmé.'],
  };
  const [title, sub] = titles[stars];
  document.getElementById('resultTitle').textContent    = title;
  document.getElementById('resultSubtitle').textContent = sub;
  document.getElementById('rstatScore').textContent     = rate + '%';
  document.getElementById('rstatTime').textContent      = formatTime(totalMs);
  document.getElementById('rstatCards').textContent     = total;

  document.querySelectorAll('.result-star').forEach((el, i) => {
    el.classList.remove('lit','star-pop');
    if (i < stars) setTimeout(() => el.classList.add('lit','star-pop'), 300 + i*250);
  });

  _renderResultConditions();

  const errSec = document.getElementById('errorsSection');
  if (state.errors.length > 0) {
    errSec.style.display = 'block';
    document.getElementById('errorsList').innerHTML = state.errors.slice(0,10).map(e => {
      const op = e.isDown ? '−' : '+';
      return `<div class="error-item">
        <div class="error-q">${e.isDown ? e.expected + e.card.value : e.expected - e.card.value} ${op} ${e.card.label}${e.card.suit}</div>
        <span class="error-your">${e.entered}</span>
        <span class="error-correct">= ${e.expected}</span>
      </div>`;
    }).join('');
  } else { errSec.style.display = 'none'; }
}

function _renderResultConditions() {
  const errors  = state.wrong;
  const perfect = errors === 0;

  const conds = [
    {
      stars: '★',
      met:   cfg.mode === 'montee'      && perfect,
      text:  `Montée · ${errors} faute${errors !== 1 ? 's' : ''}/0 max`,
      icon:  '📈',
      hint:  'Compter la montée sans faute',
    },
    {
      stars: '★★',
      met:   cfg.mode === 'descente'    && perfect,
      text:  `Descente · ${errors} faute${errors !== 1 ? 's' : ''}/0 max`,
      icon:  '📉',
      hint:  'Compter la descente sans faute',
    },
    {
      stars: '★★★',
      met:   cfg.mode === 'allerretour' && perfect,
      text:  `Aller-Retour · ${errors} faute${errors !== 1 ? 's' : ''}/0 max`,
      icon:  '🔄',
      hint:  "Compter l'aller-retour sans faute",
    },
  ];

  document.getElementById('resultCondList').innerHTML = conds.map((c, i) => `
    <div class="result-cond-row ${c.met?'met':'unmet'}" style="animation:none;opacity:1;transition:all 0.3s ${0.1+i*0.08}s">
      <span class="rcond-icon">${c.icon}</span>
      <span class="rcond-text"><strong>${c.stars}</strong> — ${c.text}</span>
      <span class="rcond-badge">${c.met ? '✓' : '✗ ' + c.hint}</span>
    </div>`).join('');

  const earned = calcStarsModule3(errors, cfg.mode);
  const banner = document.getElementById('starsEarnedBanner');
  if (earned > 0) {
    banner.className = 'stars-earned-banner earned';
    banner.innerHTML = `${'★'.repeat(earned)} gagnée${earned > 1 ? 's' : ''} sur ce niveau de difficulté !`;
  } else {
    banner.className = 'stars-earned-banner not-earned';
    banner.textContent = 'Conditions non remplies — aucune étoile accordée.';
  }
}

/* ─── Utils ─── */
function replaySession()  {
  window._bottomBar?.showLaunch(() => window._m03?.launchGame(), 'Lancer la session 🃏');
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
        window._bottomBar?.showLaunch(() => window._m03?.launchGame(), 'Lancer la session 🃏');
        showScreen('screenConfig');
      }, 120);
    },
  });
}

/* ─── Export ─── */
export const module = {
  id: 'module03',
  type: 'training',
  label: 'Comptage Cartes',
  icon: '🃏',
  modes: ['montee', 'descente', 'allerretour'],
  difficulties: ['beginner', 'intermediate', 'expert'],

  render(container) {
    _cleanup();
    _container = container;

    if (!document.getElementById('mod03-styles')) {
      const el = document.createElement('style');
      el.id = 'mod03-styles'; el.textContent = _CSS;
      document.head.appendChild(el);
    }

    container.innerHTML = _HTML;

    /* Sync mode cards to persisted cfg */
    container.querySelectorAll('.mode-card').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mode === cfg.mode);
    });

    renderLevelInfo();

    _keydownHandler = (e) => {
      if (!document.getElementById('screenGame')?.classList.contains('active') || !state.isFlipped) return;
      if (e.key >= '0' && e.key <= '9' && state.currentInput.length < 4) { state.currentInput += e.key; updateInputDisplay(); }
      else if (e.key === 'Backspace') { state.currentInput = state.currentInput.slice(0,-1); updateInputDisplay(); }
      else if (e.key === 'Enter') validateAnswer();
    };
    document.addEventListener('keydown', _keydownHandler);

    window._activeModuleCleanup = _cleanup;
    window._m03 = {
      selectMode:        (m, el) => selectMode(m, el),
      launchGame:        () => launchGame(),
      confirmAbort:      () => confirmAbort(),
      startDescentPhase: () => startDescentPhase(),
      replaySession:     () => replaySession(),
      goBack:            () => _goBack(),
    };

    window._bottomBar?.showLaunch(() => window._m03?.launchGame(), 'Lancer la session 🃏');
    setMusicContext('ambient');
  },

  start()  {},
  end()    {},

  getProgress() {
    const prog = window.ChipMindStorage.getProgress();
    const mod  = prog[3] || {};
    return { stars: mod.stars || 0 };
  },
  getStars(session) { return calcStarsModule3(session.wrong ?? 0, session.mode ?? cfg.mode); },
  getAchievements()     { return []; },
};
