/* ════════════════════════════════════════════════════
   MODULE 05 — Paiements Roulette
   Gains et paiements totaux casino
════════════════════════════════════════════════════ */

import { navigate }                           from '../core/router.js';
import { get }                                from '../core/state.js';
import { play as soundPlay, setMusicContext } from '../core/sound.js';

const BET_TYPES = [
  { name: 'Plein',        mult: 35 },
  { name: 'Cheval',       mult: 17 },
  { name: 'Transversale', mult: 11 },
  { name: 'Carré',        mult:  8 },
  { name: 'Sixain',       mult:  5 },
];

const cfg   = { mode: 'beginner' };
const state = {
  questions: [], current: 0, correct: 0, wrong: 0, errors: [],
  startTime: null, timerInterval: null, timerLeft: 15,
  currentInput: '', isAnswered: false,
};

let _container      = null;
let _keydownHandler = null;

/* ════════════════════════════════════════════════════
   CSS
════════════════════════════════════════════════════ */
const _CSS = `
  .screen{display:none;position:relative;z-index:1;max-width:480px;margin:0 auto;min-height:100dvh;padding-bottom:env(safe-area-inset-bottom,16px)}
  .screen.active{display:flex;flex-direction:column}
  #m05game{height:100dvh;min-height:unset;overflow:hidden}
  .mod-header{display:flex;align-items:center;gap:12px;padding:48px 20px 16px}
  .btn-back{width:38px;height:38px;border-radius:50%;background:var(--ivory-faint);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0;font-size:1rem;color:var(--gold)}
  .btn-back:hover{background:var(--gold-subtle);border-color:var(--gold)}
  .header-title{font-family:var(--font-serif);font-size:1.15rem;font-weight:700;color:var(--ivory);flex:1}
  .header-sub{font-family:var(--font-mono);font-size:0.52rem;color:var(--gold);letter-spacing:0.15em;text-transform:uppercase}
  .config-body{padding:0 20px;flex:1;overflow-y:auto}
  .config-section{margin-bottom:24px}
  .config-label{font-family:var(--font-mono);font-size:0.55rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold);opacity:0.75;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .config-label::after{content:'';flex:1;height:1px;background:linear-gradient(to right,var(--gold-border),transparent)}
  .mode-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .mode-card{border-radius:var(--radius-sm);padding:16px 8px 12px;background:var(--ivory-faint);border:1px solid var(--gold-border);display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:all 0.22s}
  .mode-card .mc-icon{font-size:1.8rem}
  .mode-card .mc-name{font-family:var(--font-mono);font-size:0.53rem;color:var(--ivory);text-transform:uppercase;letter-spacing:0.08em;text-align:center}
  .mode-card .mc-desc{font-family:var(--font-mono);font-size:0.43rem;color:var(--ivory-dim);text-align:center;line-height:1.4}
  .mode-card.selected{background:linear-gradient(145deg,rgba(201,168,76,0.18),rgba(201,168,76,0.07));border-color:var(--gold);box-shadow:0 0 14px var(--gold-glow)}
  .mode-card.selected .mc-name{color:var(--gold-light)}
  .mode-card:hover{transform:translateY(-3px)}
  .star-conditions{background:rgba(201,168,76,0.05);border:1px solid var(--gold-border);border-radius:var(--radius-sm);padding:14px;display:flex;flex-direction:column;gap:8px}
  .star-cond-title{font-family:var(--font-mono);font-size:0.5rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.18em}
  .cond-row{display:flex;align-items:center;gap:8px}
  .cond-dot{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.53rem;font-weight:700;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--ivory-dim)}
  .cond-text{font-family:var(--font-mono);font-size:0.53rem;letter-spacing:0.04em;color:var(--ivory-dim)}
  .ref-table{width:100%;border-collapse:collapse}
  .ref-table th{font-family:var(--font-mono);font-size:0.5rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold);text-align:left;padding:4px 8px;border-bottom:1px solid var(--gold-border)}
  .ref-table td{font-family:var(--font-mono);font-size:0.58rem;color:var(--ivory);padding:6px 8px;border-bottom:1px solid var(--ivory-faint)}
  .ref-table tr:last-child td{border-bottom:none}
  .ref-mult{color:var(--gold-light);font-weight:700}
  .btn-launch{margin:20px 20px 24px;width:calc(100% - 40px);padding:16px;background:linear-gradient(135deg,var(--gold-dark),var(--gold),var(--gold-light));border:none;border-radius:var(--radius);font-family:var(--font-serif);font-size:1.1rem;font-weight:700;color:var(--felt-deep);cursor:pointer;box-shadow:0 4px 20px var(--gold-glow);transition:all 0.2s}
  .btn-launch:hover{transform:translateY(-2px);box-shadow:var(--shadow-gold)}
  .btn-launch:active{transform:scale(0.97)}
  .game-status{display:flex;align-items:center;gap:10px;padding:36px 20px 8px;flex-shrink:0}
  .btn-abort{width:38px;height:38px;border-radius:50%;background:var(--ivory-faint);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ivory-dim);font-size:0.8rem;flex-shrink:0}
  .status-center{flex:1;display:flex;flex-direction:column;gap:4px}
  .status-top{display:flex;justify-content:space-between;align-items:center}
  .status-phase{font-family:var(--font-mono);font-size:0.52rem;color:var(--gold);letter-spacing:0.12em;text-transform:uppercase}
  .status-score{font-family:var(--font-mono);font-size:0.55rem;letter-spacing:0.06em}
  .sc-ok{color:var(--green-light)}
  .sc-err{color:var(--red-light)}
  .game-progress-bar{height:3px;background:rgba(255,255,255,0.07);border-radius:var(--radius-pill);overflow:hidden}
  .game-progress-fill{height:100%;border-radius:var(--radius-pill);background:linear-gradient(90deg,var(--gold-dark),var(--gold));transition:width 0.5s}
  .timer-wrap{margin:0 20px 4px;height:4px;background:rgba(255,255,255,0.07);border-radius:var(--radius-pill);overflow:hidden}
  .timer-fill{height:100%;width:100%;border-radius:var(--radius-pill);background:var(--gold);transition:width 1s linear,background 0.3s}
  .timer-fill.warning{background:var(--red-light)}
  .timer-text{text-align:center;margin:3px 0;font-family:var(--font-mono);font-size:0.56rem;color:var(--ivory-dim);letter-spacing:0.1em}
  .timer-text.warning{color:var(--red-light)}
  .timer-hidden{visibility:hidden;height:0;margin:0}
  .game-zone{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;padding:4px 20px 8px;gap:10px;overflow:hidden}
  .bet-scenario{width:100%;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
  .scenario-label{font-family:var(--font-mono);font-size:0.5rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--gold);opacity:0.7;text-align:center;margin-bottom:2px}
  .bet-card{background:linear-gradient(145deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04));border:1px solid var(--gold-border);border-radius:var(--radius);padding:14px 18px;display:flex;align-items:center;gap:14px}
  .bet-chip{width:52px;height:52px;border-radius:50%;background:linear-gradient(145deg,var(--gold-dark),var(--gold));display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 12px var(--gold-glow),0 0 0 3px rgba(201,168,76,0.2);gap:1px}
  .bet-chip-amount{font-family:var(--font-serif);font-size:1.1rem;font-weight:900;color:var(--felt-deep);line-height:1}
  .bet-chip-sub{font-family:var(--font-mono);font-size:0.33rem;text-transform:uppercase;color:var(--felt-deep);letter-spacing:0.05em;opacity:0.7}
  .bet-info{flex:1}
  .bet-type-name{font-family:var(--font-serif);font-size:1.05rem;font-weight:700;color:var(--ivory);margin-bottom:2px}
  .bet-type-mult{font-family:var(--font-mono);font-size:0.7rem;color:var(--gold);letter-spacing:0.05em}
  .bet-ask{font-family:var(--font-mono);font-size:0.48rem;color:var(--ivory-dim);text-transform:uppercase;letter-spacing:0.1em;margin-top:4px}
  .bet-card.mini{padding:10px 14px}
  .bet-card.mini .bet-chip{width:40px;height:40px}
  .bet-card.mini .bet-chip-amount{font-size:0.9rem}
  .bet-card.mini .bet-type-name{font-size:0.9rem}
  .bet-card.mini .bet-type-mult{font-size:0.6rem}
  .multi-total-hint{font-family:var(--font-mono);font-size:0.52rem;color:var(--ivory-dim);text-align:center;letter-spacing:0.06em}
  .input-zone{width:100%;display:flex;flex-direction:column;gap:6px}
  .input-display{width:100%;background:var(--felt-deep);border:1px solid var(--gold-border);border-radius:var(--radius-sm);padding:9px 14px;text-align:center;font-family:var(--font-serif);font-size:1.7rem;font-weight:700;color:var(--gold-light);min-height:48px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3)}
  .input-display.correct{color:var(--green-light);box-shadow:inset 0 2px 8px rgba(0,0,0,0.3),0 0 14px var(--green-glow);border-color:var(--green)}
  .input-display.wrong{color:var(--red-light);box-shadow:inset 0 2px 8px rgba(0,0,0,0.3),0 0 14px var(--red-glow);border-color:var(--red)}
  .input-placeholder{opacity:0.25;font-size:1.2rem}
  .numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
  .numpad-btn{padding:8px 6px;border-radius:var(--radius-sm);background:linear-gradient(145deg,var(--felt-card),var(--felt-mid));border:1px solid rgba(201,168,76,0.12);cursor:pointer;font-family:var(--font-serif);font-size:1.15rem;font-weight:700;color:var(--ivory);text-align:center;transition:all 0.12s;box-shadow:0 3px 10px rgba(0,0,0,0.25);-webkit-tap-highlight-color:transparent}
  .numpad-btn:active{transform:scale(0.93)}
  .numpad-btn.del{font-family:var(--font-mono);font-size:1rem;color:var(--gold)}
  .numpad-btn.validate{grid-column:span 3;padding:9px;background:linear-gradient(135deg,var(--gold-dark),var(--gold),var(--gold-light));color:var(--felt-deep);font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;font-family:var(--font-mono);border:none;box-shadow:0 4px 16px var(--gold-glow)}
  .numpad-btn.validate:active{transform:scale(0.97)}
  .results-body{flex:1;overflow-y:auto;padding:0 20px 32px}
  .result-stars{display:flex;justify-content:center;gap:12px;margin:20px 0 16px}
  .result-star{font-size:2.5rem;color:rgba(201,168,76,0.15);transition:all 0.4s;filter:drop-shadow(0 0 2px transparent)}
  .result-star.lit{color:var(--gold);filter:drop-shadow(0 0 12px var(--gold-glow))}
  @keyframes starPop05{0%{transform:scale(0) rotate(-20deg)}70%{transform:scale(1.3) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
  .result-star.star-pop{animation:starPop05 0.5s var(--ease-spring) both}
  .result-title{font-family:var(--font-serif);font-size:1.5rem;font-weight:900;color:var(--gold-light);text-align:center;margin-bottom:4px}
  .result-subtitle{font-family:var(--font-elegant);font-style:italic;font-size:0.82rem;color:var(--ivory-dim);text-align:center;margin-bottom:20px}
  .result-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
  .rstat{background:var(--ivory-faint);border:1px solid var(--gold-border);border-radius:var(--radius-sm);padding:12px 8px;text-align:center}
  .rstat-value{font-family:var(--font-serif);font-size:1.4rem;font-weight:700;color:var(--gold-light)}
  .rstat-label{font-family:var(--font-mono);font-size:0.48rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--ivory-dim);margin-top:3px}
  .result-conditions{margin-bottom:16px}
  .result-cond-title{font-family:var(--font-mono);font-size:0.55rem;text-transform:uppercase;letter-spacing:0.18em;color:var(--gold);margin-bottom:10px;opacity:0.8}
  .result-cond-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:6px;border:1px solid transparent}
  .result-cond-row.met{background:rgba(39,174,96,0.07);border-color:rgba(39,174,96,0.2)}
  .result-cond-row.unmet{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07)}
  .rcond-icon{font-size:1rem;flex-shrink:0}
  .rcond-text{font-family:var(--font-mono);font-size:0.53rem;color:var(--ivory-dim);flex:1;line-height:1.5}
  .rcond-text strong{color:var(--ivory)}
  .rcond-badge{font-family:var(--font-mono);font-size:0.5rem}
  .result-cond-row.met .rcond-badge{color:var(--green-light)}
  .result-cond-row.unmet .rcond-badge{color:var(--red-light)}
  .stars-earned-banner{text-align:center;font-family:var(--font-serif);font-size:0.9rem;font-weight:700;padding:12px;border-radius:var(--radius-sm);margin-bottom:16px}
  .stars-earned-banner.earned{color:var(--gold-light);background:rgba(201,168,76,0.1);border:1px solid var(--gold-border)}
  .stars-earned-banner.not-earned{color:var(--ivory-dim);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08)}
  .errors-section{margin-bottom:16px}
  .errors-title{font-family:var(--font-mono);font-size:0.55rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--red-light);margin-bottom:10px;opacity:0.8}
  .error-item{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(192,57,43,0.07);border:1px solid rgba(192,57,43,0.15);border-radius:var(--radius-sm);margin-bottom:6px;font-family:var(--font-mono);font-size:0.58rem}
  .error-q{flex:1;color:var(--ivory-dim)}
  .error-your{color:var(--red-light)}
  .error-correct{color:var(--green-light);font-weight:700}
  .btn-replay{width:100%;padding:14px;background:var(--ivory-faint);border:1px solid var(--gold-border);border-radius:var(--radius);font-family:var(--font-serif);font-size:1rem;font-weight:700;color:var(--gold-light);cursor:pointer;transition:all 0.2s;margin-top:8px}
  .btn-replay:hover{background:var(--gold-subtle)}
`;

/* ════════════════════════════════════════════════════
   HTML
════════════════════════════════════════════════════ */
const _HTML = `
<div class="bg-felt"></div>

<!-- CONFIG -->
<div class="screen active" id="m05cfg">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m05?.goBack()">←</button>
    <div>
      <div class="header-title">Paiements Roulette</div>
      <div class="header-sub">Module 05 · Gains casino</div>
    </div>
  </div>
  <div class="config-body">
    <div class="config-section">
      <div class="config-label">Mode de calcul</div>
      <div class="mode-cards">
        <div class="mode-card" id="mc05beg" onclick="window._m05?.selectMode('beginner')">
          <span class="mc-icon">🎯</span>
          <span class="mc-name">Débutant</span>
          <span class="mc-desc">Gain seul<br>Mise × Mult</span>
        </div>
        <div class="mode-card" id="mc05int" onclick="window._m05?.selectMode('intermediate')">
          <span class="mc-icon">💰</span>
          <span class="mc-name">Interméd.</span>
          <span class="mc-desc">Total versé<br>Gain + Mise</span>
        </div>
        <div class="mode-card" id="mc05exp" onclick="window._m05?.selectMode('expert')">
          <span class="mc-icon">⚡</span>
          <span class="mc-name">Expert</span>
          <span class="mc-desc">Multi-mises<br>15s / scénario</span>
        </div>
      </div>
    </div>
    <div class="config-section">
      <div class="config-label">Conditions étoiles</div>
      <div class="star-conditions">
        <div class="star-cond-title">Progression</div>
        <div class="cond-row"><div class="cond-dot">★</div><span class="cond-text">Débutant · 20 scénarios · 0 faute</span></div>
        <div class="cond-row"><div class="cond-dot">★★</div><span class="cond-text">Intermédiaire · 20 scénarios · 0 faute</span></div>
        <div class="cond-row"><div class="cond-dot">★★★</div><span class="cond-text">Expert · 10 multi-mises · 0 faute · 15s</span></div>
      </div>
    </div>
    <div class="config-section">
      <div class="config-label">Table des mises</div>
      <table class="ref-table">
        <tr><th>Mise</th><th>Mult.</th><th>Gain (7 jetons)</th><th>Total</th></tr>
        <tr><td>Plein</td><td class="ref-mult">×35</td><td>245</td><td>252</td></tr>
        <tr><td>Cheval</td><td class="ref-mult">×17</td><td>119</td><td>126</td></tr>
        <tr><td>Transversale</td><td class="ref-mult">×11</td><td>77</td><td>84</td></tr>
        <tr><td>Carré</td><td class="ref-mult">×8</td><td>56</td><td>63</td></tr>
        <tr><td>Sixain</td><td class="ref-mult">×5</td><td>35</td><td>42</td></tr>
      </table>
    </div>
  </div>
  <button class="btn-launch" onclick="window._m05?.startGame()">Lancer ▶</button>
</div>

<!-- GAME -->
<div class="screen" id="m05game">
  <div class="game-status">
    <button class="btn-abort" onclick="window._m05?.confirmAbort()">✕</button>
    <div class="status-center">
      <div class="status-top">
        <span class="status-phase" id="m05phase">Débutant</span>
        <span class="status-score">
          <span class="sc-ok" id="m05ok">0</span>
          <span style="color:var(--ivory-dim)"> · </span>
          <span class="sc-err" id="m05err">0✗</span>
        </span>
      </div>
      <div class="game-progress-bar">
        <div class="game-progress-fill" id="m05prog" style="width:0%"></div>
      </div>
    </div>
  </div>
  <div class="timer-wrap" id="m05timerWrap">
    <div class="timer-fill" id="m05timerFill" style="width:100%"></div>
  </div>
  <div class="timer-text" id="m05timerText">15s</div>
  <div class="game-zone">
    <div id="m05scenario" class="bet-scenario"></div>
    <div class="input-zone">
      <div class="input-display" id="m05display"><span class="input-placeholder">?</span></div>
      <div class="numpad" id="m05numpad"></div>
    </div>
  </div>
</div>

<!-- RESULTS -->
<div class="screen" id="m05results">
  <div class="mod-header">
    <button class="btn-back" onclick="window._m05?.goBack()">←</button>
    <div>
      <div class="header-title">Résultats</div>
      <div class="header-sub">Paiements Roulette · Module 05</div>
    </div>
  </div>
  <div class="results-body">
    <div class="result-stars">
      <span class="result-star" id="m05s1">★</span>
      <span class="result-star" id="m05s2">★</span>
      <span class="result-star" id="m05s3">★</span>
    </div>
    <div class="result-title" id="m05rtitle">Résultats</div>
    <div class="result-subtitle" id="m05rsub"></div>
    <div class="result-stats">
      <div class="rstat"><div class="rstat-value" id="m05rscore">—</div><div class="rstat-label">Réussite</div></div>
      <div class="rstat"><div class="rstat-value" id="m05rtime">—</div><div class="rstat-label">Temps</div></div>
      <div class="rstat"><div class="rstat-value" id="m05rqs">—</div><div class="rstat-label">Scénarios</div></div>
    </div>
    <div class="result-conditions">
      <div class="result-cond-title">Conditions étoiles</div>
      <div id="m05rconds"></div>
    </div>
    <div class="stars-earned-banner" id="m05rbanner"></div>
    <div class="errors-section" id="m05rerrors" style="display:none">
      <div class="errors-title">Erreurs à retravailler</div>
      <div id="m05rerrlist"></div>
    </div>
    <button class="btn-replay" onclick="window._m05?.replay()">↺ Rejouer</button>
  </div>
</div>
`;

/* ════════════════════════════════════════════════════
   QUESTION GENERATION
════════════════════════════════════════════════════ */
function _genQuestions() {
  const total = cfg.mode === 'expert' ? 10 : 20;
  return Array.from({ length: total }, () => {
    if (cfg.mode === 'expert') {
      const numBets = 2 + Math.floor(Math.random() * 2);
      const bets = [];
      for (let j = 0; j < numBets; j++) {
        const t = BET_TYPES[Math.floor(Math.random() * BET_TYPES.length)];
        const a = 1 + Math.floor(Math.random() * 10);
        bets.push({ type: t, amount: a, payout: a * t.mult + a });
      }
      return { bets, answer: bets.reduce((s, b) => s + b.payout, 0) };
    }
    const t    = BET_TYPES[Math.floor(Math.random() * BET_TYPES.length)];
    const a    = 1 + Math.floor(Math.random() * 15);
    const gain = a * t.mult;
    return { bet: { type: t, amount: a }, gain, answer: cfg.mode === 'intermediate' ? gain + a : gain };
  });
}

/* ════════════════════════════════════════════════════
   STAR CALCULATION
════════════════════════════════════════════════════ */
function _calcStars(errors) {
  if (errors !== 0)                          return 0;
  if (cfg.mode === 'beginner')     return 1;
  if (cfg.mode === 'intermediate') return 2;
  if (cfg.mode === 'expert')       return 3;
  return 0;
}

/* ════════════════════════════════════════════════════
   LIFECYCLE
════════════════════════════════════════════════════ */
function _cleanup() {
  _stopTimer();
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }
  delete window._m05;
  if (window._activeModuleCleanup === _cleanup) window._activeModuleCleanup = null;
}

function _getSettings() {
  return window.ChipMindStorage?.getSettings?.() || { level: 'beginner', soundVolume: 50, haptic: true };
}

function _formatTime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function showScreen(id) {
  _container?.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  window.scrollTo(0, 0);
}

/* ════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════ */
function selectMode(mode) {
  cfg.mode = mode;
  const map = { beginner: 'mc05beg', intermediate: 'mc05int', expert: 'mc05exp' };
  Object.values(map).forEach(id => document.getElementById(id)?.classList.remove('selected'));
  document.getElementById(map[mode])?.classList.add('selected');
  soundPlay('chipDrop');
}

function goBack() {
  _cleanup();
  soundPlay('back');
  setMusicContext('ambient');
  window._cmRefreshDashboard?.();
  navigate('#/');
}

/* ════════════════════════════════════════════════════
   GAME START
════════════════════════════════════════════════════ */
function startGame() {
  state.questions    = _genQuestions();
  state.current      = 0;
  state.correct      = 0;
  state.wrong        = 0;
  state.errors       = [];
  state.startTime    = Date.now();
  state.isAnswered   = false;
  state.currentInput = '';

  _buildNumpad();
  showScreen('m05game');
  setMusicContext('game');

  const phaseLabels = { beginner: 'Débutant', intermediate: 'Interméd.', expert: 'Expert' };
  document.getElementById('m05phase').textContent = phaseLabels[cfg.mode] || cfg.mode;

  const timerWrap = document.getElementById('m05timerWrap');
  const timerText = document.getElementById('m05timerText');
  if (cfg.mode === 'expert') {
    timerWrap.classList.remove('timer-hidden');
    timerText.classList.remove('timer-hidden');
  } else {
    timerWrap.classList.add('timer-hidden');
    timerText.classList.add('timer-hidden');
  }

  showQuestion();
}

function _buildNumpad() {
  const pad  = document.getElementById('m05numpad');
  const keys = ['7','8','9','4','5','6','1','2','3','del','0','validate'];
  pad.innerHTML = keys.map(k => {
    if (k === 'del')      return `<button class="numpad-btn del" onclick="window._m05?.padDel()">⌫</button>`;
    if (k === 'validate') return `<button class="numpad-btn validate" onclick="window._m05?.padValidate()">Valider ✓</button>`;
    return `<button class="numpad-btn" onclick="window._m05?.padDigit('${k}')">${k}</button>`;
  }).join('');
}

/* ════════════════════════════════════════════════════
   QUESTION DISPLAY
════════════════════════════════════════════════════ */
function showQuestion() {
  if (state.current >= state.questions.length) { endGame(); return; }

  state.isAnswered   = false;
  state.currentInput = '';
  _updateDisplay('');

  const q    = state.questions[state.current];
  const pct  = (state.current / state.questions.length) * 100;

  document.getElementById('m05ok').textContent  = state.correct;
  document.getElementById('m05err').textContent = state.wrong + '✗';
  document.getElementById('m05prog').style.width = pct + '%';

  const scenario = document.getElementById('m05scenario');

  if (q.bets) {
    let html = '<div class="scenario-label">Paiement total combiné</div>';
    q.bets.forEach(b => {
      html += `<div class="bet-card mini">
        <div class="bet-chip">
          <div class="bet-chip-amount">${b.amount}</div>
          <div class="bet-chip-sub">jetons</div>
        </div>
        <div class="bet-info">
          <div class="bet-type-name">${b.type.name}</div>
          <div class="bet-type-mult">× ${b.type.mult} (total versé = mise + gain)</div>
        </div>
      </div>`;
    });
    html += `<div class="multi-total-hint">Entrez la somme des paiements</div>`;
    scenario.innerHTML = html;
  } else {
    const b     = q.bet;
    const label = cfg.mode === 'intermediate'
      ? `Paiement total = mise (${b.amount}) + gain`
      : `Gain = mise × multiplicateur`;
    scenario.innerHTML = `
      <div class="scenario-label">${label}</div>
      <div class="bet-card">
        <div class="bet-chip">
          <div class="bet-chip-amount">${b.amount}</div>
          <div class="bet-chip-sub">jetons</div>
        </div>
        <div class="bet-info">
          <div class="bet-type-name">${b.type.name}</div>
          <div class="bet-type-mult">× ${b.type.mult}</div>
          <div class="bet-ask">${cfg.mode === 'intermediate' ? 'Total versé = ?' : 'Gain = ?'}</div>
        </div>
      </div>`;
  }

  if (cfg.mode === 'expert') _startTimer();
}

/* ════════════════════════════════════════════════════
   INPUT HANDLING
════════════════════════════════════════════════════ */
function _updateDisplay(val) {
  const el = document.getElementById('m05display');
  if (!el) return;
  if (!val) {
    el.innerHTML = '<span class="input-placeholder">?</span>';
    el.className = 'input-display';
  } else {
    el.textContent = val;
    el.className   = 'input-display';
  }
}

function padDigit(d) {
  if (state.isAnswered || state.currentInput.length >= 5) return;
  state.currentInput += d;
  _updateDisplay(state.currentInput);
  soundPlay('keypress');
}

function padDel() {
  if (state.isAnswered) return;
  state.currentInput = state.currentInput.slice(0, -1);
  _updateDisplay(state.currentInput);
}

function padValidate() {
  if (state.isAnswered || !state.currentInput) return;
  _checkAnswer();
}

function _checkAnswer() {
  state.isAnswered = true;
  _stopTimer();

  const q       = state.questions[state.current];
  const entered = parseInt(state.currentInput, 10);
  const isOk    = entered === q.answer;
  const disp    = document.getElementById('m05display');

  if (isOk) {
    state.correct++;
    soundPlay('correct');
    const vibration = get('settings')?.vibration ?? true;
    if (vibration && navigator.vibrate) navigator.vibrate(50);
    disp.className  = 'input-display correct';
    disp.textContent = state.currentInput;
    setTimeout(() => { state.current++; showQuestion(); }, 700);
  } else {
    state.wrong++;
    soundPlay('wrong');
    const vibration = get('settings')?.vibration ?? true;
    if (vibration && navigator.vibrate) navigator.vibrate([50, 30, 100]);
    state.errors.push({ q, entered, expected: q.answer });
    disp.className  = 'input-display wrong';
    disp.textContent = state.currentInput;
    setTimeout(() => {
      disp.className  = 'input-display correct';
      disp.textContent = String(q.answer);
      setTimeout(() => { state.current++; showQuestion(); }, 900);
    }, 600);
  }
}

/* ════════════════════════════════════════════════════
   TIMER (expert only)
════════════════════════════════════════════════════ */
function _startTimer() {
  _stopTimer();
  state.timerLeft = 15;
  _updateTimer();
  state.timerInterval = setInterval(() => {
    state.timerLeft--;
    _updateTimer();
    if (state.timerLeft <= 0) { _stopTimer(); _timerExpired(); }
  }, 1000);
}

function _stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function _updateTimer() {
  const fill = document.getElementById('m05timerFill');
  const text = document.getElementById('m05timerText');
  if (!fill || !text) return;
  fill.style.width = ((state.timerLeft / 15) * 100) + '%';
  fill.classList.toggle('warning', state.timerLeft <= 5);
  text.textContent = state.timerLeft + 's';
  text.classList.toggle('warning', state.timerLeft <= 5);
}

function _timerExpired() {
  if (state.isAnswered) return;
  state.isAnswered = true;
  state.wrong++;
  soundPlay('wrong');

  const q = state.questions[state.current];
  state.errors.push({ q, entered: '⏱', expected: q.answer });

  const disp = document.getElementById('m05display');
  disp.className  = 'input-display wrong';
  disp.textContent = '⏱';
  setTimeout(() => {
    disp.className  = 'input-display correct';
    disp.textContent = String(q.answer);
    setTimeout(() => { state.current++; showQuestion(); }, 900);
  }, 600);
}

/* ════════════════════════════════════════════════════
   END GAME
════════════════════════════════════════════════════ */
function endGame() {
  _stopTimer();
  setMusicContext('ambient');

  const total   = state.questions.length;
  const rate    = Math.round((state.correct / total) * 100);
  const totalMs = Date.now() - state.startTime;
  const stars   = _calcStars(state.wrong);
  const settings = _getSettings();

  window.ChipMindApp.endSession({
    moduleId: 5, stars, successRate: rate, timeMs: totalMs,
    extra: { mode: cfg.mode, totalQuestions: total },
  });
  window.ChipMindStorage?.updateModuleScore?.(5, settings.level, cfg.mode, rate);

  showScreen('m05results');

  const titles = {
    0: ['À retravailler',   'Continue l\'entraînement — les gains n\'ont pas de secret !'],
    1: ['Bon début !',      '1 étoile — gains maîtrisés en mode débutant.'],
    2: ['Très bien !',      '2 étoiles — paiements totaux acquis.'],
    3: ['Parfait !',        '3 étoiles — croupier roulette confirmé !'],
  };
  const [title, sub] = titles[stars] || titles[0];
  document.getElementById('m05rtitle').textContent = title;
  document.getElementById('m05rsub').textContent   = sub;
  document.getElementById('m05rscore').textContent = rate + '%';
  document.getElementById('m05rtime').textContent  = _formatTime(totalMs);
  document.getElementById('m05rqs').textContent    = total;

  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`m05s${i}`);
    el?.classList.remove('lit', 'star-pop');
    if (i <= stars) setTimeout(() => el?.classList.add('lit', 'star-pop'), 300 + (i - 1) * 250);
  });

  _renderResultConditions();

  const errSec = document.getElementById('m05rerrors');
  if (state.errors.length > 0) {
    errSec.style.display = 'block';
    document.getElementById('m05rerrlist').innerHTML = state.errors.slice(0, 10).map(e => {
      const qText = e.q.bets
        ? e.q.bets.map(b => `${b.amount}×${b.type.mult}(${b.type.name})`).join(' + ')
        : `${e.q.bet.amount} × ${e.q.bet.type.mult} (${e.q.bet.type.name})`;
      return `<div class="error-item">
        <div class="error-q">${qText}</div>
        <span class="error-your">${e.entered}</span>
        <span class="error-correct">= ${e.expected}</span>
      </div>`;
    }).join('');
  } else {
    errSec.style.display = 'none';
  }
}

function _renderResultConditions() {
  const errors = state.wrong;
  const e      = errors;
  const conds  = [
    { stars: '★',   met: cfg.mode === 'beginner'     && e === 0, text: `Débutant · 20 scénarios · ${e} faute${e !== 1 ? 's' : ''}/0 max`,        icon: '🎯' },
    { stars: '★★',  met: cfg.mode === 'intermediate' && e === 0, text: `Intermédiaire · 20 scénarios · ${e} faute${e !== 1 ? 's' : ''}/0 max`,  icon: '💰' },
    { stars: '★★★', met: cfg.mode === 'expert'       && e === 0, text: `Expert · 10 multi-mises · ${e} faute${e !== 1 ? 's' : ''}/0 max · 15s`, icon: '⚡' },
  ];

  document.getElementById('m05rconds').innerHTML = conds.map(c => `
    <div class="result-cond-row ${c.met ? 'met' : 'unmet'}">
      <span class="rcond-icon">${c.icon}</span>
      <span class="rcond-text"><strong>${c.stars}</strong> — ${c.text}</span>
      <span class="rcond-badge">${c.met ? '✓' : '✗'}</span>
    </div>`).join('');

  const earned = _calcStars(errors);
  const banner = document.getElementById('m05rbanner');
  if (earned > 0) {
    banner.className = 'stars-earned-banner earned';
    banner.innerHTML = `${'★'.repeat(earned)} gagnée${earned > 1 ? 's' : ''} !`;
  } else {
    banner.className = 'stars-earned-banner not-earned';
    banner.textContent = 'Conditions non remplies — aucune étoile accordée.';
  }
}

/* ════════════════════════════════════════════════════
   KEYBOARD
════════════════════════════════════════════════════ */
function _initKeyboard() {
  _keydownHandler = e => {
    if (!document.getElementById('m05game')?.classList.contains('active')) return;
    if (e.key >= '0' && e.key <= '9') padDigit(e.key);
    else if (e.key === 'Backspace')   padDel();
    else if (e.key === 'Enter')       padValidate();
  };
  document.addEventListener('keydown', _keydownHandler);
}

/* ════════════════════════════════════════════════════
   MODULE ACTIONS
════════════════════════════════════════════════════ */
function confirmAbort() {
  if (confirm('Abandonner la session ?')) {
    _stopTimer();
    soundPlay('back');
    setTimeout(() => { setMusicContext('ambient'); showScreen('m05cfg'); }, 120);
  }
}

function replay() {
  showScreen('m05cfg');
  soundPlay('chipDrop');
}

/* ════════════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════════════ */
export const module = {
  id: 'module05',
  type: 'training',
  label: 'Paiements Roulette',
  icon: '🎡',
  modes: ['beginner', 'intermediate', 'expert'],
  difficulties: ['beginner', 'intermediate', 'expert'],

  render(container) {
    _cleanup();
    _container = container;

    if (!document.getElementById('mod05-styles')) {
      const style  = document.createElement('style');
      style.id     = 'mod05-styles';
      style.textContent = _CSS;
      document.head.appendChild(style);
    }

    container.innerHTML = _HTML;
    selectMode(cfg.mode);

    window._m05 = { goBack, selectMode, startGame, confirmAbort, replay, padDigit, padDel, padValidate };
    window._activeModuleCleanup = _cleanup;
    _initKeyboard();
    window._bottomBar?.hide();
  },

  getProgress() {
    return window.ChipMindStorage?.getProgress?.()?.[5] || { stars: 0 };
  },
  getStars()        { return 0; },
  getAchievements() { return []; },
};
