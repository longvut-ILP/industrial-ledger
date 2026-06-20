import { sql } from '@vercel/postgres';

// /api/jobs — list (GET), create/update by name (POST)
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, customer_id, site_address, status, budget FROM jobs ORDER BY id`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, customer_id = null, site_address = null, status = 'active', budget = 0 } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      const { rows } = await sql`
        INSERT INTO jobs (name, customer_id, site_address, status, budget)
        VALUES (${name.trim()}, ${customer_id}, ${site_address}, ${status}, ${budget})
        ON CONFLICT (name) DO UPDATE
          SET customer_id = EXCLUDED.customer_id,
              site_address = EXCLUDED.site_address,
              status = EXCLUDED.status,
              budget = EXCLUDED.budget
        RETURNING id, name, customer_id, site_address, status, budget`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
