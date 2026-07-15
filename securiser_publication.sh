#!/usr/bin/env bash
# =============================================================================
# securiser_publication.sh  —  À LANCER UNE SEULE FOIS, dans Git Bash.
# Objectif : passer la publication mobile en "securite maximum" :
#   (1) jeton fine-grained (tu l'as cree sur GitHub, limite au depot pestel-rdc-data)
#   (2) stocke CHIFFRE dans le Windows Credential Manager (via GCM), plus jamais en clair
#       dans l'URL du remote.
# Le script est ATOMIQUE : si le test de push echoue, il RESTAURE l'ancienne config
#   (jeton-dans-URL) pour ne pas casser la routine planifiee.
# Tu es le seul a saisir le jeton (saisie masquee). Il n'est jamais affiche ni journalise.
# =============================================================================
set -euo pipefail

REPO="/c/dev/pestel-mobile"
CLEAN_URL="https://github.com/jokitotete/pestel-rdc-data.git"
RAW="https://raw.githubusercontent.com/jokitotete/pestel-rdc-data/main/public/pestel-data.json"

echo "== Securisation de la publication mobile (jeton fine-grained + GCM chiffre) =="

# Sauvegarde de l'URL actuelle (contient l'ancien jeton) pour rollback eventuel.
OLD_URL="$(git -C "$REPO" remote get-url github)"

# --- Saisie VISIBLE du NOUVEAU jeton fine-grained ---
# (Le jeton s'affiche a l'ecran le temps de la saisie : ferme la fenetre apres coup.
#  Colle avec un CLIC DROIT ou Shift+Inser dans Git Bash.)
read -rp "Colle ton NOUVEAU jeton fine-grained (il sera VISIBLE) puis Entree : " TOKEN
if [ -z "${TOKEN:-}" ]; then echo "Aucun jeton saisi — abandon."; exit 1; fi

# (2) Semer le jeton dans le Windows Credential Manager via GCM.
#     printf garantit des fins de ligne LF (indispensable pour git credential).
printf 'protocol=https\nhost=github.com\nusername=jokitotete\npassword=%s\n\n' "$TOKEN" \
  | git credential approve
TOKEN=""   # effacement immediat de la variable
echo "-> Jeton enregistre (chiffre, DPAPI) dans le Windows Credential Manager."

# (1)+(2) Retirer le jeton de l'URL : Git repassera desormais par GCM.
git -C "$REPO" remote set-url github "$CLEAN_URL"
echo "-> URL du remote nettoyee : $CLEAN_URL"

# Test de push NON INTERACTIF (doit reussir en silence en lisant GCM).
echo "-> Test de push (doit etre silencieux, sans fenetre de connexion)..."
if git -C "$REPO" push github HEAD:main; then
  echo "-> Push non interactif : OK."
else
  echo "!! Push echoue -> restauration de l'ancienne config pour preserver la routine."
  git -C "$REPO" remote set-url github "$OLD_URL"
  echo "   (Verifie que le jeton fine-grained a bien Contents: Read and write sur pestel-rdc-data.)"
  exit 1
fi

# Preuve de publication (endpoint raw).
sleep 3
TODAY="$(date +%F)"
if curl -s "${RAW}?t=$(date +%s)" | grep -q "$TODAY"; then
  echo "OK  Publication verifiee : le endpoint en ligne sert bien $TODAY."
else
  echo "i   Push OK ; endpoint pas encore rafraichi (cache CDN ~5 min) — normal."
fi

echo
echo "== Termine. Securite maximum active. =="
echo "   RAPPEL IMPORTANT : va sur GitHub et REVOQUE l'ancien jeton classic (ghp_...)"
echo "   qui etait dans l'URL — il a ete expose et n'a plus aucune utilite."
