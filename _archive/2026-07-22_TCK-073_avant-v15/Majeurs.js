import React from 'react';
import { Text, View } from 'react-native';
import { C, SP, TYPE, RADIUS } from '../theme';
import { Card, SectionHead, NewsCard, Rule } from '../ui';
import { primarySource } from '../store';
import { selectionnerMajeurs } from '../majeurs';

// ═══════════════════════════════════════════════════════════════════════════════
// LOT-I — LES SUJETS MAJEURS D'UN AXE, D'UNE RUBRIQUE OU D'UN SECTEUR
// ═══════════════════════════════════════════════════════════════════════════════
// Ce composant ne DÉCIDE rien : tout le calcul vit dans src/majeurs.js (une seule implémentation, partagée
// avec les tests). Il REND, et il rend exactement trois choses :
//   1. les 1 à 3 sujets DÉSIGNÉS majeurs, dans l'ordre de leur RANG DÉSIGNÉ ;
//   2. le MOTIF de chaque désignation — c'est lui qui rend la décision auditable par le lecteur, et son
//      absence est AVOUÉE plutôt que comblée ;
//   3. la TRACE de ce que le plafond de 3 a écarté (famille TCK-050 : aucun « slice » muet).
//
// ET IL NE REND RIEN DU TOUT quand personne n'a désigné. C'est le point le plus important de ce lot :
// « 0 majeur → on n'affiche RIEN, et c'est un état NORMAL, pas une erreur. » Pas de bloc vide, pas de
// message d'excuse, pas de « bientôt » — un en-tête suivi de rien serait une promesse non tenue (porte
// PRT_SINCE, cf. LOT-G), et un repêchage serait un mineur promu (interdit par la règle produit).
//
// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION 2 — LA VACANCE MOTIVÉE ÉTAIT INAFFICHABLE (défaut trouvé par le contrôle adversarial v4)
// ═══════════════════════════════════════════════════════════════════════════════
// CE QUI ÉTAIT ÉCRIT ICI, ET QUI ÉTAIT FAUX : `if (s.affiches.length === 0) return null;` était placé
// AVANT toute lecture de `s.vacance`. Les deux états rendaient donc EXACTEMENT la même chose — RIEN :
//   · 'vacance_motivee' — la rédaction A TRANCHÉ : aucun sujet de cet axe n'est majeur, et elle écrit
//     POURQUOI. C'est une DÉCISION ÉDITORIALE, c'est-à-dire de l'information ;
//   · 'non_designe'     — personne n'a tranché. Il n'y a rien à dire, et rien ne doit être dit.
// Le mécanisme de vacance avait été livré comme tenant la règle D-11 (« une vacance non expliquée est un
// orphelin ») alors qu'AUCUN écran ne savait la montrer : c'était une SURVENTE, corrigée ici.
//
// CE QUE LA CORRECTION NE FAIT PAS : elle n'invente aucun message pour 'non_designe'. Fabriquer une
// phrase là où personne n'a rien décidé serait exactement le défaut que le pilote a commis (enrichir =
// fabriquer). Un axe non désigné continue donc de rendre `null`.
//
// ÉTAT MESURÉ AU JOUR DE L'ÉCRITURE : 0 fait désigné sur les 248 publiés (18 éditions). Ce composant ne
// rend donc RIEN sur l'application telle qu'elle est livrée aujourd'hui. Ce n'est pas un défaut : désigner
// est un acte éditorial de SKL_REDAC qui n'a pas encore eu lieu. Le mécanisme est là, éprouvé sur des
// éditions de test ; la désignation viendra avec la re-curation (LOT-M).

// Rang affiché en toutes lettres. Un majeur SANS rang lisible (anomalie que le moteur refuse mais que
// l'application peut recevoir) le DIT au lieu d'afficher « rang null » ou, pire, d'inventer un numéro.
const libelleRang = (rang) => (rang === null || rang === undefined ? 'rang non attribué' : 'rang ' + rang);

// Complément de nom du conteneur. UN SEUL exemplaire, consommé par la branche « majeurs » ET par la
// branche « vacance » : dédoubler la phrase, c'est la classe de défaut F2 de ce dépôt (deux surfaces, deux
// règles écrites deux fois, qui divergent au premier changement).
const complementGenre = (genre) =>
  (genre === 'secteur' ? 'du secteur' : genre === 'rubrique' ? 'de la rubrique' : 'de l’axe');

// Statut d'une désignation de VACANCE, dit tel quel. Trois valeurs possibles, TROIS phrases distinctes —
// et surtout : `statut` absent ne se lit PAS « proposée ». « Non transmis » est un aveu, « proposée » est
// une affirmation sur un acte éditorial ; les confondre serait fabriquer.
const MENTION_STATUT = { proposee: 'PROPOSÉE · NON VALIDÉE', absent: 'STATUT NON TRANSMIS' };
const mentionStatut = (statut) => (statut === 'validee' ? null : (statut === 'proposee' ? MENTION_STATUT.proposee : MENTION_STATUT.absent));

/**
 * LA VACANCE MOTIVÉE, RENDUE — état 'vacance_motivee' du modèle.
 *
 * Ce bloc n'existe que si la donnée porte À LA FOIS une `designationVacance` LISIBLE et un MOTIF non vide
 * (c'est `selectionnerMajeurs` qui l'établit, pas ce composant). Il n'affirme donc rien qui ne soit écrit
 * dans l'édition : il rend le motif TEL QUEL, préfixé de son étiquette, et il dit le STATUT de la décision.
 *
 * IL N'EST PAS INTERACTIF, À DESSEIN : il n'y a pas de « dossier de la vacance » à ouvrir. Une cible
 * tactile qui n'ouvre rien serait une promesse de plus (porte PRT_SINCE). Zéro pressable ⇒ aucune cible
 * sous 44 px ne peut y apparaître ; c'est VÉRIFIÉ par __tests__/vacance.render.test.js et non supposé.
 *
 * JETONS UNIQUEMENT (porte PRT_DSYST) : aucune couleur ni aucun espacement en dur. Les paires de couleurs
 * employées ici — goldText sur panel, inkDim sur panel, ink/inkMut sur bg — sont MESURÉES AA dans les deux
 * thèmes par __tests__/contrast.test.js (bloc « CORRECTION 2 »), jamais jugées à l'œil.
 */
function VacanceMotivee({ vacance, label = '', genre = 'axe', compact = false }) {
  const mention = mentionStatut(vacance.statut);
  const ou = complementGenre(genre);
  // Une seule composition de phrase, réutilisée pour l'ŒIL et pour le LECTEUR D'ÉCRAN : ce qui est lu à
  // voix haute est exactement ce qui est affiché (cf. LOT-G, où une promesse cachée dans un
  // accessibilityLabel aurait été la pire des deux).
  const titre = 'Aucun sujet majeur';
  const explique = `Aucun sujet ${ou} « ${label} » n’a été désigné majeur. La rédaction l’a DÉCIDÉ et l’a motivé — ce n’est pas une absence de désignation.`;
  const ligneMotif = `Motif de la vacance : ${vacance.motif}`;
  return (
    <View
      style={{ marginBottom: compact ? SP.md : SP.xl }}
      accessible
      accessibilityLabel={[titre + '.', explique, mention ? 'Désignation ' + mention.toLowerCase() + '.' : null, ligneMotif]
        .filter(Boolean).join(' ')}
    >
      <SectionHead title={titre} icon="star" lens={explique} />
      <Card style={{ paddingVertical: SP.md, paddingHorizontal: SP.md2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm }}>
          <Text style={[TYPE.overline, { color: C.goldText }]}>VACANCE DÉSIGNÉE</Text>
          {/* Le statut n'est affiché QUE lorsqu'il n'est pas « validée » : une décision tranchée n'a pas
              besoin d'être qualifiée, une décision non tranchée si. */}
          {mention ? (
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.hair }}>
              <Text style={[TYPE.overline, { color: C.goldText }]}>{mention}</Text>
            </View>
          ) : null}
        </View>
        <Rule style={{ marginVertical: SP.sm }} />
        <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{ligneMotif}</Text>
      </Card>
    </View>
  );
}

/**
 * @param {Array}  items    les faits du conteneur (axe, rubrique ou secteur)
 * @param {string} label    son libellé, tel qu'il est affiché ailleurs à l'écran
 * @param {object} porteur  l'objet d'axe s'il en existe un (il peut porter une `designationVacance`)
 * @param {string} genre    « axe » | « rubrique » | « secteur » — pour écrire la bonne phrase
 * @param {func}   onOpen   ouverture du dossier
 */
export function MajeursSection({ items = [], label = '', porteur = null, genre = 'axe', onOpen, ed, compact = false }) {
  const s = selectionnerMajeurs(items, { porteur });

  // ── LES TROIS ÉTATS, DISTINGUÉS ─────────────────────────────────────────────
  // L'état vient du MODÈLE (src/majeurs.js), il n'est pas re-déduit ici : `etat === 'designe'` équivaut à
  // `affiches.length > 0`, mais c'est le modèle qui en décide, pas l'écran. Deux règles écrites deux fois
  // = classe F2. On lit donc `s.etat`, et rien d'autre.
  if (s.etat === 'vacance_motivee') return <VacanceMotivee vacance={s.vacance} label={label} genre={genre} compact={compact} />;
  // PERSONNE N'A TRANCHÉ : rien à l'écran, et AUCUN message fabriqué. C'est un état normal, pas une erreur.
  if (s.etat !== 'designe') return null;

  const n = s.affiches.length;
  return (
    <View style={{ marginBottom: compact ? SP.md : SP.xl }}>
      <SectionHead
        title={n > 1 ? 'Sujets majeurs' : 'Sujet majeur'}
        icon="star"
        lens={`${n} sujet${n > 1 ? 's' : ''} désigné${n > 1 ? 's' : ''} majeur${n > 1 ? 's' : ''} ${
          genre === 'secteur' ? 'du secteur' : genre === 'rubrique' ? 'de la rubrique' : 'de l’axe'
        } « ${label} » · désigné${n > 1 ? 's' : ''} par la rédaction, jamais déduit${n > 1 ? 's' : ''} d’un classement`}
      />

      {s.affiches.map((m, i) => {
        const it = m.item;
        return (
          <View key={(it && it.code) || i} style={{ marginBottom: SP.md }}>
            {/* BANDEAU DE DÉSIGNATION — il dit CE QUE C'EST (un majeur), à QUEL RANG, et avec quel STATUT.
                `goldText` sur `panel` est une paire mesurée AA dans les deux thèmes (contrast.test.js). */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.xs2, marginLeft: SP.hair }}>
              <Text style={[TYPE.overline, { color: C.goldText }]}>
                {`SUJET MAJEUR · ${libelleRang(m.rang).toUpperCase()}`}
              </Text>
              {/* Une désignation PROPOSÉE n'a pas été tranchée par la rédaction : elle n'est pas cachée
                  (la cacher serait une omission muette), elle est QUALIFIÉE. */}
              {!m.validee ? (
                <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.hair }}>
                  <Text style={[TYPE.overline, { color: C.goldText }]}>PROPOSÉE · NON VALIDÉE</Text>
                </View>
              ) : null}
            </View>

            <NewsCard
              axis={it && it.axis}
              rank={m.rang === null || m.rang === undefined ? null : (m.rang < 10 ? '0' : '') + m.rang}
              title={it && it.title}
              text={it && it.text}
              reliability={it && it.reliability}
              cta="Approfondir"
              source={ed ? primarySource(ed, it) : null}
              onPress={() => onOpen && it && it.code && onOpen(it.code)}
              titleLines={3}
            />

            {/* LE MOTIF — c'est lui qui fait la différence entre une désignation et une case cochée. Son
                absence est un AVEU affiché, jamais un motif inventé (même doctrine que « confiance non
                transmise » sur la carte N1). */}
            <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: -SP.xs, paddingLeft: SP.md2 }}>
              <View style={{ width: 2, backgroundColor: C.border2, borderRadius: RADIUS.xs }} />
              <Text style={[TYPE.caption, { color: m.motif ? C.inkMut : C.goldText, flex: 1 }]}>
                {m.motif ? `Motif de la désignation : ${m.motif}` : 'Motif de la désignation non transmis.'}
              </Text>
            </View>
          </View>
        );
      })}

      {/* CE QUI N'EST PAS MONTRÉ — le plafond de 3 est une règle produit, pas une coupure discrète.
          Sans ce bloc, un 4ᵉ sujet désigné majeur disparaîtrait sans laisser de trace : c'est exactement
          la famille de défauts TCK-004 / TCK-050 que ce dépôt paie depuis le début. */}
      {s.ecartes.length ? (
        <Card style={{ paddingVertical: SP.md, paddingHorizontal: SP.md2, marginBottom: SP.sm }}>
          <Text style={[TYPE.bodySm, { color: C.goldText }]}>
            {`${s.ecartes.length} sujet${s.ecartes.length > 1 ? 's' : ''} désigné${s.ecartes.length > 1 ? 's' : ''} majeur${s.ecartes.length > 1 ? 's' : ''} au-delà du plafond de ${s.max} : affiché${s.ecartes.length > 1 ? 's' : ''} nulle part, compté${s.ecartes.length > 1 ? 's' : ''} ici.`}
          </Text>
          <Rule style={{ marginVertical: SP.sm }} />
          {s.ecartes.map((e, i) => (
            <Text key={i} style={[TYPE.caption, { color: C.inkMut, marginBottom: SP.hair }]} numberOfLines={2}>
              {`· ${e.titre || '(sans titre)'} — ${libelleRang(e.rang)}`}
            </Text>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

export default MajeursSection;
