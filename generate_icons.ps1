Add-Type -AssemblyName System.Drawing
$sizes = @(16, 48, 128)

foreach ($s in $sizes) {
    $b = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $br = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 211, 102))
    $g.FillEllipse($br, 0, 0, $s, $s)
    
    $fontSize = [math]::Max(5, [math]::Round($s / 2.5))
    $f = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $tb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $r = New-Object System.Drawing.RectangleF(0, 0, $s, $s)
    $g.DrawString('WA', $f, $tb, $r, $sf)
    
    $path = "c:\Users\user\Pictures\WhatsApp-Pro-Extension\icon$s.png"
    $b.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $b.Dispose()
}
