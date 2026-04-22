import { PageConfig } from '@jupyterlab/coreutils';

/**
 * Handler for Git operations
 */
export class GitInfoHandler {
  private static baseUrl = PageConfig.getBaseUrl();

  /**
   * Get Git info for a path
   */
  static async getInfo(path: string): Promise<{
    userName?: string;
    userEmail?: string;
    repoRoot?: string;
    activeBranch?: string;
    lastCommit?: string;
    requestPath: string;
  }> {
    const response = await fetch(
      this.baseUrl + 'tooling/git/info?path=' + encodeURIComponent(path),
      {
        method: 'GET',
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get git info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Set Git user info (name/email)
   */
  static async setUserInfo(
    path: string,
    name: string,
    email: string
  ): Promise<void> {
    const response = await fetch(
      this.baseUrl + 'tooling/git/info?path=' + encodeURIComponent(path),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, email })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to set git info: ${response.statusText}`);
    }
  }

  /**
   * Commit a file
   */
  static async commitFile(
    filePath: string,
    commitMsg?: string
  ): Promise<void> {
    const response = await fetch(this.baseUrl + 'tooling/git/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        filePath,
        commitMsg
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to commit: ${response.statusText}`);
    }
  }
}