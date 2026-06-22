import { requireCompany } from './_auth.js';
import { getConnection, QBO_CONFIGURED } from './_qbo.js';

// /api/qbo-status — is THIS tenant connected to QuickBooks? (Bearer token required.)
export default async function handler(req, res) {
  try {
    const company = requireCompany(req, res);
    if (!company) return;
    const conn = await getConnection(company);
    return res.status(200).json({
      configured: QBO_CONFIGURED,
      connected: !!conn,
      companyName: (conn && conn.qbo_company_name) || null,
      realmId: (conn && conn.realm_id) || null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
