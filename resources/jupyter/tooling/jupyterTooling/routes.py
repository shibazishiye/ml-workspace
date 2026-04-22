import glob
import json
import logging
import os
import subprocess
import threading
import time
from datetime import datetime

import git
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado import web

SHARED_SSH_SETUP_PATH = "/shared/ssh/setup"
HOME = os.getenv("HOME", "/root")
RESOURCES_PATH = os.getenv("RESOURCES_PATH", "/resources")
WORKSPACE_HOME = os.getenv("WORKSPACE_HOME", "/workspace")
WORKSPACE_CONFIG_FOLDER = os.path.join(HOME, ".workspace")

MAX_WORKSPACE_FOLDER_SIZE = os.getenv("MAX_WORKSPACE_FOLDER_SIZE", None)
if MAX_WORKSPACE_FOLDER_SIZE and MAX_WORKSPACE_FOLDER_SIZE.isnumeric():
    MAX_WORKSPACE_FOLDER_SIZE = int(MAX_WORKSPACE_FOLDER_SIZE)
else:
    MAX_WORKSPACE_FOLDER_SIZE = None

MAX_CONTAINER_SIZE = os.getenv("MAX_CONTAINER_SIZE", None)
if MAX_CONTAINER_SIZE and MAX_CONTAINER_SIZE.isnumeric():
    MAX_CONTAINER_SIZE = int(MAX_CONTAINER_SIZE)
else:
    MAX_CONTAINER_SIZE = None

web_app = None
log = logging.getLogger(__name__)


def _get_server_root() -> str:
    return os.path.expanduser(web_app.settings["server_root_dir"])


def _resolve_path(path: str):
    if path:
        if path.startswith("/"):
            path = path[1:]
        return os.path.join(_get_server_root(), path)
    return None


def handle_error(handler, status_code: int, error_msg: str = None, exception=None):
    handler.set_status(status_code)
    if not error_msg:
        error_msg = ""
    if exception:
        if error_msg:
            error_msg += "\nException: "
        error_msg += str(exception)
    error = {"error": error_msg}
    handler.finish(json.dumps(error))
    log.info("An error occurred (%d): %s", status_code, error_msg)


def send_data(handler, data):
    handler.finish(json.dumps(data, sort_keys=True, indent=4))


class ToolingHandler(APIHandler):
    @web.authenticated
    def get(self):
        try:
            workspace_tooling_folder = os.path.join(HOME, ".workspace/tools/")
            workspace_tools = []

            def tool_is_duplicated(tool_array, tool):
                for t in tool_array:
                    if "id" in t and "id" in tool and tool["id"] == t["id"]:
                        return True
                return False

            for f in sorted(glob.glob(os.path.join(workspace_tooling_folder, "*.json"))):
                try:
                    with open(f, "rb") as tool_file:
                        tool_data = json.load(tool_file)
                        if not tool_data:
                            continue
                        if isinstance(tool_data, dict):
                            if not tool_is_duplicated(workspace_tools, tool_data):
                                workspace_tools.append(tool_data)
                        else:
                            for tool in tool_data:
                                if not tool_is_duplicated(workspace_tools, tool):
                                    workspace_tools.append(tool)
                except Exception:
                    log.warning("Failed to load tools file: %s", f)
                    continue

            if not workspace_tools:
                workspace_tools.append({
                    "id": "vnc-link",
                    "name": "VNC",
                    "url_path": "/tools/vnc/?password=vncpassword",
                    "description": "Desktop GUI for the workspace",
                })
            self.finish(json.dumps(workspace_tools))
        except Exception as ex:
            handle_error(self, 500, exception=ex)


class GitInfoHandler(APIHandler):
    @web.authenticated
    def get(self):
        try:
            path = _resolve_path(self.get_argument("path", None))
            send_data(self, get_git_info(path))
        except Exception as ex:
            handle_error(self, 500, exception=ex)

    @web.authenticated
    def post(self):
        path = _resolve_path(self.get_argument("path", None))
        data = self.get_json_body()

        if data is None:
            handle_error(self, 400, "Please provide a valid name and email in body.")
            return

        if "email" not in data or not data["email"]:
            handle_error(self, 400, "Please provide a valid email.")
            return

        email = data["email"]

        if "name" not in data or not data["name"]:
            handle_error(self, 400, "Please provide a valid name.")
            return

        name = data["name"]

        try:
            repo = get_repo(path)
            set_user_email(email, repo)
            set_user_name(name, repo)
            self.finish(json.dumps({"status": "success"}))
        except Exception as ex:
            handle_error(self, 500, exception=ex)


class GitCommitHandler(APIHandler):
    @web.authenticated
    def post(self):
        data = self.get_json_body()

        if data is None:
            handle_error(self, 400, "Please provide a valid file path and commit msg in body.")
            return

        if "filePath" not in data or not data["filePath"]:
            handle_error(self, 400, "Please provide a valid filePath in body.")
            return

        file_path = _resolve_path(data["filePath"])

        commit_msg = data.get("commitMsg", None)

        try:
            commit_file(file_path, commit_msg)
            self.finish(json.dumps({"status": "success"}))
        except Exception as ex:
            handle_error(self, 500, exception=ex)


class StorageCheckHandler(APIHandler):
    @web.authenticated
    def get(self):
        try:
            CHECK_INTERVAL_MINUTES = 5

            result = {
                "workspaceFolderSizeWarning": False,
                "containerSizeWarning": False
            }

            if not MAX_WORKSPACE_FOLDER_SIZE and not MAX_CONTAINER_SIZE:
                self.finish(json.dumps(result))
                return

            minutes_since_update = get_minutes_since_size_update()
            if minutes_since_update is not None and minutes_since_update < CHECK_INTERVAL_MINUTES:
                self.finish(json.dumps(result))
                return

            thread = threading.Thread(target=update_workspace_metadata)
            thread.daemon = True
            thread.start()

            container_size_in_gb = get_container_size()

            if MAX_CONTAINER_SIZE:
                if container_size_in_gb > MAX_CONTAINER_SIZE:
                    time.sleep(0.050)
                    container_size_in_gb = get_container_size()
                result["containerSize"] = round(container_size_in_gb, 1)
                result["containerSizeLimit"] = round(MAX_CONTAINER_SIZE)

                if container_size_in_gb > MAX_CONTAINER_SIZE:
                    result["containerSizeWarning"] = True
                    log.info("Container size limit exceeded.")
                else:
                    result["containerSizeWarning"] = False

            workspace_folder_size_in_gb = get_workspace_folder_size()

            if MAX_WORKSPACE_FOLDER_SIZE:
                if workspace_folder_size_in_gb > MAX_WORKSPACE_FOLDER_SIZE:
                    time.sleep(0.050)
                    workspace_folder_size_in_gb = get_workspace_folder_size()
                result["workspaceFolderSize"] = round(workspace_folder_size_in_gb, 1)
                result["workspaceFolderSizeLimit"] = round(MAX_WORKSPACE_FOLDER_SIZE)

                if workspace_folder_size_in_gb > MAX_WORKSPACE_FOLDER_SIZE:
                    result["workspaceFolderSizeWarning"] = True
                    log.info("Workspace folder size limit exceeded.")
                else:
                    result["workspaceFolderSizeWarning"] = False

            self.finish(json.dumps(result))

        except Exception as ex:
            handle_error(self, 500, exception=ex)


class SharedSSHHandler(APIHandler):
    def get(self):
        try:
            sharing_enabled = os.environ.get("SHARED_LINKS_ENABLED", "false")
            if sharing_enabled.lower() != "true":
                handle_error(
                    self,
                    401,
                    error_msg="Shared links are disabled.",
                )
                return

            token = self.get_argument("token", None)
            valid_token = generate_token(self.request.path)
            if not token:
                self.set_status(401)
                self.finish('echo "Please provide a token via get parameter."')
                return
            if token.lower().strip() != valid_token:
                self.set_status(401)
                self.finish('echo "The provided token is not valid."')
                return

            handle_ssh_script_request(self)
        except Exception as ex:
            handle_error(self, 500, exception=ex)


def get_repo(directory: str):
    if not directory:
        return None
    try:
        return git.Repo(directory, search_parent_directories=True)
    except Exception:
        return None


def set_user_email(email: str, repo=None):
    if repo:
        repo.config_writer().set_value("user", "email", email).release()
    else:
        subprocess.call(f'git config --global user.email "{email}"', shell=True)


def set_user_name(name: str, repo=None):
    if repo:
        repo.config_writer().set_value("user", "name", name).release()
    else:
        subprocess.call(f'git config --global user.name "{name}"', shell=True)


def get_config_value(key: str, repo=None):
    try:
        if repo:
            return repo.git.config(key)
        return subprocess.check_output(f"git config {key}", shell=True).decode("utf-8").strip()
    except Exception:
        return None


def get_user_name(repo=None):
    return get_config_value("user.name", repo)


def get_user_email(repo=None):
    return get_config_value("user.email", repo)


def get_active_branch(repo):
    try:
        return repo.active_branch.name
    except Exception:
        return None


def get_last_commit(repo):
    try:
        return datetime.fromtimestamp(repo.head.commit.committed_date).strftime(
            "%d.%B %Y %I:%M:%S"
        )
    except Exception:
        return None


def get_git_info(directory: str):
    repo = get_repo(directory)
    git_info = {
        "userName": get_user_name(repo),
        "userEmail": get_user_email(repo),
        "repoRoot": repo.working_dir if repo else None,
        "activeBranch": get_active_branch(repo) if repo else None,
        "lastCommit": get_last_commit(repo) if repo else None,
        "requestPath": directory,
    }
    return git_info


def commit_file(file_path: str, commit_msg: str = None, push: bool = True):
    if not os.path.isfile(file_path):
        raise Exception(f"File does not exist: {file_path}")

    repo = get_repo(os.path.dirname(file_path))
    if not repo:
        raise Exception(f"No git repo was found for file: {file_path}")

    repo.index.add([file_path])

    if not get_user_name(repo):
        raise Exception('Cannot push to remote. Please specify a name with: git config --global user.name "YOUR NAME"')

    if not get_user_email(repo):
        raise Exception('Cannot push to remote. Please specify an email with: git config --global user.email "YOUR EMAIL"')

    if not commit_msg:
        commit_msg = "Updated " + os.path.relpath(file_path, repo.working_dir)

    try:
        repo.git.pull("--ff-only")
    except Exception:
        raise Exception("The repo is not up-to-date or cannot be updated.")

    try:
        repo.git.commit(file_path, m=commit_msg)
    except git.GitCommandError as error:
        if error.stdout and ("branch is up-to-date" in error.stdout or "branch is up to date" in error.stdout):
            raise Exception(f"File has not been changed: {file_path}")
        else:
            raise error

    if push:
        try:
            repo.git.push("origin", "HEAD")
        except git.GitCommandError as error:
            if error.stderr and "could not read Username" in error.stderr:
                raise Exception("User is not authenticated. Please login via HTTPS or SSH.")
            else:
                raise error


def update_workspace_metadata():
    workspace_metadata = {
        "update_timestamp": str(datetime.now()),
        "container_size_in_kb": None,
        "workspace_folder_size_in_kb": None
    }

    if MAX_CONTAINER_SIZE:
        try:
            workspace_metadata["container_size_in_kb"] = int(
                subprocess.check_output(["du", "-sx", "--exclude=/proc", "/"]).split()[0].decode("utf-8")
            )
        except Exception:
            pass

    if MAX_WORKSPACE_FOLDER_SIZE:
        try:
            workspace_metadata["workspace_folder_size_in_kb"] = int(
                subprocess.check_output(["du", "-sx", WORKSPACE_HOME]).split()[0].decode("utf-8")
            )
        except Exception:
            pass

    if not os.path.exists(WORKSPACE_CONFIG_FOLDER):
        os.makedirs(WORKSPACE_CONFIG_FOLDER)

    with open(os.path.join(WORKSPACE_CONFIG_FOLDER, "metadata.json"), "w") as file:
        json.dump(workspace_metadata, file, sort_keys=True, indent=4)


def get_workspace_metadata():
    workspace_metadata = {}
    metadata_file_path = os.path.join(WORKSPACE_CONFIG_FOLDER, "metadata.json")
    if os.path.isfile(metadata_file_path):
        try:
            with open(metadata_file_path, "rb") as file:
                workspace_metadata = json.load(file)
        except Exception:
            pass
    return workspace_metadata


def get_container_size():
    try:
        workspace_metadata = get_workspace_metadata()
        return int(workspace_metadata["container_size_in_kb"]) / 1024 / 1024
    except Exception:
        return 0


def get_workspace_folder_size():
    try:
        workspace_metadata = get_workspace_metadata()
        return int(workspace_metadata["workspace_folder_size_in_kb"]) / 1024 / 1024
    except Exception:
        return 0


def get_minutes_since_size_update():
    metadata_file_path = os.path.join(WORKSPACE_CONFIG_FOLDER, "metadata.json")
    if os.path.isfile(metadata_file_path):
        try:
            with open(metadata_file_path, "rb") as file:
                workspace_metadata = json.load(file)
                update_timestamp_str = workspace_metadata["update_timestamp"]
                if not update_timestamp_str:
                    return None
                updated_date = datetime.strptime(update_timestamp_str, "%Y-%m-%d %H:%M:%S.%f")
                return ((datetime.now() - updated_date).seconds // 60) % 60
        except Exception:
            return None
    return None


def generate_token(base_url: str):
    private_ssh_key_path = os.path.join(HOME, ".ssh/id_ed25519")
    with open(private_ssh_key_path, "r") as f:
        runtime_private_key = f.read()

    import hashlib
    key_hasher = hashlib.sha1()
    key_hasher.update(str.encode(str(runtime_private_key).lower().strip()))
    key_hash = key_hasher.hexdigest()

    token_hasher = hashlib.sha1()
    token_str = (key_hash + base_url).lower().strip()
    token_hasher.update(str.encode(token_str))
    return str(token_hasher.hexdigest())


def handle_ssh_script_request(handler):
    origin = handler.get_argument("origin", None)
    host = handler.get_argument("host", None)
    port = handler.get_argument("port", None)

    if not host and origin:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        host = parsed.hostname
        port = parsed.port

    if not host:
        handle_error(handler, 400, "Please provide a host via get parameter.")
        return

    if not port:
        handle_error(handler, 400, "Please provide a port via get parameter.")
        return

    setup_script = get_setup_script(host, port)
    handler.finish(setup_script)


def get_setup_script(hostname: str = None, port: str = None):
    private_ssh_key_path = os.path.join(HOME, ".ssh/id_ed25519")
    with open(private_ssh_key_path, "r") as f:
        runtime_private_key = f.read()

    return f"SSH Connection setup for {hostname}:{port}"


def setup_route_handlers(web_app_handle):
    global web_app
    web_app = web_app_handle

    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    route_pattern = url_path_join(base_url, "jupyterTooling", "tools")
    web_app.add_handlers(host_pattern, [(route_pattern, ToolingHandler)])

    route_pattern = url_path_join(base_url, "jupyterTooling", "git", "info")
    web_app.add_handlers(host_pattern, [(route_pattern, GitInfoHandler)])

    route_pattern = url_path_join(base_url, "jupyterTooling", "git", "commit")
    web_app.add_handlers(host_pattern, [(route_pattern, GitCommitHandler)])

    route_pattern = url_path_join(base_url, "jupyterTooling", "storage", "check")
    web_app.add_handlers(host_pattern, [(route_pattern, StorageCheckHandler)])

    route_pattern = url_path_join(base_url, SHARED_SSH_SETUP_PATH)
    web_app.add_handlers(host_pattern, [(route_pattern, SharedSSHHandler)])

    log.info("Extension jupyterTooling loaded successfully.")