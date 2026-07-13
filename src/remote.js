import Constants from 'expo-constants';
import { validateData } from './acl';

// URL des données en ligne (configurée dans app.json > extra.dataUrl). Null = pas de fetch, on garde l'embarqué.
export const DATA_URL =
  (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.dataUrl) || null;

const MAX_BYTES = 4 * 1024 * 1024;   // plafond anti-DoS / OOM (~4 Mo, mesuré en OCTETS) sur le payload distant

// Compte les octets UTF-8 d'une chaîne avec SORTIE ANTICIPÉE dès le dépassement de `max`
// (ne parcourt jamais tout un corps géant). Gère les paires de substitution (emoji 🇨🇩/🎟️ = 4 o).
export function overByteLimit(str, max) {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { bytes += 4; i++; }   // paire de substitution
    else bytes += 3;
    if (bytes > max) return true;
  }
  return false;
}

// Lecture BORNÉE EN OCTETS. Voie streaming (Hermes récent) : coupe (abort) dès MAX_BYTES sans jamais
// tout matérialiser. Repli sans streaming : res.text() reste borné par le timeout de l'appelant, puis
// on rejette si la TAILLE RÉELLE (octets, pas caractères) dépasse le plafond. Corrige l'OOM/DoS SEC-02.
async function readBounded(res, ctrl) {
  const canStream =
    res.body && typeof res.body.getReader === 'function' && typeof global.TextDecoder === 'function';
  if (canStream) {
    const reader = res.body.getReader();
    const dec = new global.TextDecoder();
    let received = 0;
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) { try { ctrl.abort(); } catch (e) {} throw new Error('payload trop volumineux'); }
      text += dec.decode(value, { stream: true });
    }
    text += dec.decode();
    return text;
  }
  const text = await res.text();
  if (overByteLimit(text, MAX_BYTES)) throw new Error('payload trop volumineux');
  return text;
}

// Récupère les données à jour. Fetch BORNÉ (timeout couvrant en-têtes ET corps + plafond en octets),
// avec retry+backoff+jitter sur erreur réseau/timeout/5xx, puis validation par l'ACL. Renvoie le payload
// validé, ou null (offline / erreur / contrat cassé) — le repli est SIGNALÉ par l'appelant (bandeau P2).
export async function fetchRemoteData(timeoutMs = 6000, retries = 2) {
  if (!DATA_URL) return null;
  const sep = DATA_URL.indexOf('?') >= 0 ? '&' : '?';

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(DATA_URL + sep + 't=' + Date.now(), { signal: ctrl.signal });
      if (!res.ok) throw new Error('http ' + res.status);

      // Plafond annoncé : rejet AVANT lecture si Content-Length dépasse (défense amont, non fiable seule).
      const cl = Number((res.headers && res.headers.get && res.headers.get('content-length')) || 0);
      if (cl && cl > MAX_BYTES) throw new Error('payload annoncé trop volumineux');

      const text = await readBounded(res, ctrl);   // lecture bornée en octets, sous le même timeout
      const d = JSON.parse(text);
      // Donnée malformée = déterministe : on ne réessaie pas, on tombe en repli signalé (offline).
      return validateData(d) ? d : null;
    } catch (e) {
      if (attempt === retries) return null;
      // Backoff exponentiel borné + jitter (ne martèle pas la source ; désynchronise les clients).
      const wait = Math.min(2000, 300 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, wait));
    } finally {
      clearTimeout(timer);   // ROB-01 : le timer couvre AUSSI la lecture du corps (corps qui stalle → abort).
    }
  }
  return null;
}
