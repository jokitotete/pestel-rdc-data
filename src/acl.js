// Anti-Corruption Layer — frontière de confiance entre le JSON distant (NON FIABLE) et le modèle
// interne. Le contenu vient de GitHub raw : TLS authentifie le transport, pas le contenu. On valide
// donc la FORME, les TYPES et l'INTÉGRITÉ RÉFÉRENTIELLE, et on rejette EN BLOC (fail-closed) si le
// contrat casse — plutôt qu'un repli silencieux sur une donnée à moitié appliquée.

const DANGER = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// RS_Sec2 : une FEUILLE sûre à rendre comme enfant React — jamais un objet/tableau (qui lève
// « Objects are not valid as a React child » = DoS distant persistant que l'ErrorBoundary ne guérit pas).
// Autorise string/number/booléen/absent ; rejette objet et tableau.
const isScalar = (x) => x == null || typeof x !== 'object';
const okLeaf = (x) => isObj(x) && typeof x.code === 'string' && typeof x.title === 'string' && isScalar(x.text);

// Le payload distant respecte-t-il le contrat ? (formes + types + intégrité). Tout ou rien.
export function validateData(raw) {
  if (!isObj(raw)) return false;
  const { editions, manifest, stats } = raw;
  if (!isObj(editions) || !Array.isArray(manifest) || manifest.length === 0) return false;
  if (!isObj(stats) || !Array.isArray(stats.themes) || !Array.isArray(stats.trends)) return false;
  // RS_Sec2 : feuilles stats rendues (label/value/unit/note des KPI ; title/note des graphes) = scalaires.
  const okTheme = (t) => isObj(t) && typeof t.label === 'string'
    && (t.indicators == null || (Array.isArray(t.indicators)
      && t.indicators.every((i) => isObj(i) && isScalar(i.value) && isScalar(i.label) && isScalar(i.unit) && isScalar(i.note))));
  const okTrend = (tr) => isObj(tr) && isScalar(tr.title) && isScalar(tr.note);
  if (!stats.themes.every(okTheme)) return false;
  if (!stats.trends.every(okTrend)) return false;

  // manifest : chaque entrée = { date ISO, label }
  const okManifest = manifest.every(
    (m) => isObj(m) && typeof m.date === 'string' && DATE_RE.test(m.date) && typeof m.label === 'string'
  );
  if (!okManifest) return false;

  // editions : clés = dates ISO (jamais une clé dangereuse) ; valeurs = objets porteurs de axes[]
  const keys = Object.keys(editions);
  if (keys.length === 0) return false;
  for (const k of keys) {
    if (DANGER.has(k) || !DATE_RE.test(k)) return false;
    const e = editions[k];
    // Valider TOUS les champs déréférencés sans garde par le store/les écrans (headline, sources,
    // axes[].items) : sous-valider ferait passer une donnée qui plante au rendu (pas d'ErrorBoundary).
    if (!isObj(e) || !Array.isArray(e.axes) || !Array.isArray(e.headline) || !Array.isArray(e.sources)) return false;
    // RS_Sec2 : typer les FEUILLES effectivement RENDUES (code = clé de résolution ; title/text = enfants
    // Text). Un objet à leur place passait la validation de forme puis crashait au rendu, en boucle.
    if (!e.headline.every(okLeaf)) return false;
    if (!e.axes.every((a) => isObj(a) && Array.isArray(a.items) && a.items.every(okLeaf))) return false;
    if (!e.sources.every(isObj)) return false;
  }

  // Intégrité référentielle : l'édition la plus récente (manifest[0]) DOIT exister dans editions,
  // sinon latestDate()→getEdition() renvoie undefined → ed.axes plante (écran blanc).
  if (!Object.prototype.hasOwnProperty.call(editions, manifest[0].date)) return false;

  // `feed` (fil « À traiter » issu de la collecte) est OPTIONNEL. S'il est présent, il doit être un
  // tableau d'objets (sinon crash au rendu) — fail-closed. La SÛRETÉ de l'URL est revalidée à l'ouverture
  // (isSafeUrl/confirmOpenURL) : on n'ouvre jamais un lien sur la seule foi de l'ACL.
  if ('feed' in raw) {
    if (!Array.isArray(raw.feed) || !raw.feed.every(isObj)) return false;
  }
  if ('triage' in raw) {
    if (!Array.isArray(raw.triage) || !raw.triage.every(isObj)) return false;
  }
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
