import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSafeUrl } from './safeUrl';

// Préférences persistées (best-effort). Aujourd'hui : la LENTILLE sectorielle (P1) — le secteur
// choisi survit aux relances (exigence Product Owner : état persistant, corrigible, jamais deviné).
const KEY_SECTOR = 'ntongo.sector.v1';

export async function loadSector() {
  try {
    return (await AsyncStorage.getItem(KEY_SECTOR)) || null;
  } catch (e) {
    return null;   // pas de persistance dispo → national par défaut (dégradation sûre)
  }
}

export async function saveSector(key) {
  try {
    if (key) await AsyncStorage.setItem(KEY_SECTOR, key);
    else await AsyncStorage.removeItem(KEY_SECTOR);
  } catch (e) {
    /* best-effort : l'app reste fonctionnelle sans persistance */
  }
}

// Préférences génériques (blob JSON fusionné) — { lastSeen, notifOn, mode, favs:[snapshots] }.
const KEY_PREFS = 'ntongo.prefs.v1';

// RS_Sec : la FRONTIÈRE DE STOCKAGE est une frontière de confiance (comme le réseau). Un blob favs relu
// d'AsyncStorage (terminal compromis / adb / malware) peut être corrompu ou malveillant → on l'ASSAINIT
// élément par élément (FAIL-CLOSED : on jette les entrées non conformes au lieu de crasher au rendu),
// on force les types string, on ne garde l'URL source que si https sûre, on déduplique par id, on PLAFONNE.
export const MAX_FAVS = 200;
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
export function sanitizeFavs(a) {
  if (!Array.isArray(a)) return [];
  const out = [], seen = new Set();
  for (const f of a) {
    if (!isObj(f) || typeof f.id !== 'string' || typeof f.code !== 'string' || typeof f.edDate !== 'string') continue;
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    const s = isObj(f.source) ? {
      name: typeof f.source.name === 'string' ? f.source.name : '',
      host: typeof f.source.host === 'string' ? f.source.host : '',
      url: isSafeUrl(f.source.url) ? f.source.url : null,
    } : null;
    out.push({
      id: f.id, edDate: f.edDate, code: f.code,
      axis: typeof f.axis === 'string' ? f.axis : '?',
      axisName: typeof f.axisName === 'string' ? f.axisName : '',
      title: typeof f.title === 'string' ? f.title : '',
      text: typeof f.text === 'string' ? f.text : '',
      reliability: typeof f.reliability === 'string' ? f.reliability : undefined,
      source: s,
    });
    if (out.length >= MAX_FAVS) break;
  }
  return out;
}

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFS);
    const parsed = raw ? JSON.parse(raw) : null;
    const p = isObj(parsed) ? parsed : {};   // un blob non-objet (tampering) → défauts sûrs
    return { ...p, favs: sanitizeFavs(p.favs) };   // favs TOUJOURS assainis + plafonnés à la relecture
  } catch (e) {
    return {};   // dégradation sûre : pas de persistance → valeurs par défaut
  }
}

// Fusion (patch) : ne réécrit que les clés fournies, préserve le reste.
export async function savePrefs(patch) {
  try {
    const cur = await loadPrefs();
    const next = { ...cur, ...(patch || {}) };
    await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(next));
    return next;
  } catch (e) {
    return null;
  }
}
