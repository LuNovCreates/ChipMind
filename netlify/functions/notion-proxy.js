/* ════════════════════════════════════════════════════
   ChipMind — notion-proxy (Netlify Function)
   Proxy sécurisé vers l'API Notion.
   La clé API ne transite jamais côté client.

   Variable d'environnement requise (Netlify dashboard) :
     NOTION_API_KEY  →  "Bearer secret_xxxxxxxxxxxx"
════════════════════════════════════════════════════ */

const NOTION_VERSION = '2022-06-28';
const NOTION_BASE    = 'https://api.notion.com/v1';

/* Chemins autorisés — évite d'utiliser le proxy comme relay générique */
const ALLOWED_PATH = /^(databases\/[a-fA-F0-9-]{32,36}\/query|pages\/[a-fA-F0-9-]{32,36}|pages)$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'NOTION_API_KEY non configurée' }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Corps JSON invalide' };
  }

  const { path, method = 'POST', body } = parsed;

  if (!path || !ALLOWED_PATH.test(path)) {
    return { statusCode: 400, body: `Chemin Notion non autorisé : ${path}` };
  }

  try {
    const res = await fetch(`${NOTION_BASE}/${path}`, {
      method,
      headers: {
        'Authorization':  apiKey,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
