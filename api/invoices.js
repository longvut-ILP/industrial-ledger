import { sql } from '@vercel/postgres';

// /api/invoices — list (GET), create (POST)
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, job_id, customer_id, invoice_no, amount, status, qbo_id, issued_at, created_at
        FROM invoices ORDER BY id DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { job_id = null, customer_id = null, invoice_no = null, amount = 0, status = 'draft', issued_at = null } = req.body || {};
      const { rows } = await sql`
        INSERT INTO invoices (job_id, customer_id, invoice_no, amount, status, issued_at)
        VALUES (${job_id}, ${customer_id}, ${invoice_no}, ${amount}, ${status}, ${issued_at})
        RETURNING *`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
