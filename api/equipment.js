import { sql } from '@vercel/postgres';
import { requireCompany } from './_auth.js';

// /api/equipment — list (GET), create/update (POST), delete (DELETE ?name=)
// Scoped to the signed-in user's company. POST renames in place when
// `prevName` is supplied (so editing a unit's name keeps one row).
export default async function handler(req, res) {
  try {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, type FROM equipment
        WHERE company = ${company} ORDER BY id`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, type = 'General', prevName = '' } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      // Editing an existing unit (possibly renaming it).
      if (prevName && prevName !== name.trim()) {
        const { rows } = await sql`
          UPDATE equipment SET name = ${name.trim()}, type = ${type}
          WHERE company = ${company} AND name = ${prevName}
          RETURNING id, name, type`;
        return res.status(200).json(rows[0] || null);
      }
      const { rows } = await sql`
        INSERT INTO equipment (company, name, type)
        VALUES (${company}, ${name.trim()}, ${type})
        ON CONFLICT (company, name) DO UPDATE
          SET type = EXCLUDED.type
        RETURNING id, name, type`;
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const name = req.query.name;
      if (!name) return res.status(400).json({ error: 'name is required' });
      await sql`DELETE FROM equipment WHERE company = ${company} AND name = ${name}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
