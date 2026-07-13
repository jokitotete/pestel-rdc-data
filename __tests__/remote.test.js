import { overByteLimit } from '../src/remote';

// SEC-02 : le plafond anti-OOM se mesure en OCTETS UTF-8, pas en caractères. Un corps « court » en
// caractères mais lourd en octets (accents, emoji drapeau/ticket) doit être capté ; sortie anticipée.
describe('remote.overByteLimit — plafond en octets (anti-OOM/DoS)', () => {
  it('compte les octets ASCII (1 o/car)', () => {
    expect(overByteLimit('abc', 5)).toBe(false);  // 3 o ≤ 5
    expect(overByteLimit('abc', 2)).toBe(true);   // 3 o > 2
  });
  it('compte 2 octets pour un caractère accentué', () => {
    expect(overByteLimit('é', 1)).toBe(true);     // 2 o > 1
    expect(overByteLimit('é', 2)).toBe(false);    // 2 o ≤ 2
  });
  it('compte 4 octets par emoji (paire de substitution) — drapeau RDC', () => {
    // '🇨🇩' = 2 indicateurs régionaux × 4 o = 8 o (length JS = 4)
    expect(overByteLimit('🇨🇩', 7)).toBe(true);
    expect(overByteLimit('🇨🇩', 8)).toBe(false);
  });
  it('un texte long mais léger passe ; un texte court multi-octets peut dépasser', () => {
    expect(overByteLimit('x'.repeat(1000), 1000)).toBe(false);
    expect(overByteLimit('à'.repeat(600), 1000)).toBe(true);   // 1200 o > 1000 (600 car)
  });
});
