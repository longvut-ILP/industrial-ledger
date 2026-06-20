import { sql } from '@vercel/postgres';

// /api/invoices — list generated rental invoices (GET), save one (POST)
// The full invoice record is stored as JSON so the app gets back exactly what it saved.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT data FROM invoices WHERE data IS NOT NULL ORDER BY id DESC`;
      return res.status(200).json(rows.map(r => r.data));
    }

    if (req.method === 'POST') {
      const rec = req.body || {};
      if (!rec.num) return res.status(400).json({ error: 'num is required' });
      const amount = Number(rec.subtotal ?? rec.total ?? 0);
      const { rows } = await sql`
        INSERT INTO invoices (num, amount, status, data)
        VALUES (${rec.num}, ${amount}, 'draft', ${JSON.stringify(rec)})
        ON CONFLICT (num) DO UPDATE
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
