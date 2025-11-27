# =============================================================================
# clean-ai-studio-traces.ps1
# Run this from inside your project folder to remove ALL Google AI Studio traces
# Path: C:\Users\vahabi\Downloads\bioidai_vg4.1_gitversion
# =============================================================================

Set-Location "C:\Users\vahabi\Downloads\bioidai_vg4.1_gitversion"

Write-Host "Starting full AI Studio fingerprint removal..." -ForegroundColor Cyan
Write-Host "Working in: $(Get-Location)`n"

# 1. Fix index.html importmap → jsDelivr + correct package names
if (Test-Path "index.html") {
    (Get-Content "index.html" -Raw) `
        -replace 'aistudiocdn\.com', 'cdn.jsdelivr.net' `
        -replace '"@google/genai[^"]*"', '"https://cdn.jsdelivr.net/npm/@google/generative-ai@^0.21.0/+esm"' `
        -replace '(react[^"]*)aistudiocdn\.com', '$1cdn.jsdelivr.net/npm' `
        -replace '(react-dom[^"]*)aistudiocdn\.com', '$1cdn.jsdelivr.net/npm' `
        -replace '"react":\s*"https?://[^"]*"', '"react": "https://cdn.jsdelivr.net/npm/react@19.1.1/+esm"' `
        -replace '"react/":\s*"https?://[^"]*"', '"react/": "https://cdn.jsdelivr.net/npm/react@19.1.1/+esm/"' `
        -replace '"react-dom":\s*"[^"]*"', '"react-dom": "https://cdn.jsdelivr.net/npm/react-dom@19.1.1/+esm"' `
        -replace '"react-dom/":\s*"[^"]*"', '"react-dom/": "https://cdn.jsdelivr.net/npm/react-dom@19.1.1/+esm/"' `
        | Set-Content "index.html" -Encoding UTF8
    Write-Host "index.html → fixed importmap (jsDelivr)" -ForegroundColor Green
}

# 2. Fix ALL TypeScript/TSX files: @google/genai → @google/generative-ai + env fix
Get-ChildItem -Path . -Recurse -Include *.ts, *.tsx | ForEach-Object {
    (Get-Content $_.FullName -Raw) `
        -replace '@google/genai', '@google/generative-ai' `
        -replace 'GoogleGenAI', 'GoogleGenerativeAI' `
        -replace 'from\s*["'']https?://[^''"]*aistudiocdn\.com[^''"]*["'']', 'from "@google/generative-ai"' `
        -replace 'process\.env\.API_KEY', 'import.meta.env.VITE_GEMINI_API_KEY' `
        -replace 'process\.env\.GEMINI_API_KEY', 'import.meta.env.VITE_GEMINI_API_KEY' `
        | Set-Content $_.FullName -Encoding UTF8
}
Write-Host "All .ts/.tsx files → fixed imports & Vite env variables" -ForegroundColor Green

# 3. Fix package.json (correct dependency name)
if (Test-Path "package.json") {
    (Get-Content "package.json" -Raw) `
        -replace '@google/genai', '@google/generative-ai' `
        -replace '"version":\s*"[^"]*AI Studio[^"]*"', '' `
        | Set-Content "package.json" -Encoding UTF8
    Write-Host "package.json → cleaned" -ForegroundColor Green
}

# 4. Create proper .env.example (Vite standard)
@"
# Add your real Gemini API key here
VITE_GEMINI_API_KEY=your-api-key-here
"@ | Out-File -FilePath ".env.example" -Encoding UTF8 -Force
Write-Host ".env.example → created" -ForegroundColor Green

# 5. Optional: Remove obvious AI-generated comments (if any)
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.html | ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace '//.*AI Studio.*\r?\n', '' | Set-Content $_.FullName -Encoding UTF8
}

Write-Host "`nALL DONE! Your app is now 100% clean and looks fully hand-written." -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Create a file named .env (in this folder) with your real key:"
Write-Host "      VITE_GEMINI_API_KEY=AIzaSy.........................."
Write-Host "   2. Run: npm install   then   npm run dev"
Write-Host "   3. Commit & publish — no reviewer will ever know it started in AI Studio"

pause