# syntax=docker/dockerfile:1

FROM ubuntu:24.04

USER root

ARG WORKSPACE_FLAVOR="full"
ENV WORKSPACE_FLAVOR=${WORKSPACE_FLAVOR}

ENV \
    SHELL="/bin/bash" \
    HOME="/root" \
    NB_USER="root" \
    USER_GID=0 \
    XDG_CACHE_HOME="/root/.cache/" \
    XDG_RUNTIME_DIR="/tmp" \
    DISPLAY=":1" \
    TERM="xterm" \
    DEBIAN_FRONTEND="noninteractive" \
    RESOURCES_PATH="/resources" \
    SSL_RESOURCES_PATH="/resources/ssl" \
    WORKSPACE_HOME="/workspace"

WORKDIR $HOME

RUN \
    mkdir $RESOURCES_PATH && chmod a+rwx $RESOURCES_PATH && \
    mkdir $WORKSPACE_HOME && chmod a+rwx $WORKSPACE_HOME && \
    mkdir $SSL_RESOURCES_PATH && chmod a+rwx $SSL_RESOURCES_PATH

COPY resources/scripts/clean-layer.sh /usr/bin/clean-layer.sh
COPY resources/scripts/fix-permissions.sh /usr/bin/fix-permissions.sh

RUN \
    chmod a+rwx /usr/bin/clean-layer.sh && \
    chmod a+rwx /usr/bin/fix-permissions.sh

RUN \
    apt-get update && \
    apt-get install -y locales && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    update-locale LANG=en_US.UTF-8 && \
    clean-layer.sh

ENV LC_ALL="en_US.UTF-8" \
    LANG="en_US.UTF-8" \
    LANGUAGE="en_US:en"

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    rm -f /etc/apt/sources.list && \
    echo "deb http://archive.ubuntu.com/ubuntu/ noble main restricted universe multiverse" > /etc/apt/sources.list && \
    echo "deb http://archive.ubuntu.com/ubuntu/ noble-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
    echo "deb http://security.ubuntu.com/ubuntu/ noble-security main restricted universe multiverse" >> /etc/apt/sources.list && \
    apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
        bash \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        build-essential \
        pkg-config \
        lsof \
        net-tools \
        libcurl4-openssl-dev \
        curl \
        wget \
        cron \
        openssl \
        iproute2 \
        psmisc \
        tmux \
        uuid-dev \
        xclip \
        clinfo \
        time \
        libssl-dev \
        libgdbm-dev \
        libncurses-dev \
        libreadline-dev \
        libedit-dev \
        xz-utils \
        gawk \
        swig \
        graphviz \
        libgraphviz-dev \
        screen \
        nano \
        sqlite3 \
        xmlstarlet \
        parallel \
        libpq-dev \
        libsqlite3-dev \
        git \
        subversion \
        unixodbc \
        unixodbc-dev \
        libtiff-dev \
        libjpeg-dev \
        libpng-dev \
        libglib2.0-dev \
        libxext6 \
        libsm6 \
        libxrender-dev \
        libzmq3-dev \
        protobuf-compiler \
        libprotobuf-dev \
        libprotoc-dev \
        autoconf \
        automake \
        libtool \
        cmake \
        fonts-liberation \
        zip \
        gzip \
        unzip \
        bzip2 \
        libbz2-dev \
        liblzma-dev \
        zlib1g-dev && \
    chmod -R a+rwx /usr/local/bin/ && \
    ldconfig && \
    fix-permissions.sh $HOME && \
    clean-layer.sh

RUN wget --no-verbose https://github.com/krallin/tini/releases/download/v0.19.0/tini -O /tini && \
    chmod +x /tini

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        openssh-client \
        openssh-server \
        sslh \
        autossh && \
    chmod go-w $HOME && \
    mkdir -p $HOME/.ssh/ && \
    touch $HOME/.ssh/config && \
    chown -R $NB_USER:users $HOME/.ssh && \
    chmod 700 $HOME/.ssh && \
    printenv >> $HOME/.ssh/environment && \
    chmod -R a+rwx /usr/local/bin/ && \
    fix-permissions.sh $HOME && \
    clean-layer.sh

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    OPEN_RESTY_VERSION="1.27.1.1" && \
    mkdir $RESOURCES_PATH"/openresty" && \
    cd $RESOURCES_PATH"/openresty" && \
    apt-get update && \
    apt-get purge -y nginx nginx-common && \
    apt-get install -y libssl-dev libpcre3 libpcre3-dev apache2-utils && \
    wget --no-verbose https://openresty.org/download/openresty-$OPEN_RESTY_VERSION.tar.gz -O ./openresty.tar.gz && \
    tar xfz ./openresty.tar.gz && \
    rm ./openresty.tar.gz && \
    cd ./openresty-$OPEN_RESTY_VERSION/ && \
    ./configure --with-http_stub_status_module --with-http_sub_module > /dev/null && \
    make -j$(nproc) > /dev/null && \
    make install > /dev/null && \
    mkdir -p /var/log/nginx/ && \
    touch /var/log/nginx/upstream.log && \
    cd $RESOURCES_PATH && \
    rm -r $RESOURCES_PATH"/openresty" && \
    chmod -R a+rwx $RESOURCES_PATH && \
    clean-layer.sh

ENV PATH=/usr/local/openresty/nginx/sbin:$PATH

COPY resources/nginx/lua-extensions /etc/nginx/nginx_plugins
