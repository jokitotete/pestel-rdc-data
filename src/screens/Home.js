import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { C, AX, AXT, AX_SHORT, AX_ORDER, RUBRIQUES, tint, SP, TYPE, RADIUS, HIT, isFollowableAxis } from '../theme';
import { Card, SectionHead, Pill, Icon, Rule, AxisGlyph, SectorGlyph, NewsCard, PageHeader, N1Card, BlocVide } from '../ui';
import { allItems, upcomingEvents, primarySource, findItem, followedItems, latestDate } from '../store';
import { SECTORS, itemInSector } from '../sectors';
import { confirmOpenURL, isSafeUrl } from '../safeUrl';
import { DiversList } from './Triage';
import { partitionnerN1, repartitionParAxe, instrumenterDivers, filtreEffectif, CAP_CAPTEES } from '../n1';
import { noterSoupape } from '../prefs';
import { NOTE_RUBRIQUE_VIDE, NOTE_EVENTS_VIDE } from '../copie';
import { MajeursSection } from './Majeurs';

// Groupe de filtres étiqueté (rangée horizontale de pastilles) — identique à « Axes ».
const FilterRow = ({ label, children }) => (
  <>
    <Text style={[TYPE.overline, { color: C.inkMut, marginLeft: SP.hair, marginBottom: SP.sm }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.md2, marginHorizontal: -SP.gutter }} contentContainerStyle={{ paddingHorizontal: SP.gutter, gap: SP.sm }}>
      {children}
    </ScrollView>
  </>
);

// LOT-F — SECTION « CAPTÉES » (étage N1). Anciennement « À traiter ». Le renommage n'est pas cosmétique :
// « à traiter » décrit une INTENTION de la rédaction (on va s'en occuper) ; « captée · non rédigée »
// décrit un ÉTAT VÉRIFIABLE de l'information. Le produit ne promet que ce qu'il peut prouver.
//
// Tout le calcul (plafond, non-ouvrables, statut, mention) vit dans src/n1.js — une seule implémentation,
// partagée avec les tests. Ce composant ne fait que RENDRE.
function CapteesSection({ feed }) {
  const p = partitionnerN1(feed, { cap: CAP_CAPTEES, urlSure: isSafeUrl });
  // Répartition sur TOUS les axes, y compris ceux à 0 : le lecteur voit ce que la collecte n'a PAS
  // rapporté aujourd'hui, pas seulement ce qu'elle a rapporté (blocs vides assumés).
  //
  // ELLE PORTE SUR LE FIL ENTIER (cap: 0), PAS SUR LES 12 CARTES AFFICHÉES. Calculée sur `p.affiches`,
  // elle aurait sommé à 12 sous un en-tête annonçant 30 : le lecteur aurait lu « Politique 10 » comme
  // le compte du jour, alors que c'eût été le compte de ce qui TIENT À L'ÉCRAN. Même famille que
  // TCK-050 — une troncature qui se déguise en total.
  const complet = partitionnerN1(feed, { cap: 0, urlSure: isSafeUrl });
  const repartition = repartitionParAxe(complet.affiches);
  if (!p.sains) return null;
  return (
    <View style={{ marginTop: SP.xl2 }}>
      <SectionHead title="Captées" icon="triage"
        lens={`${p.sains} information${p.sains > 1 ? 's' : ''} captée${p.sains > 1 ? 's' : ''} et triée${p.sains > 1 ? 's' : ''} par le moteur · non rédigée${p.sains > 1 ? 's' : ''}`} />

      {/* Répartition par axe des captées AFFICHÉES — les zéros sont ÉCRITS, pas effacés. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.xs2, marginBottom: SP.md }}>
        {repartition.map((r) => (
          <View key={r.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, backgroundColor: C.panel2, borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.hair }}>
            {r.cle !== '?' ? <AxisGlyph axis={r.cle} size={11} /> : null}
            <Text style={[TYPE.caption, { color: r.n ? C.inkDim : C.inkMut }]}>{`${r.label} ${r.n}`}</Text>
          </View>
        ))}
      </View>

      {p.affiches.map((v, i) => (
        <N1Card key={`${v.url}|${i}`} vue={v} onPress={() => confirmOpenURL(v.url)} />
      ))}

      {/* CE QUI N'EST PAS MONTRÉ — le pied qui rend la phrase « rien n'est écarté en silence » VRAIE.
          Sans lui, 18 captées sur 30 disparaissaient sans trace (QA v1.4). L'arithmétique est désormais
          calculée par n1.partitionnerN1 et vérifiée par __tests__/n1.test.js sur le fil RÉEL. */}
      {p.enPlus || p.nonOuvrables || p.sansTitre ? (
        <Card style={{ paddingVertical: SP.md, paddingHorizontal: SP.md2 }}>
          {p.enPlus ? (
            <Text style={[TYPE.bodySm, { color: C.inkMut }]}>
              {`+ ${p.enPlus} autre${p.enPlus > 1 ? 's' : ''} captée${p.enPlus > 1 ? 's' : ''} aujourd’hui, non affichée${p.enPlus > 1 ? 's' : ''} ici (plafond d’écran : ${p.cap}).`}
            </Text>
          ) : null}
          {p.nonOuvrables ? (
            <Text style={[TYPE.bodySm, { color: C.goldText, marginTop: p.enPlus ? SP.xs : SP.none }]}>
              {`${p.nonOuvrables} captée${p.nonOuvrables > 1 ? 's' : ''} non ouvrable${p.nonOuvrables > 1 ? 's' : ''} : lien non sécurisé (http).`}
            </Text>
          ) : null}
          {p.sansTitre ? (
            <Text style={[TYPE.bodySm, { color: C.goldText, marginTop: SP.xs }]}>
              {`${p.sansTitre} captée${p.sansTitre > 1 ? 's' : ''} sans titre exploitable : comptée${p.sansTitre > 1 ? 's' : ''}, non affichée${p.sansTitre > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

// LOT-F — captées d'UN axe (vue filtrée). BLOC VIDE ASSUMÉ : si cet axe n'a rien capté, on l'écrit.
// On n'affiche JAMAIS ici les captées d'un autre axe pour « remplir » (règle D-11 transposée à l'UI :
// une classe se désigne, elle ne se déduit pas d'une position dans une liste).
function CapteesAxe({ feed, axe, label }) {
  const p = partitionnerN1(feed, { cap: 0, urlSure: isSafeUrl });
  const items = p.affiches.filter((v) => v.axe === axe);
  return (
    <View style={{ marginTop: SP.xl }}>
      <SectionHead title="Captées" icon="triage"
        lens={`${items.length} information${items.length > 1 ? 's' : ''} captée${items.length > 1 ? 's' : ''} et classée${items.length > 1 ? 's' : ''} « ${label} » · non rédigée${items.length > 1 ? 's' : ''}`} />
      {items.length === 0
        ? <BlocVide texte={`Aucune information captée pour « ${label} » dans cette collecte.\nCet axe affiche son vide : il n’emprunte rien à un autre.`} />
        : items.map((v, i) => <N1Card key={`${v.url}|${i}`} vue={v} onPress={() => confirmOpenURL(v.url)} />)}
    </View>
  );
}

// Liste d'items filtrés (axe / rubrique / secteur) — cartes « langage vivant » (NewsCard).
//
// LOT-G · PORTE PRT_SINCE — la seconde ligne promettait « Rubrique couverte à partir des prochaines
// veilles. » : un avenir qu'aucun composant de la chaîne ne peut tenir. Elle vit désormais dans src/copie.js
// (un seul exemplaire pour les DEUX écrans qui l'affichaient — cf. classe F2).
function FilteredList({ items, emptyLabel, isRubrique, onOpen, ed }) {
  if (!items.length) {
    return (
      <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
        {emptyLabel}
        {isRubrique ? NOTE_RUBRIQUE_VIDE : ''}
      </Text>
    );
  }
  return (
    <View>
      {items.map((it) => (
        <NewsCard key={it.code} axis={it.axis} title={it.title} text={it.text}
          reliability={it.reliability} source={primarySource(ed, it)} onPress={() => onOpen(it.code)} titleLines={3} />
      ))}
    </View>
  );
}

// (Bandeau « Votre Une · [secteur] » désormais rendu par le composant PARTAGÉ PageHeader — cf. ui.js.)

// Vue « Events » (rubrique Ev) — rendez-vous à venir agrégés sur 3 semaines (agendas réels, sourcés).
// LOT-G · PRT_SINCE : « alimentée par les agendas des prochaines veilles » → src/copie.js (cf. ci-dessus).
function EventsView({ onOpenEvent }) {
  const events = upcomingEvents(21);
  const Ec = AX.Ev || C.cobalt;
  if (!events.length) {
    return (
      <Text style={[TYPE.bodySm, { color: C.inkMut, paddingVertical: SP.xl, textAlign: 'center' }]}>
        {NOTE_EVENTS_VIDE}
      </Text>
    );
  }
  return (
    <Card style={{ paddingVertical: SP.xs }}>
      {events.map((e, i, arr) => (
        <View key={i}>
          <TouchableOpacity activeOpacity={e.code ? 0.7 : 1} onPress={() => e.code && onOpenEvent && onOpenEvent(e.code, e.edDate)}
            accessibilityRole={e.code ? 'button' : 'text'} accessibilityLabel={e.what}
            style={{ flexDirection: 'row', gap: SP.sm2, paddingVertical: SP.md, paddingHorizontal: SP.md2, alignItems: 'flex-start' }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: tint(Ec, 0.14), borderRadius: RADIUS.sm, paddingHorizontal: SP.sm, paddingVertical: SP.xs, marginTop: SP.hair }}>
              <Text style={[TYPE.mono, { color: AXT.Ev || C.ink }]} numberOfLines={1}>{e.when}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.bodySm, { color: C.inkDim }]}>{e.what}</Text>
              {e.code ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, marginTop: SP.xs2 }}>
                  <Text style={[TYPE.label, { color: AXT.Ev || C.cobalt }]}>voir le dossier</Text>
                  <AxisGlyph axis="Ev" size={12} />
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          {i < arr.length - 1 ? <Rule style={{ marginHorizontal: SP.md2 }} /> : null}
        </View>
      ))}
    </Card>
  );
}

// « À la une » — filtres IDENTIQUES à « Axes » : 3 groupes (Axes PESTEL · Rubriques · Secteurs transversaux).
// Sans filtre (« Tous ») : l'essentiel national + la section « Captées » (N1) + l'agenda.
export default function Home({ ed, onOpen, feed = [], triage = [], onOpenEvent, onRefresh, refreshing, seed, onSeedApplied, follows = [], isFollowing, onToggleFollow }) {
  const [filterBrut, setFilter] = useState({ type: 'all' });   // {type:'all'|'axis'|'sector'|'divers'|'follow', key}
  // RS1-19/20 : applique un filtre semé par un lien croisé (item→axe/secteur), puis le consomme (one-shot).
  useEffect(() => { if (seed && seed.filter) { setFilter(seed.filter); onSeedApplied && onSeedApplied(); } }, [seed]);

  // LOT-H — la soupape « Divers » est INSTRUMENTÉE avant d'être affichée : on sait combien y tombe, d'où
  // ça vient et pourquoi. `visible` pilote À LA FOIS l'offre (la pastille) et le rendu (la vue) : UN SEUL
  // prédicat, pour ne pas recréer le défaut F2 (offrir une rubrique que la vue ne saura pas remplir).
  const divers = useMemo(() => instrumenterDivers(triage, { urlSure: isSafeUrl }), [triage]);
  const filter = filtreEffectif(filterBrut, divers.visible);

  // PORTE PRT_SOUPA — l'observation de la soupape est ENREGISTRÉE (localement, sans compte ni réseau),
  // édition par édition. Sans trace, « 14 éditions consécutives observées » resterait une phrase
  // invérifiable. On ne note QUE l'édition la plus récente : sur une archive, `triage` arrive vide par
  // construction (App.js) et enregistrerait un faux « zéro ».
  useEffect(() => {
    if (ed && ed.date && ed.date === latestDate()) noterSoupape(ed.date, divers.total);
  }, [ed && ed.date, divers.total]);

  const sector = filter.type === 'sector' ? SECTORS.find((s) => s.key === filter.key) : null;

  const items = filter.type === 'axis'
    ? allItems(ed).filter((it) => it.axis === filter.key)
    : filter.type === 'sector'
      ? allItems(ed).filter((it) => itemInSector(it, sector))
      : [];

  const activeLabel = filter.type === 'sector' ? (sector && sector.label) : filter.type === 'axis' ? AX_SHORT[filter.key] : null;
  const isRubrique = filter.type === 'axis' && RUBRIQUES.indexOf(filter.key) >= 0;
  const isEvents = filter.type === 'axis' && filter.key === 'Ev';

  // En-tête de page (bandeau cobalt unifié) : CONTEXTE de l'écran, SANS fraîcheur (déjà dans l'en-tête Ntongo)
  // ni compteur technique (retours user). Le secteur porte son glyphe ; sinon kicker « Édition/Axe/Rubrique ».
  const header = filter.type === 'sector'
    ? { eyebrow: 'Votre Une', title: sector ? sector.label : 'Secteur', subtitle: 'les faits qui comptent aujourd’hui', sector: true }
    : filter.type === 'divers'
      ? { eyebrow: 'Votre Une', title: 'Divers', subtitle: 'captées que le moteur n’a pas classées' }
      : filter.type === 'follow'
        ? { eyebrow: 'Votre Une', title: 'Pour vous', subtitle: 'les axes, rubriques, et secteurs que vous suivez' }
        : filter.type === 'axis'
          // TCK-021/022/023 : « Votre Une » + logo pour tout filtre actif (axe/rubrique) ; Events garde sa vue.
          ? { eyebrow: isEvents ? 'Axe PESTEL' : 'Votre Une', title: AX_SHORT[filter.key], subtitle: isEvents ? 'rendez-vous à venir · 3 semaines' : 'les faits qui comptent aujourd’hui' }
          // TCK-020 : « Aujourd’hui » seulement sur l’édition la plus récente ; sinon le libellé de l’édition affichée.
          : { eyebrow: (ed && ed.date === latestDate()) ? 'Aujourd’hui' : (ed && ed.label ? ed.label : 'Édition'), title: 'À la une', subtitle: 'les faits qui comptent aujourd’hui' };

  return (
    <ScrollView contentContainerStyle={{ padding: SP.gutter, paddingBottom: SP.huge }} showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.cobalt} colors={[C.cobalt]} /> : undefined}>
      <PageHeader eyebrow={header.eyebrow} title={header.title} subtitle={header.subtitle}
        glyph={
          filter.type === 'sector' && sector ? <SectorGlyph sectorKey={sector.key} size={16} active />
            : filter.type === 'divers' ? <Icon name="triage" size={16} color={C.cobalt} />
              : filter.type === 'follow' ? <Icon name="star" size={16} color={C.cobalt} />
                : (filter.type === 'axis' && !isEvents) ? <AxisGlyph axis={filter.key} size={16} active />
                  : undefined
        } />

      {/* Filtres — identiques à « Axes » (+ « Pour vous » RS1-23 si des sujets sont suivis) */}
      <FilterRow label="AXES PESTEL">
        {follows && follows.length ? (
          <Pill label="Pour vous" icon="star" active={filter.type === 'follow'} onPress={() => setFilter(filter.type === 'follow' ? { type: 'all' } : { type: 'follow' })} />
        ) : null}
        <Pill label="Tous" active={filter.type === 'all'} onPress={() => setFilter({ type: 'all' })} />
        {AX_ORDER.map((k) => (
          <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k} onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
        ))}
      </FilterRow>
      <FilterRow label="RUBRIQUES">
        {RUBRIQUES.map((k) => (
          <Pill key={k} label={AX_SHORT[k]} axis={k} active={filter.type === 'axis' && filter.key === k} onPress={() => setFilter(filter.type === 'axis' && filter.key === k ? { type: 'all' } : { type: 'axis', key: k })} />
        ))}
        {/* LOT-H : « Divers » n'est offerte que lorsqu'elle a réellement du contenu. Une pastille qui
            ouvre sur « Rien pour l'instant » est une promesse non tenue — et, répétée, elle apprend au
            lecteur à ne plus la toucher, ce qui est exactement la mort silencieuse d'une soupape. */}
        {divers.visible ? (
          <Pill label={`Divers · ${divers.total}`} icon="triage" active={filter.type === 'divers'} onPress={() => setFilter(filter.type === 'divers' ? { type: 'all' } : { type: 'divers' })} />
        ) : null}
      </FilterRow>
      <FilterRow label="SECTEURS TRANSVERSAUX">
        {SECTORS.map((s) => (
          <Pill key={s.key} label={s.label} sectorKey={s.key} active={filter.type === 'sector' && filter.key === s.key} onPress={() => setFilter(filter.type === 'sector' && filter.key === s.key ? { type: 'all' } : { type: 'sector', key: s.key })} />
        ))}
      </FilterRow>

      {/* RS1-23 : « Suivre » un axe/secteur filtré — bascule locale qui alimente « Pour vous ».
          QA v1.2 : n'offrir le suivi QUE là où « Pour vous » saura rendre quelque chose. Events (axe synthétique)
          affichait 12 rendez-vous et proposait « Suivre » — mais aucun item ne porte axis:'Ev', donc « Pour vous »
          restait vide À PERPÉTUITÉ alors que le bouton affichait « Suivi ». Signature F2 exacte : offrir une action
          dont le résultat est calculé par un prédicat DIFFÉRENT de celui qui a produit la liste affichée. */}
      {onToggleFollow && ((filter.type === 'axis' && isFollowableAxis(filter.key)) || filter.type === 'sector') ? (() => {
        const following = isFollowing && isFollowing(filter.type, filter.key);
        return (
          <TouchableOpacity onPress={() => onToggleFollow(filter.type, filter.key)} accessibilityRole="button"
            accessibilityState={{ selected: !!following }} accessibilityLabel={following ? 'Ne plus suivre ce sujet' : 'Suivre ce sujet'} hitSlop={HIT.sm}
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: SP.xs, minHeight: 36, paddingHorizontal: SP.md, marginBottom: SP.md, borderRadius: RADIUS.chip, backgroundColor: following ? C.actionFill : C.panel, borderWidth: 1, borderColor: following ? C.actionFill : C.border }}>
            <Icon name={following ? 'star-on' : 'star'} size={14} color={following ? C.onAction : C.cobalt} />
            <Text style={[TYPE.label, { color: following ? C.onAction : C.cobalt }]}>{following ? 'Suivi' : 'Suivre ce sujet'}</Text>
          </TouchableOpacity>
        );
      })() : null}

      {filter.type === 'follow' ? (
        <FilteredList items={followedItems(ed, follows)} emptyLabel={'Aucun article de vos sujets suivis dans cette édition.'} isRubrique={false} onOpen={onOpen} ed={ed} />
      ) : filter.type === 'divers' ? (
        <DiversList items={triage} stats={divers} />
      ) : isEvents ? (
        <EventsView onOpenEvent={onOpenEvent} />
      ) : filter.type === 'axis' ? (
        <>
          {/* LOT-I — EN TÊTE de l'axe/rubrique, les 1 à 3 sujets DÉSIGNÉS majeurs. Elle ne repêche
              JAMAIS un mineur pour remplir. Le porteur est l'objet d'axe de l'édition : c'est lui qui
              peut déclarer une VACANCE motivée (« 0 majeur » assumé).
              CORRECTION 2 — la vacance MOTIVÉE s'AFFICHE désormais, avec son motif : c'est une décision
              éditoriale, donc de l'information. Seul l'état NON DÉSIGNÉ (personne n'a tranché) ne rend
              rien du tout — et rien n'y est fabriqué pour combler. */}
          <MajeursSection items={items} label={activeLabel} genre={isRubrique ? 'rubrique' : 'axe'}
            porteur={ed.axes.find((a) => a.key === filter.key) || null} onOpen={onOpen} ed={ed} />
          <FilteredList items={items} emptyLabel={`Aucun item « ${activeLabel} » dans cette édition.`} isRubrique={isRubrique} onOpen={onOpen} ed={ed} />
          {/* LOT-F — sous les faits RÉDIGÉS de l'axe, les captées N1 du MÊME axe. Deux étages, deux
              traitements visuels : le lecteur voit ce qui a été travaillé et ce qui n'a été que trié. */}
          <CapteesAxe feed={feed} axe={filter.key} label={activeLabel} />
        </>
      ) : filter.type !== 'all' ? (
        <>
          {/* LOT-I — même règle pour un SECTEUR transversal. Pas de `porteur` : le schéma ne porte de
              `designationVacance` que sur un AXE. Un secteur ne peut donc pas déclarer de vacance
              motivée aujourd'hui — c'est une LIMITE DÉCLARÉE, pas un oubli de rendu. */}
          <MajeursSection items={items} label={activeLabel} genre="secteur" onOpen={onOpen} ed={ed} />
          <FilteredList items={items} emptyLabel={`Aucun item « ${activeLabel} » dans cette édition.`} isRubrique={isRubrique} onOpen={onOpen} ed={ed} />
        </>
      ) : (
        <>
          {ed.headline.map((h, i) => (
            <NewsCard key={h.code} axis={h.axis} rank={(i < 9 ? '0' : '') + (i + 1)}
              title={h.title} text={h.text} reliability={h.reliability} cta="Approfondir"
              source={primarySource(ed, findItem(ed, h.code) || h)} onPress={() => onOpen(h.code)} titleLines={3} />
          ))}

          <CapteesSection feed={feed} />

          {ed.agenda && ed.agenda.length > 0 && (
            <View style={{ marginTop: SP.gutter }}>
              <SectionHead title="À suivre" icon="calendar" lens="agenda des prochains jalons" />
              <Card style={{ paddingVertical: SP.xs }}>
                {ed.agenda.slice(0, 5).map((a, i, arr) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', gap: SP.md, paddingVertical: SP.md, paddingHorizontal: SP.md2, alignItems: 'flex-start' }}>
                      <Text style={[TYPE.mono, { color: C.inkDim, width: 92 }]}>{a.when}</Text>
                      <Text style={[TYPE.bodySm, { color: C.inkDim, flex: 1 }]}>{a.what}</Text>
                    </View>
                    {i < arr.length - 1 && <Rule style={{ marginHorizontal: SP.md2 }} />}
                  </View>
                ))}
              </Card>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
