// Logique de CALENDRIER — pure, sans rendu, donc testable. Sert le sélecteur d'édition : la veille est
// LONGITUDINALE (13 éditions et ça croît) ; une liste déroulante oblige à lire des libellés un par un pour
// répondre à « qu'est-ce qui existe autour du 9 ? ». Une grille répond d'un coup d'œil — même principe que
// la carte : on met en surbrillance ce qui PORTE de la donnée, et le reste reste visible mais inerte.

export const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// Semaine française : lundi d'abord (Date.getDay() met dimanche à 0 → on décale).
export const JOURS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// "2026-07-15" → { y: 2026, m: 6, d: 15 }  (m = index 0-11, comme Date). null si illisible.
export const parseISO = (iso) => {
  const m = (typeof iso === 'string' ? iso : '').match(ISO_RE);
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
};

const pad = (n) => (n < 10 ? '0' + n : '' + n);
export const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Grille d'un mois : tableau de semaines de 7 cases ; `null` = case hors du mois.
export const monthGrid = (y, m) => {
  const decalage = (new Date(y, m, 1).getDay() + 6) % 7;   // lundi = 0
  const nbJours = new Date(y, m + 1, 0).getDate();
  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push(null);
  for (let d = 1; d <= nbJours; d++) cases.push(d);
  while (cases.length % 7) cases.push(null);
  const semaines = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  return semaines;
};

// Mois DISTINCTS couverts par des dates ISO, du plus récent au plus ancien. On ne navigue qu'entre les mois
// qui PORTENT de la donnée : atterrir sur un mois vide n'apprend rien (même règle que la carte, où l'on ne
// sélectionne pas une province inexistante).
export const monthsOf = (isoDates) => {
  const vus = new Set(), out = [];
  for (const iso of (Array.isArray(isoDates) ? isoDates : [])) {
    const p = parseISO(iso);
    if (!p) continue;
    const k = p.y * 12 + p.m;
    if (vus.has(k)) continue;
    vus.add(k);
    out.push({ y: p.y, m: p.m });
  }
  return out.sort((a, b) => (b.y * 12 + b.m) - (a.y * 12 + a.m));
};

export const libelleMois = (y, m) => `${MOIS_FR[m]} ${y}`;
