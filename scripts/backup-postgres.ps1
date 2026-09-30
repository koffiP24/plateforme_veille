param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'
foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE')) {
  if (-not [Environment]::GetEnvironmentVariable($name)) {
    throw "La variable $name est obligatoire."
  }
}
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw 'pg_dump est introuvable dans le PATH.'
}

$directory = [System.IO.Path]::GetFullPath($BackupDirectory)
[System.IO.Directory]::CreateDirectory($directory) | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$database = [Environment]::GetEnvironmentVariable('PGDATABASE') -replace '[^a-zA-Z0-9_-]', '_'
$target = Join-Path $directory "$database-$stamp.dump"

& pg_dump --format=custom --no-owner --no-acl --file=$target
if ($LASTEXITCODE -ne 0) {
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
  throw 'La sauvegarde PostgreSQL a échoué.'
}
if ((Get-Item -LiteralPath $target).Length -eq 0) {
  Remove-Item -LiteralPath $target -Force
  throw 'La sauvegarde PostgreSQL est vide.'
}

Write-Output "Sauvegarde créée : $target"
