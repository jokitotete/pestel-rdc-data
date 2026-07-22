// ═══════════════════════════════════════════════════════════════════════════════
// LOT-I — « 1 À 3 SUJETS MAJEURS PAR AXE, RUBRIQUE ET SECTEUR »
// ═══════════════════════════════════════════════════════════════════════════════
// RÈGLE PRODUIT DU COMMANDITAIRE, MOT POUR MOT : « 3 max, sinon rien, JAMAIS un mineur ».
//
// ET LA RÈGLE QUI COMMANDE CELLE-LÀ — ARBITRAGE D-11 :
//   « la classe fait MAJEUR se DÉSIGNE, elle ne se déduit JAMAIS d'une position dans une liste. »
//
// CE QUE CELA INTERDIT ICI, CONCRÈTEMENT. Ce module N'A PAS le droit d'écrire, ni de faire écrire :
//   · `items[0]`, `items.slice(0, 3)` sur la liste d'entrée — « premier de l'axe » est une POSITION ;
//   · un tri par fraîcheur, par fiabilité, par nombre de sources, par longueur — ce sont des DÉDUCTIONS ;
//   · un repêchage du « meilleur des non-désignés » quand il manque un majeur — c'est un MINEUR promu.
// La mesure du collecteur dit pourquoi : lue mécaniquement (« premier item de chaque axe »), la règle
// classait 136 des 248 faits publiés en classe (a) — 54,8 % du corpus — rendant la médiane visée de
// ~775 c arithmétiquement inatteignable et commandant une rallonge sur 74 faits à source unique,
// c'est-à-dire une FABRICATION.
//
// CE MODULE NE FAIT DONC QU'UNE CHOSE : IL LIT. Le seul critère de candidature est
// `item.designation.majeur === true`, écrit dans la donnée par la rédaction (TCK-102). Aucune fonction
// ici ne fabrique une désignation. Sur les 18 éditions publiées (248 faits), le compte MESURÉ est 0 : ce
// module n'affichera donc RIEN aujourd'hui, et c'est le résultat CORRECT — pas une panne.
//
// POURQUOI UN MODULE PUR, SANS REACT : même raison que src/n1.js. La classe de défaut F2 de ce dépôt naît
// d'un prédicat dédoublé — la surface qui OFFRE et la surface qui REND suivent deux règles écrites deux
// fois. Ici : UNE implémentation, consommée par les écrans ET par les tests.
//
// MIROIR DE `pestel-collector/lib/designation.js` : la lecture ci-dessous reproduit sa fonction `lire()`.
// Elle est RÉÉCRITE et non importée — les deux dépôts sont séparés, l'application embarque son code et ne
// peut pas dépendre du collecteur au runtime. C'est un COUPLAGE DÉCLARÉ : si le vocabulaire du schéma
// bouge côté moteur, ce fichier doit bouger. Le test __tests__/majeurs.test.js compare les deux
// vocabulaires (rangs, statuts, plafond) contre le module réel du collecteur quand il est présent sur le
// disque, et le DIT quand il ne l'est pas — plutôt que d'affirmer un accord qu'il n'a pas vérifié.

// ── VOCABULAIRE FERMÉ (aligné sur lib/designation.js du moteur) ───────────────
/** Rangs licites. Le corridor D-1 ne connaît que trois places par axe. */
export const RANGS = [1, 2, 3];
/** Plafond DUR de majeurs affichés pour un même axe / rubrique / secteur. « 3 max ». */
export const MAX_MAJEURS = 3;
/** Statuts licites. « proposee » = écrite par un outil ou un brouillon : elle N'ENGAGE PAS la rédaction. */
export const STATUTS = ['validee', 'proposee'];

const estObjet = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const chaine = (x, n = 240) => (typeof x === 'string' ? x.trim().slice(0, n) : '');

/** Ce que vaut un fait dont personne n'a tranché le cas. Forme NEUTRE, jamais « majeur ». */
const NON_DESIGNE = { presente: false, majeur: false, rang: null, motif: null, statut: null, validee: false, lisible: true };

/**
 * LECTURE TOLÉRANTE de la désignation — c'est ELLE le contrat de compatibilité.
 *
 * Un champ absent, nul, ou d'une forme inattendue se lit « non désigné ». Elle ne juge pas, elle ne jette
 * JAMAIS (la donnée vient du JSON distant, NON FIABLE — cf. doctrine de src/acl.js), et elle est la SEULE
 * porte par laquelle l'application lit la désignation : aucun écran n'écrit `item.designation.majeur`.
 *
 * `lisible: false` distingue « rien n'a été écrit » de « quelque chose a été écrit que je ne sais pas
 * lire ». Les deux donnent `majeur: false` — jamais un majeur par accident — mais le second est une
 * ANOMALIE qui doit se compter au lieu de se confondre avec le silence (famille TCK-050).
 */
export function lireDesignation(item) {
  if (!estObjet(item)) return { ...NON_DESIGNE };
  const d = item.designation;
  if (d === undefined || d === null) return { ...NON_DESIGNE };
  if (!estObjet(d)) return { ...NON_DESIGNE, presente: true, lisible: false };
  return {
    presente: true,
    lisible: true,
    // `=== true` et rien d'autre : ni 1, ni 'oui', ni 'true'. Un majeur ne s'obtient pas par coercition.
    majeur: d.majeur === true,
    rang: typeof d.rang === 'number' && RANGS.indexOf(d.rang) >= 0 ? d.rang : null,
    motif: chaine(d.motif, 400) || null,
    statut: STATUTS.indexOf(d.statut) >= 0 ? d.statut : null,
    validee: d.statut === 'validee',
  };
}

/** Idem pour la VACANCE déclarée d'un axe : « 0 majeur » assumé et motivé, qui est une DÉCISION. */
export function lireVacance(porteur) {
  const v = estObjet(porteur) ? porteur.designationVacance : null;
  if (v === undefined || v === null) return { presente: false, motif: null, statut: null, validee: false, lisible: true };
  if (!estObjet(v)) return { presente: true, motif: null, statut: null, validee: false, lisible: false };
  return {
    presente: true,
    lisible: true,
    motif: chaine(v.motif, 400) || null,
    statut: STATUTS.indexOf(v.statut) >= 0 ? v.statut : null,
    validee: v.statut === 'validee',
  };
}

// ── ORDRE D'AFFICHAGE ─────────────────────────────────────────────────────────
// Le rang est DÉSIGNÉ, pas déduit : il vient de la donnée. Restent deux cas dégradés que le validateur du
// moteur REFUSE mais que l'application, elle, peut recevoir (donnée distante non fiable, ou publiée par
// une version antérieure du linter) : un majeur SANS rang lisible, et deux majeurs de MÊME rang.
//
// On ne les jette pas (ce serait une troncature muette), on ne les réordonne pas selon un critère inventé
// (ce serait une déduction). On les place APRÈS les rangs lisibles, dans l'ORDRE DE LA SOURCE — c'est-à-
// dire sans rien ajouter à ce que la donnée dit —, et l'anomalie est COMPTÉE et RENDUE dans `anomalies`.
const ordonner = (candidats) => {
  const avec = [], sans = [];
  for (const c of candidats) (c.designation.rang === null ? sans : avec).push(c);
  // Tri STABLE sur le seul rang désigné. Deux rangs égaux gardent leur ordre d'entrée (Array.prototype.sort
  // est stable depuis ES2019 ; Hermes l'est aussi) : aucune hiérarchie n'est fabriquée entre eux.
  avec.sort((a, b) => a.designation.rang - b.designation.rang);
  return avec.concat(sans);
};

/**
 * SÉLECTION DES SUJETS MAJEURS d'UN conteneur (un axe, une rubrique, un secteur).
 *
 * @param {Array} items  les faits du conteneur, dans leur ordre d'origine (jamais utilisé comme critère)
 * @param {object} [opts]
 *   @param {number}  [opts.max=MAX_MAJEURS]  plafond dur ; 3 par la règle produit
 *   @param {object}  [opts.porteur]          l'objet d'axe, s'il porte une `designationVacance`
 * @returns {{
 *   affiches: Array,      // les faits à AFFICHER, 0 à `max`. Jamais un mineur, jamais un repêché.
 *   candidats: number,    // combien de faits portent designation.majeur === true
 *   ecartes: Array,       // ceux qui dépassaient le plafond : COMPTÉS et NOMMÉS, jamais effacés
 *   etat: string,         // 'designe' | 'vacance_motivee' | 'non_designe'
 *   vacance: object,      // la vacance lue (motif, statut) — pour l'appelant qui voudrait la rendre
 *   anomalies: object,    // {sansRang, rangsEnDouble, illisibles} — l'écart au schéma, compté
 *   proposees: number,    // majeurs affichés dont la désignation n'est PAS validée par la rédaction
 *   max: number,
 * }}
 *
 * AUCUN REPÊCHAGE, AUCUN GARNISSAGE : si `candidats` vaut 0, `affiches` vaut []. La fonction ne regarde
 * même pas les autres faits — ils ne sont pas des candidats moins bons, ils ne sont pas des candidats.
 */
export function selectionnerMajeurs(items, opts = {}) {
  const max = Number.isFinite(opts.max) && opts.max >= 0 ? opts.max : MAX_MAJEURS;
  const liste = (Array.isArray(items) ? items : []).filter(estObjet);

  let illisibles = 0;
  const candidats = [];
  for (const it of liste) {
    const d = lireDesignation(it);
    if (!d.lisible) illisibles++;
    if (d.majeur) candidats.push({ item: it, designation: d });
  }

  const ordonnes = ordonner(candidats);
  const affiches = ordonnes.slice(0, max);
  // TCK-050 — ce que le plafond retire est NOMMÉ, avec son motif. Un « slice » muet est la famille de
  // défauts la plus fréquente de ce projet ; il n'y en aura pas un de plus ici.
  const ecartes = ordonnes.slice(max).map((c) => ({
    item: c.item,
    titre: chaine(c.item.title, 240),
    rang: c.designation.rang,
    motif: `plafond de ${max} sujets majeurs par axe atteint (règle produit : « 3 max, sinon rien »)`,
  }));

  const vacance = lireVacance(opts.porteur);
  const vacanceValable = vacance.presente && vacance.lisible && !!vacance.motif;
  const etat = affiches.length ? 'designe' : (vacanceValable ? 'vacance_motivee' : 'non_designe');

  // Rangs attribués deux fois : anomalie de schéma, comptée sur les CANDIDATS (pas sur les seuls affichés,
  // sinon le plafond masquerait le doublon).
  const vus = new Map();
  let rangsEnDouble = 0;
  for (const c of ordonnes) {
    const r = c.designation.rang;
    if (r === null) continue;
    if (vus.has(r)) rangsEnDouble++; else vus.set(r, true);
  }

  return {
    affiches: affiches.map((c) => ({
      item: c.item,
      titre: chaine(c.item.title, 240),
      rang: c.designation.rang,
      motif: c.designation.motif,
      statut: c.designation.statut,
      validee: c.designation.validee,
    })),
    candidats: candidats.length,
    ecartes,
    etat,
    vacance,
    anomalies: {
      sansRang: candidats.filter((c) => c.designation.rang === null).length,
      rangsEnDouble,
      illisibles,
    },
    proposees: affiches.filter((c) => !c.designation.validee).length,
    max,
  };
}

/**
 * MÊME sélection, mais sur un GROUPE de conteneurs (tous les axes d'une édition, par exemple).
 * Rendue disponible parce que la règle est « par axe » : appliquer le plafond de 3 à un corpus entier
 * plutôt qu'axe par axe serait une autre règle, et une règle fausse.
 */
export function selectionnerParConteneur(conteneurs, opts = {}) {
  return (Array.isArray(conteneurs) ? conteneurs : []).filter(estObjet).map((c) => ({
    cle: typeof c.cle === 'string' ? c.cle : (typeof c.key === 'string' ? c.key : '?'),
    label: chaine(c.label, 80),
    selection: selectionnerMajeurs(c.items, { ...opts, porteur: c.porteur || c }),
  }));
}
