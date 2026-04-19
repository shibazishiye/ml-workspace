docker buildx build -f docker\base.Dockerfile --build-arg WORKSPACE_FLAVOR=full --load -t ml-workspace:base .
docker buildx build -f docker\runtimes.Dockerfile --build-arg BASE_IMAGE=ml-workspace:base --build-arg WORKSPACE_FLAVOR=full --load  -t ml-workspace:runtimes .
docker buildx build -f docker\gui.Dockerfile --build-arg BASE_IMAGE=ml-workspace:runtimes --build-arg WORKSPACE_FLAVOR=full --load  -t ml-workspace:gui .
set DOCKER_BUILDKIT=true && docker buildx build --network=host -f docker\python.Dockerfile --build-arg BASE_IMAGE=ml-workspace:gui --build-arg WORKSPACE_FLAVOR=full --load  -t ml-workspace:python .
docker buildx build --network=host -f docker\jupyter.Dockerfile --build-arg BASE_IMAGE=ml-workspace:python --build-arg WORKSPACE_FLAVOR=full --load  -t ml-workspace:jupyter .
docker buildx build --network=host -f docker\final.Dockerfile --build-arg BASE_IMAGE=ml-workspace:jupyter --build-arg WORKSPACE_FLAVOR=full --load  -t ml-workspace:latest .

docker export ml-workspace:latest | docker import - ml-workspace:latest-flattened 
https://www.baeldung.com/ops/docker-flatten-image#respond

https://www.kdnuggets.com/5-docker-containers-for-language-model-development

set HTTP_PROXY=http://192.168.71.128:1080
set HTTPS_PROXY=http://192.168.71.128:1080