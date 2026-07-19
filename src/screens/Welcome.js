import React, { useEffect, useRef } from 'react';
import { Text, View, Image, Animated, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { SLOGAN, SP, RADIUS, DUR, EASE, SPLASH, SPLASH_TYPE } from '../theme';
import { useReduceMotion } from '../ui';

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
  const reduce = useReduceMotion();   // RS1-16 : respecte « réduire les animations »
  // RS1 : splash SKIPPABLE (contrôle explicite) — un tap lance le fondu de sortie tout de suite, sans attendre les 9 s.
  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(fade, { toValue: 0, duration: DUR.slow, useNativeDriver: true }).start(() => onDone && onDone());
  };

  useEffect(() => {
    if (reduce) {
      // Reduce-motion : ni scale ni translate — apparition par simple opacité (plancher MIN_MS conservé).
      logoSc.setValue(1); textTy.setValue(0);
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: DUR.slow, useNativeDriver: true }),
        Animated.timing(textOp, { toValue: 1, duration: DUR.slow, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOp, { toValue: 1, duration: DUR.splashLogo, easing: EASE.standard, useNativeDriver: true }),
          Animated.spring(logoSc, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(textOp, { toValue: 1, duration: DUR.splashIn, useNativeDriver: true }),
          Animated.timing(textTy, { toValue: 0, duration: DUR.splashIn, easing: EASE.standard, useNativeDriver: true }),
        ]),
      ]).start();
    }
    // Barre de progression synchronisée sur la durée minimale (rythme « bande annonce »).
    Animated.timing(bar, { toValue: 1, duration: MIN_MS - 500, easing: EASE.inOut, useNativeDriver: false }).start();

    const t = setTimeout(skip, MIN_MS);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <Animated.View onLayout={onLayout} style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 999 }]}>
      <Pressable onPress={skip} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Passer l'écran d'accueil, entrer dans l'application">
      <LinearGradient colors={SPLASH.grad} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
        <View style={styles.center}>
          <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoSc }] }}>
            <Image source={require('../../assets/ntongo/icon.png')} style={styles.logo} />
          </Animated.View>
          <Animated.View style={{ opacity: textOp, transform: [{ translateY: textTy }], alignItems: 'center' }}>
            <Text style={styles.wordmark}>Ntongo <Text style={{ color: SPLASH.gold }}>· RDC News</Text></Text>
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
        {/* TCK-019 : version de l'application, sous « 2iD Consulting » (proposition du commanditaire). */}
        <Text style={styles.version}>{'version ' + (Constants.expoConfig?.version || '1.4.0')}</Text>
      </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: SP.giant },
  center: { alignItems: 'center' },
  logo: { width: 104, height: 104, borderRadius: RADIUS.dock, marginBottom: SP.xl2 },
  // RS1 : typographie de MARQUE via SPLASH_TYPE (échelle propre au splash — QW : slogan 26 / accroche 22).
  wordmark: { ...SPLASH_TYPE.wordmark, color: SPLASH.textHi },
  slogan: { ...SPLASH_TYPE.slogan, color: SPLASH.textMid, marginTop: SP.md2, textAlign: 'center', paddingHorizontal: SP.xl },
  accrocheTxt: { ...SPLASH_TYPE.accroche, color: SPLASH.textLow, textAlign: 'center', marginTop: SP.gutter, paddingHorizontal: SP.lg },
  barTrack: { position: 'absolute', bottom: 78, alignSelf: 'center', width: 150, height: 3, borderRadius: RADIUS.xs, backgroundColor: SPLASH.track, overflow: 'hidden' },
  skipHint: { ...SPLASH_TYPE.hint, position: 'absolute', bottom: 58, left: 0, right: 0, textAlign: 'center', color: SPLASH.hint },
  barFill: { height: 3, borderRadius: RADIUS.xs, backgroundColor: SPLASH.gold },
  foot: { ...SPLASH_TYPE.foot, position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', color: SPLASH.foot },
  // TCK-019 : version sous « 2iD Consulting » — typo « hint » + jeton couleur (zéro littéral, RS1-06).
  version: { ...SPLASH_TYPE.hint, position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: SPLASH.foot },
});
