import { LIGHT, DARK, AX, AXT_L, AXT_D, REL, RELT_L, RELT_D, tint, HERO_GRAD } from '../src/theme';

// RS1-07 — VÉRIFICATEUR DE CONTRASTE WCAG exécutable. Calcule le ratio de CHAQUE paire de jetons affirmée
// AA dans les DEUX thèmes (texte ≥4,5:1 ; graphique/large ≥3:1). Un jeton non conforme rend la suite ROUGE.
// La maths de contraste est DÉTERMINISTE (jamais « à l'œil ») : luminance relative WCAG + composition alpha.

function parse(c) {
  if (typeof c !== 'string') throw new Error('couleur non-string: ' + c);
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) { const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
  m = c.match(/^#([0-9a-f]{3})$/i);
  if (m) { const h = m[1]; return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 1]; }
  m = c.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x.trim())); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
  throw new Error('couleur illisible: ' + c);
}
// Compose fg (éventuellement translucide) SUR un fond opaque → couleur opaque.
function over(fg, bg) {
  const [fr, fgc, fb, fa] = parse(fg), [br, bg2, bb] = parse(bg);
  return [fr * fa + br * (1 - fa), fgc * fa + bg2 * (1 - fa), fb * fa + bb * (1 - fa), 1];
}
function lum(rgb) {
  const a = rgb.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
// Ratio d'un texte (opaque) sur un fond (opaque, éventuellement composé d'un tint sur une base).
function ratio(fg, bg) {
  const L1 = lum(parse(fg).length === 4 ? over(fg, bg) : parse(fg)), L2 = lum(parse(bg));
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}
const AXES = ['P', 'E', 'S', 'T', 'Env', 'L', 'C', 'Sp', 'Ev'];
const RELS = ['A', 'B', 'C', 'D'];

describe('RS1-07 contraste WCAG — jetons TEXTE ≥ 4,5:1 (clair + sombre)', () => {
  const THEMES = [{ n: 'clair', P: LIGHT, AXT: AXT_L, RELT: RELT_L }, { n: 'sombre', P: DARK, AXT: AXT_D, RELT: RELT_D }];
  for (const t of THEMES) {
    it(`${t.n} : ink/inkDim/inkMut/okText/goldText sur bg & panel`, () => {
      for (const bg of [t.P.bg, t.P.panel]) {
        for (const tok of ['ink', 'inkDim', 'inkMut', 'okText', 'goldText']) {
          expect(ratio(t.P[tok], bg)).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it(`${t.n} : onAction sur actionFill (surface d'action)`, () => {
      expect(ratio(t.P.onAction, t.P.actionFill)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${t.n} : onHero sur l'arrêt le plus clair du bandeau HERO_GRAD`, () => {
      expect(ratio(t.P.onHero, HERO_GRAD[1])).toBeGreaterThanOrEqual(4.5);
    });
    it(`${t.n} : AXT[axe] (texte d'axe) sur son fond teinté réel (badge tint 0.14)`, () => {
      for (const k of AXES) {
        const composed = over(tint(AX[k], 0.14), t.P.panel);   // AXT texte sur le badge de compte (tint 0.14)
        // over() renvoie [r,g,b,1] → passer en rgb string pour ratio()
        expect(ratio(t.AXT[k], `rgba(${composed[0]},${composed[1]},${composed[2]},1)`)).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${t.n} : RELT[fiab] (lettre A/B/C/D) sur son fond teinté réel`, () => {
      for (const r of RELS) {
        const composed = over(tint(REL[r].c, 0.16), t.P.panel);
        expect(ratio(t.RELT[r], `rgba(${composed[0]},${composed[1]},${composed[2]},1)`)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe('RS1-07 contraste WCAG — jetons GRAPHIQUES ≥ 3:1 (point/pastille, clair + sombre)', () => {
  for (const t of [{ n: 'clair', P: LIGHT }, { n: 'sombre', P: DARK }]) {
    it(`${t.n} : ok/gold/alert/cobalt (points) sur panel`, () => {
      for (const tok of ['ok', 'gold', 'alert', 'cobalt']) {
        expect(ratio(t.P[tok], t.P.panel)).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
