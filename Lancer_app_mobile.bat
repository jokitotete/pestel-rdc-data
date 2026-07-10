@echo off
rem ============================================================
rem  Lancer l'app mobile RDC - Veille (Expo + tunnel, pour Expo Go)
rem  Affiche un QR code a scanner avec Expo Go (iOS/Android).
rem  Laissez cette fenetre OUVERTE : rechargement a chaud a chaque
rem  modification du code. Ctrl+C pour arreter.
rem ============================================================
cd /d "%~dp0"

rem Regenerer les donnees depuis le portail web si demande (parametre "data")
if "%1"=="data" (
  echo Regeneration des donnees depuis le portail...
  node build_data.js
  echo.
)

echo === Demarrage Expo (tunnel) ===
echo Un QR code va s'afficher. Scannez-le :
echo   - iOS     : appareil photo -^> ouvre dans Expo Go
echo   - Android : bouton "Scan QR code" dans Expo Go
echo.
call npx expo start --tunnel
