@echo off
setlocal EnableDelayedExpansion
rem ============================================================
rem  Publie les donnees de la veille EN LIGNE (GitHub) pour que
rem  l'app mobile installee les recupere au prochain lancement.
rem  1re fois : demande UNE fois ton jeton GitHub. Ensuite : double-clic.
rem ============================================================
cd /d "%~dp0"
set "GHUSER=jokitotete"
set "GHREPO=pestel-rdc-data"

echo ============================================================
echo   PUBLIER LES DONNEES EN LIGNE  (%GHUSER%/%GHREPO%)
echo ============================================================
echo.

echo [1/4] Regeneration des donnees depuis le portail...
call node build_data.js
if errorlevel 1 ( echo [!] Echec build_data.js & pause & exit /b 1 )

echo.
echo [2/4] Acces GitHub...
git remote get-url github >nul 2>&1
if errorlevel 1 (
  echo   Premiere publication : colle ton jeton GitHub UNE fois.
  echo   Cree-le sur https://github.com/settings/tokens/new  (coche la case "repo")
  echo.
  set /p "GHTOKEN=Jeton GitHub : "
  if "!GHTOKEN!"=="" ( echo [!] Aucun jeton saisi. & pause & exit /b 1 )
  git remote remove github 2>nul
  git remote add github https://%GHUSER%:!GHTOKEN!@github.com/%GHUSER%/%GHREPO%.git
)

echo.
echo [3/4] Enregistrement local...
git add -A
git commit -m "MAJ donnees veille %date%" 2>nul

echo.
echo [4/4] Publication en ligne (push GitHub)...
git push github HEAD:main
if errorlevel 1 (
  echo.
  echo [!] Echec du push. Verifie : jeton valide + scope "repo" + depot existant.
  echo     Pour repartir a zero :  git remote remove github  puis relance ce fichier.
  pause & exit /b 1
)

echo.
echo ============================================================
echo   OK ! Donnees en ligne. L'app installee les recuperera au
echo   prochain lancement (voyant vert "donnees a jour - en ligne").
echo   URL des donnees :
echo   https://raw.githubusercontent.com/%GHUSER%/%GHREPO%/main/public/pestel-data.json
echo ============================================================
echo.
pause
endlocal
