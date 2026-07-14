import React, { useEffect, useRef } from 'react';
import { Text, View, Image, Animated, Easing, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { F, SLOGAN } from '../theme';

// Durée minimale garantie de l'écran d'accueil (« bande annonce »). RS3 : ramenée de 9 s à 4 s — 9 s à CHAQUE
// lancement (l'écran revient toujours) lisait « appli figée » ; 4 s reste au-dessus du plancher RS1 « ≥ 3 s »
// et l'écran est de toute façon SKIPPABLE au tap (affordance visible ci-dessous).
const MIN_MS = 4000;

// Accroche FIXE (baseline produit) — affichée EN PERMANENCE sous le slogan. Une seule promesse, stable.
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
  const doneRef = useRef(false);
  // RS1 : splash SKIPPABLE (contrôle explicite) — un tap lance le fondu de sortie tout de suite, sans attendre les 9 s.
  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => onDone && onDone());
  };

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

    const t = setTimeout(skip, MIN_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View onLayout={onLayout} style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 999 }]}>
      <Pressable onPress={skip} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Passer l'écran d'accueil, entrer dans l'application">
      <LinearGradient colors={['#070C1C', '#0F1E52', '#1D3FC4']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
        <View style={styles.center}>
          <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoSc }] }}>
            <Image source={require('../../assets/ntongo/icon.png')} style={styles.logo} />
          </Animated.View>
          <Animated.View style={{ opacity: textOp, transform: [{ translateY: textTy }], alignItems: 'center' }}>
            <Text style={styles.wordmark}>Ntongo <Text style={{ color: '#F4B740' }}>· RDC</Text></Text>
            <Text style={styles.slogan}>{SLOGAN}</Text>
            {/* QW 14/07 : drapeau 🇨🇩 et boussole retirés — accueil épuré, seuls slogan + accroche portent la promesse. */}
            <Text style={styles.accrocheTxt}>{ACCROCHE}</Text>
          </Animated.View>
        </View>
        {/* Barre de progression or (bas de l'écran) */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        {/* RS3 : affordance VISIBLE que l'écran est skippable (sinon la barre se lit comme « chargement, attendre »). */}
        <Text style={styles.skipHint}>Toucher pour passer</Text>
        <Text style={styles.foot}>2iD Consulting</Text>
      </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 48 },
  center: { alignItems: 'center' },
  logo: { width: 104, height: 104, borderRadius: 26, marginBottom: 22 },
  wordmark: { fontFamily: F.displayBold, fontSize: 30, color: '#FFFFFF', letterSpacing: 0.3 },
  // QW : slogan et accroche réduits très légèrement (28→26 / 24→22).
  slogan: { fontFamily: F.body, fontSize: 26, color: '#CFDDF0', marginTop: 14, textAlign: 'center', lineHeight: 34, paddingHorizontal: 20 },
  accrocheTxt: { fontFamily: F.mono, fontSize: 22, color: '#9FB4DA', textAlign: 'center', lineHeight: 30, marginTop: 18, paddingHorizontal: 16 },
  barTrack: { position: 'absolute', bottom: 78, alignSelf: 'center', width: 150, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  skipHint: { position: 'absolute', bottom: 58, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.6 },
  barFill: { height: 3, borderRadius: 2, backgroundColor: '#F4B740' },
  foot: { position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 12, color: '#6E82AA', letterSpacing: 0.4 },
});
