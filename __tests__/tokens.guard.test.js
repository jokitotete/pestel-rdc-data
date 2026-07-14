const fs = require('fs');
const path = require('path');

// RS1-06 — VERROU ANTI-LITTÉRAL (gouvernance Design System agnostique). Le rendu ne référence QUE des
// jetons sémantiques (SP/TYPE/RADIUS/DUR/HIT/C…) définis dans src/theme.js. Ce garde ÉCHOUE si un écran
// réintroduit un littéral d'espacement/typo/rayon/durée ou une couleur en dur — il rend la dette mécanique
// (impossible de merger un style non tokenisé). Allowlist : dimensions de LAYOUT (width/height/flex/position),
// géométrie SVG (icons.js/geo.js exclus), primitives de graphe (strokeWidth, rx, r…), theme.js lui-même.
const ROOT = path.join(__dirname, '..');
const FILES = [
  'App.js', 'src/ui.js', 'src/charts.js',
  ...['Home', 'Axes', 'Detail', 'Map', 'Stats', 'Search', 'Favoris', 'Triage', 'Welcome'].map((s) => `src/screens/${s}.js`),
];

// Propriétés de STYLE qui doivent référencer un jeton (jamais un littéral numérique).
const STYLE_PROPS = [
  'fontSize', 'lineHeight', 'letterSpacing', 'borderRadius',
  'padding', 'paddingHorizontal', 'paddingVertical', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'gap', 'rowGap', 'columnGap', 'duration',
];
const PROP_RE = new RegExp('\\b(' + STYLE_PROPS.join('|') + ')\\s*:\\s*-?[0-9]', 'g');
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA_RE = /\brgba?\s*\(/g;

// Retire commentaires (// et /* */) avant le scan — on ne veut pas flaguer un exemple en commentaire.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('RS1-06 tokens.guard — zéro littéral de style hors theme.js', () => {
  for (const rel of FILES) {
    const src = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    it(`${rel} : aucune propriété de style avec littéral numérique`, () => {
      const hits = src.match(PROP_RE) || [];
      expect(hits).toEqual([]);
    });
    it(`${rel} : aucune couleur hex/rgba littérale`, () => {
      expect(src.match(HEX_RE) || []).toEqual([]);
      expect(src.match(RGBA_RE) || []).toEqual([]);
    });
  }
});
