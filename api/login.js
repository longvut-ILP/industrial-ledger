import { sql } from '@vercel/postgres';

// /api/login — verify email + password against the bcrypt hash in the database.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    // crypt() re-hashes the supplied password with the stored salt and compares — constant-time, secure.
    const { rows } = await sql`
      SELECT id, company, email, role
      FROM users
      WHERE email = ${email.trim().toLowerCase()}
        AND active = true
        AND password_hash = crypt(${password}, password_hash)`;
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(200).json({ ok: true, user: rows[0] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
