# backup.ps1 - Script de backup de la base de datos PostgreSQL
# Ejecutar desde la raiz del proyecto: .\server\scripts\backup.ps1
# Requiere pg_dump (incluido con la instalacion de PostgreSQL)
#
# Para programar con el Programador de Tareas de Windows:
#   Accion: powershell.exe
#   Argumentos: -ExecutionPolicy Bypass -File "C:\ruta\al\proyecto\server\scripts\backup.ps1"
#   Inicio en: C:\ruta\al\proyecto

param(
    [string]$EnvFile = ".env",
    [string]$OutputDir = "backups"
)

# ─── Leer .env ────────────────────────────────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
    Write-Error "No se encontro el archivo $EnvFile. Ejecuta el script desde la raiz del proyecto."
    exit 1
}

$dbUrl = (Get-Content $EnvFile | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
if (-not $dbUrl) {
    Write-Error "DATABASE_URL no encontrada en $EnvFile"
    exit 1
}

# ─── Preparar directorio de salida ────────────────────────────────────────────
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Directorio '$OutputDir' creado."
}

$timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $OutputDir "backup_$timestamp.sql"

# ─── Localizar pg_dump ────────────────────────────────────────────────────────
$pgDump = "pg_dump"  # Si esta en el PATH del sistema es suficiente
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
)
foreach ($path in $pgPaths) {
    if (Test-Path $path) { $pgDump = $path; break }
}

# ─── Ejecutar backup ──────────────────────────────────────────────────────────
Write-Host "Iniciando backup → $outputFile"
& $pgDump --dbname="$dbUrl" --no-password --format=plain --file="$outputFile"

if ($LASTEXITCODE -eq 0) {
    $sizeKb = [math]::Round((Get-Item $outputFile).Length / 1KB, 1)
    Write-Host "Backup completado exitosamente: $outputFile ($sizeKb KB)"

    # ─── Retener solo los ultimos 30 backups ──────────────────────────────────
    $backups = Get-ChildItem $OutputDir -Filter "backup_*.sql" | Sort-Object Name -Descending
    if ($backups.Count -gt 30) {
        $backups | Select-Object -Skip 30 | ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "Backup antiguo eliminado: $($_.Name)"
        }
    }
} else {
    Write-Error "El backup fallo con codigo $LASTEXITCODE"
    if (Test-Path $outputFile) { Remove-Item $outputFile -Force }
    exit $LASTEXITCODE
}
