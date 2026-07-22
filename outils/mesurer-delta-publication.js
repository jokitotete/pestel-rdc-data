/* mesurer-delta-publication.js — TCK-074
   MESURE le delta entre ce qui est EN LIGNE et ce qui va être publié.
   Ne modifie rien. Deux fichiers JSON en entrée : AVANT (en ligne) et APRÈS (local régénéré).
   Tout chiffre sorti d'ici est MESURÉ (compté sur pièce), jamais estimé.
   Usage : node outils/mesurer-delta-publication.js <avant.json> <apres.json>            */
const fs = require("fs");
const crypto = require("crypto");

const [, , AVANT, APRES] = process.argv;
if (!AVANT || !APRES) { console.error("usage: node mesurer-delta-publication.js <avant.json> <apres.json>"); process.exit(2); }

const lire = (p) => ({
  brut: fs.readFileSync(p),
  obj: JSON.parse(fs.readFileSync(p, "utf8")),
});
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

// ── Parcours : éditions → axes → items ─────────────────────────────────────
function inventorier(doc) {
  const ed = doc.editions || {};
  const dates = Object.keys(ed).sort();
  const inv = {
    octets: 0,
    editions: dates.length,
    dates,
    axes: 0,
    faits: 0,
    // champs NOUVEAUX dont on veut savoir s'ils sont RÉELLEMENT portés
    designation: 0, designationMajeur: 0, designationProposee: 0, designationValidee: 0,
    designationVacance: 0,
    reedition: 0, reeditionCorrection1: 0,
    reconstitution: 0,
    sources: 0, sourcesHorsFlux: 0, sourcesAjoutDate: 0,
    faitsAvecSources: 0, renvois: 0,
    // corridor (mesure de la longueur des textes de Une)
    codes: new Set(),
  };
  for (const d of dates) {
    const e = ed[d];
    if (e && e.reedition) { inv.reedition++; if (e.reedition.correction_1) inv.reeditionCorrection1++; }
    if (e && ((e.reedition && e.reedition.reconstitution) || e.reconstitution)) inv.reconstitution++;
    // Les SOURCES sont portées au niveau ÉDITION (les items n'en portent que les INDICES).
    for (const s of (e.sources || [])) {
      inv.sources++;
      const o = String(s.origin || s.origine || "").toLowerCase();
      if (o.includes("hors flux")) inv.sourcesHorsFlux++;
      if (s.ajoutee_le || s.motif_ajout) inv.sourcesAjoutDate++;
    }
    for (const ax of (e.axes || [])) {
      inv.axes++;
      if (ax.designationVacance) inv.designationVacance++;
      for (const it of (ax.items || [])) {
        inv.faits++;
        if (it.code) inv.codes.add(d + "#" + it.code);
        const dg = it.designation;
        if (dg && typeof dg === "object") {
          inv.designation++;
          if (dg.majeur === true) {
            inv.designationMajeur++;
            if (dg.statut === "proposee") inv.designationProposee++;
            else if (dg.statut === "validee") inv.designationValidee++;
          }
        }
        // it.sources = INDICES vers edition.sources (renvois), pas des objets source.
        const src = it.sources || [];
        if (Array.isArray(src) && src.length) { inv.faitsAvecSources++; inv.renvois += src.length; }
      }
    }
  }
  return inv;
}

const a = lire(AVANT), b = lire(APRES);
const ia = inventorier(a.obj), ib = inventorier(b.obj);
ia.octets = a.brut.length; ib.octets = b.brut.length;

const L = (s) => console.log(s);
const N = (x) => String(x).padStart(9);
const ligne = (lib, va, vb) => {
  const d = (typeof va === "number" && typeof vb === "number") ? (vb - va) : "";
  const sig = typeof d === "number" ? (d > 0 ? "+" + d : String(d)) : "";
  L("  " + lib.padEnd(46) + N(va) + N(vb) + String(sig).padStart(11));
};

L("");
L("══════════════════════════════════════════════════════════════════════════════");
L("  TCK-074 · DELTA DE PUBLICATION — tout chiffre ci-dessous est MESURÉ");
L("══════════════════════════════════════════════════════════════════════════════");
L("  AVANT (en ligne) : " + AVANT);
L("     sha256        : " + sha(a.brut));
L("  APRÈS (local)    : " + APRES);
L("     sha256        : " + sha(b.brut));
L("");
L("  " + "".padEnd(46) + N("EN LIGNE") + N("À PUBLIER") + "      DELTA");
L("  " + "─".repeat(74));
ligne("octets du fichier", ia.octets, ib.octets);
ligne("éditions", ia.editions, ib.editions);
ligne("axes", ia.axes, ib.axes);
ligne("faits (items)", ia.faits, ib.faits);
L("  " + "─".repeat(74));
L("  CHAMPS NOUVEAUX RÉELLEMENT PORTÉS");
ligne("faits portant `designation`", ia.designation, ib.designation);
ligne("  … dont majeur = true", ia.designationMajeur, ib.designationMajeur);
ligne("  … … statut « proposee »", ia.designationProposee, ib.designationProposee);
ligne("  … … statut « validee »", ia.designationValidee, ib.designationValidee);
ligne("axes portant `designationVacance`", ia.designationVacance, ib.designationVacance);
ligne("éditions portant `reedition`", ia.reedition, ib.reedition);
ligne("  … dont `reedition.correction_1`", ia.reeditionCorrection1, ib.reeditionCorrection1);
ligne("éditions portant `reconstitution`", ia.reconstitution, ib.reconstitution);
ligne("faits portant au moins un renvoi source", ia.faitsAvecSources, ib.faitsAvecSources);
ligne("renvois fait→source (indices)", ia.renvois, ib.renvois);
ligne("sources (objets, niveau édition)", ia.sources, ib.sources);
ligne("  … dont origin/origine « hors flux »", ia.sourcesHorsFlux, ib.sourcesHorsFlux);
ligne("  … dont ajoutee_le / motif_ajout", ia.sourcesAjoutDate, ib.sourcesAjoutDate);
L("  " + "─".repeat(74));
ligne("fil N1 « Captées » (feed)", (a.obj.feed || []).length, (b.obj.feed || []).length);
ligne("fil N1 « Divers » (triage)", (a.obj.triage || []).length, (b.obj.triage || []).length);
ligne("manifeste (entrées)", (a.obj.manifest || []).length, (b.obj.manifest || []).length);

// ── Identité du périmètre : aucun code de fait ne doit disparaître ──────────
const perdus = [...ia.codes].filter((c) => !ib.codes.has(c));
const gagnes = [...ib.codes].filter((c) => !ia.codes.has(c));
L("  " + "─".repeat(74));
L("  PÉRIMÈTRE (identité des codes date#code)");
L("    codes en ligne : " + ia.codes.size + " · à publier : " + ib.codes.size);
L("    codes PERDUS   : " + perdus.length + (perdus.length ? " → " + perdus.slice(0, 20).join(", ") : ""));
L("    codes AJOUTÉS  : " + gagnes.length + (gagnes.length ? " → " + gagnes.slice(0, 20).join(", ") : ""));

// ── Quelles éditions changent réellement, octet à octet ────────────────────
L("  " + "─".repeat(74));
L("  ÉDITIONS QUI CHANGENT (empreinte de l'édition sérialisée)");
const toutes = [...new Set([...ia.dates, ...ib.dates])].sort();
let nChange = 0;
for (const d of toutes) {
  const sa = a.obj.editions[d] ? sha(Buffer.from(JSON.stringify(a.obj.editions[d]))) : null;
  const sb = b.obj.editions[d] ? sha(Buffer.from(JSON.stringify(b.obj.editions[d]))) : null;
  const oa = sa ? Buffer.byteLength(JSON.stringify(a.obj.editions[d])) : 0;
  const ob = sb ? Buffer.byteLength(JSON.stringify(b.obj.editions[d])) : 0;
  const etat = !sa ? "NOUVELLE" : !sb ? "RETIRÉE" : (sa === sb ? "identique" : "MODIFIÉE");
  if (etat !== "identique") nChange++;
  L("    " + d + "  " + etat.padEnd(10) + String(oa).padStart(8) + " → " + String(ob).padStart(8) +
    " o  (" + (ob - oa >= 0 ? "+" : "") + (ob - oa) + ")");
}
L("    → " + nChange + " édition(s) changent sur " + toutes.length);
L("══════════════════════════════════════════════════════════════════════════════");
L("");
