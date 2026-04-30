● Plan de migration progressif — ChipMind

  La migration touche 5 couches indépendantes. L'ordre est conçu pour que chaque phase soit déployable et fonctionnelle sans attendre la suivante.

  ---
  Vue d'ensemble

  Phase 1 — Polices offline          (aucun risque, isolé)
  Phase 2 — Infrastructure core      (parallèle à l'existant)
  Phase 3 — Shell SPA + router       (index.html refondu, modules temporairement redirigés)
  Phase 4 — Migration storage        (localStorage → IndexedDB, avec script de migration)
  Phase 5 — Migration modules 1→3   (un par un, contrat strict)
  Phase 6 — Nouveau système d'étoiles (formule 30→90, données migrées)
  Phase 7 — Nettoyage final          (suppression de tout le code legacy)

  ---
  Phase 1 — Polices offline

  Risque : nul. Peut être fait indépendamment de tout le reste.

  - Télécharger les 5 .woff2 dans /assets/fonts/
  - Remplacer les <link href="fonts.googleapis.com/..."> par des @font-face dans variables.css
  - Ajouter les fichiers font au précache sw.js + bumper CACHE_NAME
  - Supprimer les <link> Google Fonts dans index.html, module1.html, module2.html, module3.html

  Livrable : app identique visuellement, mais fonctionnelle offline.

  ---
  Phase 2 — Infrastructure core (fichiers nouveaux, rien de touché)

  Risque : nul. Aucun fichier existant modifié.

  Créer les 5 fichiers dans js/core/ sans les brancher nulle part :

  ┌──────────────────┬──────────────────────────────────────────────────────────────────────┐
  │     Fichier      │                               Contenu                                │
  ├──────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ state.js         │ Objet state spec-conforme + helpers get/set                          │
  ├──────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ storage.js       │ Wrapper IndexedDB (db.get, db.set, db.delete, db.reset)              │
  ├──────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ router.js        │ Hash-router : navigate(hash), onRoute(hash, fn), listener hashchange │
  ├──────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ sound.js         │ sound.play(category), lecture volume depuis state.settings           │
  ├──────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ app.js (nouveau) │ Bootstrap : init(), enregistrement SW, chargement state depuis DB    │
  └──────────────────┴──────────────────────────────────────────────────────────────────────┘

  Les anciens js/app.js, js/storage.js, js/sounds.js restent intacts.

  Livrable : nouveaux fichiers existants, app inchangée.

  ---
  Phase 3 — Shell SPA + navigation

  Risque : moyen. index.html est réécrit. Les modules HTML restent accessibles comme fallback.

  1. Transformer index.html en coque SPA :
    - Ajouter <div id="root"></div>
    - Brancher js/core/router.js, js/core/app.js
    - Le dashboard actuel devient une vue rendue dans #root sur la route #/
  2. Routes #/history, #/achievements, #/settings → rendu dans #root
  3. Route #/module/01 → pendant la transition, redirige temporairement vers modules/module1.html via window.location.href

  ▎ Ce shim de redirection sera supprimé en phase 5. Il garantit que les modules restent jouables pendant la migration.

  4. La nav bottom (4 onglets) passe aux hashs spec
  5. Bumper CACHE_NAME à chipmind-v3

  Point de décision : à la fin de cette phase, les 4 onglets fonctionnent en SPA, les modules redirigent encore vers leurs fichiers HTML séparés.

  ---
  Phase 4 — Migration storage

  Risque : élevé pour les données. À déployer avec script de migration automatique.

  Stratégie : au premier chargement après déploiement, détecter localStorage peuplé et migrer.

  Script de migration (js/core/migrate.js) :
    1. Lire chipmind_progress, chipmind_settings, chipmind_history, chipmind_achievements
    2. Transformer les champs :
         level          → difficulty
         soundVolume    → soundVolume / 100   (0–100 → 0.0–1.0)
         musicVolume    → musicVolume / 100
         haptic         → vibration
         timeMs         → durationMs
         successRate    → successRate / 100   (0–100 → 0.0–1.0)
         moduleId int   → "module0N" string
    3. Écrire dans IndexedDB via db.set()
    4. Marquer la migration : db.set('migrated_v1', true)
    5. NE PAS supprimer localStorage — garder comme backup pendant 1 version

  Cas limite : utilisateurs sans données → migration silencieuse, state par défaut.

  Livrable : toutes les données sont dans IndexedDB, storage.js legacy peut être ignoré.

  ---
  Phase 5 — Migration modules (un par un)

  Risque : moyen par module. Chaque module migré est testé avant de passer au suivant.

  Pour chaque module (ordre suggéré : 3 → 1 → 2, du plus simple au plus complexe) :

  1. Créer js/modules/module0N.js avec le contrat complet (render, start, end, getStars, getProgress, getAchievements)
  2. Extraire la logique JS depuis modules/moduleN.html vers ce fichier
  3. Adapter les accès storage (ChipMindStorage.* → db.get/set)
  4. Adapter le son (ChipMindSounds.correct() → sound.play('correct'))
  5. Supprimer le shim de redirection dans le router pour cette route
  6. Tester end-to-end : config → jeu → fin de session → dashboard mis à jour
  7. Une fois validé, marquer modules/moduleN.html pour suppression (pas encore supprimé)

  Mapping sons à définir lors de cette phase :

  ┌──────────────────────┬───────────────────────────────────────────────┐
  │        Ancien        │                    Nouveau                    │
  ├──────────────────────┼───────────────────────────────────────────────┤
  │ correct              │ correct                                       │
  ├──────────────────────┼───────────────────────────────────────────────┤
  │ wrong                │ wrong                                         │
  ├──────────────────────┼───────────────────────────────────────────────┤
  │ achieve              │ achievement                                   │
  ├──────────────────────┼───────────────────────────────────────────────┤
  │ flip                 │ cardFlip                                      │
  ├──────────────────────┼───────────────────────────────────────────────┤
  │ star                 │ levelUp                                       │
  ├──────────────────────┼───────────────────────────────────────────────┤
  │ tick, keypress, back │ à décider — hors spec, conserver ou supprimer │
  └──────────────────────┴───────────────────────────────────────────────┘

  ---
  Phase 6 — Nouveau système d'étoiles

  Risque : élevé sur les données de progression. À faire après que les 3 modules soient migrés.

  Le passage de maxStars = 30 à maxStars = 90 est une rupture sémantique :

  - Les étoiles actuelles (0–3 par module, global) → créditer sur le niveau beginner uniquement
  - Les niveaux intermediate et expert partent à 0 pour tout le monde
  - Mettre à jour getGlobalStats() avec la nouvelle formule
  - Mettre à jour l'affichage dashboard (X / 90 étoiles)
  - Ajouter un script de migration dans migrate.js (phase 2 de migration)

  Communication à l'utilisateur : afficher un message au premier lancement expliquant que la progression a été réorganisée.

  ---
  Phase 7 — Nettoyage final

  Risque : nul si phases 1–6 sont validées.

  Suppressions :
  - modules/module1.html, module2.html, module3.html
  - js/app.js (ancien), js/storage.js (ancien), js/sounds.js (ancien), js/achievements.js (ancien)
  - Code localStorage legacy dans migrate.js (conserver seulement la détection)
  - Variable CSS renommées : remplacer tous les anciens tokens par les nouveaux dans les modules JS

  Dernière passe SW : bumper CACHE_NAME une dernière fois, nettoyer la liste PRECACHE.

  ---
  Résumé des dépendances

  Phase 1 ──────────────────────────────────► indépendante
  Phase 2 ──────────────────────────────────► indépendante
  Phase 3 ── nécessite Phase 2
  Phase 4 ── nécessite Phase 3
  Phase 5 ── nécessite Phase 4  (un module à la fois)
  Phase 6 ── nécessite Phase 5 complète
  Phase 7 ── nécessite Phase 6

  Phases 1 et 2 peuvent être mergées en parallèle immédiatement. Le premier point de non-retour est la Phase 3 (refonte index.html).