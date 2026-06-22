import { requireCompany } from './_auth.js';
import { getConnection, qboFetch, MINOR } from './_qbo.js';

// Find a QuickBooks customer by exact display name, or create one.
async function findOrCreateCustomer(company, name, email) {
  const safe = String(name).replace(/'/g, "\\'");
  const found = await qboFetch(
    company,
    `query?query=${encodeURIComponent(`select * from Customer where DisplayName = '${safe}'`)}&minorversion=${MINOR}`
  );
  const existing = found && found.QueryResponse && found.QueryResponse.Customer && found.QueryResponse.Customer[0];
  if (existing) return existing;
  const created = await qboFetch(company, `customer?minorversion=${MINOR}`, {
    method: 'POST',
    body: {
      DisplayName: name,
      ...(email ? { PrimaryEmailAddr: { Address: email } } : {}),
    },
  });
  return created.Customer;
}

// QuickBooks invoice line items must reference a service Item. Reuse the first
// existing Service item; if the company has none, create one against its first
// Income account — so this works on a brand-new QuickBooks file out of the box.
async function defaultItemRef(company) {
  const found = await qboFetch(
    company,
    `query?query=${encodeURIComponent("select Id, Name from Item where Type = 'Service' maxresults 1")}&minorversion=${MINOR}`
  );
  const item = found && found.QueryResponse && found.QueryResponse.Item && found.QueryResponse.Item[0];
  if (item) return { value: item.Id, name: item.Name };

  const accts = await qboFetch(
    company,
    `query?query=${encodeURIComponent("select Id, Name from Account where AccountType = 'Income' maxresults 1")}&minorversion=${MINOR}`
  );
  const income = accts && accts.QueryResponse && accts.QueryResponse.Account && accts.QueryResponse.Account[0];
  if (!income) throw new Error('No income account exists in QuickBooks to attach a service item to.');
  const created = await qboFetch(company, `item?minorversion=${MINOR}`, {
    method: 'POST',
    body: { Name: 'Field Service', Type: 'Service', IncomeAccountRef: { value: income.Id } },
  });
  return { value: created.Item.Id, name: created.Item.Name };
}

// /api/qbo-invoice — create a real invoice in this tenant's QuickBooks company.
// Body: { customerName, customerEmail?, lines:[{description, amount, qty?}], memo?, ticketLabel?, amount? }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const company = requireCompany(req, res);
  if (!company) return;

  try {
    const conn = await getConnection(company);
    if (!conn) {
      return res.status(409).json({ error: 'QuickBooks is not connected. Connect it under Admin → QuickBooks.' });
    }

    const b = req.body || {};
    const customerName = (b.customerName || '').trim();
    if (!customerName) return res.status(400).json({ error: 'customerName is required' });

    const rawLines =
      Array.isArray(b.lines) && b.lines.length
        ? b.lines
        : [{ description: b.memo || ('Field ticket ' + (b.ticketLabel || '')), amount: Number(b.amount) || 0 }];

    const customer = await findOrCreateCustomer(company, customerName, b.customerEmail);
    const itemRef = await defaultItemRef(company);

    const Line = rawLines.map((li) => ({
      DetailType: 'SalesItemLineDetail',
      Amount: Number(li.amount) || 0,
      Description: li.description || '',
      SalesItemLineDetail: {
        ItemRef: itemRef,
        Qty: li.qty || 1,
        ...(li.unitPrice != null ? { UnitPrice: Number(li.unitPrice) } : {}),
      },
    }));

    const invoiceBody = {
      CustomerRef: { value: customer.Id },
      Line,
      ...(b.customerEmail ? { BillEmail: { Address: b.customerEmail } } : {}),
      ...(b.memo ? { CustomerMemo: { value: b.memo } } : {}),
    };

    const result = await qboFetch(company, `invoice?minorversion=${MINOR}`, { method: 'POST', body: invoiceBody });
    const inv = result.Invoice;
    return res.status(200).json({
      ok: true,
      qboId: inv.Id,
      docNumber: inv.DocNumber || null,
      total: inv.TotalAmt,
      customerId: customer.Id,
    });
  } catch (e) {
    // 4xx from QuickBooks (validation, etc.) surfaces as 422 so the UI can show it.
    const status = e.status && e.status < 500 ? 422 : 500;
    return res.status(status).json({ error: e.message });
  }
}
