import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the server extension
 *
 * @param endPoint API REST end point for the extension
 * @param serverSettings The server settings to use for the request
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint: string,
  serverSettings: ServerConnection.ISettings,
  init: RequestInit = {}
): Promise<T> {
  // Split off query string before joining path components, since URLExt.join
  // normalizes paths and would mangle query parameters.
  const queryIndex = endPoint.indexOf('?');
  const pathPart = queryIndex >= 0 ? endPoint.substring(0, queryIndex) : endPoint;
  const queryPart = queryIndex >= 0 ? endPoint.substring(queryIndex) : '';

  const requestUrl =
    URLExt.join(
      serverSettings.baseUrl,
      'jupyterTooling', // our server extension's API namespace
      pathPart
    ) + queryPart;

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(
      requestUrl,
      init,
      serverSettings
    );
  } catch (error) {
    throw new ServerConnection.NetworkError(
      error instanceof Error ? error : new Error(String(error))
    );
  }

  const text = await response.text();

  let data: T | undefined;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as T;
    } catch (parseError) {
      console.warn('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    const errorDetail =
      data !== undefined &&
      typeof data === 'object' &&
      data !== null &&
      'message' in data
        ? String((data as Record<string, unknown>).message)
        : text;
    throw new ServerConnection.ResponseError(response, errorDetail);
  }

  return data as T;
}