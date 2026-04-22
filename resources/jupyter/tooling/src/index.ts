import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import type { FileBrowser } from '@jupyterlab/filebrowser';
import { ToolbarButton } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { ServerConnection } from '@jupyterlab/services';
import { CommandIDs, registerCommands } from './commands';
import { ToolsMenuWidget } from './widgets/ToolsMenuWidget';
import { showCommitDialog } from './widgets/CommitDialog';
import { showStorageWarningDialog } from './widgets/StorageWarningDialog';

const PLUGIN_ID = 'jupyterTooling:plugin';

/**
 * A notebook widget extension that adds a "Git Commit" toolbar button.
 */
class NotebookCommitButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, DocumentRegistry.IModel>
{
  constructor(private _serverSettings: ServerConnection.ISettings) {}

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDisposable {
    const button = new ToolbarButton({
      label: 'Git Commit',
      className: 'jp-jupyterTooling-toolbar-btn',
      onClick: async () => {
        const filePath = context.path;
        if (filePath) {
          await showCommitDialog(filePath, this._serverSettings);
        }
      },
      tooltip: 'Commit this notebook to git and push'
    });

    panel.toolbar.insertItem(10, 'jupyterTooling-commit', button);
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'A JupyterLab extension for workspace tooling integration.',
  autoStart: true,
  optional: [ISettingRegistry, INotebookTracker, IDefaultFileBrowser],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    notebookTracker: INotebookTracker | null,
    defaultBrowser: FileBrowser | null
  ) => {
    const serverSettings = app.serviceManager.serverSettings;

    // Register commands
    registerCommands(app);

    app.commands.addCommand(CommandIDs.commitDialog, {
      label: 'Commit File',
      caption: 'Commit the selected file to git',
      execute: async (args) => {
        const filePath = args['filePath'] as string | undefined;
        if (filePath) {
          await showCommitDialog(filePath, serverSettings);
        }
      }
    });

    app.commands.addCommand(CommandIDs.storageDialog, {
      label: 'Storage Warning',
      caption: 'Check storage usage and display warnings',
      execute: async () => {
        await showStorageWarningDialog(serverSettings);
      }
    });

    // Add tools dropdown to the top bar area
    const toolsWidget = new ToolsMenuWidget(serverSettings);
    toolsWidget.id = 'jp-jupyterTooling-tools-menu';
    app.shell.add(toolsWidget, 'top', { rank: 1000 });

    // Register notebook toolbar extension
    if (notebookTracker) {
      app.docRegistry.addWidgetExtension(
        'Notebook',
        new NotebookCommitButton(serverSettings)
      );
    }

    // Add git button to file browser toolbar
    if (defaultBrowser) {
      const gitButton = new ToolbarButton({
        label: 'Git Commit',
        className: 'jp-jupyterTooling-filebrowser-btn',
        onClick: async () => {
          const items = Array.from(defaultBrowser.selectedItems());
          if (items.length > 0) {
            await showCommitDialog(items[0].path, serverSettings);
          }
        },
        tooltip: 'Commit selected file to git and push'
      });
      defaultBrowser.toolbar.addItem('jupyterTooling-commit', gitButton);
    }

    // Check storage on startup
    showStorageWarningDialog(serverSettings).catch(err => {
      console.error('Storage check on startup failed:', err);
    });

    // Load settings
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .catch(reason => {
          console.error('Failed to load settings for jupyterTooling.', reason);
        });
    }
  }
};

export default plugin;