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

// LOT-F — L'ACL type aussi les champs N1 du fil (confiance, meilleur candidat, cote de source), parce
// que la carte N1 les REND. Frontiere de confiance : on ne delegue pas la validation au consommateur.
describe('feed N1 — ACL des champs de l etage N1 (fail-closed)', () => {
  const item = (extra) => ({ title: 't', url: 'https://a.cd/x', axis: 'E', ...extra });
  it('accepte les champs N1 bien formes (scalaires + runnerUp chaine ou objet)', () => {
    expect(validateData(base({ feed: [item({ confidence: 0.42, sourceGrade: 'B', statut: 'classe' })] }))).toBe(true);
    expect(validateData(base({ feed: [item({ runnerUp: 'S' })] }))).toBe(true);
    expect(validateData(base({ feed: [item({ runnerUp: { axis: 'S', axisLabel: 'Social' } })] }))).toBe(true);
    expect(validateData(base({ feed: [item({ runnerUp: null })] }))).toBe(true);
  });
  it('rejette un OBJET la ou un scalaire est rendu (crash « Objects are not valid as a React child »)', () => {
    expect(validateData(base({ feed: [item({ confidence: {} })] }))).toBe(false);
    expect(validateData(base({ feed: [item({ sourceGrade: ['B'] })] }))).toBe(false);
    expect(validateData(base({ feed: [item({ statut: {} })] }))).toBe(false);
    expect(validateData(base({ feed: [item({ runnerUp: ['S'] })] }))).toBe(false);
    expect(validateData(base({ feed: [item({ runnerUp: { axis: {} } })] }))).toBe(false);
  });
  it('meme contrat pour triage (une captee non classee reste un item N1)', () => {
    expect(validateData(base({ triage: [{ title: 't', confidence: 0.05 }] }))).toBe(true);
    expect(validateData(base({ triage: [{ title: 't', confidence: {} }] }))).toBe(false);
  });
});

// QA v1.4 — LE TEST DE LA PROMESSE COMMERCIALE (« Rien n est ecarte en silence ») a ete DEPLACE, pas
// supprime : il vit desormais dans __tests__/n1.test.js, ou il s exerce sur n1.partitionnerN1 — LA
// fonction que l ecran appelle vraiment. Ici, il RECOPIAIT le calcul de Home.js (avec le commentaire
// « doit rester aligne sur CAP_A_TRAITER ») : un test qui recopie le code qu il teste reste vert le
// jour ou l ecran derive. Toutes ses assertions sont conservees, plus le cas « item sans titre ».
