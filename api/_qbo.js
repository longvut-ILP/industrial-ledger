// Field2Bill — shared QuickBooks Online (Intuit) helper.
// Files in /api whose name starts with "_" are NOT routed by Vercel,
// so this is a private module the QBO endpoints import.
//
// Each tenant (company) stores ONE OAuth connection in qbo_tokens, scoped
// by company — so invoices only ever post to that tenant's own QuickBooks
// company file. Access tokens last ~1h and are refreshed automatically;
// refresh tokens last ~100 days.
import { sql } from '@vercel/postgres';

const ENV = (process.env.QBO_ENV || 'production').toLowerCase();
const CLIENT_ID = process.env.QBO_CLIENT_ID || '';
const CLIENT_SECRET = process.env.QBO_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.QBO_REDIRECT_URI || '';
const SCOPE = 'com.intuit.quickbooks.accounting';
const MINOR = '65'; // QBO API minor version

const AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
export const API_BASE =
  ENV === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

// True only when the Intuit app credentials are present in the environment.
export const QBO_CONFIGURED = !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);

function basicAuth() {
  return 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
}

// Step 1 of OAuth: where we send the user to grant access.
export function authorizeUrl(state) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
    state,
  });
  return AUTH_URL + '?' + p.toString();
}

// Step 3: trade the authorization code for tokens.
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!r.ok) throw new Error('Token exchange failed: ' + (await r.text()));
  return r.json();
}

async function refreshAccessToken(refresh_token) {
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!r.ok) throw new Error('Token refresh failed: ' + (await r.text()));
  return r.json();
}

export async function saveTokens(company, realmId, t, companyName) {
  // Refresh a minute early so an in-flight request never uses an expired token.
  const expiresAt = new Date(Date.now() + (Number(t.expires_in || 3600) - 60) * 1000).toISOString();
  await sql`
    INSERT INTO qbo_tokens (company, realm_id, access_token, refresh_token, expires_at, qbo_company_name, updated_at)
    VALUES (${company}, ${realmId}, ${t.access_token}, ${t.refresh_token}, ${expiresAt}, ${companyName || null}, now())
    ON CONFLICT (company) DO UPDATE SET
      realm_id = EXCLUDED.realm_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      qbo_company_name = COALESCE(EXCLUDED.qbo_company_name, qbo_tokens.qbo_company_name),
      updated_at = now()`;
}

export async function setCompanyName(company, name) {
  if (!name) return;
  await sql`UPDATE qbo_tokens SET qbo_company_name = ${name}, updated_at = now() WHERE company = ${company}`;
}

export async function getConnection(company) {
  const { rows } = await sql`SELECT * FROM qbo_tokens WHERE company = ${company} LIMIT 1`;
  return rows[0] || null;
}

export async function clearConnection(company) {
  await sql`DELETE FROM qbo_tokens WHERE company = ${company}`;
}

// Return a valid access token, refreshing it first if it's expired.
async function getValidAccess(company) {
  const conn = await getConnection(company);
  if (!conn) return null;
  let accessToken = conn.access_token;
  if (new Date(conn.expires_at).getTime() <= Date.now()) {
    const t = await refreshAccessToken(conn.refresh_token);
    await saveTokens(company, conn.realm_id, t, conn.qbo_company_name);
    accessToken = t.access_token;
  }
  return { accessToken, realmId: conn.realm_id };
}

// Generic authenticated call to the QuickBooks v3 API for this tenant.
// `path` is everything after /v3/company/<realmId>/ (include the query string).
export async function qboFetch(company, path, { method = 'GET', body } = {}) {
  const v = await getValidAccess(company);
  if (!v) throw new Error('QuickBooks is not connected.');
  const url = `${API_BASE}/v3/company/${v.realmId}/${path}`;
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + v.accessToken,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!r.ok) {
    const fault = json && json.Fault && json.Fault.Error && json.Fault.Error[0];
    const msg = (fault && (fault.Message || fault.Detail)) || text || ('HTTP ' + r.status);
    const err = new Error(msg);
    err.status = r.status;
    err.body = json;
    throw err;
  }
  return json;
}

export { MINOR };
