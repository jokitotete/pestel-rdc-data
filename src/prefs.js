import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSafeUrl } from './safeUrl';
import { AX_ORDER, RUBRIQUES } from './theme';

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
// RS3 (défense en profondeur) : l'axis ne peut être qu'une clé d'axe/rubrique CONNUE (ou '?') — cela
// empêche de STOCKER une clé héritée du prototype (`constructor`/`toString`…) qui, même si pick() la rend
// inoffensive au rendu, n'a rien à faire dans un favori. Liste blanche alignée sur AX_ORDER ∪ RUBRIQUES.
const ALLOWED_AXES = new Set([...AX_ORDER, ...RUBRIQUES, '?']);
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
      axis: ALLOWED_AXES.has(f.axis) ? f.axis : '?',   // liste blanche (jamais une clé de prototype)
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

// RS3 : le CACHE RAM est la source de vérité de la fusion (jamais le disque). Évite le lost-update de
// deux savePrefs de clés différentes (favori vs thème) entrelacés dans la fenêtre getItem→setItem.
let _cache = null;
let _writeChain = Promise.resolve();

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFS);
    const parsed = raw ? JSON.parse(raw) : null;
    const p = isObj(parsed) ? parsed : {};   // un blob non-objet (tampering) → défauts sûrs
    _cache = { ...p, favs: sanitizeFavs(p.favs) };   // favs TOUJOURS assainis + plafonnés à la relecture
    return _cache;
  } catch (e) {
    _cache = _cache || {};   // dégradation sûre : pas de persistance → valeurs par défaut
    return _cache;
  }
}

// Fusion (patch) : ne réécrit que les clés fournies, préserve le reste. Écritures SÉRIALISÉES (chaîne de
// promesses FIFO) : chaque fusion part du dernier _cache (mis à jour par la précédente dans la chaîne),
// donc jamais de perte de mise à jour croisée ; hydratation paresseuse si loadPrefs n'a pas encore tourné.
export function savePrefs(patch) {
  _writeChain = _writeChain.then(async () => {
    if (_cache === null) await loadPrefs();
    _cache = { ...(_cache || {}), ...(patch || {}) };
    try { await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(_cache)); } catch (e) { /* best-effort */ }
    return _cache;
  });
  return _writeChain;
}
