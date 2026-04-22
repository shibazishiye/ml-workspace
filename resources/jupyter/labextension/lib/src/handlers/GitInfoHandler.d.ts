/**
 * Handler for Git operations
 */
export declare class GitInfoHandler {
    private static baseUrl;
    /**
     * Get Git info for a path
     */
    static getInfo(path: string): Promise<{
        userName?: string;
        userEmail?: string;
        repoRoot?: string;
        activeBranch?: string;
        lastCommit?: string;
        requestPath: string;
    }>;
    /**
     * Set Git user info (name/email)
     */
    static setUserInfo(path: string, name: string, email: string): Promise<void>;
    /**
     * Commit a file
     */
    static commitFile(filePath: string, commitMsg?: string): Promise<void>;
}
