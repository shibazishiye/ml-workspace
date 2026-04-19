# syntax=docker/dockerfile:1

ARG BASE_IMAGE=ml-workspace:jupyter
ARG JUPYTER_IMAGE=ml-workspace:jupyter

FROM $BASE_IMAGE AS base_stage
FROM $JUPYTER_IMAGE AS jupyter_stage

FROM $BASE_IMAGE

USER root

ARG WORKSPACE_FLAVOR="full"
ENV WORKSPACE_FLAVOR=${WORKSPACE_FLAVOR}

COPY --from=jupyter_stage /opt/conda /opt/conda
COPY --from=jupyter_stage /resources /resources
COPY --from=jupyter_stage /root/.local /root/.local
COPY --from=jupyter_stage /opt/node /opt/node

RUN \
    clean-layer.sh

RUN \
    if [ "$WORKSPACE_FLAVOR" = "minimal" ] || [ "$WORKSPACE_FLAVOR" = "light" ]; then \
        clean-layer.sh && \
        exit 0 ; \
    fi && \
    clean-layer.sh

COPY \
    resources/docker-entrypoint.py \
    resources/5xx.html \
    $RESOURCES_PATH/

COPY resources/scripts $RESOURCES_PATH/scripts

COPY resources/branding $RESOURCES_PATH/branding

COPY resources/home/ $HOME/

COPY resources/ssh/ssh_config resources/ssh/sshd_config /etc/ssh/
COPY resources/nginx/nginx.conf /etc/nginx/nginx.conf
COPY resources/config/xrdp.ini /etc/xrdp/xrdp.ini

COPY resources/supervisor/supervisord.conf /etc/supervisor/supervisord.conf
COPY resources/supervisor/programs/ /etc/supervisor/conf.d/

COPY resources/config/90assumeyes /etc/apt/apt.conf.d/

COPY resources/novnc/ $RESOURCES_PATH/novnc/

RUN ln -s $RESOURCES_PATH/novnc/vnc.html $RESOURCES_PATH/novnc/index.html

ENV \
    VNC_PW=vncpassword \
    VNC_RESOLUTION=1600x900 \
    VNC_COL_DEPTH=24

COPY resources/jupyter/tensorboard_notebook_patch.py $CONDA_PYTHON_DIR/site-packages/tensorboard/notebook.py

COPY resources/jupyter/jupyter_notebook_config.py /etc/jupyter/
COPY resources/jupyter/sidebar.jupyterlab-settings $HOME/.jupyter/lab/user-settings/@jupyterlab/application-extension/
COPY resources/jupyter/plugin.jupyterlab-settings $HOME/.jupyter/lab/user-settings/@jupyterlab/extensionmanager-extension/
COPY resources/jupyter/ipython_config.py /etc/ipython/ipython_config.py

# Branding files - skip for now as notebook paths changed in Notebook 7+
# RUN \
#     mkdir -p $RESOURCES_PATH"/filebrowser/img/icons/"

RUN \
    git config --global core.fileMode false && \
    git config --global http.sslVerify false && \
    git config --global credential.helper 'cache --timeout=31540000'

COPY resources/netdata/ /etc/netdata/
COPY resources/netdata/cloud.conf /var/lib/netdata/cloud.d/cloud.conf

RUN \
    MPLBACKEND=Agg python -c "import matplotlib.pyplot" || true && \
    sed -i "s/^.*Matplotlib is building the font cache using fc-list.*$/# Warning removed/g" $CONDA_PYTHON_DIR/site-packages/matplotlib/font_manager.py 2>/dev/null || true

COPY resources/icons $RESOURCES_PATH/icons

RUN \
    echo "[Desktop Entry]\nVersion=1.0\nType=Link\nName=Ungit\nComment=Git Client\nCategories=Development;\nIcon=/resources/icons/ungit-icon.png\nURL=http://localhost:8092/tools/ungit" > /usr/share/applications/ungit.desktop && \
    chmod +x /usr/share/applications/ungit.desktop && \
    echo "[Desktop Entry]\nVersion=1.0\nType=Link\nName=Netdata\nComment=Hardware Monitoring\nCategories=System;Utility;Development;\nIcon=/resources/icons/netdata-icon.png\nURL=http://localhost:8092/tools/netdata" > /usr/share/applications/netdata.desktop && \
    chmod +x /usr/share/applications/netdata.desktop && \
    echo "[Desktop Entry]\nVersion=1.0\nType=Link\nName=Glances\nComment=Hardware Monitoring\nCategories=System;Utility;\nIcon=/resources/icons/glances-icon.png\nURL=http://localhost:8092/tools/glances" > /usr/share/applications/glances.desktop && \
    chmod +x /usr/share/applications/glances.desktop && \
    rm -f /usr/share/applications/xfce4-mail-reader.desktop && \
    rm -f /usr/share/applications/xfce4-session-logout.desktop

COPY resources/tools $RESOURCES_PATH/tools
COPY resources/tests $RESOURCES_PATH/tests
COPY resources/tutorials $RESOURCES_PATH/tutorials
COPY resources/licenses $RESOURCES_PATH/licenses
COPY resources/reports $RESOURCES_PATH/reports

RUN \
    touch $HOME/.ssh/config && \
    chmod -R a+rwx $WORKSPACE_HOME && \
    chmod -R a+rwx $RESOURCES_PATH && \
    chmod -R a+rwx /usr/share/applications/ && \
    ln -s $RESOURCES_PATH/tools/ $HOME/Desktop/Tools 2>/dev/null || true && \
    ln -s $WORKSPACE_HOME $HOME/Desktop/workspace 2>/dev/null || true && \
    chmod a+rwx /usr/local/bin/start-notebook.sh && \
    chmod a+rwx /usr/local/bin/start.sh && \
    chmod a+rwx /usr/local/bin/start-singleuser.sh && \
    chown root:root /tmp && \
    chmod 1777 /tmp && \
    echo 'cd '$WORKSPACE_HOME >> $HOME/.bashrc

ENV KMP_DUPLICATE_LIB_OK="True" \
    KMP_AFFINITY="granularity=fine,compact,1,0" \
    KMP_BLOCKTIME=0 \
    MKL_THREADING_LAYER=GNU \
    ENABLE_IPC=1 \
    PYTHON_PRETTY_ERRORS_ISATTY_ONLY=1 \
    HDF5_USE_FILE_LOCKING=False

ENV CONFIG_BACKUP_ENABLED="true" \
    SHUTDOWN_INACTIVE_KERNELS="false" \
    SHARED_LINKS_ENABLED="true" \
    AUTHENTICATE_VIA_JUPYTER="false" \
    DATA_ENVIRONMENT=$WORKSPACE_HOME"/environment" \
    WORKSPACE_BASE_URL="/" \
    INCLUDE_TUTORIALS="true" \
    WORKSPACE_PORT="8080" \
    SHELL="/usr/bin/zsh" \
    MAX_NUM_THREADS="auto"

ARG ARG_BUILD_DATE="unknown"
ARG ARG_VCS_REF="unknown"
ARG ARG_WORKSPACE_VERSION="unknown"
ENV WORKSPACE_VERSION=$ARG_WORKSPACE_VERSION

LABEL \
    "maintainer"="mltooling.team@gmail.com" \
    "workspace.version"=$WORKSPACE_VERSION \
    "workspace.flavor"=$WORKSPACE_FLAVOR \
    "io.k8s.description"="All-in-one web-based development environment for machine learning." \
    "io.k8s.display-name"="Machine Learning Workspace" \
    "io.openshift.expose-services"="8080:http, 5901:xvnc" \
    "io.openshift.non-scalable"="true" \
    "io.openshift.tags"="workspace, machine learning, vnc, ubuntu, xfce" \
    "io.openshift.min-memory"="1Gi" \
    "org.opencontainers.image.title"="Machine Learning Workspace" \
    "org.opencontainers.image.description"="All-in-one web-based development environment for machine learning." \
    "org.opencontainers.image.documentation"="https://github.com/ml-tooling/ml-workspace" \
    "org.opencontainers.image.url"="https://github.com/ml-tooling/ml-workspace" \
    "org.opencontainers.image.source"="https://github.com/ml-tooling/ml-workspace" \
    "org.opencontainers.image.version"=$WORKSPACE_VERSION \
    "org.opencontainers.image.vendor"="ML Tooling" \
    "org.opencontainers.image.authors"="Lukas Masuch & Benjamin Raethlein" \
    "org.opencontainers.image.revision"=$ARG_VCS_REF \
    "org.opencontainers.image.created"=$ARG_BUILD_DATE \
    "org.label-schema.name"="Machine Learning Workspace" \
    "org.label-schema.description"="All-in-one web-based development environment for machine learning." \
    "org.label-schema.usage"="https://github.com/ml-tooling/ml-workspace" \
    "org.label-schema.url"="https://github.com/ml-tooling/ml-workspace" \
    "org.label-schema.vcs-url"="https://github.com/ml-tooling/ml-workspace" \
    "org.label-schema.vendor"="ML Tooling" \
    "org.label-schema.version"=$WORKSPACE_VERSION \
    "org.label-schema.schema-version"="1.0" \
    "org.label-schema.vcs-ref"=$ARG_VCS_REF \
    "org.label-schema.build-date"=$ARG_BUILD_DATE

ENTRYPOINT ["/tini", "-g", "--"]

CMD ["python", "/resources/docker-entrypoint.py"]

EXPOSE 8080
