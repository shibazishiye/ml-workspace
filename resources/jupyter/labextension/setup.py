from setuptools import setup, find_packages
import os

here = os.path.abspath(os.path.dirname(__file__))

# Collect frontend files
labext_files = ["package.json"]
for root, dirs, files in os.walk(os.path.join(here, 'lib', 'src')):
    for f in files:
        labext_files.append(os.path.relpath(os.path.join(root, f), here))
for root, dirs, files in os.walk(os.path.join(here, 'style')):
    for f in files:
        labext_files.append(os.path.relpath(os.path.join(root, f), here))

setup(
    name="jupyter-tooling",
    version="0.1.1",
    description="JupyterLab tooling extension",
    author="ML Workspace Team",
    license="Apache-2.0",
    classifiers=["Framework :: Jupyter :: JupyterLab"],
    packages=find_packages(where="."),
    package_dir={"": "."},
    include_package_data=True,
    python_requires=">=3.8",
    package_data={"jupyter_tooling": ["handlers.py", "__init__.py"]},
    data_files=[("share/jupyter/labextensions/@ml-workspace/tooling-extension", labext_files)],
)