/**
 * Handler for getting the list of available tools
 */
export declare class ToolingHandler {
    private static baseUrl;
    /**
     * Get list of available tools from the server
     */
    static getTools(): Promise<Array<{
        id: string;
        name: string;
        url_path?: string;
        description?: string;
    }>>;
    /**
     * Get list of tool installers
     */
    static getToolInstallers(): Promise<Array<{
        name: string;
        command: string;
    }>>;
}
