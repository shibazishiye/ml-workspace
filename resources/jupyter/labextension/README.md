# Jupyter Tooling Extension

Modern JupyterLab extension for ML workspace tooling, converted from the classic notebook nbextension.

## Features

- Tools panel showing available workspace tools (VNC, VS Code, etc.)
- Git integration (commit, push, repository info)
- SSH setup helper
- Storage usage warnings
- File sharing links

## Installation

### Development

```bash
# Install dependencies
cd labextension
npm install

# Build the extension
npm run build

# Install in development mode
jupyter labextension develop . --overwrite
```

### Production

```bash
# Build as prebuilt extension
jupyter labextension build .

# Install the Python package
pip install -e .
```

## Server Extension

The extension includes a Jupyter server component that provides:

- `/tooling/tools` - List available tools
- `/tooling/tool-installers` - List tool installers
- `/tooling/git/info` - Get/set git user info
- `/tooling/git/commit` - Commit files
- `/tooling/storage/check` - Check storage usage
- `/tooling/ssh/setup-command` - Get SSH setup command
- `/tooling/token` - Generate shareable tokens
- `/tooling/files/link` - Generate file sharing links

## License

Apache-2.0