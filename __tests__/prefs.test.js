jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import { loadSector, saveSector, sanitizeFavs, MAX_FAVS } from '../src/prefs';

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
});
