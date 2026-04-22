/**
 * Handler for SSH setup operations
 */
export declare class SSHHandler {
    private static baseUrl;
    /**
     * Get SSH setup command for the workspace
     */
    static getSetupCommand(originUrl: string): Promise<string>;
    /**
     * Get shareable token for a path
     */
    static getShareableToken(path: string): Promise<string>;
    /**
     * Get shareable file link
     */
    static getFileLink(originUrl: string, path: string): Promise<string>;
}
