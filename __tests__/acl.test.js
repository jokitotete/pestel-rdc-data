import { validateData, safeAssign } from '../src/acl';
import { EDITIONS, MANIFEST, STATS } from '../src/data/pestel';

const base = () => ({
  editions: { '2026-07-13': { axes: [{ items: [] }], headline: [], sources: [] } },
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
    b = base(); b.editions['2026-07-13'].axes = [{ items: [{ code: 'P1', title: { x: 1 } }] }]; expect(validateData(b)).toBe(false);
    b = base(); b.editions['2026-07-13'].headline = [{ code: 'P1', title: 'ok', text: { y: 2 } }]; expect(validateData(b)).toBe(false);
    b = base(); b.editions['2026-07-13'].headline = [{ code: 5, title: 'ok' }]; expect(validateData(b)).toBe(false);   // code non-string
    b = base(); b.editions['2026-07-13'].sources = [42]; expect(validateData(b)).toBe(false);                          // source non-objet
    b = base(); b.stats.themes = [{ label: 'x', indicators: [{ value: { z: 1 } }] }]; expect(validateData(b)).toBe(false);
    b = base(); b.stats.trends = [{ title: { t: 1 } }]; expect(validateData(b)).toBe(false);
  });

  it('RS_Sec2 : accepte les feuilles SCALAIRES valides (string/number)', () => {
    const b = base();
    b.editions['2026-07-13'].headline = [{ code: 'P1', title: 'Titre', text: 'corps' }];
    b.editions['2026-07-13'].axes = [{ items: [{ code: 'E2', title: 'x' }] }];
    b.editions['2026-07-13'].sources = [{ id: 's1', name: 'A' }];
    b.stats.themes = [{ label: 'Banques', indicators: [{ value: '13,5', label: 'Taux', unit: '%' }] }];
    b.stats.trends = [{ title: 'Croissance', note: 'x' }];
    expect(validateData(b)).toBe(true);
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
