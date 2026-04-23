import * as React from 'react';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { checkStorage, StorageCheckResult } from '../api';

/**
 * React component for the storage warning dialog body.
 * Matches the old extension's alert-danger styling with detailed explanatory text,
 * cleanup commands in <code> elements, and cleanup instructions.
 */
function StorageWarningBody(props: {
  result: StorageCheckResult;
}): React.ReactElement {
  const { result } = props;

  return (
    <div className="jp-jupyterTooling-storage-warning">
      <div className="jp-jupyterTooling-alert-danger">
        {result.workspaceFolderSizeWarning && (
          <div>
            <div>
              Size of your /workspace folder:{' '}
              <b>
                {result.workspaceFolderSize ?? '?'} GB /{' '}
                {result.workspaceFolderSizeLimit ?? '?'} GB
              </b>
            </div>
            <br />
            <div className="jp-jupyterTooling-storage-detail">
              You have exceeded the limit of available disk storage assigned to
              your /workspace folder (your working directory). Please delete
              unnecessary files and folders from the /workspace folder.
            </div>
            <br />
          </div>
        )}

        {result.containerSizeWarning && (
          <div>
            <div>
              Size of your workspace container:{' '}
              <b>
                {result.containerSize ?? '?'} GB /{' '}
                {result.containerSizeLimit ?? '?'} GB
              </b>
            </div>
            <br />
            <div className="jp-jupyterTooling-storage-detail">
              You have exceeded the limit of available disk storage assigned to
              your workspace container. Usually, this includes everything stored
              outside of the /workspace folder (working directory). Your
              workspace container might be automatically reset if you do not free
              up storage space. This container reset will remove all files
              outside of the /workspace folder.
            </div>
          </div>
        )}
      </div>

      <div className="jp-jupyterTooling-storage-instructions">
        To find the largest files and directories, we recommend to use the
        terminal with the following command:{' '}
        <code className="jp-jupyterTooling-code">ncdu /</code>. Alternatively,
        you can also use the{' '}
        <code className="jp-jupyterTooling-code">Disk Usage Analyzer</code>{' '}
        application accessible from{' '}
        <code className="jp-jupyterTooling-code">
          Applications &rarr; System
        </code>{' '}
        within the VNC Desktop.
      </div>
    </div>
  );
}

/**
 * Check storage and show a warning dialog if limits are exceeded.
 * Resolves silently if storage is within limits.
 * Matches old extension with "Open VNC for Clean-up" and
 * "Open Terminal for Clean-up" buttons.
 */
export async function showStorageWarningDialog(
  serverSettings: ServerConnection.ISettings
): Promise<void> {
  let result: StorageCheckResult;
  try {
    result = await checkStorage(serverSettings);
  } catch (err) {
    console.error('Storage check failed:', err);
    return;
  }

  if (!result.workspaceFolderSizeWarning && !result.containerSizeWarning) {
    return;
  }

  const baseUrl = serverSettings.baseUrl;

  await showDialog({
    title: 'DISK STORAGE WARNING',
    body: <StorageWarningBody result={result} />,
    buttons: [
      Dialog.createButton({
        label: 'Open VNC for Clean-up',
        displayType: 'default'
      }),
      Dialog.createButton({
        label: 'Open Terminal for Clean-up',
        displayType: 'warn'
      })
    ]
  }).then(dialogResult => {
    if (dialogResult.button.label === 'Open VNC for Clean-up') {
      window.open(baseUrl + 'tools/vnc/?password=vncpassword', '_blank');
    } else if (dialogResult.button.label === 'Open Terminal for Clean-up') {
      window.open(baseUrl + 'terminals/new/cleanup', '_blank');
    }
  });
}
