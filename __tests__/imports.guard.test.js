const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// GARDE « identifiant fantôme » (ajoutée après un ReferenceError runtime : HIT utilisé dans Home sans import).
// Cette classe de bug ÉCHAPPE à jest (aucun test de rendu) ET à Metro (le bundler ne vérifie ni les identifiants
// non définis ni la résolution des imports nommés) → seul le runtime plante, écran blanc à l'ouverture.
//
// DEUX contrôles COMPLÉMENTAIRES — ni l'un ni l'autre ne suffit seul :
//
//   A. PORTÉE (scope.globals) — attrape l'IDENTIFIANT UTILISÉ SANS LIAISON : `HIT.sm` sans import de HIT,
//      un jeton passé nu (`colors={HERO_GRAD}`), un composant non importé, une typo. → ReferenceError.
//
//   B. CROISEMENT IMPORT/EXPORT — attrape la LIAISON QUI NE RÉSOUT VERS RIEN : `import { ELEV } from './theme'`
//      alors que theme.js n'exporte plus ELEV. La portée en est STRUCTURELLEMENT aveugle : un ImportSpecifier
//      CRÉE une liaison, donc scope.globals ne le voit JAMAIS — aucune liste blanche n'y change rien.
//      Ce n'est pas théorique (QA v1.2, prouvé par mutation) : renommer `export const ELEV` en theme.js laissait
//      les 133 tests VERTS et Metro bundler, mais au runtime ui.js `export const shadowSm = ELEV.sm` s'évalue à
//      l'IMPORT DU MODULE — avant que React monte — donc l'ErrorBoundary ne peut même pas l'attraper : écran
//      blanc au lancement. Pire variante, silencieuse : `style={JETON_FANTOME}` rend undefined → l'écran
//      s'affiche SANS style, sans le moindre signal. (Babel compile l'import en `_theme.ELEV` = undefined,
//      et non en ReferenceError : voilà pourquoi la portée ne peut rien voir.)
//
// v1.1 — remplaçait une garde regex + listes blanches (FILES, TOKENS) à 3 angles morts prouvés (jeton nu,
//        fichier hors liste, jeton hors liste). v1.2 — ajoute le contrôle B et aligne le balayage sur Metro.
// Il subsiste UNE liste blanche (GLOBALS), mais elle a changé de nature : bornée par le RUNTIME (ensemble
// fermé, quasi statique), non plus par notre produit (qui grossit à chaque écran/jeton — donc pourrissait).
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

// Extensions ALIGNÉES sur Metro (metro-config defaults : sourceExts = js, jsx, json, ts, tsx). Un .jsx est
// bel et bien résolu, transformé et EMBARQUÉ dans l'APK : ne balayer que .js laissait un fichier réellement
// livré totalement hors surveillance (QA v1.2, prouvé par mutation avec un src/screens/Probe.jsx).
const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const pluginsFor = (f) => (f.endsWith('.ts') ? ['typescript']
  : f.endsWith('.tsx') ? ['jsx', 'typescript']
    : ['jsx']);
const parse = (file) =>
  parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: pluginsFor(file) });

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};
// AUCUNE liste de fichiers à tenir à jour : on balaie tout le code applicatif (App.js + src/**).
const ABS = [path.join(ROOT, 'App.js'), ...walk(path.join(ROOT, 'src'))];
const FILES = ABS.map((f) => path.relative(ROOT, f).split(path.sep).join('/'));

// Résout un import RELATIF comme Metro : chemin exact, puis + extension, puis /index.<ext>.
const resoudre = (fromFile, source) => {
  const base = path.resolve(path.dirname(fromFile), source);
  const essais = [base, ...EXTS.map((x) => base + x), ...EXTS.map((x) => path.join(base, 'index' + x))];
  return essais.find((p) => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || null;
};

// Noms exportés par un module : `export const/function/class X`, `export { X }`, `export { X } from`, default.
// `export * from` est un trou de résolution statique → on le signale et on devient PERMISSIF pour ce module
// (mieux vaut ne rien affirmer que d'affirmer faux). Aucun module du dépôt n'en utilise aujourd'hui.
const exportsDe = (file) => {
  const ast = parse(file);
  const noms = new Set();
  let etoile = false;
  for (const n of ast.program.body) {
    if (n.type === 'ExportDefaultDeclaration') noms.add('default');
    else if (n.type === 'ExportAllDeclaration') etoile = true;
    else if (n.type === 'ExportNamedDeclaration') {
      if (n.declaration) {
        const d = n.declaration;
        if (d.type === 'VariableDeclaration') d.declarations.forEach((v) => v.id.name && noms.add(v.id.name));
        else if (d.id && d.id.name) noms.add(d.id.name);           // function / class
      }
      n.specifiers.forEach((s) => s.exported && s.exported.name && noms.add(s.exported.name));
    }
  }
  return { noms, etoile };
};

describe('imports.guard — aucun identifiant fantôme (portée + croisement import/export)', () => {
  it('balaie bien tout le code applicatif (garde de la garde)', () => {
    // Si le balayage se vide (renommage de dossier, refactor), les tests par fichier passeraient tous
    // VIDES et la garde mentirait. On ancre donc le périmètre sur des fichiers dont l'absence est un signal.
    expect(FILES.length).toBeGreaterThanOrEqual(20);
    expect(FILES).toEqual(expect.arrayContaining(['App.js', 'src/theme.js', 'src/screens/Home.js']));
  });

  // ---- A. PORTÉE : tout identifiant référencé doit être lié ----
  for (let i = 0; i < ABS.length; i++) {
    it(`${FILES[i]} : [portée] tout identifiant référencé est lié`, () => {
      let libres = [];
      traverse(parse(ABS[i]), {
        Program(p) { libres = Object.keys(p.scope.globals).filter((g) => !GLOBALS.has(g)).sort(); },
      });
      // Un nom ici = import oublié (le bug HIT), typo, ou globale runtime à déclarer dans GLOBALS.
      expect(libres).toEqual([]);
    });
  }

  // ---- B. CROISEMENT : tout import nommé RELATIF doit résoudre vers un export réel ----
  for (let i = 0; i < ABS.length; i++) {
    it(`${FILES[i]} : [import/export] chaque import relatif résout vers un export réel`, () => {
      const fautes = [];
      for (const n of parse(ABS[i]).program.body) {
        if (n.type !== 'ImportDeclaration') continue;
        const src = n.source.value;
        if (src[0] !== '.') continue;                       // paquets npm : hors périmètre (pas notre code)
        const cible = resoudre(ABS[i], src);
        if (!cible) { fautes.push(`${src} → module introuvable`); continue; }
        if (cible.endsWith('.json') || /\.(png|jpe?g|svg)$/.test(cible)) continue;
        const { noms, etoile } = exportsDe(cible);
        if (etoile) continue;                               // `export * from` : résolution statique impossible
        for (const s of n.specifiers) {
          if (s.type === 'ImportSpecifier' && !noms.has(s.imported.name)) {
            fautes.push(`{ ${s.imported.name} } absent de ${src}`);
          } else if (s.type === 'ImportDefaultSpecifier' && !noms.has('default')) {
            fautes.push(`export default absent de ${src}`);
          }
          // ImportNamespaceSpecifier (`import * as X`) : rien à vérifier.
        }
      }
      // Un nom ici = un import qui vaudra `undefined` au runtime (Babel compile en `_module.NOM`), donc
      // soit un écran sans style SANS AUCUN SIGNAL, soit un TypeError à l'évaluation du module = écran blanc
      // que l'ErrorBoundary ne peut pas attraper (elle n'est pas encore montée).
      expect(fautes).toEqual([]);
    });
  }
});
