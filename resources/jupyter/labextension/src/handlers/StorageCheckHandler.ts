import { PageConfig } from '@jupyterlab/coreutils';

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
export class StorageCheckHandler {
  private static baseUrl = PageConfig.getBaseUrl();

  /**
   * Check storage usage
   */
  static async check(): Promise<StorageCheckResult> {
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
  static showWarning(result: StorageCheckResult): void {
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