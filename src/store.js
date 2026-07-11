// Accès aux données PESTEL (source : src/data/pestel.js, généré depuis le portail).
import { EDITIONS, MANIFEST, STATS } from './data/pestel';

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
  if (!d || !d.editions || !d.manifest || !d.stats) return false;
  try {
    Object.keys(EDITIONS).forEach((k) => delete EDITIONS[k]);
    Object.assign(EDITIONS, d.editions);
    MANIFEST.length = 0;
    MANIFEST.push(...d.manifest);
    Object.keys(STATS).forEach((k) => delete STATS[k]);
    Object.assign(STATS, d.stats);
    return true;
  } catch (e) {
    return false;
  }
}
