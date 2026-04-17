# AWS Backend Connection Fix (100.31.117.111:8000)

## ✅ App Config is CORRECT
Android app already uses correct AWS URL: `http://100.31.117.111:8000`
- network/RetrofitClient.kt ✓
- data/RetrofitClient.kt ✓

## ❌ Connection Issues (Troubleshoot)

### 1. Test Backend from Mac Terminal
```bash
# Test health endpoint
curl http://100.31.117.111:8000/health

# Test root endpoint  
curl http://100.31.117.111:8000/

# Test ML endpoint (no auth needed)
curl -X POST http://100.31.117.111:8000/api/roboflow/detect -F 'file=@test.jpg'
```

### 2. AWS EC2 Security Group (CRITICAL)
```
Inbound Rules MUST include:
- Port 8000 TCP - Source: 0.0.0.0/0 (or your mobile IP range)
- Port 22 SSH (for backend management)
- HTTP 80, HTTPS 443 if using nginx proxy
```

**AWS Console → EC2 → Security Groups → Edit Inbound Rules → Add Rule:**
```
Type: Custom TCP | Port: 8000 | Source: Anywhere (0.0.0.0/0)
```

### 3. Backend Server Status
SSH to EC2 and verify:
```bash
# Check if FastAPI running on port 8000
netstat -tlnp | grep 8000
ps aux | grep uvicorn

# Restart backend if needed
cd /path/to/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Or use your start script
```

### 4. Android Device Testing
```
Physical Device (WiFi):
- Ensure phone/Mac on same network OR use mobile data
- Test: adb shell curl http://100.31.117.111:8000/health

Emulator:
- Use 10.0.2.2:8000 ONLY if backend runs LOCAL on Mac
- AWS IP works directly on emulator too
```

### 5. Network/Firewall
```
- Corporate VPN? Disable temporarily
- Mac firewall: System Settings → Network → Firewall → Off
- ISP blocking port 8000? Try ngrok/port forwarding
```

### 6. Verify from Android Logs
```
Run app → Scan → Check Logcat:
adb logcat | grep -E "(RoboflowRepository|Retrofit|OkHttp)"
Look for connection timeout/refused errors
```

## Quick Fix Commands (Run on Mac)
```bash
# 1. Test backend
curl http://100.31.117.111:8000/health

# 2. If no response → SSH to EC2 → restart backend
ssh -i your-key.pem ubuntu@100.31.117.111
cd backend && ./start_backend_port_8000.bat  # or uvicorn command

# 3. Test from emulator
adb shell curl http://100.31.117.111:8000/health
```

## Production Upgrade (Recommended)
1. Use domain: `https://api.sensesafe.com` (CloudFront + nginx + SSL)
2. Update BASE_URL in both RetrofitClient.kt
3. Add BuildConfig support for local/prod switching
