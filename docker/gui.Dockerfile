# syntax=docker/dockerfile:1

ARG BASE_IMAGE=ml-workspace:runtimes
FROM $BASE_IMAGE

USER root

ENV RESOURCES_PATH="/resources" \
    HOME="/root" \
    CONDA_ROOT=/opt/conda \
    LD_LIBRARY_PATH=/lib/x86_64-linux-gnu:/usr/lib/x86_64-linux-gnu:$CONDA_ROOT/lib

RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        xfce4 \
        xfce4-goodies \
        xfce4-terminal \
        xterm \
        xauth \
        x11-utils \
        dbus-x11 && \
    apt-get install -y --no-install-recommends gdebi && \
    apt-get install -y --no-install-recommends catfish && \
    apt-get install -y --no-install-recommends font-manager && \
    apt-get install -y thunar-vcs-plugin && \
    apt-get install -y --no-install-recommends libqt5concurrent5 libqt5widgets5 libqt5xml5 && \
    wget --no-verbose https://github.com/variar/klogg/releases/download/v24.06/klogg-24.06.0.2000-Linux-qt6.deb -O $RESOURCES_PATH/klogg.deb && \
    dpkg -i $RESOURCES_PATH/klogg.deb || apt-get install -f -y && \
    rm $RESOURCES_PATH/klogg.deb && \
    apt-get install -y --no-install-recommends baobab && \
    apt-get install -y --no-install-recommends mousepad && \
    apt-get install -y vim && \
    apt-get install -y --no-install-recommends htop && \
    apt-get install -y p7zip p7zip-rar && \
    apt-get install -y --no-install-recommends thunar-archive-plugin && \
    apt-get install -y xarchiver && \
    apt-get install -y --no-install-recommends sqlitebrowser && \
    apt-get install -y --no-install-recommends nautilus gvfs-backends && \
    apt-get install -y --no-install-recommends gigolo && \
    apt-get install -y --no-install-recommends gftp && \
    apt-get install -y --no-install-recommends chromium && \
    ln -sf /usr/bin/chromium /usr/bin/google-chrome && \
    clean-layer.sh



RUN \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y --no-install-recommends tigervnc-standalone-server tigervnc-xorg-extension && \
    cd ${RESOURCES_PATH} && \
    mkdir -p ./novnc/utils/websockify && \
    wget -qO- https://github.com/novnc/noVNC/archive/v1.5.0.tar.gz | tar xz --strip 1 -C ./novnc && \
    wget -qO- https://github.com/novnc/websockify/archive/v0.12.0.tar.gz | tar xz --strip 1 -C ./novnc/utils/websockify && \
    chmod +x -v ./novnc/utils/novnc_proxy && \
    mkdir -p $HOME/.vnc && \
    fix-permissions.sh ${RESOURCES_PATH} && \
    clean-layer.sh

ARG WORKSPACE_FLAVOR="full"
ENV WORKSPACE_FLAVOR=${WORKSPACE_FLAVOR}

COPY resources/tools/vs-code-server.sh $RESOURCES_PATH/tools/vs-code-server.sh
RUN /bin/bash $RESOURCES_PATH/tools/vs-code-server.sh --install && clean-layer.sh

COPY resources/tools/ungit.sh $RESOURCES_PATH/tools/ungit.sh
RUN /bin/bash $RESOURCES_PATH/tools/ungit.sh --install && clean-layer.sh

COPY resources/tools/netdata.sh $RESOURCES_PATH/tools/netdata.sh
RUN /bin/bash $RESOURCES_PATH/tools/netdata.sh --install && clean-layer.sh

COPY resources/tools/filebrowser.sh $RESOURCES_PATH/tools/filebrowser.sh
RUN /bin/bash $RESOURCES_PATH/tools/filebrowser.sh --install && clean-layer.sh

COPY resources/tools/vs-code-desktop.sh $RESOURCES_PATH/tools/vs-code-desktop.sh
RUN \
    if [ "$WORKSPACE_FLAVOR" = "minimal" ]; then exit 0; fi && \
    /bin/bash $RESOURCES_PATH/tools/vs-code-desktop.sh --install && \
    clean-layer.sh

COPY resources/tools/firefox.sh $RESOURCES_PATH/tools/firefox.sh
RUN \
    if [ "$WORKSPACE_FLAVOR" = "minimal" ]; then exit 0; fi && \
    /bin/bash $RESOURCES_PATH/tools/firefox.sh --install && \
    clean-layer.sh
