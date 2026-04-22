@echo off
echo === LevantiLearn Backend Setup ===

echo [1/4] Upgrading pip + setuptools (fixes pkg_resources error)...
python -m pip install --upgrade pip setuptools wheel

echo [2/4] Installing core dependencies...
python -m pip install -r requirements.txt

echo [3/4] Copying .env file...
if not exist .env (
    copy .env.example .env
    echo .env created — fill in your API keys before running.
) else (
    echo .env already exists, skipping.
)

echo [4/4] Done! Start the server with:
echo   python -m uvicorn main:app --reload --port 8000
echo.
echo Optional: install ML packages for TTS/STT features:
echo   python -m pip install -r requirements-ml.txt
