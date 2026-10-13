# =====================================================================
#  VyGo — Google Play listing icon generator
#  Outputs:  images\icon-512.png
#            images\icon-192.png
#            images\icon-1024.png
#  Source:   G:\PEROVIN\vygo\assets\vygoicon.png
#
#  Strategy:
#   - If the source image exists, loads, and is at least 512px on its
#     shortest side, resize it with high-quality bicubic sampling and
#     emit 32-bit ARGB PNGs so the alpha channel is preserved for
#     Google Play's 32-bit icon requirement.
#   - Otherwise, render a simple branded placeholder:
#     dark slate (#0f172a) rounded-square background + accent cyan
#     (#22d3ee, the app's NEXUS cyan) "Vy" letterform.
#
#  Run:  powershell -ExecutionPolicy Bypass -File make-icons.ps1
# =====================================================================

$ErrorActionPreference = 'Stop'

# ---- Config ----------------------------------------------------------
$srcPath = Join-Path $PSScriptRoot '..\..\assets\vygoicon.png'
$outDir  = Join-Path $PSScriptRoot 'images'
$sizes   = @(512, 192, 1024)   # Play primary, small badge, feature-scale

if (-not (Test-Path -LiteralPath $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Add-Type -AssemblyName System.Drawing

$method = 'RESIZE_SOURCE'
$usable = $false

# ---- Load & validate source ------------------------------------------
$src = $null
if (Test-Path -LiteralPath $srcPath) {
    try {
        $src = [System.Drawing.Image]::FromFile($srcPath)
        $minSide = [Math]::Min($src.Width, $src.Height)
        if ($minSide -ge 512) {
            $usable = $true
            Write-Output ("SOURCE OK: {0} ({1}x{2})" -f $srcPath, $src.Width, $src.Height)
        } else {
            Write-Output ("WARNING: source only {0}x{1} - below 512 side; falling back to placeholder." -f $src.Width, $src.Height)
        }
    } catch {
        Write-Output ("WARNING: could not decode source ({0}); falling back to placeholder." -f $_.Exception.Message)
    }
} else {
    Write-Output "WARNING: source image not found; falling back to placeholder."
}

# ---- Helpers ------------------------------------------------------------
function Write-Resized {
    param($Image, [int]$Size, [string]$OutPath)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode   = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $g.DrawImage($Image, $rect, 0, 0, $Image.Width, $Image.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("  [{0}x{1}] written: {2}" -f $Size, $Size, $OutPath)
}

function New-Placeholder {
    param([string]$OutPath, [int]$Size)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode   = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background: dark slate #0f172a
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0f172a'))
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Top glow bar accent (nexus cyan #22d3ee)
    $barH = [int]($Size * 0.06)
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#22d3ee'))
    $g.FillRectangle($barBrush, 0, 0, $Size, $barH)

    # Letterforms 'Vy' in nexus-300 (#a5f3fc) for contrast on slate
    $fontSize = [int]($Size * 0.46)
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#a5f3fc'))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $txtRect = New-Object System.Drawing.RectangleF(0, [float]($Size*0.02), $Size, $Size)
    $g.DrawString('Vy', $font, $textBrush, $txtRect, $sf)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $font.Dispose()
    Write-Output ("  [{0}x{1}] placeholder written: {2}" -f $Size, $Size, $OutPath)
}

# ---- Produce output -------------------------------------------------------
Write-Output "=== VyGo icon generation ==="
if ($usable) {
    foreach ($s in $sizes) {
        $out = Join-Path $outDir ("icon-{0}.png" -f $s)
        Write-Resized -Image $src -Size $s -OutPath $out
    }
} else {
    $method = 'PLACEHOLDER'
    foreach ($s in $sizes) {
        $out = Join-Path $outDir ("icon-{0}.png" -f $s)
        New-Placeholder -OutPath $out -Size $s
    }
}

if ($src) { $src.Dispose() }

Write-Output ("DONE. Method used: {0}" -f $method)