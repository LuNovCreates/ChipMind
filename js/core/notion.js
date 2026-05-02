/* ════════════════════════════════════════════════════
   ChipMind — notion.js
   Envoi des scores via le proxy Netlify (notion-proxy).
   Aucune clé ni DB ID côté client — tout est serveur.

   En cas d'échec réseau :
     - silencieux côté UX
     - entrée mise en queue dans IndexedDB (notionQueue)
════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const QUEUE_KEY = 'notionQueue';
const PROXY_URL = '/.netlify/functions/notion-proxy';

/* Appel via le proxy — jamais directement l'API Notion */
async function _proxy(payload) {
  const res = await fetch(PROXY_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

/* Cherche la page d'un joueur pour un module spécifique */
async function _findPage(profileId, moduleId) {
  const data = await _proxy({
    action: 'query',
    filter: {
      and: [
        { property: 'profileId', rich_text: { equals: profileId } },
        { property: 'moduleId',  rich_text: { equals: moduleId  } },
      ],
    },
    page_size: 1,
  });
  return data.results?.[0] ?? null;
}

/* Construit les propriétés score — visible géré séparément */
function _buildProperties(profileId, username, avatarId, moduleId, score) {
  return {
    Name:      { title:     [{ text: { content: username  } }] },
    profileId: { rich_text: [{ text: { content: profileId } }] },
    avatarId:  { rich_text: [{ text: { content: avatarId  } }] },
    moduleId:  { rich_text: [{ text: { content: moduleId  } }] },
    score:     { number: score },
  };
}

async function _upsert({ profileId, username, avatarId, moduleId, score }) {
  const props    = _buildProperties(profileId, username, avatarId, moduleId, score);
  const existing = await _findPage(profileId, moduleId);

  if (existing) {
    /* Ne pas toucher à visible — le joueur peut avoir opt-out */
    await _proxy({ action: 'update_page', pageId: existing.id, properties: props });
  } else {
    /* Première entrée : visible = true par défaut */
    await _proxy({
      action:     'create_page',
      properties: { ...props, visible: { checkbox: true } },
    });
  }
}

/* Ajoute une entrée à la queue offline */
async function _enqueue(entry) {
  const queue = (await get(QUEUE_KEY)) ?? [];
  queue.push(entry);
  await set(QUEUE_KEY, queue);
}

/* API publique ────────────────────────────────── */

export async function submitScore(profileId, username, avatarId, moduleId, score) {
  try {
    await _upsert({ profileId, username, avatarId, moduleId, score });
  } catch {
    await _enqueue({ profileId, username, avatarId, moduleId, score });
  }
}

/* Retourne le classement d'un module (participants visibles, trié par score décroissant) */
export async function fetchLeaderboard(moduleId) {
  try {
    const data = await _proxy({
      action: 'query',
      filter: {
        and: [
          { property: 'moduleId', rich_text: { equals: moduleId } },
          { property: 'visible',  checkbox:  { equals: true     } },
        ],
      },
      sorts:     [{ property: 'score', direction: 'descending' }],
      page_size: 50,
    });
    return data.results.map(page => ({
      profileId: page.properties.profileId?.rich_text?.[0]?.text?.content ?? '',
      username:  page.properties.Name?.title?.[0]?.text?.content          ?? '???',
      avatarId:  page.properties.avatarId?.rich_text?.[0]?.text?.content  ?? '01_chip',
      score:     page.properties.score?.number                             ?? 0,
    }));
  } catch {
    return null;
  }
}

/* Retourne tous les scores d'un joueur (tous modules, table unique) */
export async function fetchPlayerScores(profileId) {
  try {
    const data = await _proxy({
      action:    'query',
      filter:    { property: 'profileId', rich_text: { equals: profileId } },
      page_size: 10,
    });
    const results = {};
    data.results.forEach(page => {
      const mod = page.properties.moduleId?.rich_text?.[0]?.text?.content ?? '';
      if (mod) results[mod] = {
        profileId: page.properties.profileId?.rich_text?.[0]?.text?.content ?? '',
        username:  page.properties.Name?.title?.[0]?.text?.content          ?? '???',
        avatarId:  page.properties.avatarId?.rich_text?.[0]?.text?.content  ?? '01_chip',
        score:     page.properties.score?.number                             ?? 0,
      };
    });
    return results;
  } catch {
    return {};
  }
}

/* Met à jour la visibilité du joueur dans le classement (toutes ses entrées) */
export async function setLeaderboardVisibility(profileId, visible) {
  try {
    const data = await _proxy({
      action:    'query',
      filter:    { property: 'profileId', rich_text: { equals: profileId } },
      page_size: 10,
    });
    await Promise.all(data.results.map(page =>
      _proxy({
        action:     'update_page',
        pageId:     page.id,
        properties: { visible: { checkbox: visible } },
      })
    ));
  } catch {
    /* silent — non-critical */
  }
}

/* Appelé au boot — vide la queue si connecté */
export async function flushQueue() {
  const queue = (await get(QUEUE_KEY)) ?? [];
  if (!queue.length) return;

  const remaining = [];
  for (const entry of queue) {
    try {
      await _upsert(entry);
    } catch {
      remaining.push(entry);
    }
  }
  await set(QUEUE_KEY, remaining);
}
