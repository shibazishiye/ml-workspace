import * as React from 'react';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { checkStorage, StorageCheckResult } from '../api';

/**
 * React component for the storage warning dialog body.
 */
function StorageWarningBody(props: {
  result: StorageCheckResult;
}): React.ReactElement {
  const { result } = props;
  const warnings: string[] = [];

  if (result.workspaceFolderSizeWarning) {
    warnings.push(
      `Workspace folder size (${result.workspaceFolderSize ?? '?'} GB) exceeds limit (${result.workspaceFolderSizeLimit ?? '?'} GB).`
    );
  }

  if (result.containerSizeWarning) {
    warnings.push(
      `Container size (${result.containerSize ?? '?'} GB) exceeds limit (${result.containerSizeLimit ?? '?'} GB).`
    );
  }

  return (
    <div className="jp-jupyterTooling-storage-warning">
      <p>Storage usage has exceeded the configured limits.</p>
      <ul>
        {warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
      <p>Please clean up files to free up storage space.</p>
    </div>
  );
}

/**
 * Check storage and show a warning dialog if limits are exceeded.
 * Resolves silently if storage is within limits.
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

  await showDialog({
    title: 'Storage Warning',
    body: <StorageWarningBody result={result} />,
    buttons: [Dialog.okButton()]
  });
}