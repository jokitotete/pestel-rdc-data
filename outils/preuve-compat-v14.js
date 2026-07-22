/* preuve-compat-v14.js — TCK-074, point 3.
   QUESTION : un APK v1.4 DÉJÀ INSTALLÉ, qui n'a AUCUNE connaissance des champs `designation`,
   `reedition`, `designationVacance` ni `origin: hors flux`, casse-t-il en allant chercher le
   fichier distant enrichi ?
   MÉTHODE : on n'en discute pas, on l'exécute. On extrait de git l'Anti-Corruption Layer de la
   v1.4 (commit 3f155f7, src/acl.js) — pas une reconstitution, le fichier lui-même — et on lui
   soumet le payload. Deux lignes seulement sont transposées (`export function` → `function`)
   pour que Node le charge ; le script VÉRIFIE que ce sont bien les deux seules, et échoue sinon.
   On contrôle aussi le plafond d'octets de src/remote.js@3f155f7, qui rejette AVANT l'ACL.
   Usage : node outils/preuve-compat-v14.js [fichier.json]   (défaut : public/pestel-data.json)  */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const COMMIT_V14 = "3f155f7";
const CIBLE = process.argv[2] || path.join(__dirname, "..", "public", "pestel-data.json");
const MAX_BYTES_V14 = 4 * 1024 * 1024;   // src/remote.js @3f155f7 : plafond anti-DoS/OOM

// ── 1. Extraire l'ACL v1.4 de git, et prouver la fidélité de la transposition ──────────────
const racine = path.join(__dirname, "..");
const source = execFileSync("git", ["show", COMMIT_V14 + ":src/acl.js"], { cwd: racine, encoding: "utf8" });
const transpose = source.replace(/^export function /gm, "function ") +
  "\nmodule.exports={validateData,safeAssign};\n";

const la = source.split("\n"), lb = transpose.split("\n");
const touchees = la.map((l, i) => (l === lb[i] ? null : i + 1)).filter((x) => x !== null);
if (touchees.length !== 2) {
  console.error("ARRÊT : la transposition ES→CJS a touché " + touchees.length +
    " ligne(s) au lieu de 2 (lignes " + touchees.join(", ") + "). Preuve invalidée.");
  process.exit(2);
}

const tmp = path.join(os.tmpdir(), "acl-v14-" + process.pid + ".cjs");
fs.writeFileSync(tmp, transpose);
const { validateData } = require(tmp);

// ── 2. Soumettre le payload ────────────────────────────────────────────────────────────────
const brut = fs.readFileSync(CIBLE);
const octets = Buffer.byteLength(brut.toString("utf8"), "utf8");
const doc = JSON.parse(brut.toString("utf8"));
const sousPlafond = octets <= MAX_BYTES_V14;
const t0 = process.hrtime.bigint();
const accepte = validateData(doc);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

// ── 3. Recenser les champs que la v1.4 NE CONNAÎT PAS ──────────────────────────────────────
let designation = 0, vacance = 0, reedition = 0, horsFlux = 0;
for (const e of Object.values(doc.editions || {})) {
  if (e.reedition) reedition++;
  for (const s of (e.sources || []))
    if (String(s.origin || s.origine || "").toLowerCase().includes("hors flux")) horsFlux++;
  for (const ax of (e.axes || [])) {
    if (ax.designationVacance) vacance++;
    for (const it of (ax.items || [])) if (it.designation) designation++;
  }
}

const L = console.log;
L("");
L("══════════════════════════════════════════════════════════════════════════════");
L("  TCK-074 · PREUVE DE COMPATIBILITÉ ASCENDANTE — CLIENT v1.4 NON MIS À JOUR");
L("══════════════════════════════════════════════════════════════════════════════");
L("  ACL exécutée   : src/acl.js @ " + COMMIT_V14 + " (extrait de git, " + la.length + " lignes)");
L("  transposition  : " + touchees.length + " ligne(s) — " + touchees.join(", ") + " (signatures d'export UNIQUEMENT)");
L("  payload        : " + CIBLE);
L("  octets         : " + octets + "  (" + (octets / 1048576).toFixed(3) + " Mo)");
L("  plafond v1.4   : " + MAX_BYTES_V14 + " o → " + (sousPlafond
  ? (100 * octets / MAX_BYTES_V14).toFixed(1) + " % consommé, marge " + (MAX_BYTES_V14 - octets) + " o"
  : "*** DÉPASSÉ — le fetch v1.4 rejette AVANT l'ACL ***"));
L("  validateData() : " + (accepte ? "TRUE" : "FALSE") + "   (" + ms.toFixed(1) + " ms)");
L("");
L("  CHAMPS INCONNUS DE LA v1.4, PRÉSENTS DANS CE PAYLOAD :");
L("    designation (item)        : " + designation);
L("    designationVacance (axe)  : " + vacance);
L("    reedition (édition)       : " + reedition);
L("    source origin « hors flux »: " + horsFlux);
L("  L'ACL v1.4 type EXHAUSTIVEMENT les champs qu'elle rend ; elle n'interdit pas les champs");
L("  supplémentaires. Ceux-ci sont donc TRANSPORTÉS et IGNORÉS — ni lus, ni rendus, ni stockés.");
L("");
const ok = accepte && sousPlafond;
L("  VERDICT : " + (ok
  ? "un client v1.4 accepte ce fichier. MESURÉ sur pièce, pas supposé."
  : "*** RÉGRESSION — un client v1.4 REJETTERAIT ce fichier (repli sur données embarquées) ***"));
L("  LIMITE DÉCLARÉE : prouve l'ACCEPTATION du contrat de données, pas le rendu à l'écran.");
L("  Le rendu réel sur un APK v1.4 installé se contrôle sur appareil — voir le compte rendu.");
L("  Statut : À VALIDER.");
L("══════════════════════════════════════════════════════════════════════════════");
L("");
try { fs.unlinkSync(tmp); } catch (e) {}
process.exit(ok ? 0 : 1);
