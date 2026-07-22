jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import Home from '../src/screens/Home';
import Axes from '../src/screens/Axes';
import Favoris from '../src/screens/Favoris';
import Search from '../src/screens/Search';
import About from '../src/screens/About';
import Detail from '../src/screens/Detail';
import { DiversList } from '../src/screens/Triage';
import { applyTheme } from '../src/theme';
import { getEdition, latestDate, allItems } from '../src/store';

// ═══════════════════════════════════════════════════════════════════════════════
// LOT-G — SORTIE DE LA FILE « À TRAITER » DES ÉCRANS, ET PORTE PRT_SINCE
// ═══════════════════════════════════════════════════════════════════════════════
// La file « À traiter » est une COULISSE de production. Elle décrivait une INTENTION de la rédaction
// (« on va s'en occuper »), pas un état vérifiable de l'information — et elle n'a jamais eu sa place
// devant un lecteur.
//
// ELLE NE PEUT ÊTRE RETIRÉE QU'À UNE CONDITION, ET CE FICHIER LA VÉRIFIE EN PREMIER : que l'étage N1
// soit désormais PUBLIÉ (LOT-F). Retirer le mot sans publier l'information, ce ne serait pas de la
// sincérité, ce serait une dissimulation — la même quantité d'information en moins, avec un vocabulaire
// plus propre. Le premier bloc de tests est donc une PORTE : si « Captées » cessait de rendre les items
// du fil, tout ce lot deviendrait illégitime et cette batterie échouerait AVANT de vérifier quoi que ce
// soit d'autre.
//
// DEUX MESURES COMPLÉMENTAIRES, ET AUCUNE NE SUFFIT SEULE :
//   A. LE RENDU RÉEL (react-test-renderer) — ce que le lecteur LIT, écran par écran, état par état,
//      en thème clair ET sombre. C'est la seule mesure qui porte sur le produit et non sur le code.
//   B. LE BALAYAGE DES LITTÉRAUX (AST) — ce que le code POURRAIT afficher dans une branche que le
//      test de rendu n'a pas atteinte (une alerte, un état d'erreur, un écran non monté ici). Le
//      rendu est aveugle à ces branches ; le balayage les voit toutes.
// ═══════════════════════════════════════════════════════════════════════════════

const rendre = (el) => {
  let t;
  act(() => { t = renderer.create(el); });
  const json = t.toJSON();
  const texte = [];
  const marcher = (n) => {
    if (n == null) return;
    if (typeof n === 'string') { texte.push(n); return; }
    if (Array.isArray(n)) { n.forEach(marcher); return; }
    marcher(n.children);
  };
  marcher(json);
  // Les libellés d'ACCESSIBILITÉ sont lus À VOIX HAUTE : ils sont du texte affiché, au même titre que le
  // reste. Une promesse cachée dans un accessibilityLabel serait une promesse faite aux seuls lecteurs
  // d'écran — c'est-à-dire la pire des deux.
  const a11y = [];
  const marcherA11y = (n) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(marcherA11y); return; }
    if (n.props) {
      if (typeof n.props.accessibilityLabel === 'string') a11y.push(n.props.accessibilityLabel);
      if (typeof n.props.accessibilityHint === 'string') a11y.push(n.props.accessibilityHint);
      if (typeof n.props.placeholder === 'string') a11y.push(n.props.placeholder);
    }
    marcherA11y(n.children);
  };
  marcherA11y(json);
  act(() => t.unmount());
  return { json, textes: texte.join(' | '), a11y: a11y.join(' | '), tout: texte.concat(a11y).join(' | ') };
};

const ed = getEdition(latestDate());
const feed = [
  { title: 'Kinshasa · dépêche captée du fil', url: 'https://acp.cd/f1', source: 'ACP', axis: 'E', confidence: 0.42 },
  { title: 'Lubumbashi · seconde captée', url: 'https://acp.cd/f2', source: 'ACP', axis: 'P' },
];
const triage = [{ title: 'Captée non classée', url: 'https://acp.cd/t1', source: 'Radio Okapi' }];
const semer = (filtre) => ({ seed: { filter: filtre, n: Math.random() }, onSeedApplied: () => {} });

afterEach(() => applyTheme('light'));

// ─────────────────────────────────────────────────────────────────────────────
// PORTE — la condition SANS LAQUELLE ce lot n'a pas le droit d'exister
// ─────────────────────────────────────────────────────────────────────────────
describe('LOT-G · PORTE — on ne retire le mot QUE parce que l’information est publiée (LOT-F)', () => {
  it('l’étage N1 est bien AFFICHÉ : la section existe, les items du fil sont rendus, l’étage est nommé', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} />);
    expect(r.textes).toContain('Captées');                       // la section existe
    expect(r.textes).toContain('Kinshasa · dépêche captée du fil'); // le CONTENU du fil est rendu
    expect(r.textes).toContain('CAPTÉE · NON RÉDIGÉE');          // et son étage est DIT au lecteur
  });

  it('les captées NON CLASSÉES restent joignables (soupape « Divers » du lot-H)', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} />);
    expect(r.textes).toContain('Divers · 1');
  });

  it('sans cette publication, retirer le vocabulaire serait CACHER : la porte le dit explicitement', () => {
    // Formulation exécutable de l'argument : un fil non vide DOIT produire du contenu à l'écran.
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={feed} triage={[]} />);
    const rendus = feed.filter((f) => r.textes.includes(f.title)).length;
    expect(rendus).toBe(feed.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A. MESURE SUR LE RENDU RÉEL
// ─────────────────────────────────────────────────────────────────────────────
// Vocabulaire de FILE DE PRODUCTION : il décrit l'organisation interne d'un atelier, jamais l'état d'une
// information. NB : le mot nu « triage » n'est PAS banni ici — c'est la clé d'un GLYPHE (src/icons.js,
// `<Icon name="triage" />`), jamais un texte lu par qui que ce soit. Bannir la clé aurait donné une garde
// verte pour une mauvaise raison ; on bannit ce que le lecteur LIT.
const FILE_DE_PRODUCTION = [
  /à\s+trait(er|ement)/i,
  /à\s+trier/i,
  /file\s+d[’'`]attente/i,
  /en\s+attente\s+de\s+traitement/i,
  /en\s+cours\s+de\s+traitement/i,
  /back[- ]?office/i,
];

// PROMESSES : tout ce qui engage un AVENIR que l'application ne peut pas tenir, ou un travail humain qui
// n'a pas lieu. La porte PRT_SINCE, littéralement.
const PROMESSES = [
  /prochaines?\s+veilles?/i,
  /prochainement/i,
  /bientôt/i,
  /sera\s+(traité|couvert|complété|enrichi|analysé)/i,
  /seront\s+(traités|couverts|complétés|enrichis|analysés)/i,
  /nos?\s+(analystes|équipes?|rédacteurs?)/i,
  /notre\s+équipe/i,
  /nous\s+(traiterons|analyserons|compléterons)/i,
];

// Tous les états d'écran que l'application sait produire, nommés. Un écran non listé ici n'est pas mesuré :
// la liste est donc elle-même une déclaration de PÉRIMÈTRE, et le test qui suit la contrôle.
const ECRANS = () => {
  const items = allItems(ed);
  const code = items.length ? items[0].code : null;
  const fav = items.length ? [{
    id: ed.date + ':' + items[0].code, edDate: ed.date, code: items[0].code, axis: items[0].axis,
    axisName: items[0].axisName, title: items[0].title, text: items[0].text,
    reliability: items[0].reliability, source: { name: 'ACP', host: 'acp.cd' },
  }] : [];
  return [
    ['Home · Tous', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} />],
    ['Home · axe PESTEL', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'axis', key: 'E' })} />],
    ['Home · axe SANS captée', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'axis', key: 'Env' })} />],
    ['Home · rubrique Culture', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'axis', key: 'C' })} />],
    ['Home · rubrique Sports', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'axis', key: 'Sp' })} />],
    ['Home · rubrique Events', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'axis', key: 'Ev' })} />],
    ['Home · secteur', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'sector', key: 'mines' })} />],
    ['Home · Divers', <Home ed={ed} onOpen={() => {}} feed={feed} triage={triage} {...semer({ type: 'divers' })} />],
    ['Home · fil VIDE', <Home ed={ed} onOpen={() => {}} feed={[]} triage={[]} />],
    ['Axes · Tous', <Axes ed={ed} onOpen={() => {}} triage={triage} />],
    ['Axes · rubrique Culture', <Axes ed={ed} onOpen={() => {}} triage={triage} {...semer({ type: 'axis', key: 'C' })} />],
    ['Axes · Events', <Axes ed={ed} onOpen={() => {}} triage={triage} onOpenEvent={() => {}} {...semer({ type: 'axis', key: 'Ev' })} />],
    ['Axes · Divers', <Axes ed={ed} onOpen={() => {}} triage={triage} {...semer({ type: 'divers' })} />],
    ['Favoris · vide', <Favoris favs={[]} onOpen={() => {}} />],
    ['Favoris · peuplé', <Favoris favs={fav} onOpen={() => {}} onToggleFav={() => {}} />],
    ['Recherche', <Search onOpen={() => {}} />],
    ['À propos', <About />],
    ['Divers · soupape', <DiversList items={triage} />],
    ['Divers · vide', <DiversList items={[]} />],
    ...(code ? [['Dossier', <Detail ed={ed} code={code} onOpen={() => {}} />]] : []),
    ['Dossier introuvable', <Detail ed={ed} code="CODE_QUI_N_EXISTE_PAS" onOpen={() => {}} />],
  ];
};

describe('LOT-G · A — le RENDU ne porte plus aucun vocabulaire de file de production', () => {
  it('la batterie couvre bien tous les écrans de l’application (garde de la garde)', () => {
    const noms = ECRANS().map(([n]) => n);
    expect(noms.length).toBeGreaterThanOrEqual(20);
    for (const attendu of ['Home · Tous', 'Axes · Tous', 'Favoris · vide', 'Recherche', 'À propos', 'Dossier']) {
      expect(noms).toContain(attendu);
    }
  });

  for (const mode of ['light', 'dark']) {
    for (const [nom] of ECRANS()) {
      it(`${nom} [${mode}] : aucun mot de coulisse, aucune promesse non tenue`, () => {
        applyTheme(mode);
        const el = ECRANS().find(([n]) => n === nom)[1];
        const r = rendre(el);
        for (const re of FILE_DE_PRODUCTION) expect(r.tout).not.toMatch(re);
        for (const re of PROMESSES) expect(r.tout).not.toMatch(re);
      });
    }
  }
});

describe('LOT-G · A — les phrases de remplacement disent le MÉCANISME, pas l’avenir', () => {
  it('rubrique vide : on décrit ce que l’application fait, sans engager la veille de demain', () => {
    const r = rendre(<Home ed={ed} onOpen={() => {}} feed={[]} triage={[]} {...semer({ type: 'axis', key: 'C' })} />);
    // L'édition embarquée PEUT contenir des faits « Culture & Arts » : on ne teste la phrase que dans
    // l'état où elle s'affiche réellement (rubrique vide), sinon le test mesurerait la donnée du jour.
    if (r.textes.includes('Aucun item')) {
      expect(r.textes).toContain('ne paraît que les jours où la veille en rapporte');
    }
  });

  it('« Axes » affiche EXACTEMENT la même phrase que « À la une » (un seul exemplaire, cf. F2)', () => {
    const { NOTE_RUBRIQUE_VIDE, NOTE_EVENTS_VIDE } = require('../src/copie');
    const srcHome = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Home.js'), 'utf8');
    const srcAxes = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Axes.js'), 'utf8');
    // Les deux écrans IMPORTENT la phrase ; aucun ne la recopie.
    for (const src of [srcHome, srcAxes]) {
      expect(src).toMatch(/from '\.\.\/copie'/);
      expect(src).not.toContain('ne paraît que les jours');
      expect(src).not.toContain('Aucun rendez-vous daté');
    }
    expect(NOTE_RUBRIQUE_VIDE).toContain('ne paraît que les jours où la veille en rapporte');
    expect(NOTE_EVENTS_VIDE).toContain('agendas des éditions déjà publiées');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. BALAYAGE DES LITTÉRAUX — les branches que le rendu n'atteint pas
// ─────────────────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};
// `src/data/**` est GÉNÉRÉ depuis le portail (build_data.js) : c'est de la DONNÉE éditoriale, pas de la
// copie d'interface. Un titre d'article a le droit de contenir n'importe quel mot de la langue ; ce n'est
// pas l'application qui promet quoi que ce soit en le citant. L'exclusion est DÉCLARÉE, et comptée.
const EXCLUS = (f) => f.split(path.sep).join('/').includes('/src/data/');
const FICHIERS = [path.join(ROOT, 'App.js'), ...walk(path.join(ROOT, 'src'))].filter((f) => !EXCLUS(f));

/** Tous les littéraux de texte d'un module : chaînes, morceaux de gabarits, texte JSX. Jamais un commentaire. */
const litterauxDe = (file) => {
  const ast = parser.parse(fs.readFileSync(file, 'utf8'), {
    sourceType: 'module',
    plugins: file.endsWith('.tsx') ? ['jsx', 'typescript'] : file.endsWith('.ts') ? ['typescript'] : ['jsx'],
  });
  const out = [];
  traverse(ast, {
    StringLiteral(p) { out.push(p.node.value); },
    TemplateElement(p) { out.push(p.node.value.cooked || p.node.value.raw || ''); },
    JSXText(p) { out.push(p.node.value); },
  });
  return out;
};

describe('LOT-G · B — aucune branche NON RENDUE ne conserve le vocabulaire retiré', () => {
  it('le balayage porte bien sur le code applicatif (garde de la garde)', () => {
    expect(FICHIERS.length).toBeGreaterThanOrEqual(20);
    const rel = FICHIERS.map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
    expect(rel).toEqual(expect.arrayContaining(['App.js', 'src/screens/Home.js', 'src/screens/Axes.js']));
    expect(rel.some((f) => f.startsWith('src/data/'))).toBe(false);   // l'exclusion est effective ET visible
  });

  for (const f of FICHIERS) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    it(`${rel} : aucun littéral de coulisse ni de promesse`, () => {
      const fautes = [];
      for (const s of litterauxDe(f)) {
        for (const re of FILE_DE_PRODUCTION) if (re.test(s)) fautes.push(`[coulisse ${re}] ${s.trim().slice(0, 80)}`);
        for (const re of PROMESSES) if (re.test(s)) fautes.push(`[promesse ${re}] ${s.trim().slice(0, 80)}`);
      }
      expect(fautes).toEqual([]);
    });
  }

  // Preuve par MUTATION que le balayage n'est pas décoratif : on lui soumet un module fabriqué qui
  // contient exactement ce qu'il doit refuser, et on vérifie qu'il le refuse. Sans cela, une expression
  // régulière fausse (ou un traverse muet) laisserait la garde verte à perpétuité.
  it('le balayage ATTRAPE ce qu’il prétend attraper (preuve par mutation)', () => {
    const tmp = path.join(ROOT, 'src', '__mutation_lotG.js');
    fs.writeFileSync(tmp, [
      'export const A = "12 dépêches à traiter";',
      'export const B = `Rubrique couverte à partir des prochaines veilles.`;',
      'export const C = () => <Text>Sera traité par nos analystes</Text>;',
    ].join('\n'), 'utf8');
    try {
      const trouves = [];
      for (const s of litterauxDe(tmp)) {
        for (const re of [...FILE_DE_PRODUCTION, ...PROMESSES]) if (re.test(s)) trouves.push(re.source);
      }
      expect(trouves.length).toBeGreaterThanOrEqual(3);
      expect(trouves.join(' ')).toContain('trait');
      expect(trouves.join(' ')).toContain('veilles');
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
