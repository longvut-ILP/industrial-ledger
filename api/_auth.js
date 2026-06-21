// Field2Bill — shared tenant auth helper.
// Files in /api whose name starts with "_" are NOT routed by Vercel,
// so this is a private module the endpoints import.
//
// On login we hand the browser a signed token that encodes the user's
// company. Every later request sends it back as `Authorization: Bearer <token>`.
// The signature (HMAC-SHA256 with a server-only secret) means the browser
// CANNOT change which company it claims to be — so one tenant can never
// read or write another tenant's rows just by editing a header.
import crypto from 'crypto';

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.ADMIN_SECRET ||
  'field2bill-dev-secret-change-me';

function sign(company) {
  return crypto.createHmac('sha256', SECRET).update(company).digest('hex');
}

// Build the token the browser stores after a successful login.
export function makeToken(company) {
  const body = Buffer.from(String(company), 'utf8').toString('base64url');
  return body + '.' + sign(String(company));
}

// Recover the company from a token, or null if it's missing/forged.
export function companyFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  let company;
  try {
    company = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!company) return null;
  const sig = token.slice(dot + 1);
  const expected = sign(company);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return company;
}

export function companyFromReq(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return companyFromToken(token);
}

// Resolve the tenant for this request, or send a 401 and return null.
// Usage at the top of a handler:
//   const company = requireCompany(req, res);
//   if (!company) return;
export function requireCompany(req, res) {
  const company = companyFromReq(req);
  if (!company) {
    res.status(401).json({ error: 'Unauthorized — please sign in again.' });
    return null;
  }
  return company;
}
