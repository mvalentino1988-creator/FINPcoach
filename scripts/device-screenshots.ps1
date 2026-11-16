# scripts/device-screenshots.ps1
# Screenshot guidati dal Pixel collegato in debug USB.
# Tu apri la schermata sul telefono, scrivi il nome qui, lo script scatta e copia il PNG sul PC.
#
# Uso (dalla cartella del progetto, in PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\device-screenshots.ps1 -Tema chiaro
#   powershell -ExecutionPolicy Bypass -File scripts\device-screenshots.ps1 -Tema scuro

param(
    [ValidateSet("chiaro", "scuro")]
    [string]$Tema = "chiaro",
    [string]$Adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
)

if (-not (Test-Path $Adb)) {
    Write-Host "adb non trovato in: $Adb" -ForegroundColor Red
    Write-Host "Passa il percorso giusto con -Adb 'C:\...\platform-tools\adb.exe'"
    exit 1
}

Write-Host "Dispositivi collegati:" -ForegroundColor Cyan
& $Adb devices
$devices = (& $Adb devices) | Select-String -Pattern "\sdevice$"
if (-not $devices) {
    Write-Host "Nessun telefono pronto. Controlla cavo, debug USB e il popup di autorizzazione." -ForegroundColor Red
    exit 1
}

$out = Join-Path (Get-Location) ("reports\device-shots\" + (Get-Date -Format "yyyy-MM-dd_HHmm") + "_" + $Tema)
New-Item -ItemType Directory -Force $out | Out-Null
Write-Host "`nCartella di destinazione: $out" -ForegroundColor Cyan
Write-Host "Tema che stai fotografando: $Tema (cambialo sul telefono PRIMA di iniziare)."
Write-Host "Per ogni schermata: aprila sul telefono, scrivi un nome (es. atleti, piano-lista, modale-atleta) e premi Invio."
Write-Host "Invio senza testo = fine.`n"

$i = 1
while ($true) {
    $name = Read-Host "Nome schermata n.$i"
    if ([string]::IsNullOrWhiteSpace($name)) { break }
    $safe = ($name -replace "[^a-zA-Z0-9\-_]+", "-").Trim("-")
    if (-not $safe) { $safe = "schermata" }
    $file = "{0:D2}-{1}-{2}.png" -f $i, $safe, $Tema
    $remote = "/sdcard/finp_shot.png"

    & $Adb shell screencap -p $remote
    & $Adb pull $remote (Join-Path $out $file) | Out-Null
    & $Adb shell rm $remote

    if (Test-Path (Join-Path $out $file)) {
        Write-Host "  salvato: $file" -ForegroundColor Green
        $i++
    } else {
        Write-Host "  errore: screenshot non salvato, riprova" -ForegroundColor Red
    }
}

Write-Host "`nFatto: $($i - 1) screenshot in $out" -ForegroundColor Cyan
