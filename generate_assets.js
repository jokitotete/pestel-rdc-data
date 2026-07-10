/* generate_assets.js — génère icône + splash de l'app à partir de la silhouette RDC (geojson).
   Identité : silhouette crème sur cobalt. Aucune police requise (100% vectoriel).
   Usage : node generate_assets.js */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const COBALT = "#2f52e0";
const CREAM = "#f4f1ea";

// Charge le geojson des provinces (shim navigateur).
global.window = {};
require(path.join(process.env.PORTAL || "C:/dev/portail_Pestel_RDC", "data", "provinces.js"));
const fc = global.window.PESTEL_PROVINCES;

// Silhouette du pays projetée dans un carré S, occupant une fraction frac (centrée).
function silhouette(S, frac) {
  let mnx = 999, mxx = -999, mny = 999, mxy = -999;
  const walk = (c) => { if (typeof c[0] === "number") { mnx = Math.min(mnx, c[0]); mxx = Math.max(mxx, c[0]); mny = Math.min(mny, c[1]); mxy = Math.max(mxy, c[1]); } else c.forEach(walk); };
  fc.features.forEach((f) => walk(f.geometry.coordinates));
  const K = Math.cos(((mny + mxy) / 2) * Math.PI / 180);
  const gw = (mxx - mnx) * K, gh = (mxy - mny);
  const s = (S * frac) / Math.max(gw, gh);
  const ox = (S - gw * s) / 2, oy = (S - gh * s) / 2;
  const px = (lng) => ox + (lng - mnx) * K * s;
  const py = (lat) => oy + (mxy - lat) * s;
  const ring = (r) => r.map((c, i) => (i ? "L" : "M") + px(c[0]).toFixed(1) + " " + py(c[1]).toFixed(1)).join(" ") + "Z";
  const poly = (p) => p.map(ring).join(" ");
  return fc.features.map((f) => { const g = f.geometry; return g.type === "Polygon" ? poly(g.coordinates) : g.coordinates.map(poly).join(" "); }).join(" ");
}

const svgIcon = (S, bg, frac) => {
  const d = silhouette(S, frac);
  // Le contour crème « soude » les mini-interstices entre provinces simplifiées.
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">` +
    (bg ? `<rect width="${S}" height="${S}" fill="${bg}"/>` : "") +
    `<path d="${d}" fill="${CREAM}" stroke="${CREAM}" stroke-width="${S * 0.006}" stroke-linejoin="round" fill-rule="nonzero"/></svg>`;
};

const outDir = path.join(__dirname, "assets");
fs.mkdirSync(outDir, { recursive: true });

async function render(name, svg, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outDir, name));
  console.log("✓ assets/" + name + " (" + size + "px)");
}

(async () => {
  await render("icon.png", svgIcon(1024, COBALT, 0.74), 1024);              // icône iOS (fond cobalt)
  await render("adaptive-icon.png", svgIcon(1024, null, 0.60), 1024);       // Android : 1er plan transparent
  await render("splash-icon.png", svgIcon(1024, null, 0.55), 1024);         // splash (centré sur cobalt)
  await render("favicon.png", svgIcon(1024, COBALT, 0.74), 48);             // web
  console.log("Terminé — identité RDC (silhouette crème / cobalt).");
})();
