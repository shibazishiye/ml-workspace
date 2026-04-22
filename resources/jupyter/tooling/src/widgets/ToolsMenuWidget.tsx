import * as React from 'react';
import { ReactWidget } from '@jupyterlab/ui-components';
import { ServerConnection } from '@jupyterlab/services';
import { fetchTools, Tool } from '../api';

/**
 * React component for the tools dropdown menu.
 */
function ToolsMenuComponent(props: {
  serverSettings: ServerConnection.ISettings;
}): React.ReactElement {
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchTools(props.serverSettings)
      .then(result => {
        if (!cancelled) {
          setTools(result);
        }
      })
      .catch(err => {
        console.error('Failed to load tools:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.serverSettings]);

  const handleToolSelect = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedTool = tools.find(t => t.name === e.target.value);
    if (selectedTool && selectedTool.url_path) {
      window.open(selectedTool.url_path, '_blank');
    }
    // Reset dropdown to default after selection
    e.target.value = '';
  };

  if (loading) {
    return (
      <span className="jp-jupyterTooling-loading">Loading tools...</span>
    );
  }

  if (tools.length === 0) {
    return (
      <span className="jp-jupyterTooling-no-tools">No tools available</span>
    );
  }

  return (
    <select className="jp-jupyterTooling-dropdown" onChange={handleToolSelect}>
      <option value="">Open Tool</option>
      {tools.map(tool => (
        <option key={tool.id} value={tool.name} title={tool.description}>
          {tool.name}
        </option>
      ))}
    </select>
  );
}

/**
 * A Lumino widget wrapping the React tools menu component.
 */
export class ToolsMenuWidget extends ReactWidget {
  constructor(serverSettings: ServerConnection.ISettings) {
    super();
    this._serverSettings = serverSettings;
    this.addClass('jp-jupyterTooling-tools-menu');
  }

  render(): React.ReactElement {
    return <ToolsMenuComponent serverSettings={this._serverSettings} />;
  }

  private _serverSettings: ServerConnection.ISettings;
}