param(
  [switch]$Local  # use -Local to run backend + ngrok locally instead of Railway
)

$root = $PSScriptRoot

Write-Host "`nLevantiLearn — starting dev environment..." -ForegroundColor Cyan

if ($Local) {
  # Local mode: backend on localhost + ngrok tunnel
  Write-Host "Mode: LOCAL (backend + ngrok)" -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "ngrok http 8000 --domain=suffix-ahead-letter.ngrok-free.dev" `
    -WindowStyle Normal
  Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$root\backend'; uvicorn main:app --reload --host 0.0.0.0 --port 8000" `
    -WindowStyle Normal
  Write-Host "Backend + ngrok starting in new windows." -ForegroundColor Green
} else {
  # Default: use Railway backend (always on, no ngrok needed)
  Write-Host "Mode: RAILWAY (backend already live at railway.app)" -ForegroundColor Green
  Write-Host "Backend: https://levantilearn-backend-production.up.railway.app" -ForegroundColor Cyan
}

Write-Host "Starting Expo frontend...`n" -ForegroundColor Green
Set-Location "$root\frontend"
npx expo start
