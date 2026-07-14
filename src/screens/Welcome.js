import React, { useEffect, useRef } from 'react';
import { Text, View, Image, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { F, SLOGAN } from '../theme';
import { Glyph } from '../ui';

// Durée minimale garantie de l'écran d'accueil (« bande annonce ») — 9 s pour donner l'envie.
const MIN_MS = 9000;

// Accroche FIXE (baseline produit) — affichée EN PERMANENCE sous le slogan, avec la boussole. Plus de
// rotation quotidienne : une seule promesse, stable.
const ACCROCHE = 'Comprendre pour mieux décider.';

// Écran d'accueil animé. `onLayout` sert à masquer le splash natif une fois monté (transition sans flash).
// `onDone` est appelé après l'animation ET l'écoulement de la durée minimale.
export default function Welcome({ onDone, onLayout }) {
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
          <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoSc }] }}>
            <Image source={require('../../assets/ntongo/icon.png')} style={styles.logo} />
          </Animated.View>
          <Animated.View style={{ opacity: textOp, transform: [{ translateY: textTy }], alignItems: 'center' }}>
            <Text style={styles.wordmark}>Ntongo <Text style={{ color: '#F4B740' }}>· RDC</Text></Text>
            <Text style={styles.slogan}>{SLOGAN}</Text>
            <View style={styles.accrocheRow}>
              {/* Boussole PERMANENTE (orientation = la promesse Ntongo) — jamais d'emoji ni de loupe/balance,
                  quel que soit le jour. Seul le TEXTE de l'accroche tourne. */}
              <Glyph name="compass" size={34} color="#F4B740" />
              <Text style={styles.accrocheTxt}>{ACCROCHE}</Text>
            </View>
            <Text style={styles.flag}>🇨🇩</Text>
          </Animated.View>
        </View>
        {/* Barre de progression or (bas de l'écran) */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <Text style={styles.foot}>2iD Consulting</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 48 },
  center: { alignItems: 'center' },
  flag: { fontSize: 82, marginTop: 26 },
  logo: { width: 104, height: 104, borderRadius: 26, marginBottom: 22 },
  wordmark: { fontFamily: F.displayBold, fontSize: 30, color: '#FFFFFF', letterSpacing: 0.3 },
  slogan: { fontFamily: F.body, fontSize: 28, color: '#CFDDF0', marginTop: 14, textAlign: 'center', lineHeight: 36, paddingHorizontal: 20 },
  accrocheRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingHorizontal: 16 },
  accrocheTxt: { fontFamily: F.mono, fontSize: 24, color: '#9FB4DA', textAlign: 'center', lineHeight: 32, flexShrink: 1 },
  barTrack: { position: 'absolute', bottom: 60, alignSelf: 'center', width: 150, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2, backgroundColor: '#F4B740' },
  foot: { position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 12, color: '#6E82AA', letterSpacing: 0.4 },
});
