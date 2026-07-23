// « Le Réveil Ntongo » — briefing matinal par notification LOCALE quotidienne.
// TCK-065 → TCK-068. 100 % LOCAL : aucun compte, aucun serveur, aucune requête réseau, aucun jeton push.
//
// ── CE QUE CE MODULE NE FAIT PAS (contrainte client ferme, vérifiée ligne à ligne) ────────────────────
//  · Aucun appel réseau à la planification ni au déclenchement : la planification est confiée à l'OS
//    (AlarmManager côté Android, UNUserNotificationCenter côté iOS) et le contenu est FIGÉ à la
//    planification — il n'est ni téléchargé ni rafraîchi au déclenchement.
//  · Aucune fonction push / jeton n'est appelée : ni getDevicePushTokenAsync, ni getExpoPushTokenAsync,
//    ni setAutoServerRegistrationEnabledAsync. (L'effet de bord d'import du paquet,
//    DevicePushTokenAutoRegistration.fx, ne déclenche une requête QUE si l'auto-enregistrement a été
//    activé par setAutoServerRegistrationEnabledAsync — que nous n'appelons jamais. Sans cela il se
//    limite à une lecture de stockage local.)
//  · AUCUNE DONNÉE PERSONNELLE dans la notification : titre et corps sont des CONSTANTES littérales,
//    identiques pour tout le monde ; `data` est vide. Rien de l'utilisateur (favoris, sujets suivis,
//    édition lue, thème) ne transite par la notification — l'écran de verrouillage n'en révèle rien.
//
// ── POURQUOI TOUT PASSE PAR require() DANS UN try/catch ───────────────────────────────────────────────
// expo-notifications est un module NATIF. Il avait été RETIRÉ d'une version précédente parce que sa
// résolution cassait le bundle. On ne remet donc PAS un `import` statique en tête de fichier : un import
// statique qui échoue tue le bundle entier (écran blanc, avant même que React monte, hors de portée de
// l'ErrorBoundary). Ici la résolution est PARESSEUSE (au premier appel, jamais à l'import) et ENCAPSULÉE :
// si le natif est absent ou cassé, `nativeModule()` renvoie null, la planification renvoie `false`, et
// l'UI affiche « indisponible ». Aucun autre écran n'est affecté.
//
// ── VÉRIFICATION ─────────────────────────────────────────────────────────────────────────────────────
// La planification RÉELLE ne peut être constatée que sur un APK installé sur un appareil (porte
// PRT_CYBER). Tant que ce contrôle n'a pas eu lieu, la fonctionnalité n'est PAS déclarée vérifiée : les
// tests joints prouvent la LOGIQUE (permission, canal, identifiant, idempotence, annulation, refus),
// PAS la délivrance effective par l'OS.

import { Platform } from 'react-native';

// Identifiant STABLE de la planification : c'est lui qui rend l'annulation exacte et la planification
// idempotente (jamais deux briefings empilés après plusieurs opt-in / opt-out).
export const BRIEFING_ID = 'ntongo.briefing.quotidien';
// Canal Android (obligatoire depuis Android 8) : sans canal explicite, l'utilisateur ne peut pas régler
// finement le briefing dans les paramètres système, et le libellé affiché serait « Divers ».
export const BRIEFING_CHANNEL_ID = 'briefing';
export const BRIEFING_CHANNEL_NAME = 'Briefing du matin';
export const BRIEFING_HOUR = 7;
export const BRIEFING_MINUTE = 30;
// Contenu FIGÉ, sans aucune donnée personnelle ni variable (cf. en-tête).
export const BRIEFING_TITLE = 'Ntongo · le briefing du matin';
export const BRIEFING_BODY = "L'édition du jour vous attend.";

// Résolution paresseuse du module natif. `require` est mis en cache par le système de modules : rappeler
// cette fonction ne recharge rien. Toute défaillance (module absent, natif non lié, effet de bord en
// erreur) est absorbée ici et transformée en `null` — jamais en exception qui remonterait dans l'UI.
function nativeModule() {
  try {
    const N = require('expo-notifications');
    return N && typeof N.scheduleNotificationAsync === 'function' ? N : null;
  } catch (e) {
    return null;
  }
}

// Heure valide = entiers dans les bornes acceptées par le déclencheur « daily ». On valide AVANT
// d'appeler le natif : scheduleNotificationAsync lève un RangeError sur une heure hors bornes, et une
// exception native est plus coûteuse à diagnostiquer qu'un `false` propre.
function heureValide(h, m) {
  return Number.isInteger(h) && h >= 0 && h <= 23 && Number.isInteger(m) && m >= 0 && m <= 59;
}

/**
 * Permission EN CONTEXTE : on ne demande RIEN au démarrage. La boîte système n'est déclenchée qu'ici,
 * c'est-à-dire au moment précis où l'utilisateur active la cloche — il sait donc pourquoi on la lui pose.
 *
 * Trois cas distincts, et le troisième est celui qu'on rate d'habitude :
 *   1. déjà accordée            → true, sans redemander (aucune boîte système inutile) ;
 *   2. jamais demandée          → on demande ;
 *   3. refusée DÉFINITIVEMENT   → `canAskAgain === false` : le système n'affichera plus jamais la boîte.
 *      La redemander donnerait une promesse résolue « refusé » instantanée et l'utilisateur croirait à
 *      un bug. On renvoie false tout de suite ; l'appelant affiche le message d'indisponibilité.
 *
 * @returns {Promise<boolean>} true si l'app est autorisée à présenter des notifications.
 */
export async function ensureBriefingPermission() {
  const N = nativeModule();
  if (!N) return false;
  try {
    const cur = await N.getPermissionsAsync();
    // iOS « provisional » : autorisation silencieuse accordée sans boîte de dialogue — elle SUFFIT pour
    // délivrer, et la traiter comme un refus ferait redemander à chaque activation.
    const provisoire = !!(cur && cur.ios && N.IosAuthorizationStatus
      && cur.ios.status === N.IosAuthorizationStatus.PROVISIONAL);
    if (cur && (cur.granted || provisoire)) return true;
    if (cur && cur.canAskAgain === false) return false;       // cas 3 : inutile d'insister
    const rep = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },   // pas de pastille : rien à compter
    });
    return !!(rep && rep.granted);
  } catch (e) {
    return false;
  }
}

/**
 * Planifie le briefing quotidien répété. Toute la chaîne échoue PROPREMENT (false), jamais par exception :
 * un refus de permission, un natif absent ou une heure invalide se lisent tous « false » côté UI.
 *
 * @param {number} hour   heure locale (0-23), 7 par défaut
 * @param {number} minute minute (0-59), 30 par défaut
 * @returns {Promise<boolean>} true seulement si l'OS a bien enregistré la planification.
 */
export async function scheduleDailyBriefing(hour = BRIEFING_HOUR, minute = BRIEFING_MINUTE) {
  const N = nativeModule();
  if (!N) return false;
  if (!heureValide(hour, minute)) return false;
  const autorise = await ensureBriefingPermission();
  if (!autorise) return false;                                 // refus : l'UI le dit, l'app ne plante pas
  try {
    // Canal Android AVANT la planification : le déclencheur y fait référence par `channelId`. Créer le
    // canal après reviendrait à publier la première notification sur un canal implicite.
    if (Platform.OS === 'android' && typeof N.setNotificationChannelAsync === 'function') {
      await N.setNotificationChannelAsync(BRIEFING_CHANNEL_ID, {
        name: BRIEFING_CHANNEL_NAME,
        importance: (N.AndroidImportance && N.AndroidImportance.DEFAULT) || 5,
        sound: 'default',
        showBadge: false,
      });
    }
    // Présentation quand l'app est AU PREMIER PLAN : sans gestionnaire, expo-notifications n'affiche rien
    // dans ce cas (comportement par défaut documenté = ne pas montrer). Posé ICI et non à l'import, pour
    // qu'aucun effet de bord n'existe tant que l'utilisateur n'a pas opté.
    if (typeof N.setNotificationHandler === 'function') {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
        }),
      });
    }
    // IDEMPOTENCE : on annule d'abord. Deux activations successives ne doivent pas empiler deux alarmes.
    // L'annulation d'un identifiant inexistant est légitime (1er opt-in) → son échec ne doit rien casser.
    try { await N.cancelScheduledNotificationAsync(BRIEFING_ID); } catch (e) { /* rien à annuler */ }
    await N.scheduleNotificationAsync({
      identifier: BRIEFING_ID,
      content: { title: BRIEFING_TITLE, body: BRIEFING_BODY, sound: true, data: {} },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,   // répétition quotidienne native (pas de re-planif JS)
        hour,
        minute,
        channelId: BRIEFING_CHANNEL_ID,
      },
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Annule le briefing. Annulation CIBLÉE par identifiant (surtout pas cancelAllScheduledNotificationsAsync,
 * qui détruirait toute autre planification future de l'app).
 * @returns {Promise<boolean>} true si l'annulation a été transmise à l'OS.
 */
export async function cancelDailyBriefing() {
  const N = nativeModule();
  if (!N) return false;
  try {
    await N.cancelScheduledNotificationAsync(BRIEFING_ID);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * La planification existe-t-elle RÉELLEMENT côté OS ?
 * Sert à ne pas MENTIR dans l'UI : l'opt-in est persisté localement, mais l'utilisateur peut révoquer la
 * permission depuis les réglages système ou désactiver le canal — la cloche resterait allumée pour une
 * alarme qui n'existe plus. On interroge donc l'OS plutôt que notre propre préférence.
 *
 * TRI-ÉTAT ASSUMÉ (et non un booléen) : « je ne sais pas » n'est PAS « c'est éteint ». Si le natif est
 * absent (bundle de dev) ou si l'interrogation échoue, répondre `false` ferait éteindre la cloche d'un
 * utilisateur dont l'alarme est peut-être bien planifiée — un mensonge dans l'autre sens. On renvoie donc
 * `null` = INDÉTERMINÉ, et l'appelant n'agit que sur un `false` FRANC.
 *
 * @returns {Promise<boolean|null>} true = planifié · false = absent côté OS · null = indéterminé
 */
export async function isBriefingScheduled() {
  const N = nativeModule();
  if (!N) return null;
  try {
    const all = await N.getAllScheduledNotificationsAsync();
    if (!Array.isArray(all)) return null;                 // réponse inexploitable → indéterminé, pas « non »
    return all.some((n) => n && n.identifier === BRIEFING_ID);
  } catch (e) {
    return null;
  }
}
