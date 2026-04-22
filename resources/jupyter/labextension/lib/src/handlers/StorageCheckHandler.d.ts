/**
 * Storage check result interface
 */
export interface StorageCheckResult {
    workspaceFolderSizeWarning?: boolean;
    workspaceFolderSize?: number;
    workspaceFolderSizeLimit?: number;
    containerSizeWarning?: boolean;
    containerSize?: number;
    containerSizeLimit?: number;
}
/**
 * Handler for storage check operations
 */
export declare class StorageCheckHandler {
    private static baseUrl;
    /**
     * Check storage usage
     */
    static check(): Promise<StorageCheckResult>;
    /**
     * Show storage warning dialog
     */
    static showWarning(result: StorageCheckResult): void;
}
