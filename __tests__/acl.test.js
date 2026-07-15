import { validateData, safeAssign } from '../src/acl';
import { EDITIONS, MANIFEST, STATS } from '../src/data/pestel';

const base = () => ({
  editions: { '2026-07-13': { axes: [{ key: 'P', items: [] }], headline: [], sources: [] } },
  manifest: [{ date: '2026-07-13', label: '13 juillet 2026' }],
  stats: { themes: [], trends: [] },
});

describe('acl.validateData — fail-closed', () => {
  it('accepte un payload conforme', () => {
    expect(validateData(base())).toBe(true);
  });

  it('rejette les payloads malformés (fuzz)', () => {
    const cases = [];
    let b;
    b = base(); b.manifest = [{ date: '2026-07-99', label: 'x' }]; cases.push(b);            // intégrité : manifest[0] absent des editions
    b = base(); b.editions['hack'] = { axes: [], headline: [], sources: [] }; cases.push(b); // clé non-date
    b = base(); delete b.stats.trends; cases.push(b);                                        // stats incomplet
    b = base(); b.manifest = []; cases.push(b);                                              // manifest vide
    b = base(); b.editions['2026-07-13'] = { axes: [{}], headline: [], sources: [] }; cases.push(b); // axe sans items
    b = base(); delete b.editions['2026-07-13'].headline; cases.push(b);                     // édition sans headline
    b = base(); delete b.editions['2026-07-13'].sources; cases.push(b);                      // édition sans sources
    cases.push(null, undefined, 42, [], 'x', {});
    for (const c of cases) expect(validateData(c)).toBe(false);
  });

  // RS_Sec2 (itération 2) : la garantie fail-closed ne tenait pas pour les FEUILLES rendues — un payload
  // conforme en FORME avec un champ objet (title/value…) passait puis levait « Objects are not valid as a
  // React child » en boucle. La validation type désormais les feuilles effectivement rendues.
  it('RS_Sec2 : accepte la donnée EMBARQUÉE réelle (la validation durcie ne SUR-rejette pas)', () => {
    expect(validateData({ editions: EDITIONS, manifest: MANIFEST, stats: STATS })).toBe(true);
  });

  it('RS_Sec2 : rejette un champ-feuille de type OBJET (anti crash de rendu)', () => {
    let b;
    b = base(); b.editions['2026-07-13'].headline = [{ code: 'P1', title: { x: 1 } }]; expect(validateData(b)).toBe(false);
    b = base(); b.editions['2026-07-13'].axes = [{ key: 'P', items: [{ code: 'P1', title: { x: 1 } }] }]; expect(validateData(b)).toBe(false);
    b = base(); b.editions['2026-07-13'].headline = [{ code: 'P1', title: 'ok', text: { y: 2 } }]; expect(validateData(b)).toBe(false);
    b = base(); b.editions['2026-07-13'].headline = [{ code: 5, title: 'ok' }]; expect(validateData(b)).toBe(false);   // code non-string
    b = base(); b.editions['2026-07-13'].sources = [42]; expect(validateData(b)).toBe(false);                          // source non-objet
    b = base(); b.stats.themes = [{ label: 'x', indicators: [{ value: { z: 1 } }] }]; expect(validateData(b)).toBe(false);
    b = base(); b.stats.trends = [{ title: { t: 1 } }]; expect(validateData(b)).toBe(false);
  });

  it('RS_Sec2 : accepte les feuilles SCALAIRES valides (string/number)', () => {
    const b = base();
    b.editions['2026-07-13'].headline = [{ code: 'P1', title: 'Titre', text: 'corps' }];
    b.editions['2026-07-13'].axes = [{ key: 'E', items: [{ code: 'E2', title: 'x' }] }];
    b.editions['2026-07-13'].sources = [{ id: 's1', name: 'A' }];
    b.stats.themes = [{ label: 'Banques', indicators: [{ value: '13,5', label: 'Taux', unit: '%' }] }];
    b.stats.trends = [{ title: 'Croissance', note: 'x' }];
    expect(validateData(b)).toBe(true);
  });

  // RS3.3 (itération 3) : typage EXHAUSTIF des feuilles — toutes les feuilles rendues/déréférencées, pas
  // seulement title/value. Enumération dérivée du schéma réel (source name/type/date, zoom, axis, agenda,
  // trend labels/series/data, indicator.src). Sans quoi un objet à leur place crashe au rendu (DoS distant).
  it('RS3.3 : rejette un OBJET dans n’importe quelle feuille rendue/déréférencée', () => {
    let b;
    b = base(); b.editions['2026-07-13'].sources = [{ id: 1, name: { x: 1 } }]; expect(validateData(b)).toBe(false);          // source.name (primarySource.split)
    b = base(); b.editions['2026-07-13'].sources = [{ id: 1, name: 'A', type: { x: 1 } }]; expect(validateData(b)).toBe(false); // source.type
    b = base(); b.editions['2026-07-13'].axes = [{ key: 'P', name: { x: 1 }, items: [] }]; expect(validateData(b)).toBe(false); // axis.name
    b = base(); b.editions['2026-07-13'].axes = [{ key: 'P', lens: { x: 1 }, items: [] }]; expect(validateData(b)).toBe(false); // axis.lens
    b = base(); b.editions['2026-07-13'].axes = [{ key: 'P', items: [{ code: 'P1', title: 't', analysis: { x: 1 } }] }]; expect(validateData(b)).toBe(false);         // item.analysis
    b = base(); b.editions['2026-07-13'].axes = [{ key: 'P', items: [{ code: 'P1', title: 't', zoom: { context: { x: 1 } } }] }]; expect(validateData(b)).toBe(false); // zoom.context
    b = base(); b.editions['2026-07-13'].axes = [{ key: 'P', items: [{ code: 'P1', title: 't', zoom: { timeline: [{ d: { x: 1 }, e: 'e' }] } }] }]; expect(validateData(b)).toBe(false); // timeline.d
    b = base(); b.editions['2026-07-13'].agenda = [{ when: '5/7', what: { x: 1 } }]; expect(validateData(b)).toBe(false);      // agenda.what
    b = base(); b.stats.trends = [{ title: 't', labels: [{ x: 1 }] }]; expect(validateData(b)).toBe(false);                   // trend.labels
    b = base(); b.stats.trends = [{ title: 't', series: [{ name: 'x', values: 'nope' }] }]; expect(validateData(b)).toBe(false); // series.values non-array
    b = base(); b.stats.trends = [{ title: 't', data: [{ value: 1, label: { x: 1 } }] }]; expect(validateData(b)).toBe(false); // chart datum label
    b = base(); b.stats.themes = [{ label: 'x', indicators: [{ value: '1', src: { n: { x: 1 } } }] }]; expect(validateData(b)).toBe(false); // indicator.src.n
  });

  it('RS3.3 : accepte un contenu riche VALIDE (zoom, agenda, graphes typés)', () => {
    const b = base();
    b.editions['2026-07-13'].axes = [{ key: 'P', name: 'Politique', short: 'Pol', lens: 'analyse', items: [
      { code: 'P1', title: 'Titre', text: 'corps', analysis: 'a', reliability: 'established',
        zoom: { context: 'ctx', outlook: 'out', timeline: [{ d: '5/7', e: 'évén.' }], actors: [{ name: 'X', role: 'r' }] } },
    ] }];
    b.editions['2026-07-13'].sources = [{ id: 1, name: 'Actualité.cd', type: 'presse', date: '2026-07-10', url: 'https://actualite.cd/x' }];
    b.editions['2026-07-13'].agenda = [{ when: '8/7', what: 'Marche', code: 'P1' }];
    b.stats.themes = [{ key: 'bk', label: 'Banques', indicators: [{ value: '13,5', label: 'Taux', unit: '%', note: 'n', src: { n: 'BCC', u: 'https://bcc.cd' } }] }];
    b.stats.trends = [
      { id: 't1', theme: 'bk', type: 'line', title: 'Croissance', labels: ['jan', 'fév'], series: [{ name: 'PIB', values: [1, 2] }] },
      { id: 't2', theme: 'bk', type: 'bar', title: 'Barres', data: [{ label: 'A', value: 3 }] },
    ];
    expect(validateData(b)).toBe(true);
  });

  // RS3.4 (itération 4) : feuilles de CONTENEUR oubliées par le typage exhaustif — champs scalaires propres
  // de l'objet édition (label/date) et de l'objet stats (updated), + feed/triage.axisLabel. Rendus directs.
  it('RS3.4 : rejette un OBJET dans les feuilles conteneur (edition.label/date, stats.updated, axisLabel)', () => {
    let b;
    b = base(); b.editions['2026-07-13'].label = { x: 1 }; expect(validateData(b)).toBe(false);   // {ed.label} en-tête
    b = base(); b.editions['2026-07-13'].date = { x: 1 }; expect(validateData(b)).toBe(false);    // ed.date -> favId
    b = base(); b.stats.updated = { x: 1 }; expect(validateData(b)).toBe(false);                  // {STATS.updated} onglet Données
    b = base(); b.feed = [{ title: 'n', url: 'https://a.cd/x', axisLabel: { x: 1 } }]; expect(validateData(b)).toBe(false);   // {f.axisLabel} Home
    b = base(); b.triage = [{ title: 'n', url: 'https://a.cd/x', axisLabel: { x: 1 } }]; expect(validateData(b)).toBe(false);
  });

  it('RS3.4 : accepte les feuilles conteneur scalaires (label/date/updated/axisLabel string)', () => {
    const b = base();
    b.editions['2026-07-13'].label = '13 juillet 2026';
    b.editions['2026-07-13'].date = '2026-07-13';
    b.stats.updated = '14/07/2026';
    b.feed = [{ title: 'News', url: 'https://a.cd/x', axisLabel: 'Social' }];
    expect(validateData(b)).toBe(true);
  });

  // SEC-01 charts (QA v1.1) — « scalaire » ne suffit pas là où le RENDU appelle une méthode de STRING.
  // ChartCard fait `unit.trim()` : un NOMBRE passait isScalar, puis .trim() levait un TypeError au rendu de
  // l'onglet Données = DoS distant PERSISTANT (le store muté re-crashe à chaque rendu, l'ErrorBoundary ne
  // guérit pas). Même classe que les feuilles .split/.map : on type à la FRONTIÈRE, pas au rendu.
  it('SEC-01 : rejette une `unit` de graphe NON-string (le rendu y appelle .trim())', () => {
    for (const bad of [42, true, {}, [], 3.14]) {
      const d = base();
      d.stats.trends = [{ type: 'bar', title: 'T', unit: bad, data: [{ label: 'a', value: 1 }] }];
      expect(validateData(d)).toBe(false);
    }
  });
  it('SEC-01 : accepte une `unit` string ou absente (la garde ne sur-rejette pas le cas réel)', () => {
    for (const good of ['%', 'M USD', undefined, null]) {
      const d = base();
      d.stats.trends = [{ type: 'bar', title: 'T', unit: good, data: [{ label: 'a', value: 1 }] }];
      expect(validateData(d)).toBe(true);
    }
  });

  it('rejette la pollution de prototype (chemin réel JSON.parse)', () => {
    const evil = JSON.parse(
      '{"editions":{"__proto__":{"axes":[],"headline":[],"sources":[]},"2026-07-13":{"axes":[],"headline":[],"sources":[]}},"manifest":[{"date":"2026-07-13","label":"x"}],"stats":{"themes":[],"trends":[]}}'
    );
    expect(validateData(evil)).toBe(false);
  });
});

describe('acl.safeAssign — anti prototype-pollution', () => {
  it('ne pollue pas Object.prototype et copie les clés sûres', () => {
    const t = {};
    safeAssign(t, JSON.parse('{"__proto__":{"polluted":1},"constructor":9,"ok":2}'));
    expect(({}).polluted).toBeUndefined();
    expect(t.ok).toBe(2);
    expect(t.constructor).toBe(Object); // clé dangereuse écartée
  });
});
