import { sql } from '@vercel/postgres';

// /api/users — list (GET) and create/update (POST) users.
// Protected: requires the x-admin-secret header to match the ADMIN_SECRET env var.
// (Set ADMIN_SECRET in Vercel → Project → Settings → Environment Variables.)
// You can also create users directly with create-user.sql in the Query tab.
export default async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, company, email, role, active, created_at FROM users ORDER BY id`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { company, email, password, role = 'Owner / Admin' } = req.body || {};
      if (!company || !email || !password) {
        return res.status(400).json({ error: 'company, email and password are required' });
      }
      const { rows } = await sql`
        INSERT INTO users (company, email, password_hash, role)
        VALUES (${company}, ${email.trim().toLowerCase()}, crypt(${password}, gen_salt('bf')), ${role})
        ON CONFLICT (email) DO UPDATE
          SET company = EXCLUDED.company,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role
        RETURNING id, company, email, role`;
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
