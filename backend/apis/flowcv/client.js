import axios from 'axios';
import { FLOWCV_API_BASE } from './config.js';

/**
 * Axios instance for https://app.flowcv.com/api (paths are relative to this base).
 * Pass auth / custom headers via createFlowCvClient({ headers }).
 */
export function createFlowCvClient(options = {}) {
  const { headers = {}, timeout = 60000, baseURL = FLOWCV_API_BASE } = options;

  return axios.create({
    baseURL: baseURL.replace(/\/$/, ''),
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
  });
}

/**
 * Low-level helper: POST/PATCH/etc. to a path under the FlowCV API base.
 * @param {string} method
 * @param {string} path - e.g. "resume/import" (no leading slash required)
 * @param {{ body?: object, headers?: object, client?: import('axios').AxiosInstance }} [opts]
 */
export async function flowCvRequest(method, path, opts = {}) {
  const { body, headers = {}, client } = opts;
  const c = client || createFlowCvClient();
  const url = String(path || '').replace(/^\//, '');
  return c.request({
    method: method.toUpperCase(),
    url,
    data: body,
    headers: { ...headers },
  });
}
