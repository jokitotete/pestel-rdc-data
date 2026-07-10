@echo off
setlocal
rem ============================================================
rem  Fabrique un APK Android de "RDC - Veille" (icone + splash compris)
rem  Methode JETON (evite le bug "localhost inaccessible" du login navigateur).
rem  Build dans le cloud Expo (gratuit).
rem ============================================================
cd /d "%~dp0"

echo.
echo ============================================================
echo   BUILD APK ANDROID - RDC Veille  (methode jeton)
echo ============================================================
echo.
echo  1) Dans ton navigateur (deja connecte a Expo), ouvre :
echo         https://expo.dev/settings/access-tokens
echo  2) Clique "Create token", donne un nom (ex: build-pc), copie le jeton.
echo  3) Colle-le ci-dessous puis Entree.
echo ------------------------------------------------------------
set /p EXPO_TOKEN=Jeton d'acces Expo :
if "%EXPO_TOKEN%"=="" (
  echo [!] Aucun jeton saisi. Relance le fichier.
  pause & exit /b 1
)

echo.
echo  Verification du compte via le jeton...
call npx eas-cli@latest whoami
if not %errorlevel%==0 (
  echo [!] Jeton refuse. Verifie que tu l'as copie en entier et relance.
  pause & exit /b 1
)

echo.
echo  Lancement du build APK (dans le cloud Expo).
echo  - Si on te demande de creer un projet : reponds Y (Entree).
echo  - Si on te demande de generer un "keystore" : reponds Y (Entree).
echo  - Duree ~10 a 20 min ; un lien de telechargement s'affiche a la fin.
echo ------------------------------------------------------------
call npx eas-cli@latest build --platform android --profile preview

echo.
echo ============================================================
echo   Termine. Copie le lien d'APK affiche ci-dessus et
echo   ouvre-le sur ton telephone Android pour installer l'app.
echo ============================================================
echo.
echo  (Astuce securite : ferme cette fenetre apres, le jeton y est visible.)
pause
endlocal
