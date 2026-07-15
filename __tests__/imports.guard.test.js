const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// GARDE « identifiant non défini » (ajoutée après un ReferenceError runtime : HIT utilisé dans Home sans import).
// Cette classe de bug ÉCHAPPE à jest (aucun test de rendu) ET à Metro (le bundler ne vérifie pas les identifiants
// non définis) → seul le runtime plante, écran blanc à l'ouverture. On la verrouille par une VRAIE ANALYSE DE
// PORTÉE (Babel construit la table des liaisons ; `scope.globals` = identifiants RÉFÉRENCÉS SANS LIAISON).
//
// v1.1 — remplace la garde regex+listes blanches, qui avait 3 angles morts prouvés :
//   1. `TOKEN.` / `TOKEN[` / `TOKEN(` ne voit PAS un jeton passé NU (`colors={HERO_GRAD}`) ;
//   2. la liste FILES ignorait tout écran nouvellement créé ;
//   3. la liste TOKENS ignorait tout jeton nouvellement ajouté au thème.
// La portée les couvre toutes les trois — et attrape aussi les composants/utilitaires non importés, les typos.
// Il subsiste UNE liste blanche, mais elle a changé de nature : elle est bornée par le RUNTIME (ensemble fermé,
// quasi statique), non plus par notre produit (qui grossit à chaque écran/jeton — donc pourrissait en silence).
const ROOT = path.join(__dirname, '..');

// Globales runtime légitimes : standard JS (ECMA) + Hermes/Metro/RN (`global`, `require`, `__DEV__`, timers).
const GLOBALS = new Set([
  // ECMAScript
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Math', 'JSON', 'Date', 'RegExp', 'Error', 'Function',
  'Symbol', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Promise', 'Proxy', 'Reflect', 'BigInt', 'Intl',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'NaN', 'Infinity', 'globalThis',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  // Runtime hôte (RN / Hermes / Metro / WHATWG)
  'console', 'require', 'module', 'exports', 'process', 'global', '__DEV__',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'AbortController', 'URL', 'URLSearchParams', 'TextDecoder', 'TextEncoder', 'navigator',
]);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
};
// AUCUNE liste de fichiers à tenir à jour : on balaie tout le code applicatif (App.js + src/**).
const FILES = [path.join(ROOT, 'App.js'), ...walk(path.join(ROOT, 'src'))]
  .map((f) => path.relative(ROOT, f).split(path.sep).join('/'));

describe('imports.guard — aucun identifiant référencé sans liaison (no-undef par analyse de portée)', () => {
  it('balaie bien tout le code applicatif (garde de la garde)', () => {
    // Si le balayage se vide (renommage de dossier, refactor), les tests par fichier passeraient tous
    // VIDES et la garde mentirait. On ancre donc le périmètre sur des fichiers dont l'absence est un signal.
    expect(FILES.length).toBeGreaterThanOrEqual(20);
    expect(FILES).toEqual(expect.arrayContaining(['App.js', 'src/theme.js', 'src/screens/Home.js']));
  });

  for (const rel of FILES) {
    it(`${rel} : tout identifiant référencé est lié (import, déclaration ou globale connue)`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
      let unbound = [];
      traverse(ast, {
        Program(p) {
          unbound = Object.keys(p.scope.globals).filter((g) => !GLOBALS.has(g)).sort();
        },
      });
      // Un nom ici = soit un import oublié (le bug HIT), soit une typo, soit une globale à déclarer ci-dessus.
      expect(unbound).toEqual([]);
    });
  }
});
