import { isSafeUrl, safeOpenURL, hostOf } from '../src/safeUrl';

const TAB = String.fromCharCode(9);
const NUL = String.fromCharCode(0);

describe('safeUrl — allowlist de schémas', () => {
  it('accepte https (avec espaces/casse)', () => {
    for (const u of ['https://actualite.cd/x', '  https://a.cd  ', 'HtTpS://A.cd']) {
      expect(isSafeUrl(u)).toBe(true);
    }
  });

  it('rejette tout schéma non-https (batterie de contournements)', () => {
    for (const u of [
      'http://x', 'javascript:alert(1)', TAB + 'javascript:x', NUL + 'https://x',
      'data:text/html,x', 'file:///etc/passwd', 'intent://x', 'content://x', 'tel:123',
      'blob:https://x', '//host', 'https://a b', '',
    ]) {
      expect(isSafeUrl(u)).toBe(false);
    }
  });

  it('rejette les valeurs non-string', () => {
    for (const u of [null, undefined, 42, {}, [], true]) expect(isSafeUrl(u)).toBe(false);
  });

  it('hostOf extrait le domaine réel de destination (SEC-01)', () => {
    expect(hostOf('https://actualite.cd/2026/07/12/x?a=1#f')).toBe('actualite.cd');
    expect(hostOf('https://Reuters-RDC.Attacker.example/login')).toBe('reuters-rdc.attacker.example');
    expect(hostOf('https://a.cd:8443/x')).toBe('a.cd:8443');
    for (const u of ['http://x', 'javascript:alert(1)', null, 42, '  ', 'https://']) expect(hostOf(u)).toBe('');
  });

  // RS_Sec (campagne 2026-07-14) : le userinfo (user:pass@host) est un vecteur d'hameçonnage —
  // `https://actualite.cd@evil.com` affiche la marque mais contacte evil.com. Non-régression figée ici.
  it('isSafeUrl REJETTE le userinfo dans l’autorité (anti-hameçonnage)', () => {
    for (const u of [
      'https://actualite.cd@evil.com/login',
      'https://user:pass@evil.com',
      'https://reuters.com@10.0.0.1/x',
      '  https://marque.cd@attacker.example/  ',
    ]) expect(isSafeUrl(u)).toBe(false);
    // un « @ » APRÈS le premier / (dans le chemin/la requête) reste légitime
    expect(isSafeUrl('https://actualite.cd/u/@handle')).toBe(true);
    expect(isSafeUrl('https://actualite.cd/x?to=a@b.cd')).toBe(true);
  });

  it('hostOf montre la VRAIE destination malgré un userinfo (défense en profondeur)', () => {
    expect(hostOf('https://actualite.cd@evil.com/login')).toBe('evil.com');
    expect(hostOf('https://user:pass@evil.com:8443/x')).toBe('evil.com:8443');   // userinfo retiré, port conservé
  });

  it("safeOpenURL n'ouvre JAMAIS un schéma hostile (fail-closed)", async () => {
    const { Linking } = require('react-native');
    Linking.openURL = jest.fn(() => Promise.resolve());
    expect(await safeOpenURL('javascript:alert(1)')).toBe(false);
    expect(await safeOpenURL(null)).toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(await safeOpenURL('https://actualite.cd/x')).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('https://actualite.cd/x');
  });
});
