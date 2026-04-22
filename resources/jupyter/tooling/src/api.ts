import { ServerConnection } from '@jupyterlab/services';
import { requestAPI } from './request';

export interface Tool {
  id: string;
  name: string;
  url_path: string;
  description?: string;
}

export interface GitInfo {
  userName: string | null;
  userEmail: string | null;
  repoRoot: string | null;
  activeBranch: string | null;
  lastCommit: string | null;
  requestPath: string | null;
}

export interface StorageCheckResult {
  workspaceFolderSizeWarning: boolean;
  containerSizeWarning: boolean;
  workspaceFolderSize?: number;
  workspaceFolderSizeLimit?: number;
  containerSize?: number;
  containerSizeLimit?: number;
}

export interface CommitRequest {
  filePath: string;
  commitMsg?: string;
}

export interface GitConfigRequest {
  name: string;
  email: string;
}

export interface ApiError {
  error: string;
}

export async function fetchTools(
  serverSettings: ServerConnection.ISettings
): Promise<Tool[]> {
  try {
    const response = await requestAPI<Tool[]>('tools', serverSettings, {
      method: 'GET'
    });
    return response;
  } catch (err) {
    throw createError(err);
  }
}

export async function fetchGitInfo(
  path: string,
  serverSettings: ServerConnection.ISettings
): Promise<GitInfo> {
  try {
    const response = await requestAPI<GitInfo>(
      `git/info?path=${encodeURIComponent(path)}`,
      serverSettings,
      { method: 'GET' }
    );
    return response;
  } catch (err) {
    throw createError(err);
  }
}

export async function updateGitConfig(
  path: string,
  config: GitConfigRequest,
  serverSettings: ServerConnection.ISettings
): Promise<void> {
  try {
    await requestAPI<{ status: string }>(
      `git/info?path=${encodeURIComponent(path)}`,
      serverSettings,
      {
        method: 'POST',
        body: JSON.stringify(config)
      }
    );
  } catch (err) {
    throw createError(err);
  }
}

export async function commitFile(
  request: CommitRequest,
  serverSettings: ServerConnection.ISettings
): Promise<void> {
  try {
    await requestAPI<{ status: string }>('git/commit', serverSettings, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  } catch (err) {
    throw createError(err);
  }
}

export async function checkStorage(
  serverSettings: ServerConnection.ISettings
): Promise<StorageCheckResult> {
  try {
    const response = await requestAPI<StorageCheckResult>(
      'storage/check',
      serverSettings,
      { method: 'GET' }
    );
    return response;
  } catch (err) {
    throw createError(err);
  }
}

function createError(err: unknown): Error {
  if (err instanceof ServerConnection.ResponseError) {
    const status = err.response.status;
    let detail = err.message;

    if (typeof detail === 'string' &&
        (detail.includes('<!DOCTYPE') || detail.includes('<html'))) {
      detail = `HTML error page (${detail.substring(0, 100)}...)`;
    }

    return new Error(`API request failed (${status}): ${detail}`);
  }

  const msg = err instanceof Error ? err.message : 'Unknown error';
  return new Error(`API request failed: ${msg}`);
}