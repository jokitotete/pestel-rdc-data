// « Le Réveil Ntongo » — briefing matinal par notification LOCALE quotidienne (100 % local, aucun compte,
// aucun serveur). expo-notifications est un module NATIF : il exige un BUILD natif (APK) + config plugin et
// ne peut pas être embarqué dans le bundle de dev en cours (sa résolution casse le bundle). On expose donc
// une API STABLE et SÛRE : tant que le natif n'est pas branché (prochain rebuild APK), la planification
// échoue proprement (false) → l'UI affiche « indisponible ». Le reste du « Réveil » (bandeau « nouvelle
// édition ») fonctionne déjà, sans dépendance native.
//
// POUR ACTIVER (au prochain build APK) : `npx expo install expo-notifications`, ajouter le plugin à app.json,
// puis remplacer le corps ci-dessous par la planification réelle (permission → setNotificationChannelAsync
// 'briefing' → scheduleNotificationAsync trigger { hour:7, minute:30, repeats:true }). Le câblage App.js
// (opt-in, persistance) est déjà en place et appellera ces fonctions.

export async function scheduleDailyBriefing() {
  return false;   // module natif non branché dans ce build → échec propre (l'UI le signale)
}

export async function cancelDailyBriefing() {
  /* no-op tant que le module natif n'est pas branché */
}
