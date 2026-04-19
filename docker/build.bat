@echo off
set WORKSPACE_FLAVOR=%1
if "%WORKSPACE_FLAVOR%"=="" set WORKSPACE_FLAVOR=full

echo Building ml-workspace with flavor: %WORKSPACE_FLAVOR%

:: docker-compose -f docker/docker-compose.yml build --parallel

docker buildx bake -f docker-compose.yml --load


echo Build complete. To run the container:
echo   docker-compose -f docker/docker-compose.yml up -d final
