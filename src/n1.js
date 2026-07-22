// ÉTAGE N1 — « captée et classée par le moteur, NON RÉDIGÉE par un humain ».
//
// LOT-F. L'application n'affichait jusqu'ici que les faits RÉDIGÉS (N2/N3). Les items seulement CLASSÉS
// par le moteur (N1) étaient relégués dans une section « À traiter » qui les présentait avec un axe
// AFFIRMÉ (« Social »), sans jamais dire avec quelle confiance ce classement avait été fait, ni qu'un
// autre axe pouvait être en lice. Un item N1 doit paraître avec CE QU'IL EST et RIEN DE PLUS : un titre,
// une source, un axe QUALIFIÉ, une confiance. Pas de résumé, pas d'analyse — ils n'existent pas à ce niveau.
//
// POURQUOI UN MODULE PUR, SANS REACT : la classe de défaut la plus coûteuse de ce dépôt (F2, documentée
// dans theme.js et store.js) naît d'un PRÉDICAT DÉDOUBLÉ — la surface qui OFFRE et la surface qui REND
// suivent deux règles écrites deux fois. `__tests__/feed.test.js` en portait un exemplaire vivant : il
// RECOPIAIT le calcul du plafond de Home.js pour pouvoir le tester, avec le commentaire « doit rester
// aligné sur CAP_A_TRAITER ». Un test qui recopie le code qu'il teste ne teste que sa propre copie.
// Ici : UNE seule implémentation, consommée par les écrans ET par les tests.
//
// CE QUE CE MODULE NE FAIT PAS : il n'invente aucun champ. Si le fil publié ne transmet pas la confiance,
// la vue le DIT (« confiance non transmise ») au lieu d'afficher un axe nu qui se ferait passer pour sûr.
import { AX_ORDER, RUBRIQUES, AX_SHORT, fmtJour } from './theme';
import { hostOf } from './safeUrl';

// Seuil de confiance du moteur (lot-D, calibré et publié côté pestel-collector). Répété ici parce que
// l'application doit pouvoir QUALIFIER un item même quand le fil ne porte pas déjà son statut.
// S'il bouge côté moteur, il bouge ici : la valeur est nommée, pas dispersée.
export const SEUIL_CONFIANCE = 0.15;

// Plafond d'AFFICHAGE des captées sur « À la une ». 0 = aucun plafond. Ce qui est plafonné est COMPTÉ
// et DÉCLARÉ (cf. partitionnerN1) — jamais jeté en silence (famille TCK-050).
export const CAP_CAPTEES = 12;

// Axes/rubriques CONNUS — liste blanche. Un `axis` venant du fil (donnée NON FIABLE) qui n'est pas dans
// cette liste ne devient JAMAIS une clé de jeton (même garde que prefs.ALLOWED_AXES / theme.pick).
const AXES_CONNUS = new Set([...AX_ORDER, ...RUBRIQUES]);
export const AXES_N1 = [...AX_ORDER, ...RUBRIQUES];

const estObjet = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
// CONTRÔLE ADVERSARIAL (famille TCK-050) — `chaine()` coupait à n points de code SANS RIEN DIRE : ni
// marque à l'écran, ni compteur. Une chaîne coupée se lisait exactement comme une chaîne complète, y
// compris dans l'étiquette d'accessibilité (ui.js compose l'annonce lecteur d'écran à partir de `titre`).
// Le caractère « … » rend la coupe VISIBLE, et `compterCoupe` la rend COMPTABLE. La borne elle-même est
// conservée (elle protège le rendu d'une chaîne distante démesurée) — c'est son silence qui était fautif.
const ELLIPSE = '…';
const chaine = (x, n = 200) => {
  if (typeof x !== 'string') return '';
  const t = x.trim();
  return [...t].length > n ? [...t].slice(0, n).join('') + ELLIPSE : t;
};
/** Combien de chaînes de `champs` ont été coupées. Sert aux compteurs rendus, jamais à une décision. */
const compterCoupe = (valeurs) => valeurs.filter((v) => typeof v === 'string' && v.endsWith(ELLIPSE)).length;
const nombre = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
// Axe AFFICHABLE : chaîne connue, sinon null. '?' (non classé du moteur) → null, assumé.
const axeSur = (x) => (typeof x === 'string' && AXES_CONNUS.has(x) ? x : null);
const libelleAxe = (cle, fourni) => chaine(fourni, 40) || (cle && AX_SHORT[cle]) || '';
// Confiance en français (0.42 → « 0,42 »). Deux décimales : le seuil vaut 0,15, une seule décimale
// écraserait la différence entre 0,14 (faible) et 0,15 (classé).
export const fmtConfiance = (c) => (nombre(c) === null ? '' : c.toFixed(2).replace('.', ','));

// STATUT d'un item N1 (vocabulaire du lot-D) :
//   classe   — un axe est attribué et la confiance (si transmise) est au-dessus du seuil
//   faible   — un axe est attribué mais la confiance transmise est SOUS le seuil
//   orphelin — aucun axe attribué ('?' ou absent)
// Le statut peut être TRANSMIS par le moteur (it.statut) ; sinon il est dérivé. Un statut transmis
// incohérent avec les données (statut « classe » sans axe) ne prime pas : la donnée observable gagne.
export function statutN1(it, seuil = SEUIL_CONFIANCE) {
  if (!estObjet(it)) return 'orphelin';
  const axe = axeSur(it.axis);
  if (!axe) return 'orphelin';
  const c = nombre(it.confidence);
  if (c !== null && c < seuil) return 'faible';
  if (it.statut === 'faible') return 'faible';   // statut transmis, cohérent avec la présence d'un axe
  return 'classe';
}

// Note de source A→D (lot-D, table média). Absente → null : on n'invente pas une cote.
const noteSur = (x) => (typeof x === 'string' && /^[ABCD]$/.test(x) ? x : null);

// VUE d'un item N1 — liste BLANCHE de champs. Il n'y a volontairement NI `texte`, NI `resume`, NI
// `analyse` : un item N1 n'en a pas, et un champ facultatif finit toujours par être rempli « au mieux ».
// La carte ne peut donc pas mentir par construction (vérifié par __tests__/n1.test.js).
export function normaliserN1(it, seuil = SEUIL_CONFIANCE) {
  const src = estObjet(it) ? it : {};
  const statut = statutN1(src, seuil);
  const axe = axeSur(src.axis);
  const confiance = nombre(src.confidence);
  const cAxe = axeSur(src.runnerUp && src.runnerUp.axis) || axeSur(src.runnerUp);
  const candidat = cAxe ? { axe: cAxe, label: libelleAxe(cAxe, src.runnerUp && src.runnerUp.axisLabel) } : null;
  const url = typeof src.url === 'string' ? src.url : '';
  return {
    titre: chaine(src.title, 240),
    url,
    source: chaine(src.source, 120),
    // L'HÔTE réel, jamais le seul libellé de source : le libellé peut mentir, le domaine non (RS_Sec).
    host: hostOf(url),
    // Date de PARUTION formatée (« 13 juil. ») — elle rend visible la péremption du fil, qui a déjà servi
    // le 15/07 des dépêches du 13/07.
    date: fmtJour(src.publishedAt),
    axe,
    axeLabel: libelleAxe(axe, src.axisLabel),
    statut,
    confiance,
    candidat,
    note: noteSur(src.sourceGrade),
    mention: mentionN1({ axe, axeLabel: libelleAxe(axe, src.axisLabel), statut, confiance, candidat }),
  };
}

// La PHRASE affichée à la place d'un axe affirmé. C'est le cœur honnête du lot-F : on ne peint pas
// « Économie » comme un fait quand le moteur a hésité — on écrit ce qu'il a fait et avec quelle assurance.
export function mentionN1(vm) {
  const v = estObjet(vm) ? vm : {};
  const label = v.axeLabel || (v.axe ? AX_SHORT[v.axe] : '') || '';
  const c = nombre(v.confiance);
  if (v.statut === 'orphelin') {
    return v.candidat ? `non classé · meilleur candidat : ${v.candidat.label}` : 'non classé';
  }
  if (v.statut === 'faible') {
    const base = `classé ${label} · confiance faible${c === null ? '' : ` (${fmtConfiance(c)})`}`;
    return v.candidat ? `${base} · autre piste : ${v.candidat.label}` : base;
  }
  // classé : la confiance est dite quand elle est transmise, et son ABSENCE est dite quand elle ne l'est pas.
  // TCK-103 (2026-07-22) — le collecteur transmet DÉSORMAIS la qualification : `publish.js` ne projette plus
  // six champs codés en dur mais un CONTRAT DÉCLARÉ (pestel-collector/lib/projection.js), contrôlé contre le
  // schéma par un autocontrôle bloquant. Mesuré sur le flux réel conforme (pool du 22/07) : confidence,
  // runnerUp, sourceGrade, level et statut transmis 100 % — contre 0 % avant.
  // LA BRANCHE « non transmise » RESTE, et elle sert encore : le fil embarqué aujourd'hui vient des pools des
  // 13 et 15/07, collectés AVANT le schéma du lot-E, qui ne portent eux-mêmes AUCUN de ces champs (0/30 au
  // pool — ce n'est pas une perte de transport, c'est une absence à la collecte). Tant que ce fil n'a pas été
  // recollecté, la carte doit continuer de DIRE le trou plutôt que de le combler par du silence.
  return c === null ? `${label} · confiance non transmise` : `${label} · confiance ${fmtConfiance(c)}`;
}

// PARTITION du fil pour l'affichage — l'ARITHMÉTIQUE DE LA PROMESSE « rien n'est écarté en silence ».
// INVARIANT (testé) : affiches.length + enPlus + nonOuvrables === sains. Tout item sain est soit AFFICHÉ,
// soit COMPTÉ. `sansTitre` est compté à part (il n'est pas affichable du tout : il n'a rien à afficher).
export function partitionnerN1(feed, opts = {}) {
  const cap = Number.isFinite(opts.cap) && opts.cap >= 0 ? opts.cap : CAP_CAPTEES;
  const sur = typeof opts.urlSure === 'function' ? opts.urlSure : () => true;
  const seuil = Number.isFinite(opts.seuil) ? opts.seuil : SEUIL_CONFIANCE;
  const brut = Array.isArray(feed) ? feed.filter(estObjet) : [];
  const sains = brut.filter((f) => chaine(f.title));
  const ouvrables = sains.filter((f) => sur(f.url));
  const retenus = cap > 0 ? ouvrables.slice(0, cap) : ouvrables;
  const affiches = retenus.map((f) => normaliserN1(f, seuil));
  return {
    total: brut.length,
    sansTitre: brut.length - sains.length,
    sains: sains.length,
    ouvrables: ouvrables.length,
    nonOuvrables: sains.length - ouvrables.length,
    affiches,
    enPlus: ouvrables.length - retenus.length,
    cap,
    // TCK-050 — le PLAFOND DE CARACTÈRES est compté au même titre que le plafond de cartes.
    titresCoupes: compterCoupe(affiches.map((v) => v.titre)),
  };
}

// RÉPARTITION PAR AXE — « BLOCS VIDES ASSUMÉS ». Renvoie TOUS les axes de `ordre`, y compris ceux à 0,
// plus une entrée '?' pour les orphelins. Un axe sans rien montre son vide ; il n'emprunte RIEN à un
// autre axe, et il ne disparaît pas de la liste (disparaître, c'est laisser croire qu'il n'existe pas).
export function repartitionParAxe(vues, ordre = AXES_N1) {
  const liste = Array.isArray(vues) ? vues : [];
  const cles = Array.isArray(ordre) ? ordre : AXES_N1;
  const out = cles.map((k) => ({
    cle: k,
    label: AX_SHORT[k] || k,
    n: liste.filter((v) => estObjet(v) && v.axe === k).length,
  }));
  out.push({ cle: '?', label: 'non classées', n: liste.filter((v) => estObjet(v) && !v.axe).length });
  return out;
}

// GROUPEMENT PAR AXE — même règle : chaque clé demandée reçoit SON groupe, vide ou non.
export function grouperParAxe(vues, ordre = AXES_N1) {
  const liste = Array.isArray(vues) ? vues : [];
  const cles = Array.isArray(ordre) ? ordre : AXES_N1;
  const groupes = cles.map((k) => ({
    cle: k,
    label: AX_SHORT[k] || k,
    items: liste.filter((v) => estObjet(v) && v.axe === k),
  }));
  groupes.push({ cle: '?', label: 'non classées', items: liste.filter((v) => estObjet(v) && !v.axe) });
  return groupes;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOT-H — « DIVERS » : UNE SOUPAPE INSTRUMENTÉE, PAS UN TAPIS
// ─────────────────────────────────────────────────────────────────────────────
// « Divers » recueille les captées que le moteur n'a pas classées. Deux règles :
//   1. MASQUÉE quand elle est vide — une rubrique offerte puis vide est une promesse non tenue (c'est
//      exactement le défaut F2 déjà payé sur « Suivre » d'un axe synthétique).
//   2. INSTRUMENTÉE — on doit pouvoir dire CE QUI y tombe et POURQUOI, sinon elle redevient invisible.
// Elle n'est PAS supprimée : la porte PRT_SOUPA exige 14 éditions consécutives OBSERVÉES d'abord
// (cf. analyserSoupape + prefs.noterSoupape : l'observation est enregistrée, pas affirmée).

// MOTIF de présence dans « Divers ». Le moteur peut le transmettre (`motif`/`rejectRule`) ; il ne le
// transmet PAS aujourd'hui — dans ce cas on écrit « motif non transmis » plutôt que d'en deviner un.
export function motifDivers(it) {
  const src = estObjet(it) ? it : {};
  const explicite = chaine(src.motif, 60) || chaine(src.rejectRule, 60);
  if (explicite) return explicite;
  if (axeSur(src.axis)) return 'classé mais non sélectionné';
  const c = nombre(src.confidence);
  if (c !== null && c < SEUIL_CONFIANCE) return 'sous le seuil de confiance';
  if (src.runnerUp) return 'candidat sans décision';
  return 'motif non transmis';
}

// COMPTEURS de la soupape pour une édition. `visible` pilote l'affichage de la pastille « Divers ».
export function instrumenterDivers(triage, opts = {}) {
  const sur = typeof opts.urlSure === 'function' ? opts.urlSure : () => true;
  const brut = Array.isArray(triage) ? triage.filter(estObjet) : [];
  const sains = brut.filter((f) => chaine(f.title));
  const ouvrables = sains.filter((f) => sur(f.url));
  const compter = (cle) => {
    const m = new Map();
    for (const it of brut) {
      const k = cle(it) || '—';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].map(([c, n]) => ({ cle: c, n })).sort((a, b) => b.n - a.n || (a.cle < b.cle ? -1 : 1));
  };
  return {
    total: brut.length,
    sansTitre: brut.length - sains.length,
    ouvrables: ouvrables.length,
    nonOuvrables: sains.length - ouvrables.length,
    parSource: compter((it) => chaine(it.source, 60)),
    parMotif: compter(motifDivers),
    // MASQUAGE : rien du tout → la pastille n'est pas offerte. Des items non ouvrables COMPTENT comme
    // du contenu : la soupape a alors quelque chose à dire (« n captées, liens non sécurisés »), et le
    // taire serait précisément l'omission muette que ce lot combat.
    visible: brut.length > 0,
  };
}

// Filtre EFFECTIF : si l'utilisateur est sur « Divers » et que la rubrique devient vide (changement
// d'édition, synchro), il ne doit pas rester bloqué devant une pastille qui n'existe plus. On retombe
// sur « Tous ». UN SEUL prédicat pour l'OFFRE (la pastille) et pour le RENDU (la vue) — cf. F2.
export function filtreEffectif(filtre, diversVisible) {
  const f = estObjet(filtre) ? filtre : { type: 'all' };
  if (f.type === 'divers' && !diversVisible) return { type: 'all' };
  return f;
}

// PORTE PRT_SOUPA — 14 éditions consécutives observées avant d'envisager une suppression de « Divers ».
// Le journal est une liste [{ date, n }] tenue localement (prefs.noterSoupape). Cette fonction ne
// SUPPRIME rien et n'AUTORISE rien : elle dit où en est l'observation, pour que la décision soit prise
// sur une mesure et non sur une impression.
export const SEUIL_SOUPAPE = 14;
export function analyserSoupape(journal, seuil = SEUIL_SOUPAPE) {
  const j = (Array.isArray(journal) ? journal : []).filter((e) => estObjet(e) && chaine(e.date));
  const tri = [...j].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let consecutivesVides = 0;
  for (let i = tri.length - 1; i >= 0; i--) {
    if (nombre(tri[i].n) === 0) consecutivesVides++;
    else break;
  }
  return {
    editionsObservees: tri.length,
    consecutivesVides,
    seuil,
    // PRÉCONDITION, pas autorisation : la porte reste humaine.
    preconditionAtteinte: consecutivesVides >= seuil,
    derniere: tri.length ? tri[tri.length - 1] : null,
  };
}
