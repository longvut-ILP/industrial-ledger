import { sql } from '@vercel/postgres';
import { requireCompany } from './_auth.js';

// /api/tickets — list (GET), create/upsert (POST), update status/invoiced (PATCH)
// All scoped to the signed-in user's company.
export default async function handler(req, res) {
  try {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT label, job_name, hours, amount, status, invoiced, qbo_num
        FROM tickets
        WHERE company = ${company} AND label IS NOT NULL ORDER BY id`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { label, job_name, hours = 0, amount = 0, status = 'pending', invoiced = false } = req.body || {};
      if (!label || !job_name) {
        return res.status(400).json({ error: 'label and job_name are required' });
      }
      const { rows } = await sql`
        INSERT INTO tickets (company, label, job_name, hours, amount, status, invoiced)
        VALUES (${company}, ${label}, ${job_name}, ${hours}, ${amount}, ${status}, ${invoiced})
        ON CONFLICT (company, label) DO UPDATE
          SET hours = EXCLUDED.hours, amount = EXCLUDED.amount,
              status = EXCLUDED.status, invoiced = EXCLUDED.invoiced
        RETURNING label, job_name, hours, amount, status, invoiced, qbo_num`;
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const { label, status = null, invoiced = null, qbo_num = null } = req.body || {};
      if (!label) return res.status(400).json({ error: 'label is required' });
      const { rows } = await sql`
        UPDATE tickets SET
          status   = COALESCE(${status}, status),
          invoiced = COALESCE(${invoiced}, invoiced),
          qbo_num  = COALESCE(${qbo_num}, qbo_num)
        WHERE company = ${company} AND label = ${label}
        RETURNING label, job_name, hours, amount, status, invoiced, qbo_num`;
      return res.status(200).json(rows[0] || null);
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
