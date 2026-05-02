/* ════════════════════════════════════════════════════
   ChipMind — profile.js
   CRUD profil joueur + logique top 3.
   Toutes les données → IndexedDB via storage.js.
════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const PROFILE_KEY = 'profile';

export function generateProfileId(username) {
  const ts   = Date.now();
  const hash = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
                       .toString(36).slice(0, 5);
  return `uid_${ts}_${hash}`;
}

export async function getProfile() {
  return get(PROFILE_KEY);
}

export async function createProfile(username, avatarId) {
  const profile = {
    id:        generateProfileId(username),
    username,
    avatarId,
    createdAt: Date.now(),
    leaderboardVisible: true,
    stats: { totalSessions: 0, totalStars: 0, bestCombo: 0 },
    bestScores: { module01: [], module02: [], module03: [] },
  };
  await set(PROFILE_KEY, profile);
  return profile;
}

/* username, avatarId, leaderboardVisible sont modifiables — id et createdAt sont immuables */
export async function updateProfile({ username, avatarId, leaderboardVisible } = {}) {
  const profile = await getProfile();
  if (!profile) return null;
  if (username           !== undefined) profile.username           = username;
  if (avatarId           !== undefined) profile.avatarId           = avatarId;
  if (leaderboardVisible !== undefined) profile.leaderboardVisible = leaderboardVisible;
  await set(PROFILE_KEY, profile);
  return profile;
}

/* Insère une entrée dans le top 3 du module et trie par score décroissant */
export async function updateTop3(moduleId, newEntry) {
  const profile = await getProfile();
  if (!profile) return null;

  const top3 = profile.bestScores[moduleId] ?? [];
  const prevBest = top3[0]?.score ?? -1;

  top3.push(newEntry);
  top3.sort((a, b) => b.score - a.score);
  profile.bestScores[moduleId] = top3.slice(0, 3);

  await set(PROFILE_KEY, profile);

  const isNewRecord = newEntry.score > prevBest;
  return { profile, isNewRecord };
}

export async function updateBestCombo(newCombo) {
  const profile = await getProfile();
  if (!profile || newCombo <= (profile.stats.bestCombo ?? 0)) return;
  profile.stats.bestCombo = newCombo;
  await set(PROFILE_KEY, profile);
}

/* Synchronise les stats depuis state.js après chaque session */
export async function syncStats({ totalSessions, totalStars }) {
  const profile = await getProfile();
  if (!profile) return;
  profile.stats.totalSessions = totalSessions;
  profile.stats.totalStars    = totalStars;
  await set(PROFILE_KEY, profile);
}
