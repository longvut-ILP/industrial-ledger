import { sql } from '@vercel/postgres';
import { requireCompany } from './_auth.js';

// /api/materials — list (GET), create (POST), scoped to the company.
export default async function handler(req, res) {
  try {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, code, name, category, qty, unit_cost, unit_cubic, po, lot, purchase_date
        FROM materials WHERE company = ${company} ORDER BY code`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const m = req.body || {};
      if (!m.code || !m.name) {
        return res.status(400).json({ error: 'code and name are required' });
      }
      const { rows } = await sql`
        INSERT INTO materials (company, code, name, category, qty, unit_cost, unit_cubic, po, lot, purchase_date)
        VALUES (${company}, ${m.code}, ${m.name}, ${m.category || null}, ${m.qty || 0},
                ${m.unit_cost || 0}, ${m.unit_cubic || 0}, ${m.po || null},
                ${m.lot || null}, ${m.purchase_date || null})
        ON CONFLICT (company, code) DO UPDATE
          SET name = EXCLUDED.name, category = EXCLUDED.category, qty = EXCLUDED.qty,
              unit_cost = EXCLUDED.unit_cost, unit_cubic = EXCLUDED.unit_cubic,
              po = EXCLUDED.po, lot = EXCLUDED.lot, purchase_date = EXCLUDED.purchase_date
        RETURNING *`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
