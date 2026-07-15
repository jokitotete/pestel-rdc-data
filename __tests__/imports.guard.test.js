const fs = require('fs');
const path = require('path');

// GARDE « import manquant » (ajoutée après un ReferenceError runtime : HIT utilisé dans Home sans import).
// Cette classe de bug (identifiant de jeton utilisé mais non importé du thème) ÉCHAPPE à jest (pas de rendu)
// ET à Metro (aucune vérif d'identifiant non défini au bundle) → seul le runtime plante. On la verrouille ici :
// pour chaque écran, tout jeton de thème RÉFÉRENCÉ (TOKEN. / TOKEN[ / TOKEN() ) doit figurer dans l'import theme.
const ROOT = path.join(__dirname, '..');
const FILES = ['App.js', 'src/ui.js', 'src/charts.js',
  ...['Home', 'Axes', 'Detail', 'Map', 'Stats', 'Search', 'Favoris', 'Triage', 'Welcome'].map((s) => `src/screens/${s}.js`)];
const TOKENS = ['SP', 'TYPE', 'RADIUS', 'HIT', 'DUR', 'EASE', 'ELEV', 'MAP_RAMP', 'MAP_CATS', 'STATE', 'SPLASH', 'SPLASH_TYPE',
  'AX', 'AXT', 'AX_SHORT', 'AX_ORDER', 'RUBRIQUES', 'REL', 'RELT', 'HERO_GRAD', 'TOUCH', 'mapLevel', 'pick', 'tint', 'C', 'F'];

describe('imports.guard — aucun jeton de thème utilisé sans import', () => {
  for (const rel of FILES) {
    it(`${rel} : tout jeton de thème référencé est importé`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const impMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*theme['"]/);
      const imported = new Set((impMatch ? impMatch[1] : '').split(',').map((x) => x.trim()));
      const body = src.replace(impMatch ? impMatch[0] : '', '');
      const missing = [];
      for (const t of TOKENS) {
        const re = new RegExp('[^A-Za-z0-9_.$]' + t + '(\\.|\\[|\\()');
        if (re.test(body) && !imported.has(t)) missing.push(t);
      }
      expect(missing).toEqual([]);
    });
  }
});
