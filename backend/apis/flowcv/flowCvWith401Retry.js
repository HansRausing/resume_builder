import { getFlowCvCookie, refreshFlowCvSession } from './session.js';

/**
 * Run a FlowCV call and retry once on 401 (refresh session).
 * Returns the function result.
 *
 * @template T
 * @param {(cookie: string) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function with401Retry(fn) {
  let cookie = getFlowCvCookie();
  try {
    return await fn(cookie);
  } catch (e) {
    if (e?.statusCode === 401) {
      await refreshFlowCvSession();
      cookie = getFlowCvCookie();
      return await fn(cookie);
    } else {
      throw e;
    }
  }
}
