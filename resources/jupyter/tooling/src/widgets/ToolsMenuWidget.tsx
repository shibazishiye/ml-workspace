import * as React from 'react';
import { ReactWidget } from '@jupyterlab/ui-components';
import { ServerConnection } from '@jupyterlab/services';
import { fetchTools, Tool } from '../api';

/**
 * React component for the tools dropdown menu.
 * Matches the old extension's "Open Tool" button+dropdown style with
 * tool name and description shown in each menu item.
 */
function ToolsMenuComponent(props: {
  serverSettings: ServerConnection.ISettings;
}): React.ReactElement {
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (): void => {
    setOpen(!open);
  };

  const handleToolClick = (tool: Tool): void => {
    if (tool.url_path) {
      window.open(tool.url_path, '_blank');
    }
    setOpen(false);
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
    <div
      ref={containerRef}
      className="jp-jupyterTooling-btn-group"
    >
      <button
        className="jp-jupyterTooling-dropdown-toggle"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span>Open Tool</span>{' '}
        <span className="jp-jupyterTooling-caret" />
      </button>
      {open && (
        <ul className="jp-jupyterTooling-dropdown-menu">
          {tools.map(tool => (
            <li key={tool.id}>
              <a
                role="menuitem"
                tabIndex={-1}
                href={tool.url_path || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => {
                  e.preventDefault();
                  handleToolClick(tool);
                }}
              >
                {tool.name}
                {tool.description && (
                  <span className="jp-jupyterTooling-tool-description">
                    {tool.description}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
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
