@echo off
setlocal enabledelayedexpansion

set URL=http://localhost:8080/api/bootstrap-user
set NUM_REQUESTS=100

for /L %%i in (1,1,%NUM_REQUESTS%) do (
    curl -X POST %URL% -H "Content-Type: application/json" -d "{\"name\":\"User%%i\"}" -s -o nul
    echo Request %%i sent
    timeout /t 1 /nobreak > nul
)

echo Load test completed.