# syntax=docker/dockerfile:1.4

ARG BASE_IMAGE
FROM $BASE_IMAGE

USER root

ARG WORKSPACE_FLAVOR="full"
ENV WORKSPACE_FLAVOR=${WORKSPACE_FLAVOR}

ENV \
    RESOURCES_PATH="/resources" \
    CONDA_ROOT=/opt/conda \
    PYTHON_VERSION="3.12.13" \
    CONDA_PYTHON_DIR=/opt/conda/lib/python3.12

COPY resources/libraries ${RESOURCES_PATH}/libraries

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    ln -s -f $CONDA_ROOT/bin/python /usr/bin/python && \
    apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::http::No-Cache=true && \
    pip install --upgrade pip && \
    conda config --system --remove channels https://repo.anaconda.com/pkgs/main || true && \
    conda config --system --remove channels https://repo.anaconda.com/pkgs/r || true && \
    conda config --system --remove channels defaults || true && \
    conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main || true && \
    conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r || true && \
    if [ "$WORKSPACE_FLAVOR" = "minimal" ]; then \
        conda install -y --update-all 'python='$PYTHON_VERSION nomkl ; \
    else \
        conda install -y --update-all 'python='$PYTHON_VERSION mkl-service mkl ; \
    fi && \
    conda install -y --update-all \
            'python='$PYTHON_VERSION \
            'ipython>=8.30' \
            'notebook>=6.5.7' \
            'jupyterlab>=4.5.6' \
            'nbconvert>=7.0' \
            'yarl>=1.9' \
            'scipy>=1.11' \
            'numpy>=1.26' \
            scikit-learn \
            numexpr && \
    conda config --system --set channel_priority false && \
    pip install --no-cache-dir --upgrade --upgrade-strategy only-if-needed -r ${RESOURCES_PATH}/libraries/requirements-minimal.txt && \
    if [ "$WORKSPACE_FLAVOR" = "minimal" ]; then \
        fix-permissions.sh $CONDA_ROOT && \
        clean-layer.sh && \
        exit 0 ; \
    fi && \
    fix-permissions.sh $CONDA_ROOT && \
    clean-layer.sh

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::http::No-Cache=true && \
    # apt-get install -y --no-install-recommends libopenmpi-dev openmpi-bin && \
    conda install -y --freeze-installed -c conda-forge openmpi && \
    conda install -y --freeze-installed \
        'python='$PYTHON_VERSION \
        boost \
        mkl-include && \
    conda install -y --freeze-installed -c conda-forge mkl && \
    conda install -y -c pytorch "pytorch>=2.0" cpuonly && \
    conda install -y -c conda-forge "tensorflow>=2.17" && \
    pip install --no-cache-dir --upgrade --upgrade-strategy only-if-needed -r ${RESOURCES_PATH}/libraries/requirements-light.txt && \
    if [ "$WORKSPACE_FLAVOR" = "light" ]; then \
        fix-permissions.sh $CONDA_ROOT && \
        clean-layer.sh && \
        exit 0 ; \
    fi && \
    apt-get install -y --no-install-recommends liblapack-dev libatlas-base-dev libeigen3-dev libblas-dev && \
    apt-get install -y --no-install-recommends libhdf5-dev && \
    apt-get install -y --no-install-recommends libtbb-dev && \
    apt-get install -y --no-install-recommends libtesseract-dev && \
    pip install --no-cache-dir tesserocr && \
    conda install -y --freeze-installed -c conda-forge h5py && \
    apt-get install -y --no-install-recommends libopenexr-dev && \
    apt-get install -y --no-install-recommends libgomp1 && \
    conda install -y --freeze-installed libjpeg-turbo && \
    conda install -y -c bioconda -c conda-forge snakemake-minimal && \
    conda install -y -c conda-forge mamba && \
    conda install -y --freeze-installed faiss-cpu && \
    fix-permissions.sh $CONDA_ROOT && \
    clean-layer.sh
    
RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::http::No-Cache=true && \
    apt-get install -y --no-install-recommends pkg-config libmariadb-dev && \
    pip install --no-cache-dir --upgrade --upgrade-strategy only-if-needed --use-deprecated=legacy-resolver -r ${RESOURCES_PATH}/libraries/requirements-full.txt && \
    python -m spacy download en && \
    fix-permissions.sh $CONDA_ROOT && \
    clean-layer.sh

RUN \
    rm -f /opt/conda/bin/node && ln -s /usr/bin/node /opt/conda/bin/node && \
    rm -f /opt/conda/bin/npm && ln -s /usr/bin/npm /opt/conda/bin/npm
