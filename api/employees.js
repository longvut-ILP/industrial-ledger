import { sql } from '@vercel/postgres';

// /api/employees — list (GET), create/update by name (POST)
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, role, hourly_rate, active, certs FROM employees ORDER BY id`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, role = 'Crew', hourly_rate = null, certs = [] } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      const { rows } = await sql`
        INSERT INTO employees (name, role, hourly_rate, certs)
        VALUES (${name.trim()}, ${role}, ${hourly_rate}, ${JSON.stringify(certs)})
        ON CONFLICT (name) DO UPDATE
          SET role = EXCLUDED.role,
              hourly_rate = EXCLUDED.hourly_rate,
              certs = EXCLUDED.certs
        RETURNING id, name, role, hourly_rate, active, certs`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
