import AsyncStorage from '@react-native-async-storage/async-storage';

// Préférences persistées (best-effort). Aujourd'hui : la LENTILLE sectorielle (P1) — le secteur
// choisi survit aux relances (exigence Product Owner : état persistant, corrigible, jamais deviné).
const KEY_SECTOR = 'ntongo.sector.v1';

export async function loadSector() {
  try {
    return (await AsyncStorage.getItem(KEY_SECTOR)) || null;
  } catch (e) {
    return null;   // pas de persistance dispo → national par défaut (dégradation sûre)
  }
}

export async function saveSector(key) {
  try {
    if (key) await AsyncStorage.setItem(KEY_SECTOR, key);
    else await AsyncStorage.removeItem(KEY_SECTOR);
  } catch (e) {
    /* best-effort : l'app reste fonctionnelle sans persistance */
  }
}

// Préférences génériques (blob JSON fusionné) — « Le Réveil Ntongo » : { lastSeen, notifOn }.
const KEY_PREFS = 'ntongo.prefs.v1';

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFS);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) {
    return {};   // dégradation sûre : pas de persistance → valeurs par défaut
  }
}

// Fusion (patch) : ne réécrit que les clés fournies, préserve le reste.
export async function savePrefs(patch) {
  try {
    const cur = await loadPrefs();
    const next = { ...cur, ...(patch || {}) };
    await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(next));
    return next;
  } catch (e) {
    return null;
  }
}
