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
