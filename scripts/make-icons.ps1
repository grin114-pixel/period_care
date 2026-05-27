$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $repoRoot 'public'

function New-OvulationIconBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  # Background (soft off-white)
  $bg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 250, 252))
  $g.FillRectangle($bg, 0, 0, $size, $size)
  $bg.Dispose()

  # Purple circle
  $circleColor = [System.Drawing.Color]::FromArgb(255, 155, 111, 232) # #9b6fe8
  $circleBrush = [System.Drawing.SolidBrush]::new($circleColor)
  $pad = [Math]::Round($size * 0.14)
  $diam = $size - ($pad * 2)
  $g.FillEllipse($circleBrush, $pad, $pad, $diam, $diam)
  $circleBrush.Dispose()

  # White flower (5 petals)
  $petalBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $cx = $size / 2.0
  $cy = $size / 2.0
  $petalW = $diam * 0.26
  $petalH = $diam * 0.40
  $radius = $diam * 0.18

  for ($i = 0; $i -lt 5; $i++) {
    $angle = 72.0 * $i
    $g.ResetTransform()
    $g.TranslateTransform($cx, $cy)
    $g.RotateTransform($angle)
    $g.TranslateTransform(-$cx, -$cy)
    $x = $cx - ($petalW / 2.0)
    $y = $cy - $radius - ($petalH / 2.0)
    $g.FillEllipse($petalBrush, $x, $y, $petalW, $petalH)
  }

  # Center dot
  $g.ResetTransform()
  $centerSize = $diam * 0.12
  $g.FillEllipse($petalBrush, $cx - $centerSize/2.0, $cy - $centerSize/2.0, $centerSize, $centerSize)
  $petalBrush.Dispose()

  $g.Dispose()
  return $bmp
}

function Save-Icon([int]$size, [string]$name) {
  $bmp = New-OvulationIconBitmap $size
  try {
    $path = Join-Path $outDir $name
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $bmp.Dispose()
  }
}

Save-Icon 512 "icon-512.png"
Save-Icon 192 "icon-192.png"
Save-Icon 180 "apple-touch-icon.png"

Write-Host "OK"

