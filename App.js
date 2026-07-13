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
import { Icon, Rule } from './src/ui';
import { getEdition, latestDate, editionsList, applyRemote, getFeed } from './src/store';
import { fetchRemoteData, DATA_URL } from './src/remote';
import { loadSector, saveSector } from './src/prefs';
import { SECTORS } from './src/sectors';
import Home from './src/screens/Home';
import Axes from './src/screens/Axes';
import MapScreen from './src/screens/Map';
import Stats from './src/screens/Stats';
import Search from './src/screens/Search';
import Sources from './src/screens/Sources';
import Detail from './src/screens/Detail';
import Welcome from './src/screens/Welcome';

// On garde le splash natif AFFICHÉ jusqu'à ce que l'écran d'accueil animé prenne le relais (pas de flash).
SplashScreen.preventAutoHideAsync().catch(() => {});

const TABS = [
  { key: 'home', label: 'À la une', icon: 'home' },
  { key: 'axes', label: 'Axes', icon: 'axes' },
  { key: 'map', label: 'Carte', icon: 'map' },
  { key: 'stats', label: 'Données', icon: 'stats' },
  { key: 'sources', label: 'Sources', icon: 'sources' },
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
  const toggleTheme = () => { const m = mode === 'light' ? 'dark' : 'light'; applyTheme(m); setMode(m); setThemeVer((v) => v + 1); };
  const [sector, setSector] = useState(null);     // Lentille sectorielle (P1) — persistante, corrigible
  const [sectorSheet, setSectorSheet] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);   // écran d'accueil « bande annonce » (≥ 3 s) vu ?
  const onWelcomeLayout = useCallback(() => { SplashScreen.hideAsync().catch(() => {}); }, []);  // masque le splash natif
  const pickSector = (k) => { setSector(k); saveSector(k); setSectorSheet(false); };

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
    loadSector().then((k) => setSector(k));
    const iv = setInterval(refresh, 5 * 60 * 1000);                            // re-contrôle toutes les 5 min
    // Retour au premier plan : re-contrôle, mais debouncé (≥ 30 s) pour ne pas mitrailler la source.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - lastRunRef.current > 30000) refresh();
    });
    return () => { clearInterval(iv); if (sub && sub.remove) sub.remove(); };
  }, [refresh]);

  if (!loaded) return null;   // polices en cours : le splash natif reste affiché (preventAutoHide)
  const ed = getEdition(date);
  const dEd = detailEd || ed;   // l'item du détail peut venir d'une autre édition (Event)

  return (
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
            <FreshnessTag net={net} ed={ed} />
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={toggleTheme} hitSlop={8}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={C.inkDim} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchOpen(true)} hitSlop={8}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <Icon name="search" size={20} color={C.inkDim} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setSheet(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Icon name="calendar" size={14} color={C.cobalt} />
            <Text style={{ fontFamily: F.bodySemi, fontSize: 12.5, color: C.ink }}>{ed.label}</Text>
          </TouchableOpacity>
        </View>

        {/* Fraîcheur des données — bandeau persistant quand on tourne hors ligne (P2, anti-ARCA) */}
        {net === 'offline' ? <OfflineBanner ed={ed} /> : null}

        {/* Écran actif (fondu + léger glissement à chaque changement d'onglet) */}
        <ScreenFade tabKey={tab}>
          {tab === 'home' && <Home ed={ed} onOpen={setDetail} sector={sector} onChangeSector={() => setSectorSheet(true)} feed={date === latestDate() ? getFeed() : []} />}
          {tab === 'axes' && <Axes ed={ed} onOpen={setDetail} onOpenEvent={openEvent} />}
          {tab === 'map' && <MapScreen ed={ed} onOpen={setDetail} />}
          {tab === 'stats' && <Stats />}
          {tab === 'sources' && <Sources ed={ed} onOpen={setDetail} />}
        </ScreenFade>

        <TabBar tab={tab} setTab={setTab} />
      </SafeAreaView>

      {/* Modale de détail (zoom sur un item — dans son édition d'origine dEd) */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={closeDetail} presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut }}>{dEd.label}</Text>
            <TouchableOpacity onPress={closeDetail} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.cobalt }}>Fermer</Text>
              <Icon name="close" size={18} color={C.cobalt} />
            </TouchableOpacity>
          </View>
          {detail ? <Detail ed={dEd} code={detail} onOpen={setDetail} /> : null}
        </SafeAreaView>
      </Modal>

      {/* Recherche (ouverte par la loupe de l'en-tête) */}
      <Modal visible={searchOpen} animationType="slide" onRequestClose={() => setSearchOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.ink }}>Recherche</Text>
            <TouchableOpacity onPress={() => setSearchOpen(false)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.cobalt }}>Fermer</Text>
              <Icon name="close" size={18} color={C.cobalt} />
            </TouchableOpacity>
          </View>
          <Search ed={ed} onOpen={(code) => { setSearchOpen(false); setDetail(code); }} />
        </SafeAreaView>
      </Modal>

      {/* Sélecteur d'édition */}
      <EditionSheet open={sheet} date={date} onClose={() => setSheet(false)} onPick={(d) => { chooseDate(d); setSheet(false); setDetail(null); }} />

      {/* Sélecteur de secteur (Lentille P1) */}
      <SectorSheet open={sectorSheet} sector={sector} onClose={() => setSectorSheet(false)} onPick={pickSector} />

      {/* Écran d'accueil « bande annonce » — logo + slogan + drapeau, ≥ 3 s, par-dessus tout au lancement */}
      {!welcomeDone && <Welcome onLayout={onWelcomeLayout} onDone={() => setWelcomeDone(true)} />}
    </SafeAreaProvider>
  );
}

// Choix du secteur de la Lentille (P1) — national (aucun) ou un secteur transversal. Persistant.
function SectorSheet({ open, sector, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  const opts = [{ key: null, label: 'National — tout le pays', icon: '🇨🇩' }, ...SECTORS.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))];
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(20,25,40,0.35)', justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, paddingBottom: 10 + insets.bottom, maxHeight: '70%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink, paddingHorizontal: 20, paddingVertical: 8 }}>Votre secteur</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkMut, paddingHorizontal: 20, marginBottom: 6 }}>Remonte votre secteur sur « À la une ». Modifiable à tout moment.</Text>
          <ScrollView>
            {opts.map((o) => {
              const on = o.key === sector;
              return (
                <TouchableOpacity key={o.key || 'national'} onPress={() => onPick(o.key)}
                  accessibilityRole="button" accessibilityLabel={o.label}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 }}>
                  <Text style={{ fontSize: 18 }}>{o.icon}</Text>
                  <Text style={{ fontFamily: on ? F.bodySemi : F.body, fontSize: 15, color: on ? C.cobalt : C.ink, flex: 1 }}>{o.label}</Text>
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
function FreshnessTag({ net, ed }) {
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
function OfflineBanner({ ed }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: tint(C.gold, 0.15), borderBottomWidth: 1, borderBottomColor: tint(C.gold, 0.35) }}>
      <Icon name="warning" size={15} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 11.5, color: C.ink, lineHeight: 15 }}>
        Données embarquées du {ed.label} · dernière synchronisation impossible.
      </Text>
    </View>
  );
}

function TabBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.panel, paddingTop: 8, paddingBottom: 8 + insets.bottom }}>
      {TABS.map((t) => {
        const on = tab === t.key;
        return (
          <TouchableOpacity key={t.key} activeOpacity={0.7} onPress={() => setTab(t.key)}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Icon name={on ? `${t.icon}-on` : t.icon} size={22} color={on ? C.cobalt : C.inkMut} />
            <Text style={{ fontFamily: on ? F.bodySemi : F.body, fontSize: 10.5, color: on ? C.cobalt : C.inkMut }}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
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
