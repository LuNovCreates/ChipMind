/* ════════════════════════════════════════════════════
   ChipMind — notion-proxy (Netlify Function)
   Proxy sécurisé vers l'API Notion.
   NOTION_API_KEY et NOTION_DB restent exclusivement
   côté serveur — jamais exposés au client.

   Variables d'environnement requises (Netlify dashboard) :
     NOTION_API_KEY  →  "Bearer secret_xxxxxxxxxxxx"
     NOTION_DB       →  ID de la database leaderboard
════════════════════════════════════════════════════ */

const NOTION_VERSION = '2022-06-28';
const NOTION_BASE    = 'https://api.notion.com/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { NOTION_API_KEY, NOTION_DB } = process.env;
  if (!NOTION_API_KEY || !NOTION_DB) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Notion non configuré (variables d\'environnement manquantes)' }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Corps JSON invalide' };
  }

  const headers = {
    'Authorization':  NOTION_API_KEY,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  try {
    let notionUrl, method, body;

    switch (parsed.action) {
      case 'query':
        notionUrl = `${NOTION_BASE}/databases/${NOTION_DB}/query`;
        method    = 'POST';
        body      = { filter: parsed.filter, sorts: parsed.sorts, page_size: parsed.page_size };
        break;

      case 'create_page':
        notionUrl = `${NOTION_BASE}/pages`;
        method    = 'POST';
        body      = { parent: { database_id: NOTION_DB }, properties: parsed.properties };
        break;

      case 'update_page':
        if (!parsed.pageId) return { statusCode: 400, body: 'pageId manquant' };
        notionUrl = `${NOTION_BASE}/pages/${parsed.pageId}`;
        method    = 'PATCH';
        body      = { properties: parsed.properties };
        break;

      default:
        return { statusCode: 400, body: `Action inconnue : ${parsed.action}` };
    }

    const res  = await fetch(notionUrl, { method, headers, body: JSON.stringify(body) });
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
