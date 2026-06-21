import { sql } from '@vercel/postgres';
import { requireCompany } from './_auth.js';

// /api/customers — list (GET), create (POST), scoped to the company.
export default async function handler(req, res) {
  try {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, qbo_id, contact, email, phone FROM customers
        WHERE company = ${company} ORDER BY id`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, qbo_id = null, contact = null, email = null, phone = null } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      const { rows } = await sql`
        INSERT INTO customers (company, name, qbo_id, contact, email, phone)
        VALUES (${company}, ${name.trim()}, ${qbo_id}, ${contact}, ${email}, ${phone})
        RETURNING id, name, qbo_id, contact, email, phone`;
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
