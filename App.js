import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Text, View, TouchableOpacity, Modal, ScrollView, Animated, Image, AppState, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

import { C, F, applyTheme, tint } from './src/theme';
import { Icon, shadow } from './src/ui';
import { getEdition, findItem, latestDate, editionsList, applyRemote, getFeed, getTriage } from './src/store';
import { fetchRemoteData } from './src/remote';
import { confirmOpenURL, isSafeUrl } from './src/safeUrl';
import { loadPrefs, savePrefs, MAX_FAVS } from './src/prefs';
import { scheduleDailyBriefing, cancelDailyBriefing } from './src/notify';
import Home from './src/screens/Home';
import Axes from './src/screens/Axes';
import MapScreen from './src/screens/Map';
import Stats from './src/screens/Stats';
import Search from './src/screens/Search';
import Favoris from './src/screens/Favoris';
import Detail from './src/screens/Detail';
import Welcome from './src/screens/Welcome';

// On garde le splash natif AFFICHÉ jusqu'à ce que l'écran d'accueil animé prenne le relais (pas de flash).
SplashScreen.preventAutoHideAsync().catch(() => {});

const TABS = [
  { key: 'home', label: 'À la une', icon: 'home' },
  { key: 'axes', label: 'Axes', icon: 'axes' },
  { key: 'map', label: 'Carte', icon: 'map' },
  { key: 'stats', label: 'Données', icon: 'stats' },
  { key: 'favoris', label: 'Favoris', icon: 'star' },
];

export default function App() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold, Fraunces_700Bold,
    IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold,
    IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  });
  const [date, setDate] = useState(latestDate());
  const followLatestRef = useRef(true);   // l'utilisateur suit-il la dernière édition ? (sinon on ne le déplace pas)
  const chooseDate = (d) => { followLatestRef.current = d === latestDate(); setDate(d); };  // choix EXPLICITE d'édition
  const [tab, setTab] = useState('home');
  const [detail, setDetail] = useState(null);
  const [detailEd, setDetailEd] = useState(null);   // édition d'ouverture d'un item (ex. Event d'une autre édition)
  // SEC-04 : un Event peut pointer une édition disparue après une synchro. On NE retombe PAS silencieusement
  // sur l'édition courante (codes non uniques → mauvais item) : on prévient et on n'ouvre rien d'erroné.
  const openEvent = (code, edDate) => {
    const e = getEdition(edDate);
    if (!e) { Alert.alert('Édition indisponible', "Cet événement provient d'une édition qui n'est plus chargée. Réessayez après la prochaine mise à jour."); return; }
    setDetailEd(e); setDetail(code);
  };
  const closeDetail = () => { setDetail(null); setDetailEd(null); };
  const [sheet, setSheet] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [net, setNet] = useState('loading');      // 'loading' | 'online' | 'offline' — fraîcheur des données (P2, anti-ARCA)
  const [, setDataVer] = useState(0);             // bump → re-rendu après application des données en ligne
  const [mode, setMode] = useState('light');      // thème clair (défaut) / sombre
  const [, setThemeVer] = useState(0);
  const toggleTheme = () => { const m = mode === 'light' ? 'dark' : 'light'; applyTheme(m); setMode(m); setThemeVer((v) => v + 1); savePrefs({ mode: m }); };
  const [welcomeDone, setWelcomeDone] = useState(false);   // écran d'accueil « bande annonce » (≥ 3 s) vu ?
  const onWelcomeLayout = useCallback(() => { SplashScreen.hideAsync().catch(() => {}); }, []);  // masque le splash natif
  // « Le Réveil Ntongo » (PO) — bandeau « nouvelle édition » (nouveauté au niveau ÉDITION, honnête sans
  // collectedAt) + opt-in notification quotidienne. Aucun compte : tout est local (AsyncStorage + notif locale).
  const [lastSeen, setLastSeen] = useState(null);       // dernière édition VUE par l'utilisateur
  const [notifOn, setNotifOn] = useState(false);        // opt-in briefing matinal (notif locale)
  // FAVORIS — articles « étoilés », persistants (SNAPSHOT complet) : restent visibles quel que soit le jour
  // tant que l'étoile est sélectionnée, indépendamment de l'édition affichée. Clé = `${edDate}:${code}`.
  const [favs, setFavs] = useState([]);
  const isFav = useCallback((id) => favs.some((f) => f.id === id), [favs]);
  const toggleFav = useCallback((snap) => {
    if (!snap || !snap.id) return;
    setFavs((prev) => {
      const next = prev.some((f) => f.id === snap.id)
        ? prev.filter((f) => f.id !== snap.id)
        : [snap, ...prev].slice(0, MAX_FAVS);   // RS_Sec : plafond identique à la relecture (borne le blob persisté)
      savePrefs({ favs: next });
      return next;
    });
  }, []);
  const openFav = useCallback((fav) => {
    // RS3 : vérifier que l'ITEM (pas seulement l'édition) résout encore. Une re-publication intra-day peut
    // garder l'édition mais renommer/retirer le code → Detail afficherait « Dossier indisponible » SANS
    // proposer la source pourtant connue. On ne va sur Detail que si l'item existe ; sinon repli source.
    const e = getEdition(fav.edDate);
    const it = e && findItem(e, fav.code);
    if (it) { setDetailEd(e); setDetail(fav.code); return; }
    // Édition OU item disparu (fenêtre glissante / re-publication) : pas de cul-de-sac. Source si https sûre.
    if (fav.source && fav.source.url && isSafeUrl(fav.source.url)) { confirmOpenURL(fav.source.url); return; }
    Alert.alert('Article indisponible', "Cet article n'est plus chargé et aucune source externe n'est disponible.");
  }, []);
  const dismissNewEdition = useCallback((d) => { setLastSeen(d); savePrefs({ lastSeen: d }); }, []);
  const toggleNotif = useCallback(async () => {
    if (notifOn) { await cancelDailyBriefing(); setNotifOn(false); savePrefs({ notifOn: false }); return; }
    const ok = await scheduleDailyBriefing();
    setNotifOn(ok); savePrefs({ notifOn: ok });
    if (!ok) Alert.alert('Notifications indisponibles', "Autorisez les notifications (ou reconstruisez l'app) pour recevoir le briefing du matin.");
  }, [notifOn]);

  // Rafraîchissement + CONTRÔLE RÉGULIER du hors-ligne (NB3) : au montage, à intervalle régulier, et
  // à chaque retour au premier plan. Le repli sur l'embarqué est SIGNALÉ (bandeau + badge), jamais muet.
  const inFlightRef = useRef(false);   // ROB-03 : une seule requête à la fois (pas de fetchs concurrents)
  const seqRef = useRef(0);            // jeton de séquence : seule la réponse la plus récente s'applique
  const lastRunRef = useRef(0);        // horodatage du dernier refresh terminé (debounce du retour au 1er plan)
  const refresh = useCallback(() => {
    if (inFlightRef.current) return;                 // garde in-flight : ignore un déclenchement redondant
    inFlightRef.current = true;
    const seq = ++seqRef.current;
    fetchRemoteData().then((d) => {
      if (seq !== seqRef.current) return;            // réponse périmée (course) → ignorée, pas de last-writer
      if (applyRemote(d)) {
        if (followLatestRef.current) setDate(latestDate());   // ROB-02 : ne pas écraser un choix d'édition explicite
        setNet('online'); setDataVer((v) => v + 1);
      } else setNet('offline');                      // pas de réseau / timeout / contrat invalide → embarquée, signalée
    }).finally(() => { inFlightRef.current = false; lastRunRef.current = Date.now(); });
  }, []);
  useEffect(() => {
    refresh();
    loadPrefs().then((p) => {                                                  // hydrate dernière édition vue + opt-in notif
      if (p.lastSeen) setLastSeen(p.lastSeen);
      else { const d = latestDate(); setLastSeen(d); savePrefs({ lastSeen: d }); }   // 1er lancement = référence, pas d'alerte
      if (p.notifOn) setNotifOn(true);
      if (Array.isArray(p.favs)) setFavs(p.favs);
      if (p.mode === 'dark' || p.mode === 'light') { applyTheme(p.mode); setMode(p.mode); }   // thème persistant (RS1)
    });
    const iv = setInterval(refresh, 5 * 60 * 1000);                            // re-contrôle toutes les 5 min
    // Retour au premier plan : re-contrôle, mais debouncé (≥ 30 s) pour ne pas mitrailler la source.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - lastRunRef.current > 30000) refresh();
    });
    return () => { clearInterval(iv); if (sub && sub.remove) sub.remove(); };
  }, [refresh]);

  // RS3 (blocker) : si l'édition SÉLECTIONNÉE disparaît d'EDITIONS (une synchro avance la fenêtre glissante
  // pendant qu'on consulte une édition ancienne), `date` pointe dans le vide → getEdition(date)=null →
  // déréférencement `ed.label` = écran blanc irrécupérable. On re-cale l'état sur la dernière édition
  // disponible. Le fallback au rendu (ci-dessous) protège la frame courante ; cet effet rétablit la cohérence
  // (badge fraîcheur, sélecteur). Garde stricte → pas de boucle : latestDate() résout, donc no-op ensuite.
  useEffect(() => {
    if (!getEdition(date)) {
      followLatestRef.current = true;
      setDate(latestDate());
      // RS3.2 : une fiche Detail ouverte SANS édition capturée (detailEd null) est liée à `date`. L'édition
      // venant d'être invalidée, re-router la modale vers l'édition du jour montrerait un AUTRE article
      // (codes non uniques entre éditions) ou « Dossier indisponible ». On ferme proprement — pas de bascule
      // silencieuse. Favoris/Events capturent detailEd → non concernés (leur source d'origine survit).
      if (detail && !detailEd) closeDetail();
    }
  });

  if (!loaded) return null;   // polices en cours : le splash natif reste affiché (preventAutoHide)
  const ed = getEdition(date) || getEdition(latestDate());   // RS3 : jamais null au rendu (cf. effet de re-calage)
  const dEd = detailEd || ed;   // l'item du détail peut venir d'une autre édition (Event)
  // RS3.2 : ouvrir un item CAPTURE son édition d'origine (comme Favoris/Events) — la fiche survit à un
  // changement d'édition en arrière-plan (synchro/sélecteur) sans basculer silencieusement sur un autre
  // article (codes non uniques entre éditions). La référence objet reste valide même si EDITIONS purge la clé.
  const openItem = (code) => { setDetailEd(ed); setDetail(code); };

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        {/* En-tête de marque — logomark « aube cobalt » + wordmark Ntongo + fraîcheur des données */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
          <Image source={require('./assets/ntongo/icon.png')} style={{ width: 34, height: 34, borderRadius: 9, marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.ink }}>
              Ntongo <Text style={{ color: C.cobalt }}>· RDC</Text>
            </Text>
            <FreshnessTag net={net} ed={ed} isLatest={date === latestDate()} />
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={toggleNotif} hitSlop={8}
            accessibilityRole="button" accessibilityLabel={notifOn ? 'Briefing du matin activé' : 'Activer le briefing du matin'}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={notifOn ? 'bell-on' : 'bell'} size={19} color={notifOn ? C.cobalt : C.inkDim} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={toggleTheme} hitSlop={8}
            accessibilityRole="button" accessibilityLabel={mode === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={C.inkDim} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchOpen(true)} hitSlop={8}
            accessibilityRole="button" accessibilityLabel="Rechercher"
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <Icon name="search" size={20} color={C.inkDim} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setSheet(true)} hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
            accessibilityRole="button" accessibilityLabel={`Changer d'édition, actuellement ${ed.label}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Icon name="calendar" size={14} color={C.cobalt} />
            <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: C.ink }}>{ed.label}</Text>
          </TouchableOpacity>
        </View>

        {/* Fraîcheur des données — bandeau persistant quand on tourne hors ligne (P2, anti-ARCA) */}
        {net === 'offline' ? <OfflineBanner ed={ed} onRetry={refresh} /> : null}

        {/* « Le Réveil Ntongo » — bandeau « nouvelle édition » (nouveauté depuis la dernière visite) */}
        {tab === 'home' && net !== 'offline' && lastSeen && date === latestDate() && lastSeen !== date
          ? <NewEditionBanner ed={ed} onDismiss={() => dismissNewEdition(date)} /> : null}

        {/* Écran actif (fondu + léger glissement à chaque changement d'onglet) */}
        <ScreenFade tabKey={tab}>
          {tab === 'home' && <Home ed={ed} onOpen={openItem} feed={date === latestDate() ? getFeed() : []} triage={date === latestDate() ? getTriage() : []} onOpenEvent={openEvent} onRefresh={refresh} refreshing={net === 'loading'} />}
          {tab === 'axes' && <Axes ed={ed} onOpen={openItem} triage={date === latestDate() ? getTriage() : []} onOpenEvent={openEvent} />}
          {tab === 'map' && <MapScreen ed={ed} onOpen={openItem} />}
          {tab === 'stats' && <Stats />}
          {tab === 'favoris' && <Favoris favs={favs} onOpen={openFav} onToggleFav={toggleFav} />}
        </ScreenFade>

        <TabBar tab={tab} setTab={setTab} />
      </SafeAreaView>

      {/* Modale de détail (zoom sur un item — dans son édition d'origine dEd) */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={closeDetail}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut }}>{dEd.label}</Text>
            <TouchableOpacity onPress={closeDetail} hitSlop={14} accessibilityRole="button" accessibilityLabel="Fermer"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.cobalt }}>Fermer</Text>
              <Icon name="close" size={18} color={C.cobalt} />
            </TouchableOpacity>
          </View>
          {detail ? <Detail ed={dEd} code={detail} onOpen={setDetail} isFav={isFav} onToggleFav={toggleFav} /> : null}
        </SafeAreaView>
      </Modal>

      {/* Recherche (ouverte par la loupe de l'en-tête) */}
      <Modal visible={searchOpen} animationType="slide" onRequestClose={() => setSearchOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.ink }}>Recherche</Text>
            <TouchableOpacity onPress={() => setSearchOpen(false)} hitSlop={14} accessibilityRole="button" accessibilityLabel="Fermer"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.cobalt }}>Fermer</Text>
              <Icon name="close" size={18} color={C.cobalt} />
            </TouchableOpacity>
          </View>
          <Search ed={ed} onOpen={(code) => { setSearchOpen(false); openItem(code); }} />
        </SafeAreaView>
      </Modal>

      {/* Sélecteur d'édition */}
      <EditionSheet open={sheet} date={date} onClose={() => setSheet(false)} onPick={(d) => { chooseDate(d); setSheet(false); setDetail(null); }} />

      {/* Écran d'accueil « bande annonce » — logo + slogan + drapeau, ≥ 3 s, par-dessus tout au lancement */}
      {!welcomeDone && <Welcome onLayout={onWelcomeLayout} onDone={() => setWelcomeDone(true)} />}
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// RS3 : filet de sécurité racine. Un throw pendant le rendu (donnée distante hors-contrat, cas limite non
// prévu) devenait un ÉCRAN BLANC irrécupérable (aucun ErrorBoundary n'existait). Ici : état dégradé lisible
// + « Réessayer » (re-tente le rendu). Aucune télémétrie — rien ne quitte l'appareil (posture cybersécurité).
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch() { /* pas de report réseau : aucune donnée ne sort de l'appareil */ }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Icon name="warning" size={34} color={C.gold} style={{ marginBottom: 12 }} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: C.ink, marginBottom: 8, textAlign: 'center' }}>Une erreur est survenue</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkMut, textAlign: 'center', lineHeight: 20, marginBottom: 22 }}>
          L'affichage a rencontré un problème. Réessayez ; si cela persiste, rouvrez l'application.
        </Text>
        <TouchableOpacity onPress={() => this.setState({ err: null })} activeOpacity={0.85}
          accessibilityRole="button" accessibilityLabel="Réessayer"
          style={{ backgroundColor: C.actionFill, borderRadius: 22, paddingHorizontal: 24, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.onAction }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// « Le Réveil Ntongo » — bandeau « nouvelle édition » : signale la nouveauté depuis la dernière visite
// (niveau ÉDITION, honnête). Point + libellé (WCAG 1.4.1), fermable (contrôle explicite).
function NewEditionBanner({ ed, onDismiss }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: tint(C.cobalt, 0.1), borderBottomWidth: 1, borderBottomColor: tint(C.cobalt, 0.28) }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.cobalt }} />
      <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 12, color: C.ink }}>Nouvelle édition du {ed.label}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={14} accessibilityRole="button" accessibilityLabel="Marquer comme vue"
        style={{ minHeight: 32, justifyContent: 'center', paddingLeft: 6 }}>
        <Icon name="close" size={16} color={C.inkMut} />
      </TouchableOpacity>
    </View>
  );
}

// Transition douce entre onglets : fondu + petit glissement vers le haut.
function ScreenFade({ tabKey, children }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    op.setValue(0); ty.setValue(8);
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 230, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 230, useNativeDriver: true }),
    ]).start();
  }, [tabKey]);
  return <Animated.View style={{ flex: 1, opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// Badge de fraîcheur des données (tri-état) — info doublée point + libellé (jamais la seule couleur, WCAG 1.4.1).
function FreshnessTag({ net, ed, isLatest }) {
  // RS1 : sur une édition ANTÉRIEURE, ne pas prétendre « à jour · en ligne » → état ARCHIVE honnête.
  if (isLatest === false) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.inkMut }} />
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.inkMut }} numberOfLines={1}>archive · édition du {ed.label}</Text>
      </View>
    );
  }
  // A11Y-01 : point = jeton GRAPHIQUE (≥3:1), texte = jeton TEXTE conforme AA (≥4,5:1). Jamais peindre
  // un libellé < 24 px avec C.ok/C.gold bruts (2,84–3,07:1 sur fond réel). Taille portée à 11 px.
  const S = {
    loading: { dot: C.inkMut, tx: C.inkMut, label: 'synchronisation…' },
    online: { dot: C.ok, tx: C.okText, label: 'à jour · en ligne' },
    offline: { dot: C.gold, tx: C.goldText, label: `hors ligne · édition du ${ed.label}` },
  }[net] || { dot: C.inkMut, tx: C.inkMut, label: 'synchronisation…' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: S.dot }} />
      <Text style={{ fontFamily: F.mono, fontSize: 11, color: S.tx }} numberOfLines={1}>{S.label}</Text>
    </View>
  );
}

// Bandeau hors-ligne persistant (non masquable tant que la synchro n'a pas réussi) — tue le repli silencieux « ARCA ».
// RS1 : bouton « Réessayer » (contrôle explicite) pour relancer la synchro manuellement.
function OfflineBanner({ ed, onRetry }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: tint(C.gold, 0.15), borderBottomWidth: 1, borderBottomColor: tint(C.gold, 0.35) }}>
      <Icon name="warning" size={15} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 11.5, color: C.ink, lineHeight: 15 }}>
        Données embarquées du {ed.label} · dernière synchronisation impossible.
      </Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} hitSlop={8} accessibilityRole="button" accessibilityLabel="Réessayer la synchronisation"
          style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.cobalt }}>Réessayer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function TabBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  // DOCK FLOTTANT « aube cobalt » (atelier design UI·UX·Product) : carte posée (marge + rayon 24 + ombre helper),
  // fond C.panel dans les DEUX thèmes (AA : inkMut inactif échoue sur elev en sombre). UN SEUL signal d'actif fort
  // = pastille PLEINE actionFill + icône -on blanche (usage littéral du jeton, blanc 6,17:1 AA). Cobalt = action.
  // Sélection TRIPLE-encodée (WCAG 1.4.1) : pastille pleine + icône -on + libellé bodySemi. Cibles ≥ 48 px, pouce.
  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 8) + 4, backgroundColor: 'transparent' }}>
      <View accessibilityRole="tablist"
        style={[{ flexDirection: 'row', backgroundColor: C.panel, borderRadius: 24, borderWidth: 1, borderColor: C.border2, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 8 }, shadow]}>
        {TABS.map((t, i) => {
          const on = tab === t.key;
          return (
            <TouchableOpacity key={t.key} activeOpacity={0.7} onPress={() => setTab(t.key)}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}, onglet ${i + 1} sur ${TABS.length}`}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <View style={{ height: 32, minWidth: 56, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.actionFill : 'transparent' }}>
                <Icon name={on ? `${t.icon}-on` : t.icon} size={24} color={on ? C.onAction : C.inkMut} />
              </View>
              <Text numberOfLines={1} allowFontScaling maxFontSizeMultiplier={1.3}
                style={{ fontFamily: on ? F.bodySemi : F.body, fontSize: 11, letterSpacing: 0.2, color: on ? C.cobalt : C.inkMut }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function EditionSheet({ open, date, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  const list = editionsList();
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(20,25,40,0.35)', justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, paddingBottom: 10 + insets.bottom, maxHeight: '70%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink, paddingHorizontal: 20, paddingVertical: 10 }}>Choisir l'édition</Text>
          <ScrollView>
            {list.map((e) => {
              const on = e.date === date;
              return (
                <TouchableOpacity key={e.date} onPress={() => onPick(e.date)}
                  accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={on ? `${e.label}, édition affichée` : e.label}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 }}>
                  <Text style={{ fontFamily: on ? F.bodySemi : F.body, fontSize: 15, color: on ? C.cobalt : C.ink }}>{e.label}</Text>
                  {on ? <Icon name="checkmark" size={18} color={C.cobalt} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
