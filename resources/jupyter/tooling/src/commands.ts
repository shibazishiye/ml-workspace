import { JupyterFrontEnd } from '@jupyterlab/application';
import { Notification } from '@jupyterlab/apputils';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

export namespace CommandIDs {
  export const openToolsMenu = 'jupyterTooling:open-tools-menu';
  export const commitFile = 'jupyterTooling:commit-file';
  export const commitDialog = 'jupyterTooling:commit-dialog';
  export const checkStorage = 'jupyterTooling:check-storage';
  export const storageDialog = 'jupyterTooling:storage-dialog';
}

export namespace CommandArguments {
  export interface IOpenToolsMenu extends ReadonlyPartialJSONObject {
    toolId?: string;
    toolName?: string;
    urlPath?: string;
  }

  export interface ICommitFile extends ReadonlyPartialJSONObject {
    filePath?: string;
  }
}

/**
 * Register top-level commands that can be invoked from toolbars, menus, etc.
 * Note: commit-dialog and storage-dialog are registered in index.ts because
 * they depend on serverSettings.
 */
export function registerCommands(app: JupyterFrontEnd): void {
  app.commands.addCommand(CommandIDs.openToolsMenu, {
    label: 'Open Tool',
    caption: 'Open a workspace tool',
    execute: (args: ReadonlyPartialJSONObject) => {
      const urlPath = args['urlPath'] as string | undefined;
      if (urlPath) {
        window.open(urlPath, '_blank');
      }
    }
  });

  app.commands.addCommand(CommandIDs.commitFile, {
    label: 'Git Commit & Push',
    caption: 'Commit the selected file to git and push',
    execute: (args: ReadonlyPartialJSONObject) => {
      const filePath = args['filePath'] as string | undefined;
      if (filePath) {
        return app.commands.execute(CommandIDs.commitDialog, {
          filePath
        });
      }
    }
  });

  app.commands.addCommand(CommandIDs.checkStorage, {
    label: 'Check Storage',
    caption: 'Check storage usage',
    execute: () => {
      return app.commands.execute(CommandIDs.storageDialog);
    }
  });
}

/**
 * Show an error notification to the user.
 */
export function notifyError(message: string): void {
  Notification.error(message, { autoClose: 5000 });
}

/**
 * Show a success notification to the user.
 */
export function notifySuccess(message: string): void {
  Notification.success(message, { autoClose: 3000 });
}