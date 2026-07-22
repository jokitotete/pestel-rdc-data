const fs = require('fs');
const path = require('path');

// RS1-06 — VERROU ANTI-LITTÉRAL (gouvernance Design System agnostique). Le rendu ne référence QUE des
// jetons sémantiques (SP/TYPE/RADIUS/DUR/HIT/C…) définis dans src/theme.js. Ce garde ÉCHOUE si un écran
// réintroduit un littéral d'espacement/typo/rayon/durée ou une couleur en dur — il rend la dette mécanique
// (impossible de merger un style non tokenisé). Allowlist : dimensions de LAYOUT (width/height/flex/position),
// géométrie SVG (icons.js/geo.js exclus), primitives de graphe (strokeWidth, rx, r…), theme.js lui-même.
const ROOT = path.join(__dirname, '..');
// LOT-F — LA LISTE D'ÉCRANS ÉTAIT TENUE À LA MAIN, ET ELLE AVAIT DÉJÀ UN TROU : `About.js` (ajouté au
// TCK-015) n'y figurait pas et n'a donc JAMAIS été contrôlé. C'est la famille de défauts la plus
// fréquente de ce projet (TCK-004, TCK-050, select.js oublié par un recensement « exhaustif ») : un
// recensement manuel se périme au premier fichier suivant. On ÉNUMÈRE désormais le dossier, comme le
// fait déjà imports.guard, et on ancre le périmètre pour que la garde ne puisse pas se vider en silence.
const SCREENS = fs.readdirSync(path.join(ROOT, 'src', 'screens'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `src/screens/${f}`)
  .sort();
// CONTRÔLE ADVERSARIAL — le LOT-F a énuméré `src/screens/`, mais a laissé la partie `src/*.js` de la
// liste TENUE À LA MAIN : `['App.js', 'src/ui.js', 'src/charts.js']`. Les modules ajoutés depuis
// (n1.js, majeurs.js, copie.js, …) n'étaient donc balayés par RIEN — exactement le trou qu'`About.js`
// avait déjà creusé côté écrans, une strate plus bas. MESURÉ au moment de la correction : 11 fichiers
// hors balayage, 0 littéral dedans — le défaut était donc LATENT, pas actif. On énumère aussi ce dossier.
// EXCLUSIONS DÉCLARÉES : theme.js (la source des jetons), icons.js et geo.js (géométrie SVG et couleurs
// de tracé — arbitrage assumé, à revoir si une couleur de MARQUE y apparaît), src/data/ (données, pas style).
const EXCLUS = new Set(['src/theme.js', 'src/icons.js', 'src/geo.js']);
const MODULES = fs.readdirSync(path.join(ROOT, 'src'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `src/${f}`)
  .filter((f) => !EXCLUS.has(f))
  .sort();
const FILES = ['App.js', ...MODULES, ...SCREENS];

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
  // GARDE DE LA GARDE : si l'énumération se vide (renommage de dossier), tous les tests par fichier
  // passeraient VIDES et la garde mentirait en restant verte.
  it('balaie bien tous les écrans (garde de la garde)', () => {
    expect(SCREENS.length).toBeGreaterThanOrEqual(10);
    expect(SCREENS).toEqual(expect.arrayContaining(['src/screens/Home.js', 'src/screens/About.js', 'src/screens/Triage.js']));
    // Même garde sur l'énumération des MODULES : si `src/` se renomme, la liste se viderait en silence
    // et tous les tests par fichier passeraient VIDES — une garde verte qui ne garde rien.
    expect(MODULES.length).toBeGreaterThanOrEqual(10);
    expect(MODULES).toEqual(expect.arrayContaining(['src/ui.js', 'src/charts.js', 'src/n1.js', 'src/majeurs.js']));
  });

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
