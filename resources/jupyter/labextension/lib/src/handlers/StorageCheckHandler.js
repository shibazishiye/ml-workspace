import { PageConfig } from '@jupyterlab/coreutils';
/**
 * Handler for storage check operations
 */
export class StorageCheckHandler {
    /**
     * Check storage usage
     */
    static async check() {
        const response = await fetch(this.baseUrl + 'tooling/storage/check', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to check storage: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Show storage warning dialog
     */
    static showWarning(result) {
        let message = '';
        if (result.workspaceFolderSizeWarning) {
            message += `Workspace folder: ${result.workspaceFolderSize} GB / ${result.workspaceFolderSizeLimit} GB\n`;
        }
        if (result.containerSizeWarning) {
            message += `Container: ${result.containerSize} GB / ${result.containerSizeLimit} GB\n`;
        }
        if (message) {
            alert('DISK STORAGE WARNING\n\n' + message + '\nPlease clean up unnecessary files.');
        }
    }
}
StorageCheckHandler.baseUrl = PageConfig.getBaseUrl();
