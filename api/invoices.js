import { sql } from '@vercel/postgres';
import { requireCompany } from './_auth.js';

// /api/invoices — list generated rental invoices (GET), save one (POST)
// The full invoice record is stored as JSON so the app gets back exactly what
// it saved. All scoped to the signed-in user's company.
export default async function handler(req, res) {
  try {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT data FROM invoices
        WHERE company = ${company} AND data IS NOT NULL ORDER BY id DESC`;
      return res.status(200).json(rows.map(r => r.data));
    }

    if (req.method === 'POST') {
      const rec = req.body || {};
      if (!rec.num) return res.status(400).json({ error: 'num is required' });
      const amount = Number(rec.subtotal ?? rec.total ?? 0);
      const { rows } = await sql`
        INSERT INTO invoices (company, num, amount, status, data)
        VALUES (${company}, ${rec.num}, ${amount}, 'draft', ${JSON.stringify(rec)})
        ON CONFLICT (company, num) DO UPDATE
          SET amount = EXCLUDED.amount, data = EXCLUDED.data
        RETURNING data`;
      return res.status(200).json(rows[0].data);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
