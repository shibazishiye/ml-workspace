# syntax=docker/dockerfile:1

ARG BASE_IMAGE
FROM $BASE_IMAGE

USER root

ARG WORKSPACE_FLAVOR="full"
ENV WORKSPACE_FLAVOR=${WORKSPACE_FLAVOR}

ENV \
    HOME="/root" \
    RESOURCES_PATH="/resources" \
    CONDA_ROOT=/opt/conda \
    NB_USER="root"

COPY \
    resources/jupyter/start.sh \
    resources/jupyter/start-notebook.sh \
    resources/jupyter/start-singleuser.sh \
    /usr/local/bin/

COPY resources/jupyter/nbconfig /etc/jupyter/nbconfig
COPY resources/jupyter/jupyter_notebook_config.json /etc/jupyter/

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    mkdir -p $HOME/.jupyter/nbconfig/ && \
    printf "{\"load_extensions\": {}}" > $HOME/.jupyter/nbconfig/notebook.json && \
    pip install --no-cache-dir 'jupyter_tensorboard>=0.3' && \
    jupyter tensorboard enable --sys-prefix || true && \
    cat $HOME/.jupyter/nbconfig/notebook.json | jq '.toc2={"moveMenuLeft": false,"widenNotebook": false,"skip_h1_title": false,"sideBar": true,"number_sections": false,"collapse_to_match_collapsible_headings": true}' > tmp.$$.json && mv tmp.$$.json $HOME/.jupyter/nbconfig/notebook.json && \
    nbdime config-git --enable --global || true && \
    jupyter nbextension enable --py jupytext --sys-prefix || true && \
    if [ "$WORKSPACE_FLAVOR" = "minimal" ]; then \
        clean-layer.sh && \
        exit 0 ; \
    fi && \
    if [ "$WORKSPACE_FLAVOR" = "light" ]; then \
        clean-layer.sh && \
        exit 0 ; \
    fi && \
    pip install witwidget && \
    jupyter nbextension install --py --symlink --sys-prefix witwidget || true && \
    jupyter nbextension enable --py --sys-prefix witwidget || true && \
    jupyter nbextension enable --py --sys-prefix qgrid || true && \
    ipcluster nbextension enable || true && \
    clean-layer.sh

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    if [ "$WORKSPACE_FLAVOR" != "minimal" ]; then \
        pip install jupyterlab_tensorboard || true; \
    fi && \
    clean-layer.sh

# COPY resources/jupyter/extensions $RESOURCES_PATH/jupyter-extensions
# RUN pip install --no-cache-dir $RESOURCES_PATH/jupyter-extensions/tooling-extension/ && clean-layer.sh

# COPY resources/tools/oh-my-zsh.sh $RESOURCES_PATH/tools/oh-my-zsh.sh
# RUN \
#     /bin/bash $RESOURCES_PATH/tools/oh-my-zsh.sh --install && \
#     conda init zsh && \
#     chsh -s $(which zsh) $NB_USER && \
#     curl -s https://get.sdkman.io | bash && \
#     clean-layer.sh

# COPY resources/tools/git-lfs.sh $RESOURCES_PATH/tools/git-lfs.sh
# RUN /bin/bash $RESOURCES_PATH/tools/git-lfs.sh --install && clean-layer.sh
