param(
  [int]$Port = 8080
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Loopback, $Port)
$listener = New-Object System.Net.Sockets.TcpListener($endpoint)
$listener.Start()

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Anmol Digital Academy Server running at:" -ForegroundColor Green
Write-Host " http://localhost:$Port" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      # Read remaining headers until blank line
      while ($true) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($line)) { break }
      }

      if (-not [string]::IsNullOrEmpty($requestLine)) {
        $parts = $requestLine.Split(' ')
        $rawUrl = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
        $urlPath = ($rawUrl -split '\?')[0]
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)

        if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
          $urlPath = "/index.html"
        }

        $relativePath = $urlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $filePath = Join-Path $root $relativePath

        if (Test-Path $filePath -PathType Leaf) {
          $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
          $contentType = $mimeTypes[$ext]
          if (-not $contentType) { $contentType = "application/octet-stream" }

          $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
          $cacheHeader = if ($ext -eq ".jpg" -or $ext -eq ".jpeg") { "Cache-Control: public, max-age=86400`r`n" } else { "Cache-Control: no-cache`r`n" }
          $headerStr = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bodyBytes.Length)`r`n$cacheHeader`Connection: close`r`n`r`n"
          $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerStr)

          $stream.Write($headerBytes, 0, $headerBytes.Length)
          $stream.Write($bodyBytes, 0, $bodyBytes.Length)
        } else {
          $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
          $headerStr = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($notFoundBytes.Length)`r`nConnection: close`r`n`r`n"
          $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerStr)
          $stream.Write($headerBytes, 0, $headerBytes.Length)
          $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }
        $stream.Flush()
      }
    } catch {
      # Ignore broken client pipe
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
