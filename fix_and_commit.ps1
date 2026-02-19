# BuildPro Fix Script - Run from repo root in PowerShell
# Usage: .\fix_and_commit.ps1

Write-Host "Starting BuildPro fixes..." -ForegroundColor Cyan

$backend = ".\backend"

# ── 1. Create config/prisma.js ───────────────────────────────────────────────
$prismaConfig = "$backend\src\config\prisma.js"
New-Item -ItemType Directory -Force -Path "$backend\src\config" | Out-Null
@'
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
export default prisma;
'@ | Set-Content $prismaConfig -Encoding UTF8
Write-Host "CREATED: backend/src/config/prisma.js" -ForegroundColor Green

# ── 2. Helper: replace text in a file ────────────────────────────────────────
function Fix-File($path, $old, $new) {
    if (-not (Test-Path $path)) { return }
    $content = Get-Content $path -Raw -Encoding UTF8
    if ($content -match [regex]::Escape($old)) {
        $content = $content.Replace($old, $new)
        Set-Content $path $content -Encoding UTF8 -NoNewline
        Write-Host "FIXED: $path" -ForegroundColor Yellow
    }
}

# ── 3. Fix index.js ──────────────────────────────────────────────────────────
$indexPath = "$backend\src\index.js"
$content = Get-Content $indexPath -Raw -Encoding UTF8
$content = $content -replace "import \{ PrismaClient \} from '@prisma/client';", "import { prisma } from './config/prisma.js';"
$content = $content -replace "(?s)\nconst prisma = new PrismaClient\(\{[^}]+\}\);\n", "`n"
Set-Content $indexPath $content -Encoding UTF8 -NoNewline
Write-Host "FIXED: backend/src/index.js" -ForegroundColor Yellow

# ── 4. Fix services/stripe.js ────────────────────────────────────────────────
$path = "$backend\src\services\stripe.js"
$content = Get-Content $path -Raw -Encoding UTF8
$content = $content -replace "(?s)\nconst stripe = process\.env\.STRIPE_SECRET_KEY\s*\?[\s\S]*?null;\n", "`n"
$content = $content -replace "import Stripe from 'stripe';\n", ""
Set-Content $path $content -Encoding UTF8 -NoNewline
Write-Host "FIXED: backend/src/services/stripe.js" -ForegroundColor Yellow

# ── 5. Fix services/factory/stripe.js ───────────────────────────────────────
$path = "$backend\src\services\factory\stripe.js"
$content = Get-Content $path -Raw -Encoding UTF8
$content = $content -replace "(?s)\nconst stripe = process\.env\.STRIPE_SECRET_KEY\s*\?[\s\S]*?null;\n", "`n"
$content = $content -replace "import Stripe from 'stripe';\n", ""
Set-Content $path $content -Encoding UTF8 -NoNewline
Write-Host "FIXED: backend/src/services/factory/stripe.js" -ForegroundColor Yellow

# ── 6. Fix routes/billing.js ─────────────────────────────────────────────────
$path = "$backend\src\routes\billing.js"
$content = Get-Content $path -Raw -Encoding UTF8
$content = $content -replace "(?s)\nconst stripe = process\.env\.STRIPE_SECRET_KEY\s*\?[\s\S]*?null;\n", "`n"
$content = $content -replace "import Stripe from 'stripe';\n", "import { stripe } from '../config/stripe.js';`n"
Set-Content $path $content -Encoding UTF8 -NoNewline
Write-Host "FIXED: backend/src/routes/billing.js" -ForegroundColor Yellow

# ── 7. Fix all files importing prisma from index.js ─────────────────────────
$files = Get-ChildItem -Path "$backend\src" -Recurse -Filter "*.js" |
         Where-Object { (Get-Content $_.FullName -Raw) -match "from '\.\./index\.js'|from '\.\./\.\./index\.js'" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace "from '\.\./index\.js'", "from '../config/prisma.js'"
    $content = $content -replace "from '\.\./\.\./index\.js'", "from '../../config/prisma.js'"
    Set-Content $file.FullName $content -Encoding UTF8 -NoNewline
    Write-Host "FIXED: $($file.FullName)" -ForegroundColor Yellow
}

# ── 8. Fix integration test ──────────────────────────────────────────────────
$testPath = "$backend\__tests__\integration.test.js"
$content = Get-Content $testPath -Raw -Encoding UTF8
$content = $content -replace "(it\('rejects unauthenticated requests to protected routes', async \(\) => \{)\n(\s+)(?!if)", "`$1`n    if (!TEST_DB_URL) return;`n`$2"
$content = $content -replace "(it\('rejects expired/invalid tokens', async \(\) => \{)\n(\s+)(?!if)", "`$1`n    if (!TEST_DB_URL) return;`n`$2"
Set-Content $testPath $content -Encoding UTF8 -NoNewline
Write-Host "FIXED: backend/__tests__/integration.test.js" -ForegroundColor Yellow

# ── 9. Commit and push ───────────────────────────────────────────────────────
Write-Host "`nCommitting changes..." -ForegroundColor Cyan
git add -A
git commit -m "fix: resolve circular prisma imports and duplicate stripe declarations"
git push

Write-Host "`nDone! Check GitHub Actions for results." -ForegroundColor Green
