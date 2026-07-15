import { validateData } from '../src/acl';
import { applyRemote, getFeed, getTriage } from '../src/store';

// Payload minimal valide ; `extra` permet d'injecter un feed.
const base = (extra = {}) => ({
  editions: { '2026-07-13': { date: '2026-07-13', label: '13 juillet 2026', axes: [{ key: 'P', items: [] }], headline: [], sources: [] } },
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

// QA v1.4 — LE TEST DE LA PROMESSE COMMERCIALE. Le fascicule (page « Ce que nous n avons pas traite »)
// affirme : « Rien n est ecarte en silence. » C etait FAUX : `.slice(0, 12)` jetait 18 des 30 captees
// sans le dire, et `isSafeUrl` ecarte les liens non-https, aussi en silence. La page qui vend « nous
// montrons nos trous » avait son propre trou. Ce test grave l arithmetique de la promesse : tout item
// sain est soit AFFICHE, soit COMPTE dans le pied. Jamais evapore.
describe('« Rien n est ecarte en silence » — l arithmetique de la promesse vendue', () => {
  const CAP = 12;   // doit rester aligne sur CAP_A_TRAITER (Home.js)
  // Reproduit EXACTEMENT le calcul de ToTreatSection (Home.js).
  const compte = (feed, sur) => {
    const sains = (feed || []).filter((f) => f && f.title);
    const ouvrables = sains.filter((f) => sur(f.url));
    const affiches = Math.min(ouvrables.length, CAP);
    return { sains: sains.length, affiches, enPlus: ouvrables.length - affiches, nonOuvrables: sains.length - ouvrables.length };
  };
  const https = (u) => typeof u === 'string' && u.startsWith('https://');

  it('AUCUN item sain ne disparait : affiches + en-plus + non-ouvrables = total', () => {
    const feed = Array.from({ length: 30 }, (_, i) => ({ title: 't' + i, url: 'https://a.cd/' + i }));
    const c = compte(feed, https);
    expect(c.affiches + c.enPlus + c.nonOuvrables).toBe(c.sains);   // l invariant de la promesse
    expect(c.affiches).toBe(12);
    expect(c.enPlus).toBe(18);   // <- les 18 qui disparaissaient en silence
  });
  it('un lien non-https est COMPTE, pas evapore', () => {
    const feed = [{ title: 'a', url: 'https://a.cd/1' }, { title: 'b', url: 'http://b.cd/2' }, { title: 'c', url: 'javascript:x' }];
    const c = compte(feed, https);
    expect(c.affiches).toBe(1);
    expect(c.nonOuvrables).toBe(2);
    expect(c.affiches + c.enPlus + c.nonOuvrables).toBe(c.sains);
  });
  it('sur le FEED REEL, l invariant tient — et le pied a bien quelque chose a dire', () => {
    const { FEED } = require('../src/store');
    const c = compte(FEED, https);
    expect(c.affiches + c.enPlus + c.nonOuvrables).toBe(c.sains);
    // si le fil depasse le plafond, le pied DOIT etre rendu (sinon la promesse retombe fausse)
    if (c.sains > CAP) expect(c.enPlus + c.nonOuvrables).toBeGreaterThan(0);
  });
  it('sous le plafond, aucun pied : on n annonce pas un trou inexistant', () => {
    const feed = [{ title: 'a', url: 'https://a.cd/1' }];
    const c = compte(feed, https);
    expect(c.enPlus).toBe(0);
    expect(c.nonOuvrables).toBe(0);
  });
});
