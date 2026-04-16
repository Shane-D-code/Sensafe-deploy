$body = @{
    email = "admin@sensesafe.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/login" -Method Post -Body $body -ContentType "application/json"

Write-Host "Login successful!"
Write-Host "Access Token: $($response.access_token)"
Write-Host "User: $($response.user.name) ($($response.user.email))"
