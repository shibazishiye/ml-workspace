"""
Jupyter Tooling Extension - Server Handler (disabled for frontend-only mode)
"""

# Server extension is disabled - use frontend only
# To re-enable, add proper jupyter_server configuration

def _jupyter_server_extension_paths():
    return []

load_jupyter_server_extension = lambda server_app: None
