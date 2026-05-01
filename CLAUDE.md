# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Read this file entirely before writing a single line of code.**
> Every rule here is non-negotiable unless explicitly overridden in a task prompt.

---

## PROJECT

**ChipMind** — PWA d'entraînement au calcul mental pour la certification croupier Cerus Casino Academy (CCA).

**Contraintes absolues :**
- Pure HTML / CSS / Vanilla JS — aucun framework, aucun bundler, aucun transpiler
- Offline-first via Service Worker, installable Android/iOS
- SPA : un seul `index.html`, routing hash-based uniquement

---

## STRUCTURE

```
index.html               ← entrée unique SPA
manifest.json
sw.js                    ← Service Worker (cache-first, version chipmind-vN)

js/
  core/
    app.js               ← bootstrap + init
    router.js            ← navigation hash (#/, #/history, etc.)
    state.js             ← état global (source de vérité unique)
    storage.js           ← wrapper IndexedDB
    sound.js             ← système audio
    migrate.js           ← nettoyage legacy localStorage au premier boot
    gameHelpers.js       ← utilitaires partagés entre modules (shuffleArray, formatTime, updateInputDisplay)

  modules/
    module01.js          ← Tables Croupier          [IMPLÉMENTÉ]
    module02.js          ← Table Mélangée           [IMPLÉMENTÉ]
    module03.js          ← Comptage de Cartes       [IMPLÉMENTÉ]
    module04.js          ← Grilles de Calcul        [SPÉCIFIÉ, À DÉVELOPPER]
    module05.js          ← Paiements Roulette       [SPÉCIFIÉ, À DÉVELOPPER]
    module06.js          ← Multi-Joueurs            [SPÉCIFIÉ, À DÉVELOPPER]
    module07.js          ← Chrono 90 Secondes       [SPÉCIFIÉ, À DÉVELOPPER]
    module08.js          ← Suites Logiques          [SPÉCIFIÉ, À DÉVELOPPER]
    module09.js          ← Mémoire de Séquence      [SPÉCIFIÉ, À DÉVELOPPER]
    module10.js          ← Additions en Cascade     [SPÉCIFIÉ, À DÉVELOPPER]
    learningTables.js    ← Academy des Tables       [SPÉCIFIÉ, À DÉVELOPPER]

css/
  variables.css          ← tokens de design (chargé en premier)
  base.css
  components.css
  modules.css            ← CSS partagé entre tous les modules (layout, timer, feedback, results)

assets/
  fonts/                 ← polices auto-hébergées .woff2 (voir variables.css pour les @font-face)
  sounds/                ← fichiers .mp3 en minuscules (case-sensitive sur Linux/Netlify)
```

---

## ARCHITECTURE MODULES

### Contrat obligatoire

Chaque module **exporte exactement** :

```js
export const module = {
  id: "module01",          // jamais modifier après création
  type: "training",        // "training" | "learning"
  label: "Tables Croupier",
  icon: "♠",
  modes: [],
  difficulties: ["beginner", "intermediate", "expert"],

  render(container) {},    // injecte le HTML + CSS dans container
  start()  {},             // stub — logique dans render
  end()    {},             // stub — logique dans render

  getProgress()  {},       // → { stars }
  getStars(session) {},    // → entier 0–3
  getAchievements() {},    // → [] d'ids
}
```

### Pattern CSS par module

Chaque module injecte ses styles **spécifiques** via :
```js
const _CSS = `/* styles unique à ce module */`;

// Dans render() :
if (!document.getElementById('modXX-styles')) {
  const el = document.createElement('style');
  el.id = 'modXX-styles'; el.textContent = _CSS;
  document.head.appendChild(el);
}
```

Les styles **communs** (screen, header, timer, feedback overlay, numpad, results) sont dans `css/modules.css`, chargé une fois depuis `index.html`. Ne pas les redéfinir dans les modules.

### Helpers partagés

Importer depuis `js/core/gameHelpers.js` :
```js
import { shuffleArray, formatTime } from '../core/gameHelpers.js';
```
Ne jamais réimplémenter ces fonctions dans un module.

### Pattern de nettoyage

Chaque module expose un `_cleanup()` qui :
- Arrête tous les `setInterval` / `setTimeout` actifs
- Retire les event listeners (`keydown`) ajoutés au `document`
- Supprime `window._mXX` et `window._activeModuleCleanup`

---

## STOCKAGE

`localStorage` est **interdit** pour les données core.

```js
// js/core/storage.js
get(key), set(key, value), delete(key), reset()
```

**Reset complet (Settings → Reset) :**
```js
indexedDB.deleteDatabase("ChipMindDB")
localStorage.clear()
caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
```

**État global** (`js/core/state.js`) :
```js
{
  settings: { difficulty, soundVolume: 0.8, musicVolume: 0.5, vibration: true },
  progress: { module01: {}, …, module10: {}, learningTables: {} },
  history: [],          // max 20 entrées, shape: { date, moduleId, difficulty, successRate, durationMs }
  achievements: [],
  stats: { totalStars: 0, totalSessions: 0 }
}
```

---

## NAVIGATION

Hash-based uniquement — `history.pushState` et `window.location.href` sont **interdits**.

4 tabs permanents en bas : Accueil `#/` · Histoire `#/history` · Succès `#/achievements` · Paramètres `#/settings`

---

## SERVICE WORKER

- **Incrémenter `CACHE_NAME`** à chaque déploiement significatif (actuellement `chipmind-v17`)
- Stratégie : Cache-first, fallback réseau
- `css/modules.css` et `js/core/gameHelpers.js` sont dans la liste `CACHE_ASSETS`
- Tous les fichiers sons référencés en `.mp3` minuscules (le serveur Linux est case-sensitive)

---

## AUDIO

Toujours passer par `sound.js` — jamais `new Audio()` dans un module.

```js
import { play as soundPlay, setMusicContext } from '../core/sound.js';
soundPlay('correct')   // correct | wrong | cardFlip | chipDrop | tick | back | achievement
setMusicContext('ambient' | 'game')
```

---

## PROGRESSION

- Modules 01–10 (`type: "training"`) : 3 étoiles × 3 difficultés = **9 étoiles max** par module
- `learningTables` (`type: "learning"`) : `getStars()` retourne toujours 0, ne compte jamais
- `totalStars` max = 90 · `globalProgress = totalStars / 90`

---

## WORKFLOW OBLIGATOIRE

Pour **chaque tâche**, dans cet ordre sans exception :

1. **Lire** — tous les fichiers concernés
2. **Planifier** — liste numérotée en texte clair
3. **Attendre** — ne pas écrire une ligne de code avant validation explicite
4. **Implémenter** — un fichier à la fois
5. **Expliquer** — ce qui a changé et pourquoi

Ne jamais refactoriser et ajouter une fonctionnalité dans la même étape.
Signaler tout changement cassant avec `⚠️` avant de procéder.

---

## INTERDICTIONS ABSOLUES

| Interdit | Raison |
|----------|--------|
| `import React` / `import Vue` / tout framework | Contrainte framework-free |
| `localStorage.setItem` pour données core | IndexedDB uniquement |
| Plusieurs fichiers `.html` | Contrainte SPA |
| `window.location.href` pour naviguer | Le router gère tout |
| `history.pushState` | Routing hash uniquement |
| `<link href="fonts.googleapis.com/...">` | PWA offline — polices auto-hébergées |
| Bundlers, `npm run build` | Pas d'étape de build |
| Inventer des données non spécifiées ici | Demander avant d'implémenter |
| Sauter l'étape de planification | Non-négociable |
| Réimplémenter `shuffleArray` / `formatTime` dans un module | Importer depuis gameHelpers.js |
| Définir dans `_CSS` un style déjà dans `modules.css` | Pas de duplication CSS |

---

## RÉFÉRENCE DONNÉES CCA

### Tables casino (×1 à ×20)

| n | ×5 | ×8 | ×11 | ×17 | ×35 |
|---|----|----|-----|-----|-----|
| 1 | 5 | 8 | 11 | 17 | 35 |
| 2 | 10 | 16 | 22 | 34 | 70 |
| 3 | 15 | 24 | 33 | 51 | 105 |
| 4 | 20 | 32 | 44 | 68 | 140 |
| 5 | 25 | 40 | 55 | 85 | 175 |
| 6 | 30 | 48 | 66 | 102 | 210 |
| 7 | 35 | 56 | 77 | 119 | 245 |
| 8 | 40 | 64 | 88 | 136 | 280 |
| 9 | 45 | 72 | 99 | 153 | 315 |
| 10 | 50 | 80 | 110 | 170 | 350 |
| 11 | 55 | 88 | 121 | 187 | 385 |
| 12 | 60 | 96 | 132 | 204 | 420 |
| 13 | 65 | 104 | 143 | 221 | 455 |
| 14 | 70 | 112 | 154 | 238 | 490 |
| 15 | 75 | 120 | 165 | 255 | 525 |
| 16 | 80 | 128 | 176 | 272 | 560 |
| 17 | 85 | 136 | 187 | 289 | 595 |
| 18 | 90 | 144 | 198 | 306 | 630 |
| 19 | 95 | 152 | 209 | 323 | 665 |
| 20 | 100 | 160 | 220 | 340 | 700 |

### Comptage de cartes

- Jeu : As(=1) à 9, quatre couleurs = 36 cartes
- Somme : (1+…+9) × 4 = **180**
- Modes : montée 0→180 / descente 180→0 / aller-retour 0→180→0

### Paiements roulette

| Mise | Multiplicateur | Exemple 7 jetons |
|------|---------------|-----------------|
| Plein (straight up) | ×35 | gain: 245 / total: 252 |
| Cheval (split) | ×17 | gain: 119 / total: 126 |
| Transversale (street) | ×11 | gain: 77 / total: 84 |
| Carré (corner) | ×8 | gain: 56 / total: 63 |
| Sixain (line) | ×5 | gain: 35 / total: 42 |

*gain = mise × multiplicateur · total = gain + mise rendue*

---

## SPÉCIFICATIONS MODULES

### MODULE 01 — Tables Croupier [IMPLÉMENTÉ]

Tables ×5 ×8 ×11 ×17 ×35, de ×1 à ×20 (100 combinaisons).

Modes : `flash` (mémorisation, pas d'input) · `qcm` (4 choix) · `input` (saisie libre)

Étoiles (3 par difficulté) :
- ★ Flash, 30 questions
- ★★ QCM, 30 questions, ≤ 2 erreurs
- ★★★ Input, 30 questions, ≤ 2 erreurs

Chrono : Débutant=aucun · Intermédiaire=30s/question · Expert=10s/question (non-réponse=erreur)

Achievements : 🥇 Input 0 erreurs moy<5s · 🥈 Input moy<7s · 🥉 50 questions cumulées 0 erreurs

---

### MODULE 02 — Table Mélangée [IMPLÉMENTÉ]

Un multiplicande par ligne, tous les 5 résultats à trouver dans le désordre.

Modes : `qcm` · `input`

Étoiles : ★ QCM 20q 0err · ★★ Input 10q 0err · ★★★ Input 20q 0err

Chrono : Débutant=aucun · Intermédiaire=30s/ligne · Expert=15s/ligne

Achievements : 🥇 moy<5s/ligne · 🥈 moy<7s/ligne · 🥉 moy<12s/ligne

---

### MODULE 03 — Comptage de Cartes [IMPLÉMENTÉ]

Jeu 36 cartes, cumul running visible. Une carte à la fois, valider le total avant la suivante.

Modes : `montee` · `descente` · `allerretour`

Étoiles : ★ montée 0err · ★★ descente 0err · ★★★ aller-retour 0err

Chrono : Débutant=aucun · Intermédiaire=30s/carte · Expert=10s/carte

Achievements : 🃏 aller-retour <5min · ✅ 3 modes × 3 diffs 0err · 🎴 montée ou descente expert 0err

---

### MODULE 04 — Grilles de Calcul

2 grilles CCA : Grille 1 (176 entiers 1–181) · Grille 2 (176 multiples de 5, 5–980).

Exercices progressifs : ×2 puis ÷2 sur 1 cellule → 2 cellules → somme ligne → somme colonne → diagonale → mixte grilles 1+2

Étoiles : ★ exo 1–2 0err · ★★ sommes ligne ≤2err · ★★★ colonne/diagonale 0err

Chrono : Débutant=aucun · Intermédiaire=30s/ligne · Expert=20s

Achievements : 🥇 grille complète 0err <8min · 🥈 grille complète ≤3err

---

### MODULE 05 — Paiements Roulette

Calcul de paiements réalistes (voir tableau roulette ci-dessus).

Étoiles : ★ 20 scénarios débutant 0err · ★★ 20 intermédiaire 0err · ★★★ 10 expert multi-mise 0err

Chrono Expert : 15s/scénario

Achievements : 🎰 30 scénarios 0err · ⚡ expert moy<8s

---

### MODULE 06 — Multi-Joueurs

Table roulette simulée : 2–4 joueurs, mises différentes, calculer chaque paiement individuellement.

Étoiles : ★ 10 rounds 2 joueurs 0err · ★★ 3 joueurs 0err · ★★★ 4 joueurs <20s/round 0err

Achievements : 🎲 4 joueurs 0err moy<15s/round

---

### MODULE 07 — Chrono 90 Secondes

Format test CCA : maximum de bonnes réponses en 90 secondes.

Étoiles : ★ ≥20 · ★★ ≥30 · ★★★ ≥40

Plages : Débutant 1–50 QCM/input · Intermédiaire 1–100 input · Expert 1–200 input, pas de suppression

Achievements : ⏱️ ≥50 réponses · 🎯 ≥40 réponses 0 erreurs

---

### MODULE 08 — Suites Logiques

Compléter des suites arithmétiques avec des pas liés aux tables casino (+5, +8, +11, +17, +35).

Format : 8 nombres, 2–3 blancs à remplir.

Étoiles : ★ 20 suites débutant 0err · ★★ 20 intermédiaire 0err · ★★★ 15 expert 0err

Achievements : 🧠 30 suites expert 0err

---

### MODULE 09 — Mémoire de Séquence

Séquence affichée N secondes → écran vide → saisir dans l'ordre.

Étoiles : ★ 15 séq débutant ≥80% · ★★ 15 intermédiaire ≥80% · ★★★ 15 expert ≥75%

Difficultés : 3 nombres 3s / 5 nombres 2s / 7 nombres 1.5s

Achievements : 🐘 7 nombres 1.5s, 10 parfaites consécutives

---

### MODULE 10 — Additions en Cascade

Additions chaînées : tenir le total en tête sans l'écrire.

Étoiles : ★ 10 chaînes débutant 0err · ★★ 10 intermédiaire ≤1err · ★★★ 10 expert 0err

Difficultés : 5 nb 1–20 valider chaque / 8 nb 1–100 valider tous les 3 / 10 nb 1–180 valider à la fin seulement

Achievements : 🌊 20 chaînes expert 0err

---

### LEARNING — Academy des Tables

`type: "learning"` · `getStars()` retourne toujours 0 · ne contribue pas aux stats globales.

Tables : scolaires ×2–×9 (×1 et ×10 exclus) + casino ×5 ×8 ×11 ×17 ×35

7 étapes par table (séquentielles) : Affichage → Remplir en ordre → Drag & drop → Remplir mélangé → QCM → Input → Jeu mémoire (flip pairs)

Achievements : 🥉 tables sco étapes 1–6 · 🥈 tables sco 7 étapes · 🥇 tables casino 7 étapes
