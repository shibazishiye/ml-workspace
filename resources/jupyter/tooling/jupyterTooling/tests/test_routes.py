import json

import pytest
from tornado.httpclient import HTTPClientError


async def test_tools_endpoint(jp_fetch):
    response = await jp_fetch("jupyterTooling", "tools")
    assert response.code == 200
    payload = json.loads(response.body)
    assert isinstance(payload, list)


async def test_git_info_endpoint(jp_fetch):
    response = await jp_fetch("jupyterTooling", "git", "info")
    assert response.code == 200
    payload = json.loads(response.body)
    assert "userName" in payload
    assert "userEmail" in payload


async def test_storage_check_endpoint(jp_fetch):
    response = await jp_fetch("jupyterTooling", "storage", "check")
    assert response.code == 200
    payload = json.loads(response.body)
    assert "workspaceFolderSizeWarning" in payload
    assert "containerSizeWarning" in payload


async def test_git_commit_without_body(jp_fetch):
    with pytest.raises(HTTPClientError) as exc_info:
        await jp_fetch(
            "jupyterTooling", "git", "commit",
            method="POST",
            body=""
        )
    assert exc_info.value.code == 400


async def test_git_commit_missing_filepath(jp_fetch):
    with pytest.raises(HTTPClientError) as exc_info:
        await jp_fetch(
            "jupyterTooling", "git", "commit",
            method="POST",
            body=json.dumps({})
        )
    assert exc_info.value.code == 400