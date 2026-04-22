"""
Server handlers for the Jupyter tooling extension.
"""

import glob
import json
import os
import subprocess
import threading
import time
from datetime import datetime
from subprocess import call

try:
    import git
except ImportError:
    git = None

from jupyter_server.utils import url_path_join
from tornado import web
from tornado.web import authenticated


HOME = os.getenv("HOME", "/root")
RESOURCES_PATH = os.getenv("RESOURCES_PATH", "/resources")
WORKSPACE_HOME = os.getenv("WORKSPACE_HOME", "/workspace")
WORKSPACE_CONFIG_FOLDER = os.path.join(HOME, ".workspace")

MAX_WORKSPACE_FOLDER_SIZE = os.getenv("MAX_WORKSPACE_FOLDER_SIZE", None)
if MAX_WORKSPACE_FOLDER_SIZE and MAX_WORKSPACE_FOLDER_SIZE.isdigit():
    MAX_WORKSPACE_FOLDER_SIZE = int(MAX_WORKSPACE_FOLDER_SIZE)
else:
    MAX_WORKSPACE_FOLDER_SIZE = None

MAX_CONTAINER_SIZE = os.getenv("MAX_CONTAINER_SIZE", None)
if MAX_CONTAINER_SIZE and MAX_CONTAINER_SIZE.isdigit():
    MAX_CONTAINER_SIZE = int(MAX_CONTAINER_SIZE)
else:
    MAX_CONTAINER_SIZE = None


class BaseHandler(web.RequestHandler):
    """Base handler with common utilities."""

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")

    def get_json_body(self):
        try:
            return json.loads(self.request.body)
        except json.JSONDecodeError:
            return None

    def send_error(self, status_code: int, error_msg: str = None, exception=None):
        self.set_status(status_code)
        error = {"error": error_msg or str(exception) if exception else error_msg}
        self.finish(json.dumps(error))

    def send_data(self, data):
        self.finish(json.dumps(data, sort_keys=True, indent=4))


class ToolingHandler(BaseHandler):
    """Handler for getting available workspace tools."""

    @authenticated
    async def get(self):
        try:
            workspace_tooling_folder = os.path.join(HOME, ".workspace/tools/")
            workspace_tools = []

            for f in sorted(glob.glob(os.path.join(workspace_tooling_folder, "*.json"))):
                try:
                    with open(f, "r") as tool_file:
                        tool_data = json.load(tool_file)
                        if tool_data and isinstance(tool_data, dict):
                            workspace_tools.append(tool_data)
                except Exception:
                    continue

            # Add default VNC tool if no tools found
            if not workspace_tools:
                workspace_tools.append({
                    "id": "vnc-link",
                    "name": "VNC",
                    "url_path": "/tools/vnc/?password=vncpassword",
                    "description": "Desktop GUI for the workspace"
                })

            self.send_data(workspace_tools)
        except Exception as e:
            self.send_error(500, exception=e)


class InstallToolHandler(BaseHandler):
    """Handler for getting tool installers."""

    @authenticated
    async def get(self):
        try:
            workspace_installer_folder = os.path.join(RESOURCES_PATH, "tools/")
            workspace_tool_installers = []

            for f in sorted(glob.glob(os.path.join(workspace_installer_folder, "*.sh"))):
                tool_name = os.path.splitext(os.path.basename(f))[0].strip()
                workspace_tool_installers.append({
                    "name": tool_name,
                    "command": "/bin/bash " + f
                })

            if not workspace_tool_installers:
                workspace_tool_installers.append({
                    "name": "none",
                    "command": "No installers found"
                })

            self.send_data(workspace_tool_installers)
        except Exception as e:
            self.send_error(500, exception=e)


class GitInfoHandler(BaseHandler):
    """Handler for Git operations."""

    @authenticated
    async def get(self):
        try:
            path = self.get_argument("path", "/workspace")
            path = resolve_path(path)
            send_data(self, get_git_info(path))
        except Exception as e:
            self.send_error(500, exception=e)

    @authenticated
    async def post(self):
        try:
            path = self.get_argument("path", "/workspace")
            path = resolve_path(path)
            data = self.get_json_body()

            if not data:
                self.send_error(400, "Please provide valid name and email")
                return

            email = data.get("email", "")
            name = data.get("name", "")

            if not email:
                self.send_error(400, "Please provide valid email")
                return

            if not name:
                self.send_error(400, "Please provide valid name")
                return

            repo = get_repo(path)
            set_user_email(email, repo)
            set_user_name(name, repo)
            self.send_data({"status": "ok"})
        except Exception as e:
            self.send_error(500, exception=e)


class GitCommitHandler(BaseHandler):
    """Handler for git commit operations."""

    @authenticated
    async def post(self):
        try:
            data = self.get_json_body()

            if not data:
                self.send_error(400, "Please provide file path and commit message")
                return

            file_path = data.get("filePath", "")
            if not file_path:
                self.send_error(400, "Please provide file path")
                return

            file_path = resolve_path(file_path)
            commit_msg = data.get("commitMsg", None)

            commit_file(file_path, commit_msg)
            self.send_data({"status": "ok"})
        except Exception as e:
            self.send_error(500, exception=e)


class StorageCheckHandler(BaseHandler):
    """Handler for checking storage usage."""

    CHECK_INTERVAL_MINUTES = 5

    @authenticated
    async def get(self):
        try:
            result = {
                "workspaceFolderSizeWarning": False,
                "containerSizeWarning": False
            }

            if not MAX_WORKSPACE_FOLDER_SIZE and not MAX_CONTAINER_SIZE:
                self.send_data(result)
                return

            minutes_since = get_minutes_since_size_update()
            if minutes_since is not None and minutes_since < self.CHECK_INTERVAL_MINUTES:
                self.send_data(result)
                return

            # Run update in background
            thread = threading.Thread(target=update_workspace_metadata, daemon=True)
            thread.start()

            container_size = get_container_size()
            if MAX_CONTAINER_SIZE and container_size:
                result["containerSize"] = round(container_size, 1)
                result["containerSizeLimit"] = round(MAX_CONTAINER_SIZE)
                result["containerSizeWarning"] = container_size > MAX_CONTAINER_SIZE

            workspace_folder_size = get_workspace_folder_size()
            if MAX_WORKSPACE_FOLDER_SIZE and workspace_folder_size:
                result["workspaceFolderSize"] = round(workspace_folder_size, 1)
                result["workspaceFolderSizeLimit"] = round(MAX_WORKSPACE_FOLDER_SIZE)
                result["workspaceFolderSizeWarning"] = workspace_folder_size > MAX_WORKSPACE_FOLDER_SIZE

            self.send_data(result)
        except Exception as e:
            self.send_error(500, exception=e)


class SSHSetupCommandHandler(BaseHandler):
    """Handler for SSH setup command."""

    @authenticated
    async def get(self):
        try:
            origin = self.get_argument("origin", None)
            if not origin:
                self.send_error(400, "Please provide origin")
                return

            base_url = self.application.settings.get("base_url", "")
            setup_command = self.get_setup_command(origin, base_url)
            self.finish(setup_command)
        except Exception as e:
            self.send_error(500, exception=e)

    def get_setup_command(self, origin: str, base_url: str) -> str:
        # Simplified version - in original code there's more logic
        return f"echo 'SSH setup not configured'"


class SharedTokenHandler(BaseHandler):
    """Handler for generating shareable tokens."""

    @authenticated
    async def get(self):
        try:
            path = self.get_argument("path", None)
            if not path:
                self.send_error(400, "Please provide path")
                return

            path = resolve_path(path)
            token = generate_token(path)
            self.finish(token)
        except Exception as e:
            self.send_error(500, exception=e)


class SharedFilesHandler(BaseHandler):
    """Handler for sharing files."""

    @authenticated
    async def get(self):
        try:
            sharing_enabled = os.environ.get("SHARED_LINKS_ENABLED", "false")
            if sharing_enabled.lower() != "true":
                self.write("Shared links disabled")
                self.set_status(400)
                return

            path = self.get_argument("path", None)
            if not path:
                self.send_error(400, "Please provide path")
                return

            path = resolve_path(path)
            origin = self.get_argument("origin", None)
            if not origin:
                self.send_error(400, "Please provide origin")
                return

            token = generate_token(path)
            base_url = self.application.settings.get("base_url", "/")
            link = origin + base_url + "shared/file/?token=" + token
            self.finish(link)
        except Exception as e:
            self.send_error(500, exception=e)


# --- Helper Functions ---


def resolve_path(path: str) -> str:
    """Resolve path relative to server root."""
    if path and path.startswith("/"):
        path = path[1:]
    server_root = os.path.expanduser(
        self.application.settings.get("server_root_dir", "/workspace")
    )
    return os.path.join(server_root, path) if path else server_root


def get_repo(directory: str):
    """Get git repo for directory."""
    if not git:
        return None
    try:
        return git.Repo(directory, search_parent_directories=True)
    except Exception:
        return None


def set_user_email(email: str, repo=None):
    """Set git user email."""
    if not git:
        return
    if repo:
        repo.config_writer().set_value("user", "email", email).release()
    else:
        subprocess.call(f'git config --global user.email "{email}"', shell=True)


def set_user_name(name: str, repo=None):
    """Set git user name."""
    if not git:
        return
    if repo:
        repo.config_writer().set_value("user", "name", name).release()
    else:
        subprocess.call(f'git config --global user.name "{name}"', shell=True)


def commit_file(file_path: str, commit_msg: str = None, push: bool = True):
    """Commit a file to git."""
    if not git:
        raise Exception("GitPython not installed")

    if not os.path.isfile(file_path):
        raise Exception(f"File does not exist: {file_path}")

    repo = get_repo(os.path.dirname(file_path))
    if not repo:
        raise Exception("No git repo found")

    repo.index.add([file_path])
    if not commit_msg:
        commit_msg = "Updated " + os.path.relpath(file_path, repo.working_dir)

    try:
        repo.git.pull("--ff-only")
    except Exception:
        raise Exception("Repo is not up-to-date")

    repo.git.commit(file_path, m=commit_msg)

    if push:
        try:
            repo.git.push("origin", "HEAD")
        except Exception as e:
            if "could not read Username" in str(e):
                raise Exception("User not authenticated")
            raise


def get_git_info(directory: str):
    """Get git info for directory."""
    repo = get_repo(directory)
    return {
        "userName": get_config_value("user.name", repo),
        "userEmail": get_config_value("user.email", repo),
        "repoRoot": repo.working_dir if repo else None,
        "activeBranch": repo.active_branch.name if repo and repo.active_branch else None,
        "lastCommit": format_commit_date(repo) if repo else None,
        "requestPath": directory,
    }


def get_config_value(key: str, repo=None):
    """Get git config value."""
    try:
        if repo:
            return repo.git.config(key)
        return subprocess.check_output(
            "git config " + key, shell=True
        ).decode().strip()
    except Exception:
        return None


def format_commit_date(repo) -> str:
    """Format last commit date."""
    try:
        return datetime.fromtimestamp(repo.head.commit.committed_date).strftime(
            "%d.%B %Y %H:%M:%S"
        )
    except Exception:
        return None


def generate_token(base_url: str) -> str:
    """Generate shareable token."""
    private_key_path = os.path.join(HOME, ".ssh/id_ed25519")
    if not os.path.exists(private_key_path):
        return "token-not-configured"

    import hashlib

    with open(private_key_path, "r") as f:
        private_key = f.read()

    key_hasher = hashlib.sha1()
    key_hasher.update(private_key.lower().strip().encode())
    key_hash = key_hasher.hexdigest()

    token_hasher = hashlib.sha1()
    token_hasher.update((key_hash + base_url).lower().strip().encode())
    return token_hasher.hexdigest()


# --- Storage Check Functions ---


def update_workspace_metadata():
    """Update workspace metadata."""
    workspace_metadata = {
        "update_timestamp": str(datetime.now()),
        "container_size_in_kb": None,
        "workspace_folder_size_in_kb": None
    }

    try:
        if MAX_CONTAINER_SIZE:
            result = subprocess.check_output(
                ["du", "-sx", "--exclude=/proc", "/"], stderr=subprocess.DEVNULL
            ).split()[0].decode()
            workspace_metadata["container_size_in_kb"] = int(result)
    except Exception:
        pass

    try:
        if MAX_WORKSPACE_FOLDER_SIZE:
            result = subprocess.check_output(
                ["du", "-sx", WORKSPACE_HOME], stderr=subprocess.DEVNULL
            ).split()[0].decode()
            workspace_metadata["workspace_folder_size_in_kb"] = int(result)
    except Exception:
        pass

    os.makedirs(WORKSPACE_CONFIG_FOLDER, exist_ok=True)
    with open(os.path.join(WORKSPACE_CONFIG_FOLDER, "metadata.json"), "w") as f:
        json.dump(workspace_metadata, f, indent=4)


def get_workspace_metadata():
    """Get stored workspace metadata."""
    metadata_file = os.path.join(WORKSPACE_CONFIG_FOLDER, "metadata.json")
    if os.path.isfile(metadata_file):
        try:
            with open(metadata_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def get_container_size() -> float:
    """Get container size in GB."""
    try:
        metadata = get_workspace_metadata()
        return int(metadata.get("container_size_in_kb", 0)) / 1024 / 1024
    except Exception:
        return 0


def get_workspace_folder_size() -> float:
    """Get workspace folder size in GB."""
    try:
        metadata = get_workspace_metadata()
        return int(metadata.get("workspace_folder_size_in_kb", 0)) / 1024 / 1024
    except Exception:
        return 0


def get_minutes_since_size_update() -> int:
    """Get minutes since last size update."""
    try:
        metadata = get_workspace_metadata()
        update_timestamp = metadata.get("update_timestamp")
        if not update_timestamp:
            return None

        updated_date = datetime.strptime(update_timestamp, "%Y-%m-%d %H:%M:%S.%f")
        return ((datetime.now() - updated_date).seconds // 60) % 60
    except Exception:
        return None


# --- Setup Function ---


def setup_handlers(server_app):
    """Register all handlers with the server app."""
    web_app = server_app.web_app
    base_url = web_app.settings.get("base_url", "")
    host_pattern = ".*$"

    handlers = [
        (url_path_join(base_url, "tooling/tools"), ToolingHandler),
        (url_path_join(base_url, "tooling/tool-installers"), InstallToolHandler),
        (url_path_join(base_url, "tooling/git/info"), GitInfoHandler),
        (url_path_join(base_url, "tooling/git/commit"), GitCommitHandler),
        (url_path_join(base_url, "tooling/storage/check"), StorageCheckHandler),
        (url_path_join(base_url, "tooling/ssh/setup-command"), SSHSetupCommandHandler),
        (url_path_join(base_url, "tooling/token"), SharedTokenHandler),
        (url_path_join(base_url, "tooling/files/link"), SharedFilesHandler),
    ]

    web_app.add_handlers(host_pattern, handlers)
    server_app.log.info("Tooling handlers registered")