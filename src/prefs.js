import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSafeUrl } from './safeUrl';
import { AX_ORDER, RUBRIQUES, isFollowableAxis } from './theme';

// (loadSector/saveSector — persistance du secteur de la « Lentille » — RETIRÉS : QA v1.2. Orphelins depuis
// que l'audit RS1 a remplacé la Lentille par le filtre explicite (0bac2d0) : aucun écran ne les importait.
// Le filtre est TRANSITOIRE par décision produit — l'utilisateur choisit à chaque session, l'app ne présume
// rien —, il n'y a donc plus de secteur à persister. La clé 'ntongo.sector.v1' éventuellement laissée sur
// les terminaux v1.0/v1.1 devient inerte : plus personne ne la lit.)

// Préférences génériques (blob JSON fusionné) — { lastSeen, notifOn, mode, favs:[snapshots] }.
const KEY_PREFS = 'ntongo.prefs.v1';

// RS_Sec : la FRONTIÈRE DE STOCKAGE est une frontière de confiance (comme le réseau). Un blob favs relu
// d'AsyncStorage (terminal compromis / adb / malware) peut être corrompu ou malveillant → on l'ASSAINIT
// élément par élément (FAIL-CLOSED : on jette les entrées non conformes au lieu de crasher au rendu),
// on force les types string, on ne garde l'URL source que si https sûre, on déduplique par id, on PLAFONNE.
export const MAX_FAVS = 200;
// Bornes de LONGUEUR des chaînes relues (symétriques à MAX_RECENT_LEN) : un favori est RENDU (NewsCard) →
// un titre/texte géant planté dans le stockage ferait mesurer un nœud de plusieurs Mo à Yoga = gel de l'écran.
// Plafonner le NOMBRE (MAX_FAVS) ne suffit pas : il faut aussi plafonner chaque chaîne.
const MAX_FAV = { id: 64, code: 32, edDate: 16, axisName: 64, title: 200, text: 600, name: 120, host: 120, rel: 32 };
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const cut = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
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
      name: cut(f.source.name, MAX_FAV.name),
      host: cut(f.source.host, MAX_FAV.host),
      url: isSafeUrl(f.source.url) ? f.source.url : null,   // isSafeUrl borne déjà la forme (https, sans userinfo)
    } : null;
    out.push({
      id: cut(f.id, MAX_FAV.id), edDate: cut(f.edDate, MAX_FAV.edDate), code: cut(f.code, MAX_FAV.code),
      axis: ALLOWED_AXES.has(f.axis) ? f.axis : '?',   // liste blanche (jamais une clé de prototype)
      axisName: cut(f.axisName, MAX_FAV.axisName),
      title: cut(f.title, MAX_FAV.title),
      text: cut(f.text, MAX_FAV.text),
      reliability: typeof f.reliability === 'string' ? f.reliability.slice(0, MAX_FAV.rel) : undefined,
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

// RS1-10 — Requêtes de recherche RÉCENTES (reconnaissance vs rappel). Purement LOCAL (aucune donnée ne quitte
// l'appareil, posture cybersécurité), assaini à la relecture (que des strings), plafonné à 5.
const KEY_RECENT = 'ntongo.recent.v1';
const MAX_RECENT = 5;
// RS_Sec (v1.1) : borner aussi la LONGUEUR, pas seulement le NOMBRE. Une chaîne géante plantée dans le
// stockage (terminal compromis) survivait au filtre `typeof string` puis était RENDUE en puce → Yoga devait
// mesurer un nœud texte de plusieurs Mo sur le thread principal = gel de l'écran Recherche (DoS persistant).
const MAX_RECENT_LEN = 120;
export async function loadRecent() {
  try {
    const raw = await AsyncStorage.getItem(KEY_RECENT);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a)
      ? a.filter((x) => typeof x === 'string').map((x) => x.slice(0, MAX_RECENT_LEN)).slice(0, MAX_RECENT)
      : [];
  } catch (e) { return []; }
}
export async function pushRecent(q) {
  try {
    const s = (q || '').trim().slice(0, MAX_RECENT_LEN);   // borne à l'écriture aussi
    if (s.length < 2) return null;
    const cur = await loadRecent();
    const next = [s, ...cur.filter((x) => x.toLowerCase() !== s.toLowerCase())].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(KEY_RECENT, JSON.stringify(next));
    return next;
  } catch (e) { return null; }
}
export async function clearRecent() {
  try { await AsyncStorage.removeItem(KEY_RECENT); } catch (e) { /* best-effort */ }
}

// LOT-H (PRT_SOUPA) — JOURNAL D'OBSERVATION de la soupape « Divers ». La porte exige 14 éditions
// consécutives observées avant d'envisager sa suppression : sans trace, cette exigence ne serait qu'une
// phrase. On note donc, par ÉDITION (clé = date de l'édition, jamais deux fois la même), combien d'items
// y sont tombés. Purement LOCAL (aucune donnée ne quitte l'appareil), assaini à la relecture, plafonné.
// Ce journal ne DÉCIDE rien (cf. n1.analyserSoupape) : il rend l'observation mesurable.
const KEY_SOUPAPE = 'ntongo.soupape.v1';
const MAX_SOUPAPE = 30;          // ~2× le seuil de la porte : de quoi voir la série sans enfler le blob
const MAX_SOUPAPE_DATE = 16;
export async function loadSoupape() {
  try {
    const raw = await AsyncStorage.getItem(KEY_SOUPAPE);
    const a = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(a)) return [];
    const seen = new Set(), out = [];
    for (const e of a) {
      if (!isObj(e) || typeof e.date !== 'string' || !e.date) continue;
      const d = e.date.slice(0, MAX_SOUPAPE_DATE);
      if (seen.has(d)) continue;
      seen.add(d);
      // n : entier borné. Un nombre négatif/NaN/géant relu d'un stockage falsifié fausserait la porte.
      const n = Number.isFinite(e.n) ? Math.max(0, Math.min(100000, Math.trunc(e.n))) : 0;
      out.push({ date: d, n });
      if (out.length >= MAX_SOUPAPE) break;
    }
    return out;
  } catch (e) { return []; }
}
// Note l'observation d'UNE édition. Idempotent : re-noter la même date remplace la valeur (une édition
// republiée dans la journée ne doit pas compter deux fois dans la série de la porte).
export async function noterSoupape(date, n) {
  try {
    if (typeof date !== 'string' || !date) return null;
    const cur = await loadSoupape();
    const d = date.slice(0, MAX_SOUPAPE_DATE);
    const val = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    const dejaIdentique = cur.some((e) => e.date === d && e.n === val);
    if (dejaIdentique) return cur;                       // rien de neuf : pas d'écriture disque inutile
    const next = [{ date: d, n: val }, ...cur.filter((e) => e.date !== d)]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))   // plus récent d'abord
      .slice(0, MAX_SOUPAPE);
    await AsyncStorage.setItem(KEY_SOUPAPE, JSON.stringify(next));
    return next;
  } catch (e) { return null; }
}

// RS1-23 — « SUIVRE » un sujet (axe / secteur). Rétention SANS compte ni serveur : purement LOCAL, assaini
// à la relecture (type dans une liste blanche, key string), dédupliqué, plafonné. Alimente la vue « Pour vous ».
const KEY_FOLLOWS = 'ntongo.follows.v1';
const FOLLOW_TYPES = new Set(['axis', 'sector']);
export async function loadFollows() {
  try {
    const raw = await AsyncStorage.getItem(KEY_FOLLOWS);
    const a = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(a)) return [];
    const seen = new Set(), out = [];
    for (const f of a) {
      // fail-closed : type en liste blanche + key string BORNÉE (cohérent avec recent/favs — jamais de
      // chaîne non bornée relue du stockage, même inerte).
      if (!isObj(f) || !FOLLOW_TYPES.has(f.type) || typeof f.key !== 'string' || !f.key || f.key.length > 64) continue;
      // QA v1.2 — MÊME prédicat que l'offre (theme.isFollowableAxis) : un suivi d'axe SYNTHÉTIQUE ne peut rien
      // rendre. Purge aussi les suivis « Ev » déjà PERSISTÉS par les APK v1.0/v1.1, où l'offre existait à tort :
      // sans cela la pastille « Pour vous » resterait proposée et éternellement vide après mise à jour.
      if (f.type === 'axis' && !isFollowableAxis(f.key)) continue;
      const id = f.type + ':' + f.key;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ type: f.type, key: f.key });
      if (out.length >= 50) break;
    }
    return out;
  } catch (e) { return []; }
}
export async function saveFollows(list) {
  try { await AsyncStorage.setItem(KEY_FOLLOWS, JSON.stringify(Array.isArray(list) ? list : [])); } catch (e) { /* best-effort */ }
}
