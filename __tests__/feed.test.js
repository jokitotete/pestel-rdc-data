import { validateData } from '../src/acl';
import { applyRemote, getFeed, getTriage } from '../src/store';

// Payload minimal valide ; `extra` permet d'injecter un feed.
const base = (extra = {}) => ({
  editions: { '2026-07-13': { axes: [{ key: 'P', items: [] }], headline: [], sources: [] } },
  manifest: [{ date: '2026-07-13', label: '13 juillet 2026' }],
  stats: { themes: [], trends: [] },
  ...extra,
});

describe('feed « À traiter » — ACL (clé optionnelle, fail-closed)', () => {
  it('accepte un payload SANS feed (rétrocompatibilité)', () => {
    expect(validateData(base())).toBe(true);
  });
  it('accepte un feed = tableau d’objets', () => {
    expect(validateData(base({ feed: [{ title: 'x', url: 'https://a.cd/x', axis: 'S' }] }))).toBe(true);
    expect(validateData(base({ feed: [] }))).toBe(true);
  });
  it('rejette un feed mal formé (non-tableau ou items non-objets)', () => {
    for (const bad of ['x', 42, {}, [42], ['str'], [null]]) {
      expect(validateData(base({ feed: bad }))).toBe(false);
    }
  });
});

describe('feed « À traiter » — applyRemote peuple getFeed()', () => {
  it('applique un feed valide', () => {
    applyRemote(base({ feed: [{ title: 'Police 63 500 dossiers', url: 'https://actualite.cd/x', axis: 'S', axisLabel: 'Social' }] }));
    expect(getFeed().length).toBe(1);
    expect(getFeed()[0].title).toContain('63 500');
  });
  it('clé feed ABSENTE → fil conservé ; feed: [] → fil vidé', () => {
    applyRemote(base({ feed: [{ title: 'x', url: 'https://a.cd/x' }] }));
    applyRemote(base());                 // pas de clé feed → l'embarqué est conservé
    expect(getFeed().length).toBe(1);
    applyRemote(base({ feed: [] }));      // clé présente vide → vidé
    expect(getFeed().length).toBe(0);
  });
});

describe('triage « À trier » — ACL + applyRemote (captées non classées)', () => {
  it('accepte/rejette la clé triage comme feed', () => {
    expect(validateData(base({ triage: [{ title: 'x', url: 'https://a.cd/x' }] }))).toBe(true);
    expect(validateData(base({ triage: [] }))).toBe(true);
    for (const bad of ['x', 42, [1], ['s']]) expect(validateData(base({ triage: bad }))).toBe(false);
  });
  it('applyRemote : clé triage absente → conservé ; triage: [] → vidé', () => {
    applyRemote(base({ triage: [{ title: 'Antennes wifi Mai-Ndombe', url: 'https://acp.cd/x' }] }));
    expect(getTriage().length).toBe(1);
    applyRemote(base());                  // clé absente → conservé
    expect(getTriage().length).toBe(1);
    applyRemote(base({ triage: [] }));     // clé présente vide → vidé
    expect(getTriage().length).toBe(0);
  });
});
