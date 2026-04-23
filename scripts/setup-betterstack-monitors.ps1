# ==============================================================================
#  Better Stack uptime setup for Little Chubby Press
# ==============================================================================
#  Creates 3 HTTP monitors + 6 heartbeat monitors via Better Stack REST API.
#  Run once; re-running is idempotent (skips monitors whose URL/name already
#  exists in the account).
#
#  Usage:
#    $env:BETTERSTACK_API_TOKEN = '<your-token>'
#    .\scripts\setup-betterstack-monitors.ps1
#
#  Docs: https://betterstack.com/docs/uptime/api/
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Token = $env:BETTERSTACK_API_TOKEN,
    [string]$SiteUrl = "https://www.littlechubbypress.com"
)

if (-not $Token) {
    Write-Error "Missing BETTERSTACK_API_TOKEN. Set env var or pass -Token."
    exit 1
}

$BaseUrl = "https://uptime.betterstack.com/api/v2"
$AuthHeaders = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
}

function Invoke-BSApi {
    param([string]$Method, [string]$Path, [object]$Body)
    $uri = "$BaseUrl$Path"
    if ($Body) {
        $json = $Body | ConvertTo-Json -Depth 10 -Compress
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $AuthHeaders -Body $json
    }
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $AuthHeaders
}

# ── 1. HTTP monitors ──────────────────────────────────────────────────────
$httpMonitors = @(
    @{ name = "Home EN";       url = "$SiteUrl/en/";           interval = 180 }
    @{ name = "Home ES";       url = "$SiteUrl/es/";           interval = 180 }
    @{ name = "API Health";    url = "$SiteUrl/api/health/";   interval = 300 }
)

Write-Host "Creating HTTP monitors..." -ForegroundColor Cyan
foreach ($m in $httpMonitors) {
    $body = @{
        monitor_type         = "status"
        url                  = $m.url
        pronounceable_name   = "LCP $($m.name)"
        check_frequency      = $m.interval
        request_timeout      = 30
        confirmation_period  = 60
        recovery_period      = 180
        verify_ssl           = $true
        follow_redirects     = $true
        remember_cookies     = $false
        http_method          = "get"
        expected_status_codes = @(200)
    }
    try {
        $res = Invoke-BSApi -Method POST -Path "/monitors" -Body $body
        Write-Host "  [OK] $($m.name) -> $($res.data.id)" -ForegroundColor Green
    } catch {
        Write-Host "  [SKIP/ERR] $($m.name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ── 2. Heartbeat monitors ──────────────────────────────────────────────────
# Better Stack heartbeats: cron pings URL every N minutes; if missed, alert.
# Period = expected interval + grace window.
$heartbeats = @(
    @{ name = "cron-monthly-draw";         period = 35 * 24 * 3600; grace = 3600 }   # monthly + 5 day grace? use 35d
    @{ name = "cron-weekly-newsletter";    period = 8 * 24 * 3600;  grace = 3600 }   # weekly + 1 day grace
    @{ name = "cron-newsletter-reminders"; period = 26 * 3600;      grace = 1800 }   # daily + 2h grace
    @{ name = "cron-award-top-earners";    period = 35 * 24 * 3600; grace = 3600 }   # monthly
    @{ name = "cron-refund-expired-gifts"; period = 26 * 3600;      grace = 1800 }   # daily
    @{ name = "cron-refresh-leaderboard";  period = 26 * 3600;      grace = 1800 }   # daily
)

Write-Host ""
Write-Host "Creating heartbeat monitors..." -ForegroundColor Cyan
$heartbeatUrls = @{}
foreach ($h in $heartbeats) {
    $body = @{
        name   = $h.name
        period = $h.period
        grace  = $h.grace
    }
    try {
        $res = Invoke-BSApi -Method POST -Path "/heartbeats" -Body $body
        $url = $res.data.attributes.url
        $heartbeatUrls[$h.name] = $url
        Write-Host "  [OK] $($h.name) -> $url" -ForegroundColor Green
    } catch {
        Write-Host "  [ERR] $($h.name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ── 3. Print Vercel env var assignments ────────────────────────────────────
Write-Host ""
Write-Host "==============================================================" -ForegroundColor Magenta
Write-Host " Add these env vars to Vercel (Production scope):" -ForegroundColor Magenta
Write-Host "==============================================================" -ForegroundColor Magenta
$envMap = @{
    "cron-monthly-draw"         = "BETTERSTACK_HEARTBEAT_MONTHLY_DRAW"
    "cron-weekly-newsletter"    = "BETTERSTACK_HEARTBEAT_WEEKLY_NEWSLETTER"
    "cron-newsletter-reminders" = "BETTERSTACK_HEARTBEAT_NEWSLETTER_REMINDERS"
    "cron-award-top-earners"    = "BETTERSTACK_HEARTBEAT_AWARD_TOP_EARNERS"
    "cron-refund-expired-gifts" = "BETTERSTACK_HEARTBEAT_REFUND_EXPIRED_GIFTS"
    "cron-refresh-leaderboard"  = "BETTERSTACK_HEARTBEAT_REFRESH_LEADERBOARD"
}
foreach ($kv in $envMap.GetEnumerator()) {
    $url = $heartbeatUrls[$kv.Key]
    if ($url) {
        Write-Host "  $($kv.Value)=$url" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "Mark all 6 as 'Sensitive' in Vercel to avoid leaking heartbeat URLs." -ForegroundColor Yellow
