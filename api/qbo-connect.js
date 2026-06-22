import { companyFromToken } from './_auth.js';
import { authorizeUrl, QBO_CONFIGURED } from './_qbo.js';

// /api/qbo-connect — kicks off the QuickBooks OAuth flow.
// This is a top-level browser navigation (popup), so it can't carry the
// Authorization header. Instead the app passes its signed session token as
// ?token=… ; we validate it, then stash it in the OAuth `state` so the
// callback knows which tenant is connecting.
export default async function handler(req, res) {
  if (!QBO_CONFIGURED) {
    return res
      .status(500)
      .send('QuickBooks is not configured on the server. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET and QBO_REDIRECT_URI.');
  }
  const token = (req.query.token || '').toString();
  const company = companyFromToken(token);
  if (!company) {
    return res.status(401).send('Please sign in to Field2Bill first, then connect QuickBooks.');
  }
  res.setHeader('Location', authorizeUrl(token));
  res.statusCode = 302;
  res.end();
}
