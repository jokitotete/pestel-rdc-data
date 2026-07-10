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
const out =
  "// Données PESTEL RDC — GÉNÉRÉ depuis le portail web par build_data.js. Ne pas éditer à la main.\n" +
  "export const EDITIONS = " + JSON.stringify(W.PESTEL_DATA || {}) + ";\n\n" +
  "export const MANIFEST = " + JSON.stringify(W.PESTEL_MANIFEST || []) + ";\n\n" +
  "export const STATS = " + JSON.stringify(W.PESTEL_STATS || {}) + ";\n";

fs.mkdirSync(path.join(__dirname, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "src", "data", "pestel.js"), out);

// Provinces (geojson) dans un module séparé (volumineux, chargé pour la carte).
const geo = W.PESTEL_PROVINCES || { type: "FeatureCollection", features: [] };
const geoOut = "// Provinces RDC (geojson) — GÉNÉRÉ depuis le portail par build_data.js.\n" +
  "export const PROVINCES = " + JSON.stringify(geo) + ";\n";
fs.writeFileSync(path.join(__dirname, "src", "data", "provinces.js"), geoOut);

const kb = Math.round(Buffer.byteLength(out) / 1024);
const gkb = Math.round(Buffer.byteLength(geoOut) / 1024);
console.log("✓ src/data/pestel.js : " + kb + " KB · " + editions.length + " éditions · " +
  (W.PESTEL_STATS && W.PESTEL_STATS.themes ? W.PESTEL_STATS.themes.length : 0) + " thèmes stats");
console.log("✓ src/data/provinces.js : " + gkb + " KB · " + geo.features.length + " provinces");
