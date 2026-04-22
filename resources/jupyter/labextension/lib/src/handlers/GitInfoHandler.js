import { PageConfig } from '@jupyterlab/coreutils';
/**
 * Handler for Git operations
 */
export class GitInfoHandler {
    /**
     * Get Git info for a path
     */
    static async getInfo(path) {
        const response = await fetch(this.baseUrl + 'tooling/git/info?path=' + encodeURIComponent(path), {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to get git info: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Set Git user info (name/email)
     */
    static async setUserInfo(path, name, email) {
        const response = await fetch(this.baseUrl + 'tooling/git/info?path=' + encodeURIComponent(path), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ name, email })
        });
        if (!response.ok) {
            throw new Error(`Failed to set git info: ${response.statusText}`);
        }
    }
    /**
     * Commit a file
     */
    static async commitFile(filePath, commitMsg) {
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
GitInfoHandler.baseUrl = PageConfig.getBaseUrl();
