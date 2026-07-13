jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import { loadSector, saveSector } from '../src/prefs';

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
