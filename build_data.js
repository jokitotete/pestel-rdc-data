/* build_data.js — génère src/data/pestel.js à partir des données du PORTAIL WEB.
   Source unique de vérité : les fichiers data/*.js du portail (window.PESTEL_*).
   Ré-exporte en modules ES importables par React Native.
   Usage : node build_data.js   (à relancer après chaque enrichissement de la veille) */
const fs = require("fs");
const path = require("path");

const PORTAL = process.env.PORTAL || "C:/dev/portail_Pestel_RDC";
const dataDir = path.join(PORTAL, "data");
if (!fs.existsSync(dataDir)) {
  console.error("Portail introuvable : " + dataDir + " (définir la variable PORTAL)");
  process.exit(1);
}

// Fil « À traiter » (collecte étage 1) — OPTIONNEL. On lit le feed.json produit par pestel-collector
// (publish.js). Absent = pas de section « À traiter », l'app fonctionne comme avant.
function readItems(file) {
  try {
    if (fs.existsSync(file)) {
      const f = JSON.parse(fs.readFileSync(file, "utf8"));
      return Array.isArray(f) ? f : (Array.isArray(f.items) ? f.items : []);
    }
  } catch (e) { console.warn(file + " illisible, ignoré : " + e.message); }
  return [];
}
const FEED_JSON = process.env.FEED_JSON || "C:/dev/pestel-collector/collecte/feed.json";
const TRIAGE_JSON = process.env.TRIAGE_JSON || "C:/dev/pestel-collector/collecte/triage.json";
const FEED = readItems(FEED_JSON);        // « À traiter » (classées, sélectionnées)
const TRIAGE = readItems(TRIAGE_JSON);    // « À trier » (captées, NON classées)

// Shim navigateur : les fichiers du portail s'auto-enregistrent dans window.PESTEL_*
global.window = {};

// Éditions (une par jour), puis manifeste et statistiques
const editions = fs.readdirSync(dataDir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.js$/.test(f)).sort();
editions.forEach((f) => require(path.join(dataDir, f)));
require(path.join(dataDir, "manifest.js"));
require(path.join(dataDir, "stats-rdc.js"));
require(path.join(dataDir, "provinces.js"));

const W = global.window;

// ── TCK-102 · DÉSIGNATION DE « FAIT MAJEUR » — TRANSPORT ET COMPTAGE ────────
// Le portail est la source de vérité : ce script ne DÉCIDE rien, il transporte.
// Le champ `designation` traverse donc la chaîne par la sérialisation JSON, sans
// projection ni liste blanche de champs — c'est ce qui rend le transport SÛR par
// construction. Mais un transport silencieux ne se vérifie pas : on COMPTE ce qui
// passe et on le DÉCLARE, exactement comme la troncature de publish.js (TCK-050).
// Un champ absent = « non désigné » : c'est l'état des 18 éditions publiées, et
// les APK v1.4 déjà installés lisent le même fichier distant sans le connaître.
function compterDesignations(editionsParDate) {
  let faits = 0, portant = 0, majeurs = 0, proposes = 0, valides = 0, vacances = 0;
  for (const ed of Object.values(editionsParDate || {})) {
    for (const ax of (ed.axes || [])) {
      if (ax.designationVacance) vacances++;
      for (const it of (ax.items || [])) {
        faits++;
        const d = it.designation;
        if (!d || typeof d !== 'object') continue;
        portant++;
        if (d.majeur === true) {
          majeurs++;
          if (d.statut === 'proposee') proposes++;
          else if (d.statut === 'validee') valides++;
        }
      }
    }
  }
  return { faits, portant, majeurs, proposes, valides, vacances };
}
const DES = compterDesignations(W.PESTEL_DATA);

const out =
  "// Données PESTEL RDC — GÉNÉRÉ depuis le portail web par build_data.js. Ne pas éditer à la main.\n" +
  "export const EDITIONS = " + JSON.stringify(W.PESTEL_DATA || {}) + ";\n\n" +
  "export const MANIFEST = " + JSON.stringify(W.PESTEL_MANIFEST || []) + ";\n\n" +
  "export const STATS = " + JSON.stringify(W.PESTEL_STATS || {}) + ";\n\n" +
  "export const FEED = " + JSON.stringify(FEED) + ";\n\n" +
  "export const TRIAGE = " + JSON.stringify(TRIAGE) + ";\n";

fs.mkdirSync(path.join(__dirname, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "src", "data", "pestel.js"), out);

// Provinces (geojson) dans un module séparé (volumineux, chargé pour la carte).
const geo = W.PESTEL_PROVINCES || { type: "FeatureCollection", features: [] };
const geoOut = "// Provinces RDC (geojson) — GÉNÉRÉ depuis le portail par build_data.js.\n" +
  "export const PROVINCES = " + JSON.stringify(geo) + ";\n";
fs.writeFileSync(path.join(__dirname, "src", "data", "provinces.js"), geoOut);

// JSON hébergeable (éditions + manifeste + stats) — pour le fetch en ligne de l'app.
// Les provinces (geo, statiques) restent embarquées, pas besoin de les servir.
fs.mkdirSync(path.join(__dirname, "public"), { recursive: true });
const remote = JSON.stringify({
  editions: W.PESTEL_DATA || {},
  manifest: W.PESTEL_MANIFEST || [],
  stats: W.PESTEL_STATS || {},
  feed: FEED,
  triage: TRIAGE,
  generatedAt: (W.PESTEL_MANIFEST && W.PESTEL_MANIFEST[0] && W.PESTEL_MANIFEST[0].date) || "",
});
fs.writeFileSync(path.join(__dirname, "public", "pestel-data.json"), remote);

const kb = Math.round(Buffer.byteLength(out) / 1024);
const gkb = Math.round(Buffer.byteLength(geoOut) / 1024);
const rkb = Math.round(Buffer.byteLength(remote) / 1024);
console.log("✓ src/data/pestel.js : " + kb + " KB · " + editions.length + " éditions · " +
  (W.PESTEL_STATS && W.PESTEL_STATS.themes ? W.PESTEL_STATS.themes.length : 0) + " thèmes stats");
console.log("✓ src/data/provinces.js : " + gkb + " KB · " + geo.features.length + " provinces");
console.log("✓ public/pestel-data.json : " + rkb + " KB (à héberger pour le fetch en ligne)");
console.log("✓ fil « À traiter » : " + FEED.length + " classée(s) · « À trier » : " + TRIAGE.length + " non classée(s)");
console.log("✓ TCK-102 désignation : " + DES.portant + "/" + DES.faits + " fait(s) portent le champ · " +
  DES.majeurs + " majeur(s) (" + DES.valides + " validé[s], " + DES.proposes + " PROPOSÉ[s] non validé[s]) · " +
  DES.vacances + " vacance(s) d'axe déclarée(s)");
if (DES.portant === 0) {
  console.log("  (aucun fait désigné : les " + Object.keys(W.PESTEL_DATA || {}).length +
    " édition(s) publiées sont à l'état « non désigné ». Ce n'est pas un oubli du build — désigner est un acte éditorial.)");
}
if (DES.proposes) {
  console.log("  ⚠ " + DES.proposes + " désignation(s) PROPOSÉE(S), NON VALIDÉE(S) sont publiées telles quelles :");
  console.log("    elles doivent être tranchées par la rédaction (statut « validee ») avant d'être opposables.");
}
