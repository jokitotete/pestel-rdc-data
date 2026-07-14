import { Linking, Alert } from 'react-native';

// Allowlist de schémas — point d'entrée UNIQUE pour ouvrir une URL. Toute URL provient de la donnée
// distante (NON FIABLE) : on n'autorise QUE https:. Allowlist POSITIVE ancrée : tout ce qui ne
// commence pas par https:// est rejeté de fait — javascript:, data:, file:, intent:, content:, tel:,
// blob:, //host, une URL préfixée d'espaces/contrôles… Fail-closed. On ne s'appuie PAS sur
// Linking.canOpenURL (qui « valide » aussi des schémas hostiles).
const HTTPS_RE = /^https:\/\/[^\s]+$/i;

export function isSafeUrl(url) {
  if (typeof url !== 'string') return false;
  const u = url.trim();   // .trim() neutralise les préfixes d'espaces/tabulations
  if (!HTTPS_RE.test(u)) return false;
  // RS_Sec : REJET du userinfo (user:pass@host) dans l'AUTORITÉ — jamais légitime pour une source, et
  // vecteur d'hameçonnage (https://actualite.cd@evil.com affiche la marque mais ouvre evil.com).
  const authority = u.slice(8).split(/[/?#]/)[0];   // partie après "https://", avant le 1er /?#
  return authority.indexOf('@') < 0;
}

export async function safeOpenURL(url) {
  if (!isSafeUrl(url)) return false;   // refus sûr : jamais d'ouverture d'un schéma hostile
  try {
    await Linking.openURL(String(url).trim());
    return true;
  } catch (e) {
    return false;
  }
}

// Domaine réel d'une URL https (à AFFICHER avant d'ouvrir). L'URL vient de la donnée NON FIABLE :
// le libellé « source A » peut mentir, mais l'hôte, lui, révèle la vraie destination. '' si illisible.
export function hostOf(url) {
  if (typeof url !== 'string') return '';
  const m = url.trim().match(/^https:\/\/([^/?#\s]+)/i);
  if (!m) return '';
  // RS_Sec : retirer un éventuel userinfo (user:pass@) → on affiche la VRAIE destination, jamais
  // « marque.cd@evil.com ». On CONSERVE le port (:8443) : il fait partie de l'autorité réellement
  // contactée (transparence) et le retirer casserait les hôtes IPv6 (`[::1]:8443`). Défense en
  // profondeur : isSafeUrl bloque déjà le userinfo en amont, mais hostOf est aussi appelé sur des
  // URLs de feed NON filtrées (SourceLine), d'où le strip indépendant ici.
  return m[1].split('@').pop().toLowerCase();
}

// Ouverture d'un lien EXTERNE avec CONTRÔLE EXPLICITE (SEC-01) : on montre le domaine cible et on
// exige une confirmation avant de quitter l'app. Découple la destination technique (l'hôte) de la
// note éditoriale (A/B/C/D) : l'utilisateur voit toujours OÙ il va, quelle que soit l'étiquette.
export async function confirmOpenURL(url) {
  if (!isSafeUrl(url)) return false;
  const host = hostOf(url) || 'un site externe';
  return new Promise((resolve) => {
    Alert.alert(
      'Ouvrir un lien externe',
      `Vous allez quitter Ntongo pour :\n${host}\n\nVérifiez le domaine avant de continuer.`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Ouvrir', onPress: async () => resolve(await safeOpenURL(url)) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
