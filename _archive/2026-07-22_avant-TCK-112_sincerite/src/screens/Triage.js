import React from 'react';
import { Text, View } from 'react-native';
import { C, SP, TYPE } from '../theme';
import { Card, Icon, Rule, N1Card, BlocVide } from '../ui';
import { confirmOpenURL, isSafeUrl } from '../safeUrl';
import { normaliserN1, instrumenterDivers } from '../n1';

// « Divers » — LA SOUPAPE (lot-H). Elle recueille les informations CAPTÉES que le moteur n'a pas su
// classer. Elle n'est pas un tapis sous lequel on pousse : c'est une soupape SURVEILLÉE.
//
// TROIS RÈGLES, et la troisième est celle qu'on oublie toujours :
//   1. MASQUÉE quand elle est vide — l'offre (la pastille, dans Home/Axes) et le rendu (ici) partagent
//      le MÊME prédicat `instrumenterDivers(...).visible`. Jamais deux règles pour une seule vérité.
//   2. INSTRUMENTÉE — un compteur dit CE QUI y tombe (combien, de quelles sources) et POURQUOI (motif).
//      Sans compteur, une soupape redevient invisible en trois éditions et personne ne la regarde plus.
//   3. NON SUPPRIMÉE — la porte PRT_SOUPA exige 14 éditions consécutives OBSERVÉES avant d'envisager
//      sa suppression. L'observation est enregistrée par prefs.noterSoupape / n1.analyserSoupape.
//
// HONNÊTETÉ SUR LE MOTIF : le fil publié aujourd'hui ne transmet PAS de motif de non-classement
// (publish.js projette 4 champs pour le triage : title/url/source/publishedAt). Le compteur affiche
// donc « motif non transmis » — un aveu affiché, pas un motif inventé.

// Nombre de sources DÉTAILLÉES dans le compteur. Ce qui dépasse est COMPTÉ et ÉCRIT, jamais coupé en
// silence — c'est la règle du dépôt depuis TCK-050, y compris pour un simple « top 5 ».
const CAP_SOURCES = 5;

export function DiversList({ items = [], stats }) {
  // `stats` est calculé par l'écran appelant (un seul calcul par rendu) ; recalculé ici en repli pour
  // que le composant reste utilisable seul et ne dépende pas d'un appelant discipliné.
  const s = stats || instrumenterDivers(items, { urlSure: isSafeUrl });
  const vues = (Array.isArray(items) ? items : [])
    .filter((f) => f && f.title && isSafeUrl(f.url))
    .map((f) => normaliserN1(f));

  // Vide → la vue ne devrait même pas être atteignable (la pastille est masquée). Si elle l'est
  // malgré tout (course entre une synchro et un rendu), on le dit au lieu d'afficher une page morte.
  if (s.total === 0) {
    return (
      <BlocVide texte={'Aucune information non classée dans cette collecte.\nLa rubrique « Divers » n’est proposée que lorsqu’elle a du contenu.'} />
    );
  }

  return (
    <View>
      {/* COMPTEUR DE LA SOUPAPE — ce qui y tombe, et pourquoi. */}
      <Card style={{ padding: SP.md2, marginBottom: SP.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginBottom: SP.sm }}>
          <Icon name="triage" size={14} color={C.inkDim} />
          <Text style={[TYPE.label, { color: C.ink, flex: 1 }]}>Soupape surveillée</Text>
          <Text style={[TYPE.mono, { color: C.inkDim }]}>{`${s.total} captée${s.total > 1 ? 's' : ''}`}</Text>
        </View>
        <Text style={[TYPE.caption, { color: C.inkMut }]}>
          {`${vues.length} affichée${vues.length > 1 ? 's' : ''}`}
          {s.nonOuvrables ? ` · ${s.nonOuvrables} lien${s.nonOuvrables > 1 ? 's' : ''} non sécurisé${s.nonOuvrables > 1 ? 's' : ''} (http)` : ''}
          {s.sansTitre ? ` · ${s.sansTitre} sans titre` : ''}
        </Text>

        <Rule style={{ marginVertical: SP.sm2 }} />
        <Text style={[TYPE.overline, { color: C.inkMut, marginBottom: SP.xs }]}>POURQUOI ELLES SONT ICI</Text>
        {s.parMotif.map((m) => (
          <View key={m.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.hair }}>
            <Text style={[TYPE.caption, { color: C.inkDim, flex: 1 }]} numberOfLines={1}>{m.cle}</Text>
            <Text style={[TYPE.mono, { color: C.inkMut }]}>{m.n}</Text>
          </View>
        ))}

        <Rule style={{ marginVertical: SP.sm2 }} />
        <Text style={[TYPE.overline, { color: C.inkMut, marginBottom: SP.xs }]}>D’OÙ ELLES VIENNENT</Text>
        {/* PLAFOND DÉCLARÉ : on montre les 5 premières sources et on ÉCRIT combien restent (famille
            TCK-050 — un « top 5 » muet est une troncature muette de plus). */}
        {s.parSource.slice(0, CAP_SOURCES).map((x) => (
          <View key={x.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.hair }}>
            <Text style={[TYPE.caption, { color: C.inkDim, flex: 1 }]} numberOfLines={1}>{x.cle}</Text>
            <Text style={[TYPE.mono, { color: C.inkMut }]}>{x.n}</Text>
          </View>
        ))}
        {s.parSource.length > CAP_SOURCES ? (
          <Text style={[TYPE.caption, { color: C.inkMut, marginTop: SP.xs }]}>
            {`+ ${s.parSource.length - CAP_SOURCES} autre${s.parSource.length - CAP_SOURCES > 1 ? 's' : ''} source${s.parSource.length - CAP_SOURCES > 1 ? 's' : ''} non détaillée${s.parSource.length - CAP_SOURCES > 1 ? 's' : ''} ici.`}
          </Text>
        ) : null}
      </Card>

      {/* Les captées elles-mêmes — MÊME carte N1 que « Captées » : c'est le même étage d'information,
          il n'y a aucune raison de le peindre autrement selon la rubrique où on le regarde. */}
      {vues.length === 0
        ? <BlocVide texte={'Aucune de ces captées n’a de lien ouvrable (https).\nElles sont comptées ci-dessus, jamais effacées.'} />
        : vues.map((v, i) => <N1Card key={`${v.url}|${i}`} vue={v} onPress={() => confirmOpenURL(v.url)} />)}
    </View>
  );
}
