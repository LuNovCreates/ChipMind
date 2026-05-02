/* ════════════════════════════════════════════════════
   ChipMind — config.example.js
   Template de configuration Notion.
   Copier ce fichier en config.js (gitignorée) et remplir les valeurs.

   Prérequis côté Notion :
   - Créer une intégration Notion → récupérer le "Internal Integration Secret"
   - Créer 1 database avec les propriétés :
       Name      → Title  (stocke le username)
       profileId → Rich text
       avatarId  → Rich text  (pour l'affichage dans les profils lecture seule)
       moduleId  → Rich text
       score     → Number
       visible   → Checkbox  (true = participe au classement)
   - Partager la database avec l'intégration
════════════════════════════════════════════════════ */

export const NOTION_API_KEY = '';   // 'Bearer secret_xxxxxxxxxxxx'
export const NOTION_DB      = '';   // ID de la database leaderboard unique
