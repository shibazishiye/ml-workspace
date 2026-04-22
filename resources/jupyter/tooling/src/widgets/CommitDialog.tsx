import * as React from 'react';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { fetchGitInfo, commitFile, GitInfo } from '../api';
import { notifySuccess, notifyError } from '../commands';

/**
 * React component for the commit dialog body.
 * Displays git info and a textarea for the commit message.
 */
function CommitDialogBody(props: {
  filePath: string;
  gitInfo: GitInfo;
}): React.ReactElement {
  const { filePath, gitInfo } = props;
  const hasGitConfig = Boolean(gitInfo.userName && gitInfo.userEmail);

  return (
    <div className="jp-jupyterTooling-commit-dialog">
      <p>
        Commit file: <code>{filePath}</code>
      </p>
      <div className="jp-jupyterTooling-git-info">
        <p>User: {gitInfo.userName || 'Not configured'}</p>
        <p>Email: {gitInfo.userEmail || 'Not configured'}</p>
        {gitInfo.activeBranch && <p>Branch: {gitInfo.activeBranch}</p>}
        {gitInfo.lastCommit && <p>Last commit: {gitInfo.lastCommit}</p>}
      </div>
      {!hasGitConfig && (
        <p className="jp-jupyterTooling-warning">
          Please configure git user.name and user.email before committing.
        </p>
      )}
      <div className="jp-jupyterTooling-commit-form">
        <label htmlFor="jp-jupyterTooling-commit-msg-input">
          Commit message:
        </label>
        <textarea
          id="jp-jupyterTooling-commit-msg-input"
          className="jp-jupyterTooling-commit-msg"
          placeholder="Enter commit message (optional)"
          rows={3}
          defaultValue=""
        />
      </div>
    </div>
  );
}

/**
 * Show a git commit dialog. Fetches git info, prompts user for a commit message,
 * then commits and pushes the file.
 */
export async function showCommitDialog(
  filePath: string,
  serverSettings: ServerConnection.ISettings
): Promise<void> {
  let gitInfo: GitInfo;
  try {
    gitInfo = await fetchGitInfo(filePath, serverSettings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await showErrorMessage('Git Info Error', msg);
    return;
  }

  const result = await showDialog({
    title: 'Git Commit & Push',
    body: <CommitDialogBody filePath={filePath} gitInfo={gitInfo} />,
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Commit' })]
  });

  if (result.button.label !== 'Commit') {
    return;
  }

  // Read the commit message from the DOM textarea (uncontrolled component)
  const textarea = document.getElementById(
    'jp-jupyterTooling-commit-msg-input'
  ) as HTMLTextAreaElement | null;
  const commitMsg = textarea?.value || '';

  try {
    await commitFile(
      { filePath, commitMsg: commitMsg || undefined },
      serverSettings
    );
    notifySuccess(`Committed and pushed: ${filePath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notifyError(`Commit failed: ${msg}`);
  }
}