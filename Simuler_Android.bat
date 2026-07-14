@echo off
setlocal enabledelayedexpansion
rem ============================================================
rem  Lance Ntongo - RDC sur un EMULATEUR Android (build natif local).
rem  RN 0.85 exige un JDK 17 (toi = JDK 21 via Android Studio -> Gradle plante).
rem  Ce script cherche un JDK 17 et l'utilise. PREREQUIS : un emulateur doit tourner.
rem ============================================================
cd /d "%~dp0"

rem --- Recherche d'un JDK 17 dans les emplacements courants ---
set "JAVA17="
for %%D in (
  "%USERPROFILE%\.jdks"
  "%USERPROFILE%\.gradle\jdks"
  "C:\Program Files\Eclipse Adoptium"
  "C:\Program Files\Java"
  "C:\Program Files\Microsoft"
  "C:\Program Files\Amazon Corretto"
  "C:\Program Files\Zulu"
) do (
  if not defined JAVA17 if exist "%%~D" (
    for /d %%J in ("%%~D\*17*") do (
      if not defined JAVA17 if exist "%%~J\bin\java.exe" set "JAVA17=%%~J"
    )
  )
)

if not defined JAVA17 (
  echo ============================================================
  echo   [!] Aucun JDK 17 trouve. RN 0.85 en a besoin pour compiler en local.
  echo ============================================================
  echo   Installe un JDK 17, au choix :
  echo     A^) Android Studio ^> Settings ^> Build, Execution, Deployment
  echo        ^> Build Tools ^> Gradle ^> "Gradle JDK" ^> Download JDK
  echo        ^> Version 17, Vendor Eclipse Temurin ^> Apply.
  echo     B^) https://adoptium.net  ^> Temurin 17 ^(LTS, .msi^) ^> installer.
  echo   Puis RELANCE ce fichier.
  echo.
  echo   ^(Sinon : laisse simplement le build EAS finir, il utilise deja un JDK 17.^)
  echo.
  pause
  exit /b 1
)

echo JDK 17 utilise : %JAVA17%
set "JAVA_HOME=%JAVA17%"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"

echo.
echo === Appareils / emulateurs detectes ===
adb devices
echo.
echo  Si la liste est VIDE : Android Studio ^> Device Manager ^> cree/demarre un appareil, puis relance.
echo.
echo === Build natif + installation (1re fois : long) ===
call npx expo run:android

echo.
pause
endlocal
