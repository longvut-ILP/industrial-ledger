import { companyFromToken } from './_auth.js';
import { exchangeCode, saveTokens, setCompanyName, qboFetch, MINOR } from './_qbo.js';

// /api/qbo-callback — Intuit redirects the user here after they approve access.
// Query carries: code, realmId (the QuickBooks company file id), state (our token).
export default async function handler(req, res) {
  try {
    const { code, realmId, state, error } = req.query;
    if (error) {
      return res.status(400).send('QuickBooks authorization was cancelled.');
    }
    const company = companyFromToken((state || '').toString());
    if (!company) {
      return res.status(401).send('Session expired. Please reconnect from Field2Bill.');
    }
    if (!code || !realmId) {
      return res.status(400).send('Missing authorization code from QuickBooks.');
    }

    const tokens = await exchangeCode(code.toString());
    await saveTokens(company, realmId.toString(), tokens, null);

    // Look up the company name for display (best-effort).
    try {
      const info = await qboFetch(company, `companyinfo/${realmId}?minorversion=${MINOR}`);
      const name = info && info.CompanyInfo && info.CompanyInfo.CompanyName;
      if (name) await setCompanyName(company, name);
    } catch (e) { /* non-fatal — connection still works */ }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!doctype html>
<meta charset="utf-8">
<title>QuickBooks connected</title>
<body style="font:16px -apple-system,system-ui,sans-serif;color:#0c1322;padding:48px;max-width:520px;margin:auto;text-align:center;">
  <div style="width:56px;height:56px;border-radius:16px;background:#2ca01c;color:#fff;font:700 26px sans-serif;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">$</div>
  <h2 style="margin:0 0 8px;">QuickBooks connected</h2>
  <p style="color:#5b6473;margin:0 0 20px;">Field2Bill can now create invoices in your QuickBooks company. You can close this window.</p>
  <button onclick="window.close()" style="padding:10px 20px;border:none;border-radius:9px;background:#2f6bff;color:#fff;font:600 14px sans-serif;cursor:pointer;">Close</button>
  <script>
    try {
      if (window.opener) { window.opener.postMessage({ type: 'qbo-connected' }, '*'); setTimeout(function(){ window.close(); }, 900); }
      else { location.replace('/Field2Bill-App.html'); }
    } catch (e) { location.replace('/Field2Bill-App.html'); }
  </script>
</body>`);
  } catch (e) {
    res.status(500).send('QuickBooks connection failed: ' + e.message);
  }
}
