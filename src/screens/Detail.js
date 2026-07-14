import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, Share } from 'react-native';
import { C, F, AX, AXT, tint, relFr, relIsOk } from '../theme';
import { RelBadge, SrcDot, Icon, Rule, AxisGlyph } from '../ui';
import { findItem, sourcesFor, primarySource } from '../store';
import { confirmOpenURL, hostOf, isSafeUrl } from '../safeUrl';

// Zoom sur un item : texte intégral, analyse, contexte, chronologie, acteurs, perspectives, sources.
export default function Detail({ ed, code, onOpen, isFav, onToggleFav }) {
  const it = findItem(ed, code);
  // ROB-04 : jamais de feuille MUETTE. Un code introuvable (agenda orphelin, course de synchro) affiche
  // un état vide EXPLICITE au lieu de `return null` (qui laissait une modale sans contenu ni message).
  if (!it) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Icon name="triage" size={30} color={C.inkMut} style={{ marginBottom: 10 }} />
      <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: C.ink, textAlign: 'center', marginBottom: 4 }}>Dossier indisponible</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: C.inkMut, textAlign: 'center', lineHeight: 19 }}>
        Cet élément n'existe pas (ou plus) dans l'édition affichée. Il a pu changer lors d'une mise à jour.
      </Text>
    </View>
  );
  const c = AX[it.axis] || C.cobalt;     // graphique (bordure/tint/point)
  const ct = AXT[it.axis] || C.ink;      // texte conforme AA
  const z = it.zoom || {};
  const srcs = sourcesFor(ed, it.sources);
  const psrc = primarySource(ed, it);

  // Partager (P2 PO) — feuille de partage système : titre + source + URL (uniquement si https sûre, SEC) +
  // signature. Aucune donnée perso ; hors-ligne OK (intent système).
  const onShare = () => {
    const url = psrc && psrc.url && isSafeUrl(psrc.url) ? psrc.url : null;
    const msg = [it.title, psrc && psrc.name ? `— ${psrc.name}` : null, url, 'via Ntongo · RDC'].filter(Boolean).join('\n');
    Share.share({ message: msg, title: it.title }).catch(() => {});
  };

  // FAVORIS — snapshot complet (autonome de l'édition) : reste affichable quel que soit le jour.
  const favId = `${ed.date}:${it.code}`;
  const starred = isFav ? isFav(favId) : false;
  const toggleStar = () => onToggleFav && onToggleFav({
    id: favId, edDate: ed.date, code: it.code, axis: it.axis, axisName: it.axisName,
    title: it.title, text: it.text, reliability: it.reliability, source: psrc,
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AxisGlyph axis={it.axis} size={16} />
        <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: ct }}>{it.axisName}</Text>
        <View style={{ flex: 1 }} />
        <RelBadge reliability={it.reliability} />
        <TouchableOpacity onPress={toggleStar} hitSlop={10} accessibilityRole="button"
          accessibilityState={{ selected: starred }} accessibilityLabel={starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{ minHeight: 32, justifyContent: 'center', paddingLeft: 4 }}>
          <Icon name={starred ? 'star-on' : 'star'} size={19} color={starred ? C.gold : C.inkDim} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} hitSlop={10} accessibilityRole="button" accessibilityLabel="Partager cet article"
          style={{ minHeight: 32, justifyContent: 'center', paddingLeft: 4 }}>
          <Icon name="share" size={18} color={C.cobalt} />
        </TouchableOpacity>
      </View>

      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.ink, lineHeight: 29, marginBottom: 14 }}>
        {it.title}
      </Text>

      <Text style={{ fontFamily: F.body, fontSize: 15.5, color: C.inkDim, lineHeight: 25 }}>{it.text}</Text>

      {/* Analyse */}
      {it.analysis ? (
        <View style={{ backgroundColor: tint(c, 0.08), borderLeftWidth: 3, borderLeftColor: c, borderRadius: 10, padding: 14, marginTop: 16 }}>
          <Text style={{ fontFamily: F.monoSemi, fontSize: 10.5, color: ct, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Analyse</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.inkDim, lineHeight: 22, fontStyle: 'italic' }}>{it.analysis}</Text>
        </View>
      ) : null}

      {/* Contexte */}
      {z.context ? (
        <Block title="Contexte">
          <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.inkDim, lineHeight: 22 }}>{z.context}</Text>
        </Block>
      ) : null}

      {/* Chronologie */}
      {z.timeline && z.timeline.length ? (
        <Block title="Chronologie">
          {z.timeline.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginTop: 4 }} />
                {i < z.timeline.length - 1 && <View style={{ width: 1.5, flex: 1, backgroundColor: C.border, marginTop: 2 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 4 }}>
                <Text style={{ fontFamily: F.monoSemi, fontSize: 11, color: ct, marginBottom: 2 }}>{t.d}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 14, color: C.inkDim, lineHeight: 20 }}>{t.e}</Text>
              </View>
            </View>
          ))}
        </Block>
      ) : null}

      {/* Acteurs — rendu défensif : texte, tableau de textes, ou tableau d'objets {name, role}. */}
      {z.actors ? (
        <Block title="Acteurs">
          <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.inkDim, lineHeight: 22 }}>
            {(Array.isArray(z.actors) ? z.actors : [z.actors])
              .map((a) => (typeof a === 'string' ? a
                : a && a.name ? (a.role ? `${a.name} — ${a.role}` : a.name)
                : (a && (a.text || a.acteur)) || ''))
              .filter(Boolean).join(' · ')}
          </Text>
        </Block>
      ) : null}

      {/* Perspectives */}
      {z.outlook ? (
        <Block title="Perspectives">
          <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.inkDim, lineHeight: 22 }}>{z.outlook}</Text>
        </Block>
      ) : null}

      {/* Sources */}
      {srcs.length ? (
        <Block title={`Sources (${srcs.length})`}>
          {srcs.map((s) => (
            <TouchableOpacity key={s.id} activeOpacity={0.7} onPress={() => s.url && confirmOpenURL(s.url)}
              accessibilityRole="link" accessibilityLabel={s.url ? `Ouvrir la source ${hostOf(s.url)}` : s.name}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 9 }}>
              <SrcDot rel={s.reliability} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkDim, lineHeight: 18 }} numberOfLines={3}>{s.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.inkMut }}>{s.type} · {s.date}</Text>
                  {/* SEC-01 : on montre le DOMAINE réel de destination, pas seulement une icône de lien. */}
                  {s.url ? <Icon name="link" size={12} color={C.cobalt} /> : null}
                  {s.url ? <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.cobalt }} numberOfLines={1}>{hostOf(s.url)}</Text> : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Block>
      ) : null}
    </ScrollView>
  );
}

const Block = ({ title, children }) => (
  <View style={{ marginTop: 18 }}>
    <Text style={{ fontFamily: F.displayBold, fontSize: 15, color: C.ink, marginBottom: 10 }}>{title}</Text>
    {children}
  </View>
);
