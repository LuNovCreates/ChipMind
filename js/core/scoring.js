/* ════════════════════════════════════════════════════
   ChipMind — scoring.js
   Calcul du score de session. Aucun effet de bord.

   Usage :
     calculateSessionScore({ questions, config })
       questions : [{ correct, timeout, timeMs }]
       config    : { mode, configFactor, T_ref }  ← T_ref en ms
     → { score, maxCombo }
════════════════════════════════════════════════════ */

/* Facteur config Module 01 selon le nombre de tables actives */
export const TABLE_CONFIG_FACTORS = { 1: 1.0, 2: 1.2, 3: 1.4, 4: 1.7, 5: 2.0 };

export function calculateSessionScore({ questions, config }) {
  if (!questions?.length) return { score: 0, maxCombo: 0 };

  const { mode, configFactor, T_ref } = config;
  let total    = 0;
  let combo    = 0;
  let maxCombo = 0;
  let errors   = 0;

  for (const q of questions) {
    if (!q.correct) {
      total -= q.timeout ? 50 : 75;
      combo  = 0;
      errors++;
      continue;
    }

    const speed     = Math.min(2.0, Math.max(0.5, T_ref / q.timeMs));
    const comboMult = getComboMultiplier(combo);
    const modeFact  = mode === 'input' ? 1.2 : 1.0;

    total += 100 * speed * comboMult * modeFact * configFactor;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  }

  total += getPrecisionBonus(errors / questions.length);

  return { score: Math.max(0, Math.round(total)), maxCombo };
}

export function getComboMultiplier(streak) {
  if (streak >= 20) return 2.5;
  if (streak >= 15) return 2.0;
  if (streak >= 10) return 1.6;
  if (streak >= 5)  return 1.3;
  return 1.0;
}

export function getPrecisionBonus(ratio) {
  if (ratio === 0)    return 500;
  if (ratio <= 0.03)  return 300;
  if (ratio <= 0.07)  return 150;
  if (ratio <= 0.10)  return 75;
  return 0;
}
