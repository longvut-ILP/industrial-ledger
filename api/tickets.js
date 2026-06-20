import { sql } from '@vercel/postgres';

// /api/tickets — list (GET), create (POST)
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, job_id, crew_id, ticket_date, hours, notes, status, created_at
        FROM tickets ORDER BY ticket_date DESC, id DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { job_id, crew_id = null, ticket_date = null, hours = 0, notes = null, status = 'draft' } = req.body || {};
      if (!job_id) return res.status(400).json({ error: 'job_id is required' });
      const { rows } = await sql`
        INSERT INTO tickets (job_id, crew_id, ticket_date, hours, notes, status)
        VALUES (${job_id}, ${crew_id}, ${ticket_date || new Date().toISOString().slice(0,10)},
                ${hours}, ${notes}, ${status})
        RETURNING *`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
