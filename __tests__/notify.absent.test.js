// TCK-065 → TCK-068 — DÉGRADATION quand expo-notifications ne se RÉSOUT PAS.
//
// C'est LE piège qui avait fait retirer le module d'une version précédente : un `import` statique dont la
// résolution échoue tue le bundle ENTIER (écran blanc au lancement, avant même que React monte, donc hors
// de portée de l'ErrorBoundary). src/notify.js ne fait donc qu'un `require` PARESSEUX sous try/catch.
//
// Fichier SÉPARÉ, et non un simple test dans notify.test.js : une fabrique jest.mock n'est évaluée qu'une
// fois par fichier, et jest.isolateModules ne la réévalue pas (vérifié par sonde). Simuler l'absence
// depuis le fichier principal aurait rendu le double NORMAL — un test vert qui ne prouve rien.

jest.mock('expo-notifications', () => { throw new Error('module natif introuvable'); }, { virtual: true });

import {
  scheduleDailyBriefing, cancelDailyBriefing, ensureBriefingPermission, isBriefingScheduled,
} from '../src/notify';

describe('notify — résolution du module natif qui LÈVE', () => {
  it("l'import de src/notify.js ne lève pas (le reste de l'app reste bundlable et montable)", () => {
    // Si cette assertion s'exécute, c'est que le fichier a été importé sans exception malgré une
    // résolution en erreur : le bundle survit, seul le briefing est indisponible.
    expect(typeof scheduleDailyBriefing).toBe('function');
  });

  it('planification → false (jamais une exception qui remonterait dans le gestionnaire de la cloche)', async () => {
    await expect(scheduleDailyBriefing()).resolves.toBe(false);
  });

  it('annulation → false, sans exception', async () => {
    await expect(cancelDailyBriefing()).resolves.toBe(false);
  });

  it('permission → false, sans exception', async () => {
    await expect(ensureBriefingPermission()).resolves.toBe(false);
  });

  it("état → null (INDÉTERMINÉ) et surtout pas false : sans natif, on ne SAIT pas, donc on n'éteint pas la cloche", async () => {
    await expect(isBriefingScheduled()).resolves.toBeNull();
  });
});
