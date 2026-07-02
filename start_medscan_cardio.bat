@echo off
title MEDSCAN CARDIO Server
echo ==========================================
echo      MEDSCAN CARDIO Tizimini Ishga Tushirish
echo ==========================================
echo.
echo 1. Server ishga tushmoqda...
echo.

:: Get local IP address
for /f "tokens=*" %%i in ('python -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()"') do set LOCAL_IP=%%i

echo =======================================================================
echo  TELEFONDA ULANISH KO'RSATMALARI:
echo  1. Telefoningiz va kompyuteringiz bitta Wi-Fi tarmog'iga ulangan bo'lishi kerak.
echo  2. Telefon ilovasida (APK) ushbu manzilni kiriting:
echo     http://%LOCAL_IP%:8000
echo =======================================================================
echo.
echo 2. Brauzerda http://localhost:8000 ochilmoqda...
echo.
timeout /t 2 /nobreak > nul
start http://localhost:8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
