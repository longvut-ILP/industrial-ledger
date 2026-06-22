import { requireCompany } from './_auth.js';
import { clearConnection } from './_qbo.js';

// /api/qbo-disconnect — forget this tenant's QuickBooks connection.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const company = requireCompany(req, res);
  if (!company) return;
  try {
    await clearConnection(company);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
