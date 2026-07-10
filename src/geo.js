import { PROVINCES } from './data/provinces';
import { GEO_LEXICON } from './data/geo-lexicon';
import { allItems } from './store';

// Bornes géographiques (bbox) de la RDC, calculées une fois.
const B = (() => {
  let mnx = 999, mxx = -999, mny = 999, mxy = -999;
  const walk = (c) => {
    if (typeof c[0] === 'number') { mnx = Math.min(mnx, c[0]); mxx = Math.max(mxx, c[0]); mny = Math.min(mny, c[1]); mxy = Math.max(mxy, c[1]); }
    else c.forEach(walk);
  };
  PROVINCES.features.forEach((f) => walk(f.geometry.coordinates));
  return { mnx, mxx, mny, mxy };
})();

const K = Math.cos(((B.mny + B.mxy) / 2) * Math.PI / 180); // correction de longitude
// Rapport hauteur/largeur de la carte projetée (pour dimensionner le SVG sans marges).
export const mapAspect = (B.mxy - B.mny) / ((B.mxx - B.mnx) * K);

// Projette le geojson en tracés SVG { name, d } pour une zone W×H donnée.
export const projectPaths = (W, H, pad = 6) => {
  const gw = (B.mxx - B.mnx) * K, gh = (B.mxy - B.mny);
  const s = Math.min((W - 2 * pad) / gw, (H - 2 * pad) / gh);
  const ox = (W - gw * s) / 2, oy = (H - gh * s) / 2;
  const px = (lng) => ox + (lng - B.mnx) * K * s;
  const py = (lat) => oy + (B.mxy - lat) * s; // y inversé (nord en haut)
  const ring = (r) => r.map((c, i) => (i ? 'L' : 'M') + px(c[0]).toFixed(1) + ' ' + py(c[1]).toFixed(1)).join(' ') + 'Z';
  const poly = (p) => p.map(ring).join(' ');
  return PROVINCES.features.map((f) => {
    const g = f.geometry;
    const d = g.type === 'Polygon' ? poly(g.coordinates) : g.coordinates.map(poly).join(' ');
    return { name: f.properties.name, d };
  });
};

// Provinces citées par un item (via le lexique géo).
export const itemProvinces = (it) => {
  const hay = `${it.title} ${it.text} ${it.analysis || ''}`.toLowerCase();
  const set = new Set();
  for (const k in GEO_LEXICON) if (hay.indexOf(k) >= 0) set.add(GEO_LEXICON[k]);
  return [...set];
};

// Carte province -> items qui la mentionnent, pour l'édition courante.
export const activityByProvince = (ed) => {
  const map = {};
  allItems(ed).forEach((it) => itemProvinces(it).forEach((p) => { (map[p] = map[p] || []).push(it); }));
  return map;
};
