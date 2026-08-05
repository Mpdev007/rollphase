# Ship RollPhase: bump version → commit → push (Render / Pages pick it up).
# Usage from repo root:
#   pwsh scripts/ship.ps1 -Message "What changed"
#   pwsh scripts/ship.ps1 -Message "Hotfix" -Version 0.5.1

param(
  [string]$Message = "App update",
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$bumpArgs = @("scripts/bump-version.js", "--message", $Message)
if ($Version) { $bumpArgs += @("--version", $Version) }
node @bumpArgs

git add prototype/version.json prototype/sw.js
# Stage anything else already modified (optional: user can stage first)
$status = git status --porcelain
if (-not $status) {
  Write-Host "Nothing to commit after version bump."
  exit 0
}

git add -A
$commitMsg = "ship: $Message"
git commit -m $commitMsg
git push origin master
Write-Host "Pushed. Phones with the app open will prompt: Update available → Restart (within ~45s)."
