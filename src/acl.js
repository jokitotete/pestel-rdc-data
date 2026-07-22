// Anti-Corruption Layer — frontière de confiance entre le JSON distant (NON FIABLE) et le modèle
// interne. Le contenu vient de GitHub raw : TLS authentifie le transport, pas le contenu. On valide
// donc la FORME, les TYPES et l'INTÉGRITÉ RÉFÉRENTIELLE, et on rejette EN BLOC (fail-closed) si le
// contrat casse — plutôt qu'un repli silencieux sur une donnée à moitié appliquée.

const DANGER = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// RS3.3 : une FEUILLE sûre — jamais un objet/tableau là où le rendu attend un enfant Text ou le store
// appelle une méthode de string. Un objet à sa place lève « Objects are not valid as a React child » ou
// un TypeError (.split/.map) = DoS distant PERSISTANT que l'ErrorBoundary ne guérit pas (le store muté
// re-crashe à chaque rendu). Autorise string/number/booléen/absent ; rejette objet et tableau.
const isScalar = (x) => x == null || typeof x !== 'object';
// Feuille sur laquelle le RENDU appelle une méthode de STRING (ex. charts : unit.trim()) : « scalaire » ne
// suffit pas (un number passerait puis .trim planterait) — il faut string-ou-absent. Même logique que les
// feuilles .split/.map traitées en RS3.3 : on type au niveau de la frontière, pas seulement au rendu.
const isStr = (x) => x == null || typeof x === 'string';

// Prédicats de contenu — typent EXHAUSTIVEMENT tout champ RENDU comme enfant React OU sur lequel le
// store/les écrans/les graphes appellent une méthode. Dérivés du schéma RÉEL (public/pestel-data.json,
// généré par build_data.js). Sous-valider = laisser un objet crasher au rendu (itérations QA 1→3).
const okTimelineEntry = (e) => isObj(e) && isScalar(e.d) && isScalar(e.e);          // Detail chrono : {t.d}/{t.e}
const okZoom = (z) => z == null || (isObj(z)
  && isScalar(z.context) && isScalar(z.outlook)                                     // Detail : {z.context}/{z.outlook}
  && (z.timeline == null || (Array.isArray(z.timeline) && z.timeline.every(okTimelineEntry))));
  // z.actors : Detail le rend DÉFENSIVEMENT (string | tableau | objets {name,role}) → non contraint ici.
const okItem = (x) => isObj(x)
  && typeof x.code === 'string' && typeof x.title === 'string'                      // code = clé de résolution ; title = enfant Text
  && isScalar(x.text) && isScalar(x.analysis) && isScalar(x.reliability)            // rendus par NewsCard/Detail
  && (x.sources == null || Array.isArray(x.sources))                                // QA v1.2 : sourcesFor fait ids.map → Array-ou-absent
  && okZoom(x.zoom);
const okAxis = (a) => isObj(a) && typeof a.key === 'string'                         // key = pick(AX,…) + résolution
  && isScalar(a.name) && isScalar(a.short) && isScalar(a.lens)                      // axisName = short||name ; lens rendus
  && Array.isArray(a.items) && a.items.every(okItem);
const okSource = (s) => isObj(s)
  && isScalar(s.name) && isScalar(s.type) && isScalar(s.date) && isScalar(s.url)    // name : primarySource.split ; type/date/url rendus/traités
  && isScalar(s.reliability);                                                       // QA v1.2 : SrcDot rend {rel} en enfant Text
const okAgenda = (a) => isObj(a) && isScalar(a.when) && isStr(a.what) && isScalar(a.code);   // Home « À suivre » ; what : .trim() dans upcomingEvents
// feed/triage (étage N1) — LOT-F : le fil ne porte plus seulement un titre et un axe. Il peut porter la
// CONFIANCE du classement, le MEILLEUR CANDIDAT (runnerUp) et la COTE de source (A→D), tous RENDUS par la
// carte N1. On les type donc ici aussi, même si src/n1.js les recoerce : une frontière de confiance ne
// délègue pas sa validation au consommateur (défense en profondeur, doctrine RS3.3 de ce fichier).
// `runnerUp` est tolérant par contrat : chaîne ('E') OU objet {axis, axisLabel} — jamais un tableau, dont
// personne ne saurait quoi faire, et dont l'acceptation muette masquerait un changement de format amont.
const okRunnerUp = (r) => r == null || isScalar(r) || (isObj(r) && isScalar(r.axis) && isScalar(r.axisLabel));
const okListOfObj = (v) => Array.isArray(v) && v.every((x) => isObj(x)
  && isScalar(x.title) && isScalar(x.axisLabel)                                   // rendus (titre, libellé d'axe)
  && isScalar(x.confidence) && isScalar(x.sourceGrade) && isScalar(x.statut)      // rendus par la carte N1
  && okRunnerUp(x.runnerUp));

// Stats — feuilles rendues par l'onglet Données (KPI + graphes).
const okKV = (s) => s == null || (isObj(s) && isScalar(s.n) && isScalar(s.u));                   // src {n,u} (libellé + url)
const okIndicator = (i) => isObj(i) && isScalar(i.value) && isScalar(i.label) && isScalar(i.unit) && isScalar(i.note) && okKV(i.src);
const okTheme = (t) => isObj(t) && typeof t.label === 'string'
  && (t.indicators == null || (Array.isArray(t.indicators) && t.indicators.every(okIndicator)));
const okSeries = (s) => isObj(s) && isScalar(s.name) && Array.isArray(s.values);                 // charts fait s.values.map
const okChartDatum = (d) => isObj(d) && isScalar(d.label) && isScalar(d.value);                  // BarChart/DonutChart : {d.label}
const okTrend = (tr) => isObj(tr)
  && isScalar(tr.type) && isScalar(tr.title) && isScalar(tr.note)
  && isScalar(tr.centerV) && isScalar(tr.centerL) && isStr(tr.unit)   // unit : .trim() au rendu → string stricte
  && okKV(tr.src)
  && (tr.labels == null || (Array.isArray(tr.labels) && tr.labels.every(isScalar)))             // LineChart : {l}
  && (tr.series == null || (Array.isArray(tr.series) && tr.series.every(okSeries)))
  && (tr.data == null || (Array.isArray(tr.data) && tr.data.every(okChartDatum)));

// Le payload distant respecte-t-il le contrat ? (formes + types + intégrité). Tout ou rien.
export function validateData(raw) {
  if (!isObj(raw)) return false;
  const { editions, manifest, stats } = raw;
  if (!isObj(editions) || !Array.isArray(manifest) || manifest.length === 0) return false;
  if (!isObj(stats) || !Array.isArray(stats.themes) || !Array.isArray(stats.trends)) return false;
  if (!isScalar(stats.updated)) return false;   // RS3.4 : « maj {STATS.updated} » rendu par l'onglet Données
  if (!stats.themes.every(okTheme)) return false;
  if (!stats.trends.every(okTrend)) return false;

  // manifest : chaque entrée = { date ISO, label }
  const okManifest = manifest.every(
    (m) => isObj(m) && typeof m.date === 'string' && DATE_RE.test(m.date) && typeof m.label === 'string'
  );
  if (!okManifest) return false;

  // editions : clés = dates ISO (jamais une clé dangereuse) ; valeurs = objets porteurs de axes[]/headline[]/sources[]
  const keys = Object.keys(editions);
  if (keys.length === 0) return false;
  for (const k of keys) {
    if (DANGER.has(k) || !DATE_RE.test(k)) return false;
    const e = editions[k];
    if (!isObj(e) || !Array.isArray(e.axes) || !Array.isArray(e.headline) || !Array.isArray(e.sources)) return false;
    if (!isScalar(e.label)) return false;                        // RS3.4 : ed.label est un simple libellé RENDU (en-tête/bandeaux)
    // QA v1.2 : e.date n'est PAS un libellé, c'est une IDENTITÉ. Detail construit `edDate: ed.date` BRUT dans le
    // snapshot de favori ; un e.date NUMÉRIQUE passait isScalar, l'étoile s'allumait… puis sanitizeFavs jetait le
    // favori au relancement (typeof f.edDate !== 'string') → PERTE SILENCIEUSE d'une action utilisateur, pilotée à
    // distance. Une clé doit tenir le contrat de la clé : même DATE_RE que les clés d'éditions ci-dessus.
    if (typeof e.date !== 'string' || !DATE_RE.test(e.date)) return false;
    // RS3.3 : typer EXHAUSTIVEMENT les feuilles rendues/déréférencées — headline & items (code/title/text/
    // analysis/zoom), axes (key/short/name/lens), sources (name/type/date/url), agenda (when/what/code).
    if (!e.headline.every(okItem)) return false;
    if (!e.axes.every(okAxis)) return false;
    if (!e.sources.every(okSource)) return false;
    if (e.agenda != null && !(Array.isArray(e.agenda) && e.agenda.every(okAgenda))) return false;
  }

  // Intégrité référentielle : l'édition la plus récente (manifest[0]) DOIT exister dans editions,
  // sinon latestDate()→getEdition() renvoie null → fallback, mais on préfère rejeter un contrat cassé.
  if (!Object.prototype.hasOwnProperty.call(editions, manifest[0].date)) return false;

  // `feed`/`triage` (fils de collecte) OPTIONNELS. Présents → tableaux d'objets à title scalaire (rendu).
  // La SÛRETÉ de l'URL est revalidée à l'ouverture (isSafeUrl/confirmOpenURL) : jamais sur la seule foi de l'ACL.
  if ('feed' in raw && !okListOfObj(raw.feed)) return false;
  if ('triage' in raw && !okListOfObj(raw.triage)) return false;
  return true;
}

// Copie clé-par-clé en écartant les clés dangereuses — remplace un Object.assign du brut, qui
// déclencherait le setter __proto__ (pollution de prototype) sur une entrée malveillante.
export function safeAssign(target, source) {
  for (const k of Object.keys(source)) {
    if (DANGER.has(k)) continue;
    target[k] = source[k];
  }
  return target;
}
