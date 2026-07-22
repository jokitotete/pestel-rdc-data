// ─────────────────────────────────────────────────────────────────────────────
// LOT-G — LA COPIE PARTAGÉE, ET LA PORTE PRT_SINCE
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI CE MODULE EXISTE
// Deux écrans — « À la une » (Home) et « Axes » — affichaient MOT POUR MOT les mêmes deux phrases d'état
// vide, écrites deux fois. C'est la signature exacte de la classe de défaut F2 de ce dépôt (un prédicat, ou
// ici une promesse, dédoublé) : on en corrige une, l'autre survit et continue de dire au lecteur ce qu'on
// vient précisément de décider de ne plus lui dire. Une phrase affichée au lecteur est un CONTRAT ; un
// contrat n'a qu'un exemplaire.
//
// LA PORTE PRT_SINCE, EN UNE LIGNE : aucune promesse affichée qui ne soit tenue.
// Le test correspondant (__tests__/lotG.sincerite.test.js) RENDA les écrans et refuse tout futur promis —
// il ne relit pas ce fichier, il regarde ce qui sort à l'écran.
//
// CE QUI A ÉTÉ RETIRÉ, ET SUR QUELLE MESURE
//   1. « Rubrique couverte à partir des prochaines veilles. »
//      Promesse d'avenir qu'aucun composant de la chaîne ne peut tenir, ET fausse au présent : les
//      rubriques SONT couvertes (mesuré sur les 18 éditions embarquées : Culture & Arts 12 faits,
//      Sports 15, Events 6). Ce qui manque, c'est la rubrique dans CETTE édition — cas qui survient une
//      fois sur deux (MESURÉ : 28 paires édition×rubrique vides sur 54 = 51,9 %, dans 16 éditions sur 18).
//   2. « Rubrique alimentée par les agendas des prochaines veilles. »
//      Même promesse, même retrait. Les rendez-vous d'Events viennent des agendas des éditions DÉJÀ
//      publiées (store.upcomingEvents balaie EDITIONS[*].agenda ; mesuré : 18 éditions sur 18 en portent un).
//
// CE QUI LES REMPLACE : une description du MÉCANISME OBSERVABLE, au présent. « ne paraît que les jours où
// la veille en rapporte » n'engage aucun avenir — c'est ce que l'application fait, aujourd'hui, et le
// lecteur peut le vérifier en changeant d'édition dans le calendrier.

/** Seconde ligne de l'état vide d'une RUBRIQUE (Culture & Arts, Sports, Events) — commence par un saut de ligne. */
export const NOTE_RUBRIQUE_VIDE = '\nCette rubrique ne paraît que les jours où la veille en rapporte.';

/** État vide de la vue « Events » (rendez-vous à venir agrégés sur 3 semaines). */
export const NOTE_EVENTS_VIDE =
  'Aucun rendez-vous daté sur les 3 prochaines semaines.\nCes rendez-vous proviennent des agendas des éditions déjà publiées.';
