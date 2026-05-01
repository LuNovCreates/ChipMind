# profil-plan.md — ChipMind : Système de Profils & Classement

> Document de spécification pour Claude Code.
> Lire intégralement avant toute implémentation. Toutes les règles sont non-négociables.

---

## CONTEXTE TECHNIQUE

- **1 seul profil** par appareil (single-user device model)
- **Image de profil** = images locales intégrées dans l'app (pas d'upload utilisateur)
- **Base de données** = Notion via API d'intégration (classements globaux)
- **Stockage local** = IndexedDB (via `js/core/storage.js`) pour le profil actif
- **Aucun `localStorage`** pour les données core (règle CLAUDE.md)

---

## 1. SYSTÈME DE PROFIL

### 1.1 Création

- Au premier lancement, si aucun profil n'existe en IndexedDB :
  - Afficher un **écran obligatoire de création** (non-contournable)
  - Champs requis : nom utilisateur (texte libre, 2–20 caractères)
  - Sélection d'un avatar parmi les images locales disponibles
  - Générer un **ID unique** : `uid_<timestamp>_<hash5dupnom>`
- Stocker le profil dans IndexedDB sous la clé `"profile"`

### 1.2 Structure du profil (IndexedDB)

```js
{
  id: "uid_1718000000000_ab3f2",   // généré à la création, immuable
  username: "NovPlayer",           // modifiable
  avatarId: "avatar_03",           // id de l'image locale sélectionnée
  createdAt: 1718000000000,        // timestamp ms, immuable
  stats: {
    totalSessions: 0,
    totalStars: 0,                 // max 90 (voir CLAUDE.md)
    bestCombo: 0                   // meilleur combo absolu jamais atteint
  },
  bestScores: {
    // 3 meilleurs scores par module, triés par score décroissant
    // chaque entrée : { score, mode, configLabel, date }
    module01: [],                  // max 3 entrées
    module02: [],                  // max 3 entrées
    module03: []                   // max 3 entrées
  }
}
```

Exemple d'une entrée dans `bestScores.module01` :
```js
{ score: 42500, mode: "input", configLabel: "5 tables", date: 1718000000000 }
```

### 1.3 Modification

L'utilisateur peut depuis l'écran Profil :
- Changer son **nom** (validation : 2–20 caractères, non vide)
- Changer son **avatar** (sélection parmi images locales)
- Consulter ses **stats globales** et **top 3 scores par module**

L'ID et la date de création sont **immuables**.

### 1.4 Avatars locaux

- Images stockées dans `assets/avatars/`
- Nommées `avatar_01.png`, `avatar_02.png`, etc.
- Référencées uniquement par leur `avatarId` dans le profil
- Jamais uploadées par l'utilisateur

---

## 2. SYSTÈME DE SCORE

### 2.1 Principes fondamentaux

- Le score est **indépendant de la difficulté** comme facteur explicite
- La difficulté crée une **pression naturelle** (temps réduit → T_actual bas → speed_factor élevé si le joueur est bon)
- Trois axes de calcul : **vitesse**, **précision**, **régularité (combo)**

### 2.2 Formule par réponse correcte

```
score_q = BASE × speed_factor × combo_multiplier × mode_factor × config_factor
```

- `BASE` = **100 points**
- Les facteurs ci-dessous s'appliquent uniquement aux **réponses correctes**
- Une réponse incorrecte ne génère aucun `score_q` + déclenche une pénalité

### 2.3 Speed Factor

```
T_actual = temps_total_session / nombre_de_questions
speed_factor = clamp(T_ref / T_actual, 0.5, 2.0)
```

| Module | T_ref | Unité de mesure |
|--------|-------|-----------------|
| Module 01 | 6s | par question |
| Module 02 | 10s | par ligne (ensemble des 5 réponses) |
| Module 03 | 8s | par carte |

- Réponse 2× plus rapide que T_ref → ×2.0 (maximum)
- Réponse égale à T_ref → ×1.0 (neutre)
- Réponse 2× plus lente → ×0.5 (minimum)

### 2.4 Mode Factor

| Mode | Facteur |
|------|---------|
| QCM | ×1.0 |
| Input (saisie libre) | ×1.2 |
| Flash (Module 01) | **pas de score** — apprentissage pur |

### 2.5 Config Factor

**Module 01 — Nombre de tables sélectionnées**

Plus le joueur active de tables simultanément, plus le contexte mental est large :

| Tables actives | Config factor |
|----------------|--------------|
| 1 table | ×1.0 |
| 2 tables | ×1.2 |
| 3 tables | ×1.4 |
| 4 tables | ×1.7 |
| 5 tables | ×2.0 |

**Module 02 — Taille de la range**

```
config_factor = range_size / 10
```

Où `range_size` = nombre de valeurs dans la plage choisie (ex : 1–10 → 10 valeurs → ×1.0 ; 1–20 → 20 valeurs → ×2.0 ; 1–5 → 5 valeurs → ×0.5).

**Module 03** — pas de config factor (×1.0 implicite, un seul format de session)

> Lorsque `mode_factor` et `config_factor` sont tous deux actifs (M01, M02), ils se **multiplient entre eux**.
> Exemple : M01, 5 tables + input → ×2.0 × ×1.2 = ×2.4 appliqué sur BASE.

### 2.6 Combo Multiplier

Le combo comptabilise les **réponses correctes consécutives sans erreur ni timeout**.

| Streak consécutif | Multiplicateur |
|-------------------|---------------|
| 1 – 4 | ×1.0 |
| 5 – 9 | ×1.3 |
| 10 – 14 | ×1.6 |
| 15 – 19 | ×2.0 |
| 20 + | ×2.5 |

**Reset du combo :** erreur ou timeout (non-réponse sur timer expiré).

### 2.7 Pénalités

| Événement | Pénalité | Effet combo |
|-----------|----------|-------------|
| Erreur | −75 pts | Reset à 0 |
| Timeout (non-réponse) | −50 pts | Reset à 0 |

Les pénalités sont soustraites du **total de session**, pas du `score_q` individuel.

### 2.8 Bonus de précision (fin de session)

```
error_ratio = nb_erreurs / nb_questions
```

| error_ratio | Bonus |
|-------------|-------|
| 0% | +500 pts |
| ≤ 3% | +300 pts |
| ≤ 7% | +150 pts |
| ≤ 10% | +75 pts |
| > 10% | +0 pts |

Ce système est équitable entre modules de longueurs différentes : 1 erreur sur 36 cartes (M03) ≠ 1 erreur sur 10 questions (M02).

### 2.9 Score de session final

```
score_session = Σ(score_q) − Σ(pénalités) + bonus_precision
```

Score minimum garanti : **0** (jamais négatif).

### 2.10 Enregistrement des best scores

- Chaque module conserve un **top 3** des meilleures sessions dans `profile.bestScores["<moduleId>"]`
- Après chaque session, si `score_session` est supérieur au 3ᵉ score du top 3 (ou si le top 3 est incomplet) :
  - Insérer la nouvelle entrée, trier par score décroissant, conserver uniquement les 3 premières
  - Mettre à jour IndexedDB
- **Le score soumis au classement Notion est le score #1 (meilleur) du top 3 du module**
- Pas de score global unique — chaque module a son propre classement indépendant

### 2.11 Score max théorique (référence équité)

Conditions max : mode Input + config max + combo 20+ + vitesse ×2 + 0 erreur

| Module | Conditions | Score max approx. |
|--------|-----------|-------------------|
| M01 | 5 tables, input, 30q | ~55 500 |
| M02 | range 1–20, input, 20 lignes | ~36 500 |
| M03 | aller-retour, 72 cartes | ~36 500 |

---

## 3. LOGIQUE DE CLASSEMENT

### 3.1 Classement local

- Affiché dans l'écran Profil, **un tableau par module** (M01 / M02 / M03)
- Source : `profile.bestScores[moduleId]` en IndexedDB
- Chaque tableau affiche le top 3 du joueur avec : score, mode, config, date

### 3.2 Classement global (Notion)

- **3 leaderboards séparés** dans Notion, un par module
- Envoi vers le leaderboard du module concerné après chaque session améliorant le score #1 du joueur pour ce module
- Structure de l'entrée Notion :

```js
{
  profileId: "uid_1718000000000_ab3f2",
  username: "NovPlayer",
  moduleId: "module01",             // "module01" | "module02" | "module03"
  score: 42500,                     // score #1 du joueur pour ce module
  submittedAt: 1718000000000
}
```

- L'envoi est **silencieux** (pas de blocage UX si l'API échoue)
- En cas d'échec réseau : réessai différé au prochain lancement (file d'attente en IndexedDB)

### 3.3 Contraintes Notion

- Une seule entrée par `profileId + moduleId` dans chaque leaderboard (upsert)
- La clé de dédoublonnage côté Notion est `profileId_moduleId`
- Pas d'authentification utilisateur — le `profileId` suffit comme identifiant

---

## 4. UX FLOW COMPLET

### 4.1 Premier lancement

```
Chargement app
  └─ Profil absent en IndexedDB ?
       ├─ OUI → Écran création profil (obligatoire)
       │          ├─ Saisie nom
       │          ├─ Sélection avatar
       │          └─ Bouton "Créer mon profil" → génère ID → stocke → accueil
       └─ NON → Accueil normal
```

### 4.2 Fin de session (module quelconque)

```
Session terminée
  └─ Calcul score_session
       └─ score_session > 3ᵉ score du top 3 du module (ou top 3 incomplet) ?
            ├─ OUI → insertion dans top 3 + tri + IndexedDB
            │         └─ score_session > score #1 actuel du module ?
            │              ├─ OUI → tentative envoi Notion (upsert leaderboard module)
            │              └─ NON → pas d'envoi Notion
            └─ NON → aucune mise à jour
       └─ Affichage écran résultats :
            - Score session
            - Position dans le top 3 personnel (ex: "🥇 Nouveau record !")
            - Étoiles obtenues
            - Combo max atteint
            - Ratio précision + bonus
```

### 4.3 Écran Profil

```
Onglet Profil (#/profile)
  ├─ Avatar + Nom (bouton modifier)
  ├─ Stats globales (sessions, étoiles, meilleur combo)
  ├─ Top 3 par module (3 sections distinctes : M01 / M02 / M03)
  └─ Classement global par module (fetch Notion ×3, avec fallback "hors ligne")
```

---

## 5. CONTRAINTES TECHNIQUES

### 5.1 Stockage

- Toutes les données profil via `js/core/storage.js` (wrapper IndexedDB)
- Clé racine du profil : `"profile"`
- File d'attente Notion en attente : clé `"notionQueue"` (tableau d'objets)

### 5.2 Génération d'ID

```js
function generateProfileId(username) {
  const ts = Date.now();
  const hash = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
                       .toString(36).slice(0, 5);
  return `uid_${ts}_${hash}`;
}
```

### 5.3 Calcul du score — implémentation de référence

```js
// js/core/scoring.js  (fichier à créer)
export function calculateSessionScore({ questions, config }) {
  const { mode, configFactor, T_ref } = config;
  let total = 0;
  let combo = 0;
  let errors = 0;

  for (const q of questions) {
    if (!q.correct) {
      total -= q.timeout ? 50 : 75;
      combo = 0;
      errors++;
      continue;
    }
    const speed     = Math.min(2.0, Math.max(0.5, (T_ref * 1000) / q.timeMs));
    const comboMult = getComboMultiplier(combo);
    const modeFact  = mode === 'input' ? 1.2 : 1.0;
    total += 100 * speed * comboMult * modeFact * configFactor;
    combo++;
  }

  total += getPrecisionBonus(errors / questions.length);
  return Math.max(0, Math.round(total));
}

function getComboMultiplier(streak) {
  if (streak >= 20) return 2.5;
  if (streak >= 15) return 2.0;
  if (streak >= 10) return 1.6;
  if (streak >= 5)  return 1.3;
  return 1.0;
}

function getPrecisionBonus(ratio) {
  if (ratio === 0)   return 500;
  if (ratio <= 0.03) return 300;
  if (ratio <= 0.07) return 150;
  if (ratio <= 0.10) return 75;
  return 0;
}
```

### 5.4 Config factor Module 01 (tables)

```js
const TABLE_CONFIG_FACTORS = { 1: 1.0, 2: 1.2, 3: 1.4, 4: 1.7, 5: 2.0 };
const configFactor = TABLE_CONFIG_FACTORS[selectedTablesCount] ?? 1.0;
```

### 5.5 Config factor Module 02 (range)

```js
const configFactor = rangeSize / 10;
// rangeSize = nombre de valeurs dans la plage (ex : 1–10 → rangeSize=10)
```

### 5.6 Mise à jour du top 3

```js
// Dans js/core/profile.js
export function updateTop3(profile, moduleId, newEntry) {
  // newEntry : { score, mode, configLabel, date }
  const top3 = profile.bestScores[moduleId] ?? [];
  top3.push(newEntry);
  top3.sort((a, b) => b.score - a.score);
  profile.bestScores[moduleId] = top3.slice(0, 3);
  return profile;
}
```

### 5.7 Intégration Notion

```js
// js/core/notion.js  (fichier à créer)
export async function submitScore(profileId, username, moduleId, score) {
  // Upsert dans le leaderboard Notion du module (dédoublonnage sur profileId_moduleId)
  // En cas d'échec : ajouter à notionQueue en IndexedDB
}

export async function flushQueue() {
  // Au boot : tenter d'envoyer les entrées en attente dans notionQueue
}
```

---

## 6. FICHIERS À CRÉER

| Fichier | Description |
|---------|-------------|
| `js/core/scoring.js` | Calcul score session (formule complète) |
| `js/core/notion.js` | Envoi scores vers Notion + gestion queue offline |
| `js/core/profile.js` | CRUD profil + logique top 3 |
| `assets/avatars/` | Dossier images avatars locaux |

Ces fichiers s'intègrent dans l'architecture existante de `js/core/` sans modifier les fichiers existants, sauf ajout d'imports dans `app.js` pour l'initialisation.

---

## 7. POINTS D'ATTENTION POUR L'IMPLÉMENTATION

- ⚠️ Pas de score global unique — `stats` ne contient pas de `totalScore`
- ⚠️ Chaque module a son propre top 3 indépendant et son propre leaderboard Notion
- ⚠️ L'envoi Notion ne se déclenche que si le score #1 du module est battu (pas pour une entrée en #2 ou #3)
- ⚠️ Le calcul du `T_actual` utilise le **temps réel écoulé**, pas le temps maximum alloué par la difficulté
- ⚠️ Le mode `flash` du Module 01 ne déclenche **jamais** `calculateSessionScore`
- ⚠️ Le `bestCombo` global est mis à jour si le `max_combo` de la session le dépasse
- ⚠️ L'envoi Notion ne doit jamais bloquer l'affichage des résultats (async non-bloquant)
- ⚠️ En mode offline (PWA), la queue Notion est persistée en IndexedDB et vidée au prochain lancement connecté
