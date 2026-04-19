# syntax=docker/dockerfile:1

ARG BASE_IMAGE=ml-workspace:base
FROM $BASE_IMAGE

USER root

ARG WORKSPACE_FLAVOR="full"
ARG CONDA_OVERRIDE_GLIBC="2.35"
ENV WORKSPACE_FLAVOR=${WORKSPACE_FLAVOR}

ENV \
    CONDA_DIR=/opt/conda \
    CONDA_ROOT=/opt/conda \
    PYTHON_VERSION="3.13.12" \
    CONDA_PYTHON_DIR=/opt/conda/lib/python3.13 \
    MINICONDA_VERSION=26.1.1-1 \
    MINICONDA_MD5=f6dfb5b59614fd7b2956b240b2575a9d58203ec7f7a99f85128158a0fdc5c1d7 \
    CONDA_VERSION=26.1.1 \
    CONDA_OVERRIDE_GLIBC=${CONDA_OVERRIDE_GLIBC}

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    wget --no-verbose https://repo.anaconda.com/miniconda/Miniconda3-py313_${MINICONDA_VERSION}-Linux-x86_64.sh -O ~/miniconda.sh && \
    /bin/bash ~/miniconda.sh -b -p $CONDA_ROOT && \
    export PATH=$CONDA_ROOT/bin:$PATH && \
    rm ~/miniconda.sh && \
    $CONDA_ROOT/bin/conda config --system --add channels conda-forge && \
    $CONDA_ROOT/bin/conda config --system --set auto_update_conda False && \
    $CONDA_ROOT/bin/conda config --system --set show_channel_urls True && \
    $CONDA_ROOT/bin/conda config --system --set channel_priority strict && \
    $CONDA_ROOT/bin/conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main && \
    $CONDA_ROOT/bin/conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r && \
    $CONDA_ROOT/bin/conda update -y -n base -c defaults conda && \
    $CONDA_ROOT/bin/conda update -y setuptools && \
    $CONDA_ROOT/bin/conda install -y conda-build && \
    $CONDA_ROOT/bin/conda install -y --update-all python=$PYTHON_VERSION && \
    ln -s $CONDA_ROOT/bin/python /usr/local/bin/python && \
    ln -s $CONDA_ROOT/bin/conda /usr/bin/conda && \
    $CONDA_ROOT/bin/conda install -y pip && \
    $CONDA_ROOT/bin/pip install --upgrade pip && \
    chmod -R a+rwx /usr/local/bin/ && \
    $CONDA_ROOT/bin/conda clean -y --packages && \
    $CONDA_ROOT/bin/conda clean -y -a -f && \
    $CONDA_ROOT/bin/conda build purge-all && \
    fix-permissions.sh $CONDA_ROOT && \
    clean-layer.sh

ENV PATH=$CONDA_ROOT/bin:$PATH

ENV LD_LIBRARY_PATH=$CONDA_ROOT/lib

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    git clone https://github.com/pyenv/pyenv.git $RESOURCES_PATH/.pyenv && \
    git clone https://github.com/pyenv/pyenv-virtualenv.git $RESOURCES_PATH/.pyenv/plugins/pyenv-virtualenv && \
    git clone https://github.com/pyenv/pyenv-doctor.git $RESOURCES_PATH/.pyenv/plugins/pyenv-doctor && \
    git clone https://github.com/pyenv/pyenv-update.git $RESOURCES_PATH/.pyenv/plugins/pyenv-update && \
    git clone https://github.com/pyenv/pyenv-which-ext.git $RESOURCES_PATH/.pyenv/plugins/pyenv-which-ext && \
    apt-get update && \
    apt-get install -y --no-install-recommends libffi-dev && \
    clean-layer.sh

ENV PATH=$RESOURCES_PATH/.pyenv/shims:$RESOURCES_PATH/.pyenv/bin:$PATH \
    PYENV_ROOT=$RESOURCES_PATH/.pyenv

RUN pip install pipx && \
    python -m pipx ensurepath && \
    clean-layer.sh

ENV PATH=$HOME/.local/bin:$PATH

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -f /opt/conda/bin/node && ln -s /usr/bin/node /opt/conda/bin/node && \
    rm -f /opt/conda/bin/npm && ln -s /usr/bin/npm /opt/conda/bin/npm && \
    chmod a+rwx /usr/bin/node && \
    chmod a+rwx /usr/bin/npm && \
    mkdir -p /opt/node/bin && \
    ln -s /usr/bin/node /opt/node/bin/node && \
    ln -s /usr/bin/npm /opt/node/bin/npm && \
    /usr/bin/npm install -g npm && \
    /usr/bin/npm install -g yarn && \
    /usr/bin/npm install -g typescript && \
    /usr/bin/npm install -g webpack && \
    /usr/bin/npm install -g node-gyp && \
    /usr/bin/npm update -g && \
    clean-layer.sh

ENV PATH=/opt/node/bin:$PATH

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && \
    mkdir -p /var/run/sshd && chmod 400 /var/run/sshd && \
    apt-get install -y --no-install-recommends rsyslog && \
    pipx install supervisor && \
    pipx inject supervisor supervisor-stdout && \
    mkdir -p /var/log/supervisor/ && \
    clean-layer.sh
