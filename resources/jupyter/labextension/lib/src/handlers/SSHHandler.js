import { PageConfig } from '@jupyterlab/coreutils';
/**
 * Handler for SSH setup operations
 */
export class SSHHandler {
    /**
     * Get SSH setup command for the workspace
     */
    static async getSetupCommand(originUrl) {
        const response = await fetch(this.baseUrl + 'tooling/ssh/setup-command?origin=' + encodeURIComponent(originUrl), {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to get SSH setup command: ${response.statusText}`);
        }
        return response.text();
    }
    /**
     * Get shareable token for a path
     */
    static async getShareableToken(path) {
        const response = await fetch(this.baseUrl + 'tooling/token?path=' + encodeURIComponent(path), {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to get shareable token: ${response.statusText}`);
        }
        return response.text();
    }
    /**
     * Get shareable file link
     */
    static async getFileLink(originUrl, path) {
        const response = await fetch(this.baseUrl + 'tooling/files/link?origin=' +
            encodeURIComponent(originUrl) +
            '&path=' + encodeURIComponent(path), {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to get file link: ${response.statusText}`);
        }
        return response.text();
    }
}
SSHHandler.baseUrl = PageConfig.getBaseUrl();
