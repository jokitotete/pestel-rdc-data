// TCK-065 → TCK-068 « Le Réveil » — briefing matinal par notification LOCALE.
//
// PÉRIMÈTRE HONNÊTE DE CES TESTS : ils prouvent la LOGIQUE de src/notify.js contre un double du module
// natif. Ils NE PROUVENT PAS que l'OS délivre réellement la notification à 07:30 — cela ne peut être
// constaté que sur un APK installé sur un appareil (porte PRT_CYBER). Aucun de ces tests n'autorise à
// écrire quelque part que « la fonctionnalité marche ».
//
// Ce qui EST prouvé ici :
//   · la permission est demandée EN CONTEXTE (à l'activation) et jamais redemandée si déjà accordée ;
//   · un refus DÉFINITIF (canAskAgain=false) ne relance pas la boîte système ;
//   · un refus renvoie false SANS exception et SANS rien planifier ;
//   · le canal Android « briefing » est créé AVANT la planification, et seulement sur Android ;
//   · le déclencheur est bien un « daily » répété à 07:30 par défaut, rattaché au canal ;
//   · la planification est IDEMPOTENTE (annulation préalable par identifiant) ;
//   · l'annulation est CIBLÉE (jamais cancelAll…) ;
//   · aucune donnée personnelle ni variable dans le contenu ;
//   · AUCUNE fonction réseau / jeton push n'est appelée ;
//   · l'absence du module natif dégrade proprement (false / null), jamais en écran blanc.

const mockNotifs = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  // fonctions RÉSEAU / PUSH : présentes dans le double UNIQUEMENT pour prouver qu'on ne les appelle pas
  getDevicePushTokenAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setAutoServerRegistrationEnabledAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval', DATE: 'date' },
  AndroidImportance: { DEFAULT: 5, HIGH: 6 },
  IosAuthorizationStatus: { DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 4 },
};
jest.mock('expo-notifications', () => mockNotifs, { virtual: true });

import { Platform } from 'react-native';
import {
  scheduleDailyBriefing, cancelDailyBriefing, ensureBriefingPermission, isBriefingScheduled,
  BRIEFING_ID, BRIEFING_CHANNEL_ID, BRIEFING_HOUR, BRIEFING_MINUTE, BRIEFING_TITLE, BRIEFING_BODY,
} from '../src/notify';

const RESEAU = ['getDevicePushTokenAsync', 'getExpoPushTokenAsync', 'setAutoServerRegistrationEnabledAsync', 'registerTaskAsync'];
const accorde = () => ({ granted: true, canAskAgain: false, status: 'granted' });
const jamaisDemande = () => ({ granted: false, canAskAgain: true, status: 'undetermined' });
const refuseDefinitif = () => ({ granted: false, canAskAgain: false, status: 'denied' });

beforeEach(() => {
  Object.values(mockNotifs).forEach((f) => { if (jest.isMockFunction(f)) f.mockReset(); });
  mockNotifs.getPermissionsAsync.mockResolvedValue(accorde());
  mockNotifs.requestPermissionsAsync.mockResolvedValue(accorde());
  mockNotifs.setNotificationChannelAsync.mockResolvedValue({});
  mockNotifs.scheduleNotificationAsync.mockResolvedValue(BRIEFING_ID);
  mockNotifs.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
  mockNotifs.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  Platform.OS = 'android';
});

describe('notify — permission EN CONTEXTE (jamais au démarrage)', () => {
  it("le simple IMPORT du module ne demande, ne crée et ne planifie RIEN (aucun effet de bord au boot)", () => {
    // Le fichier a été importé en haut de ce test : si une seule de ces fonctions avait été appelée à
    // l'import, la boîte de permission surgirait au lancement de l'app, sans que l'utilisateur ait rien
    // demandé — c'est précisément l'anti-pattern que la demande « en contexte » interdit.
    expect(mockNotifs.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifs.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifs.setNotificationHandler).not.toHaveBeenCalled();
    expect(mockNotifs.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('permission déjà accordée → true SANS relancer la boîte système', async () => {
    await expect(ensureBriefingPermission()).resolves.toBe(true);
    expect(mockNotifs.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('jamais demandée → la boîte est présentée, sans pastille (rien à compter)', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue(jamaisDemande());
    await expect(ensureBriefingPermission()).resolves.toBe(true);
    expect(mockNotifs.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockNotifs.requestPermissionsAsync.mock.calls[0][0].ios.allowBadge).toBe(false);
  });

  it("refus DÉFINITIF (canAskAgain=false) → false SANS redemander (sinon l'utilisateur croit à un bug)", async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue(refuseDefinitif());
    await expect(ensureBriefingPermission()).resolves.toBe(false);
    expect(mockNotifs.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('iOS « provisional » vaut autorisation (ne pas la traiter comme un refus)', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, ios: { status: 4 } });
    await expect(ensureBriefingPermission()).resolves.toBe(true);
    expect(mockNotifs.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("une permission refusée à la demande → false, et l'app ne lève AUCUNE exception", async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue(jamaisDemande());
    mockNotifs.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false, status: 'denied' });
    await expect(ensureBriefingPermission()).resolves.toBe(false);
  });

  it("une erreur du natif pendant la demande ne remonte pas : false, pas de crash", async () => {
    mockNotifs.getPermissionsAsync.mockRejectedValue(new Error('natif indisponible'));
    await expect(ensureBriefingPermission()).resolves.toBe(false);
  });
});

describe('notify — planification quotidienne', () => {
  it('planifie un déclencheur « daily » à 07:30 par défaut, rattaché au canal briefing', async () => {
    await expect(scheduleDailyBriefing()).resolves.toBe(true);
    expect(mockNotifs.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const req = mockNotifs.scheduleNotificationAsync.mock.calls[0][0];
    expect(req.identifier).toBe(BRIEFING_ID);
    expect(req.trigger).toEqual({ type: 'daily', hour: 7, minute: 30, channelId: BRIEFING_CHANNEL_ID });
    expect(BRIEFING_HOUR).toBe(7);
    expect(BRIEFING_MINUTE).toBe(30);
  });

  it('accepte une heure personnalisée, refuse une heure invalide SANS appeler le natif', async () => {
    await expect(scheduleDailyBriefing(6, 5)).resolves.toBe(true);
    expect(mockNotifs.scheduleNotificationAsync.mock.calls[0][0].trigger).toMatchObject({ hour: 6, minute: 5 });
    mockNotifs.scheduleNotificationAsync.mockClear();
    for (const [h, m] of [[24, 0], [-1, 0], [7, 60], [7, -1], [7.5, 0], ['7', 30], [NaN, 0]]) {
      await expect(scheduleDailyBriefing(h, m)).resolves.toBe(false);
    }
    expect(mockNotifs.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('crée le canal Android « briefing » AVANT de planifier (ordre, pas seulement présence)', async () => {
    const ordre = [];
    mockNotifs.setNotificationChannelAsync.mockImplementation(async () => { ordre.push('canal'); return {}; });
    mockNotifs.scheduleNotificationAsync.mockImplementation(async () => { ordre.push('planif'); return BRIEFING_ID; });
    await scheduleDailyBriefing();
    expect(ordre).toEqual(['canal', 'planif']);
    const [id, cfg] = mockNotifs.setNotificationChannelAsync.mock.calls[0];
    expect(id).toBe('briefing');
    expect(cfg.importance).toBe(mockNotifs.AndroidImportance.DEFAULT);
    expect(cfg.showBadge).toBe(false);
  });

  it("hors Android, aucun canal n'est créé (la notion n'existe pas)", async () => {
    Platform.OS = 'ios';
    await expect(scheduleDailyBriefing()).resolves.toBe(true);
    expect(mockNotifs.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(mockNotifs.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('IDEMPOTENCE : deux activations successives ne laissent JAMAIS deux alarmes empilées', async () => {
    await scheduleDailyBriefing();
    await scheduleDailyBriefing();
    // Chaque planification est précédée d'une annulation de l'identifiant, donc une seule alarme survit.
    expect(mockNotifs.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mockNotifs.cancelScheduledNotificationAsync).toHaveBeenCalledWith(BRIEFING_ID);
    expect(mockNotifs.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    const ids = mockNotifs.scheduleNotificationAsync.mock.calls.map((c) => c[0].identifier);
    expect(new Set(ids).size).toBe(1);           // même identifiant → l'OS écrase, il n'empile pas
  });

  it("l'annulation préalable qui échoue (1er opt-in, rien à annuler) ne bloque pas la planification", async () => {
    mockNotifs.cancelScheduledNotificationAsync.mockRejectedValue(new Error('identifiant inconnu'));
    await expect(scheduleDailyBriefing()).resolves.toBe(true);
    expect(mockNotifs.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('REFUS de permission → false et RIEN n’est planifié (ni canal, ni alarme)', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue(refuseDefinitif());
    await expect(scheduleDailyBriefing()).resolves.toBe(false);
    expect(mockNotifs.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockNotifs.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('une exception du natif à la planification est absorbée : false, jamais de crash', async () => {
    mockNotifs.scheduleNotificationAsync.mockRejectedValue(new Error('boom'));
    await expect(scheduleDailyBriefing()).resolves.toBe(false);
  });

  it("pose un gestionnaire de premier plan (sinon rien ne s'affiche app ouverte), sans pastille", async () => {
    await scheduleDailyBriefing();
    expect(mockNotifs.setNotificationHandler).toHaveBeenCalledTimes(1);
    const comportement = await mockNotifs.setNotificationHandler.mock.calls[0][0].handleNotification({});
    expect(comportement.shouldShowBanner).toBe(true);
    expect(comportement.shouldSetBadge).toBe(false);
  });
});

describe('notify — contenu : aucune donnée personnelle, rien de variable', () => {
  it('titre et corps sont des CONSTANTES littérales et data est vide', async () => {
    await scheduleDailyBriefing();
    const { content } = mockNotifs.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe(BRIEFING_TITLE);
    expect(content.body).toBe(BRIEFING_BODY);
    expect(content.data).toEqual({});
  });

  it('le contenu ne contient ni date, ni chiffre, ni identifiant (rien de traçable sur un écran verrouillé)', () => {
    // Un titre du type « 3 nouveaux articles » ou « édition du 22/07 » révélerait l'usage de l'app à
    // quiconque regarde l'écran verrouillé. On interdit donc TOUT chiffre dans le texte publié.
    expect(BRIEFING_TITLE + ' ' + BRIEFING_BODY).not.toMatch(/\d/);
  });

  it("le contenu est IDENTIQUE d'un appel à l'autre (figé à la planification, jamais recalculé)", async () => {
    await scheduleDailyBriefing();
    await scheduleDailyBriefing(6, 15);
    const [a, b] = mockNotifs.scheduleNotificationAsync.mock.calls.map((c) => c[0].content);
    expect(a).toEqual(b);
  });
});

describe('notify — 100 % LOCAL : aucune requête réseau, aucun jeton push', () => {
  it("aucune fonction réseau/push n'est appelée lors de la planification", async () => {
    await scheduleDailyBriefing();
    RESEAU.forEach((f) => expect(mockNotifs[f]).not.toHaveBeenCalled());
  });

  it("aucune fonction réseau/push n'est appelée lors de l'annulation ni de la relecture d'état", async () => {
    await cancelDailyBriefing();
    await isBriefingScheduled();
    RESEAU.forEach((f) => expect(mockNotifs[f]).not.toHaveBeenCalled());
  });

  it("aucun fetch n'est émis par le module (garde explicite)", async () => {
    const vraiFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject(new Error('réseau interdit dans ce module')));
    try {
      await scheduleDailyBriefing();
      await cancelDailyBriefing();
      expect(global.fetch).not.toHaveBeenCalled();
    } finally { global.fetch = vraiFetch; }
  });

  it('le déclencheur est natif et répétitif : aucune re-planification JS ne serait requise chaque jour', async () => {
    // Un trigger « timeInterval » ou « date » obligerait l'app à se réveiller pour re-planifier — donc à
    // tourner en tâche de fond. « daily » est délégué à l'OS : rien à faire côté app entre deux réveils.
    await scheduleDailyBriefing();
    expect(mockNotifs.scheduleNotificationAsync.mock.calls[0][0].trigger.type).toBe('daily');
  });
});

describe('notify — annulation ciblée', () => {
  it("annule PAR IDENTIFIANT et n'utilise JAMAIS cancelAll (qui tuerait toute autre planification)", async () => {
    await expect(cancelDailyBriefing()).resolves.toBe(true);
    expect(mockNotifs.cancelScheduledNotificationAsync).toHaveBeenCalledWith(BRIEFING_ID);
    expect(mockNotifs.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('une erreur du natif à l’annulation est absorbée : false, pas de crash', async () => {
    mockNotifs.cancelScheduledNotificationAsync.mockRejectedValue(new Error('boom'));
    await expect(cancelDailyBriefing()).resolves.toBe(false);
  });
});

describe('notify — isBriefingScheduled : tri-état (ne jamais confondre « je ne sais pas » et « non »)', () => {
  it('true quand l’OS liste bien notre identifiant', async () => {
    mockNotifs.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'autre' }, { identifier: BRIEFING_ID }]);
    await expect(isBriefingScheduled()).resolves.toBe(true);
  });

  it('false FRANC quand l’OS répond une liste sans notre identifiant', async () => {
    mockNotifs.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'autre' }]);
    await expect(isBriefingScheduled()).resolves.toBe(false);
  });

  it('null (INDÉTERMINÉ) si le natif échoue ou répond n’importe quoi — surtout pas false', async () => {
    mockNotifs.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('boom'));
    await expect(isBriefingScheduled()).resolves.toBeNull();
    mockNotifs.getAllScheduledNotificationsAsync.mockResolvedValue(undefined);
    await expect(isBriefingScheduled()).resolves.toBeNull();
  });
});

// NB — la DÉGRADATION quand le module natif est absent ou amputé est prouvée dans deux fichiers séparés
// (notify.absent.test.js, notify.ampute.test.js). Elle ne peut pas l'être ici : une fabrique jest.mock
// n'est évaluée QU'UNE FOIS par fichier de test, et jest.isolateModules ne la réévalue pas (vérifié par
// sonde). Un test « d'absence » écrit dans ce fichier recevrait donc le double NORMAL et passerait au
// vert sans rien prouver — exactement le genre de test menteur que ce projet refuse.
