import React, { useState, useRef, useEffect } from 'react';
import { Text, View, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

import { C, F } from './src/theme';
import { Icon, Rule } from './src/ui';
import { getEdition, latestDate, editionsList, applyRemote } from './src/store';
import { fetchRemoteData, DATA_URL } from './src/remote';
import Home from './src/screens/Home';
import Axes from './src/screens/Axes';
import MapScreen from './src/screens/Map';
import Stats from './src/screens/Stats';
import Search from './src/screens/Search';
import Sources from './src/screens/Sources';
import Detail from './src/screens/Detail';

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
  const [tab, setTab] = useState('home');
  const [detail, setDetail] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [online, setOnline] = useState(false);   // true = données du jour récupérées en ligne
  const [, setDataVer] = useState(0);             // bump → re-rendu après application des données en ligne

  // Au démarrage : on tente de récupérer les données à jour en ligne ; sinon on garde l'embarqué.
  useEffect(() => {
    let alive = true;
    fetchRemoteData().then((d) => {
      if (alive && applyRemote(d)) {
        setDate(latestDate());
        setOnline(true);
        setDataVer((v) => v + 1);
      }
    });
    return () => { alive = false; };
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const ed = getEdition(date);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        {/* En-tête de marque */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
          <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: C.cobalt, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ fontSize: 17 }}>🇨🇩</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.ink }}>
              RDC <Text style={{ color: C.cobalt }}>Veille</Text>
            </Text>
            {online ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ok }} />
                <Text style={{ fontFamily: F.mono, fontSize: 9.5, color: C.inkMut }}>données à jour · en ligne</Text>
              </View>
            ) : null}
          </View>
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

        {/* Écran actif (fondu + léger glissement à chaque changement d'onglet) */}
        <ScreenFade tabKey={tab}>
          {tab === 'home' && <Home ed={ed} onOpen={setDetail} />}
          {tab === 'axes' && <Axes ed={ed} onOpen={setDetail} />}
          {tab === 'map' && <MapScreen ed={ed} onOpen={setDetail} />}
          {tab === 'stats' && <Stats />}
          {tab === 'sources' && <Sources ed={ed} onOpen={setDetail} />}
        </ScreenFade>

        <TabBar tab={tab} setTab={setTab} />
      </SafeAreaView>

      {/* Modale de détail (zoom sur un item) */}
      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)} presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkMut }}>{ed.label}</Text>
            <TouchableOpacity onPress={() => setDetail(null)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.cobalt }}>Fermer</Text>
              <Icon name="close" size={18} color={C.cobalt} />
            </TouchableOpacity>
          </View>
          {detail ? <Detail ed={ed} code={detail} onOpen={setDetail} /> : null}
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
      <EditionSheet open={sheet} date={date} onClose={() => setSheet(false)} onPick={(d) => { setDate(d); setSheet(false); setDetail(null); }} />
    </SafeAreaProvider>
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

function TabBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.panel, paddingTop: 8, paddingBottom: 8 + insets.bottom }}>
      {TABS.map((t) => {
        const on = tab === t.key;
        return (
          <TouchableOpacity key={t.key} activeOpacity={0.7} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
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
