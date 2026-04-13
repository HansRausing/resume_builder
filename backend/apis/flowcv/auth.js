import axios from 'axios';
import FormData from 'form-data';
import { FLOWCV_API_BASE } from './config.js';
import { FlowCvPaths } from './endpoints.js';
import { cookieHeaderFromSetCookie } from './cookies.js';

/**
 * POST multipart login to FlowCV; returns session cookies for subsequent API calls.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ cookie: string, data: unknown }>}
 */
export async function flowCvLogin(email, password) {
  const form = new FormData();
  form.append('email', email);
  form.append('password', password);

  const base = FLOWCV_API_BASE.replace(/\/$/, '');
  const url = `${base}/${FlowCvPaths.authLogin}`;

  const res = await axios.post(url, form, {
    maxBodyLength: Infinity,
    headers: {
      ...form.getHeaders(),
      Accept: 'application/json',
    },
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const msg =
      res.data?.message ||
      res.data?.error ||
      (typeof res.data === 'string' ? res.data : null) ||
      `FlowCV login failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const cookie = cookieHeaderFromSetCookie(res.headers['set-cookie']);
  if (!cookie) {
    throw new Error('FlowCV login succeeded but no Set-Cookie headers were returned');
  }

  return { cookie, data: res.data };
}
