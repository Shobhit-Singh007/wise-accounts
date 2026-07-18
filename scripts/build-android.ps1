# build-android.ps1 — Build release APK
# Usage: .\scripts\build-android.ps1

$JAVA_HOME = "C:\Users\LENOVO\.jdks\jdk-21.0.11+10"
$ANDROID_HOME = "C:\Users\LENOVO\AppData\Local\Android\Sdk"

$env:JAVA_HOME = $JAVA_HOME
$env:ANDROID_HOME = $ANDROID_HOME
$env:PATH = "$JAVA_HOME\bin;$ANDROID_HOME\platform-tools;$env:PATH"

Write-Host "Using JDK at: $JAVA_HOME"
Write-Host "ANDROID_HOME: $ANDROID_HOME"

$apkDir = "app\build\outputs\apk\release"
$apkPath = "$apkDir\app-release.apk"

Write-Host "`nBuilding release APK..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\android"
& .\gradlew.bat assembleRelease --no-daemon
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

if (Test-Path $apkPath) {
    $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
    Write-Host "`nAPK built: $apkPath ($size MB)" -ForegroundColor Green
    Write-Host "Full path: $(Resolve-Path $apkPath)" -ForegroundColor Cyan
} else {
    Write-Host "APK not found at $apkPath" -ForegroundColor Red
}
