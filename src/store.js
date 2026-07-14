// Accès aux données PESTEL (source : src/data/pestel.js, généré depuis le portail).
import { EDITIONS, MANIFEST, STATS } from './data/pestel';
import * as DATA from './data/pestel';
import { validateData, safeAssign } from './acl';
import { itemInSectorStrong, sectorByKey } from './sectors';
import { hostOf } from './safeUrl';

// Fils de collecte (étage 1). Défensifs : fonctionnent que data/pestel.js exporte FEED/TRIAGE ou non
// (avant/après régénération par build_data.js). Mutables → remplacés en place par applyRemote.
export const FEED = [];      // « À traiter » : captées CLASSÉES et sélectionnées
export const TRIAGE = [];    // « À trier » : captées NON classées (axe « ? »)
if (Array.isArray(DATA.FEED)) DATA.FEED.forEach((x) => FEED.push(x));
if (Array.isArray(DATA.TRIAGE)) DATA.TRIAGE.forEach((x) => TRIAGE.push(x));
export const getFeed = () => FEED;
export const getTriage = () => TRIAGE;

export { EDITIONS, MANIFEST, STATS };

// Liste des éditions, la plus récente en premier (ordre du manifeste).
export const editionsList = () => MANIFEST.map((m) => ({ date: m.date, label: m.label }));
export const latestDate = () => (MANIFEST[0] ? MANIFEST[0].date : Object.keys(EDITIONS).sort().pop());
export const getEdition = (date) => EDITIONS[date];

// Aplatit tous les items en leur rattachant leur axe.
export const allItems = (ed) =>
  ed.axes.flatMap((a) => a.items.map((it) => ({ ...it, axis: a.key, axisName: a.short || a.name, lens: a.lens })));

// Retrouve un item par son code, enrichi de son axe.
export const findItem = (ed, code) => {
  for (const a of ed.axes) {
    const it = a.items.find((i) => i.code === code);
    if (it) return { ...it, axis: a.key, axisName: a.short || a.name, lens: a.lens };
  }
  return null;
};

// Résout des ids de sources en objets source.
export const sourcesFor = (ed, ids) =>
  (ids || []).map((id) => ed.sources.find((s) => s.id === id)).filter(Boolean);

// Source PRINCIPALE d'un item, pour l'afficher sur la carte (« {name} · {host} »). App d'agrégation :
// on cite systématiquement d'où vient l'info. Renvoie {name, host, url} ou null si aucune source résolue.
export const primarySource = (ed, it) => {
  const ids = it && it.sources;
  const s = (ids && ids.length && ed && ed.sources) ? ed.sources.find((x) => x.id === ids[0]) : null;
  if (!s) return null;
  const outlet = (s.name || '').split(/\s[—–-]\s|«/)[0].trim();   // « Actualite.cd — « … » » → « Actualite.cd »
  const host = s.url ? hostOf(s.url).replace(/^www\./, '') : '';
  return { name: outlet, host, url: s.url || null };
};

// Lentille sectorielle (P1) — items de l'édition correspondant FORTEMENT au secteur (titre/analyse).
export const sectorItems = (ed, sectorKey) => {
  const sector = sectorByKey(sectorKey);
  if (!ed || !sector) return [];
  return allItems(ed).filter((it) => itemInSectorStrong(it, sector));
};

// Parse un « quand » d'agenda ("05/07/2026" ou "Août 2026") → timestamp (ou null).
const MOIS = { jan: 0, janv: 0, fév: 1, fev: 1, mars: 2, avr: 3, mai: 4, juin: 5, juil: 6, aou: 7, aoû: 7, sep: 8, oct: 9, nov: 10, déc: 11, dec: 11 };
const monthIdx = (w) => MOIS[w.slice(0, 4).toLowerCase()] ?? MOIS[w.slice(0, 3).toLowerCase()] ?? null;
export const parseWhen = (when) => {
  if (!when || typeof when !== 'string') return null;
  const s = when.trim();
  // "05/07/2026" ou plage "24-25/07/2026" (on retient le 1er jour)
  const dmy = /^(\d{1,2})(?:[-–]\d{1,2})?\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]).getTime();
  // "22 juillet 2026" (jour mois année)
  const dma = /(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\.?\s+(\d{4})/.exec(s);
  if (dma) { const m = monthIdx(dma[2]); if (m != null) return new Date(+dma[3], m, +dma[1]).getTime(); }
  // "Août 2026" (mois année, jour au 1er)
  const my = /([A-Za-zÀ-ÿ]+)\.?\s+(\d{4})/.exec(s);
  if (my) { const m = monthIdx(my[1]); if (m != null) return new Date(+my[2], m, 1).getTime(); }
  return null;
};

// Events (P3, NB1) — rendez-vous « à venir » agrégés sur une fenêtre glissante (défaut 3 semaines),
// à partir des AGENDAS RÉELS de toutes les éditions (sourcés via `code`, non fabriqués), dédupliqués
// et triés par date. Référence temporelle = édition la plus récente.
export const upcomingEvents = (windowDays = 21, cap = 12) => {
  const ref = Date.parse(latestDate()) || Date.now();
  const lo = ref - 3 * 864e5;                   // petit look-back de 3 jours
  const hi = ref + windowDays * 864e5;
  const seen = new Set();
  const out = [];
  // Éditions de la plus RÉCENTE à la plus ancienne : pour un MÊME événement (même date ET même code/libellé),
  // la description la plus fraîche gagne (dédup par date+identité). RS1 : NE PAS dédupliquer par la seule date
  // (sinon deux rendez-vous distincts le même jour → le second disparaît). On garde `edDate` : les codes ne
  // sont PAS uniques d'une édition à l'autre, donc l'item doit être ouvert dans SON édition source.
  for (const d of Object.keys(EDITIONS).sort().reverse()) {
    const ed = EDITIONS[d];
    for (const a of (ed && Array.isArray(ed.agenda) ? ed.agenda : [])) {
      const t = parseWhen(a.when);
      if (t == null || t < lo || t > hi) continue;
      const key = t + '|' + (a.code || (a.what || '').trim().toLowerCase());
      if (seen.has(key)) continue;
      seen.add(key);
      // Intégrité référentielle : un `code` qui ne résout PAS vers un item de SON édition est NEUTRALISÉ
      // (rendu non cliquable) — jamais d'ouverture d'une fiche erronée/vide (ROB-04/SEC-04). Fail-safe.
      const code = a.code && findItem(ed, a.code) ? a.code : null;
      out.push({ when: a.when, what: a.what, code, edDate: d, _t: t });
    }
  }
  return out.sort((x, y) => x._t - y._t).slice(0, cap);
};

// Recherche plein-texte dans les items de l'édition.
export const search = (ed, q) => {
  const t = (q || '').trim().toLowerCase();
  if (t.length < 2) return [];
  return allItems(ed).filter((it) =>
    `${it.code} ${it.title} ${it.text} ${it.analysis || ''}`.toLowerCase().includes(t)
  );
};

// Remplace les données embarquées par celles récupérées en ligne (mutation en place → tous les
// consommateurs voient les nouvelles données au prochain rendu). Renvoie true si appliqué.
export function applyRemote(d) {
  // ACL : le store ne fait pas confiance à son appelant — il re-valide EN BLOC (fail-closed).
  if (!validateData(d)) return false;
  try {
    Object.keys(EDITIONS).forEach((k) => delete EDITIONS[k]);
    safeAssign(EDITIONS, d.editions);   // copie sans clé dangereuse (anti prototype-pollution)
    MANIFEST.length = 0;
    MANIFEST.push(...d.manifest);
    Object.keys(STATS).forEach((k) => delete STATS[k]);
    safeAssign(STATS, d.stats);
    // Fils « À traiter » / « À trier » : l'en-ligne n'écrase QUE ce qu'il DÉCLARE. Clé absente (ancien
    // format en ligne sans feed/triage) → on GARDE l'embarqué. Clé présente → autoritaire (même vide).
    if ('feed' in d) { FEED.length = 0; if (Array.isArray(d.feed)) d.feed.forEach((x) => FEED.push(x)); }
    if ('triage' in d) { TRIAGE.length = 0; if (Array.isArray(d.triage)) d.triage.forEach((x) => TRIAGE.push(x)); }
    return true;
  } catch (e) {
    return false;
  }
}
