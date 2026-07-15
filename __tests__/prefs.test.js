jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSector, saveSector, sanitizeFavs, MAX_FAVS, loadPrefs, savePrefs, loadFollows, saveFollows, loadRecent, pushRecent } from '../src/prefs';

describe('prefs — persistance du secteur (Lentille)', () => {
  it('save puis load restaure le secteur choisi', async () => {
    await saveSector('banques');
    expect(await loadSector()).toBe('banques');
  });
  it('saveSector(null) efface le secteur (retour au national)', async () => {
    await saveSector('mines');
    expect(await loadSector()).toBe('mines');
    await saveSector(null);
    expect(await loadSector()).toBeNull();
  });
});

// RS_Sec (campagne 2026-07-14) : la frontière de STOCKAGE est une frontière de confiance. Le blob favoris
// relu d'AsyncStorage (adb / terminal compromis / malware) peut être corrompu ou hostile → assaini
// élément par élément (fail-closed), URL source gardée seulement si https sûre, dédup, PLAFOND.
describe('prefs.sanitizeFavs — frontière de stockage (fail-closed)', () => {
  const ok = (over = {}) => ({ id: 'a', edDate: '2026-07-14', code: 'P1', axis: 'P', axisName: 'Politique', title: 't', text: 'x', ...over });

  it('renvoie [] sur les entrées non-array / non-objets', () => {
    for (const v of [null, undefined, 42, 'x', {}]) expect(sanitizeFavs(v)).toEqual([]);
  });

  it('JETTE les éléments sans id/code/edDate string (fail-closed, pas de crash)', () => {
    const dirty = [ok(), { id: 1, code: 'P1', edDate: 'd' }, { id: 'b' }, null, 42, ok({ id: 'c', code: 3 })];
    const out = sanitizeFavs(dirty);
    expect(out.map((f) => f.id)).toEqual(['a']);   // seule l'entrée conforme survit
  });

  it("force les types string et l'URL source à une https sûre (sinon null)", () => {
    const [f] = sanitizeFavs([ok({ axis: 5, source: { name: 'A', host: 'a.cd', url: 'javascript:alert(1)' } })]);
    expect(f.axis).toBe('?');                        // type invalide → défaut sûr
    expect(f.source.url).toBeNull();                 // URL hostile → rejetée
    const [g] = sanitizeFavs([ok({ source: { name: 'A', host: 'a.cd', url: 'https://a.cd/x' } })]);
    expect(g.source.url).toBe('https://a.cd/x');     // https sûre → conservée
  });

  it('déduplique par id et PLAFONNE à MAX_FAVS', () => {
    expect(sanitizeFavs([ok({ id: 'a' }), ok({ id: 'a' })]).length).toBe(1);
    const many = Array.from({ length: MAX_FAVS + 50 }, (_, i) => ok({ id: 'k' + i }));
    expect(sanitizeFavs(many).length).toBe(MAX_FAVS);
  });

  // IF-02 (QA v1.1) — SYMÉTRIE des bornes. `recent` bornait déjà NOMBRE **et** LONGUEUR ; `favs` ne bornait
  // que le NOMBRE. Or un favori est RENDU (NewsCard) : un titre de plusieurs Mo planté dans le stockage
  // (terminal compromis / adb) survivait au filtre `typeof string`, puis Yoga devait le mesurer sur le thread
  // principal → gel de l'écran Favoris. Plafonner le nombre ne protège pas d'UNE chaîne géante.
  it('IF-02 : tronque les chaînes géantes relues du stockage (anti-DoS de rendu)', () => {
    const huge = 'x'.repeat(50000);
    const [f] = sanitizeFavs([{
      id: huge, code: huge, edDate: huge, axisName: huge, title: huge, text: huge,
      reliability: huge, source: { name: huge, host: huge, url: 'https://a.cd/x' },
    }]);
    expect(f.title.length).toBe(200);
    expect(f.text.length).toBe(600);
    expect(f.id.length).toBe(64);
    expect(f.code.length).toBe(32);
    expect(f.edDate.length).toBe(16);
    expect(f.axisName.length).toBe(64);
    expect(f.reliability.length).toBe(32);
    expect(f.source.name.length).toBe(120);
    expect(f.source.host.length).toBe(120);
  });

  it('IF-02 : ne mutile PAS un favori de taille normale (la borne ne doit pas coûter au cas réel)', () => {
    const ok = { id: '2026-07-14:P-1', code: 'P-1', edDate: '2026-07-14', axis: 'P', axisName: 'Politique',
      title: 'Titre normal', text: 'Un texte de longueur ordinaire.', reliability: 'A',
      source: { name: 'Radio Okapi', host: 'radiookapi.net', url: 'https://radiookapi.net/a' } };
    expect(sanitizeFavs([ok])[0]).toEqual({ ...ok, source: { ...ok.source } });
  });

  it("RS3 : l'axis est réduit à une liste blanche (jamais une clé de prototype)", () => {
    expect(sanitizeFavs([ok({ axis: 'constructor' })])[0].axis).toBe('?');
    expect(sanitizeFavs([ok({ axis: '__proto__' })])[0].axis).toBe('?');
    expect(sanitizeFavs([ok({ axis: 'Zzz' })])[0].axis).toBe('?');   // string inconnue → '?'
    expect(sanitizeFavs([ok({ axis: 'P' })])[0].axis).toBe('P');     // axe réel conservé
    expect(sanitizeFavs([ok({ axis: 'Env' })])[0].axis).toBe('Env');
  });
});

// RS3 : savePrefs sérialise les écritures via un cache RAM (source de vérité) → deux patches de clés
// DIFFÉRENTES non attendus ne se perdent plus (l'ancien read-modify-write disque en écrasait un).
// RS_Sec (v1.1) : requêtes récentes — la frontière de stockage borne le NOMBRE **et** la LONGUEUR (une chaîne
// géante relue serait RENDUE en puce → mesure Yoga d'un nœud de plusieurs Mo = gel de l'écran Recherche).
describe('prefs recent — bornes nombre ET longueur (anti-DoS de rendu)', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });
  it('loadRecent tronque une chaîne géante plantée dans le stockage', async () => {
    await AsyncStorage.setItem('ntongo.recent.v1', JSON.stringify(['A'.repeat(500000), 'ok']));
    const r = await loadRecent();
    expect(r[0].length).toBeLessThanOrEqual(120);
    expect(r[1]).toBe('ok');
  });
  it('loadRecent plafonne le nombre et jette les non-strings', async () => {
    await AsyncStorage.setItem('ntongo.recent.v1', JSON.stringify(['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 42, null]));
    const r = await loadRecent();
    expect(r.length).toBeLessThanOrEqual(5);
    for (const x of r) expect(typeof x).toBe('string');
  });
  it('pushRecent borne aussi à l’écriture', async () => {
    await pushRecent('B'.repeat(400));
    const r = await loadRecent();
    expect(r[0].length).toBeLessThanOrEqual(120);
  });
});

// RS1-23 : sujets suivis — persistance locale assainie (type liste blanche, key string, dédup, plafond).
describe('prefs follows — Suivre (local, fail-closed)', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });
  it('loadFollows assainit + déduplique', async () => {
    await saveFollows([{ type: 'axis', key: 'P' }, { type: 'axis', key: 'P' }, { type: 'sector', key: 'banques' },
      { type: 'bad', key: 'x' }, { type: 'axis', key: 5 }, 'nope', null]);
    expect(await loadFollows()).toEqual([{ type: 'axis', key: 'P' }, { type: 'sector', key: 'banques' }]);
  });
  it('vide par défaut / sur blob corrompu', async () => {
    expect(await loadFollows()).toEqual([]);
    await saveFollows('x');
    expect(await loadFollows()).toEqual([]);
  });
});

describe('prefs.savePrefs — écritures sérialisées, pas de lost-update', () => {
  beforeEach(async () => { await AsyncStorage.clear(); await loadPrefs(); });
  it('conserve les DEUX clés quand deux savePrefs concurrents visent des clés distinctes', async () => {
    const p1 = savePrefs({ mode: 'dark' });
    const p2 = savePrefs({ notifOn: true });
    await Promise.all([p1, p2]);
    const p = await loadPrefs();
    expect(p.mode).toBe('dark');
    expect(p.notifOn).toBe(true);
  });
});
