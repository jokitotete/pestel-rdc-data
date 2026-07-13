import { validateData, safeAssign } from '../src/acl';

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
