import { ReactWidget } from '@jupyterlab/ui-components';
import * as React from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
export declare class ToolingWidget extends ReactWidget {
    private _app;
    constructor(app: JupyterFrontEnd);
    render(): React.ReactElement;
}
