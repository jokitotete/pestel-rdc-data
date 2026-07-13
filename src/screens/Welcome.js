import React, { useEffect, useRef } from 'react';
import { Text, View, Image, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { F, SLOGAN } from '../theme';

// Durée minimale garantie de l'écran d'accueil (« bande annonce ») — au moins 3 s pour donner l'envie.
const MIN_MS = 3200;

// Accroche + motif qui CHANGENT chaque jour (déterministe par quantième → stable sur la journée, varie
// d'un jour à l'autre). Rien n'est fabriqué : ce sont des formulations de marque, pas de l'actualité.
const DAILY = [
  { motif: '🌅', accroche: 'Le pays, éclairé dès l’aube.' },
  { motif: '🧭', accroche: 'Votre boussole sur la RDC.' },
  { motif: '📊', accroche: 'Les faits, mis en perspective.' },
  { motif: '🛰️', accroche: 'La veille qui ne dort jamais.' },
  { motif: '🗺️', accroche: 'De Kinshasa à l’Ituri, l’essentiel.' },
  { motif: '⚖️', accroche: 'Comprendre avant de décider.' },
  { motif: '🔎', accroche: 'Rien d’important ne vous échappe.' },
];
const dayOfYear = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);

// Écran d'accueil animé. `onLayout` sert à masquer le splash natif une fois monté (transition sans flash).
// `onDone` est appelé après l'animation ET l'écoulement de la durée minimale.
export default function Welcome({ onDone, onLayout }) {
  const day = DAILY[dayOfYear(new Date()) % DAILY.length];
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoSc = useRef(new Animated.Value(0.86)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const textTy = useRef(new Animated.Value(10)).current;
  const bar = useRef(new Animated.Value(0)).current;      // barre de progression (0 → 1) sur ~3 s
  const fade = useRef(new Animated.Value(1)).current;      // fondu de sortie de tout l'écran

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logoSc, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(textTy, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
    // Barre de progression synchronisée sur la durée minimale (rythme « bande annonce »).
    Animated.timing(bar, { toValue: 1, duration: MIN_MS - 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();

    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => onDone && onDone());
    }, MIN_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View onLayout={onLayout} style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 999 }]}>
      <LinearGradient colors={['#070C1C', '#0F1E52', '#1D3FC4']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
        <View style={styles.center}>
          <Text style={styles.flag}>🇨🇩</Text>
          <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoSc }] }}>
            <Image source={require('../../assets/ntongo/icon.png')} style={styles.logo} />
          </Animated.View>
          <Animated.View style={{ opacity: textOp, transform: [{ translateY: textTy }], alignItems: 'center' }}>
            <Text style={styles.wordmark}>Ntongo <Text style={{ color: '#F4B740' }}>· RDC</Text></Text>
            <Text style={styles.slogan}>{SLOGAN}</Text>
            <Text style={styles.accroche}>{day.motif}  {day.accroche}</Text>
          </Animated.View>
        </View>
        {/* Barre de progression or (bas de l'écran) */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <Text style={styles.foot}>2iD Consulting · veille PESTEL</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 48 },
  center: { alignItems: 'center' },
  flag: { fontSize: 26, marginBottom: 16 },
  logo: { width: 104, height: 104, borderRadius: 26, marginBottom: 22 },
  wordmark: { fontFamily: F.displayBold, fontSize: 30, color: '#FFFFFF', letterSpacing: 0.3 },
  slogan: { fontFamily: F.body, fontSize: 14, color: '#CFDDF0', marginTop: 10, textAlign: 'center' },
  accroche: { fontFamily: F.mono, fontSize: 12, color: '#9FB4DA', marginTop: 14, textAlign: 'center' },
  barTrack: { position: 'absolute', bottom: 60, width: 150, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2, backgroundColor: '#F4B740' },
  foot: { position: 'absolute', bottom: 34, fontFamily: F.mono, fontSize: 10, color: '#6E82AA', letterSpacing: 0.4 },
});
