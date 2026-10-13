param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action = 'status'
)

$postgresRoot = if ($env:TRAM_K_POSTGRES_ROOT) {
  $env:TRAM_K_POSTGRES_ROOT
} else {
  'E:\PostgreSQL\18.6\pgsql'
}
$dataRoot = if ($env:TRAM_K_POSTGRES_DATA) {
  $env:TRAM_K_POSTGRES_DATA
} else {
  'E:\PostgreSQL\data'
}
$logRoot = if ($env:TRAM_K_POSTGRES_LOGS) {
  $env:TRAM_K_POSTGRES_LOGS
} else {
  'E:\PostgreSQL\logs'
}
$pgCtl = Join-Path $postgresRoot 'bin\pg_ctl.exe'

if (-not (Test-Path -LiteralPath $pgCtl)) {
  throw "pg_ctl was not found at $pgCtl. Set TRAM_K_POSTGRES_ROOT when PostgreSQL is installed elsewhere."
}
if (-not (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION'))) {
  throw "The PostgreSQL data cluster was not found at $dataRoot."
}

switch ($Action) {
  'start' {
    & $pgCtl -D $dataRoot status *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Output 'PostgreSQL is already running.'
      exit 0
    }

    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    & $pgCtl -D $dataRoot -l (Join-Path $logRoot 'postgresql.log') start
    exit $LASTEXITCODE
  }
  'stop' {
    & $pgCtl -D $dataRoot status *> $null
    if ($LASTEXITCODE -ne 0) {
      Write-Output 'PostgreSQL is already stopped.'
      exit 0
    }

    & $pgCtl -D $dataRoot stop -m fast
    exit $LASTEXITCODE
  }
  'status' {
    & $pgCtl -D $dataRoot status
    exit $LASTEXITCODE
  }
}
