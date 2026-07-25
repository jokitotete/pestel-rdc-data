# build-apk.ps1 — Build release reproductible de « Ntongo · RDC News ».
# Grave les 3 dependances d'environnement qu'Android Studio fournit implicitement et qui
# manquaient en ligne de commande (constat du 2026-07-25, 3 echecs de build) :
#   1) JAVA_HOME (JBR d'Android Studio)   2) ANDROID_HOME (SDK)
#   3) forcer un bundle JS NEUF sans casser le natif RN new-arch :
#      on NE lance PAS `gradlew clean` (sa tache externalNativeBuildClean casse sur un cache CMake
#      perime : GLOB mismatch / codegen supprime). On purge a la main .cxx + app/build + le cache Metro.
#
# Usage :  powershell -ExecutionPolicy Bypass -File build-apk.ps1
# Sortie :  android\app\build\outputs\apk\release\app-release.apk  (+ copie horodatee dans _APK)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot                       # racine du projet (ou vit ce script)
$android = Join-Path $root 'android'

# --- 1) Dependances d'environnement (a adapter si la machine change) ---
$jbr = 'C:\Program Files\Android\Android Studio\jbr'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path "$jbr\bin\java.exe")) { throw "JDK introuvable : $jbr (installer Android Studio ou ajuster le chemin)" }
if (-not (Test-Path "$sdk\platform-tools")) { throw "Android SDK introuvable : $sdk" }
$env:JAVA_HOME = $jbr
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$jbr\bin;$env:PATH"
Write-Host "JAVA_HOME  = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"

# --- 2) Purge des caches (bundle JS neuf + natif RN sain), SANS `gradlew clean` ---
Write-Host "Purge des caches Metro + natifs perimes..."
Get-ChildItem $env:TEMP -Filter 'metro-*'     -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem $env:TEMP -Filter 'haste-map-*' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
foreach ($p in @(
  (Join-Path $android 'app\.cxx'),
  (Join-Path $android 'app\build'),
  (Join-Path $android 'build'),
  (Join-Path $root 'node_modules\@react-native-async-storage\async-storage\android\build')
)) { if (Test-Path $p) { Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue } }

# --- 3) Build release ---
Write-Host "gradlew :app:assembleRelease ..."
Push-Location $android
try { & .\gradlew.bat :app:assembleRelease --console=plain }
finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "BUILD FAILED (exit $LASTEXITCODE)" }

# --- 4) Copie horodatee dans _APK + SHA-256 ---
$apk = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) { throw "APK introuvable apres build : $apk" }
$appJson = Get-Content (Join-Path $root 'app.json') -Raw | ConvertFrom-Json
$ver = $appJson.expo.version
$dest = "C:\Users\USER\OneDrive\2iD Group\2iD Consulting\Projects\41.Apps\PESTEL_RDC\_APK\Ntongo-RDC-News-v$ver.apk"
Copy-Item $apk $dest -Force
$sha = (Get-FileHash $dest -Algorithm SHA256).Hash.ToLower()
Write-Host "OK -> $dest"
Write-Host "SHA-256 = $sha"
Write-Host "versionName = $ver"
