import { PageConfig } from '@jupyterlab/coreutils';
/**
 * Handler for getting the list of available tools
 */
export class ToolingHandler {
    /**
     * Get list of available tools from the server
     */
    static async getTools() {
        const response = await fetch(this.baseUrl + 'tooling/tools', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to get tools: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get list of tool installers
     */
    static async getToolInstallers() {
        const response = await fetch(this.baseUrl + 'tooling/tool-installers', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to get tool installers: ${response.statusText}`);
        }
        return response.json();
    }
}
ToolingHandler.baseUrl = PageConfig.getBaseUrl();
