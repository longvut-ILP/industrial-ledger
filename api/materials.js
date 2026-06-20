import { sql } from '@vercel/postgres';

// /api/materials — list (GET), create (POST)
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, code, name, category, qty, unit_cost, unit_cubic, po, lot, purchase_date
        FROM materials ORDER BY code`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const m = req.body || {};
      if (!m.code || !m.name) {
        return res.status(400).json({ error: 'code and name are required' });
      }
      const { rows } = await sql`
        INSERT INTO materials (code, name, category, qty, unit_cost, unit_cubic, po, lot, purchase_date)
        VALUES (${m.code}, ${m.name}, ${m.category || null}, ${m.qty || 0},
                ${m.unit_cost || 0}, ${m.unit_cubic || 0}, ${m.po || null},
                ${m.lot || null}, ${m.purchase_date || null})
        RETURNING *`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
