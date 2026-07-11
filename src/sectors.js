// Secteurs transversaux (filtre par CONTENU, pas par axe) — lexiques repris du portail web (THEME_TAX).
export const SECTORS = [
  { key: 'mines', label: 'Mines', icon: '⛏️',
    kw: ['cobalt', 'cuivre', 'coltan', 'lithium', 'gécamines', 'extractif', 'minier', 'minière', 'quota', 'cmoc', 'usgs', 'kolwezi', 'copperbelt', 'arecoms'] },
  { key: 'banques', label: 'Banques', icon: '🏦',
    kw: ['bcc', 'banque centrale', 'taux directeur', 'cours de change', 'change indicatif', 'franc congolais', 'cdf/usd', 'cdf', 'inflation', 'réserves de change', 'crédit', 'monétaire', 'interbancaire', 'adjudication', 'rawbank', 'equity'] },
  { key: 'telecoms', label: 'Télécoms', icon: '📶',
    kw: ['vodacom', 'airtel', 'orange', 'africell', 'starlink', 'fibre', 'mobile money', 'arptc', 'connectivité', 'internet mobile', 'télécom', 'abonnés', 'opérateur'] },
  { key: 'logistique', label: 'Logistique', icon: '🚢',
    kw: ['port de', 'port en eau', 'port maritime', 'matadi', 'banana', 'boma', 'corridor', 'lobito', ' agl', 'dp world', 'onatra', 'mctc', 'ferroviaire', 'fret ', 'logistique', 'conteneur', 'evp', 'portuaire', 'quai'] },
  { key: 'assurances', label: 'Assurances', icon: '🛡️',
    kw: ['assurance', 'arca', 'primes', 'sonas', 'assureur', 'pénétration assurance', 'rawsur', 'sfa'] },
];

// Un item appartient-il au secteur (par mots-clés dans son texte) ?
export const itemInSector = (it, sector) => {
  const hay = `${it.title} ${it.text} ${it.analysis || ''}`.toLowerCase();
  return sector.kw.some((k) => hay.indexOf(k) >= 0);
};
