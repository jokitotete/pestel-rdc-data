import Constants from 'expo-constants';

// URL des données en ligne (configurée dans app.json > extra.dataUrl). Null = pas de fetch, on garde l'embarqué.
export const DATA_URL =
  (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.dataUrl) || null;

// Récupère les données à jour en ligne. Renvoie {editions, manifest, stats, generatedAt} ou null (offline / erreur / pas d'URL).
export async function fetchRemoteData(timeoutMs = 7000) {
  if (!DATA_URL) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const sep = DATA_URL.indexOf('?') >= 0 ? '&' : '?';
    const res = await fetch(DATA_URL + sep + 't=' + Date.now(), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const d = await res.json();
    if (d && d.editions && d.manifest && d.stats) return d;
    return null;
  } catch (e) {
    return null; // pas de réseau, timeout, JSON invalide… → repli silencieux sur l'embarqué
  }
}
