import * as React from 'react';
import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { fetchGitInfo, commitFile, GitInfo } from '../api';
import { notifySuccess, notifyError } from '../commands';

/**
 * React component for the commit dialog body.
 * Matches the old extension layout: commit message textarea on the left (50%),
 * git info on the right (50%) with Ungit link, styled in gray.
 */
function CommitDialogBody(props: {
  filePath: string;
  gitInfo: GitInfo;
  baseUrl: string;
}): React.ReactElement {
  const { gitInfo, baseUrl } = props;
  const repoRoot = gitInfo.repoRoot || '/workspace';
  const ungitPath =
    baseUrl + 'tools/ungit/#/repository?path=' + encodeURIComponent(repoRoot);

  const lastCommit = gitInfo.lastCommit || ' ';
  const activeBranch = gitInfo.activeBranch || ' ';
  const userEmail = gitInfo.userEmail || ' ';
  const userName = gitInfo.userName || ' ';

  return (
    <div className="jp-jupyterTooling-commit-dialog">
      <div className="jp-jupyterTooling-commit-flex">
        <div className="jp-jupyterTooling-commit-left">
          <span>Commit message: </span>
          <textarea
            id="jp-jupyterTooling-commit-msg-input"
            className="jp-jupyterTooling-commit-msg"
            rows={4}
            cols={40}
            defaultValue=""
          />
        </div>
        <div className="jp-jupyterTooling-commit-right">
          <a
            className="jp-jupyterTooling-ungit-link"
            target="_blank"
            rel="noopener noreferrer"
            href={ungitPath}
          >
            Ungit
          </a>
          <br />
          <div className="jp-jupyterTooling-commit-info-row">
            <label className="jp-jupyterTooling-commit-info-label">
              Last Commit:
            </label>
            <span>{lastCommit}</span>
          </div>
          <div className="jp-jupyterTooling-commit-info-row">
            <label className="jp-jupyterTooling-commit-info-label">
              Push to Branch:
            </label>
            <span>{activeBranch}</span>
          </div>
          <div className="jp-jupyterTooling-commit-info-row">
            <label className="jp-jupyterTooling-commit-info-label">
              Configured email:
            </label>
            <span>{userEmail}</span>
          </div>
          <div className="jp-jupyterTooling-commit-info-row">
            <label className="jp-jupyterTooling-commit-info-label">
              Configured name:
            </label>
            <span>{userName}</span>
          </div>
        </div>
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

  if (!gitInfo.repoRoot) {
    await showErrorMessage(
      'An issue with git occurred',
      'This file is not in a valid git repository.'
    );
    return;
  }

  if (!gitInfo.userName || !gitInfo.userEmail) {
    await showErrorMessage(
      'Git Configuration Required',
      'Please configure git user.name and user.email before committing.\n' +
        'Run: git config --global user.name "YOUR NAME"\n' +
        'Run: git config --global user.email "YOUR EMAIL"'
    );
    return;
  }

  const baseUrl = serverSettings.baseUrl;

  const result = await showDialog({
    title: 'Commit and push this notebook',
    body: (
      <CommitDialogBody
        filePath={filePath}
        gitInfo={gitInfo}
        baseUrl={baseUrl}
      />
    ),
    buttons: [
      Dialog.cancelButton({ label: 'Close' }),
      Dialog.okButton({ label: 'Commit & Push' })
    ]
  });

  if (result.button.label !== 'Commit & Push') {
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
    notifySuccess(`Push Successful: ${filePath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notifyError(`Commit failed: ${msg}`);
  }
}
