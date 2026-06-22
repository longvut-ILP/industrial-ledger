import { sql } from '@vercel/postgres';
import { requireCompany } from './_auth.js';

// Field2Bill — consolidated tenant-data endpoint.
//
// Vercel's Hobby plan caps a deployment at 12 Serverless Functions, and each
// file in /api counts as one. To stay under the cap, the simple per-resource
// CRUD endpoints (crews, customers, employees, equipment, invoices, jobs,
// materials, tickets, users) are served by this ONE dynamic function instead
// of nine separate files.
//
// The [resource] segment maps the URL to the handler below, so the public
// URLs are UNCHANGED: /api/jobs, /api/customers, etc. still work exactly as
// before. Exact-match files (login.js, qbo-*.js) take priority over this
// dynamic route, so they are unaffected.
export default async function handler(req, res) {
  const resource = req.query.resource;
  const fn = handlers[resource];
  if (!fn) return res.status(404).json({ error: `Unknown resource: ${resource}` });
  try {
    return await fn(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

const handlers = {
  // ---- /api/crews ----------------------------------------------------------
  async crews(req, res) {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, members, equipment FROM crews
        WHERE company = ${company} ORDER BY id`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { name, members = [], equipment = [] } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
      const { rows } = await sql`
        INSERT INTO crews (company, name, members, equipment)
        VALUES (${company}, ${name.trim()}, ${JSON.stringify(members)}, ${JSON.stringify(equipment)})
        ON CONFLICT (company, name) DO UPDATE
          SET members = EXCLUDED.members, equipment = EXCLUDED.equipment
        RETURNING id, name, members, equipment`;
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const name = req.query.name;
      if (!name) return res.status(400).json({ error: 'name is required' });
      await sql`DELETE FROM crews WHERE company = ${company} AND name = ${name}`;
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  },

  // ---- /api/customers ------------------------------------------------------
  async customers(req, res) {
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
      if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
      const { rows } = await sql`
        INSERT INTO customers (company, name, qbo_id, contact, email, phone)
        VALUES (${company}, ${name.trim()}, ${qbo_id}, ${contact}, ${email}, ${phone})
        RETURNING id, name, qbo_id, contact, email, phone`;
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  },

  // ---- /api/employees ------------------------------------------------------
  async employees(req, res) {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, role, hourly_rate, active, certs FROM employees
        WHERE company = ${company} ORDER BY id`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { name, role = 'Crew', hourly_rate = null, certs = [] } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
      const { rows } = await sql`
        INSERT INTO employees (company, name, role, hourly_rate, certs)
        VALUES (${company}, ${name.trim()}, ${role}, ${hourly_rate}, ${JSON.stringify(certs)})
        ON CONFLICT (company, name) DO UPDATE
          SET role = EXCLUDED.role,
              hourly_rate = EXCLUDED.hourly_rate,
              certs = EXCLUDED.certs
        RETURNING id, name, role, hourly_rate, active, certs`;
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  },

  // ---- /api/equipment ------------------------------------------------------
  async equipment(req, res) {
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
      if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
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
  },

  // ---- /api/invoices -------------------------------------------------------
  async invoices(req, res) {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT data FROM invoices
        WHERE company = ${company} AND data IS NOT NULL ORDER BY id DESC`;
      return res.status(200).json(rows.map(r => r.data));
    }
    if (req.method === 'POST') {
      const rec = req.body || {};
      if (!rec.num) return res.status(400).json({ error: 'num is required' });
      const amount = Number(rec.subtotal ?? rec.total ?? 0);
      const { rows } = await sql`
        INSERT INTO invoices (company, num, amount, status, data)
        VALUES (${company}, ${rec.num}, ${amount}, 'draft', ${JSON.stringify(rec)})
        ON CONFLICT (company, num) DO UPDATE
          SET amount = EXCLUDED.amount, data = EXCLUDED.data
        RETURNING data`;
      return res.status(200).json(rows[0].data);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  },

  // ---- /api/jobs -----------------------------------------------------------
  async jobs(req, res) {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, customer_id, site_address, status, budget FROM jobs
        WHERE company = ${company} ORDER BY id`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { name, customer_id = null, site_address = null, status = 'active', budget = 0 } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
      const { rows } = await sql`
        INSERT INTO jobs (company, name, customer_id, site_address, status, budget)
        VALUES (${company}, ${name.trim()}, ${customer_id}, ${site_address}, ${status}, ${budget})
        ON CONFLICT (company, name) DO UPDATE
          SET customer_id = EXCLUDED.customer_id,
              site_address = EXCLUDED.site_address,
              status = EXCLUDED.status,
              budget = EXCLUDED.budget
        RETURNING id, name, customer_id, site_address, status, budget`;
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  },

  // ---- /api/materials ------------------------------------------------------
  async materials(req, res) {
    const company = requireCompany(req, res);
    if (!company) return;

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, code, name, category, qty, unit_cost, unit_cubic, po, lot, purchase_date
        FROM materials WHERE company = ${company} ORDER BY code`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const m = req.body || {};
      if (!m.code || !m.name) return res.status(400).json({ error: 'code and name are required' });
      const { rows } = await sql`
        INSERT INTO materials (company, code, name, category, qty, unit_cost, unit_cubic, po, lot, purchase_date)
        VALUES (${company}, ${m.code}, ${m.name}, ${m.category || null}, ${m.qty || 0},
                ${m.unit_cost || 0}, ${m.unit_cubic || 0}, ${m.po || null},
                ${m.lot || null}, ${m.purchase_date || null})
        ON CONFLICT (company, code) DO UPDATE
          SET name = EXCLUDED.name, category = EXCLUDED.category, qty = EXCLUDED.qty,
              unit_cost = EXCLUDED.unit_cost, unit_cubic = EXCLUDED.unit_cubic,
              po = EXCLUDED.po, lot = EXCLUDED.lot, purchase_date = EXCLUDED.purchase_date
        RETURNING *`;
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  },

  // ---- /api/tickets --------------------------------------------------------
  async tickets(req, res) {
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
      if (!label || !job_name) return res.status(400).json({ error: 'label and job_name are required' });
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
  },

  // ---- /api/users ----------------------------------------------------------
  // Protected by the x-admin-secret header (NOT tenant auth).
  async users(req, res) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || req.headers['x-admin-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
  },
};
