import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ReactWidget } from '@jupyterlab/ui-components';
import { ServerConnection } from '@jupyterlab/services';
import { fetchTools, Tool } from '../api';

/**
 * React component for the tools dropdown menu.
 * Matches the old extension's "Open Tool" button+dropdown style with
 * tool name and description shown in each menu item.
 *
 * The dropdown menu is rendered via a React Portal into document.body
 * so it always appears on top of all other elements, regardless of
 * parent overflow or stacking context (e.g. on the /notebooks page).
 */
function ToolsMenuComponent(props: {
  serverSettings: ServerConnection.ISettings;
}): React.ReactElement {
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});

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

  // Close dropdown when clicking outside both the button and the menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close dropdown on scroll or resize so it doesn't float in wrong position
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handleClose = (): void => {
      setOpen(false);
    };
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open]);

  const handleToggle = (): void => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 2,
        right: window.innerWidth - rect.right,
        left: 'auto'
      });
    }
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

  const dropdownMenu = open
    ? ReactDOM.createPortal(
        <ul
          ref={menuRef}
          className="jp-jupyterTooling-dropdown-menu"
          style={menuStyle}
        >
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
        </ul>,
        document.body
      )
    : null;

  return (
    <div className="jp-jupyterTooling-btn-group">
      <button
        ref={buttonRef}
        className="jp-jupyterTooling-dropdown-toggle"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span>Open Tool</span>{' '}
        <span className="jp-jupyterTooling-caret" />
      </button>
      {dropdownMenu}
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
