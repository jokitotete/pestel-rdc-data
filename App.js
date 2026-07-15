import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Text, View, TouchableOpacity, Modal, ScrollView, Animated, Image, AppState, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

import { C, F, applyTheme, tint, SP, TYPE, RADIUS, DUR, HIT } from './src/theme';
import { Icon, shadow, useReduceMotion, ModalHeader } from './src/ui';
import { getEdition, findItem, latestDate, editionsList, applyRemote, getFeed, getTriage } from './src/store';
import { fetchRemoteData } from './src/remote';
import { confirmOpenURL, isSafeUrl } from './src/safeUrl';
import { loadPrefs, savePrefs, MAX_FAVS, loadFollows, saveFollows } from './src/prefs';
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
  // RS1-19/20 — TISSU DE LIENS CROISÉS + sélection « explore » partagée. goTo() est l'API d'intention unique :
  // change d'onglet et SÈME un filtre/une province dans l'écran cible (nonce → ré-application même si identique).
  // Les écrans lisent `seed` et l'appliquent à leur état local. Relie item↔axe↔secteur↔carte en ≤1 tap.
  const [navSeed, setNavSeed] = useState(null);
  const seedRef = useRef(0);
  const goTo = ({ tab, filter, province, edition }) => {
    // Une intention de navigation quitte TOUTES les surfaces modales, pas seulement la fiche : sans cela un
    // lien croisé ouvert depuis la loupe naviguait DERRIÈRE la Recherche restée montée (RS1-10) → tap mort.
    closeDetail();
    setSearchOpen(false);
    if (edition) chooseDate(edition);
    if (province) { setTab('map'); setNavSeed({ tab: 'map', province, n: ++seedRef.current }); return; }
    if (tab) setTab(tab);
    if (filter) setNavSeed({ tab: tab || 'home', filter, n: ++seedRef.current });
  };
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
  // RS1-23 — SUJETS SUIVIS (axe/secteur), local, pour la vue « Pour vous ».
  const [follows, setFollows] = useState([]);
  const isFollowing = useCallback((type, key) => follows.some((f) => f.type === type && f.key === key), [follows]);
  const toggleFollow = useCallback((type, key) => {
    if (!type || !key) return;
    setFollows((prev) => {
      const has = prev.some((f) => f.type === type && f.key === key);
      const next = has ? prev.filter((f) => !(f.type === type && f.key === key)) : [{ type, key }, ...prev].slice(0, 50);
      saveFollows(next);
      return next;
    });
  }, []);
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
    loadFollows().then(setFollows);                                            // RS1-23 : sujets suivis (Pour vous)
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
        {/* En-tête de marque — DEUX RANGÉES (QA v1.1 · F7). Une seule rangée ne laissait que ~83 dp au
            logotype (375 dp utiles − 292 dp de contrôles fixes) là où « Ntongo · RDC » en réclame ~114 :
            la marque se brisait sur deux lignes (« Ntongo · » / « RDC ») et la fraîcheur était tronquée
            (« à jour · en … »). Défaut PRÉSENT dans les APK v1.0 et v1.1 livrés — jamais vu parce que les
            audits regardaient le contenu, jamais le chrome. Aucun jeton ne pouvait le corriger : l'en-tête
            mélangeait deux NATURES de choses sur une rangée saturée. On les sépare :
              rangée 1 = IDENTITÉ + actions  ·  rangée 2 = CONTEXTE TEMPOREL (fraîcheur ↔ édition, indissociables).
            Coût vertical ~nul : l'ancien en-tête occupait déjà 3 lignes (logotype cassé en 2 + fraîcheur).
            Aucune fonction perdue : les 4 contrôles restent au même niveau d'accès (≤ 1 tap). */}
        <View style={{ paddingHorizontal: SP.gutter, paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: C.border2, gap: SP.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={require('./assets/ntongo/icon.png')} style={{ width: 34, height: 34, borderRadius: RADIUS.md, marginRight: SP.sm2 }} />
            {/* numberOfLines={1} : garde-fou de MARQUE — si l'en-tête se resature un jour, le logotype
                doit dégrader proprement, jamais se briser en deux lignes comme en v1.0/v1.1. */}
            <Text style={[TYPE.wordmark, { color: C.ink, flex: 1 }]} numberOfLines={1}>
              Ntongo <Text style={{ color: C.cobalt }}>· RDC</Text>
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={toggleNotif} hitSlop={HIT.sm}
              accessibilityRole="button" accessibilityLabel={notifOn ? 'Briefing du matin activé' : 'Activer le briefing du matin'}
              style={{ width: 36, height: 36, borderRadius: RADIUS.half(36), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={notifOn ? 'bell-on' : 'bell'} size={19} color={notifOn ? C.cobalt : C.inkDim} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={toggleTheme} hitSlop={HIT.sm}
              accessibilityRole="button" accessibilityLabel={mode === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              style={{ width: 36, height: 36, borderRadius: RADIUS.half(36), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={C.inkDim} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchOpen(true)} hitSlop={HIT.sm}
              accessibilityRole="button" accessibilityLabel="Rechercher"
              style={{ width: 38, height: 38, borderRadius: RADIUS.half(38), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="search" size={20} color={C.inkDim} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
            <View style={{ flex: 1 }}>
              <FreshnessTag net={net} ed={ed} isLatest={date === latestDate()} />
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSheet(true)} hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
              accessibilityRole="button" accessibilityLabel={`Changer d'édition, actuellement ${ed.label}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs2, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.chip, paddingHorizontal: SP.md, paddingVertical: SP.sm }}>
              <Icon name="calendar" size={14} color={C.cobalt} />
              <Text style={[TYPE.label, { color: C.ink }]}>{ed.label}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fraîcheur des données — bandeau persistant quand on tourne hors ligne (P2, anti-ARCA) */}
        {net === 'offline' ? <OfflineBanner ed={ed} onRetry={refresh} /> : null}

        {/* « Le Réveil Ntongo » — bandeau « nouvelle édition » (nouveauté depuis la dernière visite) */}
        {tab === 'home' && net !== 'offline' && lastSeen && date === latestDate() && lastSeen !== date
          ? <NewEditionBanner ed={ed} onDismiss={() => dismissNewEdition(date)} /> : null}

        {/* Écran actif (fondu + léger glissement à chaque changement d'onglet) */}
        <ScreenFade tabKey={tab}>
          {tab === 'home' && <Home ed={ed} onOpen={openItem} feed={date === latestDate() ? getFeed() : []} triage={date === latestDate() ? getTriage() : []} onOpenEvent={openEvent} onRefresh={refresh} refreshing={net === 'loading'} seed={navSeed && navSeed.tab === 'home' ? navSeed : null} onSeedApplied={() => setNavSeed(null)} follows={follows} isFollowing={isFollowing} onToggleFollow={toggleFollow} />}
          {tab === 'axes' && <Axes ed={ed} onOpen={openItem} triage={date === latestDate() ? getTriage() : []} onOpenEvent={openEvent} seed={navSeed && navSeed.tab === 'axes' ? navSeed : null} onSeedApplied={() => setNavSeed(null)} />}
          {tab === 'map' && <MapScreen ed={ed} onOpen={openItem} seed={navSeed && navSeed.tab === 'map' ? navSeed : null} onSeedApplied={() => setNavSeed(null)} />}
          {tab === 'stats' && <Stats />}
          {tab === 'favoris' && <Favoris favs={favs} onOpen={openFav} onToggleFav={toggleFav} onSearch={() => setSearchOpen(true)} />}
        </ScreenFade>

        <TabBar tab={tab} setTab={setTab} />
      </SafeAreaView>

      {/* Recherche (ouverte par la loupe de l'en-tête) — RS1-09/10 : multi-éditions, reste MONTÉE quand un
          résultat s'ouvre (la modale Détail se pose PAR-DESSUS, déclarée après → au retour on retrouve la liste). */}
      <Modal visible={searchOpen} animationType="slide" onRequestClose={() => setSearchOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <ModalHeader title="Recherche" onClose={() => setSearchOpen(false)} />
          {/* onOpen(code, edDate) = openEvent : ouvre le résultat dans SON édition source, sans fermer la recherche */}
          <Search onOpen={openEvent} />
        </SafeAreaView>
      </Modal>

      {/* Modale de détail (zoom sur un item — dans son édition d'origine dEd). Déclarée EN DERNIER → se pose
          par-dessus la recherche quand on ouvre un résultat (continuité RS1-10). */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={closeDetail}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <ModalHeader eyebrow={`Dossier · édition du ${dEd.label}`} onClose={closeDetail} />
          {detail ? <Detail ed={dEd} code={detail} onOpen={setDetail} isFav={isFav} onToggleFav={toggleFav} onGoTo={goTo} /> : null}
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
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: SP.xxxl }}>
        <Icon name="warning" size={34} color={C.gold} style={{ marginBottom: SP.md }} />
        <Text style={[TYPE.title, { color: C.ink, marginBottom: SP.sm, textAlign: 'center' }]}>Une erreur est survenue</Text>
        <Text style={[TYPE.bodySm, { color: C.inkMut, textAlign: 'center', marginBottom: SP.xl2 }]}>
          L'affichage a rencontré un problème. Réessayez ; si cela persiste, rouvrez l'application.
        </Text>
        <TouchableOpacity onPress={() => this.setState({ err: null })} activeOpacity={0.85}
          accessibilityRole="button" accessibilityLabel="Réessayer"
          style={{ backgroundColor: C.actionFill, borderRadius: RADIUS.chip, paddingHorizontal: SP.xxl, minHeight: 44, justifyContent: 'center' }}>
          <Text style={[TYPE.cardTitle, { color: C.onAction }]}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// « Le Réveil Ntongo » — bandeau « nouvelle édition » : signale la nouveauté depuis la dernière visite
// (niveau ÉDITION, honnête). Point + libellé (WCAG 1.4.1), fermable (contrôle explicite).
function NewEditionBanner({ ed, onDismiss }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.lg, paddingVertical: SP.sm, backgroundColor: tint(C.cobalt, 0.1), borderBottomWidth: 1, borderBottomColor: tint(C.cobalt, 0.28) }}>
      <View style={{ width: 7, height: 7, borderRadius: RADIUS.xs, backgroundColor: C.cobalt }} />
      <Text style={[TYPE.label, { flex: 1, color: C.ink }]}>Nouvelle édition du {ed.label}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={HIT.lg} accessibilityRole="button" accessibilityLabel="Marquer comme vue"
        style={{ minHeight: 32, justifyContent: 'center', paddingLeft: SP.xs2 }}>
        <Icon name="close" size={16} color={C.inkMut} />
      </TouchableOpacity>
    </View>
  );
}

// Transition douce entre onglets : fondu + petit glissement vers le haut.
function ScreenFade({ tabKey, children }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  const reduce = useReduceMotion();   // RS1-16 : respecte « réduire les animations » (WCAG 2.3.3)
  useEffect(() => {
    op.setValue(0); ty.setValue(reduce ? 0 : 8);   // reduce-motion : pas de glissement, fondu seul
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: DUR.base, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: reduce ? 0 : DUR.base, useNativeDriver: true }),
    ]).start();
  }, [tabKey, reduce]);
  return <Animated.View style={{ flex: 1, opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// Badge de fraîcheur des données (tri-état) — info doublée point + libellé (jamais la seule couleur, WCAG 1.4.1).
function FreshnessTag({ net, ed, isLatest }) {
  // RS1 : sur une édition ANTÉRIEURE, ne pas prétendre « à jour · en ligne » → état ARCHIVE honnête.
  if (isLatest === false) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, marginTop: SP.hair }}>
        <View style={{ width: 6, height: 6, borderRadius: RADIUS.half(6), backgroundColor: C.inkMut }} />
        <Text style={[TYPE.caption, { color: C.inkMut }]} numberOfLines={1}>archive · édition du {ed.label}</Text>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xs, marginTop: SP.hair }}>
      <View style={{ width: 6, height: 6, borderRadius: RADIUS.half(6), backgroundColor: S.dot }} />
      <Text style={[TYPE.caption, { color: S.tx }]} numberOfLines={1}>{S.label}</Text>
    </View>
  );
}

// Bandeau hors-ligne persistant (non masquable tant que la synchro n'a pas réussi) — tue le repli silencieux « ARCA ».
// RS1 : bouton « Réessayer » (contrôle explicite) pour relancer la synchro manuellement.
function OfflineBanner({ ed, onRetry }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.lg, paddingVertical: SP.sm, backgroundColor: tint(C.gold, 0.15), borderBottomWidth: 1, borderBottomColor: tint(C.gold, 0.35) }}>
      <Icon name="warning" size={15} color={C.gold} />
      <Text style={[TYPE.label, { flex: 1, color: C.ink }]}>
        Données embarquées du {ed.label} · dernière synchronisation impossible.
      </Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} hitSlop={HIT.sm} accessibilityRole="button" accessibilityLabel="Réessayer la synchronisation"
          style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: SP.xs }}>
          <Text style={[TYPE.label, { color: C.cobalt }]}>Réessayer</Text>
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
    <View style={{ paddingHorizontal: SP.md, paddingBottom: Math.max(insets.bottom, SP.sm) + SP.xs, backgroundColor: 'transparent' }}>
      <View accessibilityRole="tablist"
        style={[{ flexDirection: 'row', backgroundColor: C.panel, borderRadius: RADIUS.dock, borderWidth: 1, borderColor: C.border2, paddingTop: SP.sm2, paddingBottom: SP.sm2, paddingHorizontal: SP.sm }, shadow]}>
        {TABS.map((t, i) => {
          const on = tab === t.key;
          return (
            <TouchableOpacity key={t.key} activeOpacity={0.7} onPress={() => setTab(t.key)}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}, onglet ${i + 1} sur ${TABS.length}`}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: SP.xs }}>
              <View style={{ height: 32, minWidth: 56, paddingHorizontal: SP.md2, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.actionFill : 'transparent' }}>
                <Icon name={on ? `${t.icon}-on` : t.icon} size={24} color={on ? C.onAction : C.inkMut} />
              </View>
              <Text numberOfLines={1} allowFontScaling maxFontSizeMultiplier={1.3}
                style={[TYPE.nav, { fontFamily: on ? F.bodySemi : F.body, color: on ? C.cobalt : C.inkMut }]}>
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
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.bg, borderTopLeftRadius: RADIUS.chip, borderTopRightRadius: RADIUS.chip, paddingTop: SP.sm2, paddingBottom: SP.sm2 + insets.bottom, maxHeight: '70%' }}>
          <View style={{ alignItems: 'center', paddingVertical: SP.xs2 }}>
            <View style={{ width: 40, height: 4, borderRadius: RADIUS.half(4), backgroundColor: C.border }} />
          </View>
          <Text style={[TYPE.subtitle, { color: C.ink, paddingHorizontal: SP.xl, paddingVertical: SP.sm2 }]}>Choisir l'édition</Text>
          <ScrollView>
            {list.map((e) => {
              const on = e.date === date;
              return (
                <TouchableOpacity key={e.date} onPress={() => onPick(e.date)}
                  accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={on ? `${e.label}, édition affichée` : e.label}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.xl, paddingVertical: SP.md2 }}>
                  <Text style={[TYPE.body, { fontFamily: on ? F.bodySemi : F.body, color: on ? C.cobalt : C.ink }]}>{e.label}</Text>
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
