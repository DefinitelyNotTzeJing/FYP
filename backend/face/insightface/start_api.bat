@echo off
echo Starting Face Recognition API...
cd /d %~dp0
call venv\Scripts\activate.bat
echo Installing/checking dependencies...
pip install flask flask-cors insightface opencv-python numpy scipy --quiet
python face_liveness_service.py
pause