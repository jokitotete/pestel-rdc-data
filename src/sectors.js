// Secteurs transversaux (filtre par CONTENU, pas par axe) — lexiques repris du portail web (THEME_TAX).
// NB : pas de champ `icon` emoji — les secteurs sont rendus par le JEU UNIQUE de glyphes vectoriels
// (SectorGlyph via `key`, cf. icons.js). Garde-fou « un seul jeu d'icônes » tenu jusqu'à la donnée.
export const SECTORS = [
  { key: 'mines', label: 'Mines',
    kw: ['cobalt', 'cuivre', 'coltan', 'lithium', 'gécamines', 'extractif', 'minier', 'minière', 'quota', 'cmoc', 'usgs', 'kolwezi', 'copperbelt', 'arecoms'] },
  { key: 'banques', label: 'Banques',
    kw: ['bcc', 'banque centrale', 'taux directeur', 'cours de change', 'change indicatif', 'franc congolais', 'cdf/usd', 'cdf', 'inflation', 'réserves de change', 'crédit', 'monétaire', 'interbancaire', 'adjudication', 'rawbank', 'equity'] },
  { key: 'telecoms', label: 'Télécoms',
    kw: ['vodacom', 'airtel', 'orange', 'africell', 'starlink', 'fibre', 'mobile money', 'arptc', 'connectivité', 'internet mobile', 'télécom', 'abonnés', 'opérateur'] },
  { key: 'logistique', label: 'Logistique',
    kw: ['port de', 'port en eau', 'port maritime', 'matadi', 'banana', 'boma', 'corridor', 'lobito', ' agl', 'dp world', 'onatra', 'mctc', 'ferroviaire', 'fret ', 'logistique', 'conteneur', 'evp', 'portuaire', 'quai'] },
  { key: 'assurances', label: 'Assurances',
    kw: ['assurance', 'arca', 'primes', 'sonas', 'assureur', 'pénétration assurance', 'rawsur', 'sfa'] },
];

// Un item appartient-il au secteur (par mots-clés dans son texte) ?
export const itemInSector = (it, sector) => {
  const hay = `${it.title} ${it.text} ${it.analysis || ''}`.toLowerCase();
  return sector.kw.some((k) => hay.indexOf(k) >= 0);
};

// (itemInSectorStrong — match FORT, titre+analyse seulement — RETIRÉ : QA v1.2. Il servait la « Lentille »
// qui PROMOUVAIT automatiquement un article au rang « de votre secteur » ; cette promotion exigeait la
// précision. La Lentille supprimée (filtre explicite, exigence PO), il n'avait plus de raison d'être.)

export const sectorByKey = (key) => SECTORS.find((s) => s.key === key) || null;
