#!/bin/bash
set -e

export WORKSPACE_FLAVOR=${1:-full}

echo "Building ml-workspace with flavor: $WORKSPACE_FLAVOR"

docker-compose -f docker/docker-compose.yml build --parallel

echo "Build complete. To run the container:"
echo "  docker-compose -f docker/docker-compose.yml up -d final"
