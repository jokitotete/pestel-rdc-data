// TCK-065 → TCK-068 — DÉGRADATION quand le paquet est PRÉSENT mais le natif NON LIÉ.
//
// Cas distinct de notify.absent.test.js, et plus sournois : le `require` RÉUSSIT (le JS du paquet est bien
// dans node_modules), mais l'autolinking natif n'a pas eu lieu — typiquement un bundle de développement
// servi sur un binaire construit AVANT l'ajout du module. L'objet existe, ses fonctions manquent : sans
// garde, on appellerait `undefined(...)` → TypeError remontant jusqu'au gestionnaire de la cloche.
//
// src/notify.js exige donc explicitement `typeof N.scheduleNotificationAsync === 'function'` avant de
// considérer le module comme utilisable.

jest.mock('expo-notifications', () => ({}), { virtual: true });   // objet vide = natif non lié

import {
  scheduleDailyBriefing, cancelDailyBriefing, ensureBriefingPermission, isBriefingScheduled,
} from '../src/notify';

describe('notify — paquet présent mais natif NON LIÉ', () => {
  it('est traité exactement comme absent : false / false / false', async () => {
    await expect(scheduleDailyBriefing()).resolves.toBe(false);
    await expect(cancelDailyBriefing()).resolves.toBe(false);
    await expect(ensureBriefingPermission()).resolves.toBe(false);
  });

  it('état → null (INDÉTERMINÉ), jamais un false qui éteindrait la cloche à tort', async () => {
    await expect(isBriefingScheduled()).resolves.toBeNull();
  });
});
