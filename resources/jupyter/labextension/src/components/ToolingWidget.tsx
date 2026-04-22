import { ReactWidget } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { GitInfoHandler } from '../handlers/GitInfoHandler';
import { ToolingHandler } from '../handlers/ToolingHandler';
import { SSHHandler } from '../handlers/SSHHandler';
import { JupyterFrontEnd } from '@jupyterlab/application';

export class ToolingWidget extends ReactWidget {
  private _app: JupyterFrontEnd;

  constructor(app: JupyterFrontEnd) {
    super();
    this._app = app;
    this.id = 'jupyter-tooling-panel';
    this.title.label = 'Tools';
    this.title.iconClass = 'fa fa-wrench';

    this.addClass('jp-ToolingWidget');
  }

  render(): React.ReactElement {
    return React.createElement(ToolingPanel, { app: this._app });
  }
}

interface ToolingPanelProps {
  app: JupyterFrontEnd;
}

function ToolingPanel(props: ToolingPanelProps): JSX.Element {
  const [tools, setTools] = React.useState<any[]>([]);
  const [gitInfo, setGitInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [toolList, info] = await Promise.all([
        ToolingHandler.getTools(),
        GitInfoHandler.getInfo('/workspace').catch(() => null)
      ]);
      setTools(toolList);
      setGitInfo(info);
    } catch (err) {
      console.warn('Failed to load tooling data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = (tool: any) => {
    if (tool.url_path) {
      window.open(tool.url_path, '_blank');
    }
  };

  const handleSSHSetup = async () => {
    try {
      const command = await SSHHandler.getSetupCommand(window.location.origin);
      navigator.clipboard.writeText(command);
      alert('SSH command copied to clipboard!');
    } catch (err) {
      alert('Failed to get SSH setup command');
    }
  };

  const handleVSCode = () => {
    window.open('/tools/vscode/?folder=/workspace', '_blank');
  };

  const handleVNC = () => {
    window.open('/tools/vnc/?password=vncpassword', '_blank');
  };

  const handleUngit = () => {
    const path = gitInfo?.repoRoot || '/workspace';
    window.open(`/tools/ungit/#/repository?path=${encodeURIComponent(path)}`, '_blank');
  };

  const buttonStyle: React.CSSProperties = {
    margin: '4px',
    padding: '8px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5'
  };

  if (loading) {
    return React.createElement('div', { style: { padding: '10px' } }, 'Loading tools...');
  }

  return React.createElement('div', { style: { padding: '10px', overflowY: 'auto' } },
    // Applications
    React.createElement('div', { style: { marginBottom: '16px' } },
      React.createElement('h3', { style: { margin: '0 0 8px 0' } }, 'Applications'),
      React.createElement('div', null,
        React.createElement('button', { style: buttonStyle, onClick: handleVSCode },
          React.createElement('span', { className: 'fa fa-code' }), ' VS Code'
        ),
        React.createElement('button', { style: buttonStyle, onClick: handleVNC },
          React.createElement('span', { className: 'fa fa-desktop' }), ' VNC'
        )
      )
    ),
    // Git Info
    gitInfo && React.createElement('div', { style: { marginBottom: '16px' } },
      React.createElement('h3', { style: { margin: '0 0 8px 0' } }, 'Git Repository'),
      React.createElement('div', { style: { fontSize: '12px', color: '#666', marginBottom: '8px' } },
        React.createElement('div', null, React.createElement('strong', null, 'Branch:'), ' ', gitInfo.activeBranch || 'N/A'),
        React.createElement('div', null, React.createElement('strong', null, 'Last Commit:'), ' ', gitInfo.lastCommit || 'N/A'),
        React.createElement('div', null, React.createElement('strong', null, 'User:'), ' ', gitInfo.userName || gitInfo.userEmail || 'Not configured')
      ),
      React.createElement('button', { style: buttonStyle, onClick: handleUngit },
        React.createElement('span', { className: 'fa fa-git' }), ' Open Ungit'
      )
    ),
    // Tools List
    tools.length > 0 && React.createElement('div', { style: { marginBottom: '16px' } },
      React.createElement('h3', { style: { margin: '0 0 8px 0' } }, 'Available Tools'),
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap' } },
        ...tools.map((tool) =>
          React.createElement('button', {
            key: tool.id,
            style: buttonStyle,
            onClick: () => handleToolClick(tool),
            title: tool.description
          }, tool.name)
        )
      )
    ),
    // SSH
    React.createElement('div', null,
      React.createElement('h3', { style: { margin: '0 0 8px 0' } }, 'SSH Access'),
      React.createElement('button', { style: buttonStyle, onClick: handleSSHSetup },
        React.createElement('span', { className: 'fa fa-terminal' }), ' Setup SSH'
      )
    )
  );
}