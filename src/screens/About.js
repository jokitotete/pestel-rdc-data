import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Constants from 'expo-constants';
import { C, TYPE, SP, RADIUS } from '../theme';
import { Card, Icon } from '../ui';

// « À propos » (TCK-015) — ouverte par le « ? » de l'en-tête. Version, à propos, nouveautés de la version,
// contact, et mentions réglementaires. Contenu RÉGLEMENTAIRE rédigé par POL_JURID : synthétique et DÉFENDABLE
// — on affirme l'éditeur, l'absence de données personnelles, la nature des sources ; on n'affirme PAS une
// conformité à un texte non vérifié (Code du numérique RDC = TCK-005, à confirmer au J.O.).
const VERSION = (Constants.expoConfig && Constants.expoConfig.version) || '1.4.0';
const CONTACT = 'j.okitotete@2id.consulting';

// ATTENTION — CETTE LISTE EST DATÉE PAR SON TITRE (« NOUVEAUTÉS · v » + VERSION, plus bas). Elle suit donc
// AUTOMATIQUEMENT le numéro de version : la laisser en l'état lors d'une montée de version transforme un
// changelog périmé en AFFIRMATION FAUSSE. C'est exactement ce qui s'est produit au passage 1.4.0 → 1.5.0
// (les sept nouveautés de la v1.4 se sont retrouvées annoncées comme celles de la v1.5). Règle : toute
// montée de version met cette liste à jour, et n'y inscrit QUE ce qui a été constaté à l'écran sur le
// build livré — pas ce qui a été codé, pas ce qui est prévu.
const NOUVEAUTES = [
  'La section « Captées » écrit désormais la FENÊTRE du fil (« fil du 2 au 22 juillet 2026 · 21 jours couverts ») : la portée de ce que vous lisez est lisible, et les captées non affichées ne sont plus annoncées comme datant d’« aujourd’hui ».',
  '« Aujourd’hui » ne s’écrit plus que le jour même. Une édition qui est la plus récente sans être celle du jour est présentée comme « Dernière édition », avec sa date.',
  'Une information que le moteur n’a pas su trancher n’est plus dite « classée » : la carte écrit « le moteur penche vers <axe> · pas assez sûr pour trancher ».',
  'La confiance affichée ne peut plus s’arrondir jusqu’à la valeur du seuil : une information sous le seuil se lit toujours sous le seuil.',
  'Le compteur de la rubrique « Divers » se met à jour après une synchronisation, au lieu de rester figé sur le compte des données embarquées.',
];

const MENTIONS = [
  ['Éditeur', '2iD Consulting — Kinshasa, République démocratique du Congo.'],
  ['Nature du service', 'Outil de veille et d’agrégation d’information publique. Les analyses sont produites à partir de sources publiques, citées et datées. Information fournie à titre indicatif ; elle ne constitue pas un conseil.'],
  ['Données personnelles', 'Ntongo ne crée aucun compte et ne collecte aucune donnée personnelle. Vos favoris, sujets suivis et préférences restent sur votre appareil.'],
  ['Sources & liens externes', 'Les liens renvoient vers des sites officiels tiers, dont Ntongo n’édite pas le contenu et n’est pas responsable. Le domaine de destination est affiché avant toute ouverture.'],
  ['Propriété intellectuelle', 'Les contenus tiers demeurent la propriété de leurs éditeurs ; ils sont cités avec attribution.'],
];

const Section = ({ title, children }) => (
  <View style={{ marginBottom: SP.lg }}>
    <Text style={[TYPE.overline, { color: C.inkMut, marginBottom: SP.sm, marginLeft: SP.hair }]}>{title}</Text>
    {children}
  </View>
);

const Bullet = ({ children }) => (
  <View style={{ flexDirection: 'row', gap: SP.sm, marginBottom: SP.sm }}>
    <Text style={[TYPE.bodySm, { color: C.gold }]}>•</Text>
    <Text style={[TYPE.bodySm, { color: C.inkDim, flex: 1 }]}>{children}</Text>
  </View>
);

export default function About() {
  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}>
      {/* Identité + version */}
      <Card style={{ marginBottom: SP.lg, alignItems: 'center' }}>
        <Text style={[TYPE.cardTitle, { color: C.ink }]}>Ntongo <Text style={{ color: C.cobalt }}>· RDC News</Text></Text>
        <Text style={[TYPE.caption, { color: C.inkMut, marginTop: SP.xs }]}>version {VERSION}</Text>
        <Text style={[TYPE.caption, { color: C.inkMut }]}>2iD Consulting</Text>
      </Card>

      <Section title="À PROPOS">
        <Text style={[TYPE.bodySm, { color: C.inkDim }]}>
          Ntongo · RDC News est une veille quotidienne sur la République démocratique du Congo, organisée
          par la grille PESTEL. Chaque fait porte sa fiabilité (« établi » ou « à confirmer ») et sa source,
          notée de A à D. La RDC qui vous concerne, chaque jour.
        </Text>
      </Section>

      <Section title={'NOUVEAUTÉS · v' + VERSION}>
        {NOUVEAUTES.map((t, i) => <Bullet key={i}>{t}</Bullet>)}
      </Section>

      <Section title="CONTACT">
        {/* Contact = valeur codée en dur (FIABLE) : ouverture directe via Linking. Le contrôle confirmOpenURL
            est réservé aux liens https issus de la donnée NON FIABLE — un mailto y serait rejeté (allowlist https). */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('mailto:' + CONTACT).catch(() => {})}
          accessibilityRole="link" accessibilityLabel={'Écrire à ' + CONTACT}
          style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
          <Icon name="link" size={14} color={C.cobalt} />
          <Text style={[TYPE.bodySm, { color: C.cobalt }]}>{CONTACT}</Text>
        </TouchableOpacity>
      </Section>

      <Section title="MENTIONS & DONNÉES">
        {MENTIONS.map(([t, d], i) => (
          <View key={i} style={{ marginBottom: SP.md }}>
            <Text style={[TYPE.label, { color: C.ink, marginBottom: SP.xs2 }]}>{t}</Text>
            <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{d}</Text>
          </View>
        ))}
      </Section>

      <Text style={[TYPE.caption, { color: C.inkMut, textAlign: 'center', marginTop: SP.sm }]}>
        © 2026 2iD Consulting — Ntongo · RDC News
      </Text>
    </ScrollView>
  );
}
