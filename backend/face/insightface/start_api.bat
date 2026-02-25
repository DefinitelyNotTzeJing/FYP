@echo off
echo Starting Face Recognition API...
cd /d %~dp0
call venv\Scripts\activate.bat
python face_recognition_api.py
pause