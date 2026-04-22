import { ITranslator } from '@jupyterlab/translation';
import { ToolingWidget } from './components/ToolingWidget';
import { StorageCheckHandler } from './handlers/StorageCheckHandler';
const TOOLING_PLUGIN_ID = '@ml-workspace/tooling-extension:plugin';
const toolingPlugin = {
    id: TOOLING_PLUGIN_ID,
    description: 'ML Workspace tooling - tools, git, ssh helpers',
    autoStart: true,
    optional: [ITranslator],
    activate: async (app, translator) => {
        console.info('ML Workspace Tooling Extension activated');
        // Add commands
        app.commands.addCommand('tooling:vscode', {
            label: 'VS Code',
            execute: () => {
                window.open('/tools/vscode/?folder=/workspace', '_blank');
            }
        });
        app.commands.addCommand('tooling:vnc', {
            label: 'VNC Desktop',
            execute: () => {
                window.open('/tools/vnc/?password=vncpassword', '_blank');
            }
        });
        app.commands.addCommand('tooling:ungit', {
            label: 'Ungit (Git UI)',
            execute: () => {
                window.open('/tools/ungit/#/repository?path=/workspace', '_blank');
            }
        });
        app.commands.addCommand('tooling:open-panel', {
            label: 'Tooling Panel',
            execute: () => {
                const widget = new ToolingWidget(app);
                app.shell.add(widget, 'right', { mode: 'split-right' });
                app.shell.activateById(widget.id);
            }
        });
        // Add a simple toolbar button using the IStatusBar if available
        // For now, the commands can be accessed via Command Palette (Ctrl+Shift+C)
        // Check storage on startup (will fail gracefully on Windows)
        try {
            const result = await StorageCheckHandler.check();
            if (result.workspaceFolderSizeWarning || result.containerSizeWarning) {
                StorageCheckHandler.showWarning(result);
            }
        }
        catch (err) {
            // Silent fail - storage check is for Docker workspace
        }
    }
};
export default toolingPlugin;
export { ToolingWidget } from './components/ToolingWidget';
export { ToolingHandler } from './handlers/ToolingHandler';
export { GitInfoHandler } from './handlers/GitInfoHandler';
export { SSHHandler } from './handlers/SSHHandler';
export { StorageCheckHandler } from './handlers/StorageCheckHandler';
