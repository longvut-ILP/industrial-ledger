import { sql } from '@vercel/postgres';

// /api/crews  — list (GET), create/update by name (POST), delete (DELETE ?name=)
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, members, equipment FROM crews ORDER BY id`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, members = [], equipment = [] } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      const { rows } = await sql`
        INSERT INTO crews (name, members, equipment)
        VALUES (${name.trim()}, ${JSON.stringify(members)}, ${JSON.stringify(equipment)})
        ON CONFLICT (name) DO UPDATE
          SET members = EXCLUDED.members, equipment = EXCLUDED.equipment
        RETURNING id, name, members, equipment`;
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const name = req.query.name;
      if (!name) return res.status(400).json({ error: 'name is required' });
      await sql`DELETE FROM crews WHERE name = ${name}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
