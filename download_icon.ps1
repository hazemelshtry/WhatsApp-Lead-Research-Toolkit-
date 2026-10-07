$url = 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/whatsapp.png'
$path128 = 'c:\Users\user\Pictures\WhatsApp-Pro-Extension\icon128.png'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $path128

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($path128)

$sizes = @(16, 48)
foreach ($s in $sizes) {
    $b = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $s, $s)
    
    $outPath = "c:\Users\user\Pictures\WhatsApp-Pro-Extension\icon$s.png"
    $b.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $b.Dispose()
}
$img.Dispose()
