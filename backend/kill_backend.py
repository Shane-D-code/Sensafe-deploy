import psutil
import sys

print("🔍 Looking for backend process...")

killed = False
for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
    try:
        cmdline = proc.info['cmdline']
        if cmdline and 'uvicorn' in ' '.join(cmdline):
            print(f"Found backend process: PID {proc.info['pid']}")
            print(f"Command: {' '.join(cmdline)}")
            proc.kill()
            print(f"✅ Killed process {proc.info['pid']}")
            killed = True
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass

if not killed:
    print("❌ No backend process found")
else:
    print("\n✅ Backend stopped successfully!")
    print("\nNow start it again with:")
    print("python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
