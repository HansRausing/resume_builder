/**
 * FlowCV credentials and target resume ID.
 *
 * For Vercel: set these in Project Settings → Environment Variables.
 * No `.env` file is required.
 */

export const FLOWCV_RESUME_ID =
  (typeof process !== 'undefined' && process.env.FLOWCV_RESUME_ID?.trim()) ||
  '22ac4d9e-1c84-47b0-9c3e-e0d86fb44a66';

export const FLOWCV_EMAIL =
  (typeof process !== 'undefined' && process.env.FLOWCV_EMAIL?.trim()) || 'andrews0910@outlook.com';

export const FLOWCV_PASSWORD =
  (typeof process !== 'undefined' && process.env.FLOWCV_PASSWORD?.trim()) || 'Cms123!@#';
